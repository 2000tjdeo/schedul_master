import React, { useState, useEffect } from 'react';
import { ACCENT } from '../utils/colorMap.js';

const COLORS = ['#b7131a', '#48626e', '#006578', '#7c3aed', '#0ea5e9', '#059669', '#ea580c'];

function timeToMin(t) {
  if (!t) return 0;
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function durLabel(start, end) {
  const diff = timeToMin(end) - timeToMin(start);
  if (diff <= 0) return '';
  const h = Math.floor(diff / 60), m = diff % 60;
  return h > 0 ? (m > 0 ? `${h}시간 ${m}분` : `${h}시간`) : `${m}분`;
}

function FieldLabel({ children }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', marginBottom: 5, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
      {children}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      {children}
    </div>
  );
}

const inputStyle = {
  width: '100%', padding: '8px 10px',
  border: '1.5px solid #e8e8e8', borderRadius: 8,
  fontSize: 13, outline: 'none', background: '#fafafa',
  color: '#333', boxSizing: 'border-box', fontFamily: 'inherit',
};

export default function AppointmentModal({ appt, onClose, onUpdate, onDelete, currentUser }) {
  const [form, setForm] = useState({
    title:      appt.title,
    date:       appt.date,
    start_time: appt.start_time,
    end_time:   appt.end_time,
    location:   appt.location   || '',
    memo:       appt.memo       || '',
    attendees:  appt.attendees  || '',
    color:      appt.color      || ACCENT,
  });
  const [saving,        setSaving]        = useState(false);
  const [error,         setError]         = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting,      setDeleting]      = useState(false);

  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  const set = (k) => (v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async (e) => {
    e?.preventDefault();
    if (!form.title.trim()) { setError('제목을 입력해주세요.'); return; }
    setSaving(true);
    setError('');
    const result = await onUpdate(appt.id, form);
    setSaving(false);
    if (!result?.error) onClose();
    else setError(result.error);
  };

  const handleDelete = async () => {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    setDeleting(true);
    await onDelete(appt.id);
    setDeleting(false);
    onClose();
  };

  const dur = durLabel(form.start_time, form.end_time);

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 50,
        background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        background: '#fff', borderRadius: 20,
        width: '100%', maxWidth: 460,
        maxHeight: '92vh',
        overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
        boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
      }}>
        {/* 헤더 — 고정 */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '18px 22px 0',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: form.color }} />
            <span style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600 }}>약속 수정</span>
          </div>
          <button onClick={onClose} style={{
            border: 'none', background: '#f2f2f2', borderRadius: 8,
            width: 28, height: 28, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888',
          }}>
            <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 스크롤 영역 */}
        <div style={{ overflowY: 'auto', flex: 1 }}>
        <div style={{ padding: '16px 22px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* 제목 */}
          <input
            type="text"
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            autoFocus
            placeholder="약속 제목"
            style={{
              border: 'none', borderBottom: '2px solid #f0f0f0', outline: 'none',
              fontSize: 19, fontWeight: 700, color: '#111',
              padding: '2px 0 8px', background: 'transparent', width: '100%',
              fontFamily: 'inherit',
            }}
            onFocus={e => (e.target.style.borderBottomColor = form.color)}
            onBlur={e  => (e.target.style.borderBottomColor = '#f0f0f0')}
          />

          {/* 날짜 + 시간 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            <Field label="날짜">
              <input type="date" value={form.date}
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = form.color}
                onBlur={e  => e.target.style.borderColor = '#e8e8e8'}
              />
            </Field>
            <Field label="시작 시간">
              <input type="time" value={form.start_time}
                onChange={e => {
                  const v = e.target.value;
                  setForm(f => {
                    if (f.end_time && v >= f.end_time) {
                      const [h, m] = v.split(':').map(Number);
                      const newEnd = `${String(Math.min(h+1,23)).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
                      return { ...f, start_time: v, end_time: newEnd };
                    }
                    return { ...f, start_time: v };
                  });
                }}
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = form.color}
                onBlur={e  => e.target.style.borderColor = '#e8e8e8'}
              />
            </Field>
            <Field label="종료 시간">
              <input type="time" value={form.end_time}
                onChange={e => {
                  const v = e.target.value;
                  setForm(f => ({ ...f, end_time: v < f.start_time ? f.start_time : v }));
                }}
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = form.color}
                onBlur={e  => e.target.style.borderColor = '#e8e8e8'}
              />
            </Field>
          </div>
          {dur && (
            <div style={{ fontSize: 11, color: '#9ca3af', marginTop: -8 }}>소요: {dur}</div>
          )}

          {/* 장소 */}
          <Field label="장소">
            <input type="text" value={form.location}
              onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
              placeholder="장소 입력 (선택)"
              style={inputStyle}
              onFocus={e => e.target.style.borderColor = form.color}
              onBlur={e  => e.target.style.borderColor = '#e8e8e8'}
            />
          </Field>

          {/* 참석자 */}
          <Field label="참석자">
            <input type="text" value={form.attendees}
              onChange={e => setForm(f => ({ ...f, attendees: e.target.value }))}
              placeholder="이름 또는 이메일, 쉼표로 구분 (선택)"
              style={inputStyle}
              onFocus={e => e.target.style.borderColor = form.color}
              onBlur={e  => e.target.style.borderColor = '#e8e8e8'}
            />
          </Field>

          {/* 메모 */}
          <Field label="메모">
            <textarea rows={2} value={form.memo}
              onChange={e => setForm(f => ({ ...f, memo: e.target.value }))}
              placeholder="메모 (선택)"
              style={{ ...inputStyle, resize: 'none', lineHeight: 1.5 }}
              onFocus={e => e.target.style.borderColor = form.color}
              onBlur={e  => e.target.style.borderColor = '#e8e8e8'}
            />
          </Field>

          {/* 색상 */}
          <Field label="색상">
            <div style={{ display: 'flex', gap: 8 }}>
              {COLORS.map(c => (
                <button key={c} onClick={() => setForm(f => ({ ...f, color: c }))} style={{
                  width: 26, height: 26, borderRadius: '50%', cursor: 'pointer',
                  background: c, border: 'none',
                  outline: form.color === c ? `3px solid ${c}` : '3px solid transparent',
                  outlineOffset: 2,
                  transform: form.color === c ? 'scale(1.15)' : 'scale(1)',
                  transition: 'all 0.12s',
                }} />
              ))}
            </div>
          </Field>

          {error && (
            <p style={{ margin: 0, color: '#ef4444', fontSize: 13, fontWeight: 500 }}>{error}</p>
          )}

          {/* 저장 / 삭제 */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 4 }}>
            {confirmDelete ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 13, color: '#ef4444', fontWeight: 600 }}>정말 삭제할까요?</span>
                <button onClick={handleDelete} disabled={deleting} style={{
                  padding: '6px 12px', borderRadius: 7, border: 'none',
                  background: '#ef4444', color: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 700,
                }}>
                  {deleting ? '삭제 중...' : '삭제'}
                </button>
                <button onClick={() => setConfirmDelete(false)} style={{
                  padding: '6px 12px', borderRadius: 7,
                  border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer', fontSize: 12,
                }}>
                  취소
                </button>
              </div>
            ) : (
              <button onClick={handleDelete} style={{
                border: 'none', background: 'none', cursor: 'pointer',
                color: '#ef4444', fontSize: 13, fontWeight: 600,
                display: 'flex', alignItems: 'center', gap: 4,
              }}>
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                삭제
              </button>
            )}

            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={onClose} style={{
                padding: '9px 18px', borderRadius: 10,
                border: '1.5px solid #e8e8e8', background: '#fafafa',
                color: '#888', cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'inherit',
              }}>
                취소
              </button>
              <button onClick={handleSave} disabled={saving} style={{
                padding: '9px 22px', borderRadius: 10, border: 'none',
                background: form.color, color: '#fff',
                cursor: saving ? 'not-allowed' : 'pointer',
                fontSize: 13, fontWeight: 700, fontFamily: 'inherit',
                opacity: saving ? 0.7 : 1, transition: 'opacity 0.12s',
              }}>
                {saving ? '저장 중...' : '저장'}
              </button>
            </div>
          </div>

        </div>
        </div>{/* end scroll */}
      </div>
    </div>
  );
}
