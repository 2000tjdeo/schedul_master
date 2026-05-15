import React, { useState, useMemo } from 'react';
import { format, addDays, startOfWeek, differenceInDays, parseISO } from 'date-fns';
import { ACCENT } from '../../utils/colorMap.js';

const WEEK_W  = 20;   // px per week column
const ROW_H   = 60;   // px per project row
const LEFT_W  = 200;  // px for project name column
const TODAY   = new Date().toISOString().slice(0, 10);

// ── 프로젝트별 업무 바 계산 ──────────────────────────────────────────────────
function getBarPos(start, end, weeks) {
  if (!start || !weeks.length) return null;
  const chartStart = weeks[0];
  const startDate  = parseISO(start);
  const endDate    = parseISO(end || start);
  const leftDays   = differenceInDays(startDate, chartStart);
  const widthDays  = Math.max(differenceInDays(endDate, startDate) + 1, 1);
  return {
    left:  Math.round(leftDays  / 7 * WEEK_W),
    width: Math.max(Math.round(widthDays / 7 * WEEK_W), WEEK_W * 0.5),
  };
}

export default function TimelineCalendar({
  projectTasks        = [],
  projectAppointments = [],
  projects            = [],
  onTaskClick,
  onApptClick,
}) {
  const [expandedId, setExpandedId] = useState(null);

  // ── 프로젝트별 로드맵 데이터 ────────────────────────────────────────────────
  const roadmap = useMemo(() => {
    return projects.map(proj => {
      const tasks = projectTasks.filter(t => t.project_id === proj.id);
      const dates = tasks
        .flatMap(t => [t.task_date, t.due_date].filter(Boolean))
        .sort();
      const start    = dates[0] || null;
      const end      = dates[dates.length - 1] || null;
      const done     = tasks.filter(t => t.status === 'done').length;
      const inProg   = tasks.filter(t => t.status === 'in_progress').length;
      const total    = tasks.length;
      const progress = total ? Math.round(done / total * 100) : 0;
      const daysLeft = end ? differenceInDays(parseISO(end), new Date()) : null;
      const isOverdue = daysLeft !== null && daysLeft < 0 && progress < 100;
      return { proj, tasks, start, end, done, inProg, total, progress, daysLeft, isOverdue };
    });
  }, [projects, projectTasks]);

  // ── 주(week) 컬럼 & 월 헤더 계산 ────────────────────────────────────────────
  const { weeks, months, todayCol } = useMemo(() => {
    const allDates = roadmap.flatMap(r => [r.start, r.end].filter(Boolean)).sort();
    if (!allDates.length) return { weeks: [], months: [], todayCol: -1 };

    const minD       = parseISO(allDates[0]);
    const maxD       = parseISO(allDates[allDates.length - 1]);
    const chartStart = startOfWeek(addDays(minD, -14), { weekStartsOn: 1 });
    const chartEnd   = addDays(maxD, 28);

    const weeks = [];
    let cur = chartStart;
    while (cur <= chartEnd) { weeks.push(cur); cur = addDays(cur, 7); }

    // 월 그룹핑
    const months = [];
    weeks.forEach((week) => {
      const label = format(week, 'M월');
      if (!months.length || months[months.length - 1].label !== label) {
        months.push({ label, count: 1 });
      } else {
        months[months.length - 1].count++;
      }
    });

    // 오늘 컬럼
    const today    = new Date();
    const todayCol = weeks.findIndex((w, i) => {
      const next = weeks[i + 1];
      return w <= today && (!next || next > today);
    });

    return { weeks, months, todayCol };
  }, [roadmap]);

  const totalW = weeks.length * WEEK_W;

  const dDayLabel = (daysLeft, isOverdue) => {
    if (daysLeft === null) return null;
    if (daysLeft === 0)    return 'D-Day';
    if (daysLeft > 0)      return `D-${daysLeft}`;
    return `D+${Math.abs(daysLeft)}`;
  };

  const activeCount   = roadmap.filter(r => r.progress > 0 && r.progress < 100).length;
  const doneCount     = roadmap.filter(r => r.progress === 100).length;
  const overdueCount  = roadmap.filter(r => r.isOverdue).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

      {/* ── 헤더 ── */}
      <div style={{ padding: '0 0 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: '#1a1c1c', fontFamily: 'Manrope, sans-serif', margin: 0 }}>Timeline</h2>
          <p style={{ fontSize: 13, color: '#9ca3af', margin: '2px 0 0', fontWeight: 500 }}>프로젝트 로드맵 · 납기 · 진행률을 한눈에</p>
        </div>
      </div>

      {/* ── 요약 chips ── */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ padding: '6px 14px', borderRadius: 20, background: '#f1f5f9', fontSize: 12, fontWeight: 700, color: '#52525b' }}>
          전체 {roadmap.length}개
        </div>
        <div style={{ padding: '6px 14px', borderRadius: 20, background: '#f0fdf4', fontSize: 12, fontWeight: 700, color: '#10b981' }}>
          완료 {doneCount}개
        </div>
        <div style={{ padding: '6px 14px', borderRadius: 20, background: '#fff7ed', fontSize: 12, fontWeight: 700, color: '#f97316' }}>
          진행 중 {activeCount}개
        </div>
        {overdueCount > 0 && (
          <div style={{ padding: '6px 14px', borderRadius: 20, background: '#fee2e2', fontSize: 12, fontWeight: 700, color: '#ef4444' }}>
            지연 {overdueCount}개
          </div>
        )}
      </div>

      {/* ── Gantt 테이블 ── */}
      {weeks.length === 0 ? (
        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #f1f1f1', padding: '60px 0', textAlign: 'center', color: '#d1d5db', fontSize: 13 }}>
          날짜가 설정된 업무가 없습니다.<br />
          <span style={{ fontSize: 12 }}>업무에 시작일 또는 마감일을 설정하면 여기에 표시됩니다.</span>
        </div>
      ) : (
        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #f1f1f1', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <div style={{ minWidth: LEFT_W + totalW }}>

              {/* 월 헤더 */}
              <div style={{ display: 'flex', borderBottom: '1px solid #f1f1f1', background: '#fafafa' }}>
                <div style={{ width: LEFT_W, flexShrink: 0, padding: '10px 16px', borderRight: '1px solid #f1f1f1' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af' }}>프로젝트</span>
                </div>
                <div style={{ display: 'flex' }}>
                  {months.map((m, i) => (
                    <div key={i} style={{ width: m.count * WEEK_W, flexShrink: 0, padding: '10px 6px', borderRight: '1px solid #f1f1f1' }}>
                      <span style={{ fontSize: 11, fontWeight: 800, color: '#374151' }}>{m.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 주 헤더 */}
              <div style={{ display: 'flex', borderBottom: '2px solid #f1f1f1' }}>
                <div style={{ width: LEFT_W, flexShrink: 0, borderRight: '1px solid #f1f1f1' }} />
                <div style={{ display: 'flex' }}>
                  {weeks.map((week, i) => (
                    <div key={i} style={{
                      width: WEEK_W, flexShrink: 0, padding: '4px 0', textAlign: 'center',
                      borderRight: '1px solid #f5f5f5',
                      background: i === todayCol ? '#fff7ed' : 'transparent',
                    }}>
                      <span style={{ fontSize: 9, fontWeight: 700, color: i === todayCol ? '#f97316' : '#d1d5db' }}>
                        {format(week, 'd')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 프로젝트 행 */}
              {roadmap.map(({ proj, tasks, start, end, done, inProg, total, progress, daysLeft, isOverdue }) => {
                const bar      = getBarPos(start, end, weeks);
                const isExpand = expandedId === proj.id;
                const color    = proj.color || ACCENT;
                const ddLabel  = dDayLabel(daysLeft, isOverdue);

                return (
                  <React.Fragment key={proj.id}>
                    {/* 프로젝트 행 */}
                    <div
                      style={{ display: 'flex', borderBottom: '1px solid #f5f5f5', cursor: 'pointer', transition: 'background 0.15s' }}
                      onClick={() => setExpandedId(isExpand ? null : proj.id)}
                      onMouseEnter={e => e.currentTarget.style.background = '#fafafa'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      {/* 왼쪽: 프로젝트 정보 */}
                      <div style={{ width: LEFT_W, flexShrink: 0, padding: '12px 16px', borderRight: '1px solid #f1f1f1', display: 'flex', flexDirection: 'column', gap: 5, justifyContent: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
                          <span style={{ fontSize: 12, fontWeight: 700, color: '#1a1c1c', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {proj.name || proj.title}
                          </span>
                          <span className="material-symbols-outlined" style={{ fontSize: 13, color: '#d1d5db', marginLeft: 'auto', transform: isExpand ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }}>
                            expand_more
                          </span>
                        </div>

                        {/* 진행률 바 */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div style={{ flex: 1, height: 4, background: '#f1f5f9', borderRadius: 99, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${progress}%`, background: isOverdue ? '#ef4444' : color, borderRadius: 99, transition: 'width 0.4s' }} />
                          </div>
                          <span style={{ fontSize: 10, fontWeight: 700, color: isOverdue ? '#ef4444' : '#9ca3af', flexShrink: 0 }}>{progress}%</span>
                        </div>

                        {/* 상태 뱃지 */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 10, color: '#c4c4c4' }}>완료 {done}/{total}</span>
                          {inProg > 0 && <span style={{ fontSize: 10, color: '#f59e0b', fontWeight: 700 }}>진행 {inProg}</span>}
                          {ddLabel && (
                            <span style={{
                              fontSize: 10, fontWeight: 700, padding: '1px 5px', borderRadius: 4,
                              background: isOverdue ? '#fee2e2' : daysLeft <= 7 ? '#fff7ed' : '#f1f5f9',
                              color:      isOverdue ? '#ef4444' : daysLeft <= 7 ? '#f97316' : '#9ca3af',
                            }}>{ddLabel}</span>
                          )}
                        </div>
                      </div>

                      {/* 오른쪽: 바 영역 */}
                      <div style={{ flex: 1, position: 'relative', height: ROW_H, overflow: 'hidden' }}>
                        {/* 주 그리드 선 */}
                        {weeks.map((_, i) => (
                          <div key={i} style={{ position: 'absolute', left: i * WEEK_W, top: 0, bottom: 0, width: 1, background: i === todayCol ? '#fde68a' : '#f9fafb', zIndex: 0 }} />
                        ))}
                        {/* 오늘 라인 */}
                        {todayCol >= 0 && (
                          <div style={{ position: 'absolute', left: todayCol * WEEK_W + WEEK_W / 2, top: 0, bottom: 0, width: 2, background: '#f97316', opacity: 0.5, zIndex: 1 }} />
                        )}
                        {/* 프로젝트 바 */}
                        {bar ? (
                          <div style={{
                            position: 'absolute', left: bar.left, width: bar.width,
                            top: '50%', transform: 'translateY(-50%)',
                            height: 30, borderRadius: 7,
                            background: `${color}40`,
                            border: `1.5px solid ${color}88`,
                            overflow: 'hidden', zIndex: 2,
                          }}>
                            {/* 완료 비율 채우기 */}
                            <div style={{
                              position: 'absolute', left: 0, top: 0, bottom: 0,
                              width: `${progress}%`, background: `${color}cc`,
                              borderRadius: progress === 100 ? 7 : '7px 0 0 7px',
                              transition: 'width 0.4s',
                            }} />
                            <span style={{
                              position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)',
                              fontSize: 10, fontWeight: 700, color: progress > 30 ? '#fff' : color,
                              whiteSpace: 'nowrap', zIndex: 1,
                              textShadow: progress > 30 ? '0 1px 2px rgba(0,0,0,0.15)' : 'none',
                            }}>
                              {proj.name || proj.title}
                            </span>
                          </div>
                        ) : (
                          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', paddingLeft: 16 }}>
                            <span style={{ fontSize: 11, color: '#e5e7eb' }}>날짜 미설정</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 펼쳐진 업무 목록 */}
                    {isExpand && (
                      <div style={{ background: '#fafafa', borderBottom: '2px solid #f1f1f1' }}>
                        {tasks.filter(t => t.task_date || t.due_date).length === 0 ? (
                          <div style={{ padding: '10px 24px', fontSize: 12, color: '#c4c4c4' }}>날짜가 설정된 업무가 없습니다.</div>
                        ) : (
                          tasks
                            .filter(t => t.task_date || t.due_date)
                            .sort((a, b) => (a.task_date || a.due_date || '').localeCompare(b.task_date || b.due_date || ''))
                            .map(t => {
                              const tBar = getBarPos(t.task_date || t.due_date, t.due_date || t.task_date, weeks);
                              const statusColor = t.status === 'done' ? '#10b981' : t.status === 'in_progress' ? '#f59e0b' : '#d1d5db';
                              return (
                                <div
                                  key={t.id}
                                  style={{ display: 'flex', borderBottom: '1px solid #f1f1f1' }}
                                  onClick={e => { e.stopPropagation(); onTaskClick?.(t); }}
                                >
                                  <div style={{ width: LEFT_W, flexShrink: 0, padding: '7px 16px 7px 28px', borderRight: '1px solid #f1f1f1', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: statusColor, flexShrink: 0 }} />
                                    <span style={{ fontSize: 11, color: '#52525b', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</span>
                                  </div>
                                  <div style={{ flex: 1, position: 'relative', height: 34 }}>
                                    {weeks.map((_, i) => (
                                      <div key={i} style={{ position: 'absolute', left: i * WEEK_W, top: 0, bottom: 0, width: 1, background: '#f5f5f5' }} />
                                    ))}
                                    {tBar && (
                                      <div
                                        style={{
                                          position: 'absolute', left: tBar.left,
                                          width: Math.max(tBar.width, WEEK_W * 0.5),
                                          top: '50%', transform: 'translateY(-50%)',
                                          height: 14, borderRadius: 4,
                                          background: `${color}55`,
                                          cursor: 'pointer',
                                          zIndex: 1,
                                        }}
                                      />
                                    )}
                                  </div>
                                </div>
                              );
                            })
                        )}
                      </div>
                    )}
                  </React.Fragment>
                );
              })}

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
