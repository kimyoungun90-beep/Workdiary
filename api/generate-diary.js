export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST 요청만 사용할 수 있습니다." });
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: "GEMINI_API_KEY 환경변수가 없습니다. Vercel Settings > Environment Variables에 등록하세요."
      });
    }

    const body = req.body || {};
    const model = process.env.GEMINI_MODEL || "gemini-2.0-flash-lite";

    const prompt = buildPrompt(body);

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
            parts: [{ text: prompt }]
          }
        ],
        generationConfig: {
          temperature: 0.2,
          topP: 0.8,
          topK: 40,
          maxOutputTokens: 8192
        }
      })
    });

    const data = await response.json();

    if (!response.ok) {
      const rawMessage =
        data?.error?.message ||
        data?.error?.details?.[0]?.reason ||
        "Gemini API 호출 실패";

      const friendlyMessage = convertGeminiError(rawMessage, response.status);

      return res.status(response.status).json({
        error: friendlyMessage,
        raw: rawMessage
      });
    }

    const finishReason = data?.candidates?.[0]?.finishReason || "";
    const text = cleanOutput(extractGeminiText(data));

    if (finishReason === "MAX_TOKENS") {
      return res.status(500).json({
        error:
          "AI 답변이 길이 제한으로 중간에 끊겼습니다. 업무 항목을 줄이거나 다시 생성해주세요."
      });
    }

    if (finishReason === "SAFETY") {
      return res.status(500).json({
        error:
          "AI 안전 필터로 인해 답변 생성이 중단되었습니다. 입력 문구를 조금 순화해서 다시 시도해주세요."
      });
    }

    if (!text) {
      return res.status(500).json({
        error: "AI 결과가 비어 있습니다. 다시 시도해주세요."
      });
    }

    if (looksBroken(text)) {
      return res.status(500).json({
        error:
          "AI 결과가 중간에 끊겼거나 형식이 불완전합니다. 다시 생성해주세요."
      });
    }

    return res.status(200).json({
      text,
      finishReason
    });
  } catch (err) {
    return res.status(500).json({
      error: err?.message || String(err)
    });
  }
}

