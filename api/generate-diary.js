export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST only" });
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        error: "GEMINI_API_KEY 환경변수가 없습니다. Vercel Settings > Environment Variables에 등록하세요."
      });
    }

    const body = req.body || {};
    const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";

    const systemPrompt = `
너는 삼성전자 코스트코 채널 현장관리자의 업무일지 작성 도우미다.

[절대 규칙]
- 사용자가 입력한 사실만 기반으로 작성한다.
- 없는 점포명, 사람명, 모델명, 매출 수치, 완료 여부는 절대 만들지 않는다.
- 마크다운 굵게 표시(**텍스트**), 코드블록, 인사말, 설명문은 쓰지 않는다.
- "발생 내용:", "확인 내용:", "세부 확인 내용:" 같은 라벨을 임의로 붙이지 않는다.
- 완료라고 입력되지 않은 건은 "진행 중", "확인 예정", "후속 관리 예정"으로 작성한다.
- 문체는 삼성전자/코스트코 현장관리자 업무보고 스타일로 간결하게 작성한다.

[중요한 입력 해석]
- subject는 업무 주제/제목이다. 반드시 해당 업무의 핵심 제목으로 반영한다.
- issue는 배경/이슈사항이다.
- workDone은 실제 한 일이다.
- followUp은 결과, 기대효과, 후속조치다.
- memo는 보조 정보이며 필요한 경우에만 자연스럽게 포함한다.

[기본 형식]
1. 방문지명

 1) 업무유형
   - subject 또는 핵심 제목
   ㆍ issue를 자연스러운 보고 문장으로 정리
       : workDone을 구체적인 시행 내용으로 정리
       : memo가 있으면 필요한 내용만 추가
       → followUp을 결과/기대효과/후속조치 문장으로 정리

[간결한 입력 예시]
입력:
방문지: 사무실
업무유형: 매출 점검
subject: W21 CE/MX 매출 취합 및 현황 분석
issue: W21 매출 취합 필요
workDone: KSP 포탈 배송 완료 및 점포 입점 기준 CE/MX 매출 취합
followUp: 점포별 현장 관리 지표로 활용 예정
memo: 대구·혁신점 매출 상위권 확인, 대전·세종점 매출 독려 필요 확인

출력 예시:
1. 사무실

 1) 매출 점검
   - W21 CE/MX 매출 취합 및 현황 분석
   ㆍ W21 CE/MX 매출 현황 파악을 위한 취합 필요 확인
       : KSP 포탈 배송 완료 및 점포 입점 기준으로 CE/MX 매출 취합 진행
       : 대구·혁신점 매출 상위권 확인, 대전·세종점 매출 독려 필요 확인
       → 점포별 현장 관리 지표로 활용 예정

[출근 인원 작성]
- 상담사/큐레이터 정보가 실제로 있는 경우에만 방문지 하단 첫 항목으로 간단히 포함한다.
- 해당없음 또는 공란이면 출근 문구를 아예 쓰지 않는다.
- 휴무인 경우에는 "상담사 휴무 확인" 또는 "큐레이터 휴무 확인"처럼 간단히 작성한다.
`;

    const userPrompt = buildPrompt(body);
    const fullPrompt = `${systemPrompt}\n\n${userPrompt}`;

    const url =
      "https://generativelanguage.googleapis.com/v1beta/models/" +
      encodeURIComponent(model) +
      ":generateContent?key=" +
      encodeURIComponent(apiKey);

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: fullPrompt }] }],
        generationConfig: {
          temperature: 0.18,
          maxOutputTokens: 2500
        }
      })
    });

    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json({
        error: data?.error?.message || "Gemini API 호출 실패. API 키, 모델명, 무료 한도를 확인하세요.",
        detail: data
      });
    }

    const text = cleanText(extractGeminiText(data));
    return res.status(200).json({ text });
  } catch (err) {
    return res.status(500).json({ error: err?.message || String(err) });
  }
}

function buildPrompt(body) {
  const styleMode = body.styleMode || "보고용 정리";
  const manager = body.manager || "";
  const visits = body.visits || [];
  const tasks = body.tasks || [];

  return `
아래 입력값을 바탕으로 업무일지의 [업무내용] 영역만 작성해줘.

[작성 스타일]
${styleMode}

[담당자]
${manager}

[방문 순서 및 출근 인원]
${JSON.stringify(visits, null, 2)}

[업무 입력 목록]
${JSON.stringify(tasks, null, 2)}

[작성 조건]
- 방문지별로 묶어서 작성한다.
- 방문 순서가 있으면 방문 순서대로 작성한다.
- 업무유형이 기타에서 직접입력된 경우, 직접입력명을 업무유형 제목으로 사용한다.
- subject가 있으면 무조건 '-' 제목 줄에 반영한다.
- issue, workDone, followUp은 각각 1~2문장으로 자연스럽게 압축한다.
- memo는 필요한 경우에만 ':' 보조 줄로 포함한다.
- 중복 표현은 줄이고, 입력된 핵심은 누락하지 않는다.
- 최종 답변은 업무내용 본문만 작성한다.

[스타일별 작성 기준]
기본 업무일지:
- 현장 기록용으로 사실 중심 작성
- 업무별 ㆍ와 :를 균형 있게 사용

보고용 정리:
- 업무보고에 바로 붙여넣을 수 있게 정리
- 너무 길게 늘리지 말고 핵심만 작성

임원 보고용:
- 가장 짧고 명확하게 작성
- 업무별로 ㆍ는 1개 정도, :는 필요할 때만 사용
- 세부 라벨 없이 결과와 후속관리 중심으로 작성

주간동향 보고용:
- 단순 처리 내용 외에 현장 흐름, 재발 가능성, 관리 필요성을 간단히 포함

간단 요약형:
- 방문지별 구분 후 업무별 한 줄 중심으로 작성

상세 기록형:
- 상세하게 쓰되 "발생 내용", "확인 내용" 같은 고정 라벨은 사용하지 않는다.
- subject → issue → workDone → memo → followUp 순서로 자연스럽게 정리한다.
`;
}

function extractGeminiText(data) {
  const parts = data?.candidates?.[0]?.content?.parts || [];
  return parts.map((part) => part.text || "").join("\n").trim();
}

function cleanText(text) {
  return String(text || "")
    .replace(/\*\*/g, "")
    .replace(/```[\s\S]*?```/g, "")
    .trim();
}
