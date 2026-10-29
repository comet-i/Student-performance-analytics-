"use client";
import PageHeader from "@/components/ui/PageHeader";
import MarksForm from "@/components/features/marks/MarksForm";
import MarksTable from "@/components/features/marks/MarksTable";
import { useMarks } from "@/lib/hooks/useAcademics";

export default function MarksPage() {
  const { data: marks = [] } = useMarks();
  return (
    <>
      <PageHeader title="Marks" subtitle="Log assessments and watch your grades take shape." />
      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <MarksForm />
        <MarksTable marks={marks} />
      </div>
    </>
  );
}
