import React, { useState, useRef } from 'react';
import { ACCENT } from '../../utils/colorMap.js';

const NOTE_TYPES = [
  { id: 'progress', label: '진행상황', icon: 'trending_up',   color: '#0ea5e9' },
  { id: 'issue',    label: '특이사항',  icon: 'warning',       color: '#f97316' },
  { id: 'meeting',  label: '미팅 기록', icon: 'groups',        color: '#8b5cf6' },
  { id: 'handoff',  label: '인수인계',  icon: 'swap_horiz',    color: '#10b981' },
];

export default function NoteForm({ projectId, users = [], tasks = [], appointments = [], currentUser, onSave, onCancel, initialData }) {
  const [type, setType] = useState(initialData?.type || 'progress');
  const [title, setTitle] = useState(initialData?.title || '');
  const [content, setContent] = useState(initialData?.content || '');
  const [meetingDate, setMeetingDate] = useState(initialData?.meeting_date || new Date().toISOString().slice(0, 10));
  const [attendees, setAttendees] = useState(initialData?.attendees || []);
  const [toUserId, setToUserId] = useState(initialData?.to_user_id || '');
  // 연결 항목: "task:id" 또는 "appt:id" 형식으로 통합 관리
  const initLinked = () => {
    if (initialData?.task_id)        return `task:${initialData.task_id}`;
    if (initialData?.appointment_id) return `appt:${initialData.appointment_id}`;
    return '';
  };
  const [linkedItem, setLinkedItem] = useState(initLinked);
  const [checklist, setChecklist] = useState(initialData?.checklist || []);
  const [saving, setSaving] = useState(false);
  const isEdit = !!initialData;
  const itemRefs = useRef({});

  const selectedType = NOTE_TYPES.find(t => t.id === type);
  const hasChecklist = type === 'progress' || type === 'issue';

  const toggleAttendee = (userId) => {
    setAttendees(prev => prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]);
  };

  const addCheckItem = () => {
    const id = Date.now().toString();
    setChecklist(prev => [...prev, { id, text: '', done: false }]);
    setTimeout(() => itemRefs.current[id]?.focus(), 0);
  };

  const updateCheckItem = (id, text) => {
    setChecklist(prev => prev.map(item => item.id === id ? { ...item, text } : item));
  };

  const removeCheckItem = (id) => {
    setChecklist(prev => prev.filter(item => item.id !== id));
  };

  const handleItemKeyDown = (e, id) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addCheckItem();
    }
    if (e.key === 'Backspace' && itemRefs.current[id]?.value === '') {
      e.preventDefault();
      const idx = checklist.findIndex(c => c.id === id);
      removeCheckItem(id);
      const prev = checklist[idx - 1];
      if (prev) setTimeout(() => itemRefs.current[prev.id]?.focus(), 0);
    }
  };

  const isSubmittable = content.trim() || title.trim() || checklist.some(c => c.text.trim());

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isSubmittable) return;
    setSaving(true);

    const payload = {
      project_id: projectId,
      type,
      content: content.trim() || null,
      title: title.trim() || null,
      from_user_id: currentUser?.id || null,
    };

    if (hasChecklist) {
      const filtered = checklist.filter(c => c.text.trim());
      payload.checklist = filtered.length ? filtered.map(c => ({ ...c, text: c.text.trim() })) : null;
    }

    if (type === 'meeting') {
      payload.meeting_date = meetingDate;
      payload.attendees = attendees.length ? attendees : null;
    }
    if (type === 'handoff') {
      payload.to_user_id = toUserId || null;
      payload.task_id = linkedTaskId || null;
    }
    if (type === 'issue' && linkedItem) {
      const [kind, id] = linkedItem.split(':');
      if (kind === 'task') payload.task_id = id;
      if (kind === 'appt') payload.appointment_id = id;
    }

    await onSave(payload);
    setSaving(false);
  };

  return (
    <form onSubmit={handleSubmit} style={{
      background: '#f8fafc', borderRadius: 14, border: '1px solid #e5e7eb',
      padding: 16, display: 'flex', flexDirection: 'column', gap: 12,
    }}>
      {/* Type selector */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {NOTE_TYPES.map(t => (
          <button
            key={t.id}
            type="button"
            onClick={() => setType(t.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              padding: '5px 10px', borderRadius: 20, border: 'none', cursor: 'pointer',
              fontSize: 11, fontWeight: 700,
              background: type === t.id ? t.color : '#f1f5f9',
              color: type === t.id ? '#fff' : '#52525b',
              transition: 'all 0.15s',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 13, fontVariationSettings: "'FILL' 1" }}>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {/* Title (meeting / handoff / issue) */}
      {(type === 'meeting' || type === 'handoff' || type === 'issue') && (
        <input
          type="text"
          placeholder={type === 'meeting' ? '회의 제목' : type === 'handoff' ? '인수인계 제목' : '이슈 제목'}
          value={title}
          onChange={e => setTitle(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 13, outline: 'none', background: '#fff' }}
        />
      )}

      {/* Meeting: date + attendees */}
      {type === 'meeting' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <input
            type="date"
            value={meetingDate}
            onChange={e => setMeetingDate(e.target.value)}
            style={{ padding: '7px 10px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 13, outline: 'none', background: '#fff' }}
          />
          {users.length > 0 && (
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', marginBottom: 4 }}>참석자</p>
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                {users.map(u => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => toggleAttendee(u.id)}
                    style={{
                      padding: '4px 10px', borderRadius: 20, border: 'none', cursor: 'pointer',
                      fontSize: 11, fontWeight: 700,
                      background: attendees.includes(u.id) ? '#8b5cf6' : '#f1f5f9',
                      color: attendees.includes(u.id) ? '#fff' : '#52525b',
                    }}
                  >{u.name}</button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Handoff: to_user + linked task */}
      {type === 'handoff' && (
        <div style={{ display: 'flex', gap: 8 }}>
          <select
            value={toUserId}
            onChange={e => setToUserId(e.target.value)}
            style={{ flex: 1, padding: '7px 10px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 13, outline: 'none', background: '#fff' }}
          >
            <option value="">수신자 선택</option>
            {users.filter(u => u.id !== currentUser?.id).map(u => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
          {tasks.length > 0 && (
            <select
              value={linkedTaskId}
              onChange={e => setLinkedTaskId(e.target.value)}
              style={{ flex: 1, padding: '7px 10px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 13, outline: 'none', background: '#fff' }}
            >
              <option value="">연결 업무 (선택)</option>
              {tasks.map(t => (
                <option key={t.id} value={t.id}>{t.title}</option>
              ))}
            </select>
          )}
        </div>
      )}

      {/* Issue: 연결 항목 통합 드롭다운 (업무 / 약속) */}
      {type === 'issue' && (tasks.length > 0 || appointments.length > 0) && (
        <select
          value={linkedItem}
          onChange={e => setLinkedItem(e.target.value)}
          style={{ width: '100%', padding: '7px 10px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 13, outline: 'none', background: '#fff' }}
        >
          <option value="">연결 항목 (선택)</option>
          {tasks.length > 0 && (
            <optgroup label="업무">
              {tasks.map(t => (
                <option key={`task:${t.id}`} value={`task:${t.id}`}>{t.title}</option>
              ))}
            </optgroup>
          )}
          {appointments.length > 0 && (
            <optgroup label="약속">
              {appointments.map(a => (
                <option key={`appt:${a.id}`} value={`appt:${a.id}`}>
                  {a.title}{a.date ? ` · ${new Date(a.date + 'T00:00:00').toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}` : ''}
                </option>
              ))}
            </optgroup>
          )}
        </select>
      )}

      {/* Content */}
      <textarea
        placeholder={
          type === 'progress' ? '진행 상황을 입력하세요...' :
          type === 'issue'    ? '특이사항 / 이슈 내용을 입력하세요...' :
          type === 'meeting'  ? '결정사항, 액션아이템 등을 입력하세요...' :
                                '전달 내용을 입력하세요...'
        }
        value={content}
        onChange={e => setContent(e.target.value)}
        rows={3}
        style={{
          padding: '9px 12px', borderRadius: 8, border: '1px solid #e5e7eb',
          fontSize: 13, outline: 'none', background: '#fff',
          resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.6,
        }}
      />

      {/* Checklist (progress / issue only) */}
      {hasChecklist && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af' }}>체크리스트</span>
            <button
              type="button"
              onClick={addCheckItem}
              style={{
                display: 'flex', alignItems: 'center', gap: 3,
                padding: '3px 8px', borderRadius: 6, border: 'none',
                background: '#f1f5f9', cursor: 'pointer',
                fontSize: 11, fontWeight: 700, color: '#52525b',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#e0e7ff'; e.currentTarget.style.color = '#6366f1'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#52525b'; }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 12 }}>add</span>
              추가
            </button>
          </div>

          {checklist.map((item) => (
            <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#d1d5db', flexShrink: 0 }}>radio_button_unchecked</span>
              <input
                ref={el => itemRefs.current[item.id] = el}
                type="text"
                value={item.text}
                onChange={e => updateCheckItem(item.id, e.target.value)}
                onKeyDown={e => handleItemKeyDown(e, item.id)}
                placeholder="항목 입력..."
                style={{
                  flex: 1, padding: '6px 10px', borderRadius: 7,
                  border: '1px solid #e5e7eb', fontSize: 13, outline: 'none', background: '#fff',
                }}
              />
              <button
                type="button"
                onClick={() => removeCheckItem(item.id)}
                style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#d1d5db', padding: 2, borderRadius: 4, flexShrink: 0 }}
                onMouseEnter={e => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = '#fee2e2'; }}
                onMouseLeave={e => { e.currentTarget.style.color = '#d1d5db'; e.currentTarget.style.background = 'none'; }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>close</span>
              </button>
            </div>
          ))}

          {checklist.length === 0 && (
            <button
              type="button"
              onClick={addCheckItem}
              style={{
                padding: '8px', borderRadius: 8, border: '1.5px dashed #e5e7eb',
                background: 'transparent', cursor: 'pointer',
                fontSize: 12, color: '#c4c4c4', fontWeight: 600,
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = selectedType?.color || ACCENT; e.currentTarget.style.color = selectedType?.color || ACCENT; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.color = '#c4c4c4'; }}
            >
              + 체크리스트 항목 추가
            </button>
          )}
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button type="button" onClick={onCancel} style={{
          padding: '7px 14px', borderRadius: 8, border: '1px solid #e5e7eb',
          background: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#52525b',
        }}>취소</button>
        <button
          type="submit"
          disabled={saving || !isSubmittable}
          style={{
            padding: '7px 14px', borderRadius: 8, border: 'none',
            background: selectedType?.color || ACCENT,
            color: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 700,
            opacity: (saving || !isSubmittable) ? 0.6 : 1,
          }}
        >{saving ? '저장 중...' : isEdit ? '수정 완료' : '저장'}</button>
      </div>
    </form>
  );
}
