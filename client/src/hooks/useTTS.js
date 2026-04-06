import { useCallback, useEffect } from 'react';

/**
 * useTTS - Web Speech API 음성 합성 (Text-to-Speech) hook
 * AI 응답을 한국어 음성으로 출력
 *
 * speak(text, onEnd?)  - 텍스트 읽기 (onEnd: 완료 콜백)
 * stop()               - 즉시 중단
 * supported            - 브라우저 지원 여부
 */
export default function useTTS() {
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window;

  // 일부 브라우저는 음성 목록을 비동기로 로드 — 미리 트리거
  useEffect(() => {
    if (!supported) return;
    window.speechSynthesis.getVoices();
    const handler = () => window.speechSynthesis.getVoices();
    window.speechSynthesis.addEventListener('voiceschanged', handler);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', handler);
  }, [supported]);

  const speak = useCallback((text, onEnd) => {
    if (!supported || !text) return;
    // 기존 재생 중단
    window.speechSynthesis.cancel();

    const utt = new SpeechSynthesisUtterance(text);
    utt.lang   = 'ko-KR';
    utt.rate   = 1.08;   // 약간 빠르게 (자연스러움)
    utt.pitch  = 1.0;
    utt.volume = 1.0;

    // 한국어 음성 찾기 (없으면 기본 음성 사용)
    const voices  = window.speechSynthesis.getVoices();
    const koVoice = voices.find(v => v.lang.startsWith('ko'));
    if (koVoice) utt.voice = koVoice;

    if (onEnd) utt.onend = onEnd;

    window.speechSynthesis.speak(utt);
  }, [supported]);

  const stop = useCallback(() => {
    if (!supported) return;
    window.speechSynthesis.cancel();
  }, [supported]);

  return { speak, stop, supported };
}
