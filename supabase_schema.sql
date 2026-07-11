-- Supabase Database Schema for Plexoria

create table profiles (
  id uuid primary key references auth.users(id),
  username text unique not null,
  avatar_url text,
  created_at timestamptz default now()
);

create table watchlist_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  tmdb_id int not null,
  media_type text check (media_type in ('movie','tv')),
  added_at timestamptz default now(),
  unique (user_id, tmdb_id, media_type)
);

create table ratings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  tmdb_id int not null,
  media_type text check (media_type in ('movie','tv')),
  score numeric check (score between 0 and 10),
  created_at timestamptz default now(),
  unique (user_id, tmdb_id, media_type)
);

create table reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  tmdb_id int not null,
  media_type text check (media_type in ('movie','tv')),
  body text not null,
  created_at timestamptz default now()
);

create table custom_lists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  name text not null,
  description text,
  is_public boolean default true,
  created_at timestamptz default now()
);

create table list_items (
  id uuid primary key default gen_random_uuid(),
  list_id uuid references custom_lists(id) on delete cascade,
  tmdb_id int not null,
  media_type text check (media_type in ('movie','tv')),
  added_at timestamptz default now()
);

create table watched_episodes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  tmdb_id int not null,          -- tv show id
  season_number int not null,
  episode_number int not null,
  watched_at timestamptz default now(),
  unique (user_id, tmdb_id, season_number, episode_number)
);

-- Note: Enable Row Level Security (RLS) on all tables in the Supabase Dashboard
-- Create policies so users can only insert/update/delete their own rows.
