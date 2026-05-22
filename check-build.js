import fs from "fs";

const requiredFiles = ["index.html", "api/generate-diary.js"];

for (const file of requiredFiles) {
  if (!fs.existsSync(file)) {
    console.error(`missing file: ${file}`);
    process.exit(1);
  }
}

// Vercel 프로젝트 Output Directory가 public으로 잡혀 있어도 배포되도록
// 빌드 시 public/index.html을 자동 생성합니다.
if (!fs.existsSync("public")) {
  fs.mkdirSync("public");
}

fs.copyFileSync("index.html", "public/index.html");
console.log("build ok: public/index.html created / api/generate-diary.js exists");
