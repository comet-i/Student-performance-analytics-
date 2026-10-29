"use client";
import { useState } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useAddTask, useTasks, useUpdateTask } from "@/lib/hooks/useTasks";

// [database status, label]: the status strings must match the study_tasks.status check constraint
const COLS = [
  ["todo", "To do"],
  ["in_progress", "In progress"],
  ["completed", "Done"],
];

export default function KanbanBoard() {
  const { data: tasks = [] } = useTasks();
  const add = useAddTask();
  const update = useUpdateTask();
  const [title, setTitle] = useState("");

  const submit = (e) => {
    e.preventDefault();
    if (title.trim()) add.mutate(title.trim(), { onSuccess: () => setTitle("") });
  };

  // direction: -1 = move back one column, +1 = move forward one column
  const move = (task, direction) => {
    const current = COLS.findIndex(([key]) => key === task.status);
    const target = COLS[current + direction];
    if (target) update.mutate({ id: task.id, status: target[0] });
  };

  return (
    <>
      <form onSubmit={submit} className="mb-6 flex max-w-md gap-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Add a study task"
          className="flex-1 rounded-xl border border-line bg-card px-4 py-3 text-sm outline-none focus:border-brand"
        />
        <button aria-label="Add task" className="grid size-12 place-items-center rounded-xl bg-brand text-white">
          <Plus size={18} />
        </button>
      </form>

      <div className="grid gap-4 md:grid-cols-3">
        {COLS.map(([key, label], colIndex) => {
          const items = tasks.filter((t) => t.status === key);
          return (
            <section key={key} className="rounded-2xl bg-panel/50 p-4">
              <h3 className="mb-3 text-sm font-medium">
                {label} <span className="text-muted">· {items.length}</span>
              </h3>
              <div className="space-y-2">
                {items.map((t) => (
                  <div key={t.id} className="flex items-center justify-between gap-2 rounded-xl border border-line bg-card p-3 text-sm">
                    <span>{t.title}</span>
                    <span className="flex shrink-0 gap-1 text-muted">
                      <button
                        aria-label="Move back"
                        disabled={colIndex === 0 || update.isPending}
                        onClick={() => move(t, -1)}
                        className="rounded p-1 hover:bg-panel disabled:cursor-not-allowed disabled:opacity-30"
                      >
                        <ChevronLeft size={14} />
                      </button>
                      <button
                        aria-label="Move forward"
                        disabled={colIndex === COLS.length - 1 || update.isPending}
                        onClick={() => move(t, 1)}
                        className="rounded p-1 hover:bg-panel disabled:cursor-not-allowed disabled:opacity-30"
                      >
                        <ChevronRight size={14} />
                      </button>
                    </span>
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}

