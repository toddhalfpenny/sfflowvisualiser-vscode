import * as vscode from "vscode";
import { getUri } from "../utilities/getUri";
import { getNonce } from "../utilities/getNonce";

export class FlowPanel {
  public static currentPanel: FlowPanel | undefined;
  private readonly _panel: vscode.WebviewPanel;
  private _disposables: vscode.Disposable[] = [];
  private _flowMap: any;

  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, parsedXml:any) {
    this._panel = panel;
    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
    this._panel.webview.html = this._getWebviewContent(this._panel.webview, extensionUri, parsedXml);
    this._setWebviewMessageListener(this._panel.webview, parsedXml);
  }

  public dispose() {
    FlowPanel.currentPanel = undefined;

    this._panel.dispose();

    while (this._disposables.length) {
      const disposable = this._disposables.pop();
      if (disposable) {
        disposable.dispose();
      }
    }
  }

  public static render(extensionUri: vscode.Uri, parsedXml: any) {
    if (FlowPanel.currentPanel) {
      FlowPanel.currentPanel._panel.reveal(vscode.ViewColumn.One);
    } else {
      // console.log('render');
      const flowMap = parsedXml.flowMap;
      const panel = vscode.window.createWebviewPanel("flow-render", flowMap.label, vscode.ViewColumn.One, {
        enableScripts: true,
        localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'out')]
      });

      FlowPanel.currentPanel = new FlowPanel(panel, extensionUri, parsedXml);
    }
  }

  private _getWebviewContent(webview: vscode.Webview, extensionUri: vscode.Uri, parsedXml:any) {
    const webviewUri = getUri(webview, extensionUri, ["out", "webview.js"]);
    const nonce = getNonce();
    this._flowMap = parsedXml.flowMap;

    const constants = this.getConstants(this._flowMap.constants);
    const variables = this.getVariables(this._flowMap.variables);
    const formulas = this.getFormulas(this._flowMap.formulas);
    const startConditions = this.getStartConditions(this._flowMap.start);
    const textTemplates = this.getTextTemplates(this._flowMap.textTemplates);
    // console.log(this._flowMap);

    return /*html*/ `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data: blob: ${webview.cspSource} https:; script-src 'self' 'unsafe-inline' ${webview.cspSource} vscode-resource:; style-src 'self' 'unsafe-inline' ${webview.cspSource} vscode-resource: https:;" />
          <title>${this._flowMap.label}</title>
          <style>
            h2, summary {
              font-size: 20px;
              border-top: 1px solid lightblue;
              padding-top: 1em;
              margin-top: 10px;
            }
            label {
              display: inline-block;
              font-weight: bold;
              margin-right: 0.5em;
              text-align: right;
              width: 7em;
            }
            .formula {
              font-family: monospace;
            }
            .flow-type {
              font-size: 1.2em;
            }
            .text-template-item, .formula-item {
              align-items: center;
              display: flex;
              margin-bottom: 1em;
            }
            .text-template-item div, .formula-item div {
              margin-right: 2em;
            }
            #mermaid-wrapper {
              width: 100%;
              overflow: visible;
            }
            .flow-mermaid {
              display: block;
              min-width: 100%;
            }
            img {
              border: 1px solid red;
              display:none;
            }
            [row-type="header"] { text-transform: capitalize;}
          </style>
        </head>
        <body>
          <h1>${this._flowMap.label}</h1>
          <p class="flow-type">${this.getFlowType(this._flowMap)}</p>
          <p class="flow-type">${this._flowMap.status}</p>
          ${startConditions}
          ${constants}
          ${formulas}
          ${variables}
          ${textTemplates}
          <h2>Flow</h2>
          <vscode-button id="saveasnpng">Save as .png</vscode-button>
          <vscode-button id="zoomin">Zoom + </vscode-button>
          <vscode-button id="zoomout">- Zoom </vscode-button>
          <div id="mermaid-wrapper">
            <pre id="flow-mermaid" class="flow-mermaid">${parsedXml.uml}</pre>
          </div>
          <!--<canvas id="png"></canvas>-->
          <script type="module" nonce="${nonce}" src="${webviewUri}"></script>
          <script>
            
          </script>
        </body>
      </html>
    `;
  }

  private _setWebviewMessageListener(webview: vscode.Webview, parsedXml: any) {
    webview.onDidReceiveMessage(
      (message: any) => {
        const command = message.command;
        const text = message.text;
        switch (command) {
          case "rendered":
            this._panel.webview.postMessage({ command: 'parsedXml', message: this._flowMap });
            return;
          case "nodeClicked":
            // TODO - handle showing more info, perhaps in a side pane?
            break;
        }
      },
      undefined,
      this._disposables
    );
  }

  private getFlowType(flowMap: any): string {
    if (flowMap.processType === 'Flow') {
        return "Screen flow";
    } else {
        switch ( flowMap.start.triggerType ) {
            case "Scheduled":
                return "Scheduled flow;";
            case "RecordAfterSave":
                return "Record triggered flow: After Save (" + flowMap.start.object + ")";
            case "RecordBeforeSave":
                return "Record triggered flow: Before Save (" + flowMap.start.object + ")";
            case "PlatformEvent":
                return "PlatformEvent triggered flow (" + flowMap.start.object + ")";
            default:
                return "Autolanuched flow - No trigger";
        }
    }
  }


  private getStartConditions(start:any): string{
    if (start.object) {
      const recTriggerType = (start.recordTriggerType === "CreateAndUpdate") ? "Create and update" : start.recordTriggerType;
      const filtersStr =  this.getFilterStr(start);

      return /*html*/ `
        <details>
          <summary >Start Conditions</summary>
          <p><label>Object:</label>${start.object}</p>
          <p><label>On:</label>${recTriggerType}</p>   
          ${filtersStr}  
        </details>
        `;
    } else {
      return "";
    }
  }

  private getVariables(variables: any): string{
    if (variables) {
      variables = (variables.length) ? variables : [variables];      
      let variablestr = /*html*/ `
          <details>
          <summary>Variables</summary>
          <vscode-data-grid id="variables-grid" generate-header="sticky" aria-label="variables">
            <vscode-data-grid-row row-type="header">
              <vscode-data-grid-cell cell-type="columnheader" grid-column="1">Name</vscode-data-grid-cell>
              <vscode-data-grid-cell cell-type="columnheader" grid-column="2">Data Type</vscode-data-grid-cell>
              <vscode-data-grid-cell cell-type="columnheader" grid-column="3">Is Collection</vscode-data-grid-cell>
              <vscode-data-grid-cell cell-type="columnheader" grid-column="4">In Input</vscode-data-grid-cell>
              <vscode-data-grid-cell cell-type="columnheader" grid-column="5">Is Output</vscode-data-grid-cell>
              <vscode-data-grid-cell cell-type="columnheader" grid-column="6">Object Type</vscode-data-grid-cell>
            </vscode-data-grid-row>`;
      for (const variable of variables) {
        variablestr += /*html*/ `
          <vscode-data-grid-row>
            <vscode-data-grid-cell grid-column="1">${variable.name}</vscode-data-grid-cell>
            <vscode-data-grid-cell grid-column="2">${variable.dataType}</vscode-data-grid-cell>
            <vscode-data-grid-cell grid-column="3">${variable.isCollection}</vscode-data-grid-cell>
            <vscode-data-grid-cell grid-column="4">${variable.isInput}</vscode-data-grid-cell>
            <vscode-data-grid-cell grid-column="5">${variable.isOutput}</vscode-data-grid-cell>
            <vscode-data-grid-cell grid-column="6">${variable.objectType}</vscode-data-grid-cell>
          </vscode-data-grid-row>
        `;
      }
      variablestr += '</vscode-data-grid></details>';
      return variablestr;
    } else {
      return "";
    }
  }


  private getConstants(constants: any): string{
    if (constants) {
      constants = (constants.length) ? constants : [constants];      
      let constantstr = /*html*/ `
          <details>
          <summary>Constants</summary>
          <vscode-data-grid id="constants-grid" generate-header="sticky" aria-label="Constants">
            <vscode-data-grid-row row-type="header">
              <vscode-data-grid-cell cell-type="columnheader" grid-column="1">Name</vscode-data-grid-cell>
              <vscode-data-grid-cell cell-type="columnheader" grid-column="2">Data Type</vscode-data-grid-cell>
              <vscode-data-grid-cell cell-type="columnheader" grid-column="3">Value</vscode-data-grid-cell>
            </vscode-data-grid-row>`;
      for (const constant of constants) {
        let constantValue = '';
        for (const prop in constant.value) {
          constantValue = constant.value[prop];
        }
        constantstr += /*html*/ `
          <vscode-data-grid-row>
            <vscode-data-grid-cell grid-column="1">${constant.name}</vscode-data-grid-cell>
            <vscode-data-grid-cell grid-column="2">${constant.dataType}</vscode-data-grid-cell>
            <vscode-data-grid-cell grid-column="3">${constantValue}</vscode-data-grid-cell>
          </vscode-data-grid-row>
        `;
      }
      constantstr += '</vscode-data-grid></details>';
      return constantstr;
    } else {
      return "";
    }
  }
  

  private getFormulas(formulas: any): string{
    if (formulas) {
      formulas = (formulas.length) ? formulas : [formulas];
      
      let formulaStr = /*html*/ `
          <details>
          <summary >Formulas</summary>
      `;
      for (const formula of formulas) {
        // TEMP - THIS IS WHAT WE WERE DOING BUT It's coming from our lib wrong.
        // Issue is that this converts all special chars back to HTML entities, and they might not be like that in the XML
        // var decoded = this.encodeHTML(formula.expression);

        console.log(formula.expression);
        var decoded = formula.expression.replaceAll('"', '&quot;');

        formulaStr += /*html*/ ` 
          <div class="formula-item">
            <div>
              <p><label>Name:</label>${formula.name}</p> 
              <p><label>Data type:</label>${formula.dataType}</p>
            </div>
            <vscode-text-area class="formula" readonly cols="50" resize="both" value="${decoded}"></vscode-text-area>
          </div>
        `;
      }
      formulaStr += '</details>';
      return formulaStr;
    } else {
      return "";
    }
  }

  private encodeHTML(str:any) {
    const code = {
        ' ' : 'nbsp;',
        '¢' : 'cent;',
        '£' : 'pound;',
        '¥' : 'yen;',
        '€' : 'euro;', 
        '©' : 'copy;',
        '®' : 'reg;',
        '<' : 'lt;', 
        '>' : 'gt;',  
        '"' : 'quot;', 
        '\'' : 'apos;'
    };
    return str.replace(/[\u00A0-\u9999<>\&''""]/gm, (i:any)=>"&amp;" + (<any>code)[i]);
  }

  
  private getTextTemplates(textTemplates: any): string{
    if (textTemplates) {
      textTemplates = (textTemplates.length) ? textTemplates : [textTemplates];
      
      let textTemplateStr = /*html*/ `
          <details>
          <summary >Text Templates</summary>
      `;
      for (const template of textTemplates) {
        textTemplateStr += /*html*/ ` 
          <div class="text-template-item">
            <div>
              <p><label>Name:</label>${template.name}</p> 
              ${(template.description ? ' <p><label>Description:</label>' + template.description + '</p>' : '')}
              <p><label>Plain text:</label>${template.isViewedAsPlainText}</p>
            </div>
            <vscode-text-area readonly cols="50" resize="both"  value="${template.text}"></vscode-text-area>
          </div>
        `;
      }
      textTemplateStr += '</details>';
      return textTemplateStr;
    } else {
      return "";
    }
  }


  private getFilterStr(start: any) : string {
      let filterLogicStr = '';
      if (start.filterFormula) {
        return /*html*/ `
        <p><label>Formula:</label><span class="formula">${start.filterFormula}</span></p>
      `;
      } else {
        switch (start.filterLogic) {
          case 'and':
            filterLogicStr = "All conditions are met (AND)";
            break;
          case 'or':
            filterLogicStr = "Any condition is met (OR)";
            break;
          case undefined:
            return filterLogicStr;
            break;
          default:
            filterLogicStr = start.filterLogic;
        }
        
        let filtersStr = /*html*/ `
          <vscode-data-grid id="filters-grid" generate-header="sticky" aria-label="Filters">
            <vscode-data-grid-row row-type="header">
            <vscode-data-grid-cell cell-type="columnheader" grid-column="1"></vscode-data-grid-cell>
            <vscode-data-grid-cell cell-type="columnheader" grid-column="2">Field</vscode-data-grid-cell>
            <vscode-data-grid-cell cell-type="columnheader" grid-column="3">Operator</vscode-data-grid-cell>
            <vscode-data-grid-cell cell-type="columnheader" grid-column="4">Value</vscode-data-grid-cell>
          </vscode-data-grid-row>`;
        start.filters = (start.filters.length) ? start.filters : [start.filters];
        let i = 1;
        for (const filter of start.filters) {
          let filterValue = '';
          for (const prop in filter.value) {
            filterValue = filter.value[prop];
          }
          filtersStr += /*html*/ `
            <vscode-data-grid-row>
              <vscode-data-grid-cell grid-column="1">${i}</vscode-data-grid-cell>
              <vscode-data-grid-cell grid-column="2">${filter.field}</vscode-data-grid-cell>
              <vscode-data-grid-cell grid-column="3">${this.splitAndCapitalise(filter.operator)}</vscode-data-grid-cell>
              <vscode-data-grid-cell grid-column="4">${filterValue}</vscode-data-grid-cell>
            </vscode-data-grid-row>
          `;
          i ++;
        }
        filtersStr += '</vscode-data-grid>';
      
        return /*html*/ `
          <p><label>Conditions:</label>${filterLogicStr}</p>
          ${filtersStr}
        `;
      }
  }

  private splitAndCapitalise(str: string): string {
    return str.replace(/([A-Z])/g, ' $1')
      .replace(/^./, function(str){ return str.toUpperCase(); });
  }
}