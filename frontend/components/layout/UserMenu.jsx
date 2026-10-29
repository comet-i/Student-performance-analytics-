"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, LogOut } from "lucide-react";
import { useSettings } from "@/lib/hooks/useAcademics";
import { createClient } from "@/utils/supabase/client";

export default function UserMenu({ up = false }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const name = useSettings().data?.name || "Student";
  const initials = name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

  async function logout() {
    await createClient().auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className="flex w-full items-center gap-3 rounded-xl p-1.5 text-left hover:bg-panel/60">
        <span className="grid size-10 place-items-center rounded-full bg-panel text-sm font-semibold text-brand">{initials}</span>
        <span className="hidden text-sm leading-tight sm:block">
          <b className="block font-medium">{name}</b>
          <span className="text-xs text-muted">Student account</span>
        </span>
        <ChevronDown size={16} className="ml-auto text-muted" />
      </button>
      {open && (
        <div className={`absolute right-0 z-20 w-44 rounded-xl border border-line bg-card p-1 shadow-lg ${up ? "bottom-full mb-2" : "top-full mt-2"}`}>
          <button onClick={logout} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-panel">
            <LogOut size={16} /> Sign out
          </button>
        </div>
      )}
    </div>
  );
}
