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

const cadenceMinutes = 60;

const requiredActions = [
  "Confirm Supermemory is enabled and configured",
  "If Supermemory is off, enable it immediately and log the fix",
  "Review recent mistakes, issues, or friction points",
  "Update DASHBOARD.md and CONTROL_TOWER.md when needed",
  "Review IDEA_INBOX.md and IDEA_BACKLOG.md statuses",
  "Sync project context and today's memory snapshot",
  "Report only when something was found or fixed",
];

const supermemoryAutoFix = [
  "Run: openclaw plugins info openclaw-supermemory",
  "If not loaded/enabled: openclaw plugins enable openclaw-supermemory",
  "If not configured: openclaw supermemory setup",
  "Restart gateway: openclaw gateway restart",
  "Re-check and log recurrence",
];

const suggestedItems = [
  "Check Kepter urgent queue for stale P0 items",
  "Confirm TestFlight feedback is converted to task cards",
  "Review renewals due in next 7 days",
  "Flag repeated operational failures as pattern risk",
  "Propose one new heartbeat item from current workflow friction",
];

export default function HeartbeatPage() {
  const [rows, setRows] = useState<HeartbeatEntry[]>([]);
  const [query, setQuery] = useState("");

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

  const parsed = useMemo(
    () =>
      rows
        .map((r) => {
          const timestamp = r.created_at ?? `${r.date_key}T00:00:00Z`;
          return { ...r, ts: new Date(timestamp) };
        })
        .sort((a, b) => b.ts.getTime() - a.ts.getTime()),
    [rows],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return parsed;
    return parsed.filter((r) => `${r.title} ${r.summary} ${r.tags.join(" ")}`.toLowerCase().includes(q));
  }, [parsed, query]);

  const lastRun = parsed[0]?.ts ?? null;
  const now = new Date();
  const minutesSince = lastRun ? Math.floor((now.getTime() - lastRun.getTime()) / 60000) : null;
  const status = minutesSince === null ? "No data" : minutesSince <= 75 ? "On time" : minutesSince <= 180 ? "Delayed" : "Overdue";

  const todayKey = now.toISOString().slice(0, 10);
  const todayRuns = parsed.filter((r) => r.date_key === todayKey).length;
  const nextRunAt = lastRun ? new Date(lastRun.getTime() + cadenceMinutes * 60000) : null;

  const statusTone = status === "On time" ? "text-emerald-300" : status === "Delayed" ? "text-amber-300" : "text-rose-300";

  return (
    <div className="min-h-screen bg-[#060609] text-zinc-100">
      <div className="flex min-h-screen w-full">
        <Sidebar />

        <main className="flex-1 px-5 py-6 md:px-8 md:py-8">
          <header className="mb-5">
            <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Heartbeat</p>
            <h1 className="mt-1 text-4xl font-semibold tracking-tight">Heartbeat Operations</h1>
            <p className="mt-2 text-sm text-zinc-400">
              Same design language as Memory. Cadence locked at every {cadenceMinutes} minutes with explicit runbook + live history.
            </p>
          </header>

          <section className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-5">
            <Stat label="Cadence" value={`Every ${cadenceMinutes}m`} tone="text-violet-300" />
            <Stat label="Status" value={status} tone={statusTone} />
            <Stat label="Runs Today" value={String(todayRuns)} />
            <Stat label="Last Run" value={lastRun ? lastRun.toLocaleTimeString() : "n/a"} />
            <Stat label="Next Due" value={nextRunAt ? nextRunAt.toLocaleTimeString() : "n/a"} />
          </section>

          <section className="mb-4 rounded-2xl border border-zinc-800 bg-[#0e0e12] p-4">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search heartbeat entries, actions, or tags..."
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
            />
            <div className="mt-3 flex flex-wrap gap-2">
              {[
                `cadence:${cadenceMinutes}m`,
                "source:heartbeat",
                "check:supermemory",
                status === "On time" ? "state:healthy" : "state:attention",
              ].map((chip) => (
                <span key={chip} className="rounded-full border border-zinc-700 bg-zinc-900 px-2.5 py-1 text-xs text-zinc-300">
                  {chip}
                </span>
              ))}
            </div>
          </section>

          <div className="grid gap-4 xl:grid-cols-2">
            <Panel title="Required Heartbeat Actions">
              {requiredActions.map((item, idx) => (
                <Row key={item} title={`${idx + 1}. ${item}`} />
              ))}
            </Panel>

            <Panel title="Supermemory Auto-Fix Runbook">
              {supermemoryAutoFix.map((item, idx) => (
                <Row key={item} title={`${idx + 1}. ${item}`} />
              ))}
            </Panel>
          </div>

          <section className="mt-4 rounded-2xl border border-zinc-800 bg-[#0e0e12] p-4">
            <h2 className="mb-3 text-xs uppercase tracking-[0.18em] text-zinc-500">Suggested Items To Add Over Time</h2>
            <div className="grid gap-2 md:grid-cols-2">
              {suggestedItems.map((item) => (
                <div key={item} className="rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-200">
                  {item}
                </div>
              ))}
            </div>
          </section>

          <section className="mt-4 rounded-2xl border border-zinc-800 bg-[#0e0e12] p-4">
            <h2 className="mb-3 text-xs uppercase tracking-[0.18em] text-zinc-500">Recent Heartbeat Runs</h2>
            <div className="space-y-2">
              {filtered.length === 0 ? (
                <p className="text-sm text-zinc-500">No heartbeat entries found.</p>
              ) : (
                filtered.slice(0, 24).map((row) => (
                  <article key={row.id} className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3">
                    <div className="mb-1 flex items-center justify-between gap-3">
                      <p className="text-sm font-medium text-zinc-200">{row.title}</p>
                      <p className="text-xs text-zinc-500">{row.ts.toLocaleString()}</p>
                    </div>
                    <p className="text-xs text-zinc-400">{row.summary}</p>
                  </article>
                ))
              )}
            </div>
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

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-zinc-800 bg-[#0e0e12] p-4">
      <h2 className="mb-3 text-xs uppercase tracking-[0.18em] text-zinc-500">{title}</h2>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function Row({ title }: { title: string }) {
  return <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-200">{title}</div>;
}
