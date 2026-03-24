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
  tags: string[];
  source: "manual" | "heartbeat" | "task" | "chat";
  importance: "high" | "med" | "low";
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
    summary: "Tasks board, Supabase sync, and calendar/projects/memory modules are live.",
    content: "Important build milestone completed with deploy automation and structured ops flow.",
    word_count: 14,
    updated_ago: "just now",
    tags: ["project:mission-control", "type:decision", "owner:chad"],
    source: "manual",
    importance: "high",
  },
];

const seedLongTerm: LongTermMemory = {
  id: "lt1",
  title: "Long-Term Memory",
  summary: "Store project-critical decisions, insights, and task seeds. Skip tool/debug noise.",
  updated_ago: "updated recently",
};

function chipClass(tag: string) {
  if (tag.startsWith("project:")) return "bg-sky-900/60 text-sky-300";
  if (tag.startsWith("type:")) return "bg-violet-900/60 text-violet-300";
  if (tag.startsWith("owner:")) return "bg-emerald-900/60 text-emerald-300";
  return "bg-zinc-800 text-zinc-300";
}

function parseTags(raw: string) {
  return raw
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 8);
}

function nowDate() {
  return new Date().toISOString().slice(0, 10);
}

export default function MemoryPage() {
  const [entries, setEntries] = useState<MemoryEntry[]>(seedEntries);
  const [selectedId, setSelectedId] = useState<string>(seedEntries[0]?.id || "");
  const [longTerm, setLongTerm] = useState<LongTermMemory>(seedLongTerm);

  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [content, setContent] = useState("");
  const [tagsRaw, setTagsRaw] = useState("project:mission-control, type:idea, owner:chad");
  const [source, setSource] = useState<MemoryEntry["source"]>("manual");
  const [importance, setImportance] = useState<MemoryEntry["importance"]>("med");

  const [query, setQuery] = useState("");
  const [activeTag, setActiveTag] = useState<string>("all");

  useEffect(() => {
    const load = async () => {
      if (!supabase) return;

      const today = nowDate();

      const [{ data: memoryRows }, { data: ltRows }, { data: taskRows }] = await Promise.all([
        supabase
          .from("memory_entries")
          .select("id,title,date_key,summary,content,word_count,updated_ago,tags,source,importance")
          .order("date_key", { ascending: false }),
        supabase
          .from("long_term_memory")
          .select("id,title,summary,updated_ago")
          .order("created_at", { ascending: false })
          .limit(1),
        supabase.from("tasks").select("status,owner,project,title"),
      ]);

      const rows = ((memoryRows as MemoryEntry[]) || []).map((r) => ({
        ...r,
        tags: Array.isArray(r.tags) ? r.tags : [],
      }));

      const tasks = (taskRows as { status: string; owner: string; project: string; title: string }[]) || [];
      const active = tasks.filter((t) => t.status !== "done").length;
      const done = tasks.filter((t) => t.status === "done").length;
      const projects = new Set(tasks.map((t) => t.project)).size;

      const snapshotSummary = `Daily ops: ${active} active, ${done} done, ${projects} projects touched.`;
      const snapshotContent = `Auto heartbeat-style memory snapshot for ${today}. Key focus: keep project-critical decisions, blockers, and task seeds visible.`;

      const todayIndex = rows.findIndex((r) => String(r.date_key).slice(0, 10) === today);

      if (todayIndex === -1) {
        const autoEntry: MemoryEntry = {
          id: crypto.randomUUID(),
          title: "Daily Operations Snapshot",
          date_key: today,
          summary: snapshotSummary,
          content: snapshotContent,
          word_count: snapshotContent.split(/\s+/).filter(Boolean).length,
          updated_ago: "just now",
          tags: ["project:mission-control", "type:decision", "owner:panda"],
          source: "heartbeat",
          importance: "med",
        };
        rows.unshift(autoEntry);
        await supabase.from("memory_entries").insert(autoEntry);
      } else {
        const existing = rows[todayIndex];
        const tooThin = !existing.content || existing.content.trim().length < 40;
        if (tooThin) {
          const updated: MemoryEntry = {
            ...existing,
            summary: existing.summary?.trim() || snapshotSummary,
            content: `${existing.content || ""}\n\n${snapshotContent}`.trim(),
            word_count: `${existing.content || ""} ${snapshotContent}`.trim().split(/\s+/).filter(Boolean).length,
            updated_ago: "just now",
            tags: Array.from(new Set([...(existing.tags || []), "type:decision", "owner:panda"])),
            source: existing.source || "heartbeat",
            importance: existing.importance || "med",
          };
          rows[todayIndex] = updated;
          await supabase.from("memory_entries").update(updated).eq("id", existing.id);
        }
      }

      if (rows.length > 0) {
        setEntries(rows);
        setSelectedId(rows[0].id);
      }
      if (ltRows && ltRows.length > 0) setLongTerm((ltRows[0] as LongTermMemory) || seedLongTerm);
    };

    void load();
  }, []);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    entries.forEach((e) => e.tags?.forEach((t) => set.add(t)));
    return ["all", ...Array.from(set).sort()];
  }, [entries]);

  const filteredEntries = useMemo(() => {
    const q = query.trim().toLowerCase();
    return entries.filter((e) => {
      const matchesTag = activeTag === "all" || e.tags?.includes(activeTag);
      const hay = `${e.title} ${e.summary} ${e.content}`.toLowerCase();
      const matchesQ = !q || hay.includes(q);
      return matchesTag && matchesQ;
    });
  }, [entries, query, activeTag]);

  const selected = useMemo(
    () => filteredEntries.find((entry) => entry.id === selectedId) ?? filteredEntries[0],
    [filteredEntries, selectedId],
  );

  const addEntry = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!title.trim()) return;

    const cleanContent = content.trim();
    const cleanSummary = summary.trim() || "No summary";
    const created: MemoryEntry = {
      id: crypto.randomUUID(),
      title: title.trim(),
      date_key: nowDate(),
      summary: cleanSummary,
      content: cleanContent,
      word_count: cleanContent.split(/\s+/).filter(Boolean).length,
      updated_ago: "just now",
      tags: parseTags(tagsRaw),
      source,
      importance,
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
          <header className="mb-4">
            <p className="text-xs uppercase tracking-[0.15em] text-zinc-500">Memory</p>
            <h1 className="text-2xl font-semibold text-zinc-50">Memory</h1>
            <p className="mt-1 text-sm text-zinc-400">
              Journal of project-critical decisions, insights, and task seeds. No troubleshooting noise.
            </p>
          </header>

          <section className="mb-4 rounded-xl border border-zinc-800 bg-[#0e0e12] p-3">
            <p className="mb-2 text-sm font-semibold">Add Important Entry</p>
            <form className="grid gap-2 md:grid-cols-8" onSubmit={addEntry}>
              <input value={title} onChange={(e) => setTitle(e.target.value)} className="md:col-span-2 rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm" placeholder="Title" />
              <input value={summary} onChange={(e) => setSummary(e.target.value)} className="md:col-span-3 rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm" placeholder="Summary" />
              <select value={source} onChange={(e) => setSource(e.target.value as MemoryEntry["source"])} className="rounded border border-zinc-700 bg-zinc-900 px-2 py-2 text-sm">
                <option value="manual">manual</option>
                <option value="heartbeat">heartbeat</option>
                <option value="task">task</option>
                <option value="chat">chat</option>
              </select>
              <select value={importance} onChange={(e) => setImportance(e.target.value as MemoryEntry["importance"])} className="rounded border border-zinc-700 bg-zinc-900 px-2 py-2 text-sm">
                <option value="high">high</option>
                <option value="med">med</option>
                <option value="low">low</option>
              </select>
              <input value={tagsRaw} onChange={(e) => setTagsRaw(e.target.value)} className="md:col-span-3 rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm" placeholder="project:hms, type:decision, owner:chad" />
              <textarea value={content} onChange={(e) => setContent(e.target.value)} className="md:col-span-8 rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm" rows={3} placeholder="Important details" />
              <button className="w-fit rounded bg-violet-600 px-3 py-2 text-sm" type="submit">+ Add Entry</button>
            </form>
          </section>

          <section className="mb-4 rounded-xl border border-zinc-800 bg-[#0e0e12] p-3">
            <div className="mb-2 flex flex-wrap gap-2">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search memories"
                className="min-w-[260px] rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
              />
              <div className="flex flex-wrap gap-1">
                {allTags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setActiveTag(tag)}
                    className={`rounded-full px-2 py-1 text-xs ${
                      activeTag === tag ? "bg-zinc-700 text-zinc-100" : "bg-zinc-800 text-zinc-400"
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
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
                {filteredEntries.map((entry) => (
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
                    <p className="mt-1 text-xs text-zinc-500">
                      {selected.word_count} words · {selected.updated_ago} · {selected.source} · {selected.importance}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {selected.tags?.map((tag) => (
                        <span key={tag} className={`rounded-full px-2 py-1 text-xs ${chipClass(tag)}`}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                  <p className="text-sm leading-7 text-zinc-300">{selected.content}</p>
                </>
              ) : (
                <p className="text-sm text-zinc-500">No memory entries match your current filter.</p>
              )}
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
