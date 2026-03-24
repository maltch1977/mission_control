"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Sidebar } from "@/components/sidebar";
import { supabase } from "@/lib/supabase";

type Account = "Brex" | "SoFi" | "Mercury";
type BillingCycle = "monthly" | "yearly" | "weekly" | "unknown";
type Status = "active" | "canceling" | "canceled" | "trial";

type Subscription = {
  id: string;
  name: string;
  amount: number;
  account: Account;
  billing_cycle: BillingCycle | null;
  renewal_date: string | null;
  status: Status;
  category: string | null;
  owner: string | null;
  cancel_url: string | null;
  notes: string | null;
};

const seed: Subscription[] = [];

const blank = {
  name: "",
  amount: "",
  account: "Brex" as Account,
  billing_cycle: "unknown" as BillingCycle,
  renewal_date: "",
  status: "active" as Status,
  category: "",
  owner: "",
  cancel_url: "",
  notes: "",
};

function daysUntil(date: string | null) {
  if (!date) return null;
  const now = new Date();
  const target = new Date(`${date}T00:00:00`);
  const diff = Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return diff;
}

export default function SubscriptionsPage() {
  const [items, setItems] = useState<Subscription[]>(seed);
  const [draft, setDraft] = useState(blank);

  useEffect(() => {
    const load = async () => {
      if (!supabase) return;
      const { data } = await supabase
        .from("subscriptions")
        .select("id,name,amount,account,billing_cycle,renewal_date,status,category,owner,cancel_url,notes")
        .order("created_at", { ascending: false });
      if (data) setItems(data as Subscription[]);
    };
    void load();
  }, []);

  const addSubscription = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!draft.name.trim() || !draft.amount.trim()) return;

    const row: Subscription = {
      id: crypto.randomUUID(),
      name: draft.name.trim(),
      amount: Number(draft.amount),
      account: draft.account,
      billing_cycle: draft.billing_cycle,
      renewal_date: draft.renewal_date || null,
      status: draft.status,
      category: draft.category.trim() || null,
      owner: draft.owner.trim() || null,
      cancel_url: draft.cancel_url.trim() || null,
      notes: draft.notes.trim() || null,
    };

    setItems((prev) => [row, ...prev]);
    setDraft(blank);
    if (supabase) await supabase.from("subscriptions").insert(row);
  };

  const totals = useMemo(() => {
    const active = items.filter((i) => i.status === "active" || i.status === "trial");
    const monthly = active.reduce((sum, i) => {
      if (i.billing_cycle === "yearly") return sum + i.amount / 12;
      if (i.billing_cycle === "weekly") return sum + i.amount * 4.33;
      return sum + i.amount;
    }, 0);
    const yearly = monthly * 12;
    return { monthly, yearly };
  }, [items]);

  const upcoming = useMemo(() => {
    return items
      .filter((i) => i.renewal_date)
      .map((i) => ({ ...i, days: daysUntil(i.renewal_date) }))
      .filter((i) => i.days !== null)
      .sort((a, b) => (a.days as number) - (b.days as number));
  }, [items]);

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100">
      <div className="flex min-h-screen w-full">
        <Sidebar />

        <main className="flex-1 p-4 md:p-6">
          <header className="mb-4">
            <p className="text-xs uppercase tracking-[0.15em] text-zinc-500">Subscriptions</p>
            <h1 className="text-2xl font-semibold text-zinc-50">Subscriptions & Payments</h1>
            <p className="mt-1 text-sm text-zinc-400">Quick add with name + price + account. Enrich details later.</p>
          </header>

          <section className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat label="Items" value={String(items.length)} />
            <Stat label="Monthly Burn" value={`$${totals.monthly.toFixed(2)}`} />
            <Stat label="Yearly Burn" value={`$${totals.yearly.toFixed(2)}`} />
            <Stat label="Upcoming Renewals" value={String(upcoming.length)} />
          </section>

          <section className="mb-4 rounded-xl border border-zinc-800 bg-[#0e0e12] p-3">
            <form className="grid gap-2 md:grid-cols-8" onSubmit={addSubscription}>
              <input value={draft.name} onChange={(e) => setDraft((p) => ({ ...p, name: e.target.value }))} placeholder="Service name" className="md:col-span-2 rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm" />
              <input value={draft.amount} onChange={(e) => setDraft((p) => ({ ...p, amount: e.target.value }))} placeholder="Amount" className="rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm" />
              <select value={draft.account} onChange={(e) => setDraft((p) => ({ ...p, account: e.target.value as Account }))} className="rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"><option>Brex</option><option>SoFi</option><option>Mercury</option></select>
              <select value={draft.billing_cycle} onChange={(e) => setDraft((p) => ({ ...p, billing_cycle: e.target.value as BillingCycle }))} className="rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"><option value="unknown">unknown</option><option value="monthly">monthly</option><option value="yearly">yearly</option><option value="weekly">weekly</option></select>
              <input type="date" value={draft.renewal_date} onChange={(e) => setDraft((p) => ({ ...p, renewal_date: e.target.value }))} className="rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm" />
              <select value={draft.status} onChange={(e) => setDraft((p) => ({ ...p, status: e.target.value as Status }))} className="rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"><option value="active">active</option><option value="trial">trial</option><option value="canceling">canceling</option><option value="canceled">canceled</option></select>
              <button className="rounded bg-violet-600 px-3 py-2 text-sm font-medium" type="submit">+ Add</button>
            </form>
          </section>

          <div className="grid gap-4 xl:grid-cols-[1fr_350px]">
            <section className="rounded-xl border border-zinc-800 bg-[#0e0e12] p-3">
              <h2 className="mb-3 text-sm font-semibold">Subscription List</h2>
              <div className="space-y-2">
                {items.length === 0 ? (
                  <p className="text-sm text-zinc-500">No subscriptions yet.</p>
                ) : (
                  items.map((item) => (
                    <article key={item.id} className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">{item.name}</p>
                        <p className="text-sm font-semibold">${Number(item.amount).toFixed(2)}</p>
                      </div>
                      <p className="mt-1 text-xs text-zinc-400">
                        {item.account} · {item.billing_cycle || "unknown"} · {item.status}
                        {item.renewal_date ? ` · renews ${item.renewal_date}` : ""}
                      </p>
                    </article>
                  ))
                )}
              </div>
            </section>

            <aside className="rounded-xl border border-zinc-800 bg-[#0e0e12] p-3">
              <h2 className="mb-3 text-sm font-semibold">Upcoming Renewals</h2>
              <div className="space-y-2">
                {upcoming.length === 0 ? (
                  <p className="text-sm text-zinc-500">No renewal dates added yet.</p>
                ) : (
                  upcoming.map((u) => (
                    <article key={u.id} className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3">
                      <p className="text-sm font-medium">{u.name}</p>
                      <p className="mt-1 text-xs text-zinc-400">
                        {u.renewal_date} · {u.days! < 0 ? "past due" : `${u.days} days`}
                      </p>
                      <p className="text-xs text-zinc-500">{u.account}</p>
                    </article>
                  ))
                )}
              </div>
            </aside>
          </div>
        </main>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-[#0e0e12] p-4">
      <p className="text-xs uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-zinc-100">{value}</p>
    </div>
  );
}
