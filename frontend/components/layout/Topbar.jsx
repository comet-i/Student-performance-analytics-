"use client";
import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Bell, Search } from "lucide-react";
import { NAV } from "./Sidebar";
import UserMenu from "./UserMenu";

export default function Topbar() {
  const path = usePathname();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const page = NAV.find(([, href]) => path.startsWith(href))?.[0] ?? "Settings";

  function handleSearch(e) {
    e.preventDefault();
    if (!query.trim()) return;
    router.push(`/dashboard?search=${encodeURIComponent(query)}`);
  }

  return (
    <header className="flex h-20 items-center gap-6 border-b border-line bg-card/60 px-6 lg:px-8">
      <form onSubmit={handleSearch} className="relative max-w-md flex-1">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
        <input 
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search your academic space" 
          className="w-full rounded-xl border border-line bg-bg py-3 pl-11 pr-4 text-sm outline-none focus:border-brand" 
        />
      </form>
      <p className="ml-auto hidden text-sm text-muted md:block">Workspace / <span className="text-ink">{page}</span></p>
      <span className="hidden text-sm md:block">Semester 4 · 2026</span>
      <button aria-label="Notifications" className="grid size-11 place-items-center rounded-full border border-line bg-panel/50"><Bell size={18} /></button>
      <UserMenu />
    </header>
  );
}
