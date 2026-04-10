"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Sidebar } from "@/components/sidebar";
import { supabase } from "@/lib/supabase";

type AgentStatus = "idle" | "working" | "blocked" | "review";

type Agent = {
  id: string;
  name: string;
  role: string;
  model: string;
  status: AgentStatus;
  last_active: string;
  mission: string | null;
};

type Task = { id: string; owner: string; status: string; title?: string; parent_task_id?: string | null; updated?: string };

type DepartmentConfig = {
  key: string;
  title: string;
  accent: string;
  badge: string;
  leadName: string;
  fallbackRole: string;
  modelDefault: string;
  capabilities: string[];
};

const departmentConfigs: DepartmentConfig[] = [
  {
    key: "ops-control",
    title: "Ops Control",
    accent: "bg-[#0b0b0e] border-l-2 border-amber-400/70",
    badge: "text-zinc-200 bg-zinc-800 border border-zinc-700",
    leadName: "Sentinel",
    fallbackRole: "Ops Control Lead",
    modelDefault: "Kimi",
    capabilities: [
      "Heartbeat and cron integrity",
      "Stale-task detection",
      "System reliability alerts",
      "Daily efficiency score",
    ],
  },
  {
    key: "kepter-release",
    title: "Kepter Release",
    accent: "from-sky-800/40 via-indigo-900/20 to-zinc-950",
    badge: "text-sky-200 bg-sky-500/20 border border-sky-400/30",
    leadName: "Forge",
    fallbackRole: "Release Lead",
    modelDefault: "Codex",
    capabilities: [
      "TestFlight blocker triage",
      "Go/no-go release checks",
      "Bug-to-task conversion",
      "Hotfix release flow",
    ],
  },
  {
    key: "social-execution",
    title: "Social Execution",
    accent: "bg-[#0b0b0e] border-l-2 border-pink-400/70",
    badge: "text-zinc-200 bg-zinc-800 border border-zinc-700",
    leadName: "Mr X",
    fallbackRole: "Social Lead",
    modelDefault: "Kimi",
    capabilities: [
      "Weekly content planning",
      "Daily ready-to-post assets",
      "Posting cadence tracking",
      "Performance iteration",
    ],
  },
  {
    key: "research",
    title: "Research",
    accent: "from-violet-800/40 via-fuchsia-900/20 to-zinc-950",
    badge: "text-violet-200 bg-violet-500/20 border border-violet-400/30",
    leadName: "Atlas",
    fallbackRole: "Research Lead",
    modelDefault: "Codex",
    capabilities: [
      "AI/market intelligence",
      "Trend and competitor tracking",
      "Strategic synthesis",
      "Decision support briefs",
    ],
  },
];

const seeds: Agent[] = [
  { id: "a1", name: "Panda", role: "Chief of Staff", model: "Codex", status: "working", last_active: "just now", mission: "Route priorities and enforce execution contracts." },
  { id: "a2", name: "Sentinel", role: "Ops Control", model: "Codex", status: "working", last_active: "just now", mission: "Own heartbeat/crons integrity and raise reliability alerts." },
  { id: "a3", name: "Forge", role: "Kepter Release", model: "Codex", status: "working", last_active: "today", mission: "Drive TestFlight blockers to release-ready state." },
  { id: "a4", name: "Mr X", role: "Social Execution", model: "Codex", status: "idle", last_active: "today", mission: "Produce and track daily social outputs." },
  { id: "a5", name: "Atlas", role: "Research", model: "Codex", status: "idle", last_active: "today", mission: "Support launch decisions with targeted research." },
];

const blank = { name: "", role: "", model: "Kimi", status: "idle" as AgentStatus, mission: "" };

const roleModelDefaults: Record<string, string> = {
  "Chief of Staff": "Codex",
  "Ops Control": "Codex",
  "Kepter Release": "Codex",
  "Social Execution": "Codex",
  Research: "Codex",
};

function modelLabel(model: string) {
  const m = model.toLowerCase();
  if (m.includes("kimi")) return "Kimi 2.5K";
  if (m.includes("sonnet")) return "Sonnet";
  if (m.includes("opus")) return "Opus";
  if (m.includes("codex")) return "Codex";
  return model;
}

