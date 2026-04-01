import React from 'react';

function getInitials(name = '') {
  return name.slice(0, 2).toUpperCase();
}

function getAvatarColor(name = '') {
  const colors = [
    'bg-indigo-500', 'bg-violet-500', 'bg-pink-500',
    'bg-rose-500', 'bg-orange-500', 'bg-amber-500',
    'bg-emerald-500', 'bg-teal-500', 'bg-sky-500',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

export default function Header({
  user,
  onLogout,
  onMenuToggle,
  searchQuery,
  onSearchChange,
  onCreateTask,
}) {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
      <div className="flex items-center h-16 px-4 lg:px-6 gap-4">
        {/* Hamburger (mobile) */}
        <button
          onClick={onMenuToggle}
          className="lg:hidden p-2 rounded-lg hover:bg-slate-100 transition-colors"
          aria-label="메뉴 열기"
        >
          <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        {/* Logo */}
        <div className="flex items-center gap-2.5 mr-2">
          <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center shadow shadow-indigo-200 flex-shrink-0">
            <svg className="w-4.5 h-4.5 text-white w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <span className="font-bold text-slate-800 text-lg hidden sm:block">Schedule Master</span>
        </div>

        {/* Search */}
        <div className="flex-1 max-w-md">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35m0 0A7 7 0 1116.65 16.65z" />
            </svg>
            <input
              type="text"
              placeholder="작업 검색..."
              value={searchQuery}
              onChange={e => onSearchChange(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm bg-slate-100 border border-transparent rounded-lg placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:bg-white transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 ml-auto">
          {/* Create task button */}
          <button onClick={onCreateTask} className="btn-primary hidden sm:flex">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            새 작업
          </button>

          {/* Mobile create button */}
          <button onClick={onCreateTask} className="sm:hidden p-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>

          {/* User avatar + logout */}
          <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
            <div className={`w-8 h-8 rounded-full ${getAvatarColor(user?.name)} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
              {getInitials(user?.name)}
            </div>
            <span className="text-sm font-medium text-slate-700 hidden md:block max-w-[100px] truncate">
              {user?.name}
            </span>
            <button
              onClick={onLogout}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
              title="로그아웃"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
