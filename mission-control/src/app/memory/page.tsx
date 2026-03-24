"use client";

import { useEffect, useMemo, useState } from "react";
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
    content:
      "Key updates: Task Board v2 went live with drag/drop, due dates, tags, and shared persistence. Calendar module was added to verify proactive scheduled runs and due-task timeline. Next planned modules are Projects and Memory integration.",
    word_count: 42,
    updated_ago: "just now",
  },
  {
    id: "m2",
    title: "HMS outreach language refinement",
    date_key: "2026-03-23",
    summary: "Moved to weather-triggered plain language and stronger CTA framing.",
    content:
      "The team shifted from generic HVAC outreach to season-triggered messaging focused on pre-summer readiness and practical calls to action. Tone should stay professional-casual and non-jargony.",
    word_count: 33,
    updated_ago: "1 day ago",
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

  useEffect(() => {
    const load = async () => {
      if (!supabase) return;

      const [{ data: memoryRows }, { data: ltRows }] = await Promise.all([
        supabase
          .from("memory_entries")
          .select("id,title,date_key,summary,content,word_count,updated_ago")
          .order("date_key", { ascending: false }),
        supabase
          .from("long_term_memory")
          .select("id,title,summary,updated_ago")
          .order("created_at", { ascending: false })
          .limit(1),
      ]);

      if (memoryRows && memoryRows.length > 0) {
        setEntries(memoryRows as MemoryEntry[]);
        setSelectedId((memoryRows as MemoryEntry[])[0].id);
      }
      if (ltRows && ltRows.length > 0) setLongTerm((ltRows[0] as LongTermMemory) || seedLongTerm);
    };

    void load();
  }, []);

  const selected = useMemo(
    () => entries.find((entry) => entry.id === selectedId) ?? entries[0],
    [entries, selectedId],
  );

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
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-400">
              Search (coming next)
            </div>
          </header>

          <div className="grid gap-4 xl:grid-cols-[350px_1fr]">
            <aside className="rounded-xl border border-zinc-800 bg-[#0e0e12] p-3">
              <div className="mb-3 rounded-lg border border-zinc-800 bg-zinc-900/70 p-3">
                <p className="text-sm font-semibold text-zinc-100">{longTerm.title} ✨</p>
                <p className="mt-1 text-xs text-zinc-400">{longTerm.summary}</p>
                <p className="mt-2 text-xs text-zinc-500">{longTerm.updated_ago}</p>
              </div>

              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">Daily Journal</p>
              <div className="space-y-1">
                {entries.map((entry) => (
                  <button
                    key={entry.id}
                    type="button"
                    onClick={() => setSelectedId(entry.id)}
                    className={`w-full rounded-lg border p-3 text-left ${
                      selected?.id === entry.id
                        ? "border-zinc-700 bg-zinc-800/70"
                        : "border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800/40"
                    }`}
                  >
                    <p className="text-sm font-medium text-zinc-100">{entry.date_key}</p>
                    <p className="mt-1 line-clamp-2 text-xs text-zinc-400">{entry.summary}</p>
                    <p className="mt-2 text-[11px] text-zinc-500">
                      {entry.word_count} words · {entry.updated_ago}
                    </p>
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
                      {selected.word_count} words · {selected.updated_ago}
                    </p>
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
