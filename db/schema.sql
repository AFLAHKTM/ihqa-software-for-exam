-- India Holy Quran Award - Kerala Initial Screening & Live Assessment Platform
-- PostgreSQL Production Schema (Compatible with PostgreSQL 15+ and PGlite)

CREATE TABLE IF NOT EXISTS districts (
  id SERIAL PRIMARY KEY,
  code VARCHAR(10) UNIQUE NOT NULL,
  name_en VARCHAR(100) NOT NULL,
  name_ml VARCHAR(120) NOT NULL,
  name_ar VARCHAR(120) NOT NULL,
  zone VARCHAR(30) NOT NULL DEFAULT 'CENTRAL', -- NORTH, CENTRAL, SOUTH
  coordinator_name VARCHAR(120),
  coordinator_phone VARCHAR(20),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS institutions (
  id SERIAL PRIMARY KEY,
  code VARCHAR(30) UNIQUE NOT NULL,
  name VARCHAR(200) NOT NULL,
  district_id INTEGER NOT NULL REFERENCES districts(id) ON DELETE RESTRICT,
  place VARCHAR(120) NOT NULL,
  contact_person VARCHAR(120),
  contact_phone VARCHAR(20),
  is_verified BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  code VARCHAR(20) UNIQUE NOT NULL,
  name_en VARCHAR(120) NOT NULL,
  name_ml VARCHAR(150) NOT NULL,
  name_ar VARCHAR(150) NOT NULL,
  age_group VARCHAR(80),
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(80) UNIQUE NOT NULL, -- registration_number for students, email/code for judge/admin
  email VARCHAR(160),
  phone VARCHAR(24),
  full_name VARCHAR(160) NOT NULL,
  role VARCHAR(32) NOT NULL CHECK (role IN ('STUDENT', 'JUDGE', 'SUPER_ADMIN', 'EXAM_CONTROLLER', 'EVALUATOR', 'DISTRICT_COORDINATOR')),
  password_hash TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS exam_batches (
  id SERIAL PRIMARY KEY,
  batch_code VARCHAR(32) UNIQUE NOT NULL,
  title VARCHAR(160) NOT NULL,
  zone VARCHAR(30) NOT NULL DEFAULT 'ALL',
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  max_capacity INTEGER NOT NULL DEFAULT 15000,
  status VARCHAR(24) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('SCHEDULED', 'ACTIVE', 'COMPLETED', 'PAUSED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS students (
  id SERIAL PRIMARY KEY,
  user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  registration_number VARCHAR(40) UNIQUE NOT NULL,
  full_name VARCHAR(160) NOT NULL,
  institution_id INTEGER REFERENCES institutions(id) ON DELETE SET NULL,
  district_id INTEGER NOT NULL REFERENCES districts(id) ON DELETE RESTRICT,
  category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  batch_id INTEGER REFERENCES exam_batches(id) ON DELETE SET NULL,
  eligibility_status VARCHAR(24) NOT NULL DEFAULT 'ELIGIBLE' CHECK (eligibility_status IN ('ELIGIBLE', 'PENDING_VERIFICATION', 'INELIGIBLE')),
  guardian_name VARCHAR(160),
  guardian_consent_at TIMESTAMPTZ,
  preferred_language VARCHAR(8) NOT NULL DEFAULT 'en' CHECK (preferred_language IN ('en', 'ml', 'ar')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS otp_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  purpose VARCHAR(24) NOT NULL CHECK (purpose IN ('LOGIN', 'RESET_PASSWORD')),
  otp_hash TEXT NOT NULL,
  demo_code_hint VARCHAR(12), -- only populated in non-production demo mode when SMS gateway is unconfigured
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  attempts INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS exam_configs (
  id SERIAL PRIMARY KEY,
  slug VARCHAR(64) UNIQUE NOT NULL DEFAULT 'kerala-initial-screening',
  title VARCHAR(180) NOT NULL,
  subtitle VARCHAR(200) NOT NULL,
  welcome_message TEXT NOT NULL,
  eligibility_info TEXT NOT NULL,
  exam_date_label VARCHAR(120) NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 45,
  exam_status VARCHAR(24) NOT NULL DEFAULT 'OPEN' CHECK (exam_status IN ('UPCOMING', 'OPEN', 'PAUSED', 'CLOSED')),
  questions_per_exam INTEGER NOT NULL DEFAULT 10,
  negative_marking_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  negative_marks_per_wrong NUMERIC(5,2) NOT NULL DEFAULT 0.25,
  randomize_questions BOOLEAN NOT NULL DEFAULT TRUE,
  randomize_options BOOLEAN NOT NULL DEFAULT TRUE,
  passing_percentage NUMERIC(5,2) NOT NULL DEFAULT 50.00,
  results_published BOOLEAN NOT NULL DEFAULT FALSE,
  show_answers_to_students BOOLEAN NOT NULL DEFAULT FALSE,
  show_merit_rank BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS questions (
  id SERIAL PRIMARY KEY,
  category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL, -- NULL = shared across categories
  question_set VARCHAR(40) NOT NULL DEFAULT 'SET-A',
  question_type VARCHAR(24) NOT NULL DEFAULT 'MCQ' CHECK (question_type IN ('MCQ', 'IMAGE_MCQ')),
  question_text_en TEXT NOT NULL,
  question_text_ml TEXT,
  question_text_ar TEXT,
  image_url TEXT,
  options_json JSONB NOT NULL, -- [{ "id": "A", "text_en": "...", "text_ml": "...", "text_ar": "..." }, ...]
  correct_option_id VARCHAR(8) NOT NULL,
  marks NUMERIC(5,2) NOT NULL DEFAULT 2.00,
  negative_marks NUMERIC(5,2) NOT NULL DEFAULT 0.00,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  is_sample_demo BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS exam_attempts (
  id SERIAL PRIMARY KEY,
  student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  exam_config_id INTEGER NOT NULL REFERENCES exam_configs(id) ON DELETE CASCADE,
  question_set VARCHAR(40) NOT NULL DEFAULT 'SET-A',
  status VARCHAR(28) NOT NULL DEFAULT 'IN_PROGRESS' CHECK (status IN ('IN_PROGRESS', 'SUBMITTED', 'EVALUATION_PENDING', 'QUALIFIED', 'NOT_QUALIFIED')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  server_deadline_at TIMESTAMPTZ NOT NULL,
  submitted_at TIMESTAMPTZ,
  auto_submitted BOOLEAN NOT NULL DEFAULT FALSE,
  instructions_acknowledged_at TIMESTAMPTZ,
  question_order_json JSONB NOT NULL, -- [{ "questionId": 1, "optionOrder": ["B","A","D","C"] }]
  answers_json JSONB NOT NULL DEFAULT '{}'::jsonb, -- { "1": "A" }
  marked_for_review_json JSONB NOT NULL DEFAULT '[]'::jsonb, -- [1, 3]
  total_marks NUMERIC(7,2) NOT NULL DEFAULT 0,
  obtained_marks NUMERIC(7,2) NOT NULL DEFAULT 0,
  correct_count INTEGER NOT NULL DEFAULT 0,
  wrong_count INTEGER NOT NULL DEFAULT 0,
  unanswered_count INTEGER NOT NULL DEFAULT 0,
  last_saved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(student_id, exam_config_id)
);

CREATE TABLE IF NOT EXISTS judges (
  id SERIAL PRIMARY KEY,
  user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  judge_code VARCHAR(32) UNIQUE NOT NULL,
  full_name VARCHAR(160) NOT NULL,
  specialization VARCHAR(160),
  district_id INTEGER REFERENCES districts(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS live_assessments (
  id SERIAL PRIMARY KEY,
  student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  judge_id INTEGER NOT NULL REFERENCES judges(id) ON DELETE RESTRICT,
  room_name VARCHAR(100) UNIQUE NOT NULL,
  scheduled_start TIMESTAMPTZ NOT NULL,
  scheduled_end TIMESTAMPTZ NOT NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'SCHEDULED' CHECK (status IN ('SCHEDULED', 'WAITING', 'IN_CALL', 'COMPLETED', 'ABSENT', 'RESCHEDULED')),
  recording_disabled BOOLEAN NOT NULL DEFAULT TRUE,
  student_tech_checked_at TIMESTAMPTZ,
  admitted_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  tajweed_score NUMERIC(5,2),   -- max 30
  makharij_score NUMERIC(5,2),  -- max 25
  fluency_score NUMERIC(5,2),   -- max 20
  accuracy_score NUMERIC(5,2),  -- max 15
  voice_score NUMERIC(5,2),     -- max 10
  total_score NUMERIC(5,2),     -- max 100
  remarks TEXT,
  result_published BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS support_tickets (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  role VARCHAR(32),
  subject VARCHAR(160) NOT NULL,
  message TEXT NOT NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'IN_REVIEW', 'RESOLVED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  actor_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  actor_name VARCHAR(160),
  actor_role VARCHAR(32),
  action VARCHAR(80) NOT NULL,
  entity_type VARCHAR(60) NOT NULL,
  entity_id VARCHAR(60),
  details_json JSONB DEFAULT '{}'::jsonb,
  ip_address VARCHAR(64),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS webrtc_signals (
  id SERIAL PRIMARY KEY,
  room_name VARCHAR(100) NOT NULL,
  sender_role VARCHAR(16) NOT NULL,
  signal_type VARCHAR(24) NOT NULL,
  payload_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Capacity & query performance indexes for 40,000+ Kerala students
CREATE INDEX IF NOT EXISTS idx_webrtc_room_id ON webrtc_signals(room_name, id);
CREATE INDEX IF NOT EXISTS idx_students_district ON students(district_id);
CREATE INDEX IF NOT EXISTS idx_students_category ON students(category_id);
CREATE INDEX IF NOT EXISTS idx_students_batch ON students(batch_id);
CREATE INDEX IF NOT EXISTS idx_attempts_status ON exam_attempts(status);
CREATE INDEX IF NOT EXISTS idx_attempts_student ON exam_attempts(student_id);
CREATE INDEX IF NOT EXISTS idx_questions_cat_active ON questions(category_id, is_active);
CREATE INDEX IF NOT EXISTS idx_live_judge_status ON live_assessments(judge_id, status);
CREATE INDEX IF NOT EXISTS idx_live_student ON live_assessments(student_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at DESC);
