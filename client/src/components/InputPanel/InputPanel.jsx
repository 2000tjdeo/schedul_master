import React, { useState, useEffect } from 'react';
import VoiceInput from './VoiceInput.jsx';
import ChipGroup from './ChipGroup.jsx';
import PreviewBar from './PreviewBar.jsx';
import useSpeech from '../../hooks/useSpeech.js';
import { parseNL } from '../../utils/nlParser.js';
import { parseNLWithGemini } from '../../utils/gemini.js';
import { todayYMD } from '../../utils/dateUtils.js';

const DEFAULT_FORM = {
  title: '',
  category: '업무',
  priority: 'medium',
  task_date: '',
  task_time: '',
  duration: 60,
  status: 'todo',
};

export default function InputPanel({ open, onAdd, currentUser }) {
  const [form, setForm] = useState(DEFAULT_FORM);
  const [nlText, setNlText] = useState('');

  const { status: speechStatus, startListening, stopListening, supported } = useSpeech({
    onResult: async (text) => {
      setNlText(text);
      // Try AI first, fallback to regex
      let parsed = await parseNLWithGemini(text);
      if (!parsed?.title) {
        parsed = parseNL(text);
      }
      // Normalize AI response
      if (parsed) {
        parsed.priority = parsed.priority || 'medium';
        parsed.category = parsed.category || '업무';
        parsed.duration = parsed.duration || 60;
      }
      setForm(f => ({ ...f, ...parsed }));
    },
  });

  const handleNlChange = async (e) => {
    const text = e.target.value;
    setNlText(text);
    if (text.trim()) {
      let parsed = await parseNLWithGemini(text);
      if (!parsed?.title) {
        parsed = parseNL(text);
      }
      if (parsed) {
        parsed.priority = parsed.priority || 'medium';
        parsed.category = parsed.category || '업무';
        parsed.duration = parsed.duration || 60;
      }
      setForm(f => ({ ...f, ...parsed }));
    }
  };

  const handleAdd = async () => {
    if (!form.title || !form.task_date || !form.task_time) return;
    const taskData = {
      ...form,
      created_by: currentUser?.id || null,
      assignee_id: currentUser?.id || null,
      due_date: form.task_date,
    };
    await onAdd(taskData);
    setForm(DEFAULT_FORM);
    setNlText('');
  };

  if (!open) return null;

  return (
    <div style={{
      background: '#fff', borderBottom: '1px solid #e8e8e8',
      boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
    }}>
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '16px 20px' }}>
        {/* Voice section */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            음성 입력
          </div>
          <VoiceInput
            status={speechStatus}
            onStart={startListening}
            onStop={stopListening}
            supported={supported}
          />
          {/* NL text box */}
          <div style={{ marginTop: 10 }}>
            <input
              type="text"
              value={nlText}
              onChange={handleNlChange}
              placeholder='예: "오늘 오후 2시 클라이언트 미팅 한시간"'
              style={{
                width: '100%', padding: '8px 12px', border: '1px solid #e5e7eb',
                borderRadius: 8, fontSize: 13, outline: 'none', background: '#fafafa',
                color: '#333',
              }}
            />
          </div>
        </div>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '12px 0', color: '#d1d5db', fontSize: 12 }}>
          <div style={{ flex: 1, height: 1, background: '#f0f0f0' }} />
          <span style={{ color: '#9ca3af', fontWeight: 500, whiteSpace: 'nowrap' }}>── 또는 직접 선택 ──</span>
          <div style={{ flex: 1, height: 1, background: '#f0f0f0' }} />
        </div>

        {/* Chip groups */}
        <ChipGroup form={form} onChange={setForm} />
      </div>

      {/* Preview bar + add button */}
      <PreviewBar form={form} onChange={setForm} onAdd={handleAdd} />
    </div>
  );
}
