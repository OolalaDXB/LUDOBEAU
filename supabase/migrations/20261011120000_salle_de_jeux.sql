-- ============================================================
-- BEAU · Salle de jeux du Souffleur
-- Target: BEAU Treasury Supabase project (lxlpunmdywbhlwifgcpx).
-- Shares auth.users with BEAU: a player is a BEAU account.
-- Additive only: creates new tables and functions, touches nothing else.
-- ============================================================

-- ---------- Identity: display name tied to the BEAU account ----------
create table if not exists public.player_profiles (
  user_id      uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 40),
  lang         text not null default 'en' check (lang in ('fr', 'en')),
  updated_at   timestamptz not null default now()
);

alter table public.player_profiles enable row level security;

create policy "player_profiles: own row readable"
  on public.player_profiles for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "player_profiles: insert own row"
  on public.player_profiles for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "player_profiles: update own row"
  on public.player_profiles for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- ---------- Quiz: one answer per player per ISO week ----------
create table if not exists public.quiz_answers (
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  week_key   text not null check (week_key ~ '^\d{4}-W\d{1,2}$'),
  idx        smallint not null check (idx >= 0),
  pick       smallint not null check (pick between 0 and 2),
  created_at timestamptz not null default now(),
  primary key (user_id, week_key)
);

alter table public.quiz_answers enable row level security;

create policy "quiz_answers: own rows readable"
  on public.quiz_answers for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "quiz_answers: insert own rows"
  on public.quiz_answers for insert to authenticated
  with check ((select auth.uid()) = user_id);
-- No update/delete: a weekly answer is final, like on the device.

-- Aggregated split of answers for a week (no individual answer is exposed).
create or replace function public.quiz_week_stats(p_week_key text)
returns table (pick smallint, answers bigint)
language sql stable security definer set search_path = ''
as $$
  select qa.pick, count(*)::bigint
  from public.quiz_answers qa
  where qa.week_key = p_week_key
  group by qa.pick
  order by qa.pick;
$$;

-- Leaderboard: dilemmas pondered and current streak of consecutive ISO weeks.
create or replace function public.quiz_leaderboard(p_limit int default 20)
returns table (display_name text, answered bigint, streak bigint, last_week text)
language sql stable security definer set search_path = ''
as $$
  with weeks as (
    select qa.user_id, qa.week_key,
           to_date(qa.week_key || '-1', 'IYYY-"W"IW-ID') as monday
    from public.quiz_answers qa
  ),
  islands as (
    select user_id, monday, week_key,
           monday - (row_number() over (partition by user_id order by monday) * 7)::int as grp
    from weeks
  ),
  current_island as (
    -- the island containing the player's latest week, counted only if it reaches this or last week
    select i.user_id, count(*) as streak
    from islands i
    join (select user_id, max(monday) as last_monday from weeks group by user_id) l
      on l.user_id = i.user_id
    where i.grp = (select i2.grp from islands i2 where i2.user_id = l.user_id and i2.monday = l.last_monday)
      and l.last_monday >= date_trunc('week', now())::date - 7
    group by i.user_id
  )
  select coalesce(p.display_name, 'BEAU') as display_name,
         count(*)::bigint as answered,
         coalesce(max(ci.streak), 0)::bigint as streak,
         max(w.week_key) filter (where w.monday = (select max(w2.monday) from weeks w2 where w2.user_id = w.user_id)) as last_week
  from weeks w
  left join public.player_profiles p on p.user_id = w.user_id
  left join current_island ci on ci.user_id = w.user_id
  group by w.user_id, p.display_name
  order by streak desc, answered desc, display_name
  limit greatest(1, least(p_limit, 100));
$$;

-- ---------- Sealed wager: the seal is public, the prediction is not ----------
create table if not exists public.wagers (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  client_id  text not null,                 -- id generated on the device
  deadline   date not null,
  sealed_at  text not null,                 -- exact ISO string hashed into the seal
  seal_hash  text not null check (seal_hash ~ '^[0-9a-f]{64}$'),
  stake      text check (char_length(stake) <= 120),
  revealed   boolean not null default false,
  outcome    text check (outcome in ('won', 'lost')),
  created_at timestamptz not null default now(),
  unique (user_id, client_id),
  unique (seal_hash)
);

create index if not exists wagers_user_idx on public.wagers (user_id);

alter table public.wagers enable row level security;

create policy "wagers: seals are public"
  on public.wagers for select to anon, authenticated
  using (true);
create policy "wagers: insert own"
  on public.wagers for insert to authenticated
  with check ((select auth.uid()) = user_id and revealed = false);
create policy "wagers: update own"
  on public.wagers for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "wagers: delete own"
  on public.wagers for delete to authenticated
  using ((select auth.uid()) = user_id);

-- The seal itself never changes once written.
create or replace function public.wagers_freeze_seal()
returns trigger language plpgsql set search_path = ''
as $$
begin
  if new.seal_hash <> old.seal_hash or new.sealed_at <> old.sealed_at
     or new.deadline <> old.deadline or new.user_id <> old.user_id
     or new.client_id <> old.client_id then
    raise exception 'A sealed wager cannot be altered';
  end if;
  if old.revealed and not new.revealed then
    raise exception 'A revealed wager stays revealed';
  end if;
  -- "revealed" only flips through wager_reveals
  if new.revealed <> old.revealed
     and not exists (select 1 from public.wager_reveals r where r.wager_id = new.id) then
    raise exception 'Reveal the wager through wager_reveals';
  end if;
  return new;
end;
$$;

-- ---------- Reveal: written once, checked server-side against the seal ----------
create table if not exists public.wager_reveals (
  wager_id    uuid primary key references public.wagers (id) on delete cascade,
  prediction  text not null check (char_length(prediction) between 1 and 1000),
  salt        text not null check (salt ~ '^[0-9a-f]{16}$'),
  revealed_at timestamptz not null default now()
);

