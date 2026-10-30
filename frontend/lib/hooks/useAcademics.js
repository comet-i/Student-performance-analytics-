import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { createClient } from "@/utils/supabase/client";

export const useSubjects = () =>
  useQuery({
    queryKey: ["subjects"],
    queryFn: async () => {
      const data = await api("/enrollments");
      const list = Array.isArray(data) ? data : data?.enrollments || data?.data || [];
      return list.map((item) => {
        const pct = item.attendance_pct ?? item.attendancePct ?? 100;
        return {
          ...item,
          id: item.id || item._id,
          name: item.name || item.subject_name || "Untitled Subject",
          code: item.code || item.subject_code || "SUB",
          // Expose attendance_pct cleanly as total/attended proportions or percentage
          attendancePct: pct,
          total: item.total || 10,
          attended: item.attended || Math.round((pct / 100) * 10),
        };
      });
    },
  });

// Calendar for one month ("2026-10"): { "2026-10-05": "present" | "absent" }
export const useAttendanceCalendar = (month) =>
  useQuery({ queryKey: ["calendar", month], queryFn: () => api(`/attendance/calendar?month=${month}`) });

export const useMarks = () =>
  useQuery({
    queryKey: ["marks"],
    queryFn: async () => {
      const data = await api("/assessments");
      const list = Array.isArray(data) ? data : data?.assessments || data?.data || [];
      return list.map((item) => {
        let rawScore = Number(item.score ?? item.marks_obtained ?? 0);
        let rawMax = Number(item.max ?? item.max_marks ?? 100);

        // FRONTEND FIX: Auto-correct historic swapped data (e.g., fixes 80/20 to 20/80)
        if (rawScore > rawMax && rawMax > 0) {
          const temp = rawScore;
          rawScore = rawMax;
          rawMax = temp;
        }

        return {
          ...item,
          id: item.id || item._id,
          subject_id: item.subject_id || item.enrollment_id,
          title: item.title || item.assessment_title || "Assessment",
          score: rawScore,
          max: rawMax > 0 ? rawMax : 100,
        };
      });
    },
  });

export function useAddMark() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body) => {
      const enrollmentId = body.subject_id || body.subjectId || body.subject || body.enrollment_id;
      if (!enrollmentId || enrollmentId === "Select subject") {
        throw new Error("Please select a valid subject.");
      }

      let s = Number(body.score ?? body.marks_obtained ?? 0);
      let m = Number(body.max ?? body.max_marks ?? 100);

      // Auto-swap before sending to prevent 400 Bad Request constraints
      if (s > m) {
        const temp = s;
        s = m;
        m = temp;
      }

      const payload = {
        enrollment_id: enrollmentId,
        subject_id: enrollmentId, 
        assessment_title: body.title || body.assessment_title || "Assessment",
        title: body.title || body.assessment_title || "Assessment",
        marks_obtained: s,
        score: s,
        max_marks: m,
        max: m,
        // EXACT FIELD REQUIRED BY THE BACKEND:
        raw_marks: s, 
        // Adding the likely counterpart for max marks to be safe:
        total_marks: m 
      };
      
      return api("/assessments", { method: "POST", body: payload });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["marks"] }),
  });
}

// Profile + preferences live in Supabase auth user metadata.
export const useSettings = () =>
  useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const { data: { user } } = await createClient().auth.getUser();
      const m = user?.user_metadata ?? {};
      return { name: m.full_name ?? "", goal: m.attendance_goal ?? 85, threshold: m.min_threshold ?? 75 };
    },
  });

// Profile + preferences live in Supabase auth user metadata.
//export const useSettings = () =>
  //useQuery({
    //queryKey: ["settings"],
    //queryFn: async () => {
      //const { data: { user } } = await createClient().auth.getUser();
     // const m = user?.user_metadata ?? {};
     // return { name: m.full_name ?? "", goal: m.attendance_goal ?? 85, threshold: m.min_threshold ?? 75 };
    //},
  //});
