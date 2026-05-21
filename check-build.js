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

// Vercel 프로젝트 설정에서 Output Directory가 public으로 잡혀 있어도 통과되도록
// 빌드할 때 public 폴더를 자동 생성하고 index.html을 복사함
if (!fs.existsSync("public")) {
  fs.mkdirSync("public");
}

fs.copyFileSync("index.html", "public/index.html");

console.log("build ok: public/index.html created / api/generate-diary.js exists");
