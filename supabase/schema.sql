-- Run once in the Supabase SQL editor.
-- Also enable Authentication > Providers > Anonymous Sign-Ins.

create table if not exists public.player_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  nickname text not null,
  score bigint not null default 0,
  stats jsonb not null default '{}'::jsonb,
  progress jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  constraint nickname_length check (char_length(nickname) between 1 and 20)
);

alter table public.player_profiles enable row level security;

-- The table is accessed only through the two narrow RPC functions below.
revoke all on public.player_profiles from anon, authenticated;

create or replace function public.submit_player_progress(
  p_nickname text,
  p_stats jsonb,
  p_progress jsonb
) returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  calculated_score bigint;
  clean_name text;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  clean_name := left(trim(coalesce(p_nickname, '')), 20);
  if char_length(clean_name) = 0 then clean_name := 'גיבור'; end if;

  -- The server owns the formula and clamps every input. This prevents accidental
  -- corruption; a determined user can still tamper with a static browser game.
  calculated_score :=
      least(138, greatest(0, coalesce((p_stats->>'stars')::int, 0))) * 100
    + least(46, greatest(0, coalesce((p_stats->>'cleared')::int, 0))) * 150
    + least(144, greatest(0, coalesce((p_stats->>'goldFacts')::int, 0))) * 50
    + least(144, greatest(0, coalesce((p_stats->>'silverFacts')::int, 0))) * 25
    + least(144, greatest(0, coalesce((p_stats->>'bronzeFacts')::int, 0))) * 10
    + least(50000, greatest(0, coalesce((p_stats->>'gearValue')::int, 0)))
    + least(4, greatest(1, coalesce((p_stats->>'suits')::int, 1))) * 500
    + least(100000, greatest(0, coalesce((p_stats->>'rounds')::int, 0))) * 10
    + least(1000000, greatest(0, coalesce((p_stats->>'lifetimeSilk')::int, 0))) / 10
    + least(1000000, greatest(0, coalesce((p_stats->>'highScore')::int, 0))) / 20;

  insert into public.player_profiles (user_id, nickname, score, stats, progress, updated_at)
  values (auth.uid(), clean_name, calculated_score, p_stats, p_progress, now())
  on conflict (user_id) do update set
    nickname = excluded.nickname,
    score = excluded.score,
    stats = excluded.stats,
    progress = excluded.progress,
    updated_at = now();

  return calculated_score;
end;
$$;

create or replace function public.get_top_players()
returns table (
  rank bigint,
  nickname text,
  score bigint,
  stars int,
  gear_count int,
  suits int,
  is_me boolean
)
language sql
security definer
stable
set search_path = public
as $$
  select
    row_number() over (order by p.score desc, p.updated_at asc) as rank,
    p.nickname,
    p.score,
    coalesce((p.stats->>'stars')::int, 0) as stars,
    coalesce((p.stats->>'gearCount')::int, 0) as gear_count,
    coalesce((p.stats->>'suits')::int, 1) as suits,
    p.user_id = auth.uid() as is_me
  from public.player_profiles p
  order by p.score desc, p.updated_at asc
  limit 10;
$$;

create or replace function public.get_my_progress()
returns jsonb
language sql
security definer
stable
set search_path = public
as $$
  select progress from public.player_profiles where user_id = auth.uid();
$$;

revoke execute on function public.submit_player_progress(text, jsonb, jsonb) from public, anon;
revoke execute on function public.get_top_players() from public;
revoke execute on function public.get_my_progress() from public, anon;
grant execute on function public.submit_player_progress(text, jsonb, jsonb) to authenticated;
grant execute on function public.get_top_players() to anon, authenticated;
grant execute on function public.get_my_progress() to authenticated;
