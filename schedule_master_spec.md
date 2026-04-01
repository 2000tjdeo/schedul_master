# Schedule Master — 전체 기획 명세서
> Claude Code 작업용 · 이 문서의 내용을 하나도 누락하지 말 것

---

## 1. 프로젝트 개요

**앱 이름**: Schedule Master  
**목표**: 칸반 작업 관리 + 달력 + 자연어/음성 입력을 하나의 앱에서  
**기반**: 기존 Schedule Master 칸반 앱에 Calendar + NLP + Voice 레이어를 통합

### 핵심 철학
- 데이터는 하나(`Task` 오브젝트), 뷰만 여러 개 (칸반 / 달력 / 통합)
- 입력은 3가지 방식 모두 지원: 음성 → 칩 선택 → 텍스트 직접 입력
- 모바일: 터치 스와이프로 뷰 전환 / 데스크탑: 탭 버튼으로 뷰 전환

---

## 2. Task 데이터 모델 (기존 확장)

```typescript
interface Task {
  // 기존 필드 (Schedule Master 현재 보유)
  id: string
  title: string
  description?: string
  assignee?: string           // 담당자
  status: 'todo' | 'doing' | 'done'
  priority: '높음' | '중간' | '낮음'
  comments?: number

  // 신규 추가 필드 (Calendar 통합용)
  date: Date | null           // 날짜 (달력 표시용)
  time: string                // "14:00" 형식
  duration: number            // 분 단위 (기본값: 60)
  category: '업무' | '개인' | '미팅' | '기타'
  location?: string           // 장소 (선택)
  isRecurring?: boolean       // 반복 여부
  recurringType?: 'daily' | 'weekly' | 'monthly'
}
```

### 카테고리 컬러 매핑
```
업무  → bg:#EEEDFE / text:#3C3489 / dot:#AFA9EC
개인  → bg:#E1F5EE / text:#085041 / dot:#5DCAA5
미팅  → bg:#FAECE7 / text:#712B13 / dot:#F0997B
기타  → bg:#E6F1FB / text:#0C447C / dot:#85B7EB
```

### 우선순위 컬러 매핑
```
높음  → bg:#FCEBEB / text:#791F1F
중간  → bg:#FAEEDA / text:#633806
낮음  → bg:#EAF3DE / text:#27500A
```

---

## 3. 뷰 구조

### 3-1. 뷰 종류
| 뷰 이름 | 레이아웃 | 설명 |
|--------|---------|------|
| 통합 뷰 | 칸반(좌) + 달력+스케줄러(우) 나란히 | 기본 뷰 |
| 칸반 뷰 | 칸반 보드 전체 화면 | 기존 Schedule Master 화면 |
| 달력 뷰 | 달력 + 스케줄러 전체 화면 | |

### 3-2. 뷰 전환 방식 — ⚠️ 반드시 분기 처리

#### 데스크탑 (breakpoint: width > 768px)
- 상단 탭 버튼 3개: `통합 뷰` / `칸반` / `달력`
- 탭 클릭으로 전환
- 통합 뷰: `grid-template-columns: 1fr 1fr`

#### 모바일 (breakpoint: width ≤ 768px)
- 상단 탭 버튼 **숨김**
- **좌우 스와이프**로 뷰 전환
  - 스와이프 좌 → 다음 뷰 (칸반 → 달력 → 칸반 순환)
  - 스와이프 우 → 이전 뷰
- 하단 인디케이터 도트(●○○) 표시로 현재 뷰 위치 표시
- 뷰 순서: 칸반 → 달력(+스케줄러) → (순환)
- 통합 뷰(좌우 나란히)는 모바일에서 제공하지 않음
- 스와이프 구현: `touchstart` / `touchend` 이벤트, deltaX > 50px 임계값

```javascript
// 모바일 스와이프 구현 참고 코드
let touchStartX = 0
element.addEventListener('touchstart', e => { touchStartX = e.touches[0].clientX })
element.addEventListener('touchend', e => {
  const deltaX = e.changedTouches[0].clientX - touchStartX
  if (Math.abs(deltaX) > 50) {
    deltaX < 0 ? goNextView() : goPrevView()
  }
})
```

---

## 4. 레이아웃 상세

