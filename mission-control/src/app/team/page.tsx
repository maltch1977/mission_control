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
    key: "engineering",
    title: "Engineering",
    accent: "from-sky-800/40 via-indigo-900/20 to-zinc-950",
    badge: "text-sky-200 bg-sky-500/20 border border-sky-400/30",
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
    accent: "from-violet-800/40 via-fuchsia-900/20 to-zinc-950",
    badge: "text-violet-200 bg-violet-500/20 border border-violet-400/30",
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
    accent: "from-amber-800/40 via-orange-900/20 to-zinc-950",
    badge: "text-amber-200 bg-amber-500/20 border border-amber-400/30",
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
    accent: "from-pink-800/40 via-rose-900/20 to-zinc-950",
    badge: "text-pink-200 bg-pink-500/20 border border-pink-400/30",
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
    accent: "from-emerald-800/40 via-teal-900/20 to-zinc-950",
    badge: "text-emerald-200 bg-emerald-500/20 border border-emerald-400/30",
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
    accent: "from-orange-800/40 via-red-900/20 to-zinc-950",
    badge: "text-orange-200 bg-orange-500/20 border border-orange-400/30",
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

  const removeAgent = async (id: string) => {
    setAgents((prev) => prev.filter((a) => a.id !== id));
    if (supabase) await supabase.from("agents_org").delete().eq("id", id);
    if (editingId === id) setEditingId(null);
  };

  const routingEvents = useMemo(() => {
    return tasks
      .filter((t) => !!t.parent_task_id)
      .slice(0, 12)
      .map((t) => ({
        id: t.id,
        to: t.owner,
        label: t.title || "Delegated task",
        time: t.updated || "recently",
      }));
  }, [tasks]);

  const routeActive = useMemo(() => {
    const keys = new Set<string>();
    for (const e of routingEvents) {
      const to = e.to.toLowerCase();
      if (to.includes("forge") || to.includes("engineering")) keys.add("eng");
      if (to.includes("atlas") || to.includes("research")) keys.add("research");
      if (to.includes("mr x") || to.includes("social")) keys.add("social");
      if (to.includes("ledger") || to.includes("finance")) keys.add("finance");
      if (to.includes("sentinel") || to.includes("security")) keys.add("security");
    }
    return keys;
  }, [routingEvents]);

  const chief = useMemo(() => agents.find((a) => a.name.toLowerCase() === "panda") || seeds[0], [agents]);

  return (
    <div className="min-h-screen bg-[#060609] text-zinc-100">
      <div className="flex min-h-screen w-full">
        <Sidebar />
        <main className="flex-1 px-5 py-6 md:px-8 md:py-8">
          <header className="mb-6 rounded-3xl border border-zinc-800/80 bg-gradient-to-r from-violet-900/40 via-indigo-900/25 to-zinc-950 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-400">Team</p>
            <h1 className="mt-2 text-4xl font-semibold tracking-tight text-zinc-50">Org Operations</h1>
            <p className="mt-2 text-sm text-zinc-300">
              {chief.name} · {chief.role} · {modelLabel(chief.model)}
            </p>
          </header>

          <section className="mb-6 rounded-2xl border border-zinc-800/80 bg-[#0e0e12] p-4 shadow-[0_8px_24px_rgba(0,0,0,0.25)]">
            <form className="grid gap-2 md:grid-cols-7" onSubmit={addAgent}>
              <input value={draft.name} onChange={(e) => setDraft((p) => ({ ...p, name: e.target.value }))} placeholder="Agent name" className="rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-sm" />
              <input value={draft.role} onChange={(e) => { const role = e.target.value; setDraft((p) => ({ ...p, role, model: roleModelDefaults[role] || p.model })); }} placeholder="Role" className="rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-sm" />
              <input value={draft.model} onChange={(e) => setDraft((p) => ({ ...p, model: e.target.value }))} placeholder="Model" className="rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-sm" />
              <select value={draft.status} onChange={(e) => setDraft((p) => ({ ...p, status: e.target.value as AgentStatus }))} className="rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-sm">
                <option value="idle">idle</option><option value="working">working</option><option value="review">review</option><option value="blocked">blocked</option>
              </select>
              <input value={draft.mission} onChange={(e) => setDraft((p) => ({ ...p, mission: e.target.value }))} placeholder="Mission" className="md:col-span-2 rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-sm" />
              <button type="submit" className="rounded-xl bg-violet-600 px-3 py-2.5 text-sm font-medium transition hover:bg-violet-500">+ Add Agent</button>
            </form>
          </section>

          <section className="mb-6">
            <div className="mx-auto max-w-2xl rounded-3xl border border-violet-700/40 bg-gradient-to-b from-[#1a1530] to-[#0f0d1f] p-5 shadow-[0_0_0_1px_rgba(139,92,246,0.2),0_14px_38px_rgba(0,0,0,0.35)]">
              <div className="mb-3 inline-flex rounded-full bg-violet-600 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-white">
                Chief of Staff
              </div>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-4">
                  <div className="text-3xl">🐼</div>
                  <div>
                    <p className="text-3xl font-semibold leading-tight text-zinc-100">{chief.name}</p>
                    <p className="text-sm text-violet-300">{chief.role}</p>
                    <p className="text-sm text-zinc-300">{modelLabel(chief.model)}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`inline-flex rounded-full px-2.5 py-1 text-xs ${statusPill(chief.status)}`}>{chief.status.toUpperCase()}</span>
                  <p className="mt-2 text-xs text-zinc-400">{chief.last_active}</p>
                </div>
              </div>
            </div>
          </section>

          <section className="mb-6 rounded-2xl border border-zinc-800 bg-[#0e0e12] p-4 shadow-[0_8px_24px_rgba(0,0,0,0.25)]">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold">Routing Visualizer</p>
              <span className="text-xs text-zinc-500">Live delegation map</span>
            </div>
            <div className="grid gap-3 md:grid-cols-[1.4fr_1fr]">
              <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-3">
                <svg viewBox="0 0 760 220" className="h-[220px] w-full">
                  <defs>
                    <marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
                      <path d="M0,0 L8,4 L0,8 z" fill="#a78bfa" />
                    </marker>
                  </defs>
                  <rect x="20" y="80" width="140" height="60" rx="12" fill="#1f183a" stroke="#6d28d9" />
                  <text x="90" y="115" fill="#e9d5ff" textAnchor="middle" fontSize="12">Panda</text>

                  <rect x="230" y="20" width="140" height="52" rx="12" fill="#132332" stroke="#0ea5e9" />
                  <text x="300" y="50" fill="#bae6fd" textAnchor="middle" fontSize="11">Engineering</text>

                  <rect x="230" y="86" width="140" height="52" rx="12" fill="#2a1538" stroke="#c084fc" />
                  <text x="300" y="116" fill="#f5d0fe" textAnchor="middle" fontSize="11">Research</text>

                  <rect x="230" y="152" width="140" height="52" rx="12" fill="#3a1a24" stroke="#f472b6" />
                  <text x="300" y="182" fill="#fbcfe8" textAnchor="middle" fontSize="11">Social</text>

                  <line x1="160" y1="96" x2="230" y2="46" stroke={routeActive.has("eng") ? "#a78bfa" : "#52525b"} strokeWidth="2" strokeDasharray="6 5" markerEnd="url(#arrow)">
                    {routeActive.has("eng") && <animate attributeName="stroke-dashoffset" values="0;-22" dur="1.2s" repeatCount="indefinite" />}
                  </line>
                  <line x1="160" y1="110" x2="230" y2="112" stroke={routeActive.has("research") ? "#a78bfa" : "#52525b"} strokeWidth="2" strokeDasharray="6 5" markerEnd="url(#arrow)">
                    {routeActive.has("research") && <animate attributeName="stroke-dashoffset" values="0;-22" dur="1.2s" repeatCount="indefinite" />}
                  </line>
                  <line x1="160" y1="124" x2="230" y2="178" stroke={routeActive.has("social") ? "#a78bfa" : "#52525b"} strokeWidth="2" strokeDasharray="6 5" markerEnd="url(#arrow)">
                    {routeActive.has("social") && <animate attributeName="stroke-dashoffset" values="0;-22" dur="1.2s" repeatCount="indefinite" />}
                  </line>

                  <rect x="430" y="40" width="130" height="52" rx="12" fill="#1e3022" stroke="#34d399" />
                  <text x="495" y="70" fill="#bbf7d0" textAnchor="middle" fontSize="11">Finance</text>
                  <rect x="430" y="120" width="130" height="52" rx="12" fill="#3a280e" stroke="#f59e0b" />
                  <text x="495" y="150" fill="#fde68a" textAnchor="middle" fontSize="11">Security</text>

                  <line x1="370" y1="46" x2="430" y2="66" stroke={routeActive.has("finance") ? "#60a5fa" : "#52525b"} strokeWidth="1.8" strokeDasharray="5 5" markerEnd="url(#arrow)">
                    {routeActive.has("finance") && <animate attributeName="stroke-dashoffset" values="0;-22" dur="1.2s" repeatCount="indefinite" />}
                  </line>
                  <line x1="370" y1="112" x2="430" y2="146" stroke={routeActive.has("security") ? "#c084fc" : "#52525b"} strokeWidth="1.8" strokeDasharray="5 5" markerEnd="url(#arrow)">
                    {routeActive.has("security") && <animate attributeName="stroke-dashoffset" values="0;-22" dur="1.2s" repeatCount="indefinite" />}
                  </line>
                  <line x1="370" y1="178" x2="430" y2="146" stroke={routeActive.has("security") ? "#f472b6" : "#52525b"} strokeWidth="1.8" strokeDasharray="5 5" markerEnd="url(#arrow)">
                    {routeActive.has("security") && <animate attributeName="stroke-dashoffset" values="0;-22" dur="1.2s" repeatCount="indefinite" />}
                  </line>
                </svg>
              </div>

              <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-zinc-400">Recent Routing Events</p>
                <div className="space-y-2">
                  {routingEvents.length === 0 ? (
                    <p className="text-xs text-zinc-500">No delegation events yet. Create a routed task to animate the flow.</p>
                  ) : (
                    routingEvents.map((e) => (
                      <div key={e.id} className="rounded-lg border border-zinc-800 bg-zinc-900/70 p-2.5">
                        <p className="text-xs text-zinc-200">→ {e.to}</p>
                        <p className="mt-0.5 line-clamp-2 text-[11px] text-zinc-400">{e.label}</p>
                        <p className="mt-1 text-[10px] text-zinc-500">{e.time}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
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
                <article key={cfg.key} className={`rounded-3xl border border-zinc-800/80 bg-gradient-to-b ${cfg.accent} p-5 shadow-[0_10px_30px_rgba(0,0,0,0.3)]`}>
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
                    {lead && (
                      <div className="mt-3 flex gap-2">
                        <button type="button" onClick={() => beginEdit(lead)} className="rounded-lg bg-zinc-800 px-2.5 py-1 text-xs hover:bg-zinc-700">Edit</button>
                        <button type="button" onClick={() => removeAgent(lead.id)} className="rounded-lg bg-zinc-800 px-2.5 py-1 text-xs text-rose-300 hover:bg-zinc-700">Delete</button>
                      </div>
                    )}
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