function backupModel(primary: string) {
  const m = primary.toLowerCase();
  if (m.includes("kimi")) return "Codex";
  if (m.includes("sonnet")) return "Kimi 2.5K";
  if (m.includes("codex")) return "Kimi 2.5K";
  if (m.includes("opus")) return "Sonnet";
  return "Kimi 2.5K";
}

function statusPill(status: AgentStatus) {
  if (status === "working") return "bg-emerald-900/60 text-emerald-300";
  if (status === "blocked") return "bg-rose-900/60 text-rose-300";
  if (status === "review") return "bg-amber-900/60 text-amber-300";
  return "bg-zinc-800 text-zinc-300";
}

function departmentActiveCount(agents: Agent[], cfg: DepartmentConfig, tasks: Task[]) {
  const lead = agents.find((a) => a.name.toLowerCase() === cfg.leadName.toLowerCase());
  if (!lead) return 0;
  return tasks.filter((t) => t.owner.toLowerCase() === lead.name.toLowerCase() && t.status !== "done").length;
}

export default function TeamPage() {
  const [agents, setAgents] = useState<Agent[]>(seeds);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [draft, setDraft] = useState(blank);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<{ name: string; role: string; model: string; status: AgentStatus; mission: string }>({
    name: "",
    role: "",
    model: "Kimi",
    status: "idle",
    mission: "",
  });

  useEffect(() => {
    const load = async () => {
      if (!supabase) return;
      const [{ data: aRows }, { data: tRows }] = await Promise.all([
        supabase
          .from("agents_org")
          .select("id,name,role,model,status,last_active,mission")
          .order("created_at", { ascending: true }),
        supabase.from("tasks").select("id,owner,status,title,parent_task_id,updated"),
      ]);

      if (aRows && aRows.length > 0) setAgents(aRows as Agent[]);
      if (tRows) setTasks(tRows as Task[]);

      if ((!aRows || aRows.length === 0) && supabase) {
        await supabase.from("agents_org").insert(seeds);
      }
    };
    void load();
  }, []);

  const addAgent = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!draft.name.trim() || !draft.role.trim()) return;
    const row: Agent = {
      id: crypto.randomUUID(),
      name: draft.name.trim(),
      role: draft.role.trim(),
      model: draft.model.trim(),
      status: draft.status,
      last_active: "just now",
      mission: draft.mission.trim() || null,
    };
    setAgents((prev) => [...prev, row]);
    setDraft(blank);
    if (supabase) await supabase.from("agents_org").insert(row);
  };

  const beginEdit = (agent: Agent) => {
    setEditingId(agent.id);
    setEditDraft({
      name: agent.name,
      role: agent.role,
      model: agent.model,
      status: agent.status,
      mission: agent.mission || "",
    });
  };

  const saveEdit = async () => {
    if (!editingId) return;
    const updated = {
      id: editingId,
      name: editDraft.name.trim(),
      role: editDraft.role.trim(),
      model: editDraft.model.trim(),
      status: editDraft.status,
      mission: editDraft.mission.trim() || null,
      last_active: "just now",
    };
    setAgents((prev) => prev.map((a) => (a.id === editingId ? { ...a, ...updated } : a)));
    if (supabase) await supabase.from("agents_org").upsert(updated);
    setEditingId(null);
  };


  const chief = useMemo(() => agents.find((a) => a.name.toLowerCase() === "panda") || seeds[0], [agents]);

  return (
    <div className="min-h-screen bg-[#060609] text-zinc-100">
      <div className="flex min-h-screen w-full">
        <Sidebar />
        <main className="flex-1 px-5 py-6 md:px-8 md:py-8">
          <header className="mb-6 border-b border-zinc-800 pb-4">
            <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Team</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight text-zinc-100">Org Operations</h1>
            <p className="mt-1 text-sm text-zinc-400">{chief.name} · {chief.role} · {modelLabel(chief.model)}</p>
          </header>


          <section className="mb-6 flex justify-center">
            <article className="w-full max-w-[420px] rounded-xl border border-zinc-800 bg-[#0b0b0e] p-5">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-2xl font-semibold tracking-tight">Chief of Staff</p>
                  <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-400">{modelLabel(chief.model)}</p>
                </div>
                <span className="rounded-full px-2.5 py-1 text-xs text-violet-200 bg-violet-500/20 border border-violet-400/30">Core</span>
              </div>

              <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">🐼</div>
                    <div>
                      <p className="text-lg font-semibold">{chief.name}</p>
                      <p className="text-xs text-zinc-400">{chief.role}</p>
                    </div>
                  </div>
                  <span className={`rounded-full px-2 py-1 text-xs ${statusPill(chief.status)}`}>{chief.status}</span>
                </div>
                <p className="mt-2 text-xs text-zinc-400">Backup model: <span className="text-zinc-200">{backupModel(chief.model)}</span></p>
                <p className="mt-1 text-xs text-zinc-500">{chief.last_active}</p>
              </div>
            </article>
          </section>

          {editingId && (
            <section className="mb-6 rounded-2xl border border-zinc-800 bg-[#0e0e12] p-4 shadow-[0_8px_24px_rgba(0,0,0,0.25)]">
              <p className="mb-3 text-sm font-semibold">Edit Agent</p>
              <div className="grid gap-2 md:grid-cols-6">
                <input value={editDraft.name} onChange={(e) => setEditDraft((p) => ({ ...p, name: e.target.value }))} className="rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm" placeholder="Name" />
                <input value={editDraft.role} onChange={(e) => setEditDraft((p) => ({ ...p, role: e.target.value }))} className="rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm" placeholder="Role" />
                <input value={editDraft.model} onChange={(e) => setEditDraft((p) => ({ ...p, model: e.target.value }))} className="rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm" placeholder="Model" />
                <select value={editDraft.status} onChange={(e) => setEditDraft((p) => ({ ...p, status: e.target.value as AgentStatus }))} className="rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm">
                  <option value="idle">idle</option><option value="working">working</option><option value="review">review</option><option value="blocked">blocked</option>
                </select>
                <input value={editDraft.mission} onChange={(e) => setEditDraft((p) => ({ ...p, mission: e.target.value }))} className="md:col-span-2 rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm" placeholder="Mission" />
              </div>
              <div className="mt-3 flex gap-2">
                <button type="button" onClick={saveEdit} className="rounded-xl bg-violet-600 px-3 py-2 text-sm font-medium">Save</button>
                <button type="button" onClick={() => setEditingId(null)} className="rounded-xl border border-zinc-700 px-3 py-2 text-sm">Cancel</button>
              </div>
            </section>
          )}

          <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {departmentConfigs.map((cfg) => {
              const lead = agents.find((a) => a.name.toLowerCase() === cfg.leadName.toLowerCase());
              const activeCount = departmentActiveCount(agents, cfg, tasks);
              const leadStatus = lead?.status || "idle";

              return (
                <article key={cfg.key} className={`rounded-xl border border-zinc-800 ${cfg.accent} p-5`}>
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <p className="text-2xl font-semibold tracking-tight">{cfg.title}</p>
                      <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-400">{modelLabel(lead?.model || cfg.modelDefault)}</p>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-xs ${cfg.badge}`}>{activeCount} active</span>
                  </div>

                  <div className="mb-4 rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-lg font-semibold">{lead?.name || cfg.leadName}</p>
                        <p className="text-xs text-zinc-400">{lead?.role || cfg.fallbackRole}</p>
                      </div>
                      <span className={`rounded-full px-2 py-1 text-xs ${statusPill(leadStatus)}`}>{leadStatus}</span>
                    </div>
                    <p className="mt-2 text-xs text-zinc-400">Backup model: <span className="text-zinc-200">{backupModel(lead?.model || cfg.modelDefault)}</span></p>
                    <p className="mt-1 text-xs text-zinc-500">{lead?.last_active || "today"} · {activeCount} tasks</p>
                  </div>

                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-400">Capabilities</p>
                  <div className="space-y-1.5">
                    {cfg.capabilities.map((cap) => (
                      <p key={cap} className="text-sm text-zinc-200/90">
                        ✅ {cap}
                      </p>
                    ))}
                  </div>
                </article>
              );
            })}
          </section>
        </main>
      </div>
    </div>
  );
}



