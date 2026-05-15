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
    <div>
      <ProjectFilterPills
        projects={projects}
        selectedProjectIds={selectedProjectIds}
        onProjectToggle={onProjectToggle}
      />
      <div style={{ display: 'flex', gap: 12, height: '100%', overflowX: 'auto', paddingBottom: 8 }}>
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