function buildPrompt(body) {
  const manager = safe(body.manager || "");
  const styleMode = safe(body.styleMode || "보고용 정리");
  const visits = Array.isArray(body.visits) ? body.visits : [];
  const tasks = Array.isArray(body.tasks) ? body.tasks : [];

  const visitText = visits.length
    ? visits.map((v, idx) => formatVisit(v, idx)).join("\n\n")
    : "방문 순서 입력 없음";

  const taskText = tasks.length
    ? tasks.map((t, idx) => formatTask(t, idx)).join("\n\n")
    : "업무 입력 없음";

  return `
너는 삼성전자 코스트코 채널 현장관리자의 업무일지를 작성하는 전용 도우미다.
아래 입력값만 사용해서 업무일지의 [업무내용] 본문만 작성한다.

[중요 규칙]
- 반드시 한국어로만 작성한다.
- 중국어, 영어 표, 논문 문장, 외부 자료, 관련 없는 문장은 절대 넣지 않는다.
- 사용자가 입력하지 않은 사람 이름, 점포명, 매출 수치, 모델명은 절대 만들지 않는다.
- 완료라고 입력된 건만 완료라고 표현한다.
- 진행 중인 건은 "진행 중", "확인 예정", "후속 관리 예정"으로 표현한다.
- 내용이 부족해도 지어내지 말고, 입력된 내용 범위에서만 자연스럽게 정리한다.
- 최종 답변에는 인사말, 설명문, 코드블록, 마크다운 안내문을 쓰지 않는다.
- 답변은 업무일지 본문만 작성한다.
- 모든 업무 항목은 반드시 마지막에 "→ 결과 또는 후속 조치" 문장까지 작성한다.
- 마지막 항목이 중간에 끊기지 않도록 완성된 문장으로 마무리한다.
- 후속조치가 비어 있으면 "→ 후속 확인 예정" 또는 "→ 현황 지속 관리 예정"으로 마무리한다.
- 절대 항목을 쓰다가 중간에 멈추지 않는다.

[작성 스타일]
${styleMode}

[담당자]
${manager}

[방문 순서 및 출근 인원]
${visitText}

[업무 입력 목록]
${taskText}

[작성 형식]
방문지별로 묶어서 아래 형식으로 작성한다.

1. 방문지명

 1) 업무유형 또는 업무 주제
   - 핵심 이슈 요약
   ㆍ 세부 확인 내용
       : 한 일 또는 처리 내용
       : 추가 확인 내용
       → 결과 또는 후속 조치

[출근/휴무 작성 기준]
- 상담사 또는 큐레이터가 출근이면 "출근 확인"으로 작성한다.
- 상담사 또는 큐레이터가 휴무이면 "휴무로 확인"으로 작성한다.
- 미확인 또는 해당없음이면 과장하지 말고 간단히 생략하거나 "특이사항 없음" 수준으로만 작성한다.
- 출근 인원 내용은 업무내용 흐름에 자연스럽게 포함한다.

[업무유형별 작성 기준]
- 진열 점검: 진열 상태, 시연 상태, SYNC, POP, 위치, 노출 상태 중심으로 작성
- VOC 처리: 발생 원인, 고객 불편, 확인 내용, 한 일, 후속 관리 중심으로 작성
- 상담사 면담: 응대 상태, 세일즈 토크, 근무 상태, 개선점 중심으로 작성
- 큐레이터 면담: 활동 내용, 교육 필요 사항, 현장 의견 중심으로 작성
- 거래선 미팅: 거래선 요청사항, 협의 내용, 현장 운영 영향 중심으로 작성
- 행사 공유: 행사 일정, 응대 방향, 가망 고객 확보, 현장 공유 중심으로 작성
- 매출 리뷰: 실적 현황, 부진/호조 요인, 후속 관리 방향 중심으로 작성
- 교육: 교육 대상, 교육 내용, 기대 효과 중심으로 작성
- 신입 면담: 적응 상태, 기본 업무 이해도, 교육 필요 사항 중심으로 작성
- 퇴직 면담: 퇴직 사유, 인수인계, 운영 공백 관리 중심으로 작성
- 거래선 상견례: 담당자 소개, 협조 요청, 향후 소통 방향 중심으로 작성
- 진열 변경 요청: 변경 사유, 요청 내용, 기대 효과 중심으로 작성
- 거래선 매출 요청: 요청 배경, 공유 내용, 후속 확인 중심으로 작성
- 기타: 사용자가 입력한 기타 업무유형명을 제목으로 자연스럽게 작성

[스타일별 차이]
기본 업무일지:
- 현장 기록용으로 사실 중심 작성

보고용 정리:
- 업무보고에 바로 붙여넣을 수 있게 간결하게 정리

임원 보고용:
- 핵심 위주로 짧고 명확하게 작성

주간동향 보고용:
- 단순 처리 내용 외에 현장 흐름과 재발 가능성까지 간단히 포함

간단 요약형:
- 항목별 한 줄 중심으로 작성하되, 의미가 끊기지 않게 작성

상세 기록형:
- 발생 내용, 확인 내용, 한 일, 후속조치를 구분해서 상세히 작성
`;
}

function formatVisit(v, idx) {
  const place = getField(v, ["place", "visitPlace", "store", "방문지"]) || "";
  const consultants = getField(v, ["consultants", "consultant", "consultantNames", "상담사"]) || "";
  const curators = getField(v, ["curators", "curator", "curatorNames", "큐레이터"]) || "";
  const consultantStatus =
    getField(v, ["consultantStatus", "consultantsStatus", "상담사상태"]) || "";
  const curatorStatus =
    getField(v, ["curatorStatus", "curatorsStatus", "큐레이터상태"]) || "";

  return `[방문 ${idx + 1}]
방문지: ${safe(place)}
상담사: ${safe(consultants)}
상담사 상태: ${safe(consultantStatus)}
큐레이터: ${safe(curators)}
큐레이터 상태: ${safe(curatorStatus)}`;
}

