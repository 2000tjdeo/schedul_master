/**
 * Date utility helpers
 */

export function toYMD(date) {
  const d = date instanceof Date ? date : new Date(typeof date === 'string' && !date.includes('T') ? date + 'T00:00:00' : date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function todayYMD() {
  return toYMD(new Date());
}

export function addDays(date, n) {
  const d = date instanceof Date ? new Date(date) : new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

export function isSameDay(a, b) {
  if (!a || !b) return false;
  const da = typeof a === 'string' ? a : toYMD(a);
  const db = typeof b === 'string' ? b : toYMD(b);
  return da === db;
}

export function isToday(dateStr) {
  return dateStr === todayYMD();
}

export function isPast(dateStr) {
  if (!dateStr) return false;
  return dateStr < todayYMD();
}

export function formatKoreanDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
}

export function formatMonthYear(year, month) {
  // month is 0-indexed
  const d = new Date(year, month, 1);
  return d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long' });
}

export function getMonthMatrix(year, month) {
  // Returns a 2D array of Date objects for the calendar grid (always 6 weeks)
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  // 0=Sun,1=Mon,...,6=Sat => Sunday=0 (week starts on Sunday)
  let startDow = firstDay.getDay();

  const days = [];
  const startDate = addDays(firstDay, -startDow);
  for (let i = 0; i < 42; i++) {
    days.push(addDays(startDate, i));
  }

  // Group into weeks
  const weeks = [];
  for (let w = 0; w < 6; w++) {
    weeks.push(days.slice(w * 7, w * 7 + 7));
  }
  return weeks;
}

export function getWeekDays(baseDate) {
  // Returns Sun~Sat of the week containing baseDate
  const d = baseDate instanceof Date ? new Date(baseDate) : new Date(baseDate + 'T00:00:00');
  const dow = d.getDay(); // Sun=0
  const sunday = addDays(d, -dow);
  return Array.from({ length: 7 }, (_, i) => addDays(sunday, i));
}

export function formatTime(timeStr) {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':').map(Number);
  const ampm = h < 12 ? '오전' : '오후';
  const hour = h % 12 || 12;
  return `${ampm} ${hour}시${m > 0 ? ` ${m}분` : ''}`;
}

export function formatTimeRange(timeStr, duration) {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':').map(Number);
  const startMinutes = h * 60 + m;
  const endMinutes = startMinutes + (duration || 60);
  const endH = Math.floor(endMinutes / 60) % 24;
  const endM = endMinutes % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(h)}:${pad(m)} – ${pad(endH)}:${pad(endM)}`;
}

export const DAY_ABBR_KO = ['일', '월', '화', '수', '목', '금', '토'];
