export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST only' });
  }

  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'OPENAI_API_KEY 환경변수가 없습니다. Vercel Settings > Environment Variables에 등록하세요.' });
    }

    const body = req.body || {};
    const model = process.env.OPENAI_MODEL || 'gpt-4.1-mini';

    const systemPrompt = `너는 삼성전자 코스트코 채널 현장관리자의 업무일지를 작성하는 도우미다.
반드시 사용자가 입력한 사실만 기반으로 작성한다.
없는 사람 이름, 점포명, 매출 수치, 모델명은 절대 만들지 않는다.
완료라고 입력된 건만 완료라고 쓴다.
진행 중인 건은 진행 중, 확인 예정, 후속 관리 예정으로 쓴다.
문체는 간결한 업무보고체로 쓴다.
기본 형식은 다음을 따른다.
1) 업무유형
   - 핵심 이슈 요약
   ㆍ 세부 확인 내용
       : 처리 진행 내용
       : 추가 확인 내용
       → 결과 또는 후속 조치`;

    const userPrompt = buildPrompt(body);

    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        input: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.35,
        max_output_tokens: 2500
      })
    });

    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json({ error: data?.error?.message || 'OpenAI API 호출 실패', detail: data });
    }

    const text = extractOutputText(data);
    return res.status(200).json({ text });
  } catch (err) {
    return res.status(500).json({ error: err?.message || String(err) });
  }
}

function buildPrompt(body) {
  return `아래 입력값을 바탕으로 업무일지의 [업무내용] 영역만 작성해줘.

[작성 스타일]
${body.styleMode || '보고용 정리'}

[담당자]
${body.manager || ''}

[방문 순서 및 출근 인원]
${JSON.stringify(body.visits || [], null, 2)}

[업무 입력 목록]
${JSON.stringify(body.tasks || [], null, 2)}

[작성 조건]
- 방문지별로 묶어서 작성
- 업무유형별 제목을 붙일 것
- 입력한 이슈사항, 처리진행, 후속조치를 자연스럽게 보고용 문장으로 정리
- 상담사/큐레이터 출근 현황이 있으면 방문지 하단에 자연스럽게 포함
- 중복 내용은 합치되, 중요한 이슈는 누락하지 말 것
- 너무 과장된 표현 금지
- 최종 답변은 업무내용 본문만 작성`;
}

function extractOutputText(data) {
  if (typeof data.output_text === 'string') return data.output_text;
  const chunks = [];
  for (const item of data.output || []) {
    for (const content of item.content || []) {
      if (content.type === 'output_text' && content.text) chunks.push(content.text);
      if (content.type === 'text' && content.text) chunks.push(content.text);
    }
  }
  return chunks.join('\n').trim();
}
