import { useState, useRef, useCallback } from 'react';

/**
 * useSpeech - Web Speech API hook
 *
 * mode: 'ptt' (기본, Push-to-Talk) | 'auto' (침묵 감지 후 자동 종료)
 *
 * PTT 모드:
 *   - startListening() → 버튼 누를 때 호출, continuous=true 로 계속 듣기
 *   - stopListening()  → 버튼 뗄 때 호출, 누적된 텍스트를 onResult()로 전달
 *
 * auto 모드 (기존):
 *   - startListening() → 음성 인식 시작
 *   - 침묵 감지 → 자동 종료 → onResult() 호출
 *
 * Returns: { status, transcript, startListening, stopListening, supported }
 * status: 'idle' | 'listening' | 'processing'
 */
export default function useSpeech({ onResult, onError, mode = 'ptt' } = {}) {
  const [status, setStatus] = useState('idle');
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef(null);
  const accumulatedRef = useRef('');   // PTT 모드에서 누적 텍스트 저장
  const stoppedByUserRef = useRef(false); // stopListening()에 의해 명시적으로 중단 여부

  const supported = typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  const startListening = useCallback(() => {
    if (!supported) {
      onError?.('이 브라우저는 음성 입력을 지원하지 않습니다.');
      return;
    }

    // 이미 실행 중이면 먼저 중지
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch {}
      recognitionRef.current = null;
    }

    // 누적 텍스트 초기화
    accumulatedRef.current = '';
    stoppedByUserRef.current = false;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'ko-KR';
    recognition.maxAlternatives = 1;

    if (mode === 'ptt') {
      // PTT: 버튼 누르는 동안 계속 인식
      recognition.continuous = true;
      recognition.interimResults = true;
    } else {
      // auto: 침묵 감지 시 자동 종료
      recognition.continuous = false;
      recognition.interimResults = false;
    }

    recognition.onstart = () => setStatus('listening');

    recognition.onresult = (e) => {
      if (mode === 'ptt') {
        // PTT: 모든 결과(중간 포함)를 누적해서 저장
        let text = '';
        for (let i = 0; i < e.results.length; i++) {
          text += e.results[i][0].transcript;
        }
        accumulatedRef.current = text;
        setTranscript(text);
      } else {
        // auto: 최종 결과 즉시 전달
        setStatus('processing');
        const text = e.results[0][0].transcript;
        setTranscript(text);
        onResult?.(text);
        setTimeout(() => setStatus('idle'), 600);
      }
    };

    recognition.onerror = (e) => {
      setStatus('idle');
      recognitionRef.current = null;
      // no-speech: 조용한 환경에서 흔히 발생 — 무시
      if (e.error !== 'no-speech' && e.error !== 'aborted') {
        onError?.(e.error);
      }
    };

    recognition.onend = () => {
      // PTT 모드: stopListening()이 먼저 처리하므로 여기서는 상태만 정리
      if (mode === 'ptt') {
        // stopListening()에서 이미 처리했다면 아무것도 안 함
        if (!stoppedByUserRef.current) {
          setStatus('idle');
        }
      } else {
        setStatus('idle');
      }
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch (err) {
      onError?.('음성 인식 시작 실패: ' + err.message);
    }
  }, [supported, onResult, onError, mode]);

  const stopListening = useCallback(() => {
    if (mode === 'ptt') {
      // PTT 종료: 버튼 뗄 때 호출 → 누적 텍스트를 onResult로 전달
      const finalText = accumulatedRef.current.trim();
      stoppedByUserRef.current = true;

      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
        recognitionRef.current = null;
      }

      if (finalText) {
        setStatus('processing');
        setTranscript(finalText);
        // onResult는 비동기(Gemini API 호출 포함)일 수 있으므로 Promise 처리
        Promise.resolve(onResult?.(finalText)).finally(() => {
          setTimeout(() => setStatus('idle'), 600);
        });
      } else {
        setStatus('idle');
      }

      accumulatedRef.current = '';
    } else {
      // auto 모드 강제 중지
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
        recognitionRef.current = null;
      }
      setStatus('idle');
    }
  }, [mode, onResult]);

  return { status, transcript, startListening, stopListening, supported };
}
