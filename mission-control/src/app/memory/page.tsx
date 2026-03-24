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
    title: "Daily Operations Snapshot",
    date_key: "2026-03-24",
    summary: "Mission Control build progressed across tasks, calendar, projects, and memory.",
    content:
      "## Discussion\nWe aligned on Mission Control as the daily operating system.\n\n## Findings\nTasks flow is stable with Panda ownership and live activity.\n\n## Decisions\nMemory should prioritize project-critical context and task seeds.\n\n## Next Actions\nRebuild memory UI as journal-first reading experience.",
    word_count: 49,
    updated_ago: "just now",
    tags: ["project:mission-control", "type:decision", "owner:chad"],
    source: "chat",
    importance: "high",
  },
];

const seedLongTerm: LongTermMemory = {
  id: "lt1",
  title: "Long-Term Memory",
  summary: "Store project decisions, insights, blockers, and task seeds. Exclude troubleshooting noise.",
  updated_ago: "updated recently",
};

function parseTags(raw: string) {
  return raw
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 10);
}

function nowDate() {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(dateKey: string) {
  return new Date(`${dateKey}T00:00:00`).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function sectionize(content: string) {
  const lines = content.split("\n");
  const sections: { heading: string; body: string }[] = [];
  let current = { heading: "Entry", body: "" };

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("## ")) {
      if (current.body.trim()) sections.push(current);
      current = { heading: trimmed.replace(/^##\s*/, ""), body: "" };
    } else {
      current.body += `${line}\n`;
    }
  }
  if (current.body.trim()) sections.push(current);
  return sections;
}

export default function MemoryPage() {
  const entryParam =
    typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("entry") : null;
  const [entries, setEntries] = useState<MemoryEntry[]>(seedEntries);
  const [selectedId, setSelectedId] = useState<string>(seedEntries[0]?.id || "");
  const [longTerm, setLongTerm] = useState<LongTermMemory>(seedLongTerm);

  const [query, setQuery] = useState("");
  const [activeTag, setActiveTag] = useState<string>("all");

  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [content, setContent] = useState("");
  const [tagsRaw, setTagsRaw] = useState("project:mission-control, type:decision, owner:chad");

  useEffect(() => {
    const load = async () => {
      if (!supabase) return;

      const [{ data: memoryRows }, { data: ltRows }] = await Promise.all([
        supabase
          .from("memory_entries")
          .select("id,title,date_key,summary,content,word_count,updated_ago,tags,source,importance")
          .order("date_key", { ascending: false }),
        supabase
          .from("long_term_memory")
          .select("id,title,summary,updated_ago")
          .order("created_at", { ascending: false })
          .limit(1),
      ]);

      if (memoryRows && memoryRows.length > 0) {
        const rows = (memoryRows as MemoryEntry[]).map((r) => ({
          ...r,
          tags: Array.isArray(r.tags) ? r.tags : [],
        }));
        setEntries(rows);
        setSelectedId(entryParam && rows.some((r) => r.id === entryParam) ? entryParam : rows[0].id);
      }
      if (ltRows && ltRows.length > 0) setLongTerm((ltRows[0] as LongTermMemory) || seedLongTerm);
    };

    void load();
  }, [entryParam]);

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    entries.forEach((e) => (e.tags || []).forEach((t) => tags.add(t)));
    return ["all", ...Array.from(tags).sort()];
  }, [entries]);

  const filteredEntries = useMemo(() => {
    const q = query.trim().toLowerCase();
    return entries.filter((e) => {
      const matchesTag = activeTag === "all" || (e.tags || []).includes(activeTag);
      const hay = `${e.title} ${e.summary} ${e.content} ${(e.tags || []).join(" ")}`.toLowerCase();
      const matchesSearch = !q || hay.includes(q);
      return matchesTag && matchesSearch;
    });
  }, [entries, query, activeTag]);

  const selected = useMemo(
    () => filteredEntries.find((entry) => entry.id === selectedId) ?? filteredEntries[0],
    [filteredEntries, selectedId],
  );

  const grouped = useMemo(() => {
    const groups = new Map<string, MemoryEntry[]>();
    filteredEntries.forEach((entry) => {
      const key = entry.date_key;
      const list = groups.get(key) ?? [];
      list.push(entry);
      groups.set(key, list);
    });
    return Array.from(groups.entries());
  }, [filteredEntries]);

  const addEntry = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!title.trim()) return;

    const clean = content.trim();
    const entry: MemoryEntry = {
      id: crypto.randomUUID(),
      title: title.trim(),
      date_key: nowDate(),
      summary: summary.trim() || "No summary",
      content: clean,
      word_count: clean.split(/\s+/).filter(Boolean).length,
      updated_ago: "just now",
      tags: parseTags(tagsRaw),
      source: "manual",
      importance: "med",
    };

    setEntries((prev) => [entry, ...prev]);
    setSelectedId(entry.id);
    setTitle("");
    setSummary("");
    setContent("");

    if (supabase) await supabase.from("memory_entries").insert(entry);
  };

  const saveLongTerm = async () => {
    const updated: LongTermMemory = { ...longTerm, updated_ago: "just now" };
    setLongTerm(updated);
    if (supabase) await supabase.from("long_term_memory").upsert(updated);
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100">
      <div className="flex min-h-screen w-full">
        <Sidebar />

        <main className="flex-1 p-4 md:p-6">
          <header className="mb-6">
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Memory</p>
            <h1 className="text-3xl font-semibold tracking-tight text-zinc-50">Journal Memory</h1>
          </header>

          <section className="mb-5 rounded-2xl border border-zinc-800/80 bg-[#0e0e12] p-4">
            <form className="grid gap-2 md:grid-cols-8" onSubmit={addEntry}>
              <input value={title} onChange={(e) => setTitle(e.target.value)} className="md:col-span-2 rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm" placeholder="Entry title" />
              <input value={summary} onChange={(e) => setSummary(e.target.value)} className="md:col-span-3 rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm" placeholder="Summary" />
              <input value={tagsRaw} onChange={(e) => setTagsRaw(e.target.value)} className="md:col-span-3 rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm" placeholder="project:hms, type:decision, owner:chad" />
              <textarea value={content} onChange={(e) => setContent(e.target.value)} className="md:col-span-8 rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm" rows={3} placeholder="Write journal content" />
              <button className="w-fit rounded bg-violet-600 px-3 py-2 text-sm" type="submit">+ Add Journal Entry</button>
            </form>
          </section>

          <div className="grid gap-5 xl:grid-cols-[380px_1fr]">
            <aside className="rounded-2xl border border-zinc-800/80 bg-[#0e0e12] p-4">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search entries, projects, decisions..."
                className="mb-3 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-500"
              />

              <div className="mb-4 flex flex-wrap gap-1.5">
                {allTags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setActiveTag(tag)}
                    className={`rounded-full px-2.5 py-1 text-[11px] transition ${
                      activeTag === tag
                        ? "bg-violet-600 text-white"
                        : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>

              <div className="mb-4 rounded-xl border border-zinc-800 bg-zinc-900/70 p-3.5">
                <input value={longTerm.title} onChange={(e) => setLongTerm((p) => ({ ...p, title: e.target.value }))} className="w-full rounded bg-zinc-800 px-2 py-1 text-sm font-semibold" />
                <textarea value={longTerm.summary} onChange={(e) => setLongTerm((p) => ({ ...p, summary: e.target.value }))} className="mt-2 w-full rounded bg-zinc-800 px-2 py-1 text-xs" rows={3} />
                <button onClick={saveLongTerm} className="mt-2 rounded bg-zinc-700 px-2 py-1 text-xs">Save Long-Term</button>
              </div>

              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">Daily Journal</p>
              <div className="space-y-3">
                {grouped.map(([date, items]) => (
                  <div key={date}>
                    <p className="mb-1 text-xs font-semibold text-zinc-400">{formatDate(date)}</p>
                    <div className="space-y-1">
                      {items.map((entry) => (
                        <button
                          key={entry.id}
                          type="button"
                          onClick={() => setSelectedId(entry.id)}
                          className={`w-full rounded-xl border px-3 py-3 text-left transition ${
                            selected?.id === entry.id
                              ? "border-zinc-700 bg-zinc-800/75 shadow-[0_0_0_1px_rgba(113,113,122,0.25)]"
                              : "border-zinc-800 bg-zinc-900/50 hover:border-zinc-700 hover:bg-zinc-800/40"
                          }`}
                        >
                          <p className="text-sm font-medium text-zinc-100">{entry.title}</p>
                          <p className="mt-1 line-clamp-2 text-xs text-zinc-400">{entry.summary}</p>
                          <p className="mt-1 text-[11px] text-zinc-500">{entry.word_count} words · {entry.updated_ago}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </aside>

            <section className="rounded-2xl border border-zinc-800/80 bg-[#0e0e12] px-8 py-7">
              {selected ? (
                <>
                  <div className="mb-7 border-b border-zinc-800 pb-5">
                    <p className="text-sm text-zinc-500">{formatDate(selected.date_key)}</p>
                    <h2 className="mt-1 text-[34px] font-semibold leading-[1.15] tracking-tight text-zinc-100">
                      {selected.title}
                    </h2>
                    <p className="mt-2 text-xs text-zinc-500">{selected.word_count} words · {selected.updated_ago}</p>
                  </div>

                  <div className="space-y-7">
                    {sectionize(selected.content).map((sec, idx) => (
                      <article key={idx}>
                        <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">{sec.heading}</h3>
                        <p className="whitespace-pre-wrap text-[16px] leading-8 text-zinc-300">{sec.body.trim()}</p>
                      </article>
                    ))}
                    {sectionize(selected.content).length === 0 && (
                      <p className="whitespace-pre-wrap text-[16px] leading-8 text-zinc-300">{selected.content}</p>
                    )}
                  </div>
                </>
              ) : (
                <p className="text-sm text-zinc-500">No entries found.</p>
              )}
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
