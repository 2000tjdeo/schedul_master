# Schedule Master — Agent Rules

## Project Overview
React + Vite 기반의 일정 관리 웹 앱. Supabase를 DB로, Zustand v4를 상태 관리로, Google Gemini API를 AI 음성 명령에 사용.

## Project Structure
```
schedule_master/
├── client/                  # React/Vite 프론트엔드
│   ├── src/
│   │   ├── App.jsx          # 메인 앱 컴포넌트 (로그인, 레이아웃)
│   │   ├── store/
│   │   │   └── taskStore.js # Zustand v4 전역 상태 (tasks, appointments, users)
│   │   ├── components/      # UI 컴포넌트
│   │   │   ├── Calendar/    # 캘린더 관련 뷰
│   │   │   ├── Kanban/      # 칸반 보드
│   │   │   ├── Layout/      # 레이아웃 컴포넌트
│   │   │   ├── InputPanel/  # 입력 패널
│   │   │   └── TopBar/      # 상단 바
│   │   ├── hooks/           # 커스텀 훅 (useGlobalVoice, useSpeech, useTTS 등)
│   │   ├── utils/           # 유틸리티 (gemini.js, nlParser.js, dateUtils.js 등)
│   │   ├── lib/
│   │   │   └── supabase.js  # Supabase 클라이언트
│   │   └── pages/
│   │       └── AdminPage.jsx
│   ├── package.json
│   └── vite.config.js       # 개발 서버 포트: 5174
└── AGENTS.md
```

## Tech Stack
- **Frontend**: React 18, Vite 5, Tailwind CSS 3
- **State**: Zustand **v4** (v5 사용 금지 — AI 도구 호환성 이슈)
- **Backend**: Supabase (PostgreSQL)
- **AI**: Google Gemini 2.0 Flash (`VITE_GEMINI_API_KEY`)
- **Language**: JavaScript (JSX), no TypeScript

## Dev Commands
```bash
# 프론트엔드 개발 서버 시작 (포트 5174)
cd client && npm run dev

# 빌드
cd client && npm run build
```

## Environment Variables (client/.env.local)
```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
VITE_GEMINI_API_KEY=...
```

## Supabase Tables
- `sm_tasks` — 업무/태스크 (id, title, status, priority, task_date, due_date, project_id, created_by 등)
- `sm_appointments` — 약속/일정 (id, title, date, start_time, end_time, color, project_id 등)
- `sm_users` — 사용자 (id, name, pin)
- `sm_comments` — 댓글 (id, task_id, user_id, content)

## Task Status Values
`todo` | `in_progress` | `done` | `archived`

## Code Conventions
- 컴포넌트: JSX, inline style 주로 사용 (Tailwind 일부 병행)
- Store 접근: 컴포넌트 외부에서는 `useTaskStore.getState().method()` 패턴 사용
- 날짜 형식: `YYYY-MM-DD` 문자열 (ISO 8601)
- 시간 형식: `HH:MM` 문자열

## Agent Guidelines
- 수정 시 기존 inline style 패턴 유지
- Zustand는 반드시 v4 유지 (v5로 업그레이드 금지)
- 새 컴포넌트는 `client/src/components/` 하위에 생성
- 환경변수는 `.env.local`에서만 관리 (`.env` 파일 생성 금지)
- Supabase 테이블명은 항상 `sm_` 접두사 유지
