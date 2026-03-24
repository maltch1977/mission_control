"use client";

import { useEffect, useMemo, useState } from "react";
import { Sidebar } from "@/components/sidebar";
import { supabase } from "@/lib/supabase";

type Task = {
  id: string;
  title: string;
  owner: string;
  owner_agent?: string;
  model_tier?: string;
  role?: string;
  project: string;
  status: string;
  updated: string;
  parent_task_id?: string | null;
};

type WorkLog = {
  id: string;
  actor: string;
  action: string;
  details?: string | null;
  project?: string | null;
  created_at: string;
};

export default function LogPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [workLog, setWorkLog] = useState<WorkLog[]>([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const load = async () => {
      if (!supabase) return;
      const [{ data: tRows }, { data: wRows }] = await Promise.all([
        supabase
          .from("tasks")
          .select("id,title,owner,owner_agent,model_tier,role,project,status,updated,parent_task_id")
          .order("created_at", { ascending: false })
          .limit(200),
        supabase
          .from("work_log")
          .select("id,actor,action,details,project,created_at")
          .order("created_at", { ascending: false })
          .limit(500),
      ]);
      if (tRows) setTasks(tRows as Task[]);
      if (wRows) setWorkLog(wRows as WorkLog[]);
    };
    void load();
  }, []);

  const activeTasks = useMemo(() => tasks.filter((t) => t.status !== "done"), [tasks]);

  const filteredLog = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return workLog;
    return workLog.filter((w) => `${w.actor} ${w.action} ${w.details || ""} ${w.project || ""}`.toLowerCase().includes(q));
  }, [workLog, query]);
  const delegatedTasks = useMemo(() => activeTasks.filter((t) => !!t.parent_task_id), [activeTasks]);

  const groupedByProject = useMemo(() => {
    const map = new Map<string, Task[]>();
    activeTasks.forEach((t) => {
      const list = map.get(t.project) ?? [];
      list.push(t);
      map.set(t.project, list);
    });
    return Array.from(map.entries());
  }, [activeTasks]);

  return (
    <div className="min-h-screen bg-[#060609] text-zinc-100">
      <div className="flex min-h-screen w-full">
        <Sidebar />
        <main className="flex-1 px-5 py-6 md:px-8 md:py-8">
          <header className="mb-6 rounded-2xl border border-zinc-800/80 bg-[#0e0e12] p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Full Log</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight">Everything Worked On</h1>
            <p className="mt-2 text-sm text-zinc-400">Canonical execution ledger for Panda and all agents. Searchable and comprehensive.</p>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search full log by actor, action, project, details"
              className="mt-3 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
            />
          </header>

          <section className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat label="Active Tasks" value={String(activeTasks.length)} />
            <Stat label="Delegated" value={String(delegatedTasks.length)} />
            <Stat label="Projects In Motion" value={String(groupedByProject.length)} />
            <Stat label="Log Rows" value={String(workLog.length)} />
          </section>

          <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
            <section className="rounded-2xl border border-zinc-800 bg-[#0e0e12] p-4">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.15em] text-zinc-500">Active Work by Project</h2>
              <div className="space-y-4">
                {groupedByProject.length === 0 ? (
                  <p className="text-sm text-zinc-500">No active tasks right now.</p>
                ) : (
                  groupedByProject.map(([project, rows]) => (
                    <div key={project}>
                      <p className="mb-2 text-xs font-semibold text-zinc-300">{project}</p>
                      <div className="space-y-2">
                        {rows.map((t) => (
                          <article key={t.id} className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3">
                            <p className="text-sm font-medium">{t.title}</p>
                            <p className="mt-1 text-xs text-zinc-400">
                              {t.status} · {t.owner_agent || t.owner} · {t.model_tier || "cheap"} · {t.role || "ops"}
                            </p>
                            {t.parent_task_id && <p className="mt-1 text-[11px] text-violet-300">Delegated child task</p>}
                          </article>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>

            <section className="rounded-2xl border border-zinc-800 bg-[#0e0e12] p-4">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.15em] text-zinc-500">Full Execution Log</h2>
              <div className="space-y-2">
                {filteredLog.length === 0 ? (
                  <p className="text-sm text-zinc-500">No log rows match your search.</p>
                ) : (
                  filteredLog.slice(0, 120).map((w) => (
                    <article key={w.id} className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3">
                      <div className="mb-1 flex items-center justify-between">
                        <p className="text-sm font-medium text-zinc-200">{w.actor}</p>
                        <p className="text-xs text-zinc-500">{new Date(w.created_at).toLocaleString()}</p>
                      </div>
                      <p className="text-xs text-zinc-300">{w.action}</p>
                      {w.project && <p className="mt-1 text-[11px] text-zinc-500">Project: {w.project}</p>}
                      {w.details && <p className="mt-1 text-[11px] text-zinc-400 line-clamp-3">{w.details}</p>}
                    </article>
                  ))
                )}
              </div>
            </section>
          </div>
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