### 4-1. 전체 화면 구조
```
┌─────────────────────────────────────────┐
│  TopBar (앱명 / 뷰탭[데스크탑만] / +새작업)  │
├─────────────────────────────────────────┤
│  InputPanel (+ 새 작업 클릭시 펼침)          │
│  ┌───────────────────────────────────┐  │
│  │  🎤 음성 입력 영역                  │  │
│  │  ── 또는 직접 선택 ──               │  │
│  │  [제목칩] [카테고리칩] [우선순위칩]    │  │
│  │  [날짜칩]  [시간칩]   [소요시간칩]   │  │
│  │  ──────────────────────────────── │  │
│  │  미리보기 pills          [추가 버튼] │  │
│  └───────────────────────────────────┘  │
├─────────────────────────────────────────┤
│  MainArea                               │
│  [칸반 보드] | [달력 + 스케줄러]           │
│  (통합뷰: 좌우 나란히 / 단독뷰: 전체화면)   │
├─────────────────────────────────────────┤
│  BottomIndicator (모바일 전용 ● ○)       │
└─────────────────────────────────────────┘
```

### 4-2. 칸반 보드
- 컬럼: 할 일 / 진행 중 / 완료
- 각 컬럼 상단: 상태 도트 + 이름 + 카운트
- 카드 내용: 제목 / 날짜·시간 / 우선순위 뱃지 / 카테고리 뱃지 / 이동 버튼
- 카드 이동 버튼: `← 할 일` / `진행 중 →` / `완료 →` (현재 상태 기준으로 이전/다음만)
- 기존 담당자 아바타, 댓글 수 유지

### 4-3. 달력
- 월간 그리드 (7열)
- 상단: 년/월 표시 + 이전/다음 월 네비게이션 버튼
- 각 날짜 셀: 날짜 숫자 + 이벤트 dot (카테고리 색상, 최대 3개)
- 오늘 날짜: 파란 원형 배경
- 선택된 날짜: 파란 아웃라인 원형
- 타월 날짜: 흐린 색

### 4-4. 스케줄러 (달력 하단 또는 우측)
- 선택된 날짜의 일정 타임라인
- 시간축: 08:00 ~ 19:00 (1시간 단위)
- 각 슬롯: 시간 레이블 + 이벤트 블록
- 이벤트 블록: 카테고리 배경색, 시작-종료시간, 제목, 상태 아이콘(▶/✓)
- 빈 날짜: "일정 없음" 안내 메시지

---

## 5. 입력 시스템

### 5-1. 입력 3가지 방식 (모두 동시 지원)

#### A. 음성 입력 (최우선)
- 마이크 버튼: 원형, 44×44px
- 상태별 UI:
  - 대기: 마이크 아이콘, 회색 테두리
  - 녹음 중 (`listening`): 빨간 배경 + pulse 애니메이션 + 음파 웨이브 바 애니메이션
  - 처리 중 (`processing`): 파란 배경
  - 완료: 정상 복귀 + 인식 완료 메시지
- 웨이브 바: 6개 bar, 높이 wave 애니메이션
- 실제 구현: Web Speech API (`SpeechRecognition`, lang: `ko-KR`)
- 폴백: Web Speech API 미지원 브라우저는 데모 시뮬레이션 (타이핑 효과로 예문 자동 입력)
- 인식 완료 후: 파서 실행 → 칩 자동 선택(팝 애니메이션) → 미리보기 업데이트

#### B. 칩 선택 (마우스/터치)
- 섹션별 칩 그룹:
  - 제목 프리셋: 클라이언트 미팅, 디자인 검토, 현장 방문, 견적 제출, 납품 확인, 팀 회의
  - 카테고리: 업무 / 개인 / 미팅 / 기타
  - 우선순위: 높음 / 중간 / 낮음
  - 날짜: 오늘 ~ D+6 (7개, "오늘"/"내일"/날짜 표기)
  - 시간: 09:00 ~ 18:00 (1시간 단위, am/pm 표기)
  - 소요시간: 30분 / 1시간 / 1.5시간 / 2시간 / 3시간
- 선택된 칩: 카테고리별 색상으로 활성화, 나머지는 비활성 스타일 유지
- 음성으로 자동 선택된 칩은 `chipPop` 애니메이션(scale 0.7→1.08→1)

#### C. 텍스트 직접 입력
- 제목 인풋 필드 (타이핑)
- 타이핑 중 `oninput` 이벤트로 미리보기 실시간 업데이트

### 5-2. 자연어 파서 (온디바이스 · 서버 불필요)

