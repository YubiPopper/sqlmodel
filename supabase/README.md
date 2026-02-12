# Supabase Setup Guide

This guide will help you set up Supabase for local development with authentication and diagram storage.

## Quick Start (Local Development)

### 1. Start Supabase locally

```bash
supabase start
```

This command will:
- Start a local Supabase instance with PostgreSQL
- Run all migrations in `supabase/migrations/`
- Provide you with local URLs and keys

### 2. Configure OAuth Providers (Optional)

#### Google OAuth
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add redirect URL: `http://localhost:54321/auth/v1/callback`
6. Copy Client ID and Client Secret
7. Add to Supabase Dashboard:
   ```bash
   supabase dashboard
   ```
   Navigate to Authentication > Providers > Google

#### GitHub OAuth
1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Create a new OAuth App
3. Set Authorization callback URL: `http://localhost:54321/auth/v1/callback`
4. Copy Client ID and generate a Client Secret
5. Add to Supabase Dashboard:
   ```bash
   supabase dashboard
   ```
   Navigate to Authentication > Providers > GitHub

### 3. View Database

You can view and manage your database through:
- Supabase Studio: `http://localhost:54323`
- Direct PostgreSQL connection: `postgresql://postgres:postgres@localhost:54322/postgres`

## Database Schema

The app uses a single table for storing diagrams:

### `diagrams` table
- `id` (uuid, primary key)
- `user_id` (uuid, foreign key to auth.users)
- `name` (text) - Diagram name
- `description` (text) - Optional description
- `data` (jsonb) - Full diagram data (entities, relationships, tables, etc.)
- `is_public` (boolean) - Whether the diagram is publicly visible
- `created_at` (timestamp)
- `updated_at` (timestamp)

## Row Level Security (RLS)

The following RLS policies are in place:
- Users can view their own diagrams
- Anyone can view public diagrams
- Users can only insert/update/delete their own diagrams

## Stopping Supabase

```bash
supabase stop
```

## Production Deployment

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Get your project URL and anon key from Project Settings > API
3. Update `.env` with production values:
   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-production-anon-key
   ```
4. Run migrations:
   ```bash
   supabase db push
   ```
5. Configure OAuth providers in the Supabase Dashboard

## Troubleshooting

### Supabase won't start
- Make sure Docker is running
- Check if ports 54321-54323 are available
- Try `supabase stop` and then `supabase start` again

### OAuth not working
- Verify redirect URLs match exactly
- Check that providers are enabled in Supabase Dashboard
- Ensure client IDs and secrets are correct

### Can't see saved diagrams
- Check if user is authenticated
- Verify RLS policies are applied
- Check browser console for errors
