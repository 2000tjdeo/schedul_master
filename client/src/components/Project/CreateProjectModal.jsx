import React, { useState } from 'react';
import { supabase } from '../../lib/supabase.js';
import { ACCENT } from '../../utils/colorMap.js';

const PROJECT_COLORS = [
  '#8e000d', '#1e40af', '#15803d', '#a16207', '#7e22ce', '#be185d',
  '#6366f1', '#0ea5e9', '#10b981', '#f97316', '#ef4444', '#ec4899',
];

const inputStyle = {
  width: '100%',
  background: '#f9f9f9',
  border: '1.5px solid #e4e4e7',
  borderRadius: 12,
  padding: '12px 16px',
  fontSize: 14,
  color: '#1a1c1c',
  outline: 'none',
  fontFamily: 'Inter, sans-serif',
  transition: 'border-color 0.15s',
  boxSizing: 'border-box',
};

// editProject가 있으면 수정 모드, 없으면 생성 모드
export default function CreateProjectModal({ onClose, onCreate, onUpdate, onDelete, currentUser, editProject = null }) {
  const isEdit = !!editProject;

  const [form, setForm] = useState({
    title:       editProject?.title       ?? '',
    description: editProject?.description ?? '',
    color:       editProject?.color       ?? ACCENT,
    start_date:  editProject?.start_date  ?? '',
    end_date:    editProject?.end_date    ?? '',
    status:      editProject?.status      ?? 'active',
  });
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!form.title.trim()) { setError('프로젝트 이름을 입력해주세요.'); return; }
    setLoading(true);
    setError('');

    if (isEdit) {
      // ── 수정 모드 ──────────────────────────────────────────────────────────
      const { data, error: err } = await supabase
        .from('sm_projects')
        .update(form)
        .eq('id', editProject.id)
        .select()
        .single();

      setLoading(false);
      if (err || !data) { setError('수정에 실패했습니다. 다시 시도해주세요.'); return; }
      onUpdate?.(data);
      onClose();
    } else {
      // ── 생성 모드 ──────────────────────────────────────────────────────────
      const payload = { ...form, created_by: currentUser?.id };
      const { data, error: err } = await supabase
        .from('sm_projects')
        .insert([payload])
        .select()
        .single();

      setLoading(false);
      if (err || !data) { setError('저장에 실패했습니다. 다시 시도해주세요.'); return; }
      onCreate?.(data);
      onClose();
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    setDeleting(true);
    const { error: err } = await supabase
      .from('sm_projects')
      .delete()
      .eq('id', editProject.id);
    setDeleting(false);
    if (err) { setError('삭제에 실패했습니다.'); setConfirmDelete(false); return; }
    onDelete?.(editProject.id);
    onClose();
  };

  const canSave = form.title.trim() && !loading;

  return (
    <div
      onClick={(e) => e.target === e.currentTarget && onClose()}
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(0,0,0,0.5)',
        backdropFilter: 'blur(10px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
      }}
    >
      <div style={{
        width: '100%', maxWidth: 480,
        background: '#fff',
        borderRadius: 24,
        boxShadow: '0 40px 100px rgba(0,0,0,0.25)',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
        maxHeight: '92vh',
      }}>
        {/* ── 헤더 ── */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '20px 24px',
          borderBottom: '1px solid #f1f1f1',
        }}>
          <button
            onClick={onClose}
            style={{
              width: 36, height: 36, borderRadius: '50%', border: 'none',
              background: '#f4f4f5', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#52525b' }}>close</span>
          </button>

          {/* 제목 */}
          <h1 style={{ fontSize: 18, fontWeight: 800, color: '#1a1c1c', fontFamily: 'Manrope, sans-serif', margin: 0, flex: 1 }}>
            {isEdit ? '프로젝트 수정' : '새 프로젝트'}
          </h1>

          {/* 색상 프리뷰 */}
          <div style={{
            width: 24, height: 24, borderRadius: '50%',
            background: form.color,
            boxShadow: `0 2px 8px ${form.color}66`,
            transition: 'background 0.2s',
            flexShrink: 0,
          }} />
        </div>

        {/* ── 본문 ── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          <div style={{ marginBottom: 24 }}>
            <p style={{ fontSize: 10, fontWeight: 800, color: ACCENT, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 6 }}>
              {isEdit ? '워크스페이스 편집' : '새 워크스페이스'}
            </p>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: '#1a1c1c', fontFamily: 'Manrope, sans-serif', margin: 0, lineHeight: 1.3 }}>
              {isEdit
                ? <><span style={{ color: ACCENT }}>{editProject.title}</span>을 수정합니다.</>
                : <>다음 프로젝트를 <span style={{ color: ACCENT }}>정의하세요.</span></>
              }
            </h2>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* 프로젝트 이름 */}
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#1a1c1c', fontFamily: 'Manrope, sans-serif', marginBottom: 8 }}>
                프로젝트 이름 <span style={{ color: ACCENT }}>*</span>
              </label>
              <input
                autoFocus
                type="text"
                value={form.title}
                onChange={(e) => { setForm(f => ({ ...f, title: e.target.value })); setError(''); }}
                placeholder="예: Q4 그로우스 전략"
                style={{
                  ...inputStyle,
                  borderColor: error && !form.title.trim() ? '#ef4444' : '#e4e4e7',
                  fontSize: 15, padding: '14px 16px',
                }}
                onFocus={e => e.target.style.borderColor = ACCENT + '88'}
                onBlur={e => e.target.style.borderColor = '#e4e4e7'}
              />
            </div>

            {/* 설명 */}
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#1a1c1c', fontFamily: 'Manrope, sans-serif', marginBottom: 8 }}>
                설명 <span style={{ fontSize: 11, fontWeight: 500, color: '#9ca3af' }}>(선택)</span>
              </label>
              <textarea
                value={form.description}
                onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="프로젝트의 목표와 범위를 설명해주세요..."
                rows={3}
                style={{ ...inputStyle, resize: 'none', lineHeight: 1.6 }}
                onFocus={e => e.target.style.borderColor = ACCENT + '88'}
                onBlur={e => e.target.style.borderColor = '#e4e4e7'}
              />
            </div>

            {/* 상태 (수정 모드에만 표시) */}
            {isEdit && (
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#1a1c1c', fontFamily: 'Manrope, sans-serif', marginBottom: 8 }}>
                  상태
                </label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {[
                    { value: 'active',    label: '진행 중', icon: 'play_circle',   color: '#10b981' },
                    { value: 'paused',    label: '일시정지', icon: 'pause_circle',  color: '#f59e0b' },
                    { value: 'completed', label: '완료',    icon: 'check_circle',  color: '#6366f1' },
                    { value: 'archived',  label: '보관',    icon: 'inventory_2',   color: '#9ca3af' },
                  ].map(s => (
                    <button
                      key={s.value}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, status: s.value }))}
                      style={{
                        flex: 1, padding: '8px 4px', borderRadius: 10,
                        border: `1.5px solid ${form.status === s.value ? s.color : '#e4e4e7'}`,
                        background: form.status === s.value ? `${s.color}14` : '#fff',
                        cursor: 'pointer',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                        transition: 'all 0.15s',
                      }}
                    >
                      <span className="material-symbols-outlined" style={{
                        fontSize: 18, color: form.status === s.value ? s.color : '#9ca3af',
                        fontVariationSettings: "'FILL' 1",
                      }}>{s.icon}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, color: form.status === s.value ? s.color : '#9ca3af' }}>
                        {s.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 기간 */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#1a1c1c', fontFamily: 'Manrope, sans-serif', marginBottom: 8 }}>시작일</label>
                <input
                  type="date"
                  value={form.start_date}
                  onChange={(e) => setForm(f => ({ ...f, start_date: e.target.value }))}
                  style={inputStyle}
                  onFocus={e => e.target.style.borderColor = ACCENT + '88'}
                  onBlur={e => e.target.style.borderColor = '#e4e4e7'}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#1a1c1c', fontFamily: 'Manrope, sans-serif', marginBottom: 8 }}>종료일</label>
                <input
                  type="date"
                  value={form.end_date}
                  onChange={(e) => setForm(f => ({ ...f, end_date: e.target.value }))}
                  style={inputStyle}
                  onFocus={e => e.target.style.borderColor = ACCENT + '88'}
                  onBlur={e => e.target.style.borderColor = '#e4e4e7'}
                />
              </div>
            </div>

            {/* 색상 */}
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#1a1c1c', fontFamily: 'Manrope, sans-serif', marginBottom: 12 }}>
                프로젝트 색상
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                {PROJECT_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, color: c }))}
                    style={{
                      width: 36, height: 36, borderRadius: '50%',
                      background: c,
                      border: form.color === c ? `3px solid ${c}` : '3px solid transparent',
                      outline: form.color === c ? `2px solid ${c}44` : 'none',
                      outlineOffset: 2,
                      cursor: 'pointer',
                      transform: form.color === c ? 'scale(1.2)' : 'scale(1)',
                      transition: 'all 0.15s',
                      boxShadow: form.color === c ? `0 4px 12px ${c}66` : 'none',
                    }}
                  />
                ))}
              </div>
            </div>

            {/* 에러 */}
            {error && (
              <div style={{
                background: '#fef2f2', border: '1px solid #fecaca',
                borderRadius: 10, padding: '10px 14px',
                fontSize: 13, color: '#dc2626', fontWeight: 600,
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>error</span>
                {error}
              </div>
            )}
          </form>
        </div>

        {/* ── 푸터 ── */}
        <div style={{ padding: '16px 24px 24px', borderTop: '1px solid #f1f1f1' }}>
          {/* 삭제 버튼 (수정 모드) */}
          {isEdit && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              style={{
                width: '100%', padding: '11px', borderRadius: 12, marginBottom: 10,
                border: confirmDelete ? 'none' : '1.5px solid #fecaca',
                background: confirmDelete ? '#ef4444' : 'transparent',
                color: confirmDelete ? '#fff' : '#dc2626',
                fontSize: 13, fontWeight: 700,
                cursor: deleting ? 'not-allowed' : 'pointer',
                fontFamily: 'Manrope, sans-serif',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                transition: 'all 0.2s',
              }}
            >
              {deleting ? (
                <>
                  <div style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                  삭제 중...
                </>
              ) : confirmDelete ? (
                <>
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>warning</span>
                  정말 삭제하시겠어요? (한 번 더 클릭)
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>delete</span>
                  프로젝트 삭제
                </>
              )}
            </button>
          )}

          {/* 취소 / 저장 */}
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              onClick={() => { setConfirmDelete(false); onClose(); }}
              style={{
                flex: 1, padding: '14px', borderRadius: 14,
                border: '1px solid #e4e4e7', background: '#fff',
                color: '#71717a', fontSize: 14, fontWeight: 700,
                cursor: 'pointer', fontFamily: 'Manrope, sans-serif',
              }}
            >
              취소
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canSave}
              style={{
                flex: 2, padding: '14px', borderRadius: 14,
                border: 'none',
                background: canSave
                  ? `linear-gradient(to bottom, ${form.color}, ${form.color}cc)`
                  : '#f4f4f5',
                color: canSave ? '#fff' : '#9ca3af',
                fontSize: 15, fontWeight: 800,
                cursor: canSave ? 'pointer' : 'not-allowed',
                fontFamily: 'Manrope, sans-serif',
                boxShadow: canSave ? `0 8px 24px ${form.color}44` : 'none',
                transition: 'all 0.2s',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              {loading ? (
                <>
                  <div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                  {isEdit ? '수정 중...' : '생성 중...'}
                </>
              ) : (
                <>
                  {isEdit ? '변경사항 저장' : '프로젝트 만들기'}
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                    {isEdit ? 'check' : 'rocket_launch'}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );
}
