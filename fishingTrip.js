#!/usr/bin/env node

import path from "path";
import fs from "fs-extra";
import diff from "diff";
import { execSync } from "child_process";

if (process.argv.length < 3) {
  console.log("Please specify the path to the input directory");
  console.log("Example usage: node fishingTrip.js ./FHIRDefinitions");
  process.exit(1);
}

// Determine the input/output dirs
const inDir = process.argv[2];
const outDir = process.argv[3]
  ? process.argv[3]
  : path.join(process.cwd(), "build");
const goFSHOutDir = path.join(outDir, "goFSH");
const sushiOutDir = path.join(outDir, "sushi");
const differentialOutDir = path.join(outDir, "diff");

// goFSH
console.log('\nRunning goFSH\n');
try {
  execSync(`ihsus ${inDir} -o ${goFSHOutDir}`, { stdio: "inherit" });
} catch {}

// sushi
console.log('\nRunning sushi\n')
if (!fs.existsSync(path.join(inDir, "config.yaml"))) {
  console.log(
    `A config.yaml is required for SUSHI to run. Add a config.yaml to ${inDir}`
  );
} else {
  fs.copyFileSync(
    path.join(inDir, "config.yaml"),
    path.join(outDir, "config.yaml")
  );
}
try {
  execSync(`sushi ${outDir} -o ${sushiOutDir}`, { stdio: "inherit" });
} catch {}

console.log('\nGenerating differentials')
// Get the original and round-trip versions of the files
const originalFiles = getFilesRecursive(inDir).filter((file) =>
  file.endsWith(".json")
);
const roundTripFiles = getFilesRecursive(
  path.join(outDir, "sushi")
).filter((file) => file.endsWith(".json"));
const originalJSON = [];
originalFiles.forEach((file) => {
  originalJSON.push(fs.readJSONSync(file));
});
const roundTripJSON = [];
roundTripFiles.forEach((file) => {
  roundTripJSON.push(fs.readJSONSync(file));
});

// Generate a differential for each original JSON file
originalJSON.forEach((originalArtifact) => {
  let html = `
    <head>
      <style>
      * {
        font-family: Consolas, sans-serif
      }
      table { 
        white-space: pre-wrap; 
        width: 100%;
        border-collapse: collapse;
      }
      table, th, td {
        border: 1px solid black
      }
      </style>
    </head>
    <table>
      <tr>
        <th>Element</th>
        <th>Difference</th>
        <th>Original</th>
        <th>Round-trip</th>
      </tr>
    `;
  const roundTripArtifact = roundTripJSON.find((art) => art.id === originalArtifact.id);
  // Compare the original elements to the round-trip version
  originalArtifact.differential.element.forEach((originalED) => {
    const roundTripED = roundTripArtifact.differential.element.find(
      e => e.id === originalED.id
    );
    html += createDifferentialEntry(originalED, roundTripED, originalED.id);
  });
  // Track if there are any elements in the round-trip version not in the original
  roundTripArtifact.differential.element.forEach((roundTripED) => {
    const originalED = originalArtifact.differential.element.find(
      (e) => e.id === roundTripED.id
    );
    if (!originalED) {
      html += createDifferentialEntry(originalED, roundTripED, roundTripED.id);
    }
  });
  html += "</table>";
  fs.ensureDirSync(path.join(differentialOutDir));
  fs.writeFileSync(
    path.join(
      differentialOutDir,
      `${originalArtifact.resourceType}-${originalArtifact.id}-diff.html`
    ),
    html
  );
});

function createDifferentialEntry(originalED, roundTripED, id) {
  const originalElementJSON = JSON.stringify(originalED, null, 2);
  const roundTripElementJSON = JSON.stringify(roundTripED, null, 2);
  const diffParts = diff.diffJson(
    originalElementJSON ? originalElementJSON : "",
    roundTripElementJSON ? roundTripElementJSON : ""
  );
  let diffString = "";
  diffParts.forEach((part) => {
    const color = part.added ? "green" : part.removed ? "red" : "gray";
    diffString += `<span style="color:${color};">${part.value}</span>`;
  });
  return `
      <tr>
        <td>${id}</td>
        <td>${diffString}</td>
        <td>${originalElementJSON}</td>
        <td>${roundTripElementJSON}</td>
      </tr>
      `;
}

function getFilesRecursive(dir) {
  if (fs.statSync(dir).isDirectory()) {
    const ancestors = fs
      .readdirSync(dir, "utf8")
      .map((f) => getFilesRecursive(path.join(dir, f)));
    return [].concat(...ancestors);
  } else {
    return [dir];
  }
}
