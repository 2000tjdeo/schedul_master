import React, { useState, useEffect } from 'react';

const STATUS_LABELS = {
  todo: '할 일',
  in_progress: '진행 중',
  done: '완료',
};

export default function CreateTaskModal({ defaultStatus, users, currentUser, onClose, onCreate }) {
  const [form, setForm] = useState({
    title: '',
    description: '',
    status: defaultStatus || 'todo',
    priority: 'medium',
    due_date: '',
    assignee_id: '',
    task_date: '',
    task_time: '09:00',
    duration: 60,
    category: '업무',
    location: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) { setError('제목을 입력해주세요.'); return; }
    setLoading(true);
    setError('');
    const result = await onCreate({
      ...form,
      assignee_id: form.assignee_id ? Number(form.assignee_id) : null,
      created_by: currentUser?.id || null,
      due_date: form.task_date || form.due_date || null,
      duration: Number(form.duration) || 60,
    });
    setLoading(false);
    if (result?.error) {
      setError(result.error);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-panel w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-800">새 작업 만들기</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Title */}
          <div>
            <label className="label">제목 <span className="text-red-400">*</span></label>
            <input
              type="text"
              className="input"
              placeholder="작업 제목을 입력하세요"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              maxLength={200}
              autoFocus
            />
          </div>

          {/* Description */}
          <div>
            <label className="label">설명</label>
            <textarea
              className="input resize-none"
              rows={3}
              placeholder="작업에 대한 자세한 설명을 입력하세요 (선택)"
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            />
          </div>

          {/* Category & Priority */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">카테고리</label>
              <select className="input" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                {['업무', '개인', '미팅', '기타'].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="label">우선순위</label>
              <select className="input" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                <option value="low">낮음</option>
                <option value="medium">중간</option>
                <option value="high">높음</option>
              </select>
            </div>
          </div>

          {/* Status & Assignee */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">상태</label>
              <select className="input" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                <option value="todo">할 일</option>
                <option value="in_progress">진행 중</option>
                <option value="done">완료</option>
              </select>
            </div>
            <div>
              <label className="label">담당자</label>
              <select className="input" value={form.assignee_id} onChange={e => setForm(f => ({ ...f, assignee_id: e.target.value }))}>
                <option value="">미배정</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">일정 날짜</label>
              <input
                type="date"
                className="input"
                value={form.task_date}
                onChange={e => setForm(f => ({ ...f, task_date: e.target.value, due_date: e.target.value }))}
              />
            </div>
            <div>
              <label className="label">시간</label>
              <input
                type="time"
                className="input"
                value={form.task_time}
                onChange={e => setForm(f => ({ ...f, task_time: e.target.value }))}
              />
            </div>
          </div>

          {/* Duration & Location */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">소요 시간 (분)</label>
              <input
                type="number"
                className="input"
                value={form.duration}
                min={15} max={480} step={15}
                onChange={e => setForm(f => ({ ...f, duration: Number(e.target.value) }))}
              />
            </div>
            <div>
              <label className="label">장소 (선택)</label>
              <input
                type="text"
                className="input"
                placeholder="회의실 A"
                value={form.location}
                onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
              />
            </div>
          </div>

          {/* Summary */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 border border-slate-100">
            <div className={`w-3 h-3 rounded-full flex-shrink-0 ${
              form.priority === 'high' ? 'bg-red-500' :
              form.priority === 'medium' ? 'bg-amber-500' : 'bg-emerald-500'
            }`} />
            <div className="text-xs text-slate-500">
              <span className="font-medium text-slate-700">
                {form.priority === 'high' ? '높음' : form.priority === 'medium' ? '중간' : '낮음'}
              </span> 우선순위 ·{' '}
              <span className="font-medium text-slate-700">{STATUS_LABELS[form.status]}</span> 컬럼
              {form.task_date && (
                <> · <span className="font-medium text-slate-700">
                  {new Date(form.task_date + 'T00:00:00').toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                </span> {form.task_time}</>
              )}
            </div>
          </div>

          {error && (
            <p className="text-red-500 text-sm flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </p>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
            <button type="button" onClick={onClose} className="btn-secondary">
              취소
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  생성 중...
                </span>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  작업 만들기
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
