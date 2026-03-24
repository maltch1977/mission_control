"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Sidebar } from "@/components/sidebar";
import { supabase } from "@/lib/supabase";

type TaskStatus = "recurring" | "backlog" | "in-progress" | "review" | "done";
type Priority = "high" | "med" | "low";
type Owner = "Chad" | "Panda";

type Task = {
  id: string;
  title: string;
  description: string;
  owner: Owner;
  project: string;
  updated: string;
  priority: Priority;
  status: TaskStatus;
  dueDate?: string;
  tags: string[];
};

type Activity = {
  id: string;
  agent: string;
  text: string;
  time: string;
};

type DbTask = {
  id: string;
  title: string;
  description: string;
  owner: Owner;
  project: string;
  updated: string;
  priority: Priority;
  status: TaskStatus;
  due_date: string | null;
  tags: string[] | null;
};

type DbActivity = {
  id: string;
  agent: string;
  text: string;
  time_label: string | null;
};

const seedTasks: Task[] = [
  {
    id: "t2",
    title: "Build Mission Control task board v2",
    description: "Add persistence, drag/drop, edit and delete actions.",
    owner: "Panda",
    project: "Mission Control",
    updated: "just now",
    priority: "high",
    status: "in-progress",
    dueDate: "2026-03-24",
    tags: ["product", "ui"],
  },
];

const seedActivity: Activity[] = [
  {
    id: "a1",
    agent: "Panda",
    text: "Mission Control ready. Add tasks and run the board.",
    time: "just now",
  },
];


const statusLabels: Record<TaskStatus, string> = {
  recurring: "Recurring",
  backlog: "Backlog",
  "in-progress": "In Progress",
  review: "Review",
  done: "Done",
};

const statusOrder: TaskStatus[] = ["recurring", "backlog", "in-progress", "review", "done"];

const nextStatus: Record<TaskStatus, TaskStatus | null> = {
  recurring: "backlog",
  backlog: "in-progress",
  "in-progress": "review",
  review: "done",
  done: null,
};

const prevStatus: Record<TaskStatus, TaskStatus | null> = {
  recurring: null,
  backlog: "recurring",
  "in-progress": "backlog",
  review: "in-progress",
  done: "review",
};

const priorityDot: Record<Priority, string> = {
  high: "bg-rose-500",
  med: "bg-amber-500",
  low: "bg-emerald-500",
};

const TASKS_KEY = "mission-control.tasks.v3";
const ACTIVITY_KEY = "mission-control.activity.v3";

type OwnerFilter = "all" | Owner;

type TaskDraft = {
  title: string;
  description: string;
  owner: Owner;
  project: string;
  priority: Priority;
  dueDate: string;
  tags: string;
};

const emptyDraft: TaskDraft = {
  title: "",
  description: "",
  owner: "Panda",
  project: "",
  priority: "med",
  dueDate: "",
  tags: "",
};

function nowLabel() {
  return "just now";
}

function toDbTask(task: Task) {
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    owner: task.owner,
    project: task.project,
    updated: task.updated,
    priority: task.priority,
    status: task.status,
    due_date: task.dueDate ?? null,
    tags: task.tags,
  };
}

