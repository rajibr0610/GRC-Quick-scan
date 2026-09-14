# GRC QuickScan — V1 MVP

A 10-minute startup security readiness assessment.

## What is included

- Landing page
- Company profile
- 15-question assessment
- Deterministic scoring engine
- Domain-level scores
- Free results page
- $9 full-report CTA placeholder
- Email-save placeholder
- Responsive UI
- Compliance/readiness disclaimer

## Run locally

Requires Node.js 18+.

```bash
npm install
npm run dev
```

Open http://localhost:3000

## Production work still needed

1. Connect Supabase for assessments/responses.
2. Add server-side AI report generation.
3. Generate a PDF full report.
4. Replace the $9 button with the Whop checkout/product URL.
5. Verify Whop purchase before exposing the full report.
6. Add email delivery.
7. Add analytics.
8. Add privacy policy and terms.
9. Add rate limiting and abuse protection.

## Suggested V1 AI flow

Send the assessment profile + scored responses to your LLM provider and require structured JSON containing:
- executive_summary
- top_risks
- domain_findings
- enterprise_readiness
- 30_day_plan

Do not allow the model to calculate the overall score. The application should calculate it deterministically.

## V2 changes

- Richer results page
- Enterprise Deal Readiness preview
- Prioritized findings
- 30-day action-plan preview
- Stronger $9 full-report value proposition


## V3 — AI report layer

The app now includes `/api/analyze`, which generates a structured GRC report from the assessment.

### Optional AI setup

1. Copy `.env.local.example` to `.env.local`.
2. Add your API key.
3. Restart `npm run dev`.

If `GEMINI_API_KEY` is not set, the app automatically generates a deterministic fallback report so the UI can still be tested.

### Important

Keep API keys server-side. Do not put the key in client-side React code.

The next production step is to connect the `$9` CTA to a Whop checkout and verify payment before revealing the complete report.


## V4 — Whop payment-ready

This version adds a production-oriented payment flow:

1. Assessment is saved to Supabase.
2. The app creates a Whop checkout configuration with the assessment ID in metadata.
3. Customer pays the one-time plan.
4. Whop sends `payment.succeeded` to `/api/whop/webhook`.
5. The server marks the assessment as paid.
6. The full report is unlocked only after server-side payment confirmation.

### Whop setup

Whop supports one-time products/plans and checkout sessions with metadata. Create a one-time $9 plan in your Whop dashboard, then copy its plan ID. The app uses a checkout configuration so the assessment ID can be carried as metadata. Whop recommends using `payment.succeeded` webhooks for fulfillment rather than trusting the browser redirect.

Create a webhook in Whop:

`https://YOUR-DOMAIN.com/api/whop/webhook`

Subscribe to `payment.succeeded` and copy the webhook secret.

### Supabase setup

Create a Supabase project, open SQL Editor, and run `supabase-schema.sql`. Then put the project URL and service-role key in `.env.local`. Never expose the service-role key to the browser.

### Environment

Copy `.env.local.example` to `.env.local` and fill in all values.

### Local testing

Set `DEMO_UNLOCK=true` only while testing the paid-report UI. Set it back to `false` before production.
