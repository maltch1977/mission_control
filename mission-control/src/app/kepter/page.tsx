"use client";

import { useEffect, useMemo, useState } from "react";
import { Sidebar } from "@/components/sidebar";
import { supabase } from "@/lib/supabase";

type TaskStatus = "backlog" | "in-progress" | "review" | "done" | "recurring";
type Priority = "high" | "med" | "low";

type Task = {
  id: string;
  title: string;
  description: string;
  project: string;
  status: TaskStatus;
  priority: Priority;
  due_date?: string | null;
  tags?: string[] | null;
  updated?: string;
};

const urgentSeed = [
  "Custom Domain Connect epic with DNS wizard",
  "Fix mobile app live URL base to app.kepter.app",
  "Setup checklist state clarity (done/current/not started)",
  "Global header spacing and button consistency pass",
];

const testingChecklist = [
  "Fresh onboarding flow",
  "Preview opens app.kepter.app/{slug}",
  "Desktop site renders content",
  "Photo upload + retry status accuracy",
  "Theme persistence after relaunch",
  "Contact form submit",
];

export default function KepterPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!supabase) {
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from("tasks")
        .select("id,title,description,project,status,priority,due_date,tags,updated")
        .ilike("project", "%kepter%")
        .order("created_at", { ascending: false })
        .limit(100);

      if (data) setTasks(data as Task[]);
      setLoading(false);
    };

    void load();
  }, []);

  const grouped = useMemo(() => {
    return {
      urgent: tasks.filter((t) => t.priority === "high" && t.status !== "done"),
      inProgress: tasks.filter((t) => t.status === "in-progress"),
      backlog: tasks.filter((t) => t.status === "backlog"),
      done: tasks.filter((t) => t.status === "done"),
    };
  }, [tasks]);

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100">
      <div className="flex min-h-screen w-full">
        <Sidebar />

        <main className="flex-1 p-4 md:p-6">
          <header className="mb-6 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.15em] text-zinc-500">Kepter</p>
              <h1 className="text-2xl font-semibold text-zinc-50">Updates + Urgent Fixes</h1>
              <p className="mt-1 text-sm text-zinc-400">Single view for launch fixes, QA notes, and execution status.</p>
            </div>
          </header>

          <section className="mb-4 grid gap-4 md:grid-cols-2">
            <Card title="Urgent Queue (Top)" subtitle="Ship these first">
              <ul className="space-y-2 text-sm text-zinc-200">
                {urgentSeed.map((item) => (
                  <li key={item} className="rounded-md border border-zinc-800 bg-zinc-900/60 p-2">{item}</li>
                ))}
              </ul>
            </Card>

            <Card title="Testing Checklist" subtitle="Run every build">
              <ul className="space-y-2 text-sm text-zinc-200">
                {testingChecklist.map((item) => (
                  <li key={item} className="rounded-md border border-zinc-800 bg-zinc-900/60 p-2">{item}</li>
                ))}
              </ul>
            </Card>
          </section>

          <section className="grid gap-4 xl:grid-cols-4">
            <TaskCol title={`Urgent from Tasks ${loading ? "· syncing" : `(${grouped.urgent.length})`}`} items={grouped.urgent} />
            <TaskCol title={`In Progress (${grouped.inProgress.length})`} items={grouped.inProgress} />
            <TaskCol title={`Backlog (${grouped.backlog.length})`} items={grouped.backlog} />
            <TaskCol title={`Done (${grouped.done.length})`} items={grouped.done} />
          </section>
        </main>
      </div>
    </div>
  );
}

function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-[#0e0e12] p-4">
      <h2 className="text-sm font-semibold text-zinc-100">{title}</h2>
      {subtitle ? <p className="mb-3 mt-1 text-xs text-zinc-500">{subtitle}</p> : null}
      {children}
    </div>
  );
}

function TaskCol({ title, items }: { title: string; items: Task[] }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-[#0e0e12] p-3">
      <p className="mb-2 text-xs uppercase tracking-wide text-zinc-500">{title}</p>
      <div className="space-y-2">
        {items.length === 0 ? (
          <div className="rounded-md border border-dashed border-zinc-800 p-4 text-xs text-zinc-500">No tasks yet.</div>
        ) : (
          items.map((task) => (
            <article key={task.id} className="rounded-md border border-zinc-800 bg-zinc-900/70 p-3">
              <div className="mb-1 flex items-center gap-2">
                <span
                  className={`h-2 w-2 rounded-full ${
                    task.priority === "high" ? "bg-rose-500" : task.priority === "med" ? "bg-amber-500" : "bg-emerald-500"
                  }`}
                />
                <p className="text-sm text-zinc-100">{task.title}</p>
              </div>
              <p className="line-clamp-2 text-xs text-zinc-400">{task.description || "No description"}</p>
              <p className="mt-2 text-[11px] text-zinc-500">{task.project} {task.due_date ? `· due ${task.due_date}` : ""}</p>
            </article>
          ))
        )}
      </div>
    </div>
  );
}
