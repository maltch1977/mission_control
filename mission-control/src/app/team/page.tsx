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

type Task = { id: string; owner: string; status: string };

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
    key: "engineering",
    title: "Engineering",
    accent: "from-sky-900/40 to-blue-900/20",
    badge: "text-sky-300 bg-sky-900/50",
    leadName: "Forge",
    fallbackRole: "Engineering Lead",
    modelDefault: "Codex",
    capabilities: [
      "Mission Control feature delivery",
      "Stability and bug fixes",
      "Integration workflows",
      "Performance and UX improvements",
    ],
  },
  {
    key: "research",
    title: "Research",
    accent: "from-violet-900/40 to-fuchsia-900/20",
    badge: "text-violet-300 bg-violet-900/50",
    leadName: "Atlas",
    fallbackRole: "Research Lead",
    modelDefault: "Sonnet",
    capabilities: [
      "AI/market intelligence",
      "Trend and competitor tracking",
      "Strategic synthesis",
      "Decision support briefs",
    ],
  },
  {
    key: "security",
    title: "Security & Ops",
    accent: "from-amber-900/40 to-orange-900/20",
    badge: "text-amber-300 bg-amber-900/50",
    leadName: "Sentinel",
    fallbackRole: "Security Lead",
    modelDefault: "Kimi",
    capabilities: [
      "Security posture checks",
      "Access and token hygiene",
      "Infrastructure review",
      "Risk and hardening actions",
    ],
  },
  {
    key: "social",
    title: "Content & Social",
    accent: "from-pink-900/40 to-rose-900/20",
    badge: "text-pink-300 bg-pink-900/50",
    leadName: "Mr X",
    fallbackRole: "Content Lead",
    modelDefault: "Kimi",
    capabilities: [
      "Social content production",
      "Post calendar execution",
      "Creative iteration",
      "Campaign copy testing",
    ],
  },
  {
    key: "finance",
    title: "Finance",
    accent: "from-emerald-900/40 to-teal-900/20",
    badge: "text-emerald-300 bg-emerald-900/50",
    leadName: "Ledger",
    fallbackRole: "Finance Lead",
    modelDefault: "Kimi",
    capabilities: [
      "Subscription tracking",
      "Renewal and spend monitoring",
      "Savings identification",
      "Payment operations",
    ],
  },
  {
    key: "outreach",
    title: "Outreach",
    accent: "from-orange-900/40 to-red-900/20",
    badge: "text-orange-300 bg-orange-900/50",
    leadName: "Vector",
    fallbackRole: "Outreach Lead",
    modelDefault: "Kimi",
    capabilities: [
      "Cold outreach execution",
      "Sequence optimization",
      "Prospect follow-up systems",
      "Pipeline hygiene",
    ],
  },
];

const seeds: Agent[] = [
  { id: "a1", name: "Panda", role: "Chief of Staff", model: "Codex", status: "working", last_active: "just now", mission: "Route tasks, enforce priorities, and govern model spend." },
  { id: "a2", name: "Mr X", role: "Social Media", model: "Kimi", status: "idle", last_active: "today", mission: "Social strategy and content execution." },
  { id: "a3", name: "Atlas", role: "Research", model: "Sonnet", status: "idle", last_active: "today", mission: "AI, startup, and marketing intelligence." },
  { id: "a4", name: "Forge", role: "Engineering", model: "Codex", status: "working", last_active: "just now", mission: "Keep Mission Control moving and stable." },
  { id: "a5", name: "Vector", role: "Outreach", model: "Kimi", status: "idle", last_active: "today", mission: "Outreach systems and conversion tuning." },
  { id: "a6", name: "Ledger", role: "Finance", model: "Kimi", status: "review", last_active: "today", mission: "Manage subscriptions and payment efficiency." },
  { id: "a7", name: "Sentinel", role: "Security/Ops", model: "Kimi", status: "idle", last_active: "today", mission: "Run periodic hardening and risk checks." },
];

const blank = { name: "", role: "", model: "Kimi", status: "idle" as AgentStatus, mission: "" };

