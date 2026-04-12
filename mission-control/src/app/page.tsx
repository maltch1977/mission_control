"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Sidebar } from "@/components/sidebar";
import { supabase } from "@/lib/supabase";

type TaskStatus = "recurring" | "backlog" | "in-progress" | "review" | "done";
type Priority = "high" | "med" | "low";
type Owner = "Chad" | "Panda";

type ModelTier = "cheap" | "standard" | "premium";

type Task = {
  id: string;
  title: string;
  description: string;
  owner: Owner;
  ownerAgent: string;
  modelTier: ModelTier;
  role?: string;
  parentTaskId?: string;
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
  owner_agent?: string;
  model_tier?: ModelTier;
  role?: string | null;
  parent_task_id?: string | null;
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

type MemoryPulse = {
  id: string;
  title: string;
  summary: string;
  date_key: string;
  tags: string[] | null;
  importance: "high" | "med" | "low";
  created_at?: string | null;
};

type Renewal = {
  id: string;
  name: string;
  amount: number;
  renewal_date: string | null;
  status: "active" | "canceling" | "canceled" | "trial";
  account: "Brex" | "SoFi" | "Mercury";
};

type WorkLogRow = {
  id: string;
  actor: string;
  action: string;
  project: string | null;
  created_at: string;
};

const seedTasks: Task[] = [
  {
    id: "t2",
    title: "Build Mission Control task board v2",
    description: "Add persistence, drag/drop, edit and delete actions.",
    owner: "Panda",
    ownerAgent: "Forge",
    modelTier: "standard",
    role: "engineering",
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

const roleRoutingDefaults: Record<string, { ownerAgent: string; modelTier: ModelTier }> = {
  "chief-of-staff": { ownerAgent: "Panda", modelTier: "standard" },
  social: { ownerAgent: "Mr X", modelTier: "cheap" },
  research: { ownerAgent: "Atlas", modelTier: "standard" },
  engineering: { ownerAgent: "Forge", modelTier: "standard" },
  outreach: { ownerAgent: "Vector", modelTier: "cheap" },
  finance: { ownerAgent: "Ledger", modelTier: "cheap" },
  security: { ownerAgent: "Sentinel", modelTier: "cheap" },
  operations: { ownerAgent: "Panda", modelTier: "cheap" },
};

type RouteRule = {
  fromRoles: string[];
  toAgent: string;
  toRole: string;
  modelTier: ModelTier;
  triggerAny: string[];
  note: string;
};

const routeRules: RouteRule[] = [
  {
    fromRoles: ["security", "research", "social", "finance", "outreach"],
    toAgent: "Forge",
    toRole: "engineering",
    modelTier: "standard",
    triggerAny: ["build", "implement", "integration", "requires:engineering", "api", "bug", "fix", "deploy"],
    note: "Engineering implementation handoff",
  },
  {
    fromRoles: ["social", "outreach", "finance", "engineering", "security"],
    toAgent: "Atlas",
    toRole: "research",
    modelTier: "standard",
    triggerAny: ["research", "analyze", "intel", "competitor", "trend", "validate", "requires:research"],
    note: "Research and intelligence handoff",
  },
  {
    fromRoles: ["research", "outreach", "finance", "engineering"],
    toAgent: "Mr X",
    toRole: "social",
    modelTier: "cheap",
    triggerAny: ["content", "post", "copy", "creative", "campaign", "social", "requires:social"],
    note: "Content production handoff",
  },
  {
    fromRoles: ["research", "social", "finance", "engineering"],
    toAgent: "Vector",
    toRole: "outreach",
    modelTier: "cheap",
    triggerAny: ["outreach", "sequence", "cold email", "prospect", "lead", "follow-up", "requires:outreach"],
    note: "Outreach execution handoff",
  },
  {
    fromRoles: ["research", "social", "engineering", "outreach", "security"],
    toAgent: "Ledger",
    toRole: "finance",
    modelTier: "cheap",
    triggerAny: ["subscription", "billing", "cost", "renewal", "spend", "budget", "invoice", "requires:finance"],
    note: "Finance operations handoff",
  },
  {
    fromRoles: ["engineering", "social", "outreach", "research", "finance"],
    toAgent: "Sentinel",
    toRole: "security",
    modelTier: "cheap",
    triggerAny: ["security", "risk", "exposure", "hardening", "token", "access", "vulnerability", "requires:security"],
    note: "Security and hardening handoff",
  },
];

type OwnerFilter = "all" | Owner;

type TaskDraft = {
  title: string;
  description: string;
  owner: Owner;
  ownerAgent: string;
  modelTier: ModelTier;
  role: string;
  project: string;
  priority: Priority;
  dueDate: string;
  tags: string;
};

const emptyDraft: TaskDraft = {
  title: "",
  description: "",
  owner: "Panda",
  ownerAgent: "Panda",
  modelTier: "cheap",
  role: "operations",
  project: "Inbox",
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
    owner_agent: task.ownerAgent,
    model_tier: task.modelTier,
    role: task.role ?? null,
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
    ownerAgent: row.owner_agent || row.owner,
    modelTier: row.model_tier || "cheap",
    role: row.role || undefined,
    parentTaskId: row.parent_task_id || undefined,
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
  const [memoryPulse, setMemoryPulse] = useState<MemoryPulse[]>([]);
  const [renewals, setRenewals] = useState<Renewal[]>([]);
  const [workLog, setWorkLog] = useState<WorkLogRow[]>([]);

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

      const [{ data: taskRows }, { data: activityRows }, { data: memoryRows }, { data: renewalRows }, { data: workLogRows }] = await Promise.all([
        supabase.from("tasks").select("*").order("created_at", { ascending: false }),
        supabase.from("activity").select("*").order("created_at", { ascending: false }).limit(50),
        supabase.from("memory_entries").select("id,title,summary,date_key,tags,importance,created_at").order("created_at", { ascending: false }).limit(20),
        supabase.from("subscriptions").select("id,name,amount,renewal_date,status,account").order("renewal_date", { ascending: true }).limit(20),
        supabase.from("work_log").select("id,actor,action,project,created_at").order("created_at", { ascending: false }).limit(20),
      ]);

      if (taskRows) setTasks((taskRows as DbTask[]).map(fromDbTask));
      if (activityRows)
        setActivity(
          (activityRows as DbActivity[]).map((r) => ({ id: r.id, agent: r.agent, text: r.text, time: r.time_label || "now" })),
        );
      if (memoryRows) setMemoryPulse(memoryRows as MemoryPulse[]);
      if (renewalRows) setRenewals(renewalRows as Renewal[]);
      if (workLogRows) setWorkLog(workLogRows as WorkLogRow[]);
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

  const blockers = useMemo(
    () => tasks.filter((t) => t.status !== "done" && (t.tags.some((tag) => tag.toLowerCase().includes("blocker")) || t.priority === "high")),
    [tasks],
  );

  const dueSoon = useMemo(() => {
    const now = new Date();
    const soon = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    return tasks.filter((t) => {
      if (!t.dueDate || t.status === "done") return false;
      const due = new Date(`${t.dueDate}T00:00:00`);
      return due <= soon;
    });
  }, [tasks]);

  const topPriorities = useMemo(
    () => tasks.filter((t) => t.status !== "done").sort((a, b) => (a.priority === b.priority ? 0 : a.priority === "high" ? -1 : b.priority === "high" ? 1 : a.priority === "med" ? -1 : 1)).slice(0, 3),
    [tasks],
  );

  const recentDecisions = useMemo(
    () => memoryPulse.filter((m) => (m.tags || []).some((tag) => tag.toLowerCase().includes("type:decision"))).slice(0, 3),
    [memoryPulse],
  );

  const nextRenewals = useMemo(
    () => renewals.filter((r) => !!r.renewal_date && r.status !== "canceled").slice(0, 3),
    [renewals],
  );

  const getTasksByStatus = (status: TaskStatus) => filteredTasks.filter((task) => task.status === status);

  const saveTask = async (task: Task) => {
    if (!supabase) return;
    await supabase.from("tasks").upsert(toDbTask(task));
  };

  const removeTaskDb = async (taskId: string) => {
    if (!supabase) return;
    await supabase.from("tasks").delete().eq("id", taskId);
  };

  const pushActivity = (entry: Omit<Activity, "id" | "time">, meta?: { project?: string; taskId?: string }) => {
    const newItem = { id: crypto.randomUUID(), time: nowLabel(), ...entry };
    setActivity((prev) => [newItem, ...prev].slice(0, 50));
    if (supabase) {
      void supabase.from("activity").insert({
        id: newItem.id,
        agent: newItem.agent,
        text: newItem.text,
        time_label: newItem.time,
      });
      void supabase.from("work_log").insert({
        id: crypto.randomUUID(),
        actor: newItem.agent,
        action: newItem.text.slice(0, 120),
        details: newItem.text,
        project: meta?.project || null,
        related_task_id: meta?.taskId || null,
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
      ownerAgent: task.ownerAgent,
      modelTier: task.modelTier,
      role: task.role || "operations",
      project: task.project,
      priority: task.priority,
      dueDate: task.dueDate || "",
      tags: task.tags.join(", "),
    });
  };

  const submitTask = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const title = taskDraft.title.trim();
 const project = taskDraft.project.trim();
 if (!project) return;
    if (!title) return;

    const roleLower = taskDraft.role.toLowerCase();
    const textBlob = `${taskDraft.title} ${taskDraft.description} ${taskDraft.tags}`.toLowerCase();

    const isPremiumAllowed =
      taskDraft.modelTier !== "premium" ||
      (taskDraft.priority === "high" && roleLower.includes("strategy")) ||
      taskDraft.tags.toLowerCase().includes("allow-premium");

    if (!isPremiumAllowed) {
      pushActivity({
        agent: "Panda",
        text: `Blocked premium model on "${title}". Use standard/cheap or mark high-priority strategy (+ allow-premium tag).`,
      });
      return;
    }

    const matchingRule = routeRules.find((rule) => {
      const fromMatch = rule.fromRoles.some((r) => roleLower.includes(r));
      const triggerMatch = rule.triggerAny.some((k) => textBlob.includes(k));
      return fromMatch && triggerMatch;
    });

    if (editingTaskId) {
      setTasks((prev) => {
        const next = prev.map((task) => {
          if (task.id !== editingTaskId) return task;
          const updatedTask: Task = {
            ...task,
            title,
            description: taskDraft.description.trim() || "No description provided.",
            owner: taskDraft.owner,
            ownerAgent: taskDraft.ownerAgent,
            modelTier: taskDraft.modelTier,
            role: taskDraft.role,
            project: project,
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
      ownerAgent: taskDraft.ownerAgent,
      modelTier: taskDraft.modelTier,
      role: taskDraft.role,
      project: project,
      priority: taskDraft.priority,
      status: matchingRule ? "review" : "backlog",
      updated: nowLabel(),
      dueDate: taskDraft.dueDate || undefined,
      tags: parseTags(taskDraft.tags),
    };

    const delegatedTasks: Task[] = [];
    if (matchingRule) {
      const child: Task = {
        id: crypto.randomUUID(),
        title: `[Delegated:${matchingRule.toRole}] ${newTask.title}`,
        description: `Auto-delegated (${matchingRule.note}) from ${newTask.role || "task"}. Parent task id: ${newTask.id}.\n\n${newTask.description}`,
        owner: "Panda",
        ownerAgent: matchingRule.toAgent,
        modelTier: matchingRule.modelTier,
        role: matchingRule.toRole,
        parentTaskId: newTask.id,
        project: newTask.project,
        priority: newTask.priority,
        status: "backlog",
        updated: nowLabel(),
        dueDate: newTask.dueDate,
        tags: Array.from(new Set([...(newTask.tags || []), "delegated", `requires:${matchingRule.toRole}`])),
      };
      delegatedTasks.push(child);
    }

    setTasks((prev) => [newTask, ...delegatedTasks, ...prev]);
    void saveTask(newTask);
    delegatedTasks.forEach((t) => void saveTask(t));

    if (delegatedTasks.length > 0) {
      const child = delegatedTasks[0];
      pushActivity({
        agent: "Panda",
        text: `Auto-delegated "${newTask.title}" to ${child.ownerAgent} (${child.role}). Parent moved to review until child task completes.`,
      });
    } else {
      pushActivity({ agent: newTask.owner, text: `Created task: ${newTask.title}` });
    }
    resetDraft();
  };

  const moveTask = (taskId: string, direction: "forward" | "back") => {
    setTasks((prev) =>
      prev.map((task) => {
        if (task.id !== taskId) return task;
        const destination = direction === "forward" ? nextStatus[task.status] : prevStatus[task.status];
        if (!destination) return task;

        if (destination === "in-progress" && (!task.ownerAgent || !task.modelTier)) {
          pushActivity({ agent: "Panda", text: `Blocked move to In Progress for "${task.title}". Set owner agent and model tier.` });
          return task;
        }

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
        if (destination === "in-progress" && (!task.ownerAgent || !task.modelTier)) {
          pushActivity({ agent: "Panda", text: `Blocked move to In Progress for "${task.title}". Set owner agent and model tier.` });
          return task;
        }
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
        const updatedTask = { ...task, owner: "Panda" as Owner, ownerAgent: "Panda", updated: nowLabel() };
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
              <p className="text-xs uppercase tracking-[0.15em] text-zinc-300">Tasks</p>
              <h1 className="text-2xl font-semibold text-zinc-50">Task Board {loading ? "· syncing" : ""}</h1>
            </div>
          </header>

          <section className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatCard label="This week" value="19" accent="text-emerald-400" />
            <StatCard label="In progress" value={String(inProgress)} accent="text-violet-400" />
            <StatCard label="Total" value={String(filteredTasks.length)} accent="text-zinc-100" />
            <StatCard label="Completion" value={`${completion}%`} accent="text-fuchsia-400" />
          </section>

          <section className="mb-4 rounded-xl border border-zinc-800 bg-[#0e0e12] p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold">Command Center</h2>
              <span className="text-xs text-zinc-300">Now / Needs Attention / Upcoming</span>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-3">
                <Panel title="Now">
                  {topPriorities.length === 0 ? (
                    <EmptyText text="No active priorities." />
                  ) : (
                    topPriorities.map((t) => <MiniRow key={t.id} title={t.title} meta={`${t.project} · ${t.priority} · ${t.status}`} />)
                  )}
                </Panel>

                <Panel title="Needs Attention">
                  {blockers.length === 0 ? (
                    <EmptyText text="No blockers tagged right now." />
                  ) : (
                    blockers.slice(0, 4).map((t) => <MiniRow key={t.id} title={t.title} meta={`${t.project} · ${t.ownerAgent}`} />)
                  )}
                </Panel>

                <Panel title="Upcoming">
                  {dueSoon.length === 0 ? (
                    <EmptyText text="No due-soon items in next 3 days." />
                  ) : (
                    dueSoon.slice(0, 4).map((t) => <MiniRow key={t.id} title={t.title} meta={`Due ${t.dueDate || "n/a"} · ${t.project}`} />)
                  )}
                </Panel>
              </div>

              <div className="space-y-3">
                <Panel title="Recent Decisions">
                  {recentDecisions.length === 0 ? (
                    <EmptyText text="No recent decision memories yet." />
                  ) : (
                    recentDecisions.map((m) => <MiniRow key={m.id} title={m.title} meta={`${m.date_key} · ${m.importance}`} />)
                  )}
                </Panel>

                <Panel title="Upcoming Renewals (30d)">
                  {nextRenewals.length === 0 ? (
                    <EmptyText text="No upcoming renewals found." />
                  ) : (
                    nextRenewals.map((r) => <MiniRow key={r.id} title={r.name} meta={`${r.renewal_date || "n/a"} · $${Number(r.amount).toFixed(2)} · ${r.account}`} />)
                  )}
                </Panel>

                <Panel title="Recent Execution Activity">
                  {workLog.length === 0 ? (
                    <EmptyText text="No work log entries yet." />
                  ) : (
                    workLog.slice(0, 4).map((w) => <MiniRow key={w.id} title={w.action} meta={`${w.actor} · ${w.project || "Inbox"}`} />)
                  )}
                </Panel>
              </div>
            </div>
          </section>

          <section className="mb-2 flex items-center gap-2 text-sm">
            <span className="text-zinc-300">Owner:</span>
            {(["all", "Chad", "Panda"] as OwnerFilter[]).map((owner) => (
              <button key={owner} type="button" onClick={() => setOwnerFilter(owner)} className={`rounded-md px-3 py-1 ${ownerFilter === owner ? "bg-zinc-700 text-zinc-100" : "bg-zinc-900 text-zinc-300"}`}>{owner}</button>
            ))}
          </section>

          <p className="mb-2 text-xs text-zinc-300">Auto-pickup convention: tag tasks with <span className="rounded bg-zinc-800 px-1 py-[1px] text-zinc-300">auto</span> so Panda can prioritize them during heartbeat sweeps.</p>
          <p className="mb-4 text-xs text-zinc-300">Auto-delegation matrix is active across Security, Research, Social, Outreach, Finance, and Engineering based on role + trigger keywords/tags.</p>

          <div className="space-y-4">
            <section className="rounded-xl border border-zinc-800 bg-[#0e0e12] p-3">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
                {statusOrder.map((status) => (
                  <div key={status} className="rounded-lg bg-zinc-950/40 p-2" onDragOver={(e) => e.preventDefault()} onDrop={() => draggedTaskId && moveTaskToStatus(draggedTaskId, status)}>
                    <div className="mb-2 px-2 py-1"><p className="text-xs font-medium uppercase tracking-wide text-zinc-300">{statusLabels[status]} {getTasksByStatus(status).length}</p></div>
                    <div className="space-y-2">
                      {getTasksByStatus(status).length === 0 ? (
                        <div className="rounded-md border border-dashed border-zinc-800 p-5 text-center text-xs text-zinc-300">Drop task here</div>
                      ) : (
                        getTasksByStatus(status).map((task) => (
                          <article key={task.id} draggable onDragStart={() => setDraggedTaskId(task.id)} onDragEnd={() => setDraggedTaskId(null)} className="rounded-lg border border-zinc-800 bg-zinc-900/80 p-3">
                            <div className="mb-2 flex items-start gap-2"><span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${priorityDot[task.priority]}`} /><h3 className="line-clamp-2 text-sm font-medium text-zinc-100">{task.title}</h3></div>
                            <p className="mb-2 line-clamp-2 text-xs text-zinc-300">{task.description}</p>
                            <div className="mb-2 flex flex-wrap gap-1">{task.tags.map((tag) => <span key={tag} className={`rounded-full px-2 py-[2px] text-[10px] ${tag.toLowerCase() === "auto" ? "bg-violet-900/70 text-violet-200" : "bg-zinc-800 text-zinc-300"}`}>{tag}</span>)}</div>
                            <div className="flex items-center justify-between text-xs"><span className="rounded-full bg-zinc-800 px-2 py-1 text-zinc-300">{task.project}</span><span className="text-zinc-300">{task.dueDate ? `Due ${task.dueDate}` : task.updated}</span></div>
                            <p className="mt-1 text-[11px] text-zinc-300">{task.ownerAgent} · {task.modelTier} · {task.role || "ops"}{task.parentTaskId ? ` · child of ${task.parentTaskId.slice(0, 6)}` : ""}</p>
                            <div className="mt-3 flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2"><span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-zinc-700 text-[10px] font-semibold text-zinc-100">{initials(task.owner)}</span><span className="text-xs text-zinc-300">{task.owner}</span></div>
                              <div className="text-[11px] text-zinc-300">Managed by Panda</div>
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
              <div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-semibold">Live Activity</h2><span className="text-xs text-zinc-300">Real-time</span></div>
              <div className="space-y-2">{activity.map((entry) => <div key={entry.id} className="rounded-lg border border-zinc-800 bg-zinc-900/70 p-3"><div className="mb-1 flex items-center justify-between"><p className="text-sm font-medium text-zinc-200">{entry.agent}</p><span className="text-xs text-zinc-300">{entry.time}</span></div><p className="text-xs leading-5 text-zinc-300">{entry.text}</p></div>)}</div>
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

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
      <p className="mb-2 text-xs uppercase tracking-wide text-zinc-300">{title}</p>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function MiniRow({ title, meta }: { title: string; meta: string }) {
  return (
    <div className="rounded-md border border-zinc-800 bg-zinc-950/60 p-2">
      <p className="text-sm text-zinc-200 line-clamp-1">{title}</p>
      <p className="text-[11px] text-zinc-300">{meta}</p>
    </div>
  );
}

function EmptyText({ text }: { text: string }) {
  return <p className="text-xs text-zinc-300">{text}</p>;
}

function StatCard({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-[#0e0e12] p-4">
      <p className="text-xs uppercase tracking-wide text-zinc-300">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${accent}`}>{value}</p>
    </div>
  );
}
