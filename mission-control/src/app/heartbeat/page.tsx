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
  "If status is not loaded/enabled, run: openclaw plugins enable openclaw-supermemory",
  "If output says not configured, run: openclaw supermemory setup",
  "After any change, restart gateway: openclaw gateway restart",
  "Re-check and log whether issue is recurring",
];

const suggestedHeartbeatItems = [
  "Check Mission Control Kepter urgent queue for stale P0 items",
  "Confirm TestFlight feedback has been converted into task cards",
  "Review upcoming subscription renewals due in next 7 days",
  "Check for repeated operational failures and mark as pattern risk",
  "Suggest one new heartbeat item based on new workflow friction",
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
        .limit(100);

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

  const parsed = useMemo(() => {
    return rows
      .map((r) => {
        const timestamp = r.created_at ?? `${r.date_key}T00:00:00Z`;
        return { ...r, ts: new Date(timestamp) };
      })
      .sort((a, b) => b.ts.getTime() - a.ts.getTime());
  }, [rows]);

  const lastRun = parsed[0]?.ts ?? null;
  const now = new Date();
  const minutesSince = lastRun ? Math.floor((now.getTime() - lastRun.getTime()) / 60000) : null;
  const status = minutesSince === null ? "No data" : minutesSince <= 75 ? "On time" : minutesSince <= 180 ? "Delayed" : "Overdue";

  const todayKey = now.toISOString().slice(0, 10);
  const todayRuns = parsed.filter((r) => r.date_key === todayKey).length;
  const nextRunAt = lastRun ? new Date(lastRun.getTime() + cadenceMinutes * 60000) : null;

  return (
    <div className="min-h-screen bg-[#060609] text-zinc-100">
      <div className="flex min-h-screen w-full">
        <Sidebar />

        <main className="flex-1 px-5 py-6 md:px-8 md:py-8">
          <header className="mb-6 rounded-2xl border border-zinc-800/80 bg-[#0e0e12] p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Heartbeat</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight">Heartbeat Operations</h1>
            <p className="mt-2 text-sm text-zinc-400">
              Frequency locked at every {cadenceMinutes} minutes. This page defines exactly what heartbeat runs and what gets auto-fixed.
            </p>
          </header>

          <section className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-5">
            <Stat label="Cadence" value={`Every ${cadenceMinutes}m`} />
            <Stat label="Status" value={status} />
            <Stat label="Runs Today" value={String(todayRuns)} />
            <Stat label="Last Run" value={lastRun ? lastRun.toLocaleTimeString() : "n/a"} />
            <Stat label="Next Due" value={nextRunAt ? nextRunAt.toLocaleTimeString() : "n/a"} />
          </section>

          <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
            <section className="rounded-2xl border border-zinc-800 bg-[#0e0e12] p-4">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.15em] text-zinc-500">Required Heartbeat Actions</h2>
              <div className="space-y-2">
                {requiredActions.map((item) => (
                  <div key={item} className="rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-200">
                    {item}
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-zinc-800 bg-[#0e0e12] p-4">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.15em] text-zinc-500">Supermemory Auto-Fix Runbook</h2>
              <div className="space-y-2">
                {supermemoryAutoFix.map((item) => (
                  <div key={item} className="rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-200">
                    {item}
                  </div>
                ))}
              </div>
            </section>
          </div>

          <section className="mt-4 rounded-2xl border border-zinc-800 bg-[#0e0e12] p-4">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.15em] text-zinc-500">Suggested Items to Add Over Time</h2>
            <div className="grid gap-2 md:grid-cols-2">
              {suggestedHeartbeatItems.map((item) => (
                <div key={item} className="rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-200">
                  {item}
                </div>
              ))}
            </div>
          </section>

          <section className="mt-4 rounded-2xl border border-zinc-800 bg-[#0e0e12] p-4">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.15em] text-zinc-500">Recent Heartbeat Runs</h2>
            <div className="space-y-2">
              {parsed.length === 0 ? (
                <p className="text-sm text-zinc-500">No heartbeat entries yet.</p>
              ) : (
                parsed.slice(0, 20).map((row) => (
                  <article key={row.id} className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3">
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

          {minutesSince !== null && minutesSince > 75 && (
            <section className="mt-4 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-200">
              Heartbeat is behind schedule by {minutesSince - 60} minutes. Check runtime health and heartbeat task execution.
            </section>
          )}
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
