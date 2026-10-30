import PageHeader from "@/components/ui/PageHeader";
import KanbanBoard from "@/components/features/planner/KanbanBoard";

export default function PlannerPage() {
  return (
    <>
      <PageHeader title="Study Planner" subtitle="Plan what to study next and move tasks as you go." />
      <KanbanBoard />
    </>
  );
}