alter table public.wager_reveals enable row level security;

create policy "wager_reveals: revealed wagers are public"
  on public.wager_reveals for select to anon, authenticated
  using (true);
create policy "wager_reveals: owner reveals"
  on public.wager_reveals for insert to authenticated
  with check (exists (
    select 1 from public.wagers w
    where w.id = wager_id and w.user_id = (select auth.uid())
  ));

-- Same canonical form as the client: prediction ␟ deadline ␟ sealed_at ␟ salt (U+241F).
create or replace function public.wager_seal_of(p_prediction text, p_deadline date, p_sealed_at text, p_salt text)
returns text language sql immutable set search_path = ''
as $$
  select encode(
    sha256(convert_to(
      btrim(p_prediction) || U&'\241F' || to_char(p_deadline, 'YYYY-MM-DD')
      || U&'\241F' || p_sealed_at || U&'\241F' || p_salt, 'UTF8')),
    'hex');
$$;

create or replace function public.wager_reveals_verify()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare w public.wagers;
begin
  select * into w from public.wagers where id = new.wager_id;
  if public.wager_seal_of(new.prediction, w.deadline, w.sealed_at, new.salt) <> w.seal_hash then
    raise exception 'Seal mismatch: the prediction does not match the seal';
  end if;
  new.prediction := btrim(new.prediction);
  return new;
end;
$$;

create or replace function public.wager_reveals_mark()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  update public.wagers set revealed = true where id = new.wager_id;
  return new;
end;
$$;

drop trigger if exists wagers_freeze_seal on public.wagers;
create trigger wagers_freeze_seal before update on public.wagers
  for each row execute function public.wagers_freeze_seal();

drop trigger if exists wager_reveals_verify on public.wager_reveals;
create trigger wager_reveals_verify before insert on public.wager_reveals
  for each row execute function public.wager_reveals_verify();

drop trigger if exists wager_reveals_mark on public.wager_reveals;
create trigger wager_reveals_mark after insert on public.wager_reveals
  for each row execute function public.wager_reveals_mark();

-- Public wall of revealed wagers, with the author's display name.
create or replace function public.wager_wall(p_limit int default 30)
returns table (
  seal_hash text, prediction text, deadline date, sealed_at text,
  stake text, outcome text, revealed_at timestamptz, display_name text
)
language sql stable security definer set search_path = ''
as $$
  select w.seal_hash, r.prediction, w.deadline, w.sealed_at,
         w.stake, w.outcome, r.revealed_at, coalesce(p.display_name, 'BEAU')
  from public.wager_reveals r
  join public.wagers w on w.id = r.wager_id
  left join public.player_profiles p on p.user_id = w.user_id
  order by r.revealed_at desc
  limit greatest(1, least(p_limit, 100));
$$;

-- ---------- Cross wagers (A seals, B takes the other side) ----------
-- Schema only for now: no UI yet.
create table if not exists public.wager_challenges (
  id                  uuid primary key default gen_random_uuid(),
  wager_id            uuid not null references public.wagers (id) on delete cascade,
  challenger_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  counter_seal_hash   text not null check (counter_seal_hash ~ '^[0-9a-f]{64}$'),
  counter_sealed_at   text not null,
  counter_prediction  text,
  counter_salt        text check (counter_salt ~ '^[0-9a-f]{16}$'),
  counter_revealed_at timestamptz,
  created_at          timestamptz not null default now(),
  unique (wager_id, challenger_id)
);

alter table public.wager_challenges enable row level security;

create policy "wager_challenges: public"
  on public.wager_challenges for select to anon, authenticated
  using (true);
create policy "wager_challenges: challenge someone else's wager"
  on public.wager_challenges for insert to authenticated
  with check (
    (select auth.uid()) = challenger_id
    and counter_prediction is null and counter_salt is null
    and not exists (select 1 from public.wagers w where w.id = wager_id and w.user_id = (select auth.uid()))
  );
create policy "wager_challenges: challenger reveals"
  on public.wager_challenges for update to authenticated
  using ((select auth.uid()) = challenger_id)
  with check ((select auth.uid()) = challenger_id);

create or replace function public.wager_challenges_verify()
returns trigger language plpgsql set search_path = ''
as $$
declare d date;
begin
  if new.counter_seal_hash <> old.counter_seal_hash or new.counter_sealed_at <> old.counter_sealed_at
     or new.wager_id <> old.wager_id or new.challenger_id <> old.challenger_id then
    raise exception 'A counter seal cannot be altered';
  end if;
  if old.counter_prediction is not null then
    raise exception 'Counter wager already revealed';
  end if;
  if new.counter_prediction is not null then
    select deadline into d from public.wagers where id = new.wager_id;
    if public.wager_seal_of(new.counter_prediction, d, new.counter_sealed_at, new.counter_salt) <> new.counter_seal_hash then
      raise exception 'Seal mismatch: the counter prediction does not match its seal';
    end if;
    new.counter_prediction := btrim(new.counter_prediction);
    new.counter_revealed_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists wager_challenges_verify on public.wager_challenges;
create trigger wager_challenges_verify before update on public.wager_challenges
  for each row execute function public.wager_challenges_verify();

-- ---------- Grants for RPCs ----------
revoke all on function public.quiz_week_stats(text) from public;
revoke all on function public.quiz_leaderboard(int) from public;
revoke all on function public.wager_wall(int) from public;
grant execute on function public.quiz_week_stats(text) to anon, authenticated;
grant execute on function public.quiz_leaderboard(int) to anon, authenticated;
grant execute on function public.wager_wall(int) to anon, authenticated;
