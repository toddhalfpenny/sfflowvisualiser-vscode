// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode');
const { XMLParser } = require("fast-xml-parser");


// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {

	let disposable = vscode.commands.registerCommand('flow2plantuml.generatePlantUML', function () {
		generatePlantUMLPreview();
	});

	context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
function deactivate() {}

async function generatePlantUMLPreview() {
	const uml = await generatePlantUML();

	// Create tempfile with plant UML contents
	let setting = vscode.Uri.parse("untitled:" + "flow2plantuml.tmp");
	try {
		const doc = await vscode.workspace.openTextDocument(setting);
		const e = await vscode.window.showTextDocument(doc, 1, false);
		e.edit(edit => {
			edit.insert(new vscode.Position(0, 0), uml);

			// Run plantuml.preview (this calls Jebbs' extension)
			vscode.commands.executeCommand("plantuml.preview");
		});
	} catch (error) {
		console.error(error);
		debugger;
	};

}

async function generatePlantUML() {
	// Get Flow XML and parse to JSON
	const xmlData = vscode.window.activeTextEditor.document.getText();
	const parser = new XMLParser();
	const flowObj = parser.parse(xmlData).Flow;
	console.log(JSON.stringify(flowObj));
	const flowMap = await createFlowMap(flowObj);
	console.log(JSON.stringify(flowMap));

	const START_STR = "' THIS IS A TEMPORARY FILE\n@startuml\nstart\n";
	const TITLE_STR = "title " + flowMap['label'] + "\n";
	let nextNode = flowMap[flowMap['start'].connector.targetReference];
	let end = false;
	let bodyStr = '';
	let i = 0;
	while (!end && i < 10) {
		console.log("nextNode", nextNode);
		bodyStr += getNodeStr(nextNode, flowMap);
		if (!nextNode.nextNode) {
			end = true;
		} else {
			nextNode = flowMap[nextNode.nextNode]
		}
		i++;
	}
	const END_STR = "stop\n@enduml";
	return START_STR + TITLE_STR + bodyStr + END_STR;
}

async function createFlowMap(flowObj) {
	let flowMap = {};
	for (const property in flowObj) {
		switch (property) {
			case 'description' :
			case 'label' :
			case 'start' :
				flowMap[property] = flowObj[property];
				break;
			default :
				// If only one entry (e.g one loop) then it will be an object, not an Array, so make it an Array of one
				if (!flowObj[property].length) { 
					flowObj[property] = [flowObj[property] ]
				}
				// Loop through array and create an mapped entry for each
				for (const el of flowObj[property] ) {
					// console.log("el" , el)
					if (el.name) {
						let nextNode;
						let isNode = false;
						switch (property) {
							case 'loops':
								isNode = true;
								nextNode = (el.connector) ? el.connector.targetReference : null;
								break;					
							default:
								if (el.connector) {
									isNode = true;
									nextNode =  el.connector.targetReference;
								}
								break;
						}

						if (isNode) {
							const mappedEl = {
								name: el.name,
								label: el.label,
								type: property,
								nextNode: nextNode,
								nextValueConnector : (el.nextValueConnector) ?
									el.nextValueConnector.targetReference : null
							}
							flowMap[el.name] = mappedEl;
						}
					}
				  }
				break;
		}
		
	}
	// console.log(JSON.stringify(flowObj));
	// console.log(flowMap);
	return flowMap;
}

function getNodeStr(node, flowMap) {
	console.log("getNodeStr", node);
	switch (node.type) {
		case 'actionCalls' :
			return "#344568:<color:white><size:30><&pulse></size>;\nfloating note left\n**" + node.name + "**\nAction\nend note\n";
		case 'assignments' :
			return "#F97924:<color:white><size:30><&menu></size>;\nfloating note left\n**" + node.name + "**\nAssignment\nend note\n";
		case 'loops':
			let loopName = node.name;
			console.log("in loop", loopName);
			let nextNode = flowMap[node.nextValueConnector];
			let bodyStr = "floating note left: " + loopName + "\n repeat :<size:30><&loop-circular></size>;\n";
			let end = false;
			while (!end) {
				console.log("nextNode2", nextNode);
				bodyStr += getNodeStr(nextNode);
				if (!nextNode.nextNode || nextNode.nextNode === loopName) {
					end = true;
				} else {
					nextNode = flowMap[nextNode.nextNode]
				}
			}
			return bodyStr + "repeat while (more data?)\n";
		default:
			return "' " + node.name + "\n";
	}
}


module.exports = {
	activate,
	deactivate
}
