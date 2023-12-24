import {
  provideVSCodeDesignSystem,
  vsCodeButton,
  Button,
  vsCodeDataGrid,
  vsCodeDataGridCell,
  vsCodeDataGridRow,
  vsCodeTextArea,
  DataGrid,
  DataGridCell,
} from "@vscode/webview-ui-toolkit";

import mermaid from "mermaid";

provideVSCodeDesignSystem().register(
  vsCodeButton(),
  vsCodeDataGrid(),
  vsCodeDataGridCell(),
  vsCodeDataGridRow(),
  vsCodeTextArea(),
);

const vscode = acquireVsCodeApi();

let svgStr: string = "";
let flowMap: any;
let flowWidth = 2000;

window.addEventListener("load", main);

mermaid.parseError = function (err, hash) {
  vscode.postMessage({
    command: "PARSE ERROR",
    text: err,
  });
};

async function main() {
  const saveAsPngButton = document.getElementById("saveasnpng") as Button;
  saveAsPngButton?.addEventListener("click", handleSaveAsPng);

  const zoomInButton = document.getElementById("zoomin") as Button;
  zoomInButton?.addEventListener("click", handleZoomIn);
  const zoomOutButton = document.getElementById("zoomout") as Button;
  zoomOutButton?.addEventListener("click", handleZoomOut);

  try {
    const configSpan = document.getElementById("mermaid-wrapper");
    const darkModeTheme = configSpan?.dataset.darkModeTheme;
    const lightModeTheme = configSpan?.dataset.lightModeTheme;

    mermaid.initialize({
      startOnLoad: false,
      theme:
        document.body.classList.contains("vscode-dark") ||
        document.body.classList.contains("vscode-high-contrast")
          ? darkModeTheme ?? "dark"
          : lightModeTheme ?? "default",
      securityLevel: "loose",
    });
    const element = document.getElementsByClassName("flow-mermaid")[0];
    const mmdStr = element.textContent ?? "";
    await mermaid.parse(mmdStr);

    await mermaid.run({
      querySelector: ".flow-mermaid",
      suppressErrors: true,
    });
    vscode.postMessage({
      command: "rendered",
    });
    const svg = document.querySelector("svg");
    if (svg) {
      svg.addEventListener("click", (evt) => {
        const target = evt?.target ? evt.target.innerText : "no-target";
        vscode.postMessage({
          command: "nodeClicked",
          text: target,
        });
      });
    }
  } catch (e: any) {
    vscode.postMessage({
      command: "CAUGHT",
      text: e.message,
    });
  }
}

window.addEventListener("message", (event) => {
  const message = event.data; // The JSON data our extension sent

  switch (message.command) {
    case "parsedXml":
      flowMap = message.message;
      break;
  }
});

function handleSaveAsPng() {
  const svgImage = document.createElement("img");

  const svg2 = document.querySelector("svg");
  var box = svg2?.viewBox.baseVal;

  document.body.appendChild(svgImage);
  svgImage.onload = function () {
    const canvas = document.createElement("canvas");
    if (box) {
      canvas.width = box.width;
      canvas.height = box.height;
    }
    const canvasCtx = canvas.getContext("2d");
    canvasCtx?.drawImage(svgImage, 0, 0);
    var a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.setAttribute(
      "download",
      flowMap["label"].replaceAll(" ", "-").toLowerCase() + ".flow.png",
    );
    a.dispatchEvent(new MouseEvent("click"));
  };
  const svg = document.querySelector("svg");
  const svgData = new XMLSerializer().serializeToString(svg as SVGSVGElement);
  svgImage.src =
    "data:image/svg+xml;charset=utf-8;base64," +
    btoa(unescape(encodeURIComponent(svgData)));
}

function handleZoomIn() {
  const elem = document.getElementById("flow-mermaid");
  if (elem) {
    let flowWidth = elem.getBoundingClientRect().width;
    flowWidth += 1000;
    (<any>elem.style)["min-width"] = flowWidth + "px";
  }
}

function handleZoomOut() {
  const elem = document.getElementById("flow-mermaid");
  if (elem) {
    let flowWidth = elem.getBoundingClientRect().width;
    flowWidth -= 1000;
    (<any>elem.style)["min-width"] = flowWidth + "px";
  }
}
