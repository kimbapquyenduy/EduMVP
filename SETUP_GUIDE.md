# EDU Platform MVP - Setup Guide

## 📋 Prerequisites
- Node.js 18+ installed
- A Supabase account (free tier works)

---

## 🚀 Step 1: Setup Supabase Project

1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Click **"New Project"**
3. Fill in:
   - **Name**: `edu-mvp-production`
   - **Database Password**: (create a strong password and save it)
   - **Region**: Choose closest to you (e.g., Southeast Asia - Singapore)
4. Click **"Create new project"** (wait ~2 minutes for setup)

---

## 🔑 Step 2: Get API Credentials

1. In your Supabase project dashboard, go to **Settings** → **API**
2. Copy these values:
   - **Project URL** (looks like: `https://xxxxx.supabase.co`)
   - **anon public key** (starts with `eyJh...`)

---

## ⚙️ Step 3: Configure Environment Variables

1. Create `.env.local` file in project root:
```bash
cp .env.local.example .env.local
```

2. Edit `.env.local` and paste your credentials:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...your-key-here
```

---

## 🗄️ Step 4: Run Database Migration

1. In Supabase Dashboard, go to **SQL Editor**
2. Click **"New Query"**
3. Copy the entire content from `supabase/migrations/001_initial_schema.sql`
4. Paste it into the SQL Editor
5. Click **"Run"** (bottom right)
6. ✅ You should see success message: "Success. No rows returned"

---

## 📦 Step 5: Install Dependencies & Run

```bash
# Already done if following from Phase 0
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## ✅ Verify Setup

### Check Database Tables
1. In Supabase Dashboard → **Table Editor**
2. You should see these tables:
   - ✅ `profiles`
   - ✅ `schools`
   - ✅ `courses`
   - ✅ `memberships`

### Test Auth Flow
1. Go to [http://localhost:3000/signup](http://localhost:3000/signup)
2. Choose "Teacher" or "Student" role
3. Fill in signup form
4. Should redirect to dashboard based on role

---

## 🐛 Troubleshooting

### Error: "Failed to fetch"
- Check if `.env.local` has correct values
- Restart dev server: `npm run dev`

### Error: "relation profiles does not exist"
- Run the SQL migration again in Supabase Dashboard
- Make sure all tables are created

### Can't create account
- Check Supabase Dashboard → **Authentication** → **Users**
- See if signup emails are being sent (check spam folder)
- For MVP: Disable email confirmation in **Authentication** → **Providers** → **Email** → Uncheck "Confirm email"

---

## 📚 What's Next?

After setup is complete, you can:
- Create a Teacher account and setup a school
- Create a Student account and join schools
- Test content locking (free vs premium courses)

---

## 🔗 Useful Links

- [Supabase Dashboard](https://supabase.com/dashboard)
- [Supabase Docs](https://supabase.com/docs)
- [Next.js Docs](https://nextjs.org/docs)
