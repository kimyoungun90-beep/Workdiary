export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "POST만 지원합니다." });
  }

  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "Vercel 환경변수 OPENAI_API_KEY가 설정되지 않았습니다." });
    }

    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    const {
      manager = "",
      workDate = "",
      style = "보고용 정리",
      visits = [],
      tasks = []
    } = body;

    const compactVisits = visits
      .filter(v => (v.place || "").trim())
      .map((v, idx) => ({
        order: idx + 1,
        place: clean(v.place),
        consultants: clean(v.consultants),
        curators: clean(v.curators),
        attendanceNote: clean(v.attendanceNote)
      }));

    const compactTasks = tasks
      .filter(t => [t.place, t.type, t.issue, t.action, t.followUp, t.memo].some(x => clean(x)))
      .map((t, idx) => ({
        no: idx + 1,
        place: clean(t.place),
        type: clean(t.type),
        issue: clean(t.issue),
        action: clean(t.action),
        followUp: clean(t.followUp),
        memo: clean(t.memo)
      }));

    if (compactTasks.length === 0 && compactVisits.length === 0) {
      return res.status(400).json({ error: "방문지 또는 업무내용을 1개 이상 입력해주세요." });
    }

    const system = `너는 삼성전자 코스트코 채널 현장관리자의 업무일지를 작성하는 보고서 보조자다.
반드시 사용자가 입력한 내용만 바탕으로 작성한다.
없는 사람 이름, 점포명, 모델명, 매출 수치, 일정, 완료 여부를 임의로 만들지 않는다.
처리 진행이 완료로 입력된 경우만 완료 표현을 쓴다.
진행 중이거나 후속조치가 남은 경우에는 '진행 중', '확인 예정', '후속 관리 예정'으로 쓴다.
문체는 삼성전자/코스트코 현장 업무보고식으로 간결하게 작성한다.
출력은 엑셀 업무일지에 바로 붙여넣을 수 있는 텍스트만 작성하고, 마크다운 표나 코드블록은 쓰지 않는다.

업무일지 기본 형식:
■ 방문지 묶음 제목

1. 코스트코 ○○점

 1) 업무유형
   - 핵심 이슈 요약
   ㆍ 세부 확인 내용
       : 처리 진행 내용
       : 추가 확인 내용
       → 결과 또는 후속 조치

작성 스타일별 기준:
- 기본 업무일지: 사실 중심으로 무난하게 작성
- 보고용 정리: 업무보고에 바로 넣을 수 있게 제목/조치/결과 중심 작성
- 임원 보고용: 짧고 핵심 중심, 불필요한 세부 묘사 축소
- 주간동향 보고용: 현장 흐름과 재발 가능성, 관리 포인트까지 포함
- 간단 요약형: 항목별 1~2줄 중심
- 상세 기록형: 발생내용/확인내용/처리진행/후속조치가 보이게 상세 작성`;

    const user = {
      담당자: manager,
      업무일자: workDate,
      작성스타일: style,
      방문순서와출근현황: compactVisits,
      업무입력내용: compactTasks,
      요청: "위 입력값을 바탕으로 업무내용 섹션만 작성해줘. 방문지별로 묶고, 방문지별 출근현황이 있으면 첫 항목으로 자연스럽게 포함해줘."
    };

    const model = process.env.OPENAI_MODEL || "gpt-4.1-mini";
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        input: [
          { role: "system", content: system },
          { role: "user", content: JSON.stringify(user, null, 2) }
        ],
        temperature: 0.3,
        max_output_tokens: 2200
      })
    });

    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json({
        error: data?.error?.message || "OpenAI API 호출 중 오류가 발생했습니다.",
        detail: data
      });
    }

    const text = extractOutputText(data).trim();
    return res.status(200).json({ text, model });
  } catch (error) {
    return res.status(500).json({ error: error.message || "알 수 없는 오류가 발생했습니다." });
  }
}

function clean(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function extractOutputText(data) {
  if (data.output_text) return data.output_text;
  const parts = [];
  for (const item of data.output || []) {
    for (const content of item.content || []) {
      if (content.type === "output_text" && content.text) parts.push(content.text);
      if (content.text) parts.push(content.text);
    }
  }
  return parts.join("\n");
}
