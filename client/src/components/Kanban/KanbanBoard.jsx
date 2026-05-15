import React from 'react';
import KanbanColumn from './KanbanColumn.jsx';

const COLUMNS = ['todo', 'in_progress', 'done'];

function ProjectFilterPills({ projects = [], selectedProjectIds = [], onProjectToggle }) {
  if (!projects?.length) return null;
  const isAll = selectedProjectIds.length === 0;

  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 20 }}>
      <button
        onClick={() => onProjectToggle?.(null)}
        style={{
          padding: '6px 14px', borderRadius: 20, border: 'none', cursor: 'pointer',
          fontSize: 12, fontWeight: 700,
          background: isAll ? '#1a1c1c' : '#f1f5f9',
          color: isAll ? '#fff' : '#52525b',
          transition: 'all 0.15s',
        }}
      >전체</button>
      {projects.map(proj => {
        const active = selectedProjectIds.includes(proj.id);
        return (
          <button
            key={proj.id}
            onClick={() => onProjectToggle?.(proj.id)}
            style={{
              padding: '6px 14px', borderRadius: 20, border: 'none', cursor: 'pointer',
              fontSize: 12, fontWeight: 700,
              background: active ? (proj.color || '#6366f1') : '#f1f5f9',
              color: active ? '#fff' : '#52525b',
              transition: 'all 0.15s',
            }}
          >{proj.title || proj.name}</button>
        );
      })}
    </div>
  );
}

export default function KanbanBoard({ tasks, onTaskClick, onMoveTask, onCreateTask, projects = [], selectedProjectIds = [], onProjectToggle }) {
  const tasksByStatus = {
    todo: tasks.filter(t => t.status === 'todo'),
    in_progress: tasks.filter(t => t.status === 'in_progress'),
    done: tasks.filter(t => t.status === 'done'),
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 0 }}>
      {/* Header */}
      <div style={{ padding: '0 0 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: '#1a1c1c', fontFamily: 'Manrope, sans-serif', margin: 0 }}>Board</h2>
          <p style={{ fontSize: 13, color: '#9ca3af', margin: '2px 0 0', fontWeight: 500 }}>할 일 · 진행 중 · 완료 · 칸반 방식으로 업무를 관리하세요</p>
        </div>
      </div>
      <ProjectFilterPills
        projects={projects}
        selectedProjectIds={selectedProjectIds}
        onProjectToggle={onProjectToggle}
      />
      <div style={{ display: 'flex', gap: 12, flex: 1, overflowX: 'auto', paddingBottom: 8 }}>
        {COLUMNS.map(col => (
          <KanbanColumn
            key={col}
            columnId={col}
            tasks={tasksByStatus[col] || []}
            onTaskClick={onTaskClick}
            onMoveTask={onMoveTask}
            onCreateTask={onCreateTask}
          />
        ))}
      </div>
    </div>
  );
}
