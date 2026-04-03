import { useCallback } from 'react';
import useSpeech from './useSpeech.js';
import { parseNL } from '../utils/nlParser.js';

/**
 * useGlobalVoice - 앱 전체에서 사용하는 음성 명령 훅
 *
 * 지원 명령어:
 *  - "새 업무" / "업무 추가"       → onCreateTask()
 *  - "새 약속" / "약속 추가"       → onCreateAppt()
 *  - "캘린더" / "달력"             → onTabChange('calendar')
 *  - "보드" / "칸반"              → onTabChange('kanban')
 *  - "오늘"                       → onSelectToday()
 *  - 그 외 자연어 텍스트           → onNLCommand(parsedData)로 전달
 *
 * @param {Object} handlers - 명령 처리 핸들러 모음
 */
export default function useGlobalVoice({
  onCreateTask,   // () => void - 업무 생성 모달 열기
  onCreateAppt,   // () => void - 약속 생성 모달 열기
  onTabChange,    // (tab: string) => void - 탭 전환
  onSelectToday,  // () => void - 오늘 날짜 선택
  onNLCommand,    // (parsed: object, rawText: string) => void - 자연어 명령 처리
  onShowToast,    // (message: string) => void - 토스트 메시지
}) {

  // 음성 인식 결과를 명령으로 파싱하는 함수
  const handleResult = useCallback((text) => {
    const t = text.trim().toLowerCase();

    // ── 업무 생성 명령 ──────────────────────────────────────
    if (t.includes('새 업무') || t.includes('업무 추가') || t.includes('업무 만들') || t.includes('할 일 추가')) {
      onCreateTask?.();
      onShowToast?.('새 업무 모달을 열었습니다 ✅');
      return;
    }

    // ── 약속 생성 명령 ──────────────────────────────────────
    if (t.includes('새 약속') || t.includes('약속 추가') || t.includes('약속 만들') || t.includes('일정 추가')) {
      onCreateAppt?.();
      onShowToast?.('새 약속 모달을 열었습니다 ✅');
      return;
    }

    // ── 탭 전환 명령 ────────────────────────────────────────
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

    // ── 날짜 이동 명령 ──────────────────────────────────────
    if (t === '오늘' || t.includes('오늘로') || t.includes('오늘 날짜')) {
      onSelectToday?.();
      onShowToast?.('오늘 날짜로 이동했습니다');
      return;
    }

    // ── 자연어 명령 (업무/약속 내용 포함) ────────────────────
    // 예: "내일 오전 10시 팀 미팅" → parseNL로 파싱 후 모달 열기
    const parsed = parseNL(text);
    if (parsed && (parsed.title || parsed.task_date || parsed.task_time)) {
      onNLCommand?.(parsed, text);
      onShowToast?.(`"${text}" 인식됨 — 모달에서 확인하세요`);
      return;
    }

    // ── 인식했지만 매칭 명령 없음 ────────────────────────────
    onShowToast?.(`"${text}" — 알 수 없는 명령입니다`);
  }, [onCreateTask, onCreateAppt, onTabChange, onSelectToday, onNLCommand, onShowToast]);

  // useSpeech 훅 연결
  const { status, startListening, stopListening, supported } = useSpeech({
    onResult: handleResult,
    onError: (err) => onShowToast?.(`음성 인식 오류: ${err}`),
  });

  return { status, startListening, stopListening, supported };
}
