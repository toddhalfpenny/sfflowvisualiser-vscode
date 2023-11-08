const vscode = require('vscode');
const { parseFlow } = require("salesforce-flow-visualiser")

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {

	let disposable = vscode.commands.registerCommand('sfflowvisualiser.generateMermaid', function () {
		generatePreview("mermaid");
	});

	let disposable2 = vscode.commands.registerCommand('sfflowvisualiser.generatePlantUML', function () {
		generatePreview("plantuml");
	});

	context.subscriptions.push(disposable);

	context.subscriptions.push(disposable2);
}

// This method is called when your extension is deactivated
function deactivate() {}

async function generatePreview(mode) {
	const xmlData = vscode.window.activeTextEditor.document.getText();

	try {
		const {flowMap,uml} = await parseFlow(xmlData, mode);
		// console.log("flowMap", flowMap);
		// console.log("uml", uml);
		
		let extension = (mode === 'mermaid') ? 'md' : 'puml';
		// Create tempfile with plant UML contents
		let setting = vscode.Uri.parse("untitled:" + flowMap['label'].replaceAll(' ', '-').toLowerCase() + "." + extension);
		const doc = await vscode.workspace.openTextDocument(setting);
		const e = await vscode.window.showTextDocument(doc, 1, false);
		e.edit(async edit => {
			await edit.insert(new vscode.Position(0, 0), uml);

			switch (mode) {
				case 'mermaid':
					vscode.commands.executeCommand('markdown.showPreviewToSide', setting);
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
	};

}

module.exports = {
	activate,
	deactivate
}
