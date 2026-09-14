import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { assessmentId, email } = await request.json();
    if (!assessmentId) return NextResponse.json({ error: "Assessment ID is required" }, { status: 400 });

    const apiKey = process.env.WHOP_API_KEY;
    const companyId = process.env.WHOP_COMPANY_ID;
    const planId = process.env.WHOP_PLAN_ID;

    if (!apiKey || !companyId || !planId) {
      return NextResponse.json({ error: "Whop is not configured. Add WHOP_API_KEY, WHOP_COMPANY_ID and WHOP_PLAN_ID to .env.local." }, { status: 500 });
    }

    const origin = new URL(request.url).origin;

    const res = await fetch("https://api.whop.com/api/v1/checkout_configurations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        company_id: companyId,
        plan_id: planId,
        redirect_url: `${origin}/checkout/complete`,
        metadata: {
          assessment_id: assessmentId,
          email: email || ""
        }
      })
    });

    const data = await res.json();
    if (!res.ok) {
      console.error("Whop checkout error", data);
      return NextResponse.json({ error: "Unable to create Whop checkout", detail: data }, { status: res.status });
    }

    return NextResponse.json({ purchaseUrl: data.purchase_url, checkoutConfigId: data.id });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Checkout creation failed" }, { status: 500 });
  }
}
