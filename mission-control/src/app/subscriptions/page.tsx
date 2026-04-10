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
  created_at?: string;
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

function toISODate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function inferRenewalDate(item: Subscription) {
  if (item.renewal_date) return item.renewal_date;
  const base = item.created_at ? new Date(item.created_at) : new Date();
  const cycle = item.billing_cycle || "unknown";
  if (cycle === "weekly") base.setDate(base.getDate() + 7);
  else if (cycle === "yearly") base.setFullYear(base.getFullYear() + 1);
  else base.setMonth(base.getMonth() + 1);
  return toISODate(base);
}

function daysUntil(date: string) {
  const now = new Date();
  const target = new Date(`${date}T00:00:00`);
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export default function SubscriptionsPage() {
  const [items, setItems] = useState<Subscription[]>(seed);
  const [draft, setDraft] = useState(blank);

  useEffect(() => {
    const load = async () => {
      if (!supabase) return;
      const { data } = await supabase
        .from("subscriptions")
        .select("id,name,amount,account,billing_cycle,renewal_date,status,category,owner,cancel_url,notes,created_at")
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
      .map((i) => {
        const assumed = !i.renewal_date;
        const date = inferRenewalDate(i);
        return { ...i, renewal_effective: date, days: daysUntil(date), assumed };
      })
      .sort((a, b) => a.days - b.days);
  }, [items]);

  const monthlyBuckets = useMemo(() => {
    const grouped = new Map<string, typeof upcoming>();
    for (const row of upcoming) {
      const d = new Date(`${row.renewal_effective}T00:00:00`);
      const key = d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
      const list = grouped.get(key) ?? [];
      list.push(row);
      grouped.set(key, list);
    }
    return Array.from(grouped.entries()).slice(0, 12);
  }, [upcoming]);

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
            <p className="text-sm text-zinc-300">Manual entry disabled. Tell Panda any new subscription and it will be added for you.</p>
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
              <h2 className="mb-3 text-sm font-semibold">Upcoming Renewals List</h2>
              <div className="space-y-3">
                {monthlyBuckets.length === 0 ? (
                  <p className="text-sm text-zinc-500">No subscriptions found.</p>
                ) : (
                  monthlyBuckets.map(([month, rows]) => (
                    <div key={month}>
                      <p className="mb-1 text-xs font-semibold text-zinc-400">{month}</p>
                      <div className="space-y-2">
                        {rows.map((u) => (
                          <article key={u.id} className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-sm font-medium">{u.name}</p>
                              <p className="text-xs text-zinc-300">${Number(u.amount).toFixed(2)}</p>
                            </div>
                            <p className="mt-1 text-xs text-zinc-400">
                              {u.renewal_effective} · {u.days < 0 ? "past due" : `${u.days} days`} · {u.account}
                            </p>
                            {u.assumed && <p className="text-[11px] text-amber-300">Assumed renewal date (no exact date set)</p>}
                          </article>
                        ))}
                      </div>
                    </div>
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
