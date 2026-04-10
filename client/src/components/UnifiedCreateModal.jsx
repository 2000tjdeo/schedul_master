import React, { useState, useEffect, useCallback, useRef } from 'react';
import { DateDrum, TimeDrum, DrumPickerStyles } from './ui/DrumPicker.jsx';
import useSpeech from '../hooks/useSpeech.js';
import { parseNL } from '../utils/nlParser.js';
import { parseNLWithGemini, generateDescription, suggestTime } from '../utils/gemini.js';
import { ACCENT, CATEGORY_COLORS } from '../utils/colorMap.js';
import { supabase } from '../lib/supabase.js';

// ─── Constants ────────────────────────────────────────────────────────────────
const APPT_COLORS = ['#b7131a', '#48626e', '#006578', '#7c3aed', '#0ea5e9', '#059669', '#ea580c'];
const CATEGORIES = ['업무', '개인', '미팅', '기타', '급함', '공부'];
const PRIORITIES = [
  { value: 'low',    label: '낮음', color: '#71717a' },
  { value: 'medium', label: '중간', color: '#f59e0b' },
  { value: 'high',   label: '높음', color: '#b7131a' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function todayStr() { return new Date().toISOString().slice(0, 10); }

function roundedTime(plusMinutes = 0) {
  const d = new Date();
  const total = d.getHours() * 60 + d.getMinutes() + plusMinutes;
  const r = Math.ceil(total / 30) * 30;
  return `${String(Math.floor(r/60)%24).padStart(2,'0')}:${String(r%60).padStart(2,'0')}`;
}

function addDays(dateStr, n) {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function addMinutes(t, m=60) {
  const [h, min] = t.split(':').map(Number);
  const total = h*60 + min + m;
  return `${String(Math.floor(total/60)%24).padStart(2,'0')}:${String(total%60).padStart(2,'0')}`;
}

function fmtDate(ds) {
  if (!ds) return '—';
  const [y, m, d] = ds.split('-').map(Number);
  return `${y}. ${m}. ${d}.`;
}

function fmtTime(ts) {
  if (!ts) return '—';
  const [h, m] = ts.split(':').map(Number);
  return `${h < 12 ? 'AM' : 'PM'} ${h%12||12}:${String(m).padStart(2,'0')}`;
}

// ─── UI Components ────────────────────────────────────────────────────────────
function Toggle({ on, onToggle }) {
  return (
    <button onClick={onToggle} style={{ width: 50, height: 30, borderRadius: 15, background: on ? ACCENT : '#e4e4e7', border: 'none', cursor: 'pointer', position: 'relative', transition: 'all 0.2s', padding: 0 }}>
      <span style={{ position: 'absolute', top: 3, left: on ? 23 : 3, width: 24, height: 24, borderRadius: '50%', background: '#fff', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', transition: 'all 0.2s' }} />
    </button>
  );
}

function Card({ children, style }) {
  return <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #f1f1f1', ...style }}>{children}</div>;
}

function CardRow({ label, children, noBorder, compact }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', minHeight: compact ? 42 : 50, padding: '0 16px', borderBottom: noBorder ? 'none' : '1px solid #f1f1f1', gap: 12 }}>
      {label && <span style={{ fontSize: 13, fontWeight: 700, color: '#1a1c1c', width: 70, flexShrink: 0, fontFamily: 'Manrope' }}>{label}</span>}
      <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 8 }}>{children}</div>
    </div>
  );
}

function Pill({ label, active, onClick, accentColor = ACCENT }) {
  return (
    <button onClick={onClick} style={{ padding: '6px 14px', borderRadius: 10, border: 'none', background: active ? accentColor : '#f4f4f5', color: active ? '#fff' : '#71717a', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'Manrope', transition: 'all 0.2s' }}>
      {label}
    </button>
  );
}

function ChipBtn({ label, selected = false, onClick, color }) {
  return (
    <button 
      type="button"
      onClick={onClick}
      style={{ 
        padding: '8px 16px', 
        borderRadius: 12, 
        fontSize: 12, 
        fontWeight: 700, 
        border: selected ? `2px solid ${color}` : `1.5px solid #e2e8f0`,
        background: selected ? `${color}20` : '#fff',
        color: selected ? color : '#64748b',
        cursor: 'pointer', 
        fontFamily: 'Manrope', 
        touchAction: 'manipulation',
        WebkitTapHighlightColor: 'transparent',
        minWidth: 'auto',
        height: 'auto',
        transition: 'all 0.15s ease',
      }}
    >
      {label}
    </button>
  );
}

// ─── NLStrip ──────────────────────────────────────────────────────────────────
function NLStrip({ onParsed, isAppt, initialText = '' }) {
  const [text, setText] = useState('');
  const [showChips, setShowChips] = useState(false);
  const [dbChips, setDbChips] = useState([]);
  const [aiLoading, setAiLoading] = useState(false);
  // 명시적으로 선택한 칩만 하이라이트 (초기엔 아무것도 선택 안 됨)
  const [sel, setSel] = useState({ title: null, date: null, time: null, duration: null });

  useEffect(() => {
    supabase.from('sm_chip_presets').select('*').then(({ data }) => { if (Array.isArray(data)) setDbChips(data); });
  }, []);

  // 음성으로 넘어온 텍스트가 있으면 자동으로 파싱해서 폼 채움
  useEffect(() => {
    if (!initialText) return;
    setText(initialText);
    const local = parseNL(initialText);
    onParsed(local);
    // Gemini AI로도 추가 파싱
    setAiLoading(true);
    parseNLWithGemini(initialText).then(ai => {
      setAiLoading(false);
      if (ai) onParsed({ ...local, ...Object.fromEntries(Object.entries(ai).filter(([, v]) => v != null)) });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialText]);

  // Gemini AI 파싱 — Enter 키 또는 음성 완료 시 호출
  const runAIParse = async (t) => {
    const local = parseNL(t);
    onParsed(local); // 먼저 로컬 파싱 결과 반영
    if (!t.trim()) return;
    setAiLoading(true);
    const ai = await parseNLWithGemini(t);
    setAiLoading(false);
    if (ai) {
      // 로컬 파싱 결과와 AI 결과 병합 (AI 우선)
      onParsed({ ...local, ...Object.fromEntries(Object.entries(ai).filter(([, v]) => v != null)) });
    }
  };

  const { status, startListening, stopListening } = useSpeech({
    onResult: (t) => { setText(t); runAIParse(t); },
  });

  const handleChange = (e) => {
    const t = e.target.value; setText(t);
    if (t.trim()) onParsed(parseNL(t)); // 타이핑 중엔 로컬 파싱만
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') { e.preventDefault(); runAIParse(text); }
  };

  const isListening = status === 'listening';

  const dateChips = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() + i);
    const ymd = d.toISOString().slice(0,10);
    return { label: i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : `${d.getMonth()+1}/${d.getDate()}`, value: ymd };
  });

  const timeChips = Array.from({ length: 5 }, (_, i) => {
    const h = 9 + (i * 2); 
    const value = `${String(h).padStart(2, '0')}:00`;
    return { label: h < 12 ? `AM ${h}:00` : `PM ${h % 12 || 12}:00`, value };
  });

  const durationChips = [{ label: '30m', value: 30 }, { label: '1h', value: 60 }, { label: '2h', value: 120 }, { label: '4h', value: 240 }];
  const titlePresets = dbChips.filter(c => c.type === 'title').map(c => c.label);
  const fallbackTitles = isAppt ? ['클라이언트 미팅', '팀 회의', '현장 방문', '디자인 검토'] : ['기획 회의', '견적 제출', '납품 확인', 'API 개발'];

  return (
    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 16, padding: '14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button 
          type="button"
          onClick={isListening ? stopListening : startListening} 
          style={{ 
            width: 40, height: 40, borderRadius: '50%', 
            background: isListening ? ACCENT : '#fff', 
            border: `2px solid ${isListening ? ACCENT : '#e2e8f0'}`, 
            cursor: 'pointer', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            touchAction: 'manipulation',
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 20, color: isListening ? '#fff' : '#64748b' }}>mic</span>
        </button>
        <input
          type="text" 
          value={text} 
          onChange={(e) => { console.log('NL input:', e.target.value); setText(e.target.value); }} 
          onKeyDown={handleKeyDown}
          placeholder={isAppt ? '예: 내일 오후 2시 팀 미팅' : '예: 다음주 월요일 오전 API 개발 2시간'}
          style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', fontSize: 14, fontFamily: 'Inter', color: '#111', padding: '8px' }}
        />
        {aiLoading && <span style={{ fontSize: 11, color: ACCENT, fontWeight: 700, flexShrink: 0 }}>AI ✨</span>}
        {text && !aiLoading && <button onClick={() => setText('')} style={{ border: 'none', background: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}>✕</button>}
      </div>
      <button 
        type="button"
        onClick={() => { console.log('Quick Menu toggle:', !showChips); setShowChips(!showChips); }} 
        style={{ 
          border: 'none', 
          background: 'none', 
          fontSize: 12, 
          fontWeight: 800, 
          color: ACCENT, 
          cursor: 'pointer', 
          textAlign: 'left', 
          padding: '8px 4px',
          touchAction: 'manipulation',
        }}
      >
        Quick Menu {showChips ? '▲' : '▼'}
      </button>
      {showChips && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {/* 제목 칩 */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {(titlePresets.length ? titlePresets : fallbackTitles).map(t => (
              <ChipBtn key={t} label={t} color="#6366f1" selected={sel.title === t}
                onClick={() => { setSel(s => ({ ...s, title: t })); onParsed({ title: t }); }} />
            ))}
          </div>
          {/* 날짜 칩 */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {dateChips.map(d => (
              <ChipBtn key={d.value} label={d.label} color={ACCENT} selected={sel.date === d.value}
                onClick={() => {
                  setSel(s => ({ ...s, date: d.value }));
                  onParsed(isAppt ? { date: d.value } : { task_date: d.value });
                }} />
            ))}
          </div>
          {/* 시간 칩 */}
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2 }}>
            {timeChips.map(t => (
              <ChipBtn key={t.value} label={t.label} color="#0ea5e9" selected={sel.time === t.value}
                onClick={() => {
                  setSel(s => ({ ...s, time: t.value }));
                  onParsed(isAppt ? { task_time: t.value } : { task_time: t.value, allDay: false });
                }} />
            ))}
          </div>
          {/* 소요시간 칩 */}
          <div style={{ display: 'flex', gap: 6 }}>
            {durationChips.map(d => (
              <ChipBtn key={d.value} label={d.label} color="#f97316" selected={sel.duration === d.value}
                onClick={() => { setSel(s => ({ ...s, duration: d.value })); onParsed({ duration: d.value, allDay: false }); }} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── DateTime Card (Drum) ─────────────────────────────────────────────────────
function DateTimeCard({ allDay, onAllDayToggle, startDate, startTime, endDate, endTime, duration, onStartDate, onStartTime, onEndDate, onEndTime, accentColor }) {
  const [open, setOpen] = useState(null);
  const endDateRef = useRef(null);
  const endTimeRef = useRef(null);
  const startDateRef = useRef(null);
  const startTimeRef = useRef(null);

  const toggle = (key) => {
    const willOpen = open !== key;
    setOpen(open === key ? null : key);
    
    // Scroll to the opened picker
    setTimeout(() => {
      const ref = key === 'ed' ? endDateRef : key === 'et' ? endTimeRef : key === 'sd' ? startDateRef : key === 'st' ? startTimeRef : null;
      if (ref?.current && willOpen) {
        ref.current.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
      }
    }, 50);
  };

  // Handle start time change - recalculate end time based on duration
  const handleStartTimeChange = (newStartTime) => {
    const dur = duration || 60;
    const newEndTime = addMinutes(newStartTime, dur);
    onStartTime(newStartTime);
    onEndTime(newEndTime);
  };

  return (
    <Card>
      <CardRow label="All Day"><Toggle on={allDay} onToggle={onAllDayToggle} /></CardRow>
      <CardRow label="Start">
        <button 
          type="button"
          ref={startDateRef}
          onClick={(e) => { e.preventDefault(); toggle('sd'); }}
          style={{
            padding: '8px 16px', borderRadius: 12, fontSize: 12, fontWeight: 700,
            border: `1.5px solid ${open === 'sd' ? accentColor : '#e2e8f0'}`,
            background: open === 'sd' ? `${accentColor}15` : '#fff',
            color: open === 'sd' ? accentColor : '#64748b',
            cursor: 'pointer', fontFamily: 'Manrope', touchAction: 'manipulation',
          }}
        >
          {fmtDate(startDate)}
        </button>
        {!allDay && (
          <button 
            type="button"
            ref={startTimeRef}
            onClick={(e) => { e.preventDefault(); toggle('st'); }}
            style={{
              padding: '8px 16px', borderRadius: 12, fontSize: 12, fontWeight: 700,
              border: `1.5px solid ${open === 'st' ? accentColor : '#e2e8f0'}`,
              background: open === 'st' ? `${accentColor}15` : '#fff',
              color: open === 'st' ? accentColor : '#64748b',
              cursor: 'pointer', fontFamily: 'Manrope', touchAction: 'manipulation',
            }}
          >
            {fmtTime(startTime)}
          </button>
        )}
      </CardRow>
      {open === 'sd' && (
        <div style={{ borderTop: '1px solid #f1f1f1', padding: '12px 0', zIndex: 1000, position: 'relative', background: '#fff' }}>
          <DateDrum value={startDate} onChange={(v) => { onStartDate(v); setOpen(null); }} />
        </div>
      )}
      {open === 'st' && !allDay && (
        <div style={{ borderTop: '1px solid #f1f1f1', padding: '12px 0', zIndex: 1000, position: 'relative', background: '#fff' }}>
          <TimeDrum value={startTime} onChange={handleStartTimeChange} />
        </div>
      )}
      <CardRow label="End" noBorder>
        <button 
          type="button"
          ref={endDateRef}
          onClick={(e) => { e.preventDefault(); toggle('ed'); }}
          style={{
            padding: '8px 16px', borderRadius: 12, fontSize: 12, fontWeight: 700,
            border: `1.5px solid ${open === 'ed' ? accentColor : '#e2e8f0'}`,
            background: open === 'ed' ? `${accentColor}15` : '#fff',
            color: open === 'ed' ? accentColor : '#64748b',
            cursor: 'pointer', fontFamily: 'Manrope', touchAction: 'manipulation',
            minHeight: '36px',
          }}
        >
          {fmtDate(endDate)}
        </button>
        {!allDay && (
          <button 
            type="button"
            ref={endTimeRef}
            onClick={(e) => { e.preventDefault(); toggle('et'); }}
            style={{
              padding: '8px 16px', borderRadius: 12, fontSize: 12, fontWeight: 700,
              border: `1.5px solid ${open === 'et' ? accentColor : '#e2e8f0'}`,
              background: open === 'et' ? `${accentColor}15` : '#fff',
              color: open === 'et' ? accentColor : '#64748b',
              cursor: 'pointer', fontFamily: 'Manrope', touchAction: 'manipulation',
              minHeight: '36px',
            }}
          >
            {fmtTime(endTime)}
          </button>
        )}
      </CardRow>
      {open === 'ed' && (
        <div style={{ borderTop: '1px solid #f1f1f1', padding: '12px 0', zIndex: 1000, position: 'relative', background: '#fff' }}>
          <DateDrum value={endDate} onChange={(v) => { onEndDate(v); setOpen(null); }} />
        </div>
      )}
      {open === 'et' && !allDay && (
        <div style={{ borderTop: '1px solid #f1f1f1', padding: '12px 0', zIndex: 1000, position: 'relative', background: '#fff' }}>
          <TimeDrum value={endTime} onChange={(v) => { onEndTime(v); setOpen(null); }} />
        </div>
      )}
    </Card>
  );
}

// ─── Main Modal ───────────────────────────────────────────────────────────────
export default function UnifiedCreateModal({ defaultType = 'task', defaultDate = null, defaultStatus = 'todo', initialNLText = '', initialParsedData = null, users = [], currentUser, onClose, onCreate, onCreateAppt }) {
  const initDate = defaultDate || todayStr();
  const [type, setType] = useState(defaultType);
  const [loading, setLoading] = useState(false);
  const [aiDescLoading, setAiDescLoading] = useState(false);
  const [appt, setAppt] = useState({ title: '', date: initDate, start_time: roundedTime(0), end_time: roundedTime(60), allDay: false, color: ACCENT, location: '', attendees: '', memo: '' });
  const [task, setTask] = useState({ title: '', task_date: initDate, due_date: addDays(initDate, 1), task_time: '09:00', end_time: '18:00', allDay: true, status: defaultStatus, priority: 'medium', category: '업무', description: '' });

  const isAppt = type === 'appointment';
  const accentColor = isAppt ? appt.color : ACCENT;

  const handleNLParsed = useCallback((p) => {
    if (!p) return;
    if (isAppt) {
      setAppt(a => {
        const newStartTime = p.task_time !== undefined ? p.task_time : a.start_time;
        const newDuration = p.duration !== undefined ? p.duration : 60;
        let newEndTime = a.end_time;
        if ((p.task_time !== undefined || p.duration !== undefined) && newStartTime) {
          newEndTime = addMinutes(newStartTime, newDuration);
        }
        // 약속 필드만 추출 (task_date→date 변환, 불필요한 필드 제외)
        const apptFields = {};
        if (p.title    !== undefined)     apptFields.title    = p.title;
        if (p.location !== undefined)     apptFields.location = p.location;
        if (p.memo     !== undefined)     apptFields.memo     = p.memo;
        if (p.color    !== undefined)     apptFields.color    = p.color;
        if (p.task_date !== undefined)    apptFields.date     = p.task_date; // task_date → date
        if (p.date     !== undefined)     apptFields.date     = p.date;
        return { ...a, ...apptFields, start_time: newStartTime, end_time: newEndTime };
      });
    } else {
      setTask(t => {
        const newTime = p.task_time !== undefined ? p.task_time : t.task_time;
        const newDuration = p.duration !== undefined ? p.duration : (t.duration || 60);
        let newEndTime = t.end_time;
        let newAllDay = p.allDay !== undefined ? p.allDay : t.allDay;
        if ((p.task_time !== undefined || p.duration !== undefined) && newTime) {
          newAllDay = false;
          newEndTime = addMinutes(newTime, newDuration);
        }
        // 불필요한 Gemini 응답 필드(action, modalType 등) 제외
        const { action, modalType, ...pClean } = p;
        return { ...t, ...pClean, end_time: newEndTime, allDay: newAllDay };
      });
    }
  }, [isAppt]);

  // ── 음성/AI로 이미 파싱된 데이터 직접 주입 (NLStrip 재파싱 없이) ─────────────
  // initialParsedData: { title, task_date, task_time, ... } — 마운트 시 한 번만 적용
  useEffect(() => {
    if (!initialParsedData) return;
    handleNLParsed(initialParsedData);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 의도적으로 마운트 시 1회만 실행

  const handleSubmit = async () => {
    setLoading(true);
    try {
      if (isAppt) {
        const { allDay, ...apptRest } = appt;
        const payload = { ...apptRest, created_by: currentUser?.id };
        if (allDay) {
          payload.start_time = null;
          payload.end_time = null;
        }
        await onCreateAppt(payload);
      } else {
        const { allDay, end_time, ...rest } = task;
        const payload = { ...rest, created_by: currentUser?.id };
        if (allDay) {
          payload.task_time = null;
          payload.duration = null;
        }
        await onCreate(payload);
      }
    } catch(e) {}
    setLoading(false);
    onClose();
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={e => e.target === e.currentTarget && onClose()}>
      <DrumPickerStyles />
      <div style={{ background: '#f9f9f9', borderRadius: 24, width: '100%', maxWidth: 480, maxHeight: '92vh', boxShadow: '0 40px 100px rgba(0,0,0,0.25)', display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
        
        {/* Header */}
        <div style={{ padding: '24px 24px 0', textAlign: 'center', position: 'relative' }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: '#1a1c1c', fontFamily: 'Manrope' }}>New {isAppt ? 'Appointment' : 'Task'}</h2>
          <button onClick={onClose} style={{ position: 'absolute', right: 24, top: 24, border: 'none', background: 'transparent', cursor: 'pointer', color: '#9ca3af' }}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Tab Switcher */}
        <div style={{ padding: '16px 24px 0' }}>
          <div style={{ display: 'flex', background: '#f1f1f1', padding: 4, borderRadius: 12 }}>
            <button onClick={() => setType('appointment')} style={{ flex: 1, padding: '8px', border: 'none', borderRadius: 9, background: isAppt ? '#fff' : 'transparent', color: isAppt ? ACCENT : '#71717a', fontWeight: isAppt ? 800 : 500, cursor: 'pointer', fontFamily: 'Manrope' }}>Appointment</button>
            <button onClick={() => setType('task')} style={{ flex: 1, padding: '8px', border: 'none', borderRadius: 9, background: !isAppt ? '#fff' : 'transparent', color: !isAppt ? ACCENT : '#71717a', fontWeight: !isAppt ? 800 : 500, cursor: 'pointer', fontFamily: 'Manrope' }}>Task</button>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <NLStrip onParsed={handleNLParsed} isAppt={isAppt} initialText={initialNLText} />
          <Card>
            <CardRow><input type="text" placeholder="Title" value={isAppt ? appt.title : task.title} onChange={e => isAppt ? setAppt(a => ({...a, title:e.target.value})) : setTask(t => ({...t, title:e.target.value}))} style={{ width: '100%', border: 'none', outline: 'none', fontSize: 18, fontWeight: 800, fontFamily: 'Manrope', color: '#1a1c1c' }} /></CardRow>
            <CardRow noBorder>
              <input type="text" placeholder={isAppt ? 'Location' : '설명 (선택)'} value={isAppt ? appt.location : task.description} onChange={e => isAppt ? setAppt(a => ({...a, location:e.target.value})) : setTask(t => ({...t, description:e.target.value}))} style={{ flex: 1, border: 'none', outline: 'none', fontSize: 14, fontFamily: 'Inter', color: '#71717a' }} />
              {!isAppt && (
                <button
                  onClick={async () => {
                    if (!task.title.trim()) return;
                    setAiDescLoading(true);
                    const desc = await generateDescription(task.title, task.category, task.task_date);
                    setAiDescLoading(false);
                    if (desc) setTask(t => ({ ...t, description: desc }));
                  }}
                  disabled={aiDescLoading || !task.title.trim()}
                  title="AI로 설명 자동 생성"
                  style={{ border: 'none', background: 'none', cursor: task.title.trim() ? 'pointer' : 'not-allowed', fontSize: 13, opacity: task.title.trim() ? 1 : 0.35, flexShrink: 0, padding: '2px 4px' }}
                >
                  {aiDescLoading ? '...' : '✨'}
                </button>
              )}
            </CardRow>
          </Card>
           <DateTimeCard 
            accentColor={accentColor} 
            allDay={isAppt ? appt.allDay : task.allDay} 
            onAllDayToggle={() => {
              if (isAppt) {
                const newAllDay = !appt.allDay;
                setAppt(a => ({...a, allDay: newAllDay, 
                  ...(newAllDay ? { start_time: null, end_time: null } : { start_time: '09:00', end_time: '10:00' })
                }));
              } else {
                const newAllDay = !task.allDay;
                setTask(t => ({...t, allDay: newAllDay,
                  ...(newAllDay ? { task_time: null, end_time: null, duration: null } : { task_time: '09:00', end_time: '10:00', duration: 60 })
                }));
              }
            }} 
            startDate={isAppt ? appt.date : task.task_date} 
            startTime={isAppt ? appt.start_time : task.task_time} 
            endDate={isAppt ? appt.date : task.due_date} 
            endTime={isAppt ? appt.end_time : task.end_time} 
            duration={task.duration}
            onStartDate={v => isAppt ? setAppt(a=>({...a, date:v})) : setTask(t=>({...t, task_date:v}))} 
            onStartTime={v => {
              const dur = isAppt ? 60 : (task.duration || 60);
              const end = addMinutes(v, dur);
              if (isAppt) {
                setAppt(a => ({...a, start_time: v, end_time: end}));
              } else {
                setTask(t => ({...t, task_time: v, end_time: end}));
              }
            }} 
            onEndDate={v => {
              // Ensure end date is not before start date
              if (isAppt) {
                setAppt(a => ({...a, date: v}));
              } else {
                if (v >= task.task_date) {
                  setTask(t => ({...t, due_date: v}));
                }
              }
            }} 
            onEndTime={v => isAppt ? setAppt(a=>({...a, end_time:v})) : setTask(t=>({...t, end_time:v}))} 
          />
          {!isAppt && (
             <Card>
               <CardRow label="Priority" noBorder>
                 <div style={{ display: 'flex', gap: 4 }}>{PRIORITIES.map(p => <Pill key={p.value} label={p.label} active={task.priority === p.value} onClick={() => setTask(t=>({...t, priority:p.value}))} accentColor={p.color} />)}</div>
               </CardRow>
             </Card>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 24px 24px', display: 'flex', gap: 12 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '16px', borderRadius: 16, border: '1px solid #e4e4e7', background: '#fff', color: '#71717a', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'Manrope' }}>Cancel</button>
          <button onClick={handleSubmit} disabled={loading} style={{ flex: 2, padding: '16px', borderRadius: 16, border: 'none', background: `linear-gradient(to bottom, ${ACCENT}, #8d0000)`, color: '#fff', fontSize: 16, fontWeight: 800, cursor: 'pointer', fontFamily: 'Manrope', boxShadow: `0 8px 24px ${ACCENT}44`, opacity: loading ? 0.7 : 1 }}>Save {isAppt ? 'Appt' : 'Task'}</button>
        </div>
      </div>
    </div>
  );
}
