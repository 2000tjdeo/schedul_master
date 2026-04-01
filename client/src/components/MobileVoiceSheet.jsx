import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import useSpeech from '../hooks/useSpeech.js';
import { parseNL } from '../utils/nlParser.js';
import { ACCENT } from '../utils/colorMap.js';

// ── helpers ──────────────────────────────────────────────────────────────────
function todayStr() { return new Date().toISOString().slice(0, 10); }

function roundedTime() {
  const d = new Date();
  const r = Math.ceil((d.getHours() * 60 + d.getMinutes()) / 30) * 30;
  const h = Math.floor(r / 60) % 24, m = r % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function fmtDateShort(ymd) {
  if (!ymd) return '';
  const [y, m, d] = ymd.split('-').map(Number);
  const today = new Date(); today.setHours(0,0,0,0);
  const t = new Date(y, m - 1, d);
  const diff = Math.round((t - today) / 86400000);
  if (diff === 0) return '오늘';
  if (diff === 1) return '내일';
  return `${m}/${d}`;
}

function fmtTimeShort(t) {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const ampm = h < 12 ? '오전' : '오후';
  return `${ampm} ${h % 12 || 12}:${String(m).padStart(2, '0')}`;
}

// ── 칩 버튼 ──────────────────────────────────────────────────────────────────
function Chip({ label, selected, onClick, color }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        flexShrink: 0, padding: '6px 14px', borderRadius: 20,
        border: `1.5px solid ${selected ? color : '#e2e2e8'}`,
        background: selected ? `${color}18` : '#f7f7fa',
        color: selected ? color : '#888',
        fontSize: 13, fontWeight: 600, cursor: 'pointer',
        fontFamily: 'inherit', whiteSpace: 'nowrap',
        transition: 'all 0.15s',
      }}
    >
      {label}
    </button>
  );
}

// ── 파싱 결과 태그 ────────────────────────────────────────────────────────────
function Tag({ label, color }) {
  return (
    <span style={{
      fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 20,
      background: `${color}18`, color, border: `1px solid ${color}30`,
    }}>
      {label}
    </span>
  );
}

