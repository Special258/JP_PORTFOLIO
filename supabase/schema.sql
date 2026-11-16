create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 100),
  email text not null check (char_length(email) between 3 and 254),
  message text not null check (char_length(message) between 10 and 5000),
  created_at timestamptz not null default now()
);

alter table public.contact_messages enable row level security;

revoke all on table public.contact_messages from public, anon, authenticated, service_role;
grant insert on table public.contact_messages to service_role;

create index if not exists contact_messages_created_at_idx
  on public.contact_messages (created_at desc);
