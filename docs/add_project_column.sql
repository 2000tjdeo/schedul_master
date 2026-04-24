-- =====================================================
-- 1. 현재 테이블 목록 확인
-- =====================================================
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public';

-- =====================================================
-- 2. tasks 테이블에 project_id 컬럼 추가 (tasks 테이블이 있을 때)
-- =====================================================
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS project_id TEXT;

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);

-- 확인
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'tasks' AND column_name = 'project_id';

-- =====================================================
-- 3. sm_tasks 테이블이 있으면 project_id 추가 (alternative)
-- =====================================================
-- ALTER TABLE sm_tasks 
-- ADD COLUMN IF NOT EXISTS project_id TEXT;