const roleModelDefaults: Record<string, string> = {
  "Chief of Staff": "Codex",
  "Social Media": "Kimi",
  Research: "Sonnet",
  Engineering: "Codex",
  Outreach: "Kimi",
  Finance: "Kimi",
  "Security/Ops": "Kimi",
};

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

  useEffect(() => {
    const load = async () => {
      if (!supabase) return;
      const [{ data: aRows }, { data: tRows }] = await Promise.all([
        supabase
          .from("agents_org")
          .select("id,name,role,model,status,last_active,mission")
          .order("created_at", { ascending: true }),
        supabase.from("tasks").select("id,owner,status"),
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

  const chief = useMemo(() => agents.find((a) => a.name.toLowerCase() === "panda") || seeds[0], [agents]);

  return (
    <div className="min-h-screen bg-[#07070b] text-zinc-100">
      <div className="flex min-h-screen w-full">
        <Sidebar />
        <main className="flex-1 p-4 md:p-6">
          <header className="mb-5 rounded-2xl border border-zinc-800/80 bg-gradient-to-r from-violet-900/30 to-indigo-900/20 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-zinc-400">Team</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight text-zinc-50">Org Operations</h1>
            <p className="mt-2 text-sm text-zinc-300">
              {chief.name} · {chief.role} · Model {chief.model}
            </p>
          </header>

          <section className="mb-5 rounded-2xl border border-zinc-800 bg-[#0e0e12] p-3">
            <form className="grid gap-2 md:grid-cols-7" onSubmit={addAgent}>
              <input value={draft.name} onChange={(e) => setDraft((p) => ({ ...p, name: e.target.value }))} placeholder="Agent name" className="rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm" />
              <input value={draft.role} onChange={(e) => { const role = e.target.value; setDraft((p) => ({ ...p, role, model: roleModelDefaults[role] || p.model })); }} placeholder="Role" className="rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm" />
              <input value={draft.model} onChange={(e) => setDraft((p) => ({ ...p, model: e.target.value }))} placeholder="Model" className="rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm" />
              <select value={draft.status} onChange={(e) => setDraft((p) => ({ ...p, status: e.target.value as AgentStatus }))} className="rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm">
                <option value="idle">idle</option><option value="working">working</option><option value="review">review</option><option value="blocked">blocked</option>
              </select>
              <input value={draft.mission} onChange={(e) => setDraft((p) => ({ ...p, mission: e.target.value }))} placeholder="Mission" className="md:col-span-2 rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm" />
              <button type="submit" className="rounded bg-violet-600 px-3 py-2 text-sm font-medium">+ Add Agent</button>
            </form>
          </section>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {departmentConfigs.map((cfg) => {
              const lead = agents.find((a) => a.name.toLowerCase() === cfg.leadName.toLowerCase());
              const activeCount = departmentActiveCount(agents, cfg, tasks);
              const leadStatus = lead?.status || "idle";

              return (
                <article key={cfg.key} className={`rounded-2xl border border-zinc-800/80 bg-gradient-to-b ${cfg.accent} p-4`}>
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <p className="text-xl font-semibold tracking-tight">{cfg.title}</p>
                      <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-400">Model {lead?.model || cfg.modelDefault}</p>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-xs ${cfg.badge}`}>{activeCount} active</span>
                  </div>

                  <div className="mb-3 rounded-xl border border-zinc-800 bg-zinc-950/55 p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-base font-semibold">{lead?.name || cfg.leadName}</p>
                        <p className="text-xs text-zinc-400">{lead?.role || cfg.fallbackRole}</p>
                      </div>
                      <span className={`rounded-full px-2 py-1 text-xs ${statusPill(leadStatus)}`}>{leadStatus}</span>
                    </div>
                    <p className="mt-2 text-xs text-zinc-400">Model: <span className="text-zinc-200">{lead?.model || cfg.modelDefault}</span></p>
                    <p className="mt-1 text-xs text-zinc-500">{lead?.last_active || "today"} · {activeCount} tasks</p>
                  </div>

                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-400">Capabilities</p>
                  <div className="space-y-1.5">
                    {cfg.capabilities.map((cap) => (
                      <p key={cap} className="text-xs text-zinc-300">
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
