import { useState, useRef, useCallback } from 'react';

/**
 * useSpeech - Web Speech API hook
 * Returns { status, transcript, startListening, stopListening, supported }
 * status: 'idle' | 'listening' | 'processing'
 */
export default function useSpeech({ onResult, onError } = {}) {
  const [status, setStatus] = useState('idle');
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef(null);

  const supported = typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  const startListening = useCallback(() => {
    if (!supported) {
      onError?.('이 브라우저는 음성 입력을 지원하지 않습니다.');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'ko-KR';
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setStatus('listening');

    recognition.onresult = (e) => {
      setStatus('processing');
      const text = e.results[0][0].transcript;
      setTranscript(text);
      onResult?.(text);
      setTimeout(() => setStatus('idle'), 600);
    };

    recognition.onerror = (e) => {
      setStatus('idle');
      if (e.error !== 'no-speech') {
        onError?.(e.error);
      }
    };

    recognition.onend = () => {
      if (status === 'listening') setStatus('idle');
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [supported, onResult, onError, status]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setStatus('idle');
  }, []);

  return { status, transcript, startListening, stopListening, supported };
}
