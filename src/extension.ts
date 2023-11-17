import * as vscode from 'vscode';
import { FlowPanel } from "./panels/FlowPanel";
import { parseFlow } from 'salesforce-flow-visualiser';


export function activate(context: vscode.ExtensionContext) {

	let renderWebView = vscode.commands.registerCommand('sfflowvisualiser.generateWebview', () => {
		generateWebView(context.extensionUri, "mermaid");
	});

	context.subscriptions.push(renderWebView);
}


async function getParsedXML(mode: any, options: any) {
    return new Promise(async (resolve, reject) => {
		const xmlData = vscode.window.activeTextEditor?.document.getText();
		try {
			const res = await parseFlow(xmlData as string, mode, options);
			resolve(res);
		} catch (error) {
			reject(error);
		};
	});
}

async function generateWebView(extensionUri: vscode.Uri, mode: any) {
	try {
		const parsedXmlRes = await getParsedXML(mode, {wrapInMarkdown: false});
		FlowPanel.render(extensionUri, parsedXmlRes);
	} catch (error) {
		console.error(error);
	};	
}

export function deactivate() {}
