"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
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

const seedMeta: ProjectMeta[] = [
  {
    id: "p1",
    name: "Mission Control",
    description: "Central dashboard for tasks, approvals, activity, docs, and planning.",
    status: "Active",
    owner: "Panda",
    priority: "high",
  },
];

const blankProject = {
  name: "",
  description: "",
  status: "Planning" as ProjectMeta["status"],
  owner: "Panda",
  priority: "medium" as ProjectMeta["priority"],
};

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
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [meta, setMeta] = useState<ProjectMeta[]>(seedMeta);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState(blankProject);

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

  const reset = () => {
    setDraft(blankProject);
    setEditingId(null);
  };

  const submitProject = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!draft.name.trim()) return;

    if (editingId) {
      const updated = { ...draft, id: editingId, name: draft.name.trim(), description: draft.description.trim() };
      setMeta((prev) => prev.map((p) => (p.id === editingId ? updated : p)));
      if (supabase) await supabase.from("projects").upsert(updated);
      reset();
      return;
    }

    const created = {
      id: crypto.randomUUID(),
      name: draft.name.trim(),
      description: draft.description.trim(),
      status: draft.status,
      owner: draft.owner,
      priority: draft.priority,
    };
    setMeta((prev) => [created, ...prev]);
    if (supabase) await supabase.from("projects").insert(created);
    reset();
  };

  const beginEdit = (project: ProjectMeta) => {
    setEditingId(project.id);
    setDraft({
      name: project.name,
      description: project.description,
      status: project.status,
      owner: project.owner,
      priority: project.priority,
    });
  };

  const removeProject = async (id: string) => {
    setMeta((prev) => prev.filter((p) => p.id !== id));
    if (supabase) await supabase.from("projects").delete().eq("id", id);
    if (editingId === id) reset();
  };

  const activeCount = projectCards.filter((p) => p.status === "Active").length;
  const planningCount = projectCards.filter((p) => p.status === "Planning").length;

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100">
      <div className="flex min-h-screen w-full">
        <Sidebar />

        <main className="flex-1 p-4 md:p-6">
          <header className="mb-4">
            <p className="text-xs uppercase tracking-[0.15em] text-zinc-500">Projects</p>
            <h1 className="text-2xl font-semibold text-zinc-50">Projects</h1>
            <p className="mt-1 text-sm text-zinc-400">
              {projectCards.length} total · {activeCount} active · {planningCount} planning
            </p>
          </header>

          <section className="mb-4 rounded-xl border border-zinc-800 bg-[#0e0e12] p-3">
            <p className="text-sm text-zinc-300">Manual entry disabled. Tell Panda what project to add/update and it will be synced here.</p>
          </section>

          <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {projectCards.map((project) => (
              <article
                key={project.id}
                onClick={() => router.push(`/projects/${project.id}`)}
                className="cursor-pointer rounded-xl border border-zinc-800 bg-[#0e0e12] p-4 transition hover:border-zinc-700 hover:bg-zinc-900/60"
              >
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h2 className="text-lg font-semibold text-zinc-100">{project.name}</h2>
                  <span className={`rounded-full px-2 py-1 text-xs ${statusPill(project.status)}`}>{project.status}</span>
                </div>

                <p className="mb-4 line-clamp-2 text-sm text-zinc-400">{project.description}</p>

                {project.name.toLowerCase() !== "mission control" ? (
                  <>
                    <div className="mb-1 flex items-center justify-between text-xs text-zinc-500">
                      <span>{project.progress}%</span>
                      <span>{project.done}/{project.total}</span>
                    </div>
                    <div className="mb-4 h-2 rounded-full bg-zinc-800">
                      <div className="h-full rounded-full bg-emerald-400" style={{ width: `${project.progress}%` }} />
                    </div>
                  </>
                ) : (
                  <div className="mb-4 rounded-lg border border-zinc-800 bg-zinc-900/50 px-2.5 py-2 text-xs text-zinc-400">
                    Ongoing project. Use active tasks and recent memory context as health indicators.
                  </div>
                )}

                <div className="mb-3 flex items-center gap-2 text-xs">
                  <span className="rounded-full bg-zinc-800 px-2 py-1 text-zinc-300">{project.owner}</span>
                  <span className={`rounded-full px-2 py-1 ${priorityPill(project.priority)}`}>{project.priority}</span>
                </div>

                <div className="space-y-1">
                  {project.linked.slice(0, 3).map((t) => (
                    <p key={t.id} className="text-xs text-zinc-400">• {t.title}</p>
                  ))}
                  {project.linked.length === 0 && <p className="text-xs text-zinc-500">No linked tasks yet</p>}
                </div>

                <div className="mt-3 text-[11px] text-zinc-500">Managed by Panda</div>
              </article>
            ))}
          </section>
        </main>
      </div>
    </div>
  );
}
