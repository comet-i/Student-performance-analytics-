import { z } from 'zod';

const uuid = z.string().uuid();
const date = z.string().date(); // YYYY-MM-DD
const pct = z.number().min(0).max(100);
const patch = (obj) => obj.partial().refine((o) => Object.keys(o).length > 0, 'Provide at least one field');

const priority = z.enum(['low', 'medium', 'high', 'critical']);
const category = z.enum(['study_tip', 'attendance', 'subject_focus', 'time_management', 'general']);

export const idParam = z.object({ id: uuid });

// ---------- Profile & onboarding ----------
const profile = z.object({
  full_name: z.string().trim().min(1).max(100),
  course: z.string().trim().max(100),
  institution: z.string().trim().max(150),
  current_semester: z.number().int().min(1).max(12),
  board_10th_pct: pct,
  board_12th_pct: pct,
  previous_sem_gpa: z.number().min(0).max(10),
  weekly_study_hours: z.number().gt(0).max(100),
});
export const profilePatch = patch(profile);

const enrollment = z.object({
  subject_code: z.string().trim().min(1).max(20),
  subject_name: z.string().trim().min(1).max(100),
  term_label: z.string().trim().min(1).max(40).optional(),
  credits: z.number().int().min(1).max(6).optional(),
  min_attendance: pct.optional(),
  target_score: pct.optional(),
  final_score: pct.nullable().optional(), // actual result once known
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
});
export const enrollmentCreate = enrollment;
export const enrollmentPatch = patch(enrollment);

const boardMarkFields = z.object({
  level: z.enum(['10th', '12th']),
  board_name: z.string().trim().max(60).optional(),
  subject_name: z.string().trim().min(1).max(60),
  marks_obtained: z.number().min(0),
  max_marks: z.number().gt(0).default(100),
  year_of_passing: z.number().int().min(1990).max(2100).optional(),
});
export const boardMark = boardMarkFields.refine((m) => m.marks_obtained <= m.max_marks, {
  message: 'marks_obtained cannot exceed max_marks',
  path: ['marks_obtained'],
});
export const boardMarkPatch = patch(boardMarkFields);

export const onboarding = z.object({
  profile: profile.partial(),
  board_marks: z.array(boardMark).max(30).default([]),
  subjects: z.array(enrollment).min(1).max(15),
});

// ---------- Marks, attendance, tasks ----------
const assessment = z.object({
  enrollment_id: uuid,
  assessment_title: z.string().trim().min(1).max(100),
  assessment_type: z.enum(['quiz', 'assignment', 'midterm', 'final', 'lab', 'project', 'mock']).optional(),
  raw_marks: z.number().min(0),
  max_marks: z.number().gt(0).optional(),
  weightage: pct.optional(),
  recorded_at: date.optional(),
});
export const assessmentCreate = assessment.refine((a) => a.raw_marks <= (a.max_marks ?? 100), {
  message: 'raw_marks cannot exceed max_marks',
  path: ['raw_marks'],
});
export const assessmentPatch = patch(assessment.omit({ enrollment_id: true }));

export const attendanceUpsert = z.object({
  class_date: date,
  entries: z.array(z.object({ enrollment_id: uuid, status: z.enum(['present', 'absent', 'excused']) })).min(1).max(20),
});

const task = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().max(2000).optional(),
  enrollment_id: uuid.nullable().optional(),
  status: z.enum(['todo', 'in_progress', 'completed']).optional(),
  priority: priority.optional(),
  is_ai_suggested: z.boolean().optional(),
  allocated_hours: z.number().min(0).max(100).optional(),
  due_date: date.nullable().optional(),
});
export const taskCreate = task;
export const taskPatch = patch(task);

const syllabusTopic = z.object({
  enrollment_id: uuid,
  unit: z.string().trim().max(60).optional(),
  title: z.string().trim().min(1).max(200),
  position: z.number().int().min(0).optional(),
  is_completed: z.boolean().optional(),
});
export const syllabusCreate = syllabusTopic;
export const syllabusPatch = patch(syllabusTopic.omit({ enrollment_id: true }));

const studySession = z.object({
  enrollment_id: uuid.nullable().optional(),
  task_id: uuid.nullable().optional(),
  started_at: z.string().datetime({ offset: true }),
  duration_minutes: z.number().int().min(1).max(1440),
  focus_rating: z.number().int().min(1).max(5).optional(),
});
export const studySessionCreate = studySession;
export const studySessionPatch = patch(studySession);

// Personal achievements only: catalog badges are awarded by the server, never by the client.
const customAchievement = z.object({
  custom_title: z.string().trim().min(1).max(120),
  custom_details: z.string().max(1000).optional(),
  proof_url: z.string().url().optional(),
});
export const achievementCreate = customAchievement;
export const achievementPatch = patch(customAchievement);

// ---------- Analytics ----------
export const predictBody = z.object({ enrollment_id: uuid.optional() }); // omitted = all subjects

export const simulateBody = z.object({
  enrollment_id: uuid,
  scenario: z
    .object({
      expected_score: pct.optional(),
      extra_study_hours: z.number().min(0).max(40).optional(),
      attendance_pct: pct.optional(),
    })
    .refine((s) => Object.keys(s).length > 0, 'Provide at least one scenario value'),
});

export const recommendationPatch = z.object({ is_read: z.boolean() });

// ---------- Analytics engine responses (validated before anything is written to the DB) ----------
export const enginePredictions = z.object({
  model_version: z.string().min(1).max(60),
  predictions: z
    .array(
      z.object({
        enrollment_id: uuid.nullish(), // null = overall prediction
        predicted_score: pct,
        confidence: z.number().min(0).max(1).optional(),
        risk_level: z.enum(['low', 'medium', 'high']).optional(),
        recommended_weekly_hours: z.number().min(0).max(100).optional(),
        features: z.record(z.unknown()).optional(),
      }),
    )
    .max(50),
});

export const engineRecommendations = z.object({
  recommendations: z
    .array(
      z.object({
        enrollment_id: uuid.nullish(),
        category: category.default('general'),
        message: z.string().trim().min(1).max(500),
        priority: priority.default('medium'),
      }),
    )
    .max(50),
});
