# Salesforce Flow Visualiser

A VS Code extension to create a visual represenation of Salesforce Flow `.flow-meta.xml` files.

## Features

It provides a markdown (`.md`) file with a graphical languages representation of the flow. The default is [Mermaid](https://mermaid.js.org/).

As well as a graphical view of the flow some basic flow information is also output, such as the Flow name, type, and details on the variables defined within it.

There are several other extensions that can be used in conjunction with this if you want to export the created markdown (`.md`) file's mermaid contents to an image file.

## Usage

1. Have a Salesforce Flow `.flow-meta.xml` file open.
1. Open the VS Code *Command palette* with **SHIFT+CTRL+P**.
1. Run the *Flow Visualiser: Mermaid* command.

## Requirements

This extension relies on the [Markdown Preview Mermaid Support](https://marketplace.visualstudio.com/items?itemName=bierner.markdown-mermaid) extension also being installed.

## Extension Settings

There aren't currently any settings for this extension.

## Known Issues

There aren't currently any settings for this extension.

## Release Notes

Users appreciate release notes as you update your extension.


### 0.1.2

- Minimum VSCode engine lowered


### 0.1.0

- Support for special mermaid chars in node labels (e.g braces)

### 0.0.2

- Fixed incorrect dep

## 0.0.1

* Initial pre-release version
