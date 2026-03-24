type TaskStatus = "recurring" | "backlog" | "in-progress" | "review";

type Task = {
  id: string;
  title: string;
  description: string;
  owner: "Chad" | "Henry";
  project: string;
  updated: string;
  priority: "high" | "med" | "low";
  status: TaskStatus;
};

type Activity = {
  id: string;
  agent: string;
  text: string;
  time: string;
};

const tasks: Task[] = [
  {
    id: "t1",
    title: "Finalize HMS warm-weather email sequence",
    description: "Update tone and CTA language, then ship final version.",
    owner: "Chad",
    project: "HMS Outreach",
    updated: "5m ago",
    priority: "high",
    status: "review",
  },
  {
    id: "t2",
    title: "Build Mission Control task board v1",
    description: "Next.js local app with Linear-style layout and live activity feed.",
    owner: "Henry",
    project: "Mission Control",
    updated: "just now",
    priority: "high",
    status: "in-progress",
  },
  {
    id: "t3",
    title: "Map cron jobs into Calendar screen",
    description: "Show all scheduled proactive runs in one view.",
    owner: "Henry",
    project: "Mission Control",
    updated: "18m ago",
    priority: "med",
    status: "backlog",
  },
  {
    id: "t4",
    title: "Create docs index for generated assets",
    description: "Searchable archive for drafts, plans, and copy docs.",
    owner: "Henry",
    project: "Mission Control",
    updated: "32m ago",
    priority: "med",
    status: "backlog",
  },
  {
    id: "t5",
    title: "Review social media engine status",
    description: "Confirm whether build started and what artifacts exist.",
    owner: "Chad",
    project: "Ops",
    updated: "1h ago",
    priority: "low",
    status: "recurring",
  },
  {
    id: "t6",
    title: "Define Team screen mission statement",
    description: "Set main objective and role map for all agents.",
    owner: "Henry",
    project: "Mission Control",
    updated: "2h ago",
    priority: "low",
    status: "backlog",
  },
];

const activity: Activity[] = [
  {
    id: "a1",
    agent: "Henry",
    text: "Updated Task Board layout to match Linear-inspired dark UI.",
    time: "just now",
  },
  {
    id: "a2",
    agent: "Henry",
    text: "Added backlog and in-progress cards for Mission Control rollout.",
    time: "4m ago",
  },
  {
    id: "a3",
    agent: "Chad",
    text: "Approved warm-weather outreach direction for HMS sequence.",
    time: "11m ago",
  },
  {
    id: "a4",
    agent: "Henry",
    text: "Pulled transcript notes to map v1 module priorities.",
    time: "17m ago",
  },
  {
    id: "a5",
    agent: "Henry",
    text: "Queued Calendar and Docs screens for phase-two build.",
    time: "22m ago",
  },
];

const navItems = [
  "Tasks",
  "Agents",
  "Approvals",
  "Calendar",
  "Projects",
  "Memory",
  "Docs",
  "Office",
  "Team",
];

const statusLabels: Record<TaskStatus, string> = {
  recurring: "Recurring",
  backlog: "Backlog",
  "in-progress": "In Progress",
  review: "Review",
};

const statusOrder: TaskStatus[] = ["recurring", "backlog", "in-progress", "review"];

const priorityDot: Record<Task["priority"], string> = {
  high: "bg-rose-500",
  med: "bg-amber-500",
  low: "bg-emerald-500",
};

function getTasksByStatus(status: TaskStatus) {
  return tasks.filter((task) => task.status === status);
}

function initials(name: Task["owner"]) {
  return name === "Chad" ? "C" : "H";
}

