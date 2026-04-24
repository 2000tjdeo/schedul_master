-- =============================================
-- projects 기능 추가 SQL (Supabase SQL 에디터에서 실행)
-- =============================================

-- 1. projects 테이블 생성 (created_by를 bigint로 변경)
CREATE TABLE IF NOT EXISTS sm_projects (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title       text NOT NULL,
  description text,
  color       text DEFAULT '#6366f1',
  start_date  date,
  end_date    date,
  status     text DEFAULT 'active',
  created_by bigint REFERENCES sm_users(id) ON DELETE SET NULL,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

-- 2. tasks 테이블에 project_id 추가
ALTER TABLE sm_tasks
  ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES sm_projects(id) ON DELETE SET NULL;

-- 3. parent_task_id 추가 (하위 태스크 - tasks.id가 bigint이므로)
ALTER TABLE sm_tasks
  ADD COLUMN IF NOT EXISTS parent_task_id bigint REFERENCES sm_tasks(id) ON DELETE CASCADE;

-- 4. sort_order 추가 (정렬 순서)
ALTER TABLE sm_tasks
  ADD COLUMN IF NOT EXISTS sort_order integer DEFAULT 0;

-- 5. appointments 테이블에 project_id 추가
ALTER TABLE sm_appointments
  ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES sm_projects(id) ON DELETE SET NULL;

-- =============================================
-- RLS (Row Level Security) 설정
-- =============================================

-- projects 테이블 RLS 활성화
ALTER TABLE sm_projects ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 projects 조회 가능
CREATE POLICY "Allow all users to read projects" ON sm_projects
  FOR SELECT USING (true);

-- 생성자만 수정 가능
CREATE POLICY "Allow owner to modify projects" ON sm_projects
  FOR ALL USING (auth.uid() = created_by);

-- =============================================
-- 인덱스 추가 (조회 성능)
-- =============================================

CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON sm_tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_parent_task_id ON sm_tasks(parent_task_id);
CREATE INDEX IF NOT EXISTS idx_appointments_project_id ON sm_appointments(project_id);

-- =============================================
-- projects 더미 데이터 (테스트용 - 필요시 주석 해제)
-- =============================================

-- INSERT INTO sm_projects (title, description, color, start_date, end_date, created_by)
-- VALUES
--   ('웹사이트 리뉴얼', '새로운 디자인 웹사이트 구축 프로젝트', '#6366f1', '2026-01-01', '2026-06-30'),
--   ('모바일 앱 개발', 'iOS/Android 앱 개발', '#10b981', '2026-03-01', '2026-12-31'),
--   ('Q1 마케팅 캠페인', '1분기 마케팅 활동', '#f59e0b', '2026-01-01', '2026-03-31');