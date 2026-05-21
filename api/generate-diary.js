export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST only" });
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error:
          "GEMINI_API_KEY 환경변수가 없습니다. Vercel Settings > Environment Variables에 등록하세요."
      });
    }

    const body = req.body || {};
    const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";

    const systemPrompt = `
너는 삼성전자 코스트코 채널 현장관리자의 업무일지를 작성하는 도우미다.

반드시 아래 규칙을 지켜라.

[작성 원칙]
- 사용자가 입력한 사실만 기반으로 작성한다.
- 없는 사람 이름, 점포명, 매출 수치, 모델명은 절대 만들지 않는다.
- 완료라고 입력된 건만 완료라고 표현한다.
- 진행 중인 건은 "진행 중", "확인 예정", "후속 관리 예정"으로 작성한다.
- 문체는 간결한 업무보고체로 작성한다.
- 과장된 표현은 쓰지 않는다.
- 삼성전자 / 코스트코 현장관리자 업무보고 스타일로 작성한다.
- 최종 답변에는 설명문, 인사말, 안내문을 쓰지 않는다.

[기본 작성 형식]
1) 업무유형
   - 핵심 이슈 요약
   ㆍ 세부 확인 내용
       : 처리 진행 내용
       : 추가 확인 내용
       → 결과 또는 후속 조치

[업무유형 예시]
- 진열 점검
- VOC 처리
- 상담사 면담
- 큐레이터 면담
- 거래선 미팅
- 행사 공유
- 매출 리뷰
- 교육
- 신입 면담
- 퇴직 면담
- 거래선 상견례
- 진열 변경 요청
- 거래선 매출 요청
- 재고 확인
- 입고 확인
- 설치 일정 확인
- 배송 지연 확인
- KSP 포탈 확인
- OB 콜 진행
- 판매 스크립트 점검
- 세일즈 코칭
- 우군화 활동
- 기타
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
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              {
                text: fullPrompt
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.35,
          maxOutputTokens: 2500
        }
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error:
          data?.error?.message ||
          "Gemini API 호출 실패. API 키, 모델명, 무료 한도를 확인하세요.",
        detail: data
      });
    }

    const text = extractGeminiText(data);

    return res.status(200).json({
      text
    });
  } catch (err) {
    return res.status(500).json({
      error: err?.message || String(err)
    });
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
- 업무유형별 제목을 붙인다.
- 입력한 이슈사항, 처리진행, 후속조치를 자연스럽게 보고용 문장으로 정리한다.
- 상담사/큐레이터 출근 현황이 있으면 방문지 하단에 자연스럽게 포함한다.
- 중복 내용은 합치되, 중요한 이슈는 누락하지 않는다.
- 너무 과장된 표현은 금지한다.
- 최종 답변은 업무내용 본문만 작성한다.
- 인사말, 설명문, 안내문은 쓰지 않는다.

[스타일별 작성 기준]
기본 업무일지:
- 현장 기록용으로 사실 중심 작성

보고용 정리:
- 업무보고에 바로 붙여넣을 수 있게 정리

임원 보고용:
- 핵심 위주로 짧고 명확하게 작성

주간동향 보고용:
- 단순 처리 내용 외에 현장 흐름과 재발 가능성까지 간단히 포함

간단 요약형:
- 항목별 한 줄 중심으로 작성

상세 기록형:
- 발생 내용, 확인 내용, 처리 진행, 후속 조치를 구분해서 작성
`;
}

function extractGeminiText(data) {
  const parts = data?.candidates?.[0]?.content?.parts || [];
  return parts
    .map((part) => part.text || "")
    .join("\n")
    .trim();
}
