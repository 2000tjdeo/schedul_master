/**
 * 한국 공휴일 및 기념일 데이터 (2024~2027)
 * type: 'holiday' = 빨간날(공휴일), 'substitute' = 대체휴일, 'memorial' = 기념일(쉬지 않음)
 */
const HOLIDAYS = {
  // ── 2024 ────────────────────────────────────────────────────────────────────
  '2024-01-01': { name: '신정',          type: 'holiday' },
  '2024-02-09': { name: '설날 연휴',     type: 'holiday' },
  '2024-02-10': { name: '설날',          type: 'holiday' },
  '2024-02-11': { name: '설날 연휴',     type: 'holiday' },
  '2024-02-12': { name: '대체휴일',      type: 'substitute' },
  '2024-03-01': { name: '3·1절',         type: 'holiday' },
  '2024-04-10': { name: '총선',          type: 'holiday' },
  '2024-05-05': { name: '어린이날',      type: 'holiday' },
  '2024-05-06': { name: '대체휴일',      type: 'substitute' },
  '2024-05-15': { name: '부처님오신날',  type: 'holiday' },
  '2024-06-06': { name: '현충일',        type: 'holiday' },
  '2024-08-15': { name: '광복절',        type: 'holiday' },
  '2024-09-16': { name: '추석 연휴',     type: 'holiday' },
  '2024-09-17': { name: '추석',          type: 'holiday' },
  '2024-09-18': { name: '추석 연휴',     type: 'holiday' },
  '2024-10-03': { name: '개천절',        type: 'holiday' },
  '2024-10-09': { name: '한글날',        type: 'holiday' },
  '2024-12-25': { name: '성탄절',        type: 'holiday' },

  // ── 2025 ────────────────────────────────────────────────────────────────────
  '2025-01-01': { name: '신정',          type: 'holiday' },
  '2025-01-28': { name: '설날 연휴',     type: 'holiday' },
  '2025-01-29': { name: '설날',          type: 'holiday' },
  '2025-01-30': { name: '설날 연휴',     type: 'holiday' },
  '2025-03-01': { name: '3·1절',         type: 'holiday' },
  '2025-03-03': { name: '대체휴일',      type: 'substitute' },
  '2025-05-05': { name: '어린이날',      type: 'holiday' },
  '2025-05-06': { name: '대체휴일',      type: 'substitute' }, // 부처님오신날(5/5)·어린이날 겹침
  '2025-06-06': { name: '현충일',        type: 'holiday' },
  '2025-08-15': { name: '광복절',        type: 'holiday' },
  '2025-10-03': { name: '개천절',        type: 'holiday' },
  '2025-10-05': { name: '추석 연휴',     type: 'holiday' },
  '2025-10-06': { name: '추석 연휴',     type: 'holiday' },
  '2025-10-07': { name: '추석',          type: 'holiday' },
  '2025-10-08': { name: '추석 연휴',     type: 'holiday' },
  '2025-10-09': { name: '한글날',        type: 'holiday' },
  '2025-12-25': { name: '성탄절',        type: 'holiday' },

  // ── 2026 ────────────────────────────────────────────────────────────────────
  '2026-01-01': { name: '신정',          type: 'holiday' },
  '2026-02-16': { name: '설날 연휴',     type: 'holiday' },
  '2026-02-17': { name: '설날',          type: 'holiday' },
  '2026-02-18': { name: '설날 연휴',     type: 'holiday' },
  '2026-03-01': { name: '3·1절',         type: 'holiday' },
  '2026-03-02': { name: '대체휴일',      type: 'substitute' },
  '2026-05-05': { name: '어린이날',      type: 'holiday' },
  '2026-05-24': { name: '부처님오신날',  type: 'holiday' },
  '2026-05-25': { name: '대체휴일',      type: 'substitute' },
  '2026-06-06': { name: '현충일',        type: 'holiday' },
  '2026-06-08': { name: '대체휴일',      type: 'substitute' },
  '2026-08-15': { name: '광복절',        type: 'holiday' },
  '2026-08-17': { name: '대체휴일',      type: 'substitute' },
  '2026-10-03': { name: '개천절/추석',   type: 'holiday' },
  '2026-10-04': { name: '추석 연휴',     type: 'holiday' },
  '2026-10-05': { name: '추석 연휴',     type: 'holiday' },
  '2026-10-06': { name: '대체휴일',      type: 'substitute' },
  '2026-10-09': { name: '한글날',        type: 'holiday' },
  '2026-12-25': { name: '성탄절',        type: 'holiday' },

  // ── 2027 ────────────────────────────────────────────────────────────────────
  '2027-01-01': { name: '신정',          type: 'holiday' },
  '2027-02-06': { name: '설날 연휴',     type: 'holiday' },
  '2027-02-07': { name: '설날',          type: 'holiday' },
  '2027-02-08': { name: '설날 연휴',     type: 'holiday' },
  '2027-02-09': { name: '대체휴일',      type: 'substitute' },
  '2027-03-01': { name: '3·1절',         type: 'holiday' },
  '2027-05-05': { name: '어린이날',      type: 'holiday' },
  '2027-05-13': { name: '부처님오신날',  type: 'holiday' },
  '2027-06-06': { name: '현충일',        type: 'holiday' },
  '2027-06-07': { name: '대체휴일',      type: 'substitute' },
  '2027-08-15': { name: '광복절',        type: 'holiday' },
  '2027-08-16': { name: '대체휴일',      type: 'substitute' },
  '2027-09-14': { name: '추석 연휴',     type: 'holiday' },
  '2027-09-15': { name: '추석',          type: 'holiday' },
  '2027-09-16': { name: '추석 연휴',     type: 'holiday' },
  '2027-10-03': { name: '개천절',        type: 'holiday' },
  '2027-10-04': { name: '대체휴일',      type: 'substitute' },
  '2027-10-09': { name: '한글날',        type: 'holiday' },
  '2027-10-11': { name: '대체휴일',      type: 'substitute' },
  '2027-12-25': { name: '성탄절',        type: 'holiday' },
};

/**
 * 주어진 날짜(YYYY-MM-DD)의 공휴일 정보를 반환
 * @returns {{ name: string, type: 'holiday'|'substitute'|'memorial' } | null}
 */
export function getHoliday(ymd) {
  return HOLIDAYS[ymd] || null;
}

/**
 * 공휴일 여부 (빨간날)
 */
export function isHolidayRed(ymd) {
  const h = HOLIDAYS[ymd];
  return h ? (h.type === 'holiday' || h.type === 'substitute') : false;
}