export default function Home() {
  const inProgress = getTasksByStatus("in-progress").length;
  const completed = tasks.filter((task) => task.status === "review").length;
  const completion = Math.round((completed / tasks.length) * 100);

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100">
      <div className="mx-auto flex min-h-screen max-w-[1600px]">
        <aside className="hidden w-64 shrink-0 border-r border-zinc-800/80 bg-[#0d0d10] p-5 lg:block">
          <div className="mb-6 flex items-center gap-2">
            <div className="h-7 w-7 rounded-md bg-violet-500/90" />
            <p className="text-sm font-semibold tracking-wide">Mission Control</p>
          </div>

          <nav className="space-y-1">
            {navItems.map((item) => (
              <button
                key={item}
                className={`w-full rounded-lg px-3 py-2 text-left text-sm transition ${
                  item === "Tasks"
                    ? "bg-zinc-800 text-zinc-50"
                    : "text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200"
                }`}
              >
                {item}
              </button>
            ))}
          </nav>
        </aside>

        <main className="flex-1 p-4 md:p-6">
          <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.15em] text-zinc-500">Tasks</p>
              <h1 className="text-2xl font-semibold text-zinc-50">Task Board</h1>
            </div>

            <div className="flex items-center gap-2 text-sm">
              <button className="rounded-lg bg-violet-600 px-3 py-2 font-medium text-white hover:bg-violet-500">
                + New Task
              </button>
              <button className="rounded-lg border border-zinc-700 px-3 py-2 text-zinc-300 hover:bg-zinc-800">
                Ping Henry
              </button>
            </div>
          </header>

          <section className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatCard label="This week" value="19" accent="text-emerald-400" />
            <StatCard label="In progress" value={String(inProgress)} accent="text-violet-400" />
            <StatCard label="Total" value={String(tasks.length)} accent="text-zinc-100" />
            <StatCard label="Completion" value={`${completion}%`} accent="text-fuchsia-400" />
          </section>

          <div className="grid gap-4 xl:grid-cols-[1fr_310px]">
            <section className="overflow-x-auto rounded-xl border border-zinc-800 bg-[#0e0e12] p-3">
              <div className="grid min-w-[980px] grid-cols-4 gap-3">
                {statusOrder.map((status) => (
                  <div key={status} className="rounded-lg bg-zinc-950/40 p-2">
                    <div className="mb-2 flex items-center justify-between px-2 py-1">
                      <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                        {statusLabels[status]} {getTasksByStatus(status).length}
                      </p>
                      <button className="text-zinc-500 hover:text-zinc-300">+</button>
                    </div>

                    <div className="space-y-2">
                      {getTasksByStatus(status).length === 0 ? (
                        <div className="rounded-md border border-dashed border-zinc-800 p-5 text-center text-xs text-zinc-500">
                          No tasks
                        </div>
                      ) : (
                        getTasksByStatus(status).map((task) => (
                          <article
                            key={task.id}
                            className="rounded-lg border border-zinc-800 bg-zinc-900/80 p-3 shadow-[0_0_0_1px_rgba(24,24,27,.2)]"
                          >
                            <div className="mb-2 flex items-start gap-2">
                              <span
                                className={`mt-1 h-2 w-2 shrink-0 rounded-full ${priorityDot[task.priority]}`}
                              />
                              <h3 className="line-clamp-2 text-sm font-medium text-zinc-100">{task.title}</h3>
                            </div>
                            <p className="mb-3 line-clamp-2 text-xs text-zinc-400">{task.description}</p>
                            <div className="flex items-center justify-between text-xs">
                              <span className="rounded-full bg-zinc-800 px-2 py-1 text-zinc-300">
                                {task.project}
                              </span>
                              <span className="text-zinc-500">{task.updated}</span>
                            </div>
                            <div className="mt-3 flex items-center gap-2">
                              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-zinc-700 text-[10px] font-semibold text-zinc-100">
                                {initials(task.owner)}
                              </span>
                              <span className="text-xs text-zinc-400">{task.owner}</span>
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
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold">Live Activity</h2>
                <span className="text-xs text-zinc-500">Real-time</span>
              </div>
              <div className="space-y-2">
                {activity.map((entry) => (
                  <div key={entry.id} className="rounded-lg border border-zinc-800 bg-zinc-900/70 p-3">
                    <div className="mb-1 flex items-center justify-between">
                      <p className="text-sm font-medium text-zinc-200">{entry.agent}</p>
                      <span className="text-xs text-zinc-500">{entry.time}</span>
                    </div>
                    <p className="text-xs leading-5 text-zinc-400">{entry.text}</p>
                  </div>
                ))}
              </div>
            </aside>
          </div>
        </main>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-[#0e0e12] p-4">
      <p className="text-xs uppercase tracking-wide text-zinc-500">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${accent}`}>{value}</p>
    </div>
  );
}
