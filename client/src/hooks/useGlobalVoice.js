import { useCallback } from 'react';
import useSpeech from './useSpeech.js';
import { parseNL } from '../utils/nlParser.js';
import { detectVoiceIntent } from '../utils/gemini.js';

/**
 * useGlobalVoice - 앱 전체에서 사용하는 음성 명령 훅 (PTT + Gemini AI)
 *
 * ── 처리 순서 ──────────────────────────────────────────────────────────────────
 *  1. 조회/탭/이동 키워드를 먼저 체크 (Gemini보다 우선)
 *     → 확인/보여줘/알려줘/캘린더/보드/오늘 등은 즉시 처리
 *  2. Gemini API로 생성 의도 분석 (create_task / create_appt)
 *  3. Gemini 실패 시 키워드 기반 폴백
 *
 * ── 중요한 원칙 ───────────────────────────────────────────────────────────────
 *  - 조회/확인 키워드가 있으면 절대 생성 모달 열지 않음
 *  - 명확한 생성 키워드 없이는 모달 열지 않음
 */
export default function useGlobalVoice({
  onCreateTask,    // () => void              - 업무 생성 모달 열기
  onCreateAppt,    // () => void              - 약속 생성 모달 열기
  onTabChange,     // (tab: string)           - 탭 전환
  onSelectToday,   // () => void              - 오늘 날짜 선택
  onSelectDate,    // (ymd: string)           - 특정 날짜로 이동
  onNLCommand,     // (parsed, rawText, type) - 자연어 생성 명령
  onShowToast,     // (message: string)       - 토스트 메시지
}) {

  // ── 날짜 레이블 변환 헬퍼 ─────────────────────────────────────────────────────
  const toDateLabel = (ymd) =>
    ymd ? ymd.replace(/(\d{4})-(\d{2})-(\d{2})/, '$2월 $3일') : '오늘';

  // ── 조회 의도 키워드 (이 키워드가 있으면 절대 생성 모달 안 열림) ───────────────
  const isQueryIntent = (t) =>
    t.includes('확인') || t.includes('보여줘') || t.includes('알려줘') ||
    t.includes('보여 줘') || t.includes('알려 줘') || t.includes('뭐야') ||
    t.includes('있어') || t.includes('뭐 있') || t.includes('조회') ||
    t.includes('알려') || t.includes('보여');

  // ── 탭 전환 키워드 ────────────────────────────────────────────────────────────
  const isCalendarIntent = (t) => t.includes('캘린더') || t.includes('달력');
  const isKanbanIntent = (t) => t.includes('보드') || t.includes('칸반') || t.includes('kanban');

  // ── 오늘로 이동 키워드 ────────────────────────────────────────────────────────
  const isTodayIntent = (t) =>
    t === '오늘' || t.startsWith('오늘로') || t.includes('오늘 날짜') || t === 'today';

  // ── 명확한 생성 키워드 (이것이 있어야만 Gemini 없이 생성 모달 열림) ─────────────
  const isExplicitCreateTask = (t) =>
    t.includes('새 업무') || t.includes('업무 추가') || t.includes('업무 만들') ||
    t.includes('할 일 추가') || t.includes('태스크') || t.includes('task 추가');

  const isExplicitCreateAppt = (t) =>
    t.includes('새 약속') || t.includes('약속 추가') || t.includes('약속 만들') ||
    t.includes('일정 추가') || t.includes('미팅 잡') || t.includes('회의 잡');

  // ── 메인 처리 함수 ────────────────────────────────────────────────────────────
  const handleResult = useCallback(async (text) => {
    const t = text.trim().toLowerCase();

    // ─── Step 1: 조회/탭/이동 키워드 선행 체크 (Gemini보다 무조건 우선) ────────
    //  이 블록에서 return하면 Gemini를 호출하지 않음

    // 조회: "4월8일 약속 확인해줘", "오늘 일정 보여줘" 등
    if (isQueryIntent(t)) {
      const parsed = parseNL(text);
      const targetDate = parsed?.task_date || new Date().toISOString().slice(0, 10);
      onSelectDate?.(targetDate);
      onTabChange?.('calendar');
      onShowToast?.(`${toDateLabel(parsed?.task_date)} 일정으로 이동했습니다 📅`);
      return;
    }

    // 탭 전환: "캘린더", "달력"
    if (isCalendarIntent(t)) {
      onTabChange?.('calendar');
      onShowToast?.('캘린더 뷰로 이동했습니다');
      return;
    }

    // 탭 전환: "보드", "칸반"
    if (isKanbanIntent(t)) {
      onTabChange?.('kanban');
      onShowToast?.('칸반 보드로 이동했습니다');
      return;
    }

    // 오늘로 이동: "오늘"
    if (isTodayIntent(t)) {
      onSelectToday?.();
      onShowToast?.('오늘 날짜로 이동했습니다');
      return;
    }

    // 명확한 생성 키워드 (Gemini 없이 즉시 처리)
    if (isExplicitCreateTask(t)) {
      onCreateTask?.();
      onShowToast?.('새 업무 모달을 열었습니다 ✅');
      return;
    }
    if (isExplicitCreateAppt(t)) {
      onCreateAppt?.();
      onShowToast?.('새 약속 모달을 열었습니다 ✅');
      return;
    }

    // ─── Step 2: Gemini AI로 생성 의도 분석 ─────────────────────────────────
    //  (조회/이동 키워드가 없는 경우만 여기 도달)
    const intent = await detectVoiceIntent(text);

    if (intent && intent.action && intent.action !== 'unknown') {
      switch (intent.action) {
        case 'create_task':
          if (intent.title || intent.task_date || intent.task_time) {
            onNLCommand?.(intent, text, 'task');
            onShowToast?.(`"${text}" 인식됨 — 모달에서 확인하세요`);
          } else {
            onCreateTask?.();
            onShowToast?.('새 업무 모달을 열었습니다 ✅');
          }
          return;

        case 'create_appt':
          if (intent.title || intent.task_date || intent.task_time) {
            onNLCommand?.(intent, text, 'appointment');
            onShowToast?.(`"${text}" 인식됨 — 모달에서 확인하세요`);
          } else {
            onCreateAppt?.();
            onShowToast?.('새 약속 모달을 열었습니다 ✅');
          }
          return;

        case 'query_date': {
          const targetDate = intent.task_date || new Date().toISOString().slice(0, 10);
          onSelectDate?.(targetDate);
          onTabChange?.('calendar');
          onShowToast?.(`${toDateLabel(intent.task_date)} 일정으로 이동했습니다 📅`);
          return;
        }

        case 'navigate_today':
          onSelectToday?.();
          onShowToast?.('오늘 날짜로 이동했습니다');
          return;

        case 'tab_calendar':
          onTabChange?.('calendar');
          onShowToast?.('캘린더 뷰로 이동했습니다');
          return;

        case 'tab_kanban':
          onTabChange?.('kanban');
          onShowToast?.('칸반 보드로 이동했습니다');
          return;

        default:
          break;
      }
    }

    // ─── Step 3: Gemini 실패 / unknown → 날짜+시간이 있으면 자연어 생성 시도 ──
    //  주의: title만 있는 경우는 생성 모달 열지 않음 (잘못 인식 방지)
    const parsed = parseNL(text);
    if (parsed && (parsed.task_date || parsed.task_time)) {
      // 날짜나 시간이 파싱된 경우만 생성 모달 열기
      const isAppt = t.includes('약속') || t.includes('미팅') || t.includes('회의');
      onNLCommand?.(parsed, text, isAppt ? 'appointment' : 'task');
      onShowToast?.(`"${text}" 인식됨 — 모달에서 확인하세요`);
      return;
    }

    // 인식 실패
    onShowToast?.(`"${text}" — 명령을 이해하지 못했습니다 🤔`);
  }, [onCreateTask, onCreateAppt, onTabChange, onSelectToday, onSelectDate, onNLCommand, onShowToast]);

  // useSpeech 훅 연결 (PTT 모드)
  const { status, startListening, stopListening, supported } = useSpeech({
    onResult: handleResult,
    onError: (err) => onShowToast?.(`음성 인식 오류: ${err}`),
    mode: 'ptt',
  });

  return { status, startListening, stopListening, supported };
}
