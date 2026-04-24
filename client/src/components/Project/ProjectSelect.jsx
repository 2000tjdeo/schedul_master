import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase.js';
import { ACCENT } from '../../utils/colorMap.js';

export function ProjectSelect({ value, onChange, placeholder = '프로젝트 선택' }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    async function fetchProjects() {
      const { data, error } = await supabase
        .from('sm_projects')
        .select('*')
        .order('created_at', { ascending: false });
      if (!error) setProjects(data || []);
      setLoading(false);
    }
    fetchProjects();
  }, []);

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    if (!open) return;
    function handleOutsideClick(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [open]);

  const selectedProject = projects.find(p => p.id === value);

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          background: '#fff',
          border: `1.5px solid ${open ? ACCENT + '66' : '#e4e4e7'}`,
          borderRadius: 12,
          padding: '10px 14px',
          textAlign: 'left',
          cursor: 'pointer',
          outline: 'none',
          transition: 'border-color 0.15s',
          fontFamily: 'Inter, sans-serif',
        }}
      >
        {value && selectedProject ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
            <div style={{ width: 14, height: 14, borderRadius: '50%', background: selectedProject.color || ACCENT, flexShrink: 0 }} />
            <span style={{ fontSize: 14, fontWeight: 600, color: '#1a1c1c', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {selectedProject.title}
            </span>
          </div>
        ) : (
          <span style={{ fontSize: 14, color: '#9ca3af', flex: 1 }}>{placeholder}</span>
        )}
        <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#9ca3af', flexShrink: 0 }}>
          {open ? 'expand_less' : 'expand_more'}
        </span>
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: 'absolute',
          zIndex: 999,
          width: '100%',
          top: 'calc(100% + 6px)',
          background: '#fff',
          borderRadius: 14,
          boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
          border: '1px solid #f0f0f0',
          overflow: 'hidden',
          maxHeight: 240,
          overflowY: 'auto',
        }}>
          {/* 로딩 상태 */}
          {loading && (
            <div style={{ padding: '16px', textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>
              불러오는 중...
            </div>
          )}

          {/* 선택 안함 */}
          {!loading && (
            <button
              type="button"
              onClick={() => { onChange?.(null); setOpen(false); }}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 14px',
                border: 'none',
                textAlign: 'left',
                cursor: 'pointer',
                background: !value ? '#f9f9f9' : 'transparent',
                fontFamily: 'Inter, sans-serif',
                transition: 'background 0.1s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#f5f5f5'}
              onMouseLeave={e => e.currentTarget.style.background = !value ? '#f9f9f9' : 'transparent'}
            >
              <div style={{ width: 14, height: 14, borderRadius: '50%', background: '#d1d5db', flexShrink: 0 }} />
              <span style={{ fontSize: 13, color: '#71717a' }}>선택 안함 (독립 업무)</span>
            </button>
          )}

          {/* 프로젝트 목록 */}
          {!loading && projects.map(project => (
            <button
              key={project.id}
              type="button"
              onClick={() => { onChange?.(project.id); setOpen(false); }}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 14px',
                border: 'none',
                textAlign: 'left',
                cursor: 'pointer',
                background: value === project.id ? '#f9f9f9' : 'transparent',
                fontFamily: 'Inter, sans-serif',
                transition: 'background 0.1s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#f5f5f5'}
              onMouseLeave={e => e.currentTarget.style.background = value === project.id ? '#f9f9f9' : 'transparent'}
            >
              <div style={{ width: 14, height: 14, borderRadius: '50%', background: project.color || ACCENT, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: '#1a1c1c', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {project.title}
                </span>
                {project.description && (
                  <span style={{ fontSize: 12, color: '#9ca3af', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {project.description}
                  </span>
                )}
              </div>
              {value === project.id && (
                <span className="material-symbols-outlined" style={{ fontSize: 16, color: ACCENT, flexShrink: 0, fontVariationSettings: "'FILL' 1" }}>check_circle</span>
              )}
            </button>
          ))}

          {/* 빈 상태 */}
          {!loading && projects.length === 0 && (
            <div style={{ padding: '20px 16px', textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>
              아직 프로젝트가 없습니다
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default ProjectSelect;
