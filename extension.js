// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode');
const { XMLParser } = require("fast-xml-parser");


const NODE_CONFIG = {
	'actionCalls': {
		background: "#344568",
		color: "white",
		label: "Action",
		icon: "<&pulse>"
	},
	'assignments': {
		background: "#F97924",
		color: "white",
		label: "Assignment",
		icon: "<&menu>"
	},
	'decisions': {
		background: "#DD7A00",
		color: "white",
		label: "Decision",
		icon: "<&fork>"
	},
	'loops': {},
	'recordCreates': {
		background: "#F9548A",
		color: "white",
		label: "Create Records",
		icon: "<&medical-cross>"
	},
	'recordUpdates': {
		background: "#F9548A",
		color: "white",
		label: "Update Records",
		icon: "<&pencil>"
	},
};

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
	const {flowMap,uml} = await generatePlantUML();

	// Create tempfile with plant UML contents
	let setting = vscode.Uri.parse("untitled:" + flowMap['label'].replaceAll(' ', '-').toLowerCase() + ".puml");
	try {
		const doc = await vscode.workspace.openTextDocument(setting);
		const e = await vscode.window.showTextDocument(doc, 1, false);
		e.edit(async edit => {
			await edit.insert(new vscode.Position(0, 0), uml);

			// Run plantuml.preview (this calls Jebbs' extension)
			setTimeout(() => {
				vscode.commands.executeCommand("plantuml.preview");
			}, 200);
			
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

	const START_STR = "' THIS IS A TEMPORARY FILE\n@startuml " + flowMap['label'] + "\nstart\n";
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
	return {
		flowMap: flowMap,
		uml: START_STR + TITLE_STR + bodyStr + END_STR
	};
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
						switch (property) {
							case 'decisions':
								nextNode = (el.defaultConnector) ? el.defaultConnector.targetReference : null;
								let tmpRules = (el.rules.length) ? el.rules : [el.rules];
								el.rules2 = tmpRules.map(ruleEl =>{
									return {
										name: ruleEl.name,
										label: ruleEl.label,
										nextNode: ruleEl.connector,
										nextNodeLabel: el.defaultConnectorLabel,
									}
								});
								break;	
							case 'loops':
								nextNode = (el.connector) ? el.connector.targetReference : null;
								break;					
							default:
								if (el.connector) {
									nextNode =  el.connector.targetReference;
								}
								break;
						}

						if (NODE_CONFIG[property]) {
							const mappedEl = {
								name: el.name,
								label: el.label,
								type: property,
								nextNode: nextNode,
								nextNodeLabel: el.defaultConnectorLabel,
								nextValueConnector : (el.nextValueConnector) ?
									el.nextValueConnector.targetReference : null,
								rules: el.rules2
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
	let nextNode;
	let end;
	switch (node.type) {
		case 'decisions':
			const START_STR = "switch (" + node.label + ")\n"
			const DEFATAULT_STR = "\ncase (" + node.nextNodeLabel + ")\n";

			let rulesStr = "";
			for (const rule of node.rules ) {
				rulesStr += "case (" + rule.label + ")\n";

				nextNode = nextNode = flowMap[rule.nextNode.targetReference];
				end = false;
				while (!end) {
					console.log("nextNode2", nextNode);
					rulesStr += getNodeStr(nextNode);
					if (!nextNode.nextNode || nextNode.nextNode === node.nextNode) {
						end = true;
					} else {
						nextNode = flowMap[nextNode.nextNode]
					}
				}
			}
			const END_STR = "endswitch\n";
			return START_STR + rulesStr + DEFATAULT_STR + END_STR;
		case 'loops':
			let loopName = node.name;
			console.log("in loop", loopName);
			nextNode = flowMap[node.nextValueConnector];
			let bodyStr = "floating note left: " + loopName + "\n repeat :<size:30><&loop-circular></size>;\n";
			end = false;
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
			if (NODE_CONFIG[node.type]) {
				const cnf = NODE_CONFIG[node.type];
				return cnf.background + ":<color:" + cnf.color + "><size:30>" + cnf.icon + "</size>;\nfloating note left\n**" + node.label + "**\n" + cnf.label + "\nend note\n";
			} else {
				return "' " + node.name + " NOT IMPLEMENTED \n";
			}
	}
}


module.exports = {
	activate,
	deactivate
}
