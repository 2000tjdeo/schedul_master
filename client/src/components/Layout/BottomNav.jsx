import React from 'react';
import { ACCENT } from '../../utils/colorMap.js';

const TABS = [
  { id: 'calendar', label: 'Home',    icon: 'home' },
  { id: 'kanban',   label: 'Board',  icon: 'dashboard' },
  // 중앙 마이크 버튼 자리 (빈 슬롯)
  { id: 'tasks',    label: 'Tasks',  icon: 'assignment' },
  { id: 'timeline', label: 'Timeline', icon: 'timeline' },
];

/**
 * BottomNav - 모바일 하단 네비게이션 바
 * 중앙에 마이크 PTT 버튼 배치 (엄지로 누르기 편한 위치)
 */
export default function BottomNav({
  activeTab,
  onTabChange,
  // 음성 PTT props
  voiceStatus,     // 'idle' | 'listening' | 'processing'
  onVoiceStart,    // 마이크 버튼 누를 때
  onVoiceStop,     // 마이크 버튼 뗄 때
  voiceSupported,  // 브라우저 지원 여부
}) {
  const isListening  = voiceStatus === 'listening';
  const isProcessing = voiceStatus === 'processing';

  const LEFT_TABS  = TABS.slice(0, 2);   // Home, Board
  const RIGHT_TABS = TABS.slice(2);      // Tasks, Timeline

  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: 0, right: 0,
      background: 'rgba(255, 255, 255, 0.92)',
      backdropFilter: 'blur(20px)',
      borderTop: '1px solid rgba(0, 0, 0, 0.06)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-around',
      zIndex: 50,
      padding: '8px 8px calc(8px + env(safe-area-inset-bottom, 0px))',
      borderRadius: '20px 20px 0 0',
      boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.06)',
    }}>

      {/* 왼쪽 탭: Home, Board */}
      {LEFT_TABS.map(({ id, label, icon }) => {
        const active = activeTab === id;
        return (
          <TabButton key={id} id={id} label={label} icon={icon}
            active={active} onTabChange={onTabChange} />
        );
      })}

      {/* 중앙 마이크 버튼 (PTT) — 엄지로 누르기 편한 위치 */}
      {voiceSupported ? (
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {/* listening 중 파동 효과 */}
          {isListening && (
            <>
              <div style={{
                position: 'absolute',
                width: 64, height: 64, borderRadius: '50%',
                background: 'rgba(239, 68, 68, 0.15)',
                animation: 'ptt-ring 1.2s ease-out infinite',
              }} />
              <div style={{
                position: 'absolute',
                width: 80, height: 80, borderRadius: '50%',
                background: 'rgba(239, 68, 68, 0.07)',
                animation: 'ptt-ring 1.2s ease-out 0.3s infinite',
              }} />
            </>
          )}

          <button
            onMouseDown={(e) => { e.preventDefault(); onVoiceStart?.(); }}
            onMouseUp={() => onVoiceStop?.()}
            onMouseLeave={() => { if (isListening) onVoiceStop?.(); }}
            onTouchStart={(e) => { e.preventDefault(); onVoiceStart?.(); }}
            onTouchEnd={() => onVoiceStop?.()}
            onContextMenu={(e) => e.preventDefault()}
            title="꾹 눌러서 음성 명령"
            style={{
              position: 'relative',
              width: 60, height: 60,
              borderRadius: '50%',
              border: 'none',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              userSelect: 'none',
              WebkitUserSelect: 'none',
              // 상태별 색상
              background: isListening
                ? 'linear-gradient(135deg, #ef4444, #dc2626)'
                : isProcessing
                  ? 'linear-gradient(135deg, #f59e0b, #d97706)'
                  : `linear-gradient(135deg, ${ACCENT}, #7c3aed)`,
              boxShadow: isListening
                ? '0 4px 20px rgba(239, 68, 68, 0.5)'
                : isProcessing
                  ? '0 4px 20px rgba(245, 158, 11, 0.4)'
                  : `0 4px 20px ${ACCENT}55`,
              transform: isListening ? 'scale(1.1)' : 'scale(1)',
              transition: 'all 0.15s ease',
              // 살짝 위로 띄워서 강조
              marginTop: -16,
            }}
          >
            <span className="material-symbols-outlined" style={{
              fontSize: 26, color: '#fff',
              fontVariationSettings: "'FILL' 1",
            }}>
              {isListening ? 'mic' : isProcessing ? 'hourglass_top' : 'mic_none'}
            </span>
          </button>

          {/* 상태 레이블 */}
          <span style={{
            position: 'absolute',
            bottom: -18,
            fontSize: 9, fontWeight: 700,
            color: isListening ? '#ef4444' : isProcessing ? '#f59e0b' : '#9ca3af',
            textTransform: 'uppercase', letterSpacing: '0.05em',
            whiteSpace: 'nowrap',
            fontFamily: 'Inter, sans-serif',
          }}>
            {isListening ? '듣는 중' : isProcessing ? '처리 중' : 'Voice'}
          </span>
        </div>
      ) : (
        /* 음성 미지원 시 빈 공간 유지 */
        <div style={{ width: 60 }} />
      )}

      {/* 오른쪽 탭: Tasks, Done */}
      {RIGHT_TABS.map(({ id, label, icon }) => {
        const active = activeTab === id;
        return (
          <TabButton key={id} id={id} label={label} icon={icon}
            active={active} onTabChange={onTabChange} />
        );
      })}

      {/* PTT 파동 애니메이션 */}
      <style>{`
        @keyframes ptt-ring {
          0%   { transform: scale(1);   opacity: 1; }
          100% { transform: scale(2.2); opacity: 0; }
        }
      `}</style>
    </nav>
  );
}

function TabButton({ id, label, icon, active, onTabChange }) {
  return (
    <button
      onClick={() => onTabChange(id)}
      style={{
        border: 'none', background: active ? `${ACCENT}12` : 'transparent',
        cursor: 'pointer',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: active ? '8px 16px' : '8px 4px',
        borderRadius: 14,
        color: active ? ACCENT : '#9ca3af',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        fontFamily: 'Inter, sans-serif',
        minWidth: 56,
      }}
    >
      <span className="material-symbols-outlined" style={{
        fontSize: 22,
        fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0"
      }}>{icon}</span>
      <span style={{
        fontSize: 9, fontWeight: active ? 800 : 500, marginTop: 3,
        textTransform: 'uppercase', letterSpacing: '0.05em'
      }}>{label}</span>
    </button>
  );
}
