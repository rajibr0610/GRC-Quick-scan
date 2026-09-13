
create table if not exists assessments (
  id uuid primary key default gen_random_uuid(),
  email text,
  company_size text,
  company_type text,
  market text,
  goals jsonb default '[]'::jsonb,
  score integer not null,
  domain_scores jsonb not null,
  responses jsonb not null,
  ai_report jsonb,
  paid boolean not null default false,
  whop_payment_id text,
  created_at timestamptz not null default now()
);

create index if not exists assessments_email_idx on assessments(email);
create index if not exists assessments_whop_payment_idx on assessments(whop_payment_id);
