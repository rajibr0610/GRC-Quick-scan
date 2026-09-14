import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

// Returns the full AI report for an assessment, but only once the server has confirmed
// payment. /api/analyze only ever sends the client a preview - this is the sole path
// that can release top_risks detail, evidence and the 30-day plan.
export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("assessmentId");
  if (!id) return NextResponse.json({ error: "Missing assessmentId" }, { status: 400 });

  try {
    const db = supabaseAdmin();
    const { data, error } = await db.from("assessments").select("paid, ai_report").eq("id", id).single();
    if (error || !data) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const unlocked = process.env.DEMO_UNLOCK === "true" || !!data.paid;
    if (!unlocked) return NextResponse.json({ error: "Payment required" }, { status: 402 });

    return NextResponse.json({ report: data.ai_report });
  } catch (e) {
    console.error("Report fetch failed", e);
    return NextResponse.json({ error: "Could not load report" }, { status: 500 });
  }
}
