/**
 * Regex-based Korean NLP parser for task input
 * Parses: priority, category, date, time, duration, title
 */

import { toYMD, addDays } from './dateUtils.js';

// ── Priority ──────────────────────────────────────────────────────────────────
const PRIORITY_PATTERNS = [
  { re: /높음|high|급함|매우\s*중요|긴급/, value: 'high' },
  { re: /중간|보통|중요/, value: 'medium' },
  { re: /낮음|low|여유/, value: 'low' },
];

// ── Category ──────────────────────────────────────────────────────────────────
const CATEGORY_PATTERNS = [
  { re: /미팅|회의|meeting/, value: '미팅' },
  { re: /개인|personal/, value: '개인' },
  { re: /업무|work|일/, value: '업무' },
  { re: /기타|etc|기타등등/, value: '기타' },
];

// ── Date ──────────────────────────────────────────────────────────────────────
function parseDate(text) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (/오늘|today/.test(text)) return toYMD(today);
  if (/내일|tomorrow/.test(text)) return toYMD(addDays(today, 1));
  if (/모레/.test(text)) return toYMD(addDays(today, 2));
  if (/글피/.test(text)) return toYMD(addDays(today, 3));

  // 요일 매핑
  const DOW_MAP = { 월: 1, 화: 2, 수: 3, 목: 4, 금: 5, 토: 6, 일: 0 };
  for (const [kor, dow] of Object.entries(DOW_MAP)) {
    const re = new RegExp(`(다음\\s*)?${kor}요일`);
    if (re.test(text)) {
      const curDow = today.getDay();
      let diff = dow - curDow;
      if (diff <= 0) diff += 7;
      // If "다음" is specified, go to next week
      if (/다음/.test(text)) diff += 7;
      return toYMD(addDays(today, diff));
    }
  }

  // MM/DD or M월 D일
  const mdSlash = text.match(/(\d{1,2})\/(\d{1,2})/);
  if (mdSlash) {
    const m = parseInt(mdSlash[1]) - 1;
    const d = parseInt(mdSlash[2]);
    const dt = new Date(today.getFullYear(), m, d);
    if (dt < today) dt.setFullYear(dt.getFullYear() + 1);
    return toYMD(dt);
  }

  const mdKor = text.match(/(\d{1,2})월\s*(\d{1,2})일/);
  if (mdKor) {
    const m = parseInt(mdKor[1]) - 1;
    const d = parseInt(mdKor[2]);
    const dt = new Date(today.getFullYear(), m, d);
    if (dt < today) dt.setFullYear(dt.getFullYear() + 1);
    return toYMD(dt);
  }

  return null;
}

// ── Time ──────────────────────────────────────────────────────────────────────
function parseTime(text) {
  // "오후 N시" / "오전 N시"
  const ampmKor = text.match(/(오전|오후)\s*(\d{1,2})시(?:\s*(\d{1,2})분)?/);
  if (ampmKor) {
    let h = parseInt(ampmKor[2]);
    const ampm = ampmKor[1];
    const m = ampmKor[3] ? parseInt(ampmKor[3]) : 0;
    if (ampm === '오후' && h !== 12) h += 12;
    if (ampm === '오전' && h === 12) h = 0;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  // "N시" (bare)
  const bareH = text.match(/(\d{1,2})시(?:\s*(\d{1,2})분)?/);
  if (bareH) {
    const h = parseInt(bareH[1]);
    const m = bareH[2] ? parseInt(bareH[2]) : 0;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  // HH:MM
  const hhmm = text.match(/(\d{1,2}):(\d{2})/);
  if (hhmm) {
    return `${String(parseInt(hhmm[1])).padStart(2, '0')}:${hhmm[2]}`;
  }

  return null;
}

// ── Duration ──────────────────────────────────────────────────────────────────
function parseDuration(text) {
  if (/삼십\s*분|30분/.test(text)) return 30;
  if (/한\s*시간\s*반|1\.5시간|90분/.test(text)) return 90;
  if (/두\s*시간\s*반|2\.5시간|150분/.test(text)) return 150;
  if (/세\s*시간\s*반|3\.5시간|210분/.test(text)) return 210;

  const hoursKor = text.match(/(한|두|세|네|다섯)\s*시간/);
  if (hoursKor) {
    const map = { 한: 1, 두: 2, 세: 3, 네: 4, 다섯: 5 };
    return (map[hoursKor[1]] || 1) * 60;
  }

  const hoursNum = text.match(/(\d+)\s*시간/);
  if (hoursNum) return parseInt(hoursNum[1]) * 60;

  const mins = text.match(/(\d+)\s*분/);
  if (mins) return parseInt(mins[1]);

  return null;
}

// ── Main parser ───────────────────────────────────────────────────────────────
export function parseNL(text) {
  if (!text || !text.trim()) return {};

  let remainder = text.trim();

  const result = {};

  // Priority
  for (const { re, value } of PRIORITY_PATTERNS) {
    if (re.test(remainder)) {
      result.priority = value;
      remainder = remainder.replace(re, '').trim();
      break;
    }
  }

  // Category (check more specific first)
  for (const { re, value } of CATEGORY_PATTERNS) {
    if (re.test(remainder)) {
      result.category = value;
      // Don't strip category from title
      break;
    }
  }

  // Date
  const date = parseDate(remainder);
  if (date) {
    result.task_date = date;
    // Remove date tokens
    remainder = remainder
      .replace(/(다음\s*)?(월|화|수|목|금|토|일)요일/, '')
      .replace(/오늘|내일|모레|글피|today|tomorrow/, '')
      .replace(/\d{1,2}\/\d{1,2}/, '')
      .replace(/\d{1,2}월\s*\d{1,2}일/, '')
      .trim();
  }

  // Time
  const time = parseTime(remainder);
  if (time) {
    result.task_time = time;
    remainder = remainder
      .replace(/(오전|오후)\s*\d{1,2}시(\s*\d{1,2}분)?/, '')
      .replace(/\d{1,2}시(\s*\d{1,2}분)?/, '')
      .replace(/\d{1,2}:\d{2}/, '')
      .trim();
  }

  // Duration
  const duration = parseDuration(remainder);
  if (duration) {
    result.duration = duration;
    remainder = remainder
      .replace(/삼십\s*분|한\s*시간\s*반|두\s*시간\s*반|세\s*시간\s*반/, '')
      .replace(/(한|두|세|네|다섯)\s*시간/, '')
      .replace(/\d+\s*시간/, '')
      .replace(/\d+\s*분/, '')
      .trim();
  }

  // Remaining text → title (clean up extra whitespace)
  const title = remainder.replace(/\s+/g, ' ').trim();
  if (title) result.title = title;

  return result;
}
