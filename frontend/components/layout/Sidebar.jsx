"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, BookOpen, CalendarCheck, ClipboardList, CalendarDays, TrendingUp, Settings } from "lucide-react";
import Logo from "@/components/ui/Logo";
import UserMenu from "./UserMenu";

export const NAV = [
  ["Dashboard", "/dashboard", LayoutGrid],
  ["Subjects", "/subjects", BookOpen],
  ["Attendance", "/attendance", CalendarCheck],
  ["Marks", "/marks", ClipboardList],
  ["Study Planner", "/planner", CalendarDays],
  ["Insights", "/insights", TrendingUp],
];

export default function Sidebar() {
  const path = usePathname();
  const item = ([label, href, Icon]) => (
    <Link
      key={href}
      href={href}
      className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm ${path.startsWith(href) ? "border-l-4 border-brand bg-panel font-medium" : "text-muted hover:bg-panel/60"}`}
    >
      <Icon size={18} /> {label}
    </Link>
  );

  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-line bg-card/60 p-6 lg:flex">
      <Logo />
      <p className="mb-3 mt-10 text-xs font-medium tracking-wider text-muted">WORKSPACE</p>
      <nav className="space-y-1">{NAV.map(item)}</nav>
      <div className="mt-auto space-y-4">
        <div className="rounded-2xl border border-line bg-panel/50 p-4 text-sm">
          <p className="font-medium">Semester 4 · 2026</p>
          <p className="mt-1 text-xs text-muted">A little consistency. A lot of progress.</p>
        </div>
        {item(["Settings", "/settings", Settings])}
        <UserMenu up />
      </div>
    </aside>
  );
}
