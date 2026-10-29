import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { createClient } from "@/utils/supabase/client";

// Subjects: [{ id, name, code, color, attended, total }]
export const useSubjects = () => useQuery({ queryKey: ["subjects"], queryFn: () => api("/subjects") });

// Calendar for one month ("2026-10"): { "2026-10-05": "present" | "absent" }
export const useAttendanceCalendar = (month) =>
  useQuery({ queryKey: ["calendar", month], queryFn: () => api(`/attendance/calendar?month=${month}`) });

// Marks: [{ id, subject_id, subject, title, score, max }]
export const useMarks = () => useQuery({ queryKey: ["marks"], queryFn: () => api("/marks") });

export function useAddMark() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body) => api("/marks", { method: "POST", body }),
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
