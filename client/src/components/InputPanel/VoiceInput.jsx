import React from 'react';
import { ACCENT } from '../../utils/colorMap.js';

export default function VoiceInput({ status, onStart, onStop, supported }) {
  const isListening = status === 'listening';
  const isProcessing = status === 'processing';

  const bgColor = isListening ? ACCENT : isProcessing ? '#3B82F6' : '#fff';
  const borderColor = isListening ? ACCENT : isProcessing ? '#3B82F6' : '#d1d5db';
  const iconColor = isListening || isProcessing ? '#fff' : '#6b7280';

  const handleClick = () => {
    if (isListening) onStop?.();
    else onStart?.();
  };

  const statusText = isListening
    ? '듣는 중... (클릭하여 중지)'
    : isProcessing
      ? '처리 중...'
      : supported
        ? '마이크 버튼을 눌러 음성 입력'
        : '이 브라우저는 음성 입력을 지원하지 않습니다';

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
      {/* Mic button */}
      <button
        onClick={handleClick}
        disabled={!supported || isProcessing}
        style={{
          width: 44, height: 44, borderRadius: '50%', border: `2px solid ${borderColor}`,
          background: bgColor, cursor: supported && !isProcessing ? 'pointer' : 'not-allowed',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
          animation: isListening ? 'pulse 1.2s infinite' : 'none',
          transition: 'background 0.2s, border-color 0.2s',
        }}
        aria-label="음성 입력"
      >
        <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke={iconColor}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
        </svg>
      </button>

      {/* Wave bars */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 3, height: 24 }}>
        {[0, 1, 2, 3, 4, 5].map(i => (
          <div
            key={i}
            style={{
              width: 3, borderRadius: 2,
              background: isListening ? ACCENT : '#d1d5db',
              animation: isListening ? `wave 0.8s ease-in-out ${i * 0.1}s infinite` : 'none',
              height: isListening ? undefined : 4,
              minHeight: 4,
            }}
          />
        ))}
      </div>

      {/* Status text */}
      <span style={{ fontSize: 12, color: isListening ? ACCENT : '#9ca3af', fontWeight: isListening ? 600 : 400 }}>
        {statusText}
      </span>
    </div>
  );
}
