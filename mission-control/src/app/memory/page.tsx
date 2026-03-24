"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Sidebar } from "@/components/sidebar";
import { supabase } from "@/lib/supabase";

type MemoryEntry = {
  id: string;
  title: string;
  date_key: string;
  summary: string;
  content: string;
  word_count: number;
  updated_ago: string;
};

type LongTermMemory = {
  id: string;
  title: string;
  summary: string;
  updated_ago: string;
};

const seedEntries: MemoryEntry[] = [
  {
    id: "m1",
    title: "Mission Control rollout",
    date_key: "2026-03-24",
    summary: "Tasks board shipped, Supabase connected, calendar module added.",
    content: "Key updates: Task Board v2 went live with drag/drop, due dates, tags, and shared persistence.",
    word_count: 24,
    updated_ago: "just now",
  },
];

const seedLongTerm: LongTermMemory = {
  id: "lt1",
  title: "Long-Term Memory",
  summary: "Model routing, product context, social positioning, and operational rules.",
  updated_ago: "updated recently",
};

export default function MemoryPage() {
  const [entries, setEntries] = useState<MemoryEntry[]>(seedEntries);
  const [selectedId, setSelectedId] = useState<string>(seedEntries[0]?.id || "");
  const [longTerm, setLongTerm] = useState<LongTermMemory>(seedLongTerm);
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [content, setContent] = useState("");

  useEffect(() => {
    const load = async () => {
      if (!supabase) return;

      const today = new Date().toISOString().slice(0, 10);

      const [{ data: memoryRows }, { data: ltRows }, { data: taskRows }] = await Promise.all([
        supabase
          .from("memory_entries")
          .select("id,title,date_key,summary,content,word_count,updated_ago")
          .order("date_key", { ascending: false }),
        supabase
          .from("long_term_memory")
          .select("id,title,summary,updated_ago")
          .order("created_at", { ascending: false })
          .limit(1),
        supabase.from("tasks").select("status,owner,project"),
      ]);

      const rows = (memoryRows as MemoryEntry[]) || [];
      const hasToday = rows.some((r) => String(r.date_key).slice(0, 10) === today);

      if (!hasToday) {
        const tasks = (taskRows as { status: string; owner: string; project: string }[]) || [];
        const active = tasks.filter((t) => t.status !== "done").length;
        const done = tasks.filter((t) => t.status === "done").length;
        const pandaOwned = tasks.filter((t) => t.owner === "Panda").length;
        const projects = new Set(tasks.map((t) => t.project)).size;

        const autoContent = `Daily auto-drop for ${today}. Active tasks: ${active}. Done tasks: ${done}. Panda-owned tasks: ${pandaOwned}. Active projects touched: ${projects}.`;

        const autoEntry: MemoryEntry = {
          id: crypto.randomUUID(),
          title: "Daily Operations Snapshot",
          date_key: today,
          summary: `Auto log: ${active} active, ${done} done, ${projects} projects touched.`,
          content: autoContent,
          word_count: autoContent.split(/\s+/).filter(Boolean).length,
          updated_ago: "just now",
        };

        await supabase.from("memory_entries").insert(autoEntry);
        rows.unshift(autoEntry);
      }

      if (rows.length > 0) {
        setEntries(rows);
        setSelectedId(rows[0].id);
      }
      if (ltRows && ltRows.length > 0) setLongTerm((ltRows[0] as LongTermMemory) || seedLongTerm);
    };

    void load();
  }, []);

  const selected = useMemo(() => entries.find((entry) => entry.id === selectedId) ?? entries[0], [entries, selectedId]);

  const addEntry = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!title.trim()) return;
    const now = new Date().toISOString().slice(0, 10);
    const created: MemoryEntry = {
      id: crypto.randomUUID(),
      title: title.trim(),
      date_key: now,
      summary: summary.trim() || "No summary",
      content: content.trim() || "",
      word_count: (content.trim() || "").split(/\s+/).filter(Boolean).length,
      updated_ago: "just now",
    };
    setEntries((prev) => [created, ...prev]);
    setSelectedId(created.id);
    setTitle("");
    setSummary("");
    setContent("");
    if (supabase) await supabase.from("memory_entries").insert(created);
  };

  const saveLongTerm = async () => {
    const updated: LongTermMemory = { ...longTerm, updated_ago: "just now" };
    setLongTerm(updated);
    if (!supabase) return;
    await supabase.from("long_term_memory").upsert(updated);
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100">
      <div className="flex min-h-screen w-full">
        <Sidebar />

        <main className="flex-1 p-4 md:p-6">
          <header className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.15em] text-zinc-500">Memory</p>
              <h1 className="text-2xl font-semibold text-zinc-50">Memory</h1>
            </div>
          </header>

          <section className="mb-4 rounded-xl border border-zinc-800 bg-[#0e0e12] p-3">
            <p className="mb-2 text-sm font-semibold">Add Daily Entry</p>
            <form className="grid gap-2" onSubmit={addEntry}>
              <input value={title} onChange={(e) => setTitle(e.target.value)} className="rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm" placeholder="Entry title" />
              <input value={summary} onChange={(e) => setSummary(e.target.value)} className="rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm" placeholder="Summary" />
              <textarea value={content} onChange={(e) => setContent(e.target.value)} className="rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm" rows={3} placeholder="Content" />
              <button className="w-fit rounded bg-violet-600 px-3 py-2 text-sm" type="submit">+ Add Entry</button>
            </form>
          </section>

          <div className="grid gap-4 xl:grid-cols-[350px_1fr]">
            <aside className="rounded-xl border border-zinc-800 bg-[#0e0e12] p-3">
              <div className="mb-3 rounded-lg border border-zinc-800 bg-zinc-900/70 p-3">
                <input value={longTerm.title} onChange={(e) => setLongTerm((p) => ({ ...p, title: e.target.value }))} className="w-full rounded bg-zinc-800 px-2 py-1 text-sm font-semibold" />
                <textarea value={longTerm.summary} onChange={(e) => setLongTerm((p) => ({ ...p, summary: e.target.value }))} className="mt-2 w-full rounded bg-zinc-800 px-2 py-1 text-xs" rows={3} />
                <button onClick={saveLongTerm} className="mt-2 rounded bg-zinc-700 px-2 py-1 text-xs">Save LT Memory</button>
                <p className="mt-2 text-xs text-zinc-500">{longTerm.updated_ago}</p>
              </div>

              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">Daily Journal</p>
              <div className="space-y-1">
                {entries.map((entry) => (
                  <button key={entry.id} type="button" onClick={() => setSelectedId(entry.id)} className={`w-full rounded-lg border p-3 text-left ${selected?.id === entry.id ? "border-zinc-700 bg-zinc-800/70" : "border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800/40"}`}>
                    <p className="text-sm font-medium text-zinc-100">{entry.date_key}</p>
                    <p className="mt-1 line-clamp-2 text-xs text-zinc-400">{entry.summary}</p>
                    <p className="mt-2 text-[11px] text-zinc-500">{entry.word_count} words · {entry.updated_ago}</p>
                  </button>
                ))}
              </div>
            </aside>

            <section className="rounded-xl border border-zinc-800 bg-[#0e0e12] p-5">
              {selected ? (
                <>
                  <div className="mb-4 border-b border-zinc-800 pb-3">
                    <p className="text-sm text-zinc-500">{selected.date_key}</p>
                    <h2 className="text-2xl font-semibold text-zinc-100">{selected.title}</h2>
                    <p className="mt-1 text-xs text-zinc-500">{selected.word_count} words · {selected.updated_ago}</p>
                  </div>
                  <p className="text-sm leading-7 text-zinc-300">{selected.content}</p>
                </>
              ) : (
                <p className="text-sm text-zinc-500">No memory entries yet.</p>
              )}
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
