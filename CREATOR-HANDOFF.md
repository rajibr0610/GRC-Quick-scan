# GRC QuickScan — Creator Handoff

This ZIP contains:
1. The current MVP source scaffold
2. PRODUCT-BRIEF.md — the master product requirements and positioning
3. Supabase schema
4. Example environment configuration
5. Next.js application structure
6. AI analysis endpoint and Whop payment scaffolding

## Important
This is an MVP/prototype handoff, not a claim that every production hardening item is complete.

Known priority for the creator:
- Validate the AI report flow
- Validate Supabase persistence
- Harden paid-report access so the full report is never exposed before payment
- Verify the current Whop SDK/API payloads
- Verify Whop webhook signature handling and idempotency
- Add production validation/error handling
- Deploy to Vercel
- Test end-to-end payment in sandbox before launch

## Local setup
1. `npm install --legacy-peer-deps`
2. Copy `.env.local.example` to `.env.local`
3. Add server-side keys
4. `npm run dev`

Do not commit `.env.local`.

## Product
GRC QuickScan
“Know your security gaps before your customer finds them.”
