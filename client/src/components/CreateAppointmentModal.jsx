import React, { useState } from 'react';

const COLORS = ['#6366f1','#0ea5e9','#10b981','#f97316','#ef4444','#ec4899','#f59e0b'];

function timeToMin(t) { if (!t) return 0; const [h,m]=t.split(':').map(Number); return h*60+m; }

export default function CreateAppointmentModal({ defaultDate, onClose, onCreate, currentUser }) {
  const [form, setForm] = useState({
    title: '',
    date: defaultDate || new Date().toISOString().split('T')[0],
    start_time: '09:00',
    end_time: '10:00',
    location: '',
    memo: '',
    attendees: '',
    color: '#6366f1',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const duration = timeToMin(form.end_time) - timeToMin(form.start_time);
  const durationLabel = duration > 0
    ? duration >= 60 ? `${Math.floor(duration/60)}시간${duration%60?` ${duration%60}분`:''}` : `${duration}분`
    : '시간을 확인해주세요';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) { setError('제목을 입력해주세요.'); return; }
    if (duration <= 0) { setError('종료 시간이 시작 시간보다 늦어야 합니다.'); return; }
    setSaving(true);
    const result = await onCreate({ ...form, created_by: currentUser?.id });
    setSaving(false);
    if (!result?.error) onClose();
    else setError(result.error);
  };

  return (
    <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.4)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:50,padding:16 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background:'#fff',borderRadius:20,boxShadow:'0 20px 60px rgba(0,0,0,0.15)',width:'100%',maxWidth:440,maxHeight:'90vh',overflow:'auto' }}>
        <div style={{ padding:'20px 24px 16px',borderBottom:'1px solid #f0f0f0',display:'flex',alignItems:'center',justifyContent:'space-between' }}>
          <div style={{ display:'flex',alignItems:'center',gap:8 }}>
            <span style={{ fontSize:20 }}>🕐</span>
            <h2 style={{ fontSize:17,fontWeight:800,color:'#111',margin:0 }}>새 약속</h2>
          </div>
          <button onClick={onClose} style={{ border:'none',background:'none',cursor:'pointer',color:'#9ca3af',padding:4 }}>
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding:'20px 24px',display:'flex',flexDirection:'column',gap:14 }}>
          <div>
            <label style={{ fontSize:12,fontWeight:600,color:'#374151',display:'block',marginBottom:4 }}>제목 *</label>
            <input autoFocus style={{ width:'100%',padding:'10px 14px',border:'1px solid #e5e7eb',borderRadius:10,fontSize:14,outline:'none',boxSizing:'border-box' }}
              placeholder="약속 제목" value={form.title} onChange={e => setForm(f=>({...f,title:e.target.value}))}
              onFocus={e=>e.target.style.borderColor='#6366f1'} onBlur={e=>e.target.style.borderColor='#e5e7eb'} />
          </div>

          <div>
            <label style={{ fontSize:12,fontWeight:600,color:'#374151',display:'block',marginBottom:4 }}>날짜 *</label>
            <input type="date" style={{ width:'100%',padding:'10px 14px',border:'1px solid #e5e7eb',borderRadius:10,fontSize:14,outline:'none',boxSizing:'border-box' }}
              value={form.date} onChange={e => setForm(f=>({...f,date:e.target.value}))} />
          </div>

          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:10 }}>
            <div>
              <label style={{ fontSize:12,fontWeight:600,color:'#374151',display:'block',marginBottom:4 }}>시작 시간 *</label>
              <input type="time" style={{ width:'100%',padding:'10px 14px',border:'1px solid #e5e7eb',borderRadius:10,fontSize:14,outline:'none',boxSizing:'border-box' }}
                value={form.start_time} onChange={e => setForm(f=>({...f,start_time:e.target.value}))} />
            </div>
            <div>
              <label style={{ fontSize:12,fontWeight:600,color:'#374151',display:'block',marginBottom:4 }}>종료 시간 *</label>
              <input type="time" style={{ width:'100%',padding:'10px 14px',border:'1px solid #e5e7eb',borderRadius:10,fontSize:14,outline:'none',boxSizing:'border-box' }}
                value={form.end_time} onChange={e => setForm(f=>({...f,end_time:e.target.value}))} />
            </div>
          </div>
          <div style={{ fontSize:12,color:duration>0?'#9ca3af':'#ef4444',marginTop:-8 }}>⏱ {durationLabel}</div>

          <div>
            <label style={{ fontSize:12,fontWeight:600,color:'#374151',display:'block',marginBottom:4 }}>장소</label>
            <input style={{ width:'100%',padding:'10px 14px',border:'1px solid #e5e7eb',borderRadius:10,fontSize:14,outline:'none',boxSizing:'border-box' }}
              placeholder="장소 입력" value={form.location} onChange={e => setForm(f=>({...f,location:e.target.value}))} />
          </div>

          <div>
            <label style={{ fontSize:12,fontWeight:600,color:'#374151',display:'block',marginBottom:4 }}>참석자</label>
            <input style={{ width:'100%',padding:'10px 14px',border:'1px solid #e5e7eb',borderRadius:10,fontSize:14,outline:'none',boxSizing:'border-box' }}
              placeholder="쉼표로 구분 (예: 김민준, 이서연)" value={form.attendees} onChange={e => setForm(f=>({...f,attendees:e.target.value}))} />
          </div>

          <div>
            <label style={{ fontSize:12,fontWeight:600,color:'#374151',display:'block',marginBottom:4 }}>메모</label>
            <textarea rows={2} style={{ width:'100%',padding:'10px 14px',border:'1px solid #e5e7eb',borderRadius:10,fontSize:14,outline:'none',boxSizing:'border-box',resize:'none' }}
              placeholder="메모" value={form.memo} onChange={e => setForm(f=>({...f,memo:e.target.value}))} />
          </div>

          <div>
            <label style={{ fontSize:12,fontWeight:600,color:'#374151',display:'block',marginBottom:6 }}>색상</label>
            <div style={{ display:'flex',gap:8 }}>
              {COLORS.map(c => (
                <div key={c} onClick={() => setForm(f=>({...f,color:c}))}
                  style={{ width:28,height:28,borderRadius:'50%',background:c,cursor:'pointer',
                    border:form.color===c?'3px solid #111':'2px solid transparent',transition:'all 0.1s' }} />
              ))}
            </div>
          </div>

          {error && <p style={{ color:'#ef4444',fontSize:12,margin:0 }}>{error}</p>}

          <div style={{ display:'flex',gap:8,justifyContent:'flex-end',paddingTop:4 }}>
            <button type="button" onClick={onClose} style={{ padding:'10px 18px',borderRadius:10,border:'1px solid #e5e7eb',background:'#fff',cursor:'pointer',fontSize:13,fontWeight:600 }}>취소</button>
            <button type="submit" disabled={saving} style={{ padding:'10px 18px',borderRadius:10,border:'none',background:'#6366f1',color:'#fff',cursor:saving?'not-allowed':'pointer',fontSize:13,fontWeight:700,opacity:saving?0.7:1 }}>
              {saving ? '저장 중...' : '약속 추가'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
