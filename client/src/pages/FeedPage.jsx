import React, { useState, useEffect, useCallback } from 'react';
import useTaskStore from '../store/taskStore.js';
import NoteForm from '../components/Notes/NoteForm.jsx';
import { ACCENT } from '../utils/colorMap.js';

const NOTE_META = {
  progress: { label: '진행상황', icon: 'trending_up',  color: '#0ea5e9', bg: '#eff6ff' },
  issue:    { label: '특이사항',  icon: 'warning',      color: '#f97316', bg: '#fff7ed' },
  meeting:  { label: '미팅',      icon: 'groups',       color: '#8b5cf6', bg: '#f5f3ff' },
  handoff:  { label: '인수인계',  icon: 'swap_horiz',   color: '#10b981', bg: '#f0fdf4' },
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

function ChecklistSection({ checklist, onToggle }) {
  const total = checklist.length;
  const done = checklist.filter(c => c.done).length;
  const pct = total ? Math.round((done / total) * 100) : 0;
  const allDone = done === total;

  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <div style={{ flex: 1, height: 5, borderRadius: 99, background: '#f1f5f9', overflow: 'hidden' }}>
          <div style={{
            height: '100%', borderRadius: 99,
            background: allDone ? '#10b981' : '#0ea5e9',
            width: `${pct}%`, transition: 'width 0.3s ease',
          }} />
        </div>
        <span style={{ fontSize: 11, fontWeight: 700, color: allDone ? '#10b981' : '#9ca3af', minWidth: 32 }}>
          {done}/{total}
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {checklist.map(item => (
          <div
            key={item.id}
            onClick={() => onToggle(item.id)}
            style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', userSelect: 'none' }}
          >
            <span
              className="material-symbols-outlined"
              style={{
                fontSize: 17, flexShrink: 0,
                color: item.done ? '#10b981' : '#d1d5db',
                fontVariationSettings: item.done ? "'FILL' 1" : "'FILL' 0",
                transition: 'color 0.15s',
              }}
            >
              {item.done ? 'check_circle' : 'radio_button_unchecked'}
            </span>
            <span style={{
              fontSize: 13, color: item.done ? '#9ca3af' : '#374151',
              textDecoration: item.done ? 'line-through' : 'none',
              transition: 'all 0.15s',
            }}>
              {item.text}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function NoteCard({ note, tasks = [], projects = [], onDelete, onEdit, onToggleCheck, currentUserId }) {
  const meta = NOTE_META[note.type] || NOTE_META.progress;
  const linkedTask = note.task_id ? tasks.find(t => t.id === note.task_id) : null;
  const project = note.project_id ? projects.find(p => p.id === note.project_id) : null;
  const canEdit = note.from_user_id === currentUserId;
  const canDelete = canEdit;

  return (
    <div style={{
      background: '#fff', borderRadius: 16, border: '1px solid #f1f5f9',
      padding: '16px 18px', display: 'flex', gap: 14,
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: 10, flexShrink: 0,
        background: meta.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <span className="material-symbols-outlined" style={{ fontSize: 18, color: meta.color, fontVariationSettings: "'FILL' 1" }}>
          {meta.icon}
        </span>
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5, flexWrap: 'wrap' }}>
          <span style={{
            fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 8,
            background: meta.bg, color: meta.color, textTransform: 'uppercase', letterSpacing: '0.04em',
          }}>{meta.label}</span>

          {project && (
            <span style={{
              fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 8,
              background: `${project.color || '#6366f1'}18`, color: project.color || '#6366f1',
            }}>{project.title || project.name}</span>
          )}

          <span style={{ fontSize: 12, fontWeight: 700, color: '#374151' }}>
            {note.from_user?.name || '알 수 없음'}
          </span>
          {note.type === 'handoff' && note.to_user && (
            <>
              <span className="material-symbols-outlined" style={{ fontSize: 13, color: '#9ca3af' }}>arrow_forward</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#374151' }}>{note.to_user.name}</span>
            </>
          )}
          <span style={{ fontSize: 11, color: '#c4c4c4', marginLeft: 'auto' }}>{timeAgo(note.created_at)}</span>
          {canEdit && (
            <button onClick={() => onEdit(note)}
              title="수정"
              style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#d1d5db', padding: 2, borderRadius: 6, transition: 'color 0.15s, background 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.color = '#6366f1'; e.currentTarget.style.background = '#ede9fe'; }}
              onMouseLeave={e => { e.currentTarget.style.color = '#d1d5db'; e.currentTarget.style.background = 'none'; }}>
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>edit</span>
            </button>
          )}
          {canDelete && (
            <button onClick={() => onDelete(note.id)}
              title="삭제"
              style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#d1d5db', padding: 2, borderRadius: 6, transition: 'color 0.15s, background 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = '#fee2e2'; }}
              onMouseLeave={e => { e.currentTarget.style.color = '#d1d5db'; e.currentTarget.style.background = 'none'; }}>
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>close</span>
            </button>
          )}
        </div>

        {note.type === 'meeting' && (note.meeting_date || (note.attendees && note.attendees.length > 0)) && (
          <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 4 }}>
            {note.meeting_date && <span>{new Date(note.meeting_date + 'T00:00:00').toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' })}</span>}
            {note.attendees && note.attendees.length > 0 && <span> · 참석 {note.attendees.length}명</span>}
          </div>
        )}

        {note.title && <p style={{ fontSize: 13, fontWeight: 700, color: '#1a1c1c', marginBottom: 4 }}>{note.title}</p>}
        {note.content && <p style={{ fontSize: 13, color: '#4b5563', lineHeight: 1.6, whiteSpace: 'pre-wrap', margin: 0 }}>{note.content}</p>}

        {note.checklist && note.checklist.length > 0 && (
          <ChecklistSection
            checklist={note.checklist}
            onToggle={(itemId) => onToggleCheck(note.id, note.checklist, itemId)}
          />
        )}

        {linkedTask && (
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 8,
            padding: '3px 10px', borderRadius: 8,
            background: '#f1f5f9', fontSize: 11, fontWeight: 600, color: '#475569',
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: 12 }}>link</span>
            {linkedTask.title}
          </div>
        )}
      </div>
    </div>
  );
}

export default function FeedPage({ projects = [], users = [], tasks = [], currentUser }) {
  const { fetchNotes, addNote, updateNote, deleteNote } = useTaskStore();
  const [filterProjectId, setFilterProjectId] = useState(null);
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formProjectId, setFormProjectId] = useState(null);
  const [editingNote, setEditingNote] = useState(null);

  const activeProjects = projects.filter(p => p.status !== 'completed');

  const load = useCallback(async () => {
    setLoading(true);
    const data = await fetchNotes(filterProjectId);
    setNotes(data);
    setLoading(false);
  }, [filterProjectId, fetchNotes]);

  useEffect(() => { load(); }, [load]);

  const handleAddClick = () => {
    if (filterProjectId) {
      setFormProjectId(filterProjectId);
      setShowForm(true);
    } else {
      // 전체 모드: 프로젝트 선택 필요 → 첫 번째 프로젝트로 폼 열기
      setFormProjectId(activeProjects[0]?.id || null);
      setShowForm(true);
    }
  };

  const handleSave = async (payload) => {
    const result = await addNote(payload);
    if (!result?.error) {
      setShowForm(false);
      setFormProjectId(null);
      await load();
    }
  };

  const handleEdit = (note) => {
    setShowForm(false);
    setEditingNote(note);
  };

  const handleUpdate = async (payload) => {
    const result = await updateNote(editingNote.id, payload);
    if (!result?.error) {
      setEditingNote(null);
      await load();
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('이 기록을 삭제하시겠습니까?')) return;
    await deleteNote(id);
    setNotes(prev => prev.filter(n => n.id !== id));
  };

  const handleToggleCheck = async (noteId, checklist, itemId) => {
    const updated = checklist.map(c => c.id === itemId ? { ...c, done: !c.done } : c);
    setNotes(prev => prev.map(n => n.id === noteId ? { ...n, checklist: updated } : n));
    await updateNote(noteId, { checklist: updated });
  };

  const formTasks = tasks.filter(t => t.project_id === formProjectId);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 0 }}>
      {/* Header */}
      <div style={{ padding: '0 0 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: '#1a1c1c', fontFamily: 'Manrope, sans-serif', margin: 0 }}>Project Feed</h2>
          <p style={{ fontSize: 13, color: '#9ca3af', margin: '2px 0 0', fontWeight: 500 }}>진행상황 · 특이사항 · 미팅 · 인수인계</p>
        </div>
        <button
          onClick={handleAddClick}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '9px 16px', borderRadius: 12, border: 'none',
            background: ACCENT, color: '#fff',
            cursor: 'pointer', fontSize: 13, fontWeight: 700,
            boxShadow: `0 4px 12px ${ACCENT}33`,
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add</span>
          업데이트 추가
        </button>
      </div>

      {/* Project filter pills */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 20 }}>
        <button
          onClick={() => setFilterProjectId(null)}
          style={{
            padding: '6px 14px', borderRadius: 20, border: 'none', cursor: 'pointer',
            fontSize: 12, fontWeight: 700,
            background: filterProjectId === null ? '#1a1c1c' : '#f1f5f9',
            color: filterProjectId === null ? '#fff' : '#52525b',
            transition: 'all 0.15s',
          }}
        >전체</button>
        {activeProjects.map(p => (
          <button
            key={p.id}
            onClick={() => setFilterProjectId(p.id)}
            style={{
              padding: '6px 14px', borderRadius: 20, border: 'none', cursor: 'pointer',
              fontSize: 12, fontWeight: 700,
              background: filterProjectId === p.id ? (p.color || '#6366f1') : '#f1f5f9',
              color: filterProjectId === p.id ? '#fff' : '#52525b',
              transition: 'all 0.15s',
            }}
          >{p.title || p.name}</button>
        ))}
      </div>

      {/* Note form */}
      {showForm && formProjectId && (
        <div style={{ marginBottom: 16 }}>
          {/* 전체 모드에서 프로젝트 선택 */}
          {!filterProjectId && (
            <div style={{ marginBottom: 8 }}>
              <select
                value={formProjectId}
                onChange={e => setFormProjectId(e.target.value)}
                style={{ padding: '8px 12px', borderRadius: 10, border: '1px solid #e5e7eb', fontSize: 13, outline: 'none', background: '#fff', width: '100%' }}
              >
                {activeProjects.map(p => (
                  <option key={p.id} value={p.id}>{p.title || p.name}</option>
                ))}
              </select>
            </div>
          )}
          <NoteForm
            projectId={formProjectId}
            users={users}
            tasks={formTasks}
            currentUser={currentUser}
            onSave={handleSave}
            onCancel={() => { setShowForm(false); setFormProjectId(null); }}
          />
        </div>
      )}

      {/* Feed list */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {loading ? (
          <div style={{ padding: '40px 0', textAlign: 'center', color: '#d1d5db', fontSize: 13 }}>불러오는 중...</div>
        ) : notes.length === 0 ? (
          <div style={{ padding: '60px 0', textAlign: 'center', color: '#d1d5db' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 48, display: 'block', marginBottom: 12 }}>feed</span>
            <p style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>아직 기록이 없습니다</p>
            <p style={{ fontSize: 12, margin: '4px 0 0' }}>업데이트 추가 버튼으로 첫 기록을 남겨보세요</p>
          </div>
        ) : (
          notes.map(note => (
            editingNote?.id === note.id ? (
              <NoteForm
                key={note.id}
                projectId={note.project_id}
                users={users}
                tasks={tasks.filter(t => t.project_id === note.project_id)}
                currentUser={currentUser}
                initialData={editingNote}
                onSave={handleUpdate}
                onCancel={() => setEditingNote(null)}
              />
            ) : (
              <NoteCard
                key={note.id}
                note={note}
                tasks={tasks}
                projects={projects}
                onDelete={handleDelete}
                onEdit={handleEdit}
                onToggleCheck={handleToggleCheck}
                currentUserId={currentUser?.id}
              />
            )
          ))
        )}
      </div>
    </div>
  );
}