// ── 파형 애니메이션 ───────────────────────────────────────────────────────────
function WaveBar({ delay }) {
  return (
    <div style={{
      width: 3, borderRadius: 2,
      background: '#fff',
      animation: `mvsWave 0.8s ease-in-out ${delay}s infinite alternate`,
    }} />
  );
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────────────────────
export default function MobileVoiceSheet({ users = [], currentUser, onClose, onCreate, onOpenFull }) {
  const [transcript, setTranscript] = useState('');
  const [parsed,     setParsed]     = useState(null);
  const [selDate,    setSelDate]    = useState(todayStr());
  const [selTime,    setSelTime]    = useState(null);
  const [selTitle,   setSelTitle]   = useState(null);
  const [loading,    setLoading]    = useState(false);

  const { status, startListening, stopListening, supported } = useSpeech({
    onResult: (t) => {
      setTranscript(t);
      const p = parseNL(t);
      setParsed(p);
      if (p.title)     setSelTitle(p.title);
      if (p.task_date) setSelDate(p.task_date);
      if (p.task_time) setSelTime(p.task_time);
    },
  });

  const isListening = status === 'listening';

  // 시트가 열리면 자동으로 마이크 시작
  useEffect(() => {
    if (supported) {
      const t = setTimeout(() => startListening(), 400);
      return () => clearTimeout(t);
    }
  }, []);

  // 날짜 칩 오늘 ~ D+6
  const dateChips = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() + i);
    const ymd = d.toISOString().slice(0, 10);
    const [, m, day] = ymd.split('-').map(Number);
    const label = i === 0 ? '오늘' : i === 1 ? '내일' : `${m}/${day}`;
    return { label, value: ymd };
  });

  // 시간 칩 9시~18시
  const timeChips = Array.from({ length: 10 }, (_, i) => {
    const h = 9 + i;
    const value = `${String(h).padStart(2, '0')}:00`;
    const ampm = h < 12 ? '오전' : '오후';
    return { label: `${ampm} ${h % 12 || 12}시`, value };
  });

  const handleAdd = async () => {
    const title = selTitle || transcript;
    if (!title?.trim()) return;
    setLoading(true);
    await onCreate({
      title: title.trim(),
      task_date: selDate || todayStr(),
      due_date:  selDate || todayStr(),
      task_time: selTime || null,
      duration:  selTime ? 60 : null,
      status:    'todo',
      priority:  parsed?.priority || 'medium',
      category:  parsed?.category || '업무',
      created_by: currentUser?.id,
    });
    setLoading(false);
    onClose();
  };

  const micColor = isListening ? ACCENT : '#c7c7d0';

  return createPortal(
    <>
      <style>{`
        @keyframes mvsWave { from { height: 6px; } to { height: 28px; } }
        @keyframes mvsUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
        @keyframes mvsPulse { 0%,100% { box-shadow: 0 0 0 0 ${ACCENT}44; } 50% { box-shadow: 0 0 0 18px ${ACCENT}00; } }
      `}</style>

      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 200 }}
      />

      {/* Bottom sheet */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: '#fff', borderRadius: '22px 22px 0 0',
        zIndex: 201, padding: '0 0 env(safe-area-inset-bottom, 20px)',
        animation: 'mvsUp 0.28s cubic-bezier(0.32,0.72,0,1)',
        maxHeight: '90vh', overflowY: 'auto',
      }}>

        {/* 핸들 */}
        <div style={{ padding: '12px 0 0', display: 'flex', justifyContent: 'center' }}>
          <div style={{ width: 36, height: 4, background: '#e0e0e0', borderRadius: 2 }} />
        </div>

        {/* 헤더 */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 20px 4px',
        }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: '#111' }}>음성으로 추가</span>
          <button onClick={onClose} style={{
            border: 'none', background: 'none', cursor: 'pointer',
            fontSize: 18, color: '#bbb', padding: 4,
          }}>✕</button>
        </div>

        {/* 마이크 버튼 영역 */}
        <div style={{ textAlign: 'center', padding: '20px 0 16px' }}>
          <button
            onClick={isListening ? stopListening : startListening}
            disabled={!supported}
            style={{
              width: 80, height: 80, borderRadius: '50%',
              border: 'none', cursor: supported ? 'pointer' : 'default',
              background: isListening ? ACCENT : supported ? '#f0f0f5' : '#f5f5f5',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.2s',
              animation: isListening ? 'mvsPulse 1.2s infinite' : 'none',
              position: 'relative',
            }}
          >
            {isListening ? (
              <div style={{ display: 'flex', gap: 4, alignItems: 'center', height: 32 }}>
                {[0, 0.15, 0.3, 0.15, 0].map((delay, i) => (
                  <WaveBar key={i} delay={delay} />
                ))}
              </div>
            ) : (
              <svg width="30" height="30" fill="none" viewBox="0 0 24 24"
                stroke={supported ? '#6366f1' : '#ccc'} strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            )}
            {/* 미지원 배지 */}
            {!supported && (
              <span style={{
                position: 'absolute', top: -4, right: -4,
                background: '#f97316', color: '#fff',
                fontSize: 9, fontWeight: 700, padding: '2px 5px',
                borderRadius: 8, lineHeight: 1.4,
              }}>미지원</span>
            )}
          </button>

          <p style={{
            marginTop: 10, fontSize: 12, fontWeight: 600,
            color: isListening ? ACCENT : '#bbb',
            transition: 'color 0.2s',
          }}>
            {isListening ? '듣는 중… 말씀하세요' : supported ? '탭하여 말하기' : '음성 미지원'}
          </p>

          {/* 미지원 안내 */}
          {!supported && (
            <p style={{ fontSize: 11, color: '#f97316', marginTop: 4, fontWeight: 500 }}>
              Chrome(Android) 또는 Safari(iOS 15+) 사용 권장
            </p>
          )}
        </div>

        {/* 텍스트 직접 입력 (음성 미지원 시 강조, 지원 시 보조) */}
        <div style={{
          margin: '0 0 4px',
          background: !supported ? '#fff' : '#f5f5fa',
          border: `1.5px solid ${!supported ? '#6366f1' : '#e8e8f0'}`,
          borderRadius: 14, padding: '12px 16px',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24"
            stroke="#9ca3af" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
          </svg>
          <input
            type="text"
            value={transcript}
            onChange={(e) => {
              const t = e.target.value;
              setTranscript(t);
              if (t.trim()) {
                const p = parseNL(t);
                setParsed(p);
                if (p.title)     setSelTitle(p.title);
                if (p.task_date) setSelDate(p.task_date);
                if (p.task_time) setSelTime(p.task_time);
              }
            }}
            placeholder={!supported
              ? '여기에 직접 입력하세요 (예: 내일 오후 2시 미팅)'
              : '또는 직접 입력…'}
            style={{
              flex: 1, border: 'none', outline: 'none', background: 'transparent',
              fontSize: 14, color: '#222', fontFamily: 'inherit',
            }}
          />
          {transcript && (
            <button onClick={() => { setTranscript(''); setParsed(null); setSelTitle(null); }}
              style={{ border: 'none', background: 'none', color: '#ccc', fontSize: 16, cursor: 'pointer', padding: 0 }}>
              ✕
            </button>
          )}
        </div>

        <div style={{ padding: '0 20px 28px', display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* 인식된 텍스트 */}
          {transcript ? (
            <div style={{
              background: '#f5f5fa', borderRadius: 14, padding: '14px 16px',
              fontSize: 15, color: '#222', lineHeight: 1.6, fontWeight: 500,
            }}>
              {transcript}
            </div>
          ) : (
            <div style={{
              background: '#f5f5fa', borderRadius: 14, padding: '14px 16px',
              fontSize: 13, color: '#bbb', textAlign: 'center',
            }}>
              예: "내일 오후 2시 클라이언트 미팅"
            </div>
          )}

          {/* NLP 파싱 태그 */}
          {parsed && Object.keys(parsed).length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {parsed.title    && <Tag label={`"${parsed.title}"`}    color="#6366f1" />}
              {parsed.task_date && <Tag label={fmtDateShort(parsed.task_date)} color={ACCENT} />}
              {parsed.task_time && <Tag label={fmtTimeShort(parsed.task_time)} color="#0ea5e9" />}
              {parsed.priority && <Tag
                label={parsed.priority === 'high' ? '높음' : parsed.priority === 'medium' ? '중간' : '낮음'}
                color={parsed.priority === 'high' ? '#ef4444' : parsed.priority === 'medium' ? '#f97316' : '#10b981'}
              />}
            </div>
          )}

          {/* 날짜 칩 */}
          <div>
            <p style={{ fontSize: 11, fontWeight: 600, color: '#aaa', marginBottom: 6 }}>날짜</p>
            <div style={{ display: 'flex', gap: 7, overflowX: 'auto', paddingBottom: 4 }}>
              {dateChips.map(d => (
                <Chip key={d.value} label={d.label}
                  selected={selDate === d.value} color={ACCENT}
                  onClick={() => setSelDate(d.value === selDate ? null : d.value)}
                />
              ))}
            </div>
          </div>

          {/* 시간 칩 */}
          <div>
            <p style={{ fontSize: 11, fontWeight: 600, color: '#aaa', marginBottom: 6 }}>시간</p>
            <div style={{ display: 'flex', gap: 7, overflowX: 'auto', paddingBottom: 4 }}>
              {timeChips.map(t => (
                <Chip key={t.value} label={t.label}
                  selected={selTime === t.value} color="#0ea5e9"
                  onClick={() => setSelTime(t.value === selTime ? null : t.value)}
                />
              ))}
            </div>
          </div>

          {/* 선택 요약 */}
          {(selDate || selTime) && (
            <div style={{
              background: '#f0f4ff', borderRadius: 12, padding: '10px 14px',
              fontSize: 13, color: '#4355b9', fontWeight: 600,
              display: 'flex', gap: 10, alignItems: 'center',
            }}>
              <span>📌</span>
              <span>
                {selTitle && `"${selTitle}" `}
                {selDate && fmtDateShort(selDate)}
                {selTime && ` ${fmtTimeShort(selTime)}`}
              </span>
            </div>
          )}

          {/* 버튼 행 */}
          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <button
              onClick={onOpenFull}
              style={{
                flex: 1, padding: '14px 0', borderRadius: 14,
                border: '1.5px solid #e0e0e0', background: '#fff',
                fontSize: 14, fontWeight: 600, color: '#555',
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              전체 입력
            </button>
            <button
              onClick={handleAdd}
              disabled={loading || (!transcript && !selTitle)}
              style={{
                flex: 2, padding: '14px 0', borderRadius: 14,
                border: 'none',
                background: (loading || (!transcript && !selTitle)) ? '#f0f0f0' : ACCENT,
                fontSize: 14, fontWeight: 700,
                color: (loading || (!transcript && !selTitle)) ? '#bbb' : '#fff',
                cursor: (loading || (!transcript && !selTitle)) ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit',
                transition: 'all 0.15s',
              }}
            >
              {loading ? '추가 중…' : '추가'}
            </button>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}
