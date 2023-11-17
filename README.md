# Salesforce Flow Visualiser

A VS Code extension to create a visual represenation of Salesforce Flow `.flow-meta.xml` files.

## Features

It provides an easy to use representation of Salesforce Flow files. As well as a graphical view of the flow itself it also ouputs;
* Start Condiitions
* Resources:
  * Constants
  * Text Templates
  * Variables

You can zoom in/out on the flow itself, and can also save the image to a .png file. 

## Usage

1. Have a Salesforce Flow `.flow-meta.xml` file open.
1. Open the VS Code *Command palette* with **SHIFT+CTRL+P**.
1. Run the *Flow Visualiser: Render* command.

## Requirements

The v0.2 extension does not require any other extensions to be installed.

The v0.1 extension relied on the [Markdown Preview Mermaid Support](https://marketplace.visualstudio.com/items?itemName=bierner.markdown-mermaid) extension also being installed.

## Extension Settings

There aren't currently any settings for this extension.

## Known Issues

* HTML Special Characters (e.g. `&quot;`) are being represented as their decoded versions( e.g ` " `). I believe this is down to the `fast-xml-parser` lib that's being used downstream - it's on the list to look at.

## Release Notes

Users appreciate release notes as you update your extension.

### 0.2.2
- Added missing icon

### 0.2.1
- Moved to a webview to render the information and flow
- Output includes Constants, Variable and TextTemplates
- Ouput includes Start conditions
- Flow can be zoomed in/put
- Flow can be saved as a .png file
- Removed dependancy on [Markdown Preview Mermaid Support](https://marketplace.visualstudio.com/items?itemName=bierner.markdown-mermaid) extension


### 0.1.0

- Support for special mermaid chars in node labels (e.g braces)

### 0.0.2

- Fixed incorrect dep

## 0.0.1

* Initial pre-release version