파서는 정규식 기반, LLM 호출 없이 기기에서 직접 실행.

```
인식 대상:
- 우선순위: 높음/중간/낮음/high/급함/중요
- 카테고리: 업무/개인/미팅/회의/기타/work/personal/meeting
- 날짜: 오늘/내일/모레/monday~sunday/월요일~일요일
- 시간: 오후N시/오전N시/N:MM/Ntime
- 소요시간: 삼십분/한시간/두시간/세시간
- 나머지 텍스트 → 제목

파싱 예시:
"클라이언트 미팅 내일 오후 2시 업무 높음"
→ title: "클라이언트 미팅", date: +1일, time: "14:00", cat: "업무", pri: "높음"

"팀 회의 오늘 오전 열시 업무"
→ title: "팀 회의", date: 오늘, time: "10:00", cat: "업무"

"현장 방문 모레 오후 세시 미팅"
→ title: "현장 방문", date: +2일, time: "15:00", cat: "미팅"
```

### 5-3. 미리보기 바
- 입력창 하단 고정
- 선택된 항목을 pill 형태로 실시간 표시
  - 우선순위 pill (우선순위 색상)
  - 카테고리 pill (카테고리 색상)
  - 제목 pill (중립 배경)
  - 날짜 pill (amber 계열)
  - 시간 pill (blue 계열)
  - 소요시간 pill (green 계열)
- 추가 버튼: 제목 + 날짜 + 시간 세 가지가 채워질 때만 파란색 활성화

### 5-4. 추가 완료 동작
- `tasks` 배열에 신규 Task 추가
- 입력창 초기화 (상태 reset)
- 칸반 보드 리렌더
- 달력 리렌더 (해당 날짜에 dot 추가)
- 스케줄러 리렌더 (해당 날짜 선택 시)
- 토스트 메시지: "작업이 추가되었습니다" (2.2초)

---

## 6. 컴포넌트 분리 (React 기준)

```
src/
├── store/
│   └── taskStore.ts          # Zustand or Context (tasks 전역 상태)
├── types/
│   └── Task.ts               # Task 인터페이스
├── utils/
│   ├── nlParser.ts           # 자연어 파서 (정규식 기반)
│   ├── dateUtils.ts          # sameDay, formatDate 등
│   └── colorMap.ts           # 카테고리/우선순위 컬러 상수
├── hooks/
│   ├── useSwipe.ts           # 터치 스와이프 훅 (모바일용)
│   ├── useSpeech.ts          # Web Speech API 훅
│   └── useViewMode.ts        # 뷰 상태 관리 (desktop/mobile 분기)
├── components/
│   ├── TopBar/
│   │   └── TopBar.tsx        # 앱 이름 + 뷰 탭(데스크탑) + 새 작업 버튼
│   ├── InputPanel/
│   │   ├── InputPanel.tsx    # 전체 입력 패널 컨테이너
│   │   ├── VoiceInput.tsx    # 마이크 버튼 + 웨이브 + 상태 표시
│   │   ├── ChipGroup.tsx     # 칩 선택 섹션 (제목/카테고리/우선순위/날짜/시간/소요시간)
│   │   └── PreviewBar.tsx    # 미리보기 pills + 추가 버튼
│   ├── Kanban/
│   │   ├── KanbanBoard.tsx   # 칸반 보드 컨테이너 (3열)
│   │   ├── KanbanColumn.tsx  # 단일 컬럼 (할일/진행중/완료)
│   │   └── KanbanCard.tsx    # 작업 카드
│   ├── Calendar/
│   │   ├── CalendarPanel.tsx # 달력 + 스케줄러 컨테이너
│   │   ├── CalendarGrid.tsx  # 월간 그리드
│   │   └── Scheduler.tsx     # 일간 타임라인
│   ├── Layout/
│   │   ├── SplitView.tsx     # 데스크탑 통합 뷰 (좌우 나란히)
│   │   ├── SwipeView.tsx     # 모바일 스와이프 뷰
│   │   └── BottomIndicator.tsx # 모바일 하단 도트 인디케이터
│   └── common/
│       └── Toast.tsx         # 토스트 알림
└── App.tsx                   # 최상위, 반응형 분기 처리
```

---

## 7. 반응형 분기 로직

