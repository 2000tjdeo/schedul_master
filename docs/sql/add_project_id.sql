-- sm_tasks 테이블에 project_id 컬럼만 추가 (다른 테이블 건드리지 않음)
ALTER TABLE sm_tasks ADD COLUMN IF NOT EXISTS project_id TEXT;
CREATE INDEX IF NOT EXISTS idx_sm_tasks_project_id ON sm_tasks(project_id);

-- 확인
SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'sm_tasks';