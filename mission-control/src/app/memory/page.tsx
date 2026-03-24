import { Sidebar } from "@/components/sidebar";

export default function MemoryPage() {
  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100">
      <div className="flex min-h-screen w-full">
        <Sidebar />
        <main className="flex-1 p-4 md:p-6">
          <p className="text-xs uppercase tracking-[0.15em] text-zinc-500">Memory</p>
          <h1 className="text-2xl font-semibold text-zinc-50">Memory screen coming next</h1>
          <p className="mt-2 text-sm text-zinc-400">Next build: daily memory timeline + long-term memory panel.</p>
        </main>
      </div>
    </div>
  );
}
