"use client";

import { Sidebar } from "@/components/sidebar";

type CronItem = {
  name: string;
  cadence: string;
  localTime: string;
  purpose: string;
  id: string;
  status: "Active" | "Paused";
};

const hourly: CronItem[] = [
  {
    name: "Telegram health watchdog",
    cadence: "Every 10 minutes",
    localTime: "Every 10 minutes",
    purpose: "Watches gateway logs for errors and health issues",
    id: "60a03d8e-2d05-49fc-b232-b4a40d931131",
    status: "Active",
  },
  {
    name: "Hourly ops log snapshot",
    cadence: "Hourly",
    localTime: "At :05 each hour",
    purpose: "Appends compact ops snapshot to daily memory",
    id: "9546de95-3587-4a46-8592-31a7400ff697",
    status: "Active",
  },
];

const daily: CronItem[] = [
  {
    name: "Nightly memory digest",
    cadence: "Daily",
    localTime: "1:15 AM",
    purpose: "Curated memory rollup + next-day top priorities",
    id: "bd9cb68d-1c53-4f94-933c-a6ef0ae087d3",
    status: "Active",
  },
];

export default function CronsPage() {
  return (
    <div className="min-h-screen bg-[#060609] text-zinc-100">
      <div className="flex min-h-screen w-full">
        <Sidebar />

        <main className="flex-1 px-5 py-6 md:px-8 md:py-8">
          <header className="mb-6">
            <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Scheduler</p>
            <h1 className="mt-1 text-4xl font-semibold tracking-tight">Crons</h1>
            <p className="mt-2 text-sm text-zinc-400">
              Local-time schedule only. Everything here is shown in your timezone.
            </p>
          </header>

          <section className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-3">
            <Stat label="Timezone" value="CST" />
            <Stat label="Hourly Jobs" value={String(hourly.length)} />
            <Stat label="Daily Jobs" value={String(daily.length)} />
          </section>

          <Group title="Hourly">
            {hourly.map((job) => (
              <CronCard key={job.id} job={job} />
            ))}
          </Group>

          <Group title="Daily">
            {daily.map((job) => (
              <CronCard key={job.id} job={job} />
            ))}
          </Group>

          <Group title="Weekly">
            <p className="text-sm text-zinc-400">No weekly jobs configured yet.</p>
          </Group>
        </main>
      </div>
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-4 rounded-2xl border border-zinc-800 bg-[#0e0e12] p-4">
      <h2 className="mb-3 text-xs uppercase tracking-[0.18em] text-zinc-500">{title}</h2>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function CronCard({ job }: { job: CronItem }) {
  return (
    <article className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3">
      <div className="mb-1 flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-zinc-200">{job.name}</p>
        <p className={`text-xs font-semibold ${job.status === "Active" ? "text-emerald-300" : "text-zinc-400"}`}>
          {job.status}
        </p>
      </div>
      <p className="text-xs text-zinc-400">{job.purpose}</p>
      <p className="mt-2 text-xs text-zinc-500">Cadence: {job.cadence}</p>
      <p className="text-xs text-zinc-500">Runs: {job.localTime} (local)</p>
      <p className="mt-1 text-[11px] text-zinc-600">ID: {job.id}</p>
    </article>
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
