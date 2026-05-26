import fs from "fs";
if (!fs.existsSync("index.html")) {
  console.error("missing index.html");
  process.exit(1);
}
if (!fs.existsSync("public")) fs.mkdirSync("public");
fs.copyFileSync("index.html", "public/index.html");
console.log("build ok: public/index.html created");
