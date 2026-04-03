# 03. AI Gemini 통합

Google Gemini 2.0 Flash를 활용한 AI 기능 전체를 다룹니다.

---

## 파일 위치

```
src/utils/gemini.js
```

---

## 환경 변수

| 변수명 | 설명 |
|--------|------|
| `VITE_GEMINI_API_KEY` | Google AI Studio에서 발급한 API 키 |

```js
// src/utils/gemini.js 상단
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const MODEL   = 'gemini-2.0-flash';
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;
```

---

## 함수 목록

### 1. parseNLWithGemini(text)

자연어 텍스트를 업무/약속 필드로 파싱합니다.

**용도**: NLStrip에서 사용자 입력을 받아 폼 자동 완성

```js
/**
 * @param {string} text - 자연어 입력 (예: "내일 오후 2시 팀 미팅 30분")
 * @returns {Promise<Object>} 파싱된 필드 객체
 */
export async function parseNLWithGemini(text) { ... }
```

**반환 예시**:
```json
{
  "title": "팀 미팅",
  "task_date": "2026-04-04",
  "task_time": "14:00",
  "duration": 30,
  "priority": "medium"
}
```

**프롬프트 전략**:
- 현재 날짜를 컨텍스트로 제공하여 상대적 날짜("내일", "다음 주") 해석
- JSON 형식으로만 응답하도록 지시
- 파악되지 않은 필드는 `null`로 반환

---

### 2. summarizeSchedule(tasks, appts, dateStr)

특정 날짜의 업무와 약속 목록을 AI가 자연어로 요약합니다.

**용도**: FocusPanel의 "✨ AI 일정 요약" 버튼

```js
/**
 * @param {Array}  tasks   - 해당 날짜의 업무 배열
 * @param {Array}  appts   - 해당 날짜의 약속 배열
 * @param {string} dateStr - 날짜 문자열 (예: "2026-04-03")
 * @returns {Promise<string>} 자연어 요약 텍스트
 */
export async function summarizeSchedule(tasks, appts, dateStr) { ... }
```

**반환 예시**:
```
오늘은 오전 10시 팀 스탠드업을 시작으로 오후에 기획 문서 작성이 예정되어 있습니다.
총 3건의 업무 중 2건이 높은 우선순위입니다. 오후 일정이 집중되어 있으니 오전을
집중 업무 시간으로 활용하는 것을 추천합니다.
```

**FocusPanel 연동**:
```jsx
// src/components/FocusPanel.jsx
const handleSummarize = async () => {
  setSummaryLoading(true);
  const text = await summarizeSchedule(todayTasks, todayAppts, selectedDate);
  setSummary(text);
  setSummaryLoading(false);
};

// UI
<button onClick={handleSummarize}>✨ AI 일정 요약</button>
{summary && <p className="summary-text">{summary}</p>}
```

---

### 3. generateDescription(title, category, date)

업무 제목과 카테고리를 기반으로 상세 설명을 자동 생성합니다.

**용도**: 업무 생성 폼에서 설명 필드 자동 완성

```js
/**
 * @param {string} title    - 업무 제목
 * @param {string} category - 업무 카테고리
 * @param {string} date     - 업무 날짜
 * @returns {Promise<string>} 생성된 설명 텍스트
 */
export async function generateDescription(title, category, date) { ... }
```

**반환 예시**:
```
"분기 보고서 작성" 업무를 완료하기 위해 필요한 데이터 수집, 분석, 시각화 작업을
포함합니다. 마감 기한 전에 검토 시간을 확보하세요.
```

---

### 4. suggestTime(title, tasks, date)

기존 일정과의 충돌을 피해 최적의 업무 시작 시각을 제안합니다.

**용도**: 업무 생성 시 "시간 추천" 버튼

```js
/**
 * @param {string} title - 새로 생성할 업무 제목
 * @param {Array}  tasks - 해당 날짜의 기존 업무/약속 배열
 * @param {string} date  - 대상 날짜
 * @returns {Promise<string>} 추천 시각 (HH:MM 형식)
 */
export async function suggestTime(title, tasks, date) { ... }
```

**반환 예시**: `"10:30"`

**로직 설명**: 기존 업무 시간대를 컨텍스트로 제공하고, 빈 슬롯 중 업무 특성(집중도, 유형)에 맞는 시간대를 AI가 판단하여 추천합니다.

---

## API 호출 공통 패턴

```js
const response = await fetch(API_URL, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    contents: [{
      parts: [{ text: prompt }]
    }],
    generationConfig: {
      responseMimeType: 'application/json', // parseNL 등 JSON 응답 시
      temperature: 0.2,                     // 낮은 창의성 (정확도 우선)
    }
  })
});

const data = await response.json();
return data.candidates[0].content.parts[0].text;
```

---

## 오류 처리

```js
try {
  const result = await parseNLWithGemini(text);
  return result;
} catch (err) {
  console.error('[Gemini] 파싱 실패:', err);
  return {};  // 빈 객체 반환 → 폼은 그대로 유지
}
```

- API 키 미설정 시: 콘솔 경고 후 빈 결과 반환
- 네트워크 오류 시: 폼 상태 변경 없이 조용히 실패
- JSON 파싱 실패 시: 원본 텍스트를 title 필드에 그대로 사용

---

## 기능별 사용 위치 요약

| 함수 | 사용 컴포넌트 | 트리거 |
|------|-------------|--------|
| `parseNLWithGemini` | `NLStrip.jsx` | Enter 또는 전송 버튼 |
| `summarizeSchedule` | `FocusPanel.jsx` | "✨ AI 일정 요약" 버튼 |
| `generateDescription` | `UnifiedCreateModal.jsx` | "설명 자동 생성" 버튼 |
| `suggestTime` | `UnifiedCreateModal.jsx` | "시간 추천" 버튼 |
