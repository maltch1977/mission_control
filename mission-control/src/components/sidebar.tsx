"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { label: "Tasks", href: "/" },
  { label: "Calendar", href: "/calendar" },
  { label: "Projects", href: "/projects" },
  { label: "Kepter", href: "/kepter" },
  { label: "Memory", href: "/memory" },
  { label: "Subscriptions", href: "/subscriptions" },
  { label: "Full Log", href: "/log" },
  { label: "Team", href: "/team" },
  { label: "Agents", href: "#" },
  { label: "Approvals", href: "#" },
  { label: "Docs", href: "/docs" },
  { label: "Help", href: "/help" },
  { label: "Heartbeat", href: "/heartbeat" },
  { label: "Crons", href: "/crons" },
  { label: "Office", href: "#" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 shrink-0 border-r border-zinc-800/80 bg-[#070709] p-4 lg:block">
      <div className="mb-4 flex items-center gap-2 px-1">
        <div className="h-6 w-6 rounded bg-zinc-200" />
        <p className="text-sm font-medium tracking-tight text-zinc-100">Mission Control</p>
      </div>

      <div className="mb-4 rounded-md border border-zinc-800 bg-zinc-950/60 px-2.5 py-2 text-xs text-zinc-500">Search</div>

      <nav className="space-y-1">
        {navItems.map((item) => {
          const active = item.href !== "#" && pathname === item.href;
          const disabled = item.href === "#";

          if (disabled) {
            return (
              <div
                key={item.label}
                className="w-full rounded-lg px-3 py-2 text-left text-sm text-zinc-500"
              >
                {item.label}
              </div>
            );
          }

          return (
            <Link
              key={item.label}
              href={item.href}
              className={`block w-full rounded-lg px-3 py-2 text-left text-sm transition ${
                active
                  ? "bg-zinc-800 text-zinc-50"
                  : "text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
