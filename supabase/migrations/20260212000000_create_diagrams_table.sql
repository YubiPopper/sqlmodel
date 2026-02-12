-- Create diagrams table
create table public.diagrams (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  name text not null,
  description text,
  data jsonb not null,
  is_public boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Add RLS (Row Level Security) policies
alter table public.diagrams enable row level security;

-- Users can view their own diagrams
create policy "Users can view own diagrams"
  on public.diagrams for select
  using (auth.uid() = user_id);

-- Users can view public diagrams
create policy "Anyone can view public diagrams"
  on public.diagrams for select
  using (is_public = true);

-- Users can insert their own diagrams
create policy "Users can insert own diagrams"
  on public.diagrams for insert
  with check (auth.uid() = user_id);

-- Users can update their own diagrams
create policy "Users can update own diagrams"
  on public.diagrams for update
  using (auth.uid() = user_id);

-- Users can delete their own diagrams
create policy "Users can delete own diagrams"
  on public.diagrams for delete
  using (auth.uid() = user_id);

-- Create index for faster queries
create index diagrams_user_id_idx on public.diagrams(user_id);
create index diagrams_is_public_idx on public.diagrams(is_public);

-- Create updated_at trigger
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger diagrams_updated_at
  before update on public.diagrams
  for each row
  execute procedure public.handle_updated_at();
