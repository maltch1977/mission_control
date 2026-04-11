import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(req: Request) {
  if (!supabaseAdmin) {
    return NextResponse.json(
      { ok: false, error: "Supabase admin client not configured" },
      { status: 500 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const status = body?.status ?? "active";
  const ran_at = body?.ran_at ?? new Date().toISOString();
  const duration_ms = body?.duration_ms ?? null;
  const supermemory_ok = body?.supermemory_ok ?? null;
  const warning_count = body?.warning_count ?? 0;
  const error_count = body?.error_count ?? 0;
  const notes = body?.notes ?? null;
  const checks = Array.isArray(body?.checks) ? body.checks : [];

  const runInsert = await supabaseAdmin
    .from("heartbeat_runs")
    .insert([{ status, ran_at, duration_ms, supermemory_ok, warning_count, error_count, notes }])
    .select("id,ran_at,status,duration_ms,supermemory_ok,warning_count,error_count,notes,created_at")
    .single();

  if (runInsert.error || !runInsert.data) {
    return NextResponse.json(
      { ok: false, error: runInsert.error?.message ?? "Failed to insert run" },
      { status: 500 }
    );
  }

  const run = runInsert.data;

  if (checks.length > 0) {
    const payload = checks.map((c: any) => ({
      run_id: run.id,
      check_key: c?.check_key ?? "unknown",
      result: c?.result ?? "pass",
      message: c?.message ?? null,
      completed_at: c?.completed_at ?? new Date().toISOString(),
    }));

    const checksInsert = await supabaseAdmin.from("heartbeat_checks").insert(payload);

    if (checksInsert.error) {
      return NextResponse.json(
        { ok: false, error: checksInsert.error.message, run },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ ok: true, run });
}