```typescript
// useViewMode.ts
const MOBILE_BREAKPOINT = 768

export function useViewMode() {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= MOBILE_BREAKPOINT)
  const [currentView, setCurrentView] = useState<'kanban' | 'calendar' | 'split'>('split')
  const [mobileViewIndex, setMobileViewIndex] = useState(0) // 0: 칸반, 1: 달력

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth <= MOBILE_BREAKPOINT)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  // 데스크탑: currentView로 제어
  // 모바일: mobileViewIndex로 제어 (스와이프)
  const goNextMobileView = () => setMobileViewIndex(i => (i + 1) % 2)
  const goPrevMobileView = () => setMobileViewIndex(i => (i - 1 + 2) % 2)

  return { isMobile, currentView, setCurrentView, mobileViewIndex, goNextMobileView, goPrevMobileView }
}
```

```typescript
// useSwipe.ts
export function useSwipe(onSwipeLeft: () => void, onSwipeRight: () => void) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    let startX = 0
    const onTouchStart = (e: TouchEvent) => { startX = e.touches[0].clientX }
    const onTouchEnd = (e: TouchEvent) => {
      const deltaX = e.changedTouches[0].clientX - startX
      if (Math.abs(deltaX) > 50) {
        deltaX < 0 ? onSwipeLeft() : onSwipeRight()
      }
    }
    el.addEventListener('touchstart', onTouchStart)
    el.addEventListener('touchend', onTouchEnd)
    return () => {
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchend', onTouchEnd)
    }
  }, [onSwipeLeft, onSwipeRight])

  return ref
}
```

---

## 8. 음성 입력 구현

```typescript
// useSpeech.ts
export function useSpeech(onResult: (text: string) => void) {
  const [status, setStatus] = useState<'idle' | 'listening' | 'processing'>('idle')
  const recognitionRef = useRef<SpeechRecognition | null>(null)

  const start = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      // 데모 시뮬레이션 실행
      runDemoSimulation(onResult, setStatus)
      return
    }
    const r = new SpeechRecognition()
    r.lang = 'ko-KR'
    r.continuous = false
    r.interimResults = true
    r.onstart = () => setStatus('listening')
    r.onresult = (e) => {
      const final = Array.from(e.results)
        .filter(r => r.isFinal)
        .map(r => r[0].transcript)
        .join('')
      if (final) { setStatus('processing'); setTimeout(() => { onResult(final); setStatus('idle') }, 500) }
    }
    r.onerror = () => setStatus('idle')
    r.onend = () => { if (status === 'listening') setStatus('idle') }
    r.start()
    recognitionRef.current = r
  }

  const stop = () => { recognitionRef.current?.stop(); setStatus('idle') }

  return { status, start, stop }
}

// 데모 예문 (Web Speech 미지원 환경용)
const DEMO_PHRASES = [
  '클라이언트 미팅 내일 오후 두시 업무',
  '팀 회의 오늘 오전 열시 업무 높음',
  '현장 방문 모레 오후 세시 미팅',
  '납품 확인 내일 오후 네시 업무 중간',
  '점심 약속 오늘 열두시 개인 낮음',
]
```

---

## 9. 애니메이션 명세

| 요소 | 애니메이션 | 설명 |
|------|-----------|------|
| 마이크 버튼 (listening) | `pulse` | 빨간 배경, 0~8px 그림자 반복 (1s) |
| 웨이브 바 | `wave` | height 4px→14px, 6개 bar 순차 딜레이 (0.8s) |
| 칩 자동 선택 | `chipPop` | scale 0.7→1.08→1 (0.25s ease-out) |
| 토스트 | `opacity + translateY` | 아래서 올라오며 페이드인 (0.2s) |
| 모바일 뷰 전환 | `translateX` | 슬라이드 (0.3s ease) |

---

## 10. 토스트 알림

- 위치: 화면 하단 중앙
- 스타일: 흰 배경, 0.5px 테두리, border-radius-md
- 지속시간: 2.2초 후 자동 사라짐
- 트리거: 작업 추가 완료 / 음성 인식 완료 / 오류 발생

---

## 11. 기존 Schedule Master 유지 항목

다음 기능은 기존 구현 그대로 유지:
- 담당자 아바타 (김민준, 이서연, 테스트 유저, 홍길동)
- 우선순위 필터 (좌측 사이드바)
- 담당자 필터 (좌측 사이드바)
- 개요 카운트 (전체/할일/진행중/완료)
- 작업 검색 (상단 검색창)
- `+ 작업 추가` 버튼 (각 컬럼 하단)
- 댓글 수 표시

