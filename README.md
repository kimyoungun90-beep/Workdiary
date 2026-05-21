# 업무일지 AI 자동 작성기 v3 검증본

## 파일 구조

```
index.html
package.json
api/generate-diary.js
README.md
VERIFIED_FILE_CHECK.txt
```

이번 버전은 app.js를 없애고, 화면/스크립트/CSS를 index.html 한 파일에 넣었습니다.
GitHub 업로드 때 index.html과 app.js가 뒤바뀌는 문제를 막기 위한 구조입니다.

## Vercel 환경변수

Vercel > Project > Settings > Environment Variables에서 아래 값을 추가하세요.

```
OPENAI_API_KEY = 발급받은 OpenAI API 키
OPENAI_MODEL = gpt-4.1-mini
```

OPENAI_MODEL은 비워도 기본값 gpt-4.1-mini로 작동합니다.

## 업로드 방법

1. ZIP 압축을 풉니다.
2. GitHub 저장소 최상단에 아래 파일들이 보이도록 업로드합니다.
   - index.html
   - package.json
   - api/generate-diary.js
   - README.md
   - VERIFIED_FILE_CHECK.txt
3. GitHub에서 Commit changes를 누릅니다.
4. Vercel에서 Redeploy 합니다.

## 정상 확인

- Vercel 화면에 코드가 그대로 보이면 index.html이 잘못 올라간 것입니다.
- 정상 화면 첫 제목은 `업무일지 AI 자동 작성기` 입니다.
- package.json 첫 글자는 반드시 `{` 여야 합니다.
- index.html 첫 줄은 반드시 `<!doctype html>` 이어야 합니다.
