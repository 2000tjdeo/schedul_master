import { useCallback, useRef, useState } from 'react';
import useSpeech from './useSpeech.js';
import useTTS    from './useTTS.js';
import { parseNL } from '../utils/nlParser.js';
import { detectVoiceIntent } from '../utils/gemini.js';

/**
 * useGlobalVoice - PTT 음성 명령 + Gemini AI + 대화형 일정 수집
 *
 * ── 대화 플로우 ────────────────────────────────────────────────────────────────
 *  1. 사용자: "내일 팀 미팅 잡아줘"
 *  2. Gemini: { action: create_appt, title: '팀 미팅', date: '내일', time: null }
 *  3. AI 음성: "몇 시에 시작하나요?"       ← 시간이 빠졌으므로
 *  4. 사용자: (마이크 누르고) "오후 2시"
 *  5. AI 음성: "내일 오후 2시 팀 미팅을 생성할게요."
 *  6. 자동으로 모달 오픈 + 폼 자동 채움
 *
 * ── 필수 항목 ────────────────────────────────────────────────────────────────
 *  약속: 제목 + 날짜 + 시간  (세 가지 모두)
 *  업무: 제목 + 날짜         (시간은 선택)
 */
export default function useGlobalVoice({
  onCreateTask,
  onCreateAppt,
  onTabChange,
  onSelectToday,
  onSelectDate,
  onNLCommand,     // (parsed, rawText, type) - 자연어 생성 명령
  onMoveItem,      // (title, modalType, newYmd)
  onShowToast,
}) {
  const { speak, stop: stopTTS } = useTTS();

  // ── 대화 상태 (ref: 렌더 사이에 유지, 재렌더 불필요) ───────────────────────
  const convRef = useRef({
    active: false,
    type: null,          // 'task' | 'appointment'
    asking: null,        // 'title' | 'date' | 'time' — 현재 묻고 있는 항목
    collected: { title: null, date: null, time: null },
  });

  // UI용: 현재 AI가 묻고 있는 질문 (overlay에 표시)
  const [convQuestion, setConvQuestion] = useState(null);

  // ── 헬퍼: 다음에 필요한 항목 판단 ──────────────────────────────────────────
  const getNextMissing = (type, collected) => {
    if (!collected.title) return 'title';
    if (!collected.date)  return 'date';
    if (type === 'appointment' && !collected.time) return 'time';
    return null; // 모두 수집됨
  };

  const QUESTIONS = {
    title: '어떤 일정인가요? 제목을 말씀해주세요.',
    date:  '날짜가 어떻게 되나요?',
    time:  '몇 시에 시작하나요?',
  };

  const PROMPTS = {
    title: '"새 프로젝트 회의"처럼 말씀해주세요.',
    date:  '"내일", "다음 주 월요일", "4월 10일"처럼 말씀해주세요.',
    time:  '"오전 10시", "오후 2시"처럼 말씀해주세요.',
  };

  // ── 대화 시작: Gemini 파싱 결과에서 빈 필드 확인 후 질문 ──────────────────
  const startConversation = useCallback((type, initial) => {
    const collected = {
      title: initial.title      || null,
      date:  initial.task_date  || null,
      time:  initial.task_time  || null,
    };
    const asking = getNextMissing(type, collected);

    if (!asking) return false; // 이미 다 있음

    convRef.current = { active: true, type, asking, collected };
    setConvQuestion(QUESTIONS[asking]);
    speak(QUESTIONS[asking]);
    onShowToast?.(`💬 ${QUESTIONS[asking]}`);
    return true;
  }, [speak, onShowToast]);

  // ── 대화 취소 ────────────────────────────────────────────────────────────
  const cancelConversation = useCallback(() => {
    convRef.current = { active: false, type: null, asking: null, collected: { title: null, date: null, time: null } };
    setConvQuestion(null);
    speak('일정 생성을 취소했습니다.');
    onShowToast?.('일정 생성이 취소됐습니다');
  }, [speak, onShowToast]);

  // ── 대화 완료: 모든 필드 수집 → 모달 오픈 ───────────────────────────────
  const finishConversation = useCallback((conv) => {
    const { title, date, time } = conv.collected;
    const dateLabel = date ? date.replace(/(\d{4})-(\d{2})-(\d{2})/, '$2월 $3일') : '';
    const timeLabel = time ? ` ${time.slice(0, 5)}에` : '';

    speak(`${dateLabel}${timeLabel} "${title}" 일정을 생성할게요.`);
    setConvQuestion(null);

    const parsedData = {
      title,
      task_date: date,
      task_time: time || null,
    };

    // 대화 상태 초기화
    convRef.current = { active: false, type: null, asking: null, collected: { title: null, date: null, time: null } };

    // TTS가 끝난 후 모달 열기 (1.2초 대기)
    setTimeout(() => {
      onNLCommand?.(parsedData, title, conv.type);
      onShowToast?.(`"${title}" 일정 생성 모달을 열었습니다 ✅`);
    }, 1200);
  }, [speak, onNLCommand, onShowToast]);

  // ── 대화 중 답변 파싱 ───────────────────────────────────────────────────
  const handleConvAnswer = useCallback((text) => {
    const conv  = convRef.current;
    const t     = text.trim().toLowerCase();
    const parsed = parseNL(text);

    // 취소 명령
    if (t.includes('취소') || t.includes('그만') || t.includes('캔슬') || t.includes('cancel')) {
      cancelConversation();
      return;
    }

    // 현재 묻고 있는 항목에 맞게 파싱
    switch (conv.asking) {
      case 'title':
        // 제목은 그대로 사용 (단, 너무 짧으면 재질문)
        if (text.trim().length < 1) {
          speak('제목을 말씀해주세요.');
          return;
        }
        conv.collected.title = text.trim();
        break;

      case 'date':
        if (!parsed.task_date) {
          speak(`날짜를 이해하지 못했어요. ${PROMPTS.date}`);
          return;
        }
        conv.collected.date = parsed.task_date;
        break;

      case 'time':
        if (!parsed.task_time) {
          if (conv.type === 'task') {
            // 업무는 시간 없어도 OK
            conv.collected.time = null;
          } else {
            speak(`시간을 이해하지 못했어요. ${PROMPTS.time}`);
            return;
          }
        } else {
          conv.collected.time = parsed.task_time;
        }
        break;
    }

    // 다음 빈 항목 확인
    const next = getNextMissing(conv.type, conv.collected);
    if (next) {
      conv.asking = next;
      setConvQuestion(QUESTIONS[next]);
      speak(QUESTIONS[next]);
      onShowToast?.(`💬 ${QUESTIONS[next]}`);
    } else {
      finishConversation({ ...conv });
    }
  }, [speak, cancelConversation, finishConversation, onShowToast]);

  // ── 키워드 체크 함수들 ────────────────────────────────────────────────────
  const isQueryIntent = (t) =>
    t.includes('확인') || t.includes('보여줘') || t.includes('알려줘') ||
    t.includes('보여 줘') || t.includes('알려 줘') || t.includes('뭐야') ||
    t.includes('있어') || t.includes('뭐 있') || t.includes('조회') ||
    t.includes('알려') || t.includes('보여');

  const isCalendarIntent = (t) => t.includes('캘린더') || t.includes('달력');
  const isKanbanIntent   = (t) => t.includes('보드') || t.includes('칸반') || t.includes('kanban');
  const isTodayIntent    = (t) => t === '오늘' || t.startsWith('오늘로') || t.includes('오늘 날짜') || t === 'today';

  const isMoveIntent = (t) =>
    (t.includes('이동') || t.includes('변경') || t.includes('미루') ||
     t.includes('당기') || t.includes('옮기')) &&
    (t.includes('일') || t.includes('월') || t.includes('내일') ||
     t.includes('모레') || t.includes('오늘'));

  const isExplicitCreateTask = (t) =>
    t.includes('새 업무') || t.includes('업무 추가') || t.includes('업무 만들') ||
    t.includes('할 일 추가') || t.includes('태스크') || t.includes('task 추가');

  const isExplicitCreateAppt = (t) =>
    t.includes('새 약속') || t.includes('약속 추가') || t.includes('약속 만들') ||
    t.includes('일정 추가') || t.includes('미팅 잡') || t.includes('회의 잡');

  const toDateLabel = (ymd) =>
    ymd ? ymd.replace(/(\d{4})-(\d{2})-(\d{2})/, '$2월 $3일') : '오늘';

  // ── 메인 처리 함수 ────────────────────────────────────────────────────────
  const handleResult = useCallback(async (text) => {
    const t = text.trim().toLowerCase();

    // ─── 대화 중이면 대화 응답 처리 (다른 명령보다 우선) ─────────────────
    if (convRef.current.active) {
      handleConvAnswer(text);
      return;
    }

    // ─── Step 1: 조회/탭/이동 키워드 선행 체크 ───────────────────────────
    if (isQueryIntent(t)) {
      const parsed = parseNL(text);
      const targetDate = parsed?.task_date || new Date().toISOString().slice(0, 10);
      onSelectDate?.(targetDate);
      onTabChange?.('calendar');
      const label = toDateLabel(parsed?.task_date);
      speak(`${label} 일정으로 이동했습니다.`);
      onShowToast?.(`${label} 일정으로 이동했습니다 📅`);
      return;
    }
    if (isCalendarIntent(t)) {
      onTabChange?.('calendar');
      speak('캘린더 뷰로 이동했습니다.');
      onShowToast?.('캘린더 뷰로 이동했습니다');
      return;
    }
    if (isKanbanIntent(t)) {
      onTabChange?.('kanban');
      speak('칸반 보드로 이동했습니다.');
      onShowToast?.('칸반 보드로 이동했습니다');
      return;
    }
    if (isTodayIntent(t)) {
      onSelectToday?.();
      speak('오늘 날짜로 이동했습니다.');
      onShowToast?.('오늘 날짜로 이동했습니다');
      return;
    }
    if (isExplicitCreateTask(t)) {
      onCreateTask?.();
      speak('새 업무 모달을 열었습니다.');
      onShowToast?.('새 업무 모달을 열었습니다 ✅');
      return;
    }
    if (isExplicitCreateAppt(t)) {
      onCreateAppt?.();
      speak('새 약속 모달을 열었습니다.');
      onShowToast?.('새 약속 모달을 열었습니다 ✅');
      return;
    }

    // ─── Step 2: Gemini AI 의도 분석 ─────────────────────────────────────
    const intent = await detectVoiceIntent(text);

    if (intent && intent.action && intent.action !== 'unknown') {
      switch (intent.action) {

        case 'create_task': {
          const started = startConversation('task', intent);
          if (!started) {
            // 모든 필드 있음 → 바로 모달
            onNLCommand?.(intent, text, 'task');
            speak(`"${intent.title || '업무'}" 생성 모달을 열었습니다.`);
            onShowToast?.(`"${text}" 인식됨 — 모달에서 확인하세요`);
          }
          return;
        }

        case 'create_appt': {
          const started = startConversation('appointment', intent);
          if (!started) {
            onNLCommand?.(intent, text, 'appointment');
            speak(`"${intent.title || '약속'}" 생성 모달을 열었습니다.`);
            onShowToast?.(`"${text}" 인식됨 — 모달에서 확인하세요`);
          }
          return;
        }

        case 'move_item': {
          const newDate = intent.task_date || new Date().toISOString().slice(0, 10);
          if (intent.title && newDate) {
            onMoveItem?.(intent.title, intent.modalType, newDate);
            speak(`"${intent.title}"을 ${toDateLabel(newDate)}로 이동했습니다.`);
          } else {
            speak('이동할 항목 이름이나 날짜를 말씀해주세요.');
            onShowToast?.('이동할 항목 이름이나 날짜를 말씀해주세요 🗓️');
          }
          return;
        }

        case 'query_date': {
          const targetDate = intent.task_date || new Date().toISOString().slice(0, 10);
          onSelectDate?.(targetDate);
          onTabChange?.('calendar');
          const label = toDateLabel(intent.task_date);
          speak(`${label} 일정으로 이동했습니다.`);
          onShowToast?.(`${label} 일정으로 이동했습니다 📅`);
          return;
        }

        case 'navigate_today':
          onSelectToday?.();
          speak('오늘 날짜로 이동했습니다.');
          onShowToast?.('오늘 날짜로 이동했습니다');
          return;

        case 'tab_calendar':
          onTabChange?.('calendar');
          speak('캘린더 뷰로 이동했습니다.');
          onShowToast?.('캘린더 뷰로 이동했습니다');
          return;

        case 'tab_kanban':
          onTabChange?.('kanban');
          speak('칸반 보드로 이동했습니다.');
          onShowToast?.('칸반 보드로 이동했습니다');
          return;

        default:
          break;
      }
    }

    // ─── Step 3: Gemini 실패 폴백 — 날짜/시간 있으면 대화 시작 ──────────
    const parsed = parseNL(text);

    if (isMoveIntent(t) && parsed?.task_date && parsed?.title) {
      const isAppt = t.includes('약속') || t.includes('미팅') || t.includes('회의');
      onMoveItem?.(parsed.title, isAppt ? 'appointment' : 'task', parsed.task_date);
      speak(`"${parsed.title}"을 ${toDateLabel(parsed.task_date)}로 이동했습니다.`);
      return;
    }

    if (parsed && (parsed.task_date || parsed.task_time || parsed.title)) {
      const isAppt = t.includes('약속') || t.includes('미팅') || t.includes('회의');
      const type = isAppt ? 'appointment' : 'task';
      const started = startConversation(type, {
        title:     parsed.title    || null,
        task_date: parsed.task_date || null,
        task_time: parsed.task_time || null,
      });
      if (!started) {
        onNLCommand?.(parsed, text, type);
        speak(`"${parsed.title || '일정'}" 생성 모달을 열었습니다.`);
      }
      return;
    }

    // 인식 실패
    speak('죄송해요, 명령을 이해하지 못했어요. 다시 말씀해주세요.');
    onShowToast?.(`"${text}" — 명령을 이해하지 못했습니다 🤔`);
  }, [
    handleConvAnswer, startConversation, speak,
    onCreateTask, onCreateAppt, onTabChange, onSelectToday,
    onSelectDate, onNLCommand, onMoveItem, onShowToast,
  ]);

  // useSpeech 훅 연결 (PTT 모드)
  const { status, startListening, stopListening, supported } = useSpeech({
    onResult: handleResult,
    onError:  (err) => {
      onShowToast?.(`음성 인식 오류: ${err}`);
      speak('음성 인식 중 오류가 발생했습니다.');
    },
    mode: 'ptt',
  });

  return { status, startListening, stopListening, supported, convQuestion };
}