---

## 12. 기술 스택 권장

```
프레임워크:   React (기존 Schedule Master 기반)
상태관리:     Zustand (전역 tasks 상태)
스타일:       Tailwind CSS 또는 CSS Modules
음성인식:     Web Speech API (브라우저 내장, 외부 SDK 불필요)
빌드:         Vite
타입:         TypeScript
```

---

## 13. 구현 우선순위

```
Phase 1 (핵심 기능)
  ① Task 모델에 date / time / duration / category 필드 추가
  ② 칩 선택 InputPanel 컴포넌트
  ③ CalendarGrid + Scheduler 컴포넌트
  ④ 통합 뷰 레이아웃 (데스크탑)

Phase 2 (입력 고도화)
  ⑤ 자연어 파서 (nlParser.ts)
  ⑥ 음성 입력 (useSpeech.ts + VoiceInput 컴포넌트)
  ⑦ 칩 자동 선택 애니메이션

Phase 3 (모바일)
  ⑧ 반응형 분기 (useViewMode.ts)
  ⑨ 터치 스와이프 (useSwipe.ts)
  ⑩ 하단 도트 인디케이터
  ⑪ 모바일 뷰 슬라이드 애니메이션
```

---

## 14. 검증 체크리스트

Claude Code 작업 완료 후 반드시 확인:

- [ ] 데스크탑: 탭 클릭으로 칸반 / 달력 / 통합 뷰 전환됨
- [ ] 모바일(768px 이하): 탭 버튼 숨겨지고 스와이프로 전환됨
- [ ] 모바일: 하단 도트 인디케이터가 현재 뷰 표시
- [ ] 음성 입력: Chrome에서 마이크 권한 허용 후 ko-KR 인식
- [ ] 음성 입력: 미지원 환경에서 데모 시뮬레이션 실행
- [ ] 파서: "클라이언트 미팅 내일 오후 2시 업무" 입력 시 칩 자동 선택
- [ ] 추가 버튼: 제목+날짜+시간 미입력 시 비활성(회색) 유지
- [ ] 추가 완료: 칸반 + 달력 dot + 스케줄러 동시 업데이트
- [ ] 기존 담당자/우선순위 필터 정상 동작
- [ ] 카드 이동 버튼으로 상태 변경 시 칸반 컬럼 즉시 반영
- [ ] 달력 날짜 탭 시 스케줄러 해당일 표시

---

## 15. 캘린더 UI 디자인 시스템 (레퍼런스 이미지 기반)

> 두 장의 레퍼런스 이미지를 분석해 도출한 디자인 원칙. 반드시 준수할 것.

### 15-1. 디자인 철학 — "에디토리얼 미니멀"

두 이미지 공통 원칙:
- **타이포그래피가 UI다** — 색상 블록이나 카드 대신 서체 크기·굵기·색상만으로 계층 표현
- **날짜 숫자는 콘텐츠다** — 날짜를 작은 숫자가 아닌 큰 헤드라인 수준으로 표시
- **액센트 컬러는 단 하나** — 오늘/현재/활성만 강조색, 나머지는 흑백 계열
- **선은 최소화** — 셀 경계선 없이 여백과 타이포로만 구분 (또는 상단 선 하나만)
- **이벤트는 텍스트로** — 컬러 블록 없이 볼드 제목 + 일반 시간 텍스트

### 15-2. 뷰 전환 탭 (달력 뷰 전용)

상단 우측에 3개 탭:
```
년(Year)  |  월(Month)  |  주(Week)  |  일(Day)
```
- 현재 활성 탭: 하단 언더라인 또는 볼드 강조
- 비활성 탭: 일반 텍스트 색상
- 한국어 레이블: 년 / 월 / 주 / 일

### 15-3. 월간 뷰 (이미지 2 기반)

```
레이아웃:
┌──────────────────────────────────────────┐
│  < 2026년 3월 >              년  월  주  일 │
├──────────────────────────────────────────┤
│  일    월    화    수    목    금    토    │
├──────────────────────────────────────────┤
│  01    02    03    04    05    06    07   │
│  이벤트텍스트                              │
│  이벤트텍스트                              │
├──────────────────────────────────────────┤
│  08    09    10    11 ...                 │
│  (주말: 회색 날짜, 평일: 검정)               │
└──────────────────────────────────────────┘
```

