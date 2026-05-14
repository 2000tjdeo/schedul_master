import React, { useState, useEffect, useRef } from 'react';
import { CATEGORY_COLORS, PRIORITY_COLORS, ACCENT } from '../utils/colorMap.js';
import { formatTime, formatKoreanDate } from '../utils/dateUtils.js';
import { DateDrum } from './ui/DrumPicker.jsx';

// ── helpers ──────────────────────────────────────────────────────────────────
function timeToMin(t) {
  if (!t) return 0;
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}
function minToTime(min) {
  const h = Math.floor(min / 60) % 24;
  const m = min % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
function calcDuration(start, end) {
  const diff = timeToMin(end) - timeToMin(start);
  return diff > 0 ? diff : 60;
}
function getAvatarColor(name = '') {
  const colors = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316', '#f59e0b', '#10b981', '#14b8a6', '#0ea5e9'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}
function formatDateTime(str) {
  if (!str) return '';
  return new Date(str).toLocaleString('ko-KR', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

const STATUSES   = [
  { value: 'todo',        label: '할 일',   color: '#71717a' },
  { value: 'in_progress', label: '진행 중', color: '#f59e0b' },
  { value: 'done',        label: '완료',    color: '#10b981' },
  { value: 'archived',    label: '보관함',  color: '#9ca3af' },
];
const PRIORITIES = [
  { value: 'low',    label: '낮음', color: '#71717a' },
  { value: 'medium', label: '중간', color: '#f59e0b' },
  { value: 'high',   label: '높음', color: ACCENT },
];
const CATEGORIES = ['업무', '개인', '미팅', '기타'];

// ── Field components ──────────────────────────────────────────────────────────
function FieldLabel({ children }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', marginBottom: 5, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
      {children}
    </div>
  );
}

function TextInput({ value, onChange, placeholder, type = 'text' }) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        width: '100%', padding: '8px 10px',
        border: '1.5px solid #e8e8e8', borderRadius: 8,
        fontSize: 13, outline: 'none', background: '#fafafa',
        color: '#333', boxSizing: 'border-box', fontFamily: 'inherit',
      }}
      onFocus={e => e.target.style.borderColor = ACCENT}
      onBlur={e  => e.target.style.borderColor = '#e8e8e8'}
    />
  );
}

function DatePickerField({ value, onChange, minDate }) {
  const [open, setOpen] = useState(false);
  const fmtDisplay = (v) => {
    if (!v) return '날짜 선택';
    const [y, m, d] = v.split('-').map(Number);
    return `${y}. ${m}. ${d}.`;
  };
  return (
    <div style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', padding: '8px 10px', textAlign: 'left',
          border: `1.5px solid ${open ? ACCENT : '#e8e8e8'}`, borderRadius: 8,
          fontSize: 13, background: '#fafafa', color: value ? '#333' : '#aaa',
          cursor: 'pointer', fontFamily: 'inherit', boxSizing: 'border-box',
        }}
      >
        {fmtDisplay(value)}
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, zIndex: 200,
          background: '#fff', borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
          border: '1px solid #f1f1f1', marginTop: 4, minWidth: 260,
        }}
          onClick={e => e.stopPropagation()}
        >
          <DateDrum value={value} onChange={(v) => { onChange(v); setOpen(false); }} minDate={minDate} />
        </div>
      )}
    </div>
  );
}

