create extension if not exists pgcrypto;

create table if not exists public.password_reset_tokens (
  id uuid default gen_random_uuid() primary key,
  email text not null unique,
  token_hash text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists password_reset_tokens_token_hash_idx
  on public.password_reset_tokens (token_hash);
