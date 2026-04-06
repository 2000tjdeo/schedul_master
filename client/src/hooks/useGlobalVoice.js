import { useCallback } from 'react';
import useSpeech from './useSpeech.js';
import { parseNL } from '../utils/nlParser.js';
import { detectVoiceIntent } from '../utils/gemini.js';

/**
 * useGlobalVoice - 앱 전체에서 사용하는 음성 명령 훅 (PTT + Gemini AI)
 *
 * ── 동작 방식 (PTT) ────────────────────────────────────────────────────────
 *  1. 마이크 버튼 누름 → startListening() → 말하는 동안 계속 녹음
 *  2. 마이크 버튼 뗌  → stopListening()  → 누적 텍스트를 handleResult로 전달
 *  3. handleResult:
 *     a. Gemini API로 의도 파악 (detectVoiceIntent)
 *     b. Gemini 실패 시 키워드 기반 폴백
 *
 * ── 지원 명령 ─────────────────────────────────────────────────────────────
 *  생성:    "새 업무", "내일 오후 2시 팀 미팅" → 모달 열기 + 자동 채움
 *  조회:    "4월8일 약속 확인해줘", "오늘 일정 보여줘" → 해당 날짜로 이동
 *  탭 전환: "캘린더", "보드" → 뷰 전환
 *  이동:    "오늘" → 오늘 날짜로 이동
 */
export default function useGlobalVoice({
  onCreateTask,    // () => void             - 업무 생성 모달 열기
  onCreateAppt,    // () => void             - 약속 생성 모달 열기
  onTabChange,     // (tab: string)          - 탭 전환
  onSelectToday,   // () => void             - 오늘 날짜 선택
  onSelectDate,    // (ymd: string)          - 특정 날짜로 이동 (조회용)
  onNLCommand,     // (parsed, rawText, type) - 자연어 생성 명령 (type: 'task'|'appointment')
  onShowToast,     // (message: string)      - 토스트 메시지
}) {

  // ── 키워드 기반 폴백: Gemini 실패 시 사용 ────────────────────────────────
  const isQueryIntent = (t) =>
    t.includes('확인') || t.includes('보여줘') || t.includes('알려줘') ||
    t.includes('보여 줘') || t.includes('알려 줘') || t.includes('뭐야') ||
    t.includes('있어') || t.includes('뭐 있') || t.includes('조회');

  const keywordFallback = (t, text) => {
    // 생성 명령
    if (t.includes('새 업무') || t.includes('업무 추가') || t.includes('업무 만들') || t.includes('할 일 추가')) {
      onCreateTask?.();
      onShowToast?.('새 업무 모달을 열었습니다 ✅');
      return;
    }
    if (t.includes('새 약속') || t.includes('약속 추가') || t.includes('약속 만들') || t.includes('일정 추가')) {
      onCreateAppt?.();
      onShowToast?.('새 약속 모달을 열었습니다 ✅');
      return;
    }
    // 조회 명령
    if (isQueryIntent(t)) {
      const parsed = parseNL(text);
      const targetDate = parsed?.task_date || new Date().toISOString().slice(0, 10);
      onSelectDate?.(targetDate);
      onTabChange?.('calendar');
      const dateLabel = parsed?.task_date
        ? parsed.task_date.replace(/(\d{4})-(\d{2})-(\d{2})/, '$2월 $3일')
        : '오늘';
      onShowToast?.(`${dateLabel} 일정으로 이동했습니다 📅`);
      return;
    }
    // 탭 전환
    if (t.includes('캘린더') || t.includes('달력')) {
      onTabChange?.('calendar');
      onShowToast?.('캘린더 뷰로 이동했습니다');
      return;
    }
    if (t.includes('보드') || t.includes('칸반') || t.includes('kanban')) {
      onTabChange?.('kanban');
      onShowToast?.('칸반 보드로 이동했습니다');
      return;
    }
    // 오늘로 이동
    if (t === '오늘' || t.includes('오늘로') || t.includes('오늘 날짜')) {
      onSelectToday?.();
      onShowToast?.('오늘 날짜로 이동했습니다');
      return;
    }
    // 자연어 생성 (nlParser 폴백)
    const parsed = parseNL(text);
    if (parsed && (parsed.title || parsed.task_date || parsed.task_time)) {
      const isAppt = t.includes('약속') || t.includes('미팅') || t.includes('회의');
      onNLCommand?.(parsed, text, isAppt ? 'appointment' : 'task');
      onShowToast?.(`"${text}" 인식됨 — 모달에서 확인하세요`);
      return;
    }
    onShowToast?.(`"${text}" — 알 수 없는 명령입니다`);
  };

  // ── 음성 인식 결과 처리 (Gemini AI 우선, 키워드 폴백) ─────────────────────
  const handleResult = useCallback(async (text) => {
    const t = text.trim().toLowerCase();

    // Gemini로 의도 파악 시도
    const intent = await detectVoiceIntent(text);

    if (intent && intent.action && intent.action !== 'unknown') {
      switch (intent.action) {
        case 'create_task':
          if (intent.title || intent.task_date || intent.task_time) {
            // NL 데이터 있으면 모달 자동 채움
            onNLCommand?.(intent, text, 'task');
            onShowToast?.(`"${text}" 인식됨 — 모달에서 확인하세요`);
          } else {
            // 단순 생성 명령이면 빈 모달
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
          const dateLabel = intent.task_date
            ? intent.task_date.replace(/(\d{4})-(\d{2})-(\d{2})/, '$2월 $3일')
            : '오늘';
          onShowToast?.(`${dateLabel} 일정으로 이동했습니다 📅`);
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

    // Gemini 실패 또는 unknown → 키워드 기반 폴백
    keywordFallback(t, text);
  }, [onCreateTask, onCreateAppt, onTabChange, onSelectToday, onSelectDate, onNLCommand, onShowToast]);

  // useSpeech 훅 연결 (PTT 모드)
  const { status, startListening, stopListening, supported } = useSpeech({
    onResult: handleResult,
    onError: (err) => onShowToast?.(`음성 인식 오류: ${err}`),
    mode: 'ptt',
  });

  return { status, startListening, stopListening, supported };
}
