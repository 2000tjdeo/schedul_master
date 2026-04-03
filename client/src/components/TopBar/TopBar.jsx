import React, { useState, useRef, useEffect } from 'react';
import { ACCENT, STITCH } from '../../utils/colorMap.js';

// 사용자 이름을 해시해서 아바타 배경색 결정
function getAvatarColor(name = '') {
  const colors = ['#6366f1','#8b5cf6','#ec4899','#f43f5e','#f97316','#f59e0b','#10b981','#14b8a6','#0ea5e9'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

export default function TopBar({
  user,
  onLogout,
  searchQuery,
  onSearchChange,
  onMenuToggle,
  isMobile,
  activeTab,
  onTabChange,
  onAdmin,
  // ── 글로벌 음성 제어 props ──
  voiceStatus,      // 'idle' | 'listening' | 'processing'
  onVoiceToggle,    // 마이크 버튼 클릭 핸들러
  voiceSupported,   // 브라우저 음성 인식 지원 여부
}) {
  const [showSettings, setShowSettings] = useState(false);
  const settingsRef = useRef(null);

  // 외부 클릭 시 설정 드롭다운 닫기
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target)) {
        setShowSettings(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 음성 상태별 마이크 아이콘 색상
  const micColor = voiceStatus === 'listening'   ? '#ef4444'   // 빨강 - 듣는 중
                 : voiceStatus === 'processing'  ? '#f59e0b'   // 노랑 - 처리 중
                 : '#71717a';                                   // 회색 - 대기

  // 듣는 중일 때 마이크 버튼 배경색
  const micBg = voiceStatus === 'listening'  ? '#fef2f2'
              : voiceStatus === 'processing' ? '#fffbeb'
              : 'transparent';

  return (
    <header style={{
      width: '100%',
      position: 'sticky', top: 0, zIndex: 40,
      background: 'rgba(255, 255, 255, 0.7)',
      backdropFilter: 'blur(10px)',
      boxShadow: '0 1px 0 rgba(0, 0, 0, 0.05)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: isMobile ? '0 16px' : '0 32px',
      height: 64,
      flexShrink: 0,
    }}>

      {/* ── 검색창 (왼쪽) ── */}
      <div style={{ display: 'flex', alignItems: 'center', flex: 1, maxWidth: 560 }}>
        {isMobile && (
           <button onClick={onMenuToggle} style={{ border: 'none', background: 'none', padding: '8px 12px 8px 0', cursor: 'pointer', color: '#6b7280' }}>
             <span className="material-symbols-outlined">menu</span>
           </button>
        )}
        <div style={{ position: 'relative', width: '100%' }}>
          <span className="material-symbols-outlined" style={{
            position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
            fontSize: 20, color: '#9ca3af'
          }}>search</span>
          <input
            type="text"
            placeholder="Search events, tasks, or projects..."
            value={searchQuery}
            onChange={e => onSearchChange(e.target.value)}
            style={{
              width: '100%', padding: '10px 16px 10px 42px',
              background: '#f1f1f1', border: 'none', borderRadius: 10,
              fontSize: 13, outline: 'none', color: '#1a1c1c',
              fontFamily: 'inherit',
            }}
          />
        </div>
      </div>

      {/* ── 오른쪽 액션 버튼들 ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>

        {/* 글로벌 마이크 버튼 - 브라우저가 음성 인식을 지원하는 경우만 표시 */}
        {voiceSupported && (
          <button
            onClick={onVoiceToggle}
            title={voiceStatus === 'listening' ? '음성 인식 중지' : '음성 명령 시작'}
            style={{
              border: 'none',
              background: micBg,
              padding: 8,
              borderRadius: 10,
              cursor: 'pointer',
              color: micColor,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.2s',
              // 듣는 중일 때 pulse 애니메이션
              animation: voiceStatus === 'listening' ? 'mic-pulse 1s infinite' : 'none',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 22 }}>
              {voiceStatus === 'listening' ? 'mic' : voiceStatus === 'processing' ? 'hourglass_top' : 'mic_none'}
            </span>
          </button>
        )}

        <div style={{ display: isMobile ? 'none' : 'flex', alignItems: 'center', gap: 8, position: 'relative' }}>
          <button style={{ border: 'none', background: 'transparent', padding: 8, cursor: 'pointer', color: '#71717a' }}>
            <span className="material-symbols-outlined">notifications</span>
          </button>

          {/* 설정 드롭다운 */}
          <div ref={settingsRef}>
            <button
              onClick={() => setShowSettings(!showSettings)}
              style={{ border: 'none', background: 'transparent', padding: 8, cursor: 'pointer', color: showSettings ? ACCENT : '#71717a', transition: 'all 0.1s' }}
            >
              <span className="material-symbols-outlined" style={{ transform: showSettings ? 'rotate(45deg)' : 'none', transition: 'transform 0.2s' }}>settings</span>
            </button>

            {showSettings && (
              <div style={{
                position: 'absolute', top: 40, right: 0, width: 180,
                background: '#fff', borderRadius: 16, boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
                border: '1px solid #f1f1f1', overflow: 'hidden', padding: '8px 0', zIndex: 100,
                display: 'flex', flexDirection: 'column'
              }}>
                {user?.role === 'admin' && onAdmin && (
                  <button
                    onClick={() => { setShowSettings(false); onAdmin(); }}
                    style={{ width: '100%', textAlign: 'left', padding: '12px 18px', border: 'none', background: 'transparent', cursor: 'pointer', color: '#1a1c1c', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10, fontFamily: 'inherit' }}
                    onMouseEnter={e => e.target.style.background = '#f9f9f9'}
                    onMouseLeave={e => e.target.style.background = 'transparent'}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 18, color: ACCENT }}>admin_panel_settings</span>
                    Admin Dashboard
                  </button>
                )}
                {user?.role === 'admin' && onAdmin && <div style={{ height: 1, background: '#f1f1f1', margin: '4px 0' }} />}
                <button
                  onClick={() => { setShowSettings(false); onLogout(); }}
                  style={{ width: '100%', textAlign: 'left', padding: '12px 18px', border: 'none', background: 'transparent', cursor: 'pointer', color: '#ef4444', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10, fontFamily: 'inherit' }}
                  onMouseEnter={e => e.target.style.background = '#fef2f2'}
                  onMouseLeave={e => e.target.style.background = 'transparent'}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>logout</span>
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>

        <div style={{ width: 1, height: 32, background: '#e5e7eb', margin: '0 4px', display: isMobile ? 'none' : 'block' }} />

        {/* 사용자 정보 + 아바타 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {!isMobile && (
             <div style={{ textAlign: 'right' }}>
               <p style={{ fontSize: 13, color: '#1a1c1c', lineHeight: 1.1, fontWeight: 700 }}>{user?.name || 'User'}</p>
               <p style={{ fontSize: 10, color: '#71717a', fontWeight: 500 }}>{user?.role === 'admin' ? 'Product Lead' : 'Team Member'}</p>
             </div>
          )}
          <div
             onClick={isMobile ? onLogout : undefined}
             style={{
               width: 38, height: 38, borderRadius: '50%',
               background: getAvatarColor(user?.name || ''),
               display: 'flex', alignItems: 'center', justifyContent: 'center',
               color: '#fff', fontSize: 13, fontWeight: 700,
               border: '2px solid #fff', boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
               cursor: isMobile ? 'pointer' : 'default',
             }}
          >
            {user?.name?.slice(0, 1) || 'U'}
          </div>
        </div>
      </div>

      {/* ── 마이크 pulse 애니메이션 CSS ── */}
      <style>{`
        @keyframes mic-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
          50%       { box-shadow: 0 0 0 8px rgba(239, 68, 68, 0); }
        }
      `}</style>
    </header>
  );
}
