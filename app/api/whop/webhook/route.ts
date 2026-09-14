import { unwrapWebhook } from "@whop/sdk/helpers";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    const secret = process.env.WHOP_WEBHOOK_SECRET;
    if (!secret) return new Response("Webhook not configured", { status: 500 });

    const body = await request.text();
    const headers = Object.fromEntries(request.headers);

    // Pass the ws_-prefixed secret exactly as Whop issued it: unwrapWebhook derives
    // the verification key internally. Do not strip the prefix or re-encode it here.
    const event: any = unwrapWebhook(body, { headers, key: secret });

    if (event.type === "payment.succeeded") {
      const payment: any = event.data;
      const assessmentId = payment?.metadata?.assessment_id;

      if (assessmentId) {
        const db = supabaseAdmin();
        const { error } = await db.from("assessments").update({
          paid: true,
          whop_payment_id: payment.id
        }).eq("id", assessmentId);
        if (error) {
          console.error("Failed to mark assessment paid", error);
          // Non-2xx so Whop retries delivery instead of considering this fulfilled.
          return new Response("Failed to record payment", { status: 500 });
        }
      }
    }

    return new Response("OK", { status: 200 });
  } catch (e) {
    console.error("Whop webhook error", e);
    return new Response("Invalid webhook", { status: 400 });
  }
}
