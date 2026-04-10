"use client";

import { useEffect, useMemo, useState } from "react";
import { Sidebar } from "@/components/sidebar";
import { supabase } from "@/lib/supabase";

type HeartbeatRun = {
  id: string;
  ran_at: string;
  status: "active" | "delayed" | "disabled" | "error";
  duration_ms: number | null;
  supermemory_ok: boolean | null;
  warning_count: number | null;
  error_count: number | null;
  created_at?: string | null;
};

type HeartbeatCheck = {
  id: string;
  run_id: string;
  check_key: string;
  result: "pass" | "fail" | "skipped";
  message: string | null;
  completed_at: string | null;
};

type MemoryFallback = {
  id: string;
  created_at: string | null;
};

const CADENCE_MINUTES = 60;

const checkCatalog = [
  { key: "supermemory", label: "Supermemory health + auto-fix" },
  { key: "friction-review", label: "Review mistakes and friction" },
  { key: "ops-sync", label: "Update dashboard + control tower" },
  { key: "ideas-sync", label: "Review idea inbox and promote" },
  { key: "project-sync", label: "Sync project context and memory" },
  { key: "reporting", label: "Send report only when material changes" },
];

export default function HeartbeatPage() {
  const [runs, setRuns] = useState<HeartbeatRun[]>([]);
  const [checks, setChecks] = useState<HeartbeatCheck[]>([]);
  const [fallback, setFallback] = useState<MemoryFallback[]>([]);
  const [setupRequired, setSetupRequired] = useState(false);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const load = async () => {
      if (!supabase) return;

      const runsResp = await supabase
        .from("heartbeat_runs")
        .select("id,ran_at,status,duration_ms,supermemory_ok,warning_count,error_count,created_at")
        .order("ran_at", { ascending: false })
        .limit(40);

      if (runsResp.error) {
        const msg = runsResp.error.message.toLowerCase();
        if (msg.includes("does not exist") || msg.includes("relation")) {
          setSetupRequired(true);
        }
      }

      if (runsResp.data) {
        const cleaned = (runsResp.data as HeartbeatRun[]).filter((r) => new Date(r.ran_at).getTime() <= Date.now() + 2 * 60 * 1000);
        setRuns(cleaned);

        const latestRunId = cleaned[0]?.id;
        if (latestRunId) {
          const checksResp = await supabase
            .from("heartbeat_checks")
            .select("id,run_id,check_key,result,message,completed_at")
            .eq("run_id", latestRunId)
            .order("check_key", { ascending: true });

          if (checksResp.data) setChecks(checksResp.data as HeartbeatCheck[]);
        }
      }

      // fallback for environments not yet logging heartbeat_runs
      if (!runsResp.data || runsResp.data.length === 0) {
        const fallbackResp = await supabase
          .from("memory_entries")
          .select("id,created_at")
          .eq("source", "heartbeat")
          .order("created_at", { ascending: false })
          .limit(10);
        if (fallbackResp.data) setFallback(fallbackResp.data as MemoryFallback[]);
      }
    };

    void load();
  }, []);

  const lastRun = useMemo(() => {
    if (runs.length > 0) return new Date(runs[0].ran_at);
    if (fallback[0]?.created_at) return new Date(fallback[0].created_at);
    return null;
  }, [runs, fallback]);

  const nextRun = lastRun ? new Date(lastRun.getTime() + CADENCE_MINUTES * 60_000) : null;

  const countdown = useMemo(() => {
    if (!nextRun) return "n/a";
    const diff = nextRun.getTime() - now;
    if (diff <= 0) return "Due now";
    const total = Math.floor(diff / 1000);
    const m = Math.floor(total / 60)
      .toString()
      .padStart(2, "0");
    const s = Math.floor(total % 60)
      .toString()
      .padStart(2, "0");
    return `${m}:${s}`;
  }, [nextRun, now]);

  const status = useMemo(() => {
    if (runs[0]?.status) return runs[0].status;
    if (!lastRun) return "disabled" as const;
    const ageMin = Math.floor((now - lastRun.getTime()) / 60_000);
    return ageMin <= 75 ? ("active" as const) : ("delayed" as const);
  }, [runs, lastRun, now]);

  const statusLabel =
    status === "active"
      ? "Active"
      : status === "delayed"
      ? "Delayed"
      : status === "error"
      ? "Error"
      : "Disabled";

  const statusTone =
    status === "active"
      ? "text-emerald-300"
      : status === "delayed"
      ? "text-amber-300"
      : status === "error"
      ? "text-rose-300"
      : "text-zinc-300";

  const checksByKey = useMemo(() => new Map(checks.map((c) => [c.check_key, c])), [checks]);

  const fmt = (d: Date | null) =>
    d
      ? d.toLocaleTimeString([], {
          hour: "numeric",
          minute: "2-digit",
        })
      : "n/a";

  return (
    <div className="min-h-screen bg-[#060609] text-zinc-100">
      <div className="flex min-h-screen w-full">
        <Sidebar />

        <main className="flex-1 px-5 py-6 md:px-8 md:py-8">
          <header className="mb-6">
            <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Heartbeat Engine</p>
            <h1 className="mt-1 text-4xl font-semibold tracking-tight">Every 60 minutes</h1>
            <p className="mt-2 text-sm text-zinc-400">Real tracker for execution, check results, and warnings.</p>
          </header>

          <section className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-5">
            <Stat label="Status" value={statusLabel} tone={statusTone} />
            <Stat label="Cadence" value="Every 60m" />
            <Stat label="Last Run" value={fmt(lastRun)} />
            <Stat label="Next Run" value={fmt(nextRun)} />
            <Stat label="Countdown" value={countdown} />
          </section>

          <section className="mb-4 rounded-2xl border border-zinc-800 bg-[#0e0e12] p-4">
            <h2 className="mb-3 text-xs uppercase tracking-[0.18em] text-zinc-500">Checks executed each heartbeat</h2>
            <div className="space-y-2">
              {checkCatalog.map((item) => {
                const row = checksByKey.get(item.key);
                const result = row?.result || "skipped";
                const color = result === "pass" ? "text-emerald-300" : result === "fail" ? "text-rose-300" : "text-zinc-400";
                const icon = result === "pass" ? "✓" : result === "fail" ? "✕" : "•";
                return (
                  <div key={item.key} className="rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm text-zinc-200">{item.label}</p>
                      <p className={`text-xs font-semibold ${color}`}>
                        {icon} {result.toUpperCase()}
                      </p>
                    </div>
                    {row?.message ? <p className="mt-1 text-xs text-zinc-400">{row.message}</p> : null}
                  </div>
                );
              })}
            </div>
          </section>

          <section className="rounded-2xl border border-zinc-800 bg-[#0e0e12] p-4">
            <h2 className="mb-3 text-xs uppercase tracking-[0.18em] text-zinc-500">Warnings and errors</h2>
            {runs[0] ? (
              <div className="space-y-2 text-sm text-zinc-200">
                <p>Warnings: {runs[0].warning_count ?? 0}</p>
                <p>Errors: {runs[0].error_count ?? 0}</p>
                <p>Supermemory: {runs[0].supermemory_ok ? "OK" : runs[0].supermemory_ok === false ? "FAIL" : "Unknown"}</p>
              </div>
            ) : (
              <p className="text-sm text-zinc-400">No run data yet.</p>
            )}
            {setupRequired ? (
              <p className="mt-3 text-xs text-amber-300">
                Setup required: create heartbeat_runs and heartbeat_checks tables. See mission-control/HEARTBEAT_ENGINE.sql
              </p>
            ) : null}
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