function fromDbTask(row: DbTask): Task {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    owner: row.owner,
    project: row.project,
    updated: row.updated,
    priority: row.priority,
    status: row.status,
    dueDate: row.due_date ?? undefined,
    tags: Array.isArray(row.tags) ? row.tags : [],
  };
}

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>(seedTasks);
  const [activity, setActivity] = useState<Activity[]>(seedActivity);
  const [ownerFilter, setOwnerFilter] = useState<OwnerFilter>("all");
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [taskDraft, setTaskDraft] = useState<TaskDraft>(emptyDraft);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const boot = async () => {
      if (!supabase) {
        try {
          const rawTasks = localStorage.getItem(TASKS_KEY);
          const rawActivity = localStorage.getItem(ACTIVITY_KEY);
          if (rawTasks) setTasks(JSON.parse(rawTasks));
          if (rawActivity) setActivity(JSON.parse(rawActivity));
        } catch {
          // ignore
        } finally {
          setLoading(false);
        }
        return;
      }

      const [{ data: taskRows }, { data: activityRows }] = await Promise.all([
        supabase.from("tasks").select("*").order("created_at", { ascending: false }),
        supabase.from("activity").select("*").order("created_at", { ascending: false }).limit(50),
      ]);

      if (taskRows) setTasks((taskRows as DbTask[]).map(fromDbTask));
      if (activityRows)
        setActivity(
          (activityRows as DbActivity[]).map((r) => ({ id: r.id, agent: r.agent, text: r.text, time: r.time_label || "now" })),
        );
      setLoading(false);
    };

    void boot();
  }, []);

  useEffect(() => {
    if (supabase) return;
    localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    if (supabase) return;
    localStorage.setItem(ACTIVITY_KEY, JSON.stringify(activity.slice(0, 50)));
  }, [activity]);

  const filteredTasks = useMemo(
    () => tasks.filter((task) => ownerFilter === "all" || task.owner === ownerFilter),
    [tasks, ownerFilter],
  );

  const inProgress = filteredTasks.filter((task) => task.status === "in-progress").length;
  const completed = filteredTasks.filter((task) => task.status === "done").length;
  const completion = filteredTasks.length ? Math.round((completed / filteredTasks.length) * 100) : 0;

  const getTasksByStatus = (status: TaskStatus) => filteredTasks.filter((task) => task.status === status);

  const saveTask = async (task: Task) => {
    if (!supabase) return;
    await supabase.from("tasks").upsert(toDbTask(task));
  };

  const removeTaskDb = async (taskId: string) => {
    if (!supabase) return;
    await supabase.from("tasks").delete().eq("id", taskId);
  };

  const pushActivity = (entry: Omit<Activity, "id" | "time">) => {
    const newItem = { id: crypto.randomUUID(), time: nowLabel(), ...entry };
    setActivity((prev) => [newItem, ...prev].slice(0, 50));
    if (supabase) {
      void supabase.from("activity").insert({
        id: newItem.id,
        agent: newItem.agent,
        text: newItem.text,
        time_label: newItem.time,
      });
    }
  };

  const resetDraft = () => {
    setTaskDraft(emptyDraft);
    setEditingTaskId(null);
  };

  const parseTags = (raw: string) =>
    raw
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean)
      .slice(0, 5);

  const openForEdit = (task: Task) => {
    setEditingTaskId(task.id);
    setTaskDraft({
      title: task.title,
      description: task.description,
      owner: task.owner,
      project: task.project,
      priority: task.priority,
      dueDate: task.dueDate || "",
      tags: task.tags.join(", "),
    });
  };

  const submitTask = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const title = taskDraft.title.trim();
    if (!title) return;

    if (editingTaskId) {
      setTasks((prev) => {
        const next = prev.map((task) => {
          if (task.id !== editingTaskId) return task;
          const updatedTask: Task = {
            ...task,
            title,
            description: taskDraft.description.trim() || "No description provided.",
            owner: taskDraft.owner,
            project: taskDraft.project.trim() || "General",
            priority: taskDraft.priority,
            dueDate: taskDraft.dueDate || undefined,
            tags: parseTags(taskDraft.tags),
            updated: nowLabel(),
          };
          void saveTask(updatedTask);
          return updatedTask;
        });
        return next;
      });
      pushActivity({ agent: taskDraft.owner, text: `Updated task: ${title}` });
      resetDraft();
      return;
    }

    const newTask: Task = {
      id: crypto.randomUUID(),
      title,
      description: taskDraft.description.trim() || "No description provided.",
      owner: taskDraft.owner,
      project: taskDraft.project.trim() || "General",
      priority: taskDraft.priority,
      status: "backlog",
      updated: nowLabel(),
      dueDate: taskDraft.dueDate || undefined,
      tags: parseTags(taskDraft.tags),
    };

    setTasks((prev) => [newTask, ...prev]);
    void saveTask(newTask);
    pushActivity({ agent: newTask.owner, text: `Created task: ${newTask.title}` });
    resetDraft();
  };

  const moveTask = (taskId: string, direction: "forward" | "back") => {
    setTasks((prev) =>
      prev.map((task) => {
        if (task.id !== taskId) return task;
        const destination = direction === "forward" ? nextStatus[task.status] : prevStatus[task.status];
        if (!destination) return task;

        const updatedTask = { ...task, status: destination, updated: nowLabel() };
        void saveTask(updatedTask);
        pushActivity({
          agent: task.owner,
          text: `Moved "${task.title}" from ${statusLabels[task.status]} to ${statusLabels[destination]}.`,
        });
        return updatedTask;
      }),
    );
  };

  const moveTaskToStatus = (taskId: string, destination: TaskStatus) => {
    setTasks((prev) =>
      prev.map((task) => {
        if (task.id !== taskId || task.status === destination) return task;
        const updatedTask = { ...task, status: destination, updated: nowLabel() };
        void saveTask(updatedTask);
        pushActivity({
          agent: task.owner,
          text: `Moved "${task.title}" from ${statusLabels[task.status]} to ${statusLabels[destination]}.`,
        });
        return updatedTask;
      }),
    );
  };

  const assignToPanda = (taskId: string) => {
    setTasks((prev) =>
      prev.map((task) => {
        if (task.id !== taskId || task.owner === "Panda") return task;
        const updatedTask = { ...task, owner: "Panda" as Owner, updated: nowLabel() };
        void saveTask(updatedTask);
        pushActivity({ agent: "Panda", text: `Task assigned to Panda: ${task.title}` });
        return updatedTask;
      }),
    );
  };

  const deleteTask = (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    void removeTaskDb(taskId);
    pushActivity({ agent: task.owner, text: `Deleted task: ${task.title}` });
    if (editingTaskId === taskId) resetDraft();
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100">
      <div className="flex min-h-screen w-full">
        <Sidebar />

        <main className="flex-1 p-4 md:p-6">
          <header className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.15em] text-zinc-500">Tasks</p>
              <h1 className="text-2xl font-semibold text-zinc-50">Task Board {loading ? "· syncing" : ""}</h1>
            </div>
          </header>

          <section className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatCard label="This week" value="19" accent="text-emerald-400" />
            <StatCard label="In progress" value={String(inProgress)} accent="text-violet-400" />
            <StatCard label="Total" value={String(filteredTasks.length)} accent="text-zinc-100" />
            <StatCard label="Completion" value={`${completion}%`} accent="text-fuchsia-400" />
          </section>

          <section className="mb-4 rounded-xl border border-zinc-800 bg-[#0e0e12] p-3">
            <form className="grid gap-2 md:grid-cols-10" onSubmit={submitTask}>
              <input value={taskDraft.title} onChange={(e) => setTaskDraft((p) => ({ ...p, title: e.target.value }))} placeholder="Task title" className="md:col-span-3 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm" />
              <input value={taskDraft.project} onChange={(e) => setTaskDraft((p) => ({ ...p, project: e.target.value }))} placeholder="Project" className="md:col-span-2 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm" />
              <select value={taskDraft.owner} onChange={(e) => setTaskDraft((p) => ({ ...p, owner: e.target.value as Owner }))} className="rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-2 text-sm"><option>Panda</option><option>Chad</option></select>
              <select value={taskDraft.priority} onChange={(e) => setTaskDraft((p) => ({ ...p, priority: e.target.value as Priority }))} className="rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-2 text-sm"><option value="high">High</option><option value="med">Med</option><option value="low">Low</option></select>
              <input type="date" value={taskDraft.dueDate} onChange={(e) => setTaskDraft((p) => ({ ...p, dueDate: e.target.value }))} className="rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-2 text-sm" />
              <input value={taskDraft.tags} onChange={(e) => setTaskDraft((p) => ({ ...p, tags: e.target.value }))} placeholder="tags: auto, launch" className="md:col-span-2 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm" />
              <textarea value={taskDraft.description} onChange={(e) => setTaskDraft((p) => ({ ...p, description: e.target.value }))} placeholder="Description" className="md:col-span-8 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm" rows={2} />
              <div className="md:col-span-2 flex items-start gap-2">
                <button className="rounded-lg bg-violet-600 px-3 py-2 font-medium text-white hover:bg-violet-500" type="submit">{editingTaskId ? "Save Task" : "+ New Task"}</button>
                {editingTaskId && <button type="button" onClick={resetDraft} className="rounded-lg border border-zinc-700 px-3 py-2 text-zinc-300">Cancel</button>}
              </div>
            </form>
          </section>

          <section className="mb-2 flex items-center gap-2 text-sm">
            <span className="text-zinc-400">Owner:</span>
            {(["all", "Chad", "Panda"] as OwnerFilter[]).map((owner) => (
              <button key={owner} type="button" onClick={() => setOwnerFilter(owner)} className={`rounded-md px-3 py-1 ${ownerFilter === owner ? "bg-zinc-700 text-zinc-100" : "bg-zinc-900 text-zinc-400"}`}>{owner}</button>
            ))}
          </section>

          <p className="mb-4 text-xs text-zinc-500">Auto-pickup convention: tag tasks with <span className="rounded bg-zinc-800 px-1 py-[1px] text-zinc-300">auto</span> so Panda can prioritize them during heartbeat sweeps.</p>

          <div className="space-y-4">
            <section className="rounded-xl border border-zinc-800 bg-[#0e0e12] p-3">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
                {statusOrder.map((status) => (
                  <div key={status} className="rounded-lg bg-zinc-950/40 p-2" onDragOver={(e) => e.preventDefault()} onDrop={() => draggedTaskId && moveTaskToStatus(draggedTaskId, status)}>
                    <div className="mb-2 px-2 py-1"><p className="text-xs font-medium uppercase tracking-wide text-zinc-400">{statusLabels[status]} {getTasksByStatus(status).length}</p></div>
                    <div className="space-y-2">
                      {getTasksByStatus(status).length === 0 ? (
                        <div className="rounded-md border border-dashed border-zinc-800 p-5 text-center text-xs text-zinc-500">Drop task here</div>
                      ) : (
                        getTasksByStatus(status).map((task) => (
                          <article key={task.id} draggable onDragStart={() => setDraggedTaskId(task.id)} onDragEnd={() => setDraggedTaskId(null)} className="rounded-lg border border-zinc-800 bg-zinc-900/80 p-3">
                            <div className="mb-2 flex items-start gap-2"><span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${priorityDot[task.priority]}`} /><h3 className="line-clamp-2 text-sm font-medium text-zinc-100">{task.title}</h3></div>
                            <p className="mb-2 line-clamp-2 text-xs text-zinc-400">{task.description}</p>
                            <div className="mb-2 flex flex-wrap gap-1">{task.tags.map((tag) => <span key={tag} className={`rounded-full px-2 py-[2px] text-[10px] ${tag.toLowerCase() === "auto" ? "bg-violet-900/70 text-violet-200" : "bg-zinc-800 text-zinc-300"}`}>{tag}</span>)}</div>
                            <div className="flex items-center justify-between text-xs"><span className="rounded-full bg-zinc-800 px-2 py-1 text-zinc-300">{task.project}</span><span className="text-zinc-500">{task.dueDate ? `Due ${task.dueDate}` : task.updated}</span></div>
                            <div className="mt-3 flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2"><span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-zinc-700 text-[10px] font-semibold text-zinc-100">{initials(task.owner)}</span><span className="text-xs text-zinc-400">{task.owner}</span></div>
                              <div className="flex items-center gap-1">
                                <button type="button" onClick={() => moveTask(task.id, "back")} disabled={!prevStatus[task.status]} className="rounded bg-zinc-800 px-2 py-1 text-xs text-zinc-300 disabled:opacity-30">←</button>
                                <button type="button" onClick={() => moveTask(task.id, "forward")} disabled={!nextStatus[task.status]} className="rounded bg-zinc-800 px-2 py-1 text-xs text-zinc-300 disabled:opacity-30">→</button>
                                <button type="button" onClick={() => assignToPanda(task.id)} disabled={task.owner === "Panda"} className="rounded bg-zinc-800 px-2 py-1 text-xs text-violet-300 disabled:opacity-40">Panda</button>
                                <button type="button" onClick={() => openForEdit(task)} className="rounded bg-zinc-800 px-2 py-1 text-xs text-zinc-300">Edit</button>
                                <button type="button" onClick={() => deleteTask(task.id)} className="rounded bg-zinc-800 px-2 py-1 text-xs text-rose-300">Del</button>
                              </div>
                            </div>
                          </article>
                        ))
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <aside className="rounded-xl border border-zinc-800 bg-[#0e0e12] p-3">
              <div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-semibold">Live Activity</h2><span className="text-xs text-zinc-500">Real-time</span></div>
              <div className="space-y-2">{activity.map((entry) => <div key={entry.id} className="rounded-lg border border-zinc-800 bg-zinc-900/70 p-3"><div className="mb-1 flex items-center justify-between"><p className="text-sm font-medium text-zinc-200">{entry.agent}</p><span className="text-xs text-zinc-500">{entry.time}</span></div><p className="text-xs leading-5 text-zinc-400">{entry.text}</p></div>)}</div>
            </aside>
          </div>
        </main>
      </div>
    </div>
  );
}

function initials(name: Owner) {
  return name === "Chad" ? "C" : "P";
}

function StatCard({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-[#0e0e12] p-4">
      <p className="text-xs uppercase tracking-wide text-zinc-500">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${accent}`}>{value}</p>
    </div>
  );
}