날짜 숫자 스타일:
- 폰트 사이즈: `2.5rem ~ 3rem` (크게)
- 폰트 웨이트: `700` (Bold)
- 평일: `color: #111` (거의 검정)
- 주말(토/일): `color: #aaa` (회색 강등)
- 오늘: `color: #E63325` (레드 액센트)
- 다른 달 날짜: `color: #ccc` (매우 연하게)

이벤트 텍스트 스타일:
- 폰트 사이즈: `0.72rem`
- 색상: `#222` (검정에 가까운)
- 최대 3개 표시, 초과 시 `+ N개 더` 표시
- 지난 이벤트: `text-decoration: line-through` (취소선)
- 시간 표시: 이벤트명 아래 별도 줄 `color: #888`
- 이벤트에 카테고리 컬러 **좌측 2px 보더** 적용 (텍스트 배경 없이)

오늘 날짜 셀:
- 셀 전체에 연한 배경 `#f5f5f5` 또는 흰 박스 (다른 셀과 미묘하게 구분)
- 날짜 숫자만 액센트 컬러 (빨강 또는 브랜드 컬러)

### 15-4. 주간 뷰 (이미지 1 기반)

```
레이아웃:
┌──────────────────────────────────────────────────┐
│  Jan' 2026  < • >           [달력아이콘] [Add event] │
│  여기 모든 예정된 이벤트를 확인하세요.                 │
├───────┬───────┬───────┬───────┬───────┬───────┬──────┤
│  MON  │  TUE  │  WED  │  THU  │  FRI  │  SAT  │  SUN │
│  ─────│  ─────│  ─────│  ─────│  ─────│  ─────│  ────│
│  30   │  31   │  01   │  02   │  03   │  04   │  05  │
│       │       │ New   │ Proj  │Review │ Break │ Lunch│
│       │       │ Year  │ over  │ work  │ fast  │      │
│       │       │All day│1:00pm │11:00am│ 8:00am│2:00pm│
└───────┴───────┴───────┴───────┴───────┴───────┴──────┘
```

헤더 영역:
- 월/년 표시: `font-size: 2rem, font-weight: 900` (매우 크고 굵게)
- 이전/다음 주 네비게이션: `< • >` (가운데 도트 포함)
- 우상단 "Add event" / "새 일정": 검정 배경 흰 글씨 버튼
- 요일 헤더: 대문자 또는 약자 (MON/TUE 또는 월/화)

날짜+이벤트 셀:
- 날짜 숫자 위에 **얇은 가로선 하나** (구분선 역할)
- 날짜 숫자: `font-size: 2rem, font-weight: 700`
- 이벤트 제목: `font-weight: 600, font-size: 0.8rem`
- 이벤트 시간: 제목 바로 아래, `font-size: 0.72rem, color: #666`
- "Begins in N min" / "N분 후 시작" : 오늘+다음 이벤트에 표시
- "And N more" / "+ N개" : 오버플로우 처리, 클릭 시 전체 표시

오늘 컬럼 강조:
- 요일 헤더: 액센트 컬러 (빨강)
- 날짜 숫자: 액센트 컬러
- 컬럼 배경: 아주 연한 틴트 `rgba(230,51,37,0.04)`
- 상단 구분선: 액센트 컬러

### 15-5. 사이드바 (좌측, 선택적)

이미지 1의 좌측 아이콘 사이드바 참고:
- 너비: `48px` (아이콘만, 라벨 없음)
- 아이콘: 시계, 달력, 할일목록, 문서 (SVG 라인 아이콘)
- 하단: 유저 아바타 + 알림 뱃지
- 색상: 흑백 only, 호버 시 약간 진해짐
- 우하단: 주황 플로팅 액션 버튼 (FAB) — 빠른 이벤트 추가

### 15-6. 액센트 컬러 시스템

```
브랜드 액센트: #E63325 (빨강-주황 계열, 이미지에서 추출)
사용처:
  - 오늘 날짜 숫자
  - 오늘 컬럼 요일 헤더
  - 월 네비게이션 꺽쇠 < >
  - 플로팅 버튼 배경
  - 뷰 전환 탭 활성 상태
  - "Begins in N min" 등 임박 이벤트 표시

중립 팔레트:
  - 텍스트: #111 (거의 검정)
  - 부제목: #555
  - 힌트: #888
  - 비활성: #bbb
  - 경계선: #e0e0e0
  - 배경: #f8f8f8 (전체) / #fff (카드/패널)
  - 주말 날짜: #aaa
  - 다른 달: #ddd
```

