import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

// Tasks: [{ id, title, status: "todo" | "doing" | "done" }]
export const useTasks = () => useQuery({ queryKey: ["tasks"], queryFn: () => api("/tasks") });

function useTaskMutation(fn) {
  const qc = useQueryClient();
  return useMutation({ mutationFn: fn, onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }) });
}

export const useAddTask = () => useTaskMutation((title) => api("/tasks", { method: "POST", body: { title, status: "todo" } }));
export const useUpdateTask = () => useTaskMutation(({ id, status }) => api(`/tasks/${id}`, { method: "PATCH", body: { status } }));
