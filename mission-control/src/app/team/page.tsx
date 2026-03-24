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

const seeds: Agent[] = [
  { id: "a1", name: "Panda", role: "Chief of Staff", model: "Codex", status: "working", last_active: "just now", mission: "Route tasks, enforce quality, keep model spend efficient." },
  { id: "a2", name: "Mr X", role: "Social Media", model: "Kimi", status: "idle", last_active: "today", mission: "Create and iterate social content workflows." },
  { id: "a3", name: "Atlas", role: "Research", model: "Sonnet", status: "idle", last_active: "today", mission: "Track AI, marketing, and startup intelligence." },
  { id: "a4", name: "Forge", role: "Engineering", model: "Codex", status: "working", last_active: "just now", mission: "Keep Mission Control reliable and improving." },
  { id: "a5", name: "Vector", role: "Outreach", model: "Kimi", status: "idle", last_active: "today", mission: "Run and optimize outreach systems." },
  { id: "a6", name: "Ledger", role: "Finance", model: "Kimi", status: "review", last_active: "today", mission: "Track subscriptions, renewals, and savings opportunities." },
  { id: "a7", name: "Sentinel", role: "Security/Ops", model: "Kimi", status: "idle", last_active: "today", mission: "Run periodic exposure and hardening checks." },
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

function statusClass(status: AgentStatus) {
  if (status === "working") return "bg-emerald-900/60 text-emerald-300 border border-emerald-700/40";
  if (status === "blocked") return "bg-rose-900/60 text-rose-300 border border-rose-700/40";
  if (status === "review") return "bg-amber-900/60 text-amber-300 border border-amber-700/40";
  return "bg-zinc-800 text-zinc-300 border border-zinc-700/40";
}

function initials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function TeamPage() {
  const [agents, setAgents] = useState<Agent[]>(seeds);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [draft, setDraft] = useState(blank);

  useEffect(() => {
    const load = async () => {
      if (!supabase) return;
      const [{ data: aRows }, { data: tRows }] = await Promise.all([
        supabase.from("agents_org").select("id,name,role,model,status,last_active,mission").order("created_at", { ascending: true }),
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

  const withCounts = useMemo(() => {
    return agents.map((a) => ({
      ...a,
      totalTasks: tasks.filter((t) => t.owner.toLowerCase() === a.name.toLowerCase()).length,
      activeTasks: tasks.filter((t) => t.owner.toLowerCase() === a.name.toLowerCase() && t.status !== "done").length,
    }));
  }, [agents, tasks]);

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

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100">
      <div className="flex min-h-screen w-full">
        <Sidebar />
        <main className="flex-1 p-4 md:p-6">
          <header className="mb-4">
            <p className="text-xs uppercase tracking-[0.15em] text-zinc-500">Team</p>
            <h1 className="text-2xl font-semibold text-zinc-50">Org Chart + Agent Operations</h1>
            <p className="mt-1 text-sm text-zinc-400">This page is operational: role ownership, model assignment, status, and activity load.</p>
          </header>

          <section className="mb-4 rounded-xl border border-zinc-800 bg-[#0e0e12] p-3">
            <form className="grid gap-2 md:grid-cols-7" onSubmit={addAgent}>
              <input value={draft.name} onChange={(e) => setDraft((p) => ({ ...p, name: e.target.value }))} placeholder="Agent name" className="rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm" />
              <input
                value={draft.role}
                onChange={(e) => {
                  const role = e.target.value;
                  setDraft((p) => ({ ...p, role, model: roleModelDefaults[role] || p.model }));
                }}
                placeholder="Role"
                className="rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
              />
              <input value={draft.model} onChange={(e) => setDraft((p) => ({ ...p, model: e.target.value }))} placeholder="Model" className="rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm" />
              <select value={draft.status} onChange={(e) => setDraft((p) => ({ ...p, status: e.target.value as AgentStatus }))} className="rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm">
                <option value="idle">idle</option><option value="working">working</option><option value="review">review</option><option value="blocked">blocked</option>
              </select>
              <input value={draft.mission} onChange={(e) => setDraft((p) => ({ ...p, mission: e.target.value }))} placeholder="Mission" className="md:col-span-2 rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm" />
              <button type="submit" className="rounded bg-violet-600 px-3 py-2 text-sm font-medium">+ Add Agent</button>
            </form>
          </section>

          <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {withCounts.map((agent) => (
              <article key={agent.id} className="rounded-2xl border border-zinc-800/80 bg-gradient-to-b from-[#111118] to-[#0c0c10] p-4 shadow-[0_0_0_1px_rgba(39,39,42,0.2)]">
                <div className="mb-3 flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-violet-900/60 text-sm font-semibold text-violet-200">
                      {initials(agent.name)}
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold leading-tight">{agent.name}</h2>
                      <p className="text-xs text-zinc-400">{agent.role}</p>
                    </div>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs ${statusClass(agent.status)}`}>{agent.status}</span>
                </div>

                <div className="mb-3 grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-lg border border-zinc-800 bg-zinc-900/70 px-2 py-1.5 text-zinc-300">Model: {agent.model}</div>
                  <div className="rounded-lg border border-zinc-800 bg-zinc-900/70 px-2 py-1.5 text-zinc-300">Last active: {agent.last_active}</div>
                </div>

                <p className="text-xs leading-5 text-zinc-400">{agent.mission || "No mission defined."}</p>

                <div className="mt-3 flex items-center gap-2 text-xs">
                  <span className="rounded-full bg-zinc-800 px-2 py-1 text-zinc-300">Active: {agent.activeTasks}</span>
                  <span className="rounded-full bg-zinc-800 px-2 py-1 text-zinc-300">Total: {agent.totalTasks}</span>
                </div>
              </article>
            ))}
          </section>
        </main>
      </div>
    </div>
  );
}
