import React from 'react';
import KanbanColumn from './KanbanColumn.jsx';

const COLUMNS = ['todo', 'in_progress', 'done'];

function ProjectFilterPills({ projects = [], selectedProjectIds = [], onProjectToggle }) {
  if (!projects?.length) return null;
  
  return (
    <div className="flex flex-wrap gap-2 mb-4">
      <button 
        onClick={() => onProjectToggle?.(null)} 
        className={`px-3 py-1.5 rounded-full text-xs font-bold ${selectedProjectIds.length === 0 ? 'bg-primary text-white' : 'bg-slate-200 text-slate-600'}`}
      >
        All
      </button>
      {projects.map(proj => (
        <button 
          key={proj.id} 
          onClick={() => onProjectToggle?.(proj.id)} 
          className="px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5"
          style={{ 
            background: selectedProjectIds.includes(proj.id) ? proj.color : '#f1f5f9', 
            color: selectedProjectIds.includes(proj.id) ? '#fff' : '#475569' 
          }}
        >
          <span className="w-2 h-2 rounded-full" style={{ background: selectedProjectIds.includes(proj.id) ? '#fff' : proj.color }} />
          {proj.title}
        </button>
      ))}
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