function PillSelect({ options, value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 5, flexWrap: 'nowrap', overflowX: 'auto', paddingBottom: 2 }}>
      {options.map(o => {
        const active = value === o.value;
        return (
          <button key={o.value} onClick={() => onChange(o.value)} style={{
            padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
            border: `1.5px solid ${active ? o.color : '#e8e8e8'}`,
            background: active ? o.color + '18' : 'transparent',
            color: active ? o.color : '#aaa',
            cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.12s',
            flexShrink: 0, whiteSpace: 'nowrap',
          }}>
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

// ── Comments ──────────────────────────────────────────────────────────────────
function CommentsSection({ taskId, currentUser, getComments, onAddComment }) {
  const [comments,   setComments]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [text,       setText]       = useState('');
  const [submitting, setSubmitting] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    setLoading(true);
    getComments(taskId).then(data => {
      setComments(Array.isArray(data) ? data : []);
      setLoading(false);
    });
  }, [taskId, getComments]);

  useEffect(() => {
    if (!loading) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments, loading]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    setSubmitting(true);
    const comment = await onAddComment(taskId, text.trim());
    if (!comment.error) { setComments(prev => [...prev, comment]); setText(''); }
    setSubmitting(false);
  };

  return (
    <div style={{ marginTop: 20, borderTop: '1px solid #f0f0f0', paddingTop: 16 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
        댓글
        {comments.length > 0 && (
          <span style={{ fontSize: 11, color: '#9ca3af', fontWeight: 400 }}>{comments.length}개</span>
        )}
      </div>

      <div style={{ maxHeight: 200, overflowY: 'auto', marginBottom: 12 }}>
        {loading ? (
          <div style={{ fontSize: 13, color: '#9ca3af', textAlign: 'center', padding: '12px 0' }}>불러오는 중...</div>
        ) : comments.length === 0 ? (
          <div style={{ fontSize: 13, color: '#d1d5db', textAlign: 'center', padding: '12px 0' }}>아직 댓글이 없습니다.</div>
        ) : (
          comments.map(c => (
            <div key={c.id} style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
              <div style={{
                width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                background: getAvatarColor(c.user_name),
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontSize: 10, fontWeight: 700,
              }}>
                {(c.user_name || '?').slice(0, 1)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', gap: 8, marginBottom: 3, alignItems: 'baseline' }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>{c.user_name || '익명'}</span>
                  <span style={{ fontSize: 10, color: '#9ca3af' }}>{formatDateTime(c.created_at)}</span>
                </div>
                <p style={{
                  fontSize: 13, color: '#555', background: '#f8f8f8',
                  borderRadius: 8, padding: '6px 10px', margin: 0, lineHeight: 1.5,
                }}>
                  {c.content}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{
          width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
          background: getAvatarColor(currentUser?.name),
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontSize: 10, fontWeight: 700,
        }}>
          {(currentUser?.name || '?').slice(0, 1)}
        </div>
        <div style={{ flex: 1, display: 'flex', gap: 6 }}>
          <input
            type="text" placeholder="댓글 작성..."
            value={text} onChange={e => setText(e.target.value)}
            disabled={submitting}
            style={{
              flex: 1, padding: '7px 10px',
              border: '1.5px solid #e8e8e8', borderRadius: 8,
              fontSize: 13, outline: 'none', fontFamily: 'inherit', color: '#333',
            }}
            onFocus={e => e.target.style.borderColor = ACCENT}
            onBlur={e  => e.target.style.borderColor = '#e8e8e8'}
          />
          <button type="submit" disabled={submitting || !text.trim()} style={{
            padding: '7px 14px', borderRadius: 8, border: 'none',
            background: ACCENT, color: '#fff', cursor: 'pointer',
            fontSize: 12, fontWeight: 700, fontFamily: 'inherit',
            opacity: (!text.trim() || submitting) ? 0.4 : 1, transition: 'opacity 0.12s',
          }}>
            전송
          </button>
        </div>
      </form>
    </div>
  );
}

// ── Main modal — 항상 편집 모드 ───────────────────────────────────────────────
export default function TaskModal({
  task, users, currentUser,
  onClose, onUpdate, onDelete, onAddComment, getComments, projects = [],
}) {
  const initEnd = (() => {
    if (!task.task_time) return '';
    const endFromDuration = minToTime(timeToMin(task.task_time) + (task.duration || 60));
    // duration으로 계산한 end가 start보다 이르면(자정 넘김 등) +1시간으로 보정
    return endFromDuration > task.task_time ? endFromDuration : minToTime(timeToMin(task.task_time) + 60);
  })();

  const [form, setForm] = useState({
    title:       task.title,
    description: task.description || '',
    status:      task.status,
    priority:    task.priority,
    task_date:   task.task_date || '',
    due_date:    (task.due_date && task.task_date && task.due_date >= task.task_date)
                   ? task.due_date
                   : (task.task_date || task.due_date || ''),
    task_time:   task.task_time || '',
    end_time:    initEnd,
    duration:    task.duration  || 60,
    category:    task.category  || '업무',
    assignee_id: task.assignee_id || '',
    location:    task.location  || '',
    project_id:  task.project_id || '',
  });
  const [saving,         setSaving]         = useState(false);
  const [error,          setError]          = useState('');
  const [confirmDelete,  setConfirmDelete]  = useState(false);
  const [deleting,       setDeleting]       = useState(false);

  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  const shiftDate = (dateStr, days) => {
    const d = new Date(dateStr + 'T00:00:00');
    d.setDate(d.getDate() + days);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  };

  const set = (k) => (v) => setForm(f => {
    if (k === 'task_date') {
      if (f.task_date && f.due_date) {
        const diffDays = Math.round(
          (new Date(f.due_date + 'T00:00:00') - new Date(f.task_date + 'T00:00:00'))
          / 86400000
        );
        const newDue = shiftDate(v, Math.max(0, diffDays));
        return { ...f, task_date: v, due_date: newDue };
      }
      // due_date 없거나 새 시작일보다 이전이면 due_date를 시작일로 맞춤
      if (!f.due_date || f.due_date < v) {
        return { ...f, task_date: v, due_date: v };
      }
      return { ...f, task_date: v };
    }
    if (k === 'due_date' && f.task_date && v < f.task_date) {
      return { ...f, due_date: f.task_date };
    }
    return { ...f, [k]: v };
  });

  const handleStartTime = (v) => {
    const rawDiff = form.end_time ? timeToMin(form.end_time) - timeToMin(v) : -1;
    const newEnd  = rawDiff <= 0 ? minToTime(timeToMin(v) + 60) : form.end_time;
    const newDur  = rawDiff > 0 ? rawDiff : 60;
    setForm(f => ({ ...f, task_time: v, end_time: newEnd, duration: newDur }));
  };
  const handleEndTime = (v) => {
    if (form.task_time && v <= form.task_time) {
      return setForm(f => ({ ...f, end_time: f.task_time, duration: 0 }));
    }
    const dur = timeToMin(v) - timeToMin(form.task_time);
    setForm(f => ({ ...f, end_time: v, duration: dur > 0 ? dur : 0 }));
  };

  const handleSave = async () => {
    if (!form.title.trim()) { setError('제목을 입력해주세요.'); return; }
    setError('');
    setSaving(true);
    const payload = {
      ...form,
      task_time:   form.task_time || null,
      assignee_id: form.assignee_id ? Number(form.assignee_id) : null,
      duration:    form.task_time ? (form.duration ? Number(form.duration) : 60) : null,
    };
    // 빈 문자열 필터링
    Object.keys(payload).forEach(k => {
      if (payload[k] === '' || payload[k] === null) delete payload[k];
    });
    const result = await onUpdate(task.id, payload);
    setSaving(false);
    if (result?.error) setError(result.error);
    else onClose();
  };

  const handleDelete = async () => {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    setDeleting(true);
    await onDelete(task.id);
    setDeleting(false);
    onClose();
  };

  const catColors = CATEGORY_COLORS[task.category] || CATEGORY_COLORS['기타'];
  const actualDur = (form.task_time && form.end_time)
    ? Math.max(0, timeToMin(form.end_time) - timeToMin(form.task_time))
    : form.duration;
  const durLabel = actualDur >= 60
    ? `${Math.floor(actualDur / 60)}시간${actualDur % 60 ? ` ${actualDur % 60}분` : ''}`
    : `${actualDur}분`;

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
        width: '100%', maxWidth: 520,
        maxHeight: '92vh',
        overflow: 'hidden',            /* 둥근 모서리 안에 스크롤바 가둠 */
        display: 'flex', flexDirection: 'column',
        boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
      }}>
        {/* 헤더 — 스크롤 안 됨 */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '18px 22px 0',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: catColors.border }} />
            <span style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600 }}>업무 수정</span>
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
            placeholder="제목"
            style={{
              border: 'none', borderBottom: '2px solid #f0f0f0', outline: 'none',
              fontSize: 19, fontWeight: 700, color: '#111',
              padding: '2px 0 8px', background: 'transparent', width: '100%',
              fontFamily: 'inherit',
            }}
            onFocus={e  => e.target.style.borderBottomColor = ACCENT}
            onBlur={e   => e.target.style.borderBottomColor = '#f0f0f0'}
          />

          {/* 상태 / 우선순위 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <FieldLabel>상태</FieldLabel>
              <PillSelect options={STATUSES} value={form.status} onChange={set('status')} />
            </div>
            <div>
              <FieldLabel>우선순위</FieldLabel>
              <PillSelect options={PRIORITIES} value={form.priority} onChange={set('priority')} />
            </div>
          </div>

          {/* 카테고리 */}
          <div>
            <FieldLabel>카테고리</FieldLabel>
            <div style={{ display: 'flex', gap: 5, flexWrap: 'nowrap', overflowX: 'auto', paddingBottom: 2 }}>
              {CATEGORIES.map(cat => {
                const active = form.category === cat;
                const colors = CATEGORY_COLORS[cat] || CATEGORY_COLORS['기타'];
                return (
                  <button key={cat} onClick={() => setForm(f => ({ ...f, category: cat }))} style={{
                    padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                    border: `1.5px solid ${active ? colors.border : '#e8e8e8'}`,
                    background: active ? colors.bg : 'transparent',
                    color: active ? colors.text : '#aaa',
                    cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.12s',
                    flexShrink: 0,
                  }}>
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 프로젝트 */}
          <div>
            <FieldLabel>프로젝트</FieldLabel>
            <PillSelect
              value={form.project_id}
              onChange={v => setForm(f => ({ ...f, project_id: v }))}
              options={[
                { value: '', label: '없음', color: '#64748b' },
                ...projects.map(p => ({ value: p.id, label: p.name || p.title, color: p.color || '#6366f1' }))
              ]}
            />
          </div>

          {/* 담당자 */}
          <div>
            <FieldLabel>담당자</FieldLabel>
            <select
              value={form.assignee_id}
              onChange={e => setForm(f => ({ ...f, assignee_id: e.target.value }))}
              style={{
                width: '100%', padding: '7px 10px',
                border: '1.5px solid #e8e8e8', borderRadius: 8,
                fontSize: 13, outline: 'none', background: '#fafafa',
                cursor: 'pointer', fontFamily: 'inherit', color: '#333',
              }}
            >
              <option value="">미배정</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>

          {/* 날짜 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <FieldLabel>시작 날짜</FieldLabel>
              <DatePickerField value={form.task_date} onChange={set('task_date')} />
            </div>
            <div>
              <FieldLabel>종료 날짜</FieldLabel>
              <DatePickerField value={form.due_date} onChange={set('due_date')} minDate={form.task_date} />
            </div>
          </div>

          {/* 시간 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <FieldLabel>시작 시간</FieldLabel>
              <TextInput type="time" value={form.task_time} onChange={handleStartTime} />
            </div>
            <div>
              <FieldLabel>종료 시간</FieldLabel>
              <TextInput type="time" value={form.end_time} onChange={handleEndTime} />
            </div>
          </div>
          {form.task_time && (
            <div style={{ fontSize: 11, color: '#9ca3af', marginTop: -8 }}>
              소요 시간: {durLabel}
            </div>
          )}

          {/* 장소 */}
          <div>
            <FieldLabel>장소</FieldLabel>
            <TextInput value={form.location} onChange={set('location')} placeholder="장소 입력 (선택)" />
          </div>

          {/* 설명 */}
          <div>
            <FieldLabel>설명</FieldLabel>
            <textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              rows={3} placeholder="업무 설명을 입력하세요..."
              style={{
                width: '100%', padding: '8px 10px',
                border: '1.5px solid #e8e8e8', borderRadius: 8,
                fontSize: 13, outline: 'none', resize: 'none',
                background: '#fafafa', color: '#333',
                boxSizing: 'border-box', fontFamily: 'inherit', lineHeight: 1.5,
              }}
              onFocus={e => e.target.style.borderColor = ACCENT}
              onBlur={e  => e.target.style.borderColor = '#e8e8e8'}
            />
          </div>

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
                background: `linear-gradient(to bottom, ${ACCENT}, #8d0000)`, color: '#fff',
                cursor: saving ? 'not-allowed' : 'pointer',
                fontSize: 13, fontWeight: 700, fontFamily: 'inherit',
                opacity: saving ? 0.7 : 1, transition: 'opacity 0.12s',
              }}>
                {saving ? '저장 중...' : '저장'}
              </button>
            </div>
          </div>

          {/* 댓글 */}
          {onAddComment && getComments && (
            <CommentsSection
              taskId={task.id}
              currentUser={currentUser}
              getComments={getComments}
              onAddComment={onAddComment}
            />
          )}

        </div>
        </div>{/* end scroll */}
      </div>
    </div>
  );
}
