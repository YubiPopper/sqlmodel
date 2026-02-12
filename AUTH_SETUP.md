# Authentication & Cloud Storage Setup

SQLModel now supports user authentication and cloud diagram storage via Supabase! This guide will help you get started.

## 🚀 Quick Start

### 1. Start Local Supabase (Development)

```bash
# Start Supabase local instance
supabase start

# This will output URLs and keys - the defaults in .env.example already work!
```

### 2. Start the App

```bash
npm run dev
```

### 3. Sign In

Click the "Sign In" button in the top-right corner of the navbar. You can:
- **Create an account** with email/password
- **Sign in with Google** (requires OAuth setup - see below)
- **Sign in with GitHub** (requires OAuth setup - see below)

### 4. Save & Share Diagrams

Once signed in, you can:
- **Save diagrams** to the cloud (click user menu > Save Diagram)
- **Load saved diagrams** (click user menu > My Diagrams)
- **Make diagrams public** to share with others
- **Browse public diagrams** from other users

## 📋 Features

### Authentication
- ✅ Email/password registration and login
- ✅ Google OAuth (optional)
- ✅ GitHub OAuth (optional)
- ✅ Persistent sessions
- ✅ User profile menu

### Diagram Storage
- ✅ Save diagrams with name and description
- ✅ Update existing diagrams
- ✅ Load saved diagrams
- ✅ Delete diagrams
- ✅ Make diagrams public for sharing
- ✅ Browse public diagrams from community
- ✅ Automatic diagram versioning

## 🔧 OAuth Provider Setup (Optional)

OAuth providers (Google, GitHub) require additional configuration:

### Google OAuth

1. **Create OAuth Credentials**:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a project or select existing
   - Enable Google+ API
   - Create OAuth 2.0 Client ID
   - Add redirect URI: `http://localhost:54321/auth/v1/callback`

2. **Configure in Supabase**:
   ```bash
   supabase dashboard
   ```
   - Navigate to Authentication > Providers > Google
   - Enable Google provider
   - Add your Client ID and Client Secret

### GitHub OAuth

1. **Create OAuth App**:
   - Go to [GitHub Developer Settings](https://github.com/settings/developers)
   - Click "New OAuth App"
   - Set Authorization callback URL: `http://localhost:54321/auth/v1/callback`
   - Copy Client ID and generate Client Secret

2. **Configure in Supabase**:
   ```bash
   supabase dashboard
   ```
   - Navigate to Authentication > Providers > GitHub
   - Enable GitHub provider
   - Add your Client ID and Client Secret

## 🗄️ Database Structure

Your diagrams are stored in a PostgreSQL database with the following schema:

```sql
diagrams (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES auth.users,
  name text NOT NULL,
  description text,
  data jsonb NOT NULL,  -- Full diagram data
  is_public boolean DEFAULT false,
  created_at timestamp,
  updated_at timestamp
)
```

### Security (Row Level Security)
- ✅ Users can only access their own diagrams
- ✅ Public diagrams visible to everyone
- ✅ No one can modify other users' diagrams

## 🌐 Production Deployment

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Wait for project to finish setting up

### 2. Run Migrations

```bash
# Link your local project to production
supabase link --project-ref your-project-ref

# Push database schema to production
supabase db push
```

### 3. Update Environment Variables

Create a `.env` file (copy from `.env.example`):

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-production-anon-key
```

Get these values from your Supabase project:
- Project Settings > API > Project URL
- Project Settings > API > Project API keys > anon/public

### 4. Configure OAuth (Production)

Update OAuth redirect URLs for production:
- Google: `https://your-project.supabase.co/auth/v1/callback`
- GitHub: `https://your-project.supabase.co/auth/v1/callback`

Update in Supabase Dashboard (Production):
- Authentication > URL Configuration > Site URL
- Set to your production domain (e.g., `https://yourdomain.com`)

## 🛠️ Development Tools

### View Database

Access Supabase Studio to view/edit data:
```bash
# Opens http://localhost:54323
supabase dashboard
```

Or connect directly with any PostgreSQL client:
```
Host: localhost
Port: 54322
User: postgres
Password: postgres
Database: postgres
```

### View Emails (Local)

Emails (like registration confirmations) are captured by Inbucket:
```
http://localhost:54324
```

### Stop Supabase

```bash
supabase stop
```

## 📊 Data Storage Format

Diagrams are stored as JSON with the following structure:

```json
{
  "conceptual": {
    "entities": [...],
    "relationships": [...],
    "groups": [...]
  },
  "physical": {
    "tables": [...],
    "foreignKeys": [...],
    "tableGroups": [...]
  },
  "nodeLayouts": {...},
  "tableLayouts": {...},
  "viewport": {...},
  "viewMode": "conceptual"
}
```

## 🐛 Troubleshooting

### "User must be logged in"
- Make sure you're signed in (check for user menu in navbar)
- Try signing out and back in
- Check browser console for auth errors

### OAuth not working
- Verify callback URLs match exactly
- Check that provider is enabled in Supabase Dashboard
- Make sure Client ID/Secret are correct
- Try in incognito mode to rule out cookie issues

### Can't see saved diagrams
- Verify you're signed in as the correct user
- Check that diagram was saved successfully (look for success message)
- Try refreshing the page
- Check browser console for errors

### Supabase won't start
- Ensure Docker is running
- Check if ports 54321-54324 are available
- Run `supabase stop` then `supabase start`
- Check Docker logs: `docker logs supabase_db_sqlmodel`

## 🔐 Security Best Practices

1. **Never commit `.env` file** - it's in `.gitignore` by default
2. **Use strong passwords** for production databases
3. **Enable 2FA** on your Supabase account
4. **Regularly update** Supabase CLI and dependencies
5. **Review RLS policies** before going to production
6. **Use environment-specific** OAuth credentials

## 📚 Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Auth Guide](https://supabase.com/docs/guides/auth)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [OAuth Providers](https://supabase.com/docs/guides/auth/social-login)
