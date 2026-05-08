-- Omnireads Database Schema
-- Run this in Supabase -> SQL Editor

-- 1. Profiles (extends auth.users)
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  name text,
  avatar_url text,
  bio text,
  created_at timestamp with time zone default now()
);

-- 2. Books
create table public.books (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  author text not null,
  genre text,
  description text,
  cover_url text,
  created_at timestamp with time zone default now()
);

-- 3. Ratings
create table public.ratings (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  book_id uuid references public.books(id) on delete cascade not null,
  score integer check (score >= 1 and score <= 5) not null,
  created_at timestamp with time zone default now(),
  unique(user_id, book_id)
);

-- 4. Friendships
create table public.friendships (
  id uuid default gen_random_uuid() primary key,
  initiator_id uuid references public.profiles(id) on delete cascade not null,
  receiver_id uuid references public.profiles(id) on delete cascade not null,
  status text default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  created_at timestamp with time zone default now(),
  unique(initiator_id, receiver_id)
);

-- 5. Direct recommendations
create table public.recommendations (
  id uuid default gen_random_uuid() primary key,
  from_user_id uuid references public.profiles(id) on delete cascade not null,
  to_user_id uuid references public.profiles(id) on delete cascade not null,
  book_id uuid references public.books(id) on delete cascade not null,
  message text,
  created_at timestamp with time zone default now()
);

-- 6. Auto-- Update profile trigger to be more robust
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, name, avatar_url, username, full_name)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url',
    COALESCE(
      new.raw_user_meta_data->>'username',
      SPLIT_PART(new.email, '@', 1) || '_' || SUBSTR(new.id::text, 1, 4)
    ),
    new.raw_user_meta_data->>'full_name'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add search index for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_username_trgm ON profiles USING gin (username gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_profiles_name_trgm ON profiles USING gin (name gin_trgm_ops);

-- Insert dummy data for testing (only if not exists)
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_user_meta_data)
VALUES 
  ('a1111111-1111-1111-1111-111111111111', 'alex.bibliophile@example.com', crypt('password123', gen_salt('bf')), now(), '{"full_name": "Alex Librarian", "username": "alex_books"}'),
  ('b2222222-2222-2222-2222-222222222222', 'beatrice.reads@example.com', crypt('password123', gen_salt('bf')), now(), '{"full_name": "Beatrice Scholar", "username": "bea_reads"}'),
  ('c3333333-3333-3333-3333-333333333333', 'charles.curator@example.com', crypt('password123', gen_salt('bf')), now(), '{"full_name": "Charles Curator", "username": "charley_c"}')
ON CONFLICT (id) DO NOTHING;

-- Trigger handle_new_user will populate profiles, but we can ensure they are there
INSERT INTO public.profiles (id, name, username, full_name, bio)
VALUES 
  ('a1111111-1111-1111-1111-111111111111', 'Alex Librarian', 'alex_books', 'Alex Librarian', 'Obsessed with 19th-century classics.'),
  ('b2222222-2222-2222-2222-222222222222', 'Beatrice Scholar', 'bea_reads', 'Beatrice Scholar', 'Researching medieval manuscripts.'),
  ('c3333333-3333-3333-3333-333333333333', 'Charles Curator', 'charley_c', 'Charles Curator', 'Preserving the digital age of literature.')
ON CONFLICT (id) DO NOTHING;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 7. Enable RLS
alter table public.profiles enable row level security;
alter table public.books enable row level security;
alter table public.ratings enable row level security;
alter table public.friendships enable row level security;
alter table public.recommendations enable row level security;

-- 8. Policies
create policy "Profiles are public" on public.profiles for select using (true);
create policy "Users update own profile" on public.profiles for update using (auth.uid() = id);

create policy "Books are public" on public.books for select using (true);
create policy "Authenticated can add books" on public.books for insert with check (auth.role() = 'authenticated');

create policy "Ratings are public" on public.ratings for select using (true);
create policy "Users manage own ratings" on public.ratings for all using (auth.uid() = user_id);

create policy "Users see own friendships" on public.friendships for select using (
  auth.uid() = initiator_id or auth.uid() = receiver_id
);
create policy "Users send friend requests" on public.friendships for insert with check (auth.uid() = initiator_id);
create policy "Receiver updates status" on public.friendships for update using (auth.uid() = receiver_id);

create policy "Users see own recommendations" on public.recommendations for select using (
  auth.uid() = from_user_id or auth.uid() = to_user_id
);
create policy "Users send recommendations" on public.recommendations for insert with check (auth.uid() = from_user_id);
