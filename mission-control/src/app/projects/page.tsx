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
};

type ProjectMeta = {
  id: string;
  name: string;
  description: string;
  status: "Active" | "Planning" | "Paused";
  owner: string;
  priority: "high" | "medium" | "low";
};

type Track = {
  key: "mobile" | "admin" | "sports";
  label: string;
  description: string;
};

const TRACKS: Track[] = [
  { key: "mobile", label: "Kepter Mobile", description: "Phone-first website creation and launch" },
  { key: "admin", label: "Kepter Web/Admin", description: "Ops/admin surface, may merge or deprecate later" },
  { key: "sports", label: "Kepter Sports", description: "Sports tie-in product line" },
];

const seedMeta: ProjectMeta[] = [
  {
    id: "p-kepter-core",
    name: "Kepter Core",
    description: "Umbrella product with 3 execution tracks: Mobile, Web/Admin, Sports.",
    status: "Active",
    owner: "Chad",
    priority: "high",
  },
  {
    id: "p-mission-control",
    name: "Mission Control",
    description: "Operator layer for autonomous execution and evidence.",
    status: "Active",
    owner: "Panda",
    priority: "high",
  },
];

function statusPill(status: ProjectMeta["status"]) {
  if (status === "Active") return "bg-emerald-900/60 text-emerald-300";
  if (status === "Paused") return "bg-zinc-800 text-zinc-300";
  return "bg-violet-900/60 text-violet-300";
}

function priorityPill(priority: ProjectMeta["priority"]) {
  if (priority === "high") return "bg-amber-900/60 text-amber-300";
  if (priority === "medium") return "bg-sky-900/60 text-sky-300";
  return "bg-zinc-800 text-zinc-300";
}

export default function ProjectsPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [meta, setMeta] = useState<ProjectMeta[]>(seedMeta);

  useEffect(() => {
    const load = async () => {
      if (!supabase) return;

      const [{ data: taskRows }, { data: projectRows }] = await Promise.all([
        supabase.from("tasks").select("id,title,owner,project,status"),
        supabase.from("projects").select("id,name,description,status,owner,priority"),
      ]);

      if (taskRows) setTasks(taskRows as Task[]);
      if (projectRows && projectRows.length > 0) setMeta(projectRows as ProjectMeta[]);
    };

    void load();
  }, []);

  const projectCards = useMemo(() => {
    const taskGroups = new Map<string, Task[]>();
    tasks.forEach((task) => {
      const list = taskGroups.get(task.project) ?? [];
      list.push(task);
      taskGroups.set(task.project, list);
    });

    return meta.map((m) => {
      const linked = taskGroups.get(m.name) ?? [];
      const done = linked.filter((t) => t.status === "done").length;
      const total = linked.length;
      const progress = total ? Math.round((done / total) * 100) : 0;
      return { ...m, linked, done, total, progress };
    });
  }, [meta, tasks]);
return (
    <div className="min-h-screen bg-[#0a0a0c] text-zinc-100">
      <div className="mx-auto flex w-full max-w-[1400px]">
        <Sidebar />

        <main className="flex-1 p-6 lg:p-8">
          <div className="mb-6">
            <h1 className="text-xl font-semibold tracking-tight text-zinc-100">Projects</h1>
            <p className="mt-1 text-sm text-zinc-400">Database-driven, operator-first, no fluff.</p>
          </div>

          <section className="mb-6 rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-zinc-200">Kepter Structure</h2>
              <span className="rounded-md bg-zinc-800 px-2 py-1 text-xs text-zinc-300">Umbrella + Tracks</span>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              {TRACKS.map((track) => (
                <div key={track.key} className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
                  <p className="text-sm font-medium text-zinc-100">{track.label}</p>
                  <p className="mt-1 text-xs text-zinc-400">{track.description}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-2">
            {projectCards.map((project) => (
              <article key={project.id} className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-100">{project.name}</h3>
                    <p className="mt-1 text-xs text-zinc-400">{project.description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`rounded-md px-2 py-1 text-[11px] ${statusPill(project.status)}`}>{project.status}</span>
                    <span className={`rounded-md px-2 py-1 text-[11px] ${priorityPill(project.priority)}`}>{project.priority}</span>
                  </div>
                </div>

                <div className="mb-2 flex items-center justify-between text-xs text-zinc-400">
                  <span>Owner: {project.owner}</span>
                  <span>{project.done}/{project.total} done</span>
                </div>

                <div className="h-2 overflow-hidden rounded bg-zinc-800">
                  <div className="h-full bg-zinc-200 transition-all" style={{ width: `${project.progress}%` }} />
                </div>
              </article>
            ))}
          </section>
        </main>
      </div>
    </div>
  );
}
