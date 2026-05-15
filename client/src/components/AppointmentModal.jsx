import React, { useState, useEffect } from 'react';
import { ACCENT } from '../utils/colorMap.js';
import { supabase } from '../lib/supabase.js';
import useTaskStore from '../store/taskStore.js';
import NoteForm from './Notes/NoteForm.jsx';

const COLORS = ['#b7131a', '#48626e', '#006578', '#7c3aed', '#0ea5e9', '#059669', '#ea580c'];

const UPDATE_META = {
  progress: { label: '진행상황', color: '#0ea5e9', bg: '#eff6ff' },
  issue:    { label: '특이사항', color: '#f97316', bg: '#fff7ed' },
  meeting:  { label: '미팅',    color: '#8b5cf6', bg: '#f5f3ff' },
  handoff:  { label: '인수인계', color: '#10b981', bg: '#f0fdf4' },
};

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (diff < 60)    return '방금 전';
  if (diff < 3600)  return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}일 전`;
  return new Date(dateStr).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
}

function UpdateCard({ note, currentUserId, onDelete }) {
  const meta = UPDATE_META[note.type] || UPDATE_META.progress;
  return (
    <div style={{ background: '#f8fafc', borderRadius: 10, padding: '10px 12px', marginBottom: 8, border: '1px solid #f1f5f9' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: note.title || note.content ? 6 : 0, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 6, background: meta.bg, color: meta.color }}>{meta.label}</span>
        <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>{note.from_user?.name || '알 수 없음'}</span>
        <span style={{ fontSize: 11, color: '#c4c4c4', marginLeft: 'auto' }}>{timeAgo(note.created_at)}</span>
        {note.from_user_id === currentUserId && (
          <button onClick={() => onDelete(note.id)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#d1d5db', padding: '0 2px', fontSize: 13, lineHeight: 1 }}>✕</button>
        )}
      </div>
      {note.title && <p style={{ fontSize: 13, fontWeight: 600, color: '#111', margin: '0 0 3px' }}>{note.title}</p>}
      {note.content && <p style={{ fontSize: 13, color: '#4b5563', margin: 0, whiteSpace: 'pre-wrap', lineHeight: 1.55 }}>{note.content}</p>}
    </div>
  );
}

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

export default function AppointmentModal({ appt, onClose, onUpdate, onDelete, currentUser, users = [], tasks = [] }) {
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
  const [updates,       setUpdates]       = useState([]);
  const [showUpdateForm, setShowUpdateForm] = useState(false);
  const { addNote, deleteNote } = useTaskStore();

  useEffect(() => {
    supabase
      .from('sm_notes')
      .select('*, from_user:from_user_id(name)')
      .eq('appointment_id', appt.id)
      .order('created_at', { ascending: true })
      .then(({ data }) => setUpdates(data || []));
  }, [appt.id]);

  const refreshUpdates = async () => {
    const { data } = await supabase
      .from('sm_notes')
      .select('*, from_user:from_user_id(name)')
      .eq('appointment_id', appt.id)
      .order('created_at', { ascending: true });
    setUpdates(data || []);
  };

  const handleSaveUpdate = async (payload) => {
    const result = await addNote({ ...payload, appointment_id: appt.id, project_id: appt.project_id || null });
    if (!result?.error) { setShowUpdateForm(false); refreshUpdates(); }
  };

  const handleDeleteUpdate = async (id) => {
    await deleteNote(id);
    setUpdates(prev => prev.filter(n => n.id !== id));
  };

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

          {/* 날짜 + 시간 — Option A: Start / End rows */}
          <div style={{ borderRadius: 12, overflow: 'hidden', border: '1.5px solid #e8e8e8' }}>
            {/* Start row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', borderBottom: '1px solid #f0f0f0', background: '#fafafa' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', minWidth: 36, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Start</span>
              <input type="date" value={form.date}
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                style={{ ...inputStyle, flex: 1 }}
                onFocus={e => e.target.style.borderColor = form.color}
                onBlur={e  => e.target.style.borderColor = '#e8e8e8'}
              />
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
                style={{ ...inputStyle, width: 'auto' }}
                onFocus={e => e.target.style.borderColor = form.color}
                onBlur={e  => e.target.style.borderColor = '#e8e8e8'}
              />
            </div>
            {/* End row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', background: '#fafafa' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', minWidth: 36, textTransform: 'uppercase', letterSpacing: '0.04em' }}>End</span>
              <input type="date" value={form.date}
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                style={{ ...inputStyle, flex: 1 }}
                onFocus={e => e.target.style.borderColor = form.color}
                onBlur={e  => e.target.style.borderColor = '#e8e8e8'}
              />
              <input type="time" value={form.end_time}
                onChange={e => {
                  const v = e.target.value;
                  setForm(f => ({ ...f, end_time: v < f.start_time ? f.start_time : v }));
                }}
                style={{ ...inputStyle, width: 'auto' }}
                onFocus={e => e.target.style.borderColor = form.color}
                onBlur={e  => e.target.style.borderColor = '#e8e8e8'}
              />
            </div>
          </div>
          {dur && (
            <div style={{ fontSize: 11, color: '#9ca3af', marginTop: -6 }}>소요: {dur}</div>
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

        {/* ── 업데이트 섹션 ─────────────────────────────────────── */}
        <div style={{ padding: '0 22px 28px', borderTop: '1px solid #f0f0f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0 10px' }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              업데이트{updates.length > 0 ? ` (${updates.length})` : ''}
            </span>
            <button
              onClick={() => setShowUpdateForm(v => !v)}
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                padding: '6px 12px', borderRadius: 8, border: 'none',
                background: showUpdateForm ? '#f1f5f9' : form.color,
                color: showUpdateForm ? '#555' : '#fff',
                fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                transition: 'all 0.15s',
              }}
            >
              {showUpdateForm ? '취소' : '+ 업데이트 추가'}
            </button>
          </div>

          {showUpdateForm && (
            <div style={{ marginBottom: 12 }}>
              <NoteForm
                projectId={appt.project_id}
                users={users}
                tasks={tasks.filter(t => !appt.project_id || t.project_id === appt.project_id)}
                currentUser={currentUser}
                onSave={handleSaveUpdate}
                onCancel={() => setShowUpdateForm(false)}
              />
            </div>
          )}

          {updates.length === 0 && !showUpdateForm ? (
            <p style={{ fontSize: 13, color: '#c4c4c4', textAlign: 'center', padding: '10px 0' }}>아직 업데이트가 없습니다</p>
          ) : (
            updates.map(note => (
              <UpdateCard key={note.id} note={note} currentUserId={currentUser?.id} onDelete={handleDeleteUpdate} />
            ))
          )}
        </div>

        </div>{/* end scroll */}
      </div>
    </div>
  );
}
