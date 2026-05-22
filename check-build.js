import fs from "fs";

const requiredFiles = [
  "index.html",
  "api/generate-diary.js"
];

for (const file of requiredFiles) {
  if (!fs.existsSync(file)) {
    console.error(`missing file: ${file}`);
    process.exit(1);
  }
}

if (!fs.existsSync("public")) {
  fs.mkdirSync("public");
}

fs.copyFileSync("index.html", "public/index.html");

console.log("build ok: public/index.html created / api/generate-diary.js exists");