### 15-7. 타이포그래피 스케일

```
월/년 헤더:     font-size: 2rem,   font-weight: 900
날짜 숫자:      font-size: 2.2rem, font-weight: 700
요일 헤더:      font-size: 0.7rem, font-weight: 600, letter-spacing: 0.08em
이벤트 제목:    font-size: 0.78rem, font-weight: 600
이벤트 시간:    font-size: 0.7rem,  font-weight: 400, color: #666
오버플로우:     font-size: 0.7rem,  color: accent
```

폰트 패밀리 권장:
- 한국어: `'Pretendard', 'Apple SD Gothic Neo', sans-serif`
- 영문 혼용: `'Inter', 'Helvetica Neue', sans-serif`

### 15-8. 셀 구조 (월간 뷰)

```css
.cal-cell {
  min-height: 110px;
  padding: 8px 6px;
  border-top: 1px solid #e8e8e8;   /* 상단 선만 */
  border-right: none;               /* 좌우 선 없음 */
  border-left: none;
  vertical-align: top;
}

.cal-cell.today {
  background: #fafafa;
}

.cal-date-num {
  font-size: 2rem;
  font-weight: 700;
  line-height: 1;
  margin-bottom: 6px;
}

.cal-event-item {
  display: flex;
  align-items: flex-start;
  gap: 4px;
  margin-bottom: 3px;
  border-left: 2px solid [category-color];  /* 카테고리 컬러 좌측 보더 */
  padding-left: 4px;
}
```

### 15-9. 주간 뷰 네비게이션

```
< • > 패턴:
- 왼쪽 화살표 (<): 이전 주/월
- 가운데 도트 (•): 오늘로 돌아가기
- 오른쪽 화살표 (>): 다음 주/월
```

### 15-10. 캘린더 뷰 전환 탭 위치

```
[달력 패널 내부 상단]
┌─────────────────────────────────────┐
│  2026년 3월      [년] [월] [주] [일]  │
│  < • >                              │
└─────────────────────────────────────┘
```

탭 스타일:
- 비활성: 일반 텍스트
- 활성: font-weight 600 + 하단 2px 언더라인 (액센트 컬러)
- 배경 변경 없이 타이포로만 구분

---

## 16. 캘린더 뷰 업데이트 — CalendarGrid.tsx 수정 사항

기존 CalendarGrid 대비 변경:

### 기존 방식 (이전 기획)
- 날짜 셀: 작은 숫자 + 컬러 dot
- 오늘: 파란 원형 배경
- 이벤트: 색상 pill

### 신규 방식 (레퍼런스 반영)
- 날짜 숫자: 크게, bold, 주말은 회색
- 오늘 날짜: 액센트 컬러 텍스트만 (원형 배경 제거)
- 이벤트: 좌측 2px 컬러 보더 + 볼드 텍스트 + 시간 서브텍스트
- 취소선: 지난 이벤트에 적용
- 셀 구분: 하단 border 제거, 상단 border만 유지
- 주간 뷰 추가: 7열 × 2행 레이아웃 (2주 표시)
- 뷰 전환 탭 추가: 년/월/주/일 (CalendarPanel 내부)

---

## 17. 업데이트된 검증 체크리스트 (15~16 섹션 반영)

- [ ] 달력 날짜 숫자가 크고 굵게 표시됨 (2rem 이상)
- [ ] 주말(토/일) 날짜가 회색으로 표시됨
- [ ] 오늘 날짜가 액센트 컬러(빨강 계열)로 강조됨
- [ ] 이벤트에 좌측 2px 카테고리 컬러 보더 표시됨
- [ ] 지난 이벤트에 취소선 적용됨
- [ ] 셀에 좌우 경계선 없음 (상단 선만)
- [ ] 뷰 전환 탭 (년/월/주/일) 동작
- [ ] 주간 뷰에서 오늘 컬럼 배경 미묘하게 강조됨
- [ ] 주간 뷰 < • > 네비게이션 동작 (• = 오늘로 이동)
- [ ] 이벤트 3개 초과 시 "+ N개" 오버플로우 처리
