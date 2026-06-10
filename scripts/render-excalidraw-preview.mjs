import fs from "node:fs";

const [inputPath, outputPath] = process.argv.slice(2);

if (!inputPath || !outputPath) {
  console.error("Usage: node scripts/render-excalidraw-preview.mjs input.excalidraw output.svg");
  process.exit(1);
}

const scene = JSON.parse(fs.readFileSync(inputPath, "utf8"));
const elements = scene.elements.filter((element) => !element.isDeleted);
const visibleElements = elements.filter((element) => element.type !== "text" || element.text?.trim());
const bounds = visibleElements.reduce(
  (acc, element) => {
    const points = element.points ?? [[0, 0], [element.width ?? 0, element.height ?? 0]];
    for (const [dx, dy] of points) {
      acc.minX = Math.min(acc.minX, element.x + dx);
      acc.minY = Math.min(acc.minY, element.y + dy);
      acc.maxX = Math.max(acc.maxX, element.x + dx);
      acc.maxY = Math.max(acc.maxY, element.y + dy);
    }
    acc.minX = Math.min(acc.minX, element.x);
    acc.minY = Math.min(acc.minY, element.y);
    acc.maxX = Math.max(acc.maxX, element.x + Math.max(0, element.width ?? 0));
    acc.maxY = Math.max(acc.maxY, element.y + Math.max(0, element.height ?? 0));
    return acc;
  },
  { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity },
);

const pad = 48;
const viewBox = {
  x: bounds.minX - pad,
  y: bounds.minY - pad,
  width: bounds.maxX - bounds.minX + pad * 2,
  height: bounds.maxY - bounds.minY + pad * 2,
};

function esc(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function color(value, fallback = "transparent") {
  return value && value !== "transparent" ? value : fallback;
}

function opacity(element) {
  return Number.isFinite(element.opacity) ? element.opacity / 100 : 1;
}

function renderRectangle(element) {
  const rx = element.roundness ? 10 : 0;
  return `<rect x="${element.x}" y="${element.y}" width="${Math.abs(element.width)}" height="${Math.abs(element.height)}" rx="${rx}" fill="${color(element.backgroundColor)}" stroke="${color(element.strokeColor, "#1e1e1e")}" stroke-width="${element.strokeWidth ?? 2}" opacity="${opacity(element)}"/>`;
}

function renderArrow(element) {
  const points = element.points.map(([dx, dy]) => `${element.x + dx},${element.y + dy}`).join(" ");
  const marker = element.endArrowhead ? ` marker-end="url(#arrowhead)"` : "";
  return `<polyline points="${points}" fill="none" stroke="${color(element.strokeColor, "#1e1e1e")}" stroke-width="${element.strokeWidth ?? 2}" stroke-linecap="round" stroke-linejoin="round"${marker}/>`;
}

function renderText(element) {
  const fontSize = element.fontSize ?? 18;
  const lines = String(element.text).split("\n");
  const textAnchor = element.textAlign === "center" ? "middle" : "start";
  const x = element.textAlign === "center" ? element.x + Math.abs(element.width ?? 0) / 2 : element.x;
  const lineHeight = fontSize * 1.2;
  const totalHeight = lines.length * lineHeight;
  const y =
    element.verticalAlign === "middle"
      ? element.y + Math.abs(element.height ?? totalHeight) / 2 - totalHeight / 2 + fontSize
      : element.y + fontSize;
  const tspans = lines
    .map((line, index) => `<tspan x="${x}" y="${y + index * lineHeight}">${esc(line)}</tspan>`)
    .join("");
  return `<text font-family="Times New Roman, Liberation Serif, serif" font-size="${fontSize}" fill="${color(element.strokeColor, "#1f2933")}" text-anchor="${textAnchor}">${tspans}</text>`;
}

const rendered = [];
for (const element of elements) {
  if (element.type === "rectangle") rendered.push(renderRectangle(element));
  if (element.type === "arrow") rendered.push(renderArrow(element));
}
for (const element of elements) {
  if (element.type === "text") rendered.push(renderText(element));
}

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${Math.ceil(viewBox.width)}" height="${Math.ceil(viewBox.height)}" viewBox="${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}">
<defs>
  <marker id="arrowhead" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
    <path d="M0,0 L0,6 L9,3 z" fill="#7c5c2d"/>
  </marker>
</defs>
<rect x="${viewBox.x}" y="${viewBox.y}" width="${viewBox.width}" height="${viewBox.height}" fill="#ffffff"/>
${rendered.join("\n")}
</svg>
`;

fs.writeFileSync(outputPath, svg);
