"use client";

import { useEffect, useMemo, useState } from "react";
import { Sidebar } from "@/components/sidebar";
import { supabase } from "@/lib/supabase";

type HeartbeatEntry = {
  id: string;
  title: string;
  summary: string;
  date_key: string;
  source: "manual" | "heartbeat" | "task" | "chat";
  tags: string[];
  created_at?: string | null;
};

const CADENCE_MINUTES = 60;

const executionPlan = [
  "Check Supermemory first and auto-fix if it's off",
  "Review recent mistakes, issues, and friction",
  "Update DASHBOARD.md and CONTROL_TOWER.md when needed",
  "Review IDEA_INBOX.md and promote items to backlog",
  "Sync project context + today's memory snapshot",
  "Report only when something meaningful changed",
];

const supermemoryFixSteps = [
  "openclaw plugins info openclaw-supermemory",
  "openclaw plugins enable openclaw-supermemory (if disabled)",
  "openclaw supermemory setup (if not configured)",
  "openclaw gateway restart",
  "re-check status and alert Chad if this keeps repeating",
];

const suggestedItems = [
  "Check Kepter urgent queue for stale P0 tasks",
  "Convert new TestFlight feedback into task cards",
  "Review renewals due in the next 7 days",
  "Flag recurring failures as pattern risks",
];

export default function HeartbeatPage() {
  const [rows, setRows] = useState<HeartbeatEntry[]>([]);

  useEffect(() => {
    const load = async () => {
      if (!supabase) return;
      const { data } = await supabase
        .from("memory_entries")
        .select("id,title,summary,date_key,source,tags,created_at")
        .eq("source", "heartbeat")
        .order("date_key", { ascending: false })
        .limit(120);

      if (data) {
        setRows(
          (data as HeartbeatEntry[]).map((r) => ({
            ...r,
            tags: Array.isArray(r.tags) ? r.tags : [],
          })),
        );
      }
    };

    void load();
  }, []);

  const timeline = useMemo(
    () =>
      rows
        .map((r) => {
          const timestamp = r.created_at ?? `${r.date_key}T00:00:00Z`;
          return { ...r, ts: new Date(timestamp) };
        })
        .sort((a, b) => b.ts.getTime() - a.ts.getTime()),
    [rows],
  );

  const lastRun = timeline[0]?.ts ?? null;
  const now = new Date();
  const minutesSince = lastRun ? Math.floor((now.getTime() - lastRun.getTime()) / 60000) : null;
  const nextRunAt = lastRun ? new Date(lastRun.getTime() + CADENCE_MINUTES * 60000) : null;

  const statusLabel = minutesSince === null ? "No runs yet" : minutesSince <= 75 ? "On schedule" : "Late";
  const statusTone =
    statusLabel === "On schedule" ? "text-emerald-300" : statusLabel === "Late" ? "text-amber-300" : "text-zinc-300";

  const todayKey = now.toISOString().slice(0, 10);
  const todayRuns = timeline.filter((r) => r.date_key === todayKey).length;

  return (
    <div className="min-h-screen bg-[#060609] text-zinc-100">
      <div className="flex min-h-screen w-full">
        <Sidebar />

        <main className="flex-1 px-5 py-6 md:px-8 md:py-8">
          <header className="mb-6">
            <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Heartbeat</p>
            <h1 className="mt-1 text-4xl font-semibold tracking-tight">Heartbeat</h1>
            <p className="mt-2 text-sm text-zinc-400">What runs every 60 minutes, what happened today, and what auto-fixes are applied.</p>
          </header>

          <section className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-5">
            <Stat label="Cadence" value={`Every ${CADENCE_MINUTES}m`} />
            <Stat label="Status" value={statusLabel} tone={statusTone} />
            <Stat label="Runs Today" value={String(todayRuns)} />
            <Stat label="Last Run" value={lastRun ? lastRun.toLocaleTimeString() : "n/a"} />
            <Stat label="Next Run" value={nextRunAt ? nextRunAt.toLocaleTimeString() : "n/a"} />
          </section>

          <p className="mb-5 text-sm text-zinc-500">Heartbeat runs every 60 minutes. "Late" just means it has not checked in recently.</p>

          <section className="grid gap-4 xl:grid-cols-[1.05fr_1fr]">
            <Card title="What Heartbeat Executes">
              <div className="space-y-2">
                {executionPlan.map((item, i) => (
                  <div key={item} className="rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-200">
                    {i + 1}. {item}
                  </div>
                ))}
              </div>
            </Card>

            <Card title="Today's Heartbeat Log">
              <div className="space-y-2">
                {timeline.length === 0 ? (
                  <p className="text-sm text-zinc-500">No heartbeat logs yet.</p>
                ) : (
                  timeline.slice(0, 18).map((row) => (
                    <article key={row.id} className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3">
                      <div className="mb-1 flex items-center justify-between gap-3">
                        <p className="text-sm font-medium text-zinc-200">{row.title}</p>
                        <p className="text-xs text-zinc-500">{row.ts.toLocaleTimeString()}</p>
                      </div>
                      <p className="text-xs text-zinc-400">{row.summary}</p>
                    </article>
                  ))
                )}
              </div>
            </Card>
          </section>

          <section className="mt-4 grid gap-4 xl:grid-cols-2">
            <Card title="Supermemory Auto-Fix (always first)">
              <div className="space-y-2">
                {supermemoryFixSteps.map((item, i) => (
                  <div key={item} className="rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-200">
                    {i + 1}. {item}
                  </div>
                ))}
              </div>
            </Card>

            <Card title="Suggested Items To Add">
              <div className="space-y-2">
                {suggestedItems.map((item) => (
                  <div key={item} className="rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-200">
                    {item}
                  </div>
                ))}
              </div>
            </Card>
          </section>
        </main>
      </div>
    </div>
  );
}

function Stat({ label, value, tone = "text-zinc-100" }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-[#0e0e12] p-4">
      <p className="text-xs uppercase tracking-wide text-zinc-500">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${tone}`}>{value}</p>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-zinc-800 bg-[#0e0e12] p-4">
      <h2 className="mb-3 text-xs uppercase tracking-[0.18em] text-zinc-500">{title}</h2>
      {children}
    </section>
  );
}
