import React, { useState, useEffect, useCallback } from 'react';
import { ACCENT } from '../utils/colorMap.js';
import { supabase } from '../lib/supabase.js';
import useTaskStore from '../store/taskStore.js';

// 프로젝트 ID → 고정 색상 (랜덤 아님)
const PROJECT_PALETTE = ['#6366f1','#0ea5e9','#10b981','#f97316','#ef4444','#ec4899','#f59e0b','#8b5cf6','#14b8a6','#64748b'];
const projectColor = (id = '') => PROJECT_PALETTE[id.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % PROJECT_PALETTE.length];

// ── QR 코드 (CDN 없이 URL로 표현) ─────────────────────────────────────────────
function QRDisplay({ inviteUrl }) {
  const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(inviteUrl)}`;
  return (
    <div style={{ textAlign: 'center' }}>
      <img src={qrApiUrl} alt="QR Code" width={180} height={180}
        style={{ borderRadius: 12, border: '1px solid #e5e5ea' }} />
      <p style={{ fontSize: 11, color: '#888', marginTop: 8, wordBreak: 'break-all', padding: '0 8px' }}>
        {inviteUrl}
      </p>
    </div>
  );
}

// ── 섹션 헤더 ─────────────────────────────────────────────────────────────────
function SectionHeader({ title, action }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
      <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#111' }}>{title}</h3>
      {action}
    </div>
  );
}

// ── 탭 버튼 ───────────────────────────────────────────────────────────────────
function Tab({ label, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      padding: '8px 16px', border: 'none', cursor: 'pointer',
      background: active ? '#fff' : 'transparent',
      borderRadius: 8, fontWeight: active ? 700 : 500,
      fontSize: 13, color: active ? '#111' : '#888',
      boxShadow: active ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
      fontFamily: 'inherit', transition: 'all 0.15s',
    }}>
      {label}
    </button>
  );
}

// ── 아바타 ─────────────────────────────────────────────────────────────────────
function Avatar({ name, size = 36 }) {
  const colors = ['#6366f1','#0ea5e9','#10b981','#f97316','#ef4444','#ec4899','#f59e0b','#8b5cf6'];
  const color = colors[name.charCodeAt(0) % colors.length];
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', background: color,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#fff', fontWeight: 700, fontSize: size * 0.38, flexShrink: 0,
    }}>
      {name[0]}
    </div>
  );
}

export default function AdminPage({ currentUser, onClose }) {
  const showToast = useTaskStore(s => s.showToast);
  const fetchProjectsGlobal = useTaskStore(s => s.fetchProjects);
  const [tab,         setTab]         = useState('members');
  const [members,     setMembers]     = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [chips,       setChips]       = useState([]);
  const [projects,     setProjects]     = useState([]);
  const [editingProject, setEditingProject] = useState(null);
  const [editProjectName, setEditProjectName] = useState('');
  const [editProjectDates, setEditProjectDates] = useState({ start_date: '', end_date: '' });
  const [loading,     setLoading]     = useState(false);
  const [inviteModal, setInviteModal] = useState(false);
  const [newInvite,   setNewInvite]   = useState(null);
  const [newChip,     setNewChip]     = useState({ label: '', type: 'title' });
  const [newProject, setNewProject] = useState({ name: '', color: '#6366f1' });
  const [pinModal,    setPinModal]    = useState(false);
  const [pinInput,    setPinInput]    = useState('');
  const [pinMsg,      setPinMsg]      = useState('');
  const [pinTarget,   setPinTarget]   = useState(null); // { id, name } — null이면 자기 자신

  const baseUrl = window.location.origin;

  const fetchMembers     = useCallback(async () => {
    const { data } = await supabase.from('sm_users').select('*');
    if (data) setMembers(data);
  }, []);
  
  const fetchInvitations = useCallback(async () => {
    const { data } = await supabase.from('sm_invitations').select('*, sm_users:used_by(name)');
    if (data) setInvitations(data.map(d => ({ ...d, used_by_name: d.sm_users?.name })));
  }, []);
  
  const fetchChips       = useCallback(async () => {
    const { data, error } = await supabase.from('sm_chip_presets').select('*');
    if (error) console.error('칩 로드 오류:', error.message, error.code);
    if (data) setChips(data);
  }, []);

  const fetchProjects = useCallback(async () => {
    try {
      const { data, error } = await supabase.from('sm_projects').select('*').order('created_at', { ascending: true });
      if (error) throw error;
      setProjects((data || []).map(p => ({ ...p, name: p.title })));
      fetchProjectsGlobal(); // 전체 앱 프로젝트 목록도 동시 갱신
    } catch (err) {
      console.error('fetchProjects error:', err);
    }
  }, [fetchProjectsGlobal]);

  useEffect(() => {
    fetchMembers();
    fetchInvitations();
    fetchChips();
    fetchProjects();
  }, []);

  // 역할 변경
  const handleRoleChange = async (userId, role) => {
    await supabase.from('sm_users').update({ role }).eq('id', userId);
    fetchMembers();
  };

  // 구성원 삭제
  const handleDeleteMember = async (userId) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    await supabase.from('sm_users').delete().eq('id', userId);
    fetchMembers();
  };

  // 초대 생성
  const handleCreateInvite = async (role = 'member') => {
    setLoading(true);
    const token = Math.random().toString(36).substr(2, 10);
    const expires = new Date();
    expires.setHours(expires.getHours() + 72);
    
    const { data: inv } = await supabase.from('sm_invitations').insert([{
      created_by: currentUser?.id,
      role,
      token,
      expires_at: expires.toISOString(),
    }]).select().single();
    
    setNewInvite({ ...inv, url: `${baseUrl}/join?token=${inv.token}` });
    setInviteModal(true);
    setLoading(false);
    fetchInvitations();
  };

  // 초대 삭제
  const handleDeleteInvite = async (id) => {
    await supabase.from('sm_invitations').delete().eq('id', id);
    fetchInvitations();
  };

  // 프로젝트 추가
  const handleAddProject = async () => {
    if (!newProject.name.trim()) return;
    setLoading(true);
    try {
      const payload = { title: newProject.name.trim(), color: newProject.color };
      if (currentUser?.id) payload.created_by = currentUser.id;
      const { error } = await supabase.from('sm_projects').insert([payload]);
      if (error) {
        showToast('프로젝트 생성 실패: ' + error.message, 'error');
      } else {
        showToast(`프로젝트 "${newProject.name}" 생성 완료`, 'success');
        setNewProject({ name: '', color: '#6366f1' });
        await fetchProjects();
      }
    } catch (err) {
      showToast('프로젝트 생성 실패', 'error');
    }
    setLoading(false);
  };

  // 프로젝트 삭제 (관련 업무도 함께 삭제)
  const handleDeleteProject = async (projectId, projectName) => {
    if (!confirm(`프로젝트 "${projectName}"와 관련된 모든 업무를 삭제하시겠습니까?`)) return;
    await supabase.from('sm_tasks').delete().eq('project_id', projectId);
    await supabase.from('sm_projects').delete().eq('id', projectId);
    fetchProjects();
  };

  // 프로젝트 수정 시작
  const handleEditProject = (p) => {
    setEditingProject(p.id);
    setEditProjectName(p.name);
    setEditProjectDates({ start_date: p.start_date || '', end_date: p.end_date || '' });
  };

  // 프로젝트 수정 저장
  const handleSaveProject = async () => {
    if (!editProjectName.trim() || !editingProject) return;
    const payload = { title: editProjectName.trim() };
    if (editProjectDates.start_date) payload.start_date = editProjectDates.start_date;
    else payload.start_date = null;
    if (editProjectDates.end_date) payload.end_date = editProjectDates.end_date;
    else payload.end_date = null;
    const { error } = await supabase.from('sm_projects').update(payload).eq('id', editingProject);
    if (!error) showToast('프로젝트가 수정되었습니다', 'success');
    setEditingProject(null);
    setEditProjectName('');
    setEditProjectDates({ start_date: '', end_date: '' });
    fetchProjects();
  };

  // 프로젝트 종료 / 재개
  const handleCompleteProject = async (p) => {
    const isCompleted = p.status === 'completed';
    if (!isCompleted && !confirm(`프로젝트 "${p.name}"을 종료하시겠습니까?\n캘린더에는 유지되고 사이드바 목록에서 숨겨집니다.`)) return;
    const payload = isCompleted
      ? { status: 'active', completed_at: null }
      : { status: 'completed', completed_at: new Date().toISOString() };
    const { error } = await supabase.from('sm_projects').update(payload).eq('id', p.id);
    if (!error) {
      showToast(isCompleted ? `프로젝트 "${p.name}" 재개` : `프로젝트 "${p.name}" 종료됨`, isCompleted ? 'success' : 'info');
      fetchProjects();
    } else {
      showToast('상태 변경 실패: ' + error.message, 'error');
    }
  };

  // 칩 추가
  const handleAddChip = async () => {
    if (!newChip.label.trim()) return;
    await supabase.from('sm_chip_presets').insert([{ ...newChip, created_by: currentUser?.id }]);
    setNewChip({ label: '', type: 'title' });
    fetchChips();
  };

  // 칩 삭제
  const handleDeleteChip = async (id) => {
    await supabase.from('sm_chip_presets').delete().eq('id', id);
    fetchChips();
  };

  // PIN 설정 (자기 자신 또는 관리자가 타인 지정)
  const handleSetPin = async () => {
    if (!/^\d{4,6}$/.test(pinInput)) { setPinMsg('4~6자리 숫자를 입력하세요'); return; }
    const targetId = pinTarget ? pinTarget.id : currentUser?.id;
    const { error } = await supabase.from('sm_users').update({ pin: pinInput }).eq('id', targetId);
    if (!error) { setPinMsg('PIN이 설정되었습니다'); setPinInput(''); setTimeout(() => { setPinModal(false); setPinTarget(null); }, 1200); }
    else { setPinMsg(error.message); }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 16,
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: '#f2f2f7', borderRadius: 20, width: '100%', maxWidth: 520,
        maxHeight: '92vh', overflowY: 'auto',
        boxShadow: '0 24px 60px rgba(0,0,0,0.2)',
        display: 'flex', flexDirection: 'column',
      }}>

        {/* 헤더 */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 20px 0',
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>관리자 설정</h2>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: '#888' }}>조직 관리 및 보안 설정</p>
          </div>
          <button onClick={onClose} style={{
            border: 'none', background: '#e5e5ea', borderRadius: '50%',
            width: 30, height: 30, cursor: 'pointer', fontSize: 14, color: '#555',
          }}>✕</button>
        </div>

        {/* 탭 */}
        <div style={{
          margin: '16px 20px 0',
          background: '#e4e4eb', borderRadius: 10, padding: 3,
          display: 'flex',
        }}>
          {[
            { id: 'members',     label: '구성원' },
            { id: 'invite',      label: '초대' },
            { id: 'chips',       label: '칩 관리' },
            { id: 'projects',     label: '프로젝트' },
            { id: 'security',    label: '보안' },
          ].map(t => (
            <Tab key={t.id} label={t.label} active={tab === t.id} onClick={() => setTab(t.id)} />
          ))}
        </div>

        <div style={{ padding: '16px 20px 28px' }}>

          {/* ── 구성원 탭 ─────────────────────────────────────────────── */}
          {tab === 'members' && (
            <>
              <SectionHeader title={`구성원 (${members.length}명)`} />
              <div style={{ background: '#fff', borderRadius: 14, overflow: 'hidden' }}>
                {members.map((m, i) => (
                  <div key={m.id} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '12px 16px',
                    borderBottom: i < members.length - 1 ? '1px solid #f0f0f0' : 'none',
                  }}>
                    <Avatar name={m.name} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 14, color: '#111' }}>{m.name}</div>
                      <div style={{ fontSize: 11, color: '#aaa' }}>
                        {new Date(m.created_at).toLocaleDateString('ko-KR')} 가입
                      </div>
                    </div>
                    <select
                      value={m.role}
                      onChange={e => handleRoleChange(m.id, e.target.value)}
                      disabled={m.id === currentUser?.id}
                      style={{
                        border: '1.5px solid #e0e0e0', borderRadius: 8, padding: '4px 8px',
                        fontSize: 12, fontWeight: 600, cursor: 'pointer',
                        background: m.role === 'admin' ? '#ede9fe' : '#f5f5f5',
                        color: m.role === 'admin' ? '#6366f1' : '#555',
                        fontFamily: 'inherit',
                      }}
                    >
                      <option value="member">구성원</option>
                      <option value="admin">관리자</option>
                    </select>
                    <button onClick={() => { setPinTarget({ id: m.id, name: m.name }); setPinModal(true); setPinMsg(''); setPinInput(''); }} style={{
                      border: 'none', background: 'none', cursor: 'pointer',
                      color: '#6366f1', fontSize: 12, padding: '4px 6px', fontWeight: 600,
                    }}>PIN</button>
                    {m.id !== currentUser?.id && (
                      <button onClick={() => handleDeleteMember(m.id)} style={{
                        border: 'none', background: 'none', cursor: 'pointer',
                        color: '#ef4444', fontSize: 12, padding: '4px 6px',
                      }}>삭제</button>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ── 초대 탭 ───────────────────────────────────────────────── */}
          {tab === 'invite' && (
            <>
              <SectionHeader
                title="새 구성원 초대"
                action={
                  <button onClick={() => handleCreateInvite('member')} disabled={loading}
                    style={{
                      padding: '7px 14px', borderRadius: 10, border: 'none',
                      background: ACCENT, color: '#fff', fontWeight: 700, fontSize: 12,
                      cursor: 'pointer', fontFamily: 'inherit',
                    }}>
                    + 초대 링크 생성
                  </button>
                }
              />

              {/* 초대 목록 */}
              <div style={{ background: '#fff', borderRadius: 14, overflow: 'hidden', marginBottom: 16 }}>
                {invitations.length === 0 ? (
                  <div style={{ padding: '20px', textAlign: 'center', color: '#bbb', fontSize: 13 }}>
                    생성된 초대가 없습니다
                  </div>
                ) : invitations.map((inv, i) => {
                  const expired = new Date(inv.expires_at) < new Date();
                  const used = !!inv.used_at;
                  const status = used ? '사용됨' : expired ? '만료' : '유효';
                  const statusColor = used ? '#10b981' : expired ? '#ef4444' : '#f97316';
                  return (
                    <div key={inv.id} style={{
                      padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10,
                      borderBottom: i < invitations.length - 1 ? '1px solid #f0f0f0' : 'none',
                    }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: '#333' }}>
                          {inv.role === 'admin' ? '관리자' : '구성원'} 초대
                          {inv.used_by_name && ` — ${inv.used_by_name}`}
                        </div>
                        <div style={{ fontSize: 11, color: '#aaa', marginTop: 2 }}>
                          {new Date(inv.expires_at).toLocaleDateString('ko-KR')} 만료
                        </div>
                      </div>
                      <span style={{
                        fontSize: 11, fontWeight: 700, color: statusColor,
                        background: `${statusColor}18`, padding: '3px 8px', borderRadius: 20,
                      }}>{status}</span>
                      {!used && !expired && (
                        <button
                          onClick={() => {
                            const url = `${baseUrl}/join?token=${inv.token}`;
                            navigator.clipboard?.writeText(url);
                            setNewInvite({ ...inv, url });
                            setInviteModal(true);
                          }}
                          style={{
                            padding: '4px 10px', borderRadius: 8, border: '1px solid #e0e0e0',
                            background: '#fff', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit',
                          }}>QR</button>
                      )}
                      {!used && (
                        <button onClick={() => handleDeleteInvite(inv.id)} style={{
                          border: 'none', background: 'none', color: '#ef4444', fontSize: 12,
                          cursor: 'pointer', padding: '4px 6px',
                        }}>삭제</button>
                      )}
                    </div>
                  );
                })}
              </div>

              <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 12, padding: '12px 16px' }}>
                <p style={{ margin: 0, fontSize: 12, color: '#92400e', lineHeight: 1.6 }}>
                  초대 링크는 <strong>72시간</strong> 유효합니다. 수신자가 링크를 열면 이름을 입력하고 자동으로 가입됩니다.
                  QR 코드로도 초대할 수 있습니다.
                </p>
              </div>
            </>
          )}

          {/* ── 칩 관리 탭 ────────────────────────────────────────────── */}
          {tab === 'chips' && (
            <>
              <SectionHeader title="자주 쓰는 칩 관리" />

              {/* 칩 추가 폼 */}
              <div style={{
                background: '#fff', borderRadius: 14, padding: '14px 16px',
                marginBottom: 14, display: 'flex', gap: 8, alignItems: 'center',
              }}>
                <input
                  type="text"
                  placeholder="칩 텍스트"
                  value={newChip.label}
                  onChange={e => setNewChip(c => ({ ...c, label: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && handleAddChip()}
                  style={{
                    flex: 1, border: '1.5px solid #e5e5ea', borderRadius: 8,
                    padding: '8px 12px', fontSize: 13, fontFamily: 'inherit', outline: 'none',
                  }}
                />
                <select
                  value={newChip.type}
                  onChange={e => setNewChip(c => ({ ...c, type: e.target.value }))}
                  style={{
                    border: '1.5px solid #e5e5ea', borderRadius: 8,
                    padding: '8px 10px', fontSize: 13, fontFamily: 'inherit',
                    background: '#fff', cursor: 'pointer',
                  }}
                >
                  <option value="title">제목</option>
                  <option value="category">카테고리</option>
                </select>
                <button onClick={handleAddChip} style={{
                  padding: '8px 14px', borderRadius: 8, border: 'none',
                  background: ACCENT, color: '#fff', fontWeight: 700, fontSize: 13,
                  cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
                }}>추가</button>
              </div>

              {/* 칩 목록 */}
              <div style={{ background: '#fff', borderRadius: 14, overflow: 'hidden' }}>
                {chips.length === 0 ? (
                  <div style={{ padding: 20, textAlign: 'center', color: '#bbb', fontSize: 13 }}>
                    등록된 칩이 없습니다
                  </div>
                ) : chips.map((chip, i) => (
                  <div key={chip.id} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '11px 16px',
                    borderBottom: i < chips.length - 1 ? '1px solid #f0f0f0' : 'none',
                  }}>
                    <span style={{
                      fontSize: 12, padding: '2px 8px', borderRadius: 20,
                      background: chip.type === 'title' ? '#ede9fe' : '#ecfdf5',
                      color: chip.type === 'title' ? '#6366f1' : '#10b981',
                      fontWeight: 600,
                    }}>{chip.type === 'title' ? '제목' : '카테고리'}</span>
                    <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: '#222' }}>{chip.label}</span>
                    <span style={{ fontSize: 11, color: '#bbb' }}>사용 {chip.usage_count}회</span>
                    {!chip.is_system && (
                      <button onClick={() => handleDeleteChip(chip.id)} style={{
                        border: 'none', background: 'none', color: '#ef4444',
                        fontSize: 12, cursor: 'pointer', padding: '4px 6px',
                      }}>삭제</button>
                    )}
                    {!!chip.is_system && (
                      <span style={{ fontSize: 11, color: '#bbb', padding: '4px 6px' }}>기본</span>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ── 프로젝트 탭 ────────────────────────────────────────────── */}
          {tab === 'projects' && (
            <>
              <SectionHeader title="프로젝트 관리" />

              {/* 프로젝트 추가 폼 */}
              <div style={{
                background: '#fff', borderRadius: 14, padding: '14px 16px',
                marginBottom: 14, display: 'flex', gap: 8, alignItems: 'center',
              }}>
                <input
                  type="text"
                  placeholder="프로젝트 이름"
                  value={newProject.name}
                  onChange={e => setNewProject(p => ({ ...p, name: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && handleAddProject()}
                  style={{
                    flex: 1, border: '1.5px solid #e5e5ea', borderRadius: 8,
                    padding: '8px 12px', fontSize: 13, fontFamily: 'inherit', outline: 'none',
                  }}
                />
                <input
                  type="color"
                  value={newProject.color}
                  onChange={e => setNewProject(p => ({ ...p, color: e.target.value }))}
                  style={{ width: 40, height: 36, border: '1.5px solid #e5e5ea', borderRadius: 8, cursor: 'pointer' }}
                />
                <button onClick={handleAddProject} style={{
                  padding: '8px 14px', borderRadius: 8, border: 'none',
                  background: ACCENT, color: '#fff', fontSize: 13, fontWeight: 700,
                  cursor: 'pointer', fontFamily: 'inherit',
                }}>추가</button>
              </div>

              {/* 프로젝트 목록 */}
              <div style={{ background: '#fff', borderRadius: 14, overflow: 'hidden' }}>
                {projects.length === 0 ? (
                  <div style={{ padding: 24, textAlign: 'center', color: '#888' }}>
                    프로젝트가 없습니다
                  </div>
                ) : (
                  projects.map((p, i) => (
                    <div key={i} style={{
                      padding: '12px 16px', borderBottom: '1px solid #f0f0f0',
                    }}>
                      {editingProject === p.id ? (
                        /* 편집 모드 */
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 12, height: 12, borderRadius: '50%', flexShrink: 0, background: p.color }} />
                            <input
                              value={editProjectName}
                              onChange={e => setEditProjectName(e.target.value)}
                              onKeyDown={k => k.key === 'Enter' && handleSaveProject()}
                              style={{ flex: 1, padding: '5px 8px', borderRadius: 6, border: '1px solid #ddd', fontSize: 14 }}
                              autoFocus
                            />
                          </div>
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center', paddingLeft: 20 }}>
                            <span style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600, whiteSpace: 'nowrap' }}>기간</span>
                            <input
                              type="date"
                              value={editProjectDates.start_date}
                              onChange={e => setEditProjectDates(d => ({ ...d, start_date: e.target.value }))}
                              style={{ flex: 1, padding: '4px 8px', borderRadius: 6, border: '1px solid #ddd', fontSize: 12, outline: 'none' }}
                            />
                            <span style={{ fontSize: 11, color: '#9ca3af' }}>~</span>
                            <input
                              type="date"
                              value={editProjectDates.end_date}
                              onChange={e => setEditProjectDates(d => ({ ...d, end_date: e.target.value }))}
                              style={{ flex: 1, padding: '4px 8px', borderRadius: 6, border: '1px solid #ddd', fontSize: 12, outline: 'none' }}
                            />
                          </div>
                          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                            <button onClick={() => setEditingProject(null)} style={{
                              padding: '5px 12px', borderRadius: 6, border: 'none',
                              background: '#f3f4f6', color: '#374151', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                            }}>취소</button>
                            <button onClick={handleSaveProject} style={{
                              padding: '5px 12px', borderRadius: 6, border: 'none',
                              background: '#d1fae5', color: '#065f46', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                            }}>저장</button>
                          </div>
                        </div>
                      ) : (
                        /* 일반 모드 */
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div style={{ width: 12, height: 12, borderRadius: '50%', flexShrink: 0, background: p.color }} />
                              <span style={{ fontWeight: 600, fontSize: 14 }}>{p.name}</span>
                            </div>
                            {(p.start_date || p.end_date) && (
                              <span style={{ fontSize: 11, color: '#9ca3af', paddingLeft: 20 }}>
                                {p.start_date || '?'} ~ {p.end_date || '?'}
                              </span>
                            )}
                          </div>
                          <div style={{ display: 'flex', gap: 4 }}>
                            {p.status === 'completed' && (
                              <span style={{
                                fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 10,
                                background: '#f1f5f9', color: '#64748b',
                              }}>종료됨</span>
                            )}
                            <button onClick={() => handleEditProject(p)} style={{
                              padding: '6px 10px', borderRadius: 6, border: 'none',
                              background: '#e0e7ff', color: '#3730a3', fontSize: 12, fontWeight: 600,
                              cursor: 'pointer',
                            }}>수정</button>
                            <button onClick={() => handleCompleteProject(p)} style={{
                              padding: '6px 10px', borderRadius: 6, border: 'none',
                              background: p.status === 'completed' ? '#d1fae5' : '#fef9c3',
                              color: p.status === 'completed' ? '#065f46' : '#713f12',
                              fontSize: 12, fontWeight: 600, cursor: 'pointer',
                            }}>{p.status === 'completed' ? '재개' : '종료'}</button>
                            <button onClick={() => handleDeleteProject(p.id, p.name)} style={{
                              padding: '6px 10px', borderRadius: 6, border: 'none',
                              background: '#fee2e2', color: '#dc2626', fontSize: 12, fontWeight: 600,
                              cursor: 'pointer',
                            }}>삭제</button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </>
          )}

          {/* ── 보안 탭 ───────────────────────────────────────────────── */}
          {tab === 'security' && (
            <>
              <SectionHeader title="로그인 보안 설정" />

              <div style={{ background: '#fff', borderRadius: 14, overflow: 'hidden', marginBottom: 14 }}>
                {/* PIN 설정 */}
                <div style={{
                  padding: '16px', borderBottom: '1px solid #f0f0f0',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>PIN 잠금</div>
                    <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>
                      4~6자리 숫자로 로그인 보호
                    </div>
                  </div>
                  <button onClick={() => { setPinModal(true); setPinMsg(''); setPinInput(''); }} style={{
                    padding: '8px 14px', borderRadius: 10, border: 'none',
                    background: '#f0f0f5', fontWeight: 600, fontSize: 13,
                    cursor: 'pointer', fontFamily: 'inherit', color: '#333',
                  }}>설정</button>
                </div>

                {/* 보안 안내 */}
                <div style={{ padding: '16px' }}>
                  <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 8 }}>로그인 방법 안내</div>
                  {[
                    { icon: '🔒', title: 'PIN 로그인', desc: '이름 입력 후 PIN 번호로 인증 (권장)' },
                    { icon: '📱', title: '모바일 웹', desc: 'Chrome(Android), Safari(iOS 15+) 사용 권장' },
                    { icon: '🔗', title: '초대 링크', desc: '관리자가 발급한 초대 링크로 가입' },
                  ].map(item => (
                    <div key={item.title} style={{
                      display: 'flex', gap: 12, padding: '8px 0',
                      borderBottom: '1px solid #f5f5f5',
                    }}>
                      <span style={{ fontSize: 18 }}>{item.icon}</span>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{item.title}</div>
                        <div style={{ fontSize: 12, color: '#888' }}>{item.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── 초대 QR 모달 ─────────────────────────────────────────────────────── */}
      {inviteModal && newInvite && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 300,
          background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 16,
        }} onClick={() => setInviteModal(false)}>
          <div onClick={e => e.stopPropagation()} style={{
            background: '#fff', borderRadius: 20, padding: '28px 24px',
            maxWidth: 320, width: '100%', textAlign: 'center',
            boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
          }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 17, fontWeight: 700 }}>초대 QR 코드</h3>
            <QRDisplay inviteUrl={newInvite.url} />
            <p style={{ fontSize: 12, color: '#888', margin: '12px 0' }}>
              72시간 유효 · {newInvite.role === 'admin' ? '관리자' : '구성원'} 권한
            </p>
            <button
              onClick={() => { navigator.clipboard?.writeText(newInvite.url); }}
              style={{
                width: '100%', padding: '12px', borderRadius: 12, border: 'none',
                background: '#f0f0f5', fontWeight: 600, fontSize: 14,
                cursor: 'pointer', fontFamily: 'inherit', marginBottom: 8,
              }}>
              링크 복사
            </button>
            <button onClick={() => setInviteModal(false)} style={{
              width: '100%', padding: '12px', borderRadius: 12, border: 'none',
              background: ACCENT, color: '#fff', fontWeight: 700, fontSize: 14,
              cursor: 'pointer', fontFamily: 'inherit',
            }}>닫기</button>
          </div>
        </div>
      )}

      {/* ── PIN 설정 모달 ─────────────────────────────────────────────────────── */}
      {pinModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 300,
          background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 16,
        }} onClick={() => setPinModal(false)}>
          <div onClick={e => e.stopPropagation()} style={{
            background: '#fff', borderRadius: 20, padding: '28px 24px',
            maxWidth: 300, width: '100%', textAlign: 'center',
            boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
          }}>
            <h3 style={{ margin: '0 0 6px', fontSize: 17, fontWeight: 700 }}>PIN 설정</h3>
            <p style={{ fontSize: 13, color: '#888', margin: '0 0 20px' }}>
              {pinTarget ? `${pinTarget.name}의 PIN` : '내 PIN'} · 4~6자리 숫자
            </p>
            <input
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={pinInput}
              onChange={e => setPinInput(e.target.value.replace(/\D/g, ''))}
              onKeyDown={e => e.key === 'Enter' && handleSetPin()}
              placeholder="● ● ● ●"
              style={{
                width: '100%', textAlign: 'center', fontSize: 24, letterSpacing: 8,
                border: '2px solid #e5e5ea', borderRadius: 12, padding: '14px',
                outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
              }}
            />
            {pinMsg && (
              <p style={{ fontSize: 12, color: pinMsg.includes('설정') ? '#10b981' : '#ef4444', margin: '8px 0 0' }}>
                {pinMsg}
              </p>
            )}
            <button onClick={handleSetPin} style={{
              width: '100%', marginTop: 16, padding: '13px', borderRadius: 12, border: 'none',
              background: ACCENT, color: '#fff', fontWeight: 700, fontSize: 15,
              cursor: 'pointer', fontFamily: 'inherit',
            }}>확인</button>
          </div>
        </div>
      )}
    </div>
  );
}
