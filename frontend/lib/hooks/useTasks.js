import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

// Tasks: fetches and maps status from db ("completed") to UI ("done")
export const useTasks = () =>
  useQuery({
    queryKey: ["tasks"],
    queryFn: async () => {
      const data = await api("/tasks");
      const list = Array.isArray(data) ? data : data?.tasks || data?.data || [];
      return list.map((t) => ({
        ...t,
        status: t.status === "completed" ? "done" : t.status === "in_progress" ? "doing" : t.status,
      }));
    },
  });

function useTaskMutation(fn) {
  const qc = useQueryClient();
  return useMutation({ mutationFn: fn, onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }) });
}

// Restored useAddTask with database-safe status mapping
export const useAddTask = () =>
  useTaskMutation((title) => {
    const body = typeof title === "string" ? { title, status: "todo" } : { status: "todo", ...title };
    return api("/tasks", { method: "POST", body });
  });

export const useUpdateTask = () => {
  const qc = useQueryClient();
  return useMutation({
    // backend route: PATCH /api/v1/tasks/:id with body { status }
    mutationFn: ({ id, ...patch }) => api.patch(`/tasks/${id}`, patch), // adapt to your lib/api.js helper
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }), // use the same key as useTasks
  });
};
