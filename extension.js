// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode');
const { XMLParser } = require("fast-xml-parser");

const mode = "mermaid";

const NODE_CONFIG = {
	'actionCalls': {
		background: "#344568",
		color: "white",
		label: "Action",
		icon: "<&pulse>",
		mermaidIcon: {
			"apex": ">_",
			"emailSimple": "✉",
			"submit": "⚡"

		},
		mermaidClose: ")",
		mermaidOpen: "("
	},
	'assignments': {
		background: "#F97924",
		color: "white",
		label: "Assignment",
		icon: "<&menu>",
		mermaidIcon: "⚌" ,
		mermaidClose: ")",
		mermaidOpen: "("
	},
	'decisions': {
		background: "#DD7A00",
		color: "white",
		label: "Decision",
		icon: "<&fork>",
		mermaidIcon: "⇋" ,
		mermaidClose: "}}",
		mermaidOpen: "{{"
	},
	'loops': {
		background: "#E07D1C",
		mermaidIcon: "↻",
		mermaidClose: ")",
		mermaidOpen: "("
	},
	'recordCreates': {
		background: "#F9548A",
		color: "white",
		label: "Create Records",
		icon: "<&medical-cross>",
		mermaidIcon: "+" ,
		mermaidClose: ")",
		mermaidOpen: "("
	},
	'recordUpdates': {
		background: "#F9548A",
		color: "white",
		label: "Update Records",
		icon: "<&pencil>",
		mermaidIcon: "📝" ,
		mermaidClose: ")",
		mermaidOpen: "("
	},
	'screens': {
		background: "#1B96FF",
		color: "white",
		label: "Screen",
		icon: "<&pencil>",
		mermaidIcon: "💻" ,
		mermaidClose: ")",
		mermaidOpen: "("
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

	let extension = (mode === 'mermaid') ? 'md' : 'puml';
	// Create tempfile with plant UML contents
	let setting = vscode.Uri.parse("untitled:" + flowMap['label'].replaceAll(' ', '-').toLowerCase() + "." + extension);
	try {
		const doc = await vscode.workspace.openTextDocument(setting);
		const e = await vscode.window.showTextDocument(doc, 1, false);
		e.edit(async edit => {
			await edit.insert(new vscode.Position(0, 0), uml);

			switch (mode) {
				case 'mermaid':
					// let pathToManual = vscode.Uri.joinPath(context.extensionPath, "manual.md");
    				// let uriManual = vscode.Uri.file(pathToManual);
					vscode.commands.executeCommand('markdown.showPreview', setting);
					break;
				default:				
					// Run plantuml.preview (this calls Jebbs' extension)
					setTimeout(() => {
						vscode.commands.executeCommand("plantuml.preview");
					}, 200);
					break;
				}
			
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
	// console.log(JSON.stringify(flowObj));
	const flowMap = await createFlowMap(flowObj);
	console.log(JSON.stringify(flowMap));

	switch (mode) {
		case 'mermaid':
			return {
				flowMap: flowMap,
				uml: await generateMermaidFile(flowMap)
			}
		default: // plantuml
			const START_STR = "' THIS IS A TEMPORARY FILE\n@startuml " + flowMap['label'] + "\nstart\n";
			const TITLE_STR = "title " + flowMap['label'] + "\n";
			let nextNode = flowMap[flowMap['start'].connector.targetReference];
			let end = false;
			let bodyStr = '';
			while (!end) {
				// console.log("nextNode", nextNode);
				bodyStr += getNodeStr(nextNode, flowMap);
				if (!nextNode.nextNode) {
					end = true;
				} else {
					nextNode = flowMap[nextNode.nextNode]
				}
			}
			const END_STR = "stop\n@enduml";
			return {
				flowMap: flowMap,
				uml: START_STR + TITLE_STR + bodyStr + END_STR
			};
	}


}

async function createFlowMap(flowObj) {
	let flowMap = {};
	for (const property in flowObj) {
		switch (property) {
			case 'description' :
			case 'label' :
			case 'processType' :
			case 'status' :
				flowMap[property] = flowObj[property];
				break;
			case 'start' :
				flowMap[property] = flowObj[property];
				flowMap[property].type = property;
				flowMap[property].nextNode = flowObj[property].connector.targetReference;
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
								nextNode = (el.defaultConnector) ? el.defaultConnector.targetReference : "END";
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
								nextNode = (el.connector) ? el.connector.targetReference : "END";
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
								rules: el.rules2,
								actionType: el.actionType
							}
							flowMap[el.name] = mappedEl;
						} else if (property === 'variables') {
							flowMap.variables = flowObj[property];
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
	// console.log("getNodeStr", node);
	let nextNode;
	let end;
	switch (node.type) {
		case 'decisions':
			return processDecisions(node, flowMap);
		case 'loops':
			let loopName = node.name;
			// console.log("in loop", loopName);
			nextNode = flowMap[node.nextValueConnector];
			let bodyStr = "floating note left: " + loopName + "\n repeat :<size:30><&loop-circular></size>;\n";
			end = false;
			while (!end) {
				// console.log("nextNode2", nextNode);
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

function processDecisions(node, flowMap) {
	const START_STR = "switch (" + node.label + ")\n"
	const DEFATAULT_STR = "\ncase (" + node.nextNodeLabel + ")\n";

	let nextNode;
	let end;
	let rulesStr = "";
	for (const rule of node.rules ) {
		rulesStr += "case (" + rule.label + ")\n";

		nextNode = nextNode = flowMap[rule.nextNode.targetReference];
		end = false;
		while (!end) {
			// console.log("nextNode2", nextNode);
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
}

async function generateMermaidFile(flowMap) {
	const title = "# "+ flowMap['label'] + "\n### " + flowMap['processType'] + " (*" + flowMap['status'] + "*)\n";
	const variables = await getVariablesMd(flowMap.variables) + "\n";
	const mdStart = "```mermaid\nflowchart TB\n";
	const nodeDefStr = await getNodeDefStr(flowMap) + "\n\n";
	const mdClasses = await getMermaidClasses() + "\n\n";
	const mdBody = await getMermaidBody(flowMap) + "\n\n";
	const mdEnd = "```\n";
	// TODO VARIABLES ETC
	return title + variables + mdStart + nodeDefStr + mdBody + mdClasses + mdEnd;
}

async function getMermaidBody(flowMap) {
	let bodyStr = "";
	for (const property in flowMap) {
		const node = flowMap[property];
		const type = node.type;
		const nextNode = (node.nextNode) ? node.nextNode : "END"
		switch (type) {
			case 'actionCalls':
			case 'assignments':
			case 'recordCreates':
			case 'recordUpdates':
			case 'screens':
				bodyStr += node.name + " --> " + nextNode + "\n";
				break;
			case 'start':
				bodyStr += "START(( START )) --> " + nextNode  + "\n";
				break;
			case 'decisions':
				//rules
				for (const rule of node.rules ) {
					bodyStr += node.name + " --> |" + rule.label + "| " + rule.nextNode.targetReference + "\n";
				}
				
				// default
				bodyStr += node.name + " --> |" + node.nextNodeLabel + "| " + nextNode + "\n";
				break;
			case 'loops':
				// console.log("in loop", loopName);
				let loopNextNode = node.nextValueConnector;
				bodyStr += node.name + " --> " + loopNextNode + "\n";
				bodyStr += node.name + " ---> " + node.nextNode + "\n";
				break;
			default:
				// do nothing
				break;
		}
	}
	return bodyStr;
}

async function getNodeDefStr(flowMap) {
	let nodeDefStr = "\START(( START ))\n";
	for (const property in flowMap) {
		const type = flowMap[property].type;
		console.log("type", type);
		let icon = (NODE_CONFIG[type]) ? NODE_CONFIG[type].mermaidIcon : null;
		switch (type) {
			case 'actionCalls':
				icon = NODE_CONFIG[type].mermaidIcon[flowMap[property].actionType];
			case 'assignments':
			case 'decisions':
			case 'loops':
			case 'recordCreates':
			case 'recordUpdates':
			case 'screens':
			nodeDefStr += property + NODE_CONFIG[type].mermaidOpen + icon + "\n" + flowMap[property].label + NODE_CONFIG[type].mermaidClose + ":::" + type + "\n"
				break;
			default:
				// do nothing
				break;
		}
	}
	return nodeDefStr + "\END(( END ))\n";
}

async function getVariablesMd(vars) {
	let vStr = "## Variables\n|Name|Datatype|Collection|Input|Output|\n|-|-|-|-|-|\n";
	if (!vars) vars = [];
	for (const v of vars) {
		vStr += "|" + v.name + "|" + v.dataType + "|" + v.isCollection + "|" + v.isInput + "|" + v.isOutput + "|\n";
	}
	return vStr;
}

async function getMermaidClasses() {
	let classStr = "";
	for (const property in NODE_CONFIG) {
		classStr += "classDef " + property + " fill:" + NODE_CONFIG[property].background + ",color:" + NODE_CONFIG[property].color + "\n";
	}
	return classStr;
}

module.exports = {
	activate,
	deactivate
}
