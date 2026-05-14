import React, { useState } from 'react';
import { ACCENT } from '../../utils/colorMap.js';

const NOTE_TYPES = [
  { id: 'progress', label: '진행상황', icon: 'trending_up',   color: '#0ea5e9' },
  { id: 'issue',    label: '특이사항',  icon: 'warning',       color: '#f97316' },
  { id: 'meeting',  label: '미팅 기록', icon: 'groups',        color: '#8b5cf6' },
  { id: 'handoff',  label: '인수인계',  icon: 'swap_horiz',    color: '#10b981' },
];

export default function NoteForm({ projectId, users = [], tasks = [], currentUser, onSave, onCancel }) {
  const [type, setType] = useState('progress');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [meetingDate, setMeetingDate] = useState(new Date().toISOString().slice(0, 10));
  const [attendees, setAttendees] = useState([]);
  const [toUserId, setToUserId] = useState('');
  const [linkedTaskId, setLinkedTaskId] = useState('');
  const [saving, setSaving] = useState(false);

  const selectedType = NOTE_TYPES.find(t => t.id === type);

  const toggleAttendee = (userId) => {
    setAttendees(prev => prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim() && !title.trim()) return;
    setSaving(true);

    const payload = {
      project_id: projectId,
      type,
      content: content.trim() || null,
      title: title.trim() || null,
      from_user_id: currentUser?.id || null,
    };
    if (type === 'meeting') {
      payload.meeting_date = meetingDate;
      payload.attendees = attendees.length ? attendees : null;
    }
    if (type === 'handoff') {
      payload.to_user_id = toUserId || null;
      payload.task_id = linkedTaskId || null;
    }
    if (type === 'issue' && linkedTaskId) {
      payload.task_id = linkedTaskId;
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

      {/* Issue: linked task */}
      {type === 'issue' && tasks.length > 0 && (
        <select
          value={linkedTaskId}
          onChange={e => setLinkedTaskId(e.target.value)}
          style={{ padding: '7px 10px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 13, outline: 'none', background: '#fff' }}
        >
          <option value="">연결 업무 (선택)</option>
          {tasks.map(t => (
            <option key={t.id} value={t.id}>{t.title}</option>
          ))}
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

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button type="button" onClick={onCancel} style={{
          padding: '7px 14px', borderRadius: 8, border: '1px solid #e5e7eb',
          background: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#52525b',
        }}>취소</button>
        <button
          type="submit"
          disabled={saving || (!content.trim() && !title.trim())}
          style={{
            padding: '7px 14px', borderRadius: 8, border: 'none',
            background: selectedType?.color || ACCENT,
            color: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 700,
            opacity: (saving || (!content.trim() && !title.trim())) ? 0.6 : 1,
          }}
        >{saving ? '저장 중...' : '저장'}</button>
      </div>
    </form>
  );
}
