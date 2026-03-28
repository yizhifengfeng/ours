-- Core tables
create table if not exists admins (
  id uuid primary key default gen_random_uuid(),
  username text unique not null,
  password_hash text not null,
  created_at timestamptz not null default now()
);

create table if not exists places (
  id uuid primary key default gen_random_uuid(),
  city text not null,
  province text not null,
  lng double precision not null,
  lat double precision not null,
  note text default '',
  image_url text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists place_photos (
  id uuid primary key default gen_random_uuid(),
  place_city text not null,
  image_url text not null,
  created_at timestamptz not null default now()
);

create table if not exists danmaku (
  id uuid primary key default gen_random_uuid(),
  place_city text not null,
  identity text not null check (identity in ('dafu', 'zhouzhou')),
  text text not null,
  created_at timestamptz not null default now()
);

create table if not exists keywords (
  id uuid primary key default gen_random_uuid(),
  owner text not null,
  word text not null,
  created_at timestamptz not null default now()
);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  "from" text not null,
  "to" text not null,
  content text not null,
  date text not null,
  x double precision not null default 10,
  y double precision not null default 10,
  created_at timestamptz not null default now()
);

create table if not exists letters (
  id uuid primary key default gen_random_uuid(),
  recipient text not null,
  title text not null,
  content text not null,
  date date not null,
  status text not null default 'pending' check (status in ('pending', 'processed')),
  scheduled_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists letter_reads (
  visitor_id text not null,
  letter_id uuid not null references letters(id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (visitor_id, letter_id)
);

create table if not exists music_tracks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  bucket text not null default 'uploads-music',
  path text not null,
  is_current boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Example admin seeds (replace hash with bcrypt hash, do not use plaintext)
-- insert into admins (username, password_hash)
-- values
--   ('yizhifengfeng', '$2a$10$replace_with_bcrypt_hash'),
--   ('zhouzhou', '$2a$10$replace_with_bcrypt_hash')
-- on conflict (username) do nothing;
