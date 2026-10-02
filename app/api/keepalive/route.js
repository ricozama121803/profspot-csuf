import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Hit by a scheduled job (see vercel.json) so the free-tier Supabase project never sits idle long enough to pause.
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(req) {
    const secret = process.env.CRON_SECRET;
    if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) {
        return NextResponse.json({ error: "Supabase env vars are not set" }, { status: 500 });
    }

    // A real query against Postgres, not just an HTTP ping, so it counts as database activity
    const supabase = createClient(url, key, { auth: { persistSession: false } });
    const { error } = await supabase.from("keepalive").select("id").limit(1);
    if (error) {
        console.error("Supabase keepalive failed", error);
        return NextResponse.json({ ok: false, error: error.message }, { status: 502 });
    }
    return NextResponse.json({ ok: true, at: new Date().toISOString() });
}
