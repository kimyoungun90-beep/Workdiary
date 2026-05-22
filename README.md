[README.md](https://github.com/user-attachments/files/28137972/README.md)
# 업무일지 AI 자동 작성기

## 업로드 파일 구조
GitHub 저장소 최상단에 아래 구조로 업로드하세요.

- index.html
- package.json
- check-build.js
- api/generate-diary.js

## Vercel 환경변수
Vercel Environment Variables에 아래 2개를 등록하세요.

- GEMINI_API_KEY = Google AI Studio에서 발급한 API 키
- GEMINI_MODEL = gemini-2.0-flash-lite

## 중요
- 기존 vercel.json 파일은 삭제하세요.
- 기존 public 폴더는 없어도 됩니다. check-build.js가 빌드 중 자동 생성합니다.
- 환경변수 변경 후에는 반드시 Redeploy 하세요.
