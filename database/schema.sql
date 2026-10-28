-- Enable UUID generation extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. STUDENT PROFILES (1:1 relationship with Supabase auth.users)
-- Stores baseline historical marks & study availability for the ML pipeline
-- ============================================================================
CREATE TABLE public.student_profiles (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    board_10th_pct NUMERIC(5,2) DEFAULT 0.00 CHECK (board_10th_pct >= 0 AND board_10th_pct <= 100),
    board_12th_pct NUMERIC(5,2) DEFAULT 0.00 CHECK (board_12th_pct >= 0 AND board_12th_pct <= 100),
    previous_sem_gpa NUMERIC(4,2) DEFAULT 0.00 CHECK (previous_sem_gpa >= 0 AND previous_sem_gpa <= 10),
    weekly_study_hours NUMERIC(4,1) DEFAULT 20.0 CHECK (weekly_study_hours > 0 AND weekly_study_hours <= 100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 2. ENROLLMENTS (Subject-wise tracking per student)
-- ============================================================================
CREATE TABLE public.enrollments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.student_profiles(user_id) ON DELETE CASCADE,
    subject_code TEXT NOT NULL,
    subject_name TEXT NOT NULL,
    credits INT NOT NULL DEFAULT 3 CHECK (credits BETWEEN 1 AND 6),
    attendance_pct NUMERIC(5,2) NOT NULL DEFAULT 100.00 CHECK (attendance_pct >= 0 AND attendance_pct <= 100),
    target_score NUMERIC(5,2) NOT NULL DEFAULT 85.00 CHECK (target_score >= 0 AND target_score <= 100),
    predicted_score NUMERIC(5,2) CHECK (predicted_score >= 0 AND predicted_score <= 100),
    recommended_weekly_hours NUMERIC(4,1) DEFAULT 0.0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (user_id, subject_code)
);

-- ============================================================================
-- 3. ASSESSMENTS (Quiz, Assignment, and Midterm marks per subject)
-- ============================================================================
CREATE TABLE public.assessments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    enrollment_id UUID NOT NULL REFERENCES public.enrollments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    assessment_title TEXT NOT NULL, 
    assessment_type TEXT CHECK (assessment_type IN ('quiz', 'assignment', 'midterm', 'lab', 'mock')),
    raw_marks NUMERIC(6,2) NOT NULL CHECK (raw_marks >= 0),
    max_marks NUMERIC(6,2) NOT NULL DEFAULT 100.00 CHECK (max_marks > 0),
    score NUMERIC(5,2) GENERATED ALWAYS AS (ROUND((raw_marks / max_marks) * 100, 2)) STORED,
    recorded_at DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CHECK (raw_marks <= max_marks)
);

-- ============================================================================
-- 4. ATTENDANCE LOGS (Granular daily attendance tracker)
-- ============================================================================
CREATE TABLE public.attendance_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    enrollment_id UUID NOT NULL REFERENCES public.enrollments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    class_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'excused')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (enrollment_id, class_date)
);

-- ============================================================================
-- 5. STUDY TASKS & GOALS (Interactive To-Do List & Schedule items)
-- ============================================================================
CREATE TABLE public.study_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    enrollment_id UUID REFERENCES public.enrollments(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'completed')),
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    is_ai_suggested BOOLEAN DEFAULT FALSE,
    allocated_hours NUMERIC(4,1) DEFAULT 1.0 CHECK (allocated_hours >= 0),
    due_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Performance Indexes
CREATE INDEX idx_enrollments_user_id ON public.enrollments(user_id);
CREATE INDEX idx_assessments_enrollment_id ON public.assessments(enrollment_id);
CREATE INDEX idx_attendance_enrollment_id ON public.attendance_logs(enrollment_id);
CREATE INDEX idx_study_tasks_user_status ON public.study_tasks(user_id, status);

-- ============================================================================
-- AUTOMATED TRIGGERS
-- ============================================================================
CREATE OR REPLACE FUNCTION public.recalculate_subject_attendance()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    target_enrollment UUID;
    total_classes INT;
    attended_classes INT;
    new_pct NUMERIC(5,2);
BEGIN
    target_enrollment := COALESCE(NEW.enrollment_id, OLD.enrollment_id);

    SELECT 
        COUNT(*) FILTER (WHERE status IN ('present', 'absent')),
        COUNT(*) FILTER (WHERE status = 'present')
    INTO total_classes, attended_classes
    FROM public.attendance_logs
    WHERE enrollment_id = target_enrollment;

    IF total_classes = 0 THEN
        new_pct := 100.00;
    ELSE
        new_pct := ROUND((attended_classes::NUMERIC / total_classes::NUMERIC) * 100, 2);
    END IF;

    UPDATE public.enrollments
    SET attendance_pct = new_pct
    WHERE id = target_enrollment;

    RETURN NULL;
END;
$$;

CREATE TRIGGER trg_sync_attendance_pct
AFTER INSERT OR UPDATE OR DELETE ON public.attendance_logs
FOR EACH ROW EXECUTE FUNCTION public.recalculate_subject_attendance();

CREATE OR REPLACE FUNCTION public.handle_new_student()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.student_profiles (user_id, full_name)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
    )
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_student();

-- ============================================================================
-- ROW-LEVEL SECURITY (RLS) POLICIES
-- ============================================================================
ALTER TABLE public.student_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view own profile" ON public.student_profiles FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "Students can insert own profile" ON public.student_profiles FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "Students can update own profile" ON public.student_profiles FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Students manage own subject enrollments" ON public.enrollments FOR ALL TO authenticated USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Students can view own assessments" ON public.assessments FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "Students can insert assessments only into own enrollments" ON public.assessments FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id AND EXISTS (SELECT 1 FROM public.enrollments e WHERE e.id = enrollment_id AND e.user_id = (SELECT auth.uid())));
CREATE POLICY "Students can update own assessments" ON public.assessments FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "Students can delete own assessments" ON public.assessments FOR DELETE TO authenticated USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Students can view own attendance logs" ON public.attendance_logs FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "Students can log attendance only for own enrollments" ON public.attendance_logs FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id AND EXISTS (SELECT 1 FROM public.enrollments e WHERE e.id = enrollment_id AND e.user_id = (SELECT auth.uid())));
CREATE POLICY "Students can update or delete own attendance logs" ON public.attendance_logs FOR ALL TO authenticated USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Students manage own study tasks and goals" ON public.study_tasks FOR ALL TO authenticated USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
