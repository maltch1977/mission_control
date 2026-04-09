"use client";

import { useEffect, useMemo, useState } from "react";
import { Sidebar } from "@/components/sidebar";
import { supabase } from "@/lib/supabase";

type HeartbeatEntry = {
  id: string;
  title: string;
  summary: string;
  date_key: string;
  created_at?: string | null;
};

const CADENCE_MINUTES = 60;

const actions = [
  "Check Supermemory first and auto-fix if needed",
  "Review recent friction and mistakes",
  "Update dashboard/control tower when needed",
  "Sync ideas and project context",
  "Report only when something meaningful changed",
];

export default function HeartbeatPage() {
  const [rows, setRows] = useState<HeartbeatEntry[]>([]);

  useEffect(() => {
    const load = async () => {
      if (!supabase) return;
      const { data } = await supabase
        .from("memory_entries")
        .select("id,title,summary,date_key,created_at")
        .eq("source", "heartbeat")
        .order("date_key", { ascending: false })
        .limit(20);
      if (data) setRows(data as HeartbeatEntry[]);
    };
    void load();
  }, []);

  const timeline = useMemo(
    () =>
      rows
        .map((r) => ({ ...r, ts: new Date(r.created_at ?? `${r.date_key}T00:00:00Z`) }))
        .sort((a, b) => b.ts.getTime() - a.ts.getTime()),
    [rows],
  );

  const lastRun = timeline[0]?.ts ?? null;
  const nextRun = lastRun ? new Date(lastRun.getTime() + CADENCE_MINUTES * 60000) : null;

  const formatClock = (d: Date) =>
    d.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });

  const minutesSince = lastRun ? Math.max(0, Math.floor((Date.now() - lastRun.getTime()) / 60000)) : null;
  const minutesToNext = nextRun ? Math.floor((nextRun.getTime() - Date.now()) / 60000) : null;

  const lastRunLabel = lastRun ? `${formatClock(lastRun)} (${minutesSince}m ago)` : "n/a";
  const nextRunLabel =
    nextRun === null
      ? "n/a"
      : minutesToNext !== null && minutesToNext <= 0
      ? "Due now"
      : `${formatClock(nextRun)} (in ${minutesToNext}m)`;

  return (
    <div className="min-h-screen bg-[#060609] text-zinc-100">
      <div className="flex min-h-screen w-full">
        <Sidebar />

        <main className="flex-1 px-5 py-6 md:px-8 md:py-8">
          <header className="mb-6">
            <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Heartbeat</p>
            <h1 className="mt-1 text-4xl font-semibold tracking-tight">Runs every 60 minutes</h1>
            <p className="mt-2 text-sm text-zinc-400">Simple view of what heartbeat is doing.</p>
          </header>

          <section className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-3">
            <Stat label="Cadence" value="Every 60m" />
            <Stat label="Last Run" value={lastRunLabel} />
            <Stat label="Next Run" value={nextRunLabel} />
          </section>

          <section className="mb-4 rounded-2xl border border-zinc-800 bg-[#0e0e12] p-4">
            <h2 className="mb-3 text-xs uppercase tracking-[0.18em] text-zinc-500">What heartbeat executes</h2>
            <div className="space-y-2">
              {actions.map((item, i) => (
                <div key={item} className="rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-200">
                  {i + 1}. {item}
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-zinc-800 bg-[#0e0e12] p-4">
            <h2 className="mb-3 text-xs uppercase tracking-[0.18em] text-zinc-500">Supermemory</h2>
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-200">
              Heartbeat always checks Supermemory first. If it is off, it auto-enables and alerts Chad if this becomes recurring.
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-[#0e0e12] p-4">
      <p className="text-xs uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-zinc-100">{value}</p>
    </div>
  );
}
