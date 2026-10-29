import { Library } from "lucide-react";

export default function Logo() {
  return (
    <div className="flex items-center gap-3">
      <span className="grid size-11 place-items-center rounded-xl bg-brand text-white"><Library size={20} /></span>
      <div className="leading-tight">
        <p className="text-xl font-semibold">EduTrack</p>
        <p className="text-[10px] tracking-wider text-muted">STUDENT HUB</p>
      </div>
    </div>
  );
}
