// ── Google Gemini AI 유틸리티 ─────────────────────────────────────────────────
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`;

async function callGemini(prompt, jsonMode = false) {
  if (!API_KEY) return null;
  try {
    const body = {
      contents: [{ parts: [{ text: prompt }] }],
    };
    if (jsonMode) {
      body.generationConfig = { responseMimeType: 'application/json' };
    }
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return null;
    if (jsonMode) {
      try { return JSON.parse(text); } catch { return null; }
    }
    return text;
  } catch {
    return null;
  }
}

// ── 1. 자연어 → 일정 구조체 파싱 ─────────────────────────────────────────────
// 반환: { title, task_date, task_time, due_date, priority, category, duration }
export async function parseNLWithGemini(text) {
  const today = new Date().toISOString().slice(0, 10);
  const prompt = `오늘 날짜: ${today}
다음 한국어 텍스트에서 일정/업무 정보를 추출해서 JSON으로 반환해줘.

텍스트: "${text}"

반환 JSON 형식 (해당 없으면 null):
{
  "title": "업무 제목",
  "task_date": "YYYY-MM-DD",
  "task_time": "HH:MM",
  "due_date": "YYYY-MM-DD",
  "priority": "high|medium|low",
  "category": "업무|개인|미팅|기타",
  "duration": 분(숫자),
  "allDay": true|false
}

규칙:
- 오늘=today, 내일=tomorrow, 모레=day after tomorrow
- 우선순위 키워드: 긴급/중요=high, 보통=medium, 여유=low
- 시간이 없으면 allDay: true
- title은 날짜/시간/우선순위 제외한 핵심 업무명`;

  return await callGemini(prompt, true);
}

// ── 2. 일정 요약 생성 ─────────────────────────────────────────────────────────
// tasks, appointments 배열 받아서 한국어 요약 텍스트 반환
export async function summarizeSchedule(tasks, appointments, dateStr) {
  if (!tasks?.length && !appointments?.length) return null;

  const taskList = tasks.slice(0, 10).map(t =>
    `- [${t.status === 'done' ? '완료' : t.status === 'in_progress' ? '진행중' : '할일'}] ${t.title}${t.priority === 'high' ? ' (긴급)' : ''}`
  ).join('\n');

  const apptList = appointments.slice(0, 5).map(a =>
    `- ${a.start_time?.slice(0, 5) || ''} ${a.title}${a.location ? ` @ ${a.location}` : ''}`
  ).join('\n');

  const prompt = `날짜: ${dateStr}
아래 일정을 보고 오늘 하루를 2-3문장으로 간략히 한국어로 요약해줘. 중요한 것을 먼저 언급하고, 실용적인 조언을 한 줄 추가해줘.

업무 목록:
${taskList || '없음'}

약속/일정:
${apptList || '없음'}`;

  return await callGemini(prompt, false);
}

// ── 3. 업무 설명 자동 생성 ────────────────────────────────────────────────────
// 제목+카테고리+날짜 → 설명 텍스트 반환
export async function generateDescription(title, category, date) {
  if (!title?.trim()) return null;
  const prompt = `업무명: "${title}"
카테고리: ${category || '업무'}
날짜: ${date || '미정'}

위 업무에 대한 간결한 업무 설명을 한국어로 2-3문장 작성해줘. 업무 목적, 주요 내용, 완료 기준을 포함해. 너무 딱딱하지 않게.`;

  return await callGemini(prompt, false);
}

// ── 4. 스마트 시간대 추천 ─────────────────────────────────────────────────────
// 기존 일정 패턴 분석 → { time: "HH:MM", reason: "이유" } 반환
export async function suggestTime(title, existingTasks, date) {
  const occupied = existingTasks
    .filter(t => t.task_date === date && t.task_time)
    .map(t => t.task_time?.slice(0, 5))
    .filter(Boolean);

  const prompt = `업무명: "${title}"
날짜: ${date}
이미 잡힌 시간대: ${occupied.length ? occupied.join(', ') : '없음'}

위 업무에 가장 적합한 시작 시간을 추천해줘. 업무 특성(회의/집중업무/외부미팅 등)을 고려하고, 기존 일정과 겹치지 않게.

JSON으로 반환:
{ "time": "HH:MM", "reason": "추천 이유 한 줄" }`;

  return await callGemini(prompt, true);
}
