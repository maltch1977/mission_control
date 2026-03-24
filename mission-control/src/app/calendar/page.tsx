"use client";

import { useEffect, useMemo, useState } from "react";
import { Sidebar } from "@/components/sidebar";
import { supabase } from "@/lib/supabase";

type TaskStatus = "recurring" | "backlog" | "in-progress" | "review" | "done";

type Task = {
  id: string;
  title: string;
  owner: "Chad" | "Panda";
  project: string;
  status: TaskStatus;
  due_date: string | null;
};

type ScheduledRun = {
  id: string;
  name: string;
  cadence: string;
  next_run: string;
  owner: string;
};

const defaultRuns: ScheduledRun[] = [
  {
    id: "r1",
    name: "Heartbeat review + task sweep",
    cadence: "Hourly",
    next_run: "Top of next hour",
    owner: "Panda",
  },
  {
    id: "r2",
    name: "Morning priorities digest",
    cadence: "Daily",
    next_run: "08:30",
    owner: "Panda",
  },
];

function formatDate(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export default function CalendarPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [runs, setRuns] = useState<ScheduledRun[]>(defaultRuns);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!supabase) {
        setLoading(false);
        return;
      }

      const [{ data: taskRows }, { data: runRows }] = await Promise.all([
        supabase
          .from("tasks")
          .select("id,title,owner,project,status,due_date")
          .neq("status", "done")
          .not("due_date", "is", null)
          .order("due_date", { ascending: true }),
        supabase
          .from("scheduled_runs")
          .select("id,name,cadence,next_run,owner")
          .order("next_run", { ascending: true })
          .limit(10),
      ]);

      if (taskRows) setTasks(taskRows as Task[]);
      if (runRows && runRows.length > 0) setRuns(runRows as ScheduledRun[]);
      setLoading(false);
    };

    void load();
  }, []);

  const dueByDate = useMemo(() => {
    const grouped = new Map<string, Task[]>();
    tasks.forEach((task) => {
      if (!task.due_date) return;
      const list = grouped.get(task.due_date) ?? [];
      list.push(task);
      grouped.set(task.due_date, list);
    });
    return Array.from(grouped.entries());
  }, [tasks]);

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100">
      <div className="flex min-h-screen w-full">
        <Sidebar />

        <main className="flex-1 p-4 md:p-6">
          <header className="mb-4">
            <p className="text-xs uppercase tracking-[0.15em] text-zinc-500">Calendar</p>
            <h1 className="text-2xl font-semibold text-zinc-50">Scheduled Work + Due Tasks</h1>
            <p className="mt-1 text-sm text-zinc-400">
              Transcript model: this is your proof that proactive work is actually scheduled and running.
            </p>
          </header>

          <section className="mb-4 rounded-xl border border-zinc-800 bg-[#0e0e12] p-4">
            <h2 className="mb-3 text-sm font-semibold">Scheduled Runs</h2>
            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
              {runs.map((run) => (
                <article key={run.id} className="rounded-lg border border-zinc-800 bg-zinc-900/70 p-3">
                  <p className="text-sm font-medium">{run.name}</p>
                  <p className="mt-1 text-xs text-zinc-400">Cadence: {run.cadence}</p>
                  <p className="text-xs text-zinc-400">Next: {run.next_run}</p>
                  <p className="mt-2 text-xs text-zinc-500">Owner: {run.owner}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-zinc-800 bg-[#0e0e12] p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold">Due Tasks Timeline</h2>
              <span className="text-xs text-zinc-500">{loading ? "Syncing..." : `${tasks.length} active with due dates`}</span>
            </div>

            {dueByDate.length === 0 ? (
              <div className="rounded-lg border border-dashed border-zinc-800 p-6 text-sm text-zinc-500">
                No due-dated tasks yet. Add due dates on Tasks board to populate this timeline.
              </div>
            ) : (
              <div className="space-y-4">
                {dueByDate.map(([date, list]) => (
                  <div key={date}>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                      {formatDate(date)}
                    </p>
                    <div className="space-y-2">
                      {list.map((task) => (
                        <article key={task.id} className="rounded-lg border border-zinc-800 bg-zinc-900/70 p-3">
                          <p className="text-sm font-medium text-zinc-100">{task.title}</p>
                          <p className="mt-1 text-xs text-zinc-400">
                            {task.project} · {task.owner} · {task.status}
                          </p>
                        </article>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}