function formatTask(t, idx) {
  const place = getField(t, ["place", "visitPlace", "store", "방문지"]) || "";
  const rawType = getField(t, ["type", "workType", "업무유형"]) || "";
  const customType =
    getField(t, ["customType", "etcType", "typeEtc", "otherType", "기타업무유형"]) || "";
  const title = getField(t, ["title", "subject", "topic", "workTitle", "업무주제", "업무제목"]) || "";
  const issue = getField(t, ["issue", "problem", "이슈사항"]) || "";
  const done =
    getField(t, ["done", "action", "workDone", "whatDid", "process", "progress", "한일", "한 일"]) || "";
  const followUp =
    getField(t, ["followUp", "followup", "result", "effect", "next", "후속조치"]) || "";
  const memo = getField(t, ["memo", "note", "extra", "추가메모"]) || "";

  const finalType =
    rawType === "기타" && customType ? customType : rawType || customType || "기타";

  return `[업무 ${idx + 1}]
방문지: ${safe(place)}
업무유형: ${safe(finalType)}
업무 주제/제목: ${safe(title)}
이슈사항: ${safe(issue)}
한 일: ${safe(done)}
후속조치(결과, 기대, 효과 등): ${safe(followUp)}
추가 메모: ${safe(memo)}`;
}

function getField(obj, keys) {
  for (const key of keys) {
    if (obj && obj[key] !== undefined && obj[key] !== null) {
      return String(obj[key]).trim();
    }
  }
  return "";
}

function safe(value) {
  return String(value || "")
    .replace(/\r/g, "")
    .replace(/\t/g, " ")
    .trim();
}

function extractGeminiText(data) {
  const parts = data?.candidates?.[0]?.content?.parts || [];
  return parts
    .map((part) => part.text || "")
    .join("\n")
    .trim();
}

function cleanOutput(text) {
  let result = String(text || "").trim();

  result = result.replace(/```[\s\S]*?```/g, (match) => {
    return match.replace(/```[a-zA-Z]*\n?/g, "").replace(/```/g, "");
  });

  result = result.replace(/^업무내용\s*[:：]?\s*/i, "");
  result = result.replace(/^다음은.*$/gm, "");
  result = result.replace(/^물론입니다.*$/gm, "");
  result = result.replace(/^아래와 같이.*$/gm, "");

  return result.trim();
}

function looksBroken(text) {
  const value = String(text || "").trim();

  if (!value) return true;

  const lastLine = value.split("\n").map((x) => x.trim()).filter(Boolean).pop() || "";

  if (lastLine.endsWith("-")) return true;
  if (lastLine.endsWith("ㆍ")) return true;
  if (lastLine.endsWith(":")) return true;
  if (lastLine.endsWith("：")) return true;

  const suspiciousChinese =
    /[\u4e00-\u9fff]{8,}/.test(value) &&
    !/(김영언|심창보|코스트코|삼성|대구|대전|세종|혁신|상담사|큐레이터)/.test(value);

  if (suspiciousChinese) return true;

  return false;
}

function convertGeminiError(message, status) {
  const msg = String(message || "");

  if (status === 429 || msg.includes("Quota exceeded") || msg.includes("quota")) {
    return "Gemini 무료 요청 한도를 초과했습니다. 1분 정도 기다렸다가 다시 시도하거나, Vercel의 GEMINI_MODEL 값을 gemini-2.0-flash-lite로 변경해주세요.";
  }

  if (msg.includes("API key not valid") || msg.includes("API_KEY_INVALID")) {
    return "Gemini API 키가 올바르지 않습니다. Vercel의 GEMINI_API_KEY 값을 다시 확인해주세요.";
  }

  if (msg.includes("models/") && msg.includes("not found")) {
    return "Gemini 모델명을 찾을 수 없습니다. Vercel의 GEMINI_MODEL 값을 gemini-2.0-flash-lite로 변경해주세요.";
  }

  if (msg.includes("User location is not supported")) {
    return "현재 위치 또는 계정 설정에서 Gemini API 사용이 제한될 수 있습니다. Google AI Studio 설정을 확인해주세요.";
  }

  return msg || "Gemini API 호출 중 오류가 발생했습니다.";
}
