import React, { useRef } from 'react';
import useSwipe from '../../hooks/useSwipe.js';
import MobileKanbanBoard from '../Kanban/MobileKanbanBoard.jsx';
import CalendarPanel from '../Calendar/CalendarPanel.jsx';

export default function SwipeView({
  tasks,
  appointments,
  onTaskClick,
  onApptClick,
  onCreateAppt,
  onMoveTask,
  onCreateTask,
  selectedDate,
  onSelectDate,
  currentView,
  onViewChange,
}) {
  const swipeHandlers = useSwipe({
    onSwipeLeft: () => onViewChange(Math.min(currentView + 1, 1)),
    onSwipeRight: () => onViewChange(Math.max(currentView - 1, 0)),
  });

  return (
    <div
      style={{ flex: 1, overflow: 'hidden', position: 'relative' }}
      {...swipeHandlers}
    >
      <div
        style={{
          display: 'flex',
          width: '200%',
          height: '100%',
          transform: `translateX(${currentView === 0 ? '0%' : '-50%'})`,
          transition: 'transform 0.3s ease',
        }}
      >
        {/* View 0: Mobile Kanban */}
        <div style={{ width: '50%', height: '100%', overflow: 'hidden', position: 'relative' }}>
          <MobileKanbanBoard
            tasks={tasks}
            onTaskClick={onTaskClick}
            onMoveTask={onMoveTask}
            onCreateTask={onCreateTask}
          />
        </div>

        {/* View 1: Calendar */}
        <div style={{ width: '50%', height: '100%', overflow: 'hidden' }}>
          <CalendarPanel
            tasks={tasks}
            appointments={appointments}
            selectedDate={selectedDate}
            onSelectDate={onSelectDate}
            onTaskClick={onTaskClick}
            onApptClick={onApptClick}
            onCreateAppt={onCreateAppt}
          />
        </div>
      </div>
    </div>
  );
}
