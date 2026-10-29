const round2 = (n) => Math.round(n * 100) / 100;

// Mean of assessment scores (%), weighted by `weightage` when any is set (rows without it count 0).
export const subjectAverage = (rows) => {
  const weighted = rows.some((r) => r.weightage != null);
  const weight = (r) => (weighted ? (r.weightage ?? 0) : 1);
  const total = rows.reduce((n, r) => n + weight(r), 0);
  return total ? round2(rows.reduce((n, r) => n + r.score * weight(r), 0) / total) : null;
};

// Integer maths on percentages avoids float error at the boundary. Excused days are ignored.
//   can_miss:    classes still skippable while staying >= min (null = no minimum set)
//   must_attend: consecutive classes needed to get back to min (null = impossible at 100% minimum)
export const bunkStats = ({ present_count: present, absent_count: absent, min_attendance: min }) => {
  const total = present + absent;
  const pct = total ? (present / total) * 100 : 100;
  return {
    attended: present,
    total,
    attendance_pct: round2(pct),
    can_miss: min > 0 ? Math.max(0, Math.floor((present * 100) / min - total)) : null,
    must_attend: pct >= min ? 0 : min < 100 ? Math.ceil((min * total - 100 * present) / (100 - min)) : null,
  };
};

export const getPerformance = async (db) => {
  const { data } = await db
    .from('enrollments')
    .select('id, subject_code, subject_name, color, credits, target_score, final_score, predicted_score, attendance_pct, assessments(score, weightage)')
    .throwOnError();

  const subjects = data.map(({ assessments, ...e }) => {
    const avg_score = subjectAverage(assessments);
    return { ...e, avg_score, gap_to_target: avg_score == null ? null : round2(e.target_score - avg_score) };
  });

  const graded = subjects.filter((s) => s.avg_score != null);
  const credits = graded.reduce((n, s) => n + s.credits, 0);
  const overall_avg = credits ? round2(graded.reduce((n, s) => n + s.avg_score * s.credits, 0) / credits) : null;
  return { subjects, overall_avg }; // overall_avg is credit-weighted
};

export const getBunkCalculator = async (db) => {
  const { data } = await db.from('v_attendance_breakdown').select().throwOnError();
  return data.map((r) => ({
    enrollment_id: r.enrollment_id,
    subject_name: r.subject_name,
    color: r.color,
    min_attendance: r.min_attendance,
    ...bunkStats(r),
  }));
};

export const listAttendance = async (db, { enrollment_id, from, to }) => {
  let q = db.from('attendance_logs').select().order('class_date', { ascending: false });
  if (enrollment_id) q = q.eq('enrollment_id', enrollment_id);
  if (from) q = q.gte('class_date', from);
  if (to) q = q.lte('class_date', to);
  return (await q.throwOnError()).data;
};

// Marks one day for several subjects at once. A DB trigger refreshes enrollments.attendance_pct.
export const markAttendance = async (db, userId, { class_date, entries }) => {
  const rows = entries.map((e) => ({ ...e, class_date, user_id: userId }));
  return (await db.from('attendance_logs').upsert(rows, { onConflict: 'enrollment_id,class_date' }).select().throwOnError()).data;
};
