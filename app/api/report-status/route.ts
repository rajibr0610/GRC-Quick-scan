import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("assessmentId");
  if (!id) return NextResponse.json({ error: "Missing assessmentId" }, { status: 400 });

  if (process.env.DEMO_UNLOCK === "true") return NextResponse.json({ paid: true });

  try {
    const db = supabaseAdmin();
    const { data, error } = await db.from("assessments").select("paid").eq("id", id).single();
    if (error) return NextResponse.json({ paid: false });
    return NextResponse.json({ paid: !!data?.paid });
  } catch {
    return NextResponse.json({ paid: false });
  }
}
