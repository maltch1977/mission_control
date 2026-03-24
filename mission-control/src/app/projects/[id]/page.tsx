"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Sidebar } from "@/components/sidebar";
import { supabase } from "@/lib/supabase";

type TaskStatus = "recurring" | "backlog" | "in-progress" | "review" | "done";

type ProjectMeta = {
  id: string;
  name: string;
  description: string;
  status: "Active" | "Planning" | "Paused";
  owner: string;
  priority: "high" | "medium" | "low";
};

type Task = {
  id: string;
  title: string;
  owner: "Chad" | "Panda";
  project: string;
  status: TaskStatus;
  due_date?: string | null;
};

type MemoryEntry = {
  id: string;
  title: string;
  date_key: string;
  summary: string;
  tags: string[];
};

type ScheduledRun = {
  id: string;
  name: string;
  cadence: string;
  next_run: string;
  owner: string;
};

function projectTag(name: string) {
  return `project:${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}`;
}

export default function ProjectDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const [project, setProject] = useState<ProjectMeta | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [memory, setMemory] = useState<MemoryEntry[]>([]);
  const [runs, setRuns] = useState<ScheduledRun[]>([]);

  useEffect(() => {
    const load = async () => {
      if (!supabase || !id) return;

      const { data: projectRow } = await supabase
        .from("projects")
        .select("id,name,description,status,owner,priority")
        .eq("id", id)
        .single();

      if (!projectRow) return;
      const p = projectRow as ProjectMeta;
      setProject(p);

      const [{ data: taskRows }, { data: memoryRows }, { data: runRows }] = await Promise.all([
        supabase
          .from("tasks")
          .select("id,title,owner,project,status,due_date")
          .eq("project", p.name)
          .order("created_at", { ascending: false }),
        supabase
          .from("memory_entries")
          .select("id,title,date_key,summary,tags")
          .order("date_key", { ascending: false })
          .limit(200),
        supabase
          .from("scheduled_runs")
          .select("id,name,cadence,next_run,owner")
          .order("created_at", { ascending: false })
          .limit(50),
      ]);

      if (taskRows) setTasks(taskRows as Task[]);

      const pTag = projectTag(p.name);
      const memories = ((memoryRows as MemoryEntry[]) || []).filter((m) => {
        const tags = Array.isArray(m.tags) ? m.tags : [];
        return tags.includes(pTag) || `${m.title} ${m.summary}`.toLowerCase().includes(p.name.toLowerCase());
      });
      setMemory(memories);

      const linkedRuns = ((runRows as ScheduledRun[]) || []).filter((r) =>
        r.name.toLowerCase().includes(p.name.toLowerCase()),
      );
      setRuns(linkedRuns);
    };

    void load();
  }, [id]);

  const stats = useMemo(() => {
    const done = tasks.filter((t) => t.status === "done").length;
    const active = tasks.filter((t) => t.status !== "done").length;
    const progress = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
    return { done, active, progress };
  }, [tasks]);

  const projectTags = useMemo(() => {
    const set = new Set<string>();
    memory.forEach((m) => (Array.isArray(m.tags) ? m.tags : []).forEach((t) => set.add(t)));
    set.add(projectTag(project?.name || "general"));
    return Array.from(set).slice(0, 12);
  }, [memory, project]);

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100">
      <div className="flex min-h-screen w-full">
        <Sidebar />

        <main className="flex-1 p-4 md:p-6">
          <div className="mb-4">
            <Link href="/projects" className="text-xs text-zinc-400 hover:text-zinc-200">
              ← Back to Projects
            </Link>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-100">
              {project?.name || "Project"}
            </h1>
            <p className="mt-1 text-sm text-zinc-400">{project?.description}</p>
          </div>

          <section className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat label="Progress" value={`${stats.progress}%`} />
            <Stat label="Active Tasks" value={String(stats.active)} />
            <Stat label="Done Tasks" value={String(stats.done)} />
            <Stat label="Memory Notes" value={String(memory.length)} />
          </section>

          <section className="mb-4 rounded-xl border border-zinc-800 bg-[#0e0e12] p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.15em] text-zinc-500">Project Tags</p>
            <div className="flex flex-wrap gap-1.5">
              {projectTags.map((tag) => (
                <span key={tag} className="rounded-full bg-zinc-800 px-2 py-1 text-xs text-zinc-300">
                  {tag}
                </span>
              ))}
            </div>
          </section>

          <div className="grid gap-4 xl:grid-cols-3">
            <section className="rounded-xl border border-zinc-800 bg-[#0e0e12] p-4 xl:col-span-2">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.15em] text-zinc-500">Tasks</h2>
              <div className="space-y-2">
                {tasks.length === 0 ? (
                  <p className="text-sm text-zinc-500">No tasks linked yet.</p>
                ) : (
                  tasks.map((task) => (
                    <article key={task.id} className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3">
                      <p className="text-sm font-medium">{task.title}</p>
                      <p className="mt-1 text-xs text-zinc-400">
                        {task.status} · {task.owner} {task.due_date ? `· due ${task.due_date}` : ""}
                      </p>
                    </article>
                  ))
                )}
              </div>
            </section>

            <aside className="space-y-4">
              <section className="rounded-xl border border-zinc-800 bg-[#0e0e12] p-4">
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.15em] text-zinc-500">Memory</h2>
                <div className="space-y-2">
                  {memory.length === 0 ? (
                    <p className="text-sm text-zinc-500">No memory entries linked yet.</p>
                  ) : (
                    memory.slice(0, 8).map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => router.push(`/memory?entry=${m.id}`)}
                        className="w-full rounded-lg border border-zinc-800 bg-zinc-900/60 p-3 text-left hover:border-zinc-700"
                      >
                        <p className="text-sm font-medium">{m.title}</p>
                        <p className="mt-1 text-xs text-zinc-400">{m.date_key}</p>
                        <p className="mt-1 line-clamp-2 text-xs text-zinc-500">{m.summary}</p>
                      </button>
                    ))
                  )}
                </div>
              </section>

              <section className="rounded-xl border border-zinc-800 bg-[#0e0e12] p-4">
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.15em] text-zinc-500">Scheduled Runs</h2>
                <div className="space-y-2">
                  {runs.length === 0 ? (
                    <p className="text-sm text-zinc-500">No scheduled runs matched yet.</p>
                  ) : (
                    runs.map((r) => (
                      <article key={r.id} className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3">
                        <p className="text-sm font-medium">{r.name}</p>
                        <p className="mt-1 text-xs text-zinc-400">{r.cadence} · {r.next_run}</p>
                      </article>
                    ))
                  )}
                </div>
              </section>
            </aside>
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
