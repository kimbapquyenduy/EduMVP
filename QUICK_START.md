# 🚀 Quick Start Guide - EDU Platform MVP

## ✅ What's Been Built (Phase 0-2)

Congratulations! Your EDU Platform MVP has been successfully set up with:

- ✅ Next.js 15 + TypeScript + Tailwind CSS
- ✅ Supabase integration (ready to connect)
- ✅ Authentication system with role-based access
- ✅ Teacher dashboard and school management
- ✅ Database schema for schools, courses, and memberships

---

## 🎯 Next Steps to Run the App

### Step 1: Setup Supabase (5 minutes)

**Important**: You need a Supabase project to run the app.

1. Go to [https://supabase.com](https://supabase.com) and sign up (free)
2. Create a new project:
   - Name: `edu-mvp`
   - Database Password: (save this somewhere)
   - Region: Choose closest to you

3. Wait ~2 minutes for project to be ready

4. Get your credentials:
   - Click **Settings** (left sidebar) → **API**
   - Copy **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - Copy **anon public** key (starts with `eyJ...`)

5. Create `.env.local` file in project root:

```bash
NEXT_PUBLIC_SUPABASE_URL=your-project-url-here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

---

### Step 2: Setup Database (2 minutes)

1. In Supabase Dashboard, click **SQL Editor** (left sidebar)
2. Click **New Query**
3. Open `supabase/migrations/001_initial_schema.sql` from your project
4. Copy all the SQL code
5. Paste into Supabase SQL Editor
6. Click **Run** (bottom right)
7. ✅ You should see: "Success. No rows returned"

**Disable Email Confirmation (for easier testing):**
1. Go to **Authentication** → **Providers** → **Email**
2. Toggle OFF "Confirm email"
3. Click Save

---

### Step 3: Run the App

```bash
# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## 🧪 Testing Flow

### Test 1: Create Teacher Account

1. Click "Get Started" or visit `/signup`
2. Click "I'm a Teacher" card
3. Fill in:
   - Full Name: `John Teacher`
   - Email: `teacher@test.com`
   - Password: `password123`
4. Click "Create Account"
5. ✅ Should redirect to `/teacher/dashboard`

### Test 2: Create a School

1. In Teacher Dashboard, click "Create School"
2. Fill in:
   - School Name: `Web Development Masterclass`
   - Description: `Learn modern web development`
   - Price: Select `$10/month`
3. Click "Create School"
4. ✅ Should redirect to school detail page with tabs

### Test 3: View School Tabs

1. In School Detail page, click through tabs:
   - **Courses** tab: Shows "No courses yet"
   - **Members** tab: Shows "No members yet"
   - **Community Feed** tab: Shows "Coming in Phase 4"

2. Click "Back to Dashboard"
3. ✅ Should see your school listed with stats

### Test 4: Create Student Account (Optional)

1. Logout (or open incognito window)
2. Go to `/signup`
3. Click "I'm a Student"
4. Create account with different email
5. ✅ Should redirect to `/student/dashboard` (currently empty - Phase 3)

---

## 📊 Verify Database

1. In Supabase Dashboard, click **Table Editor**
2. Check these tables exist:
   - ✅ `profiles` - Should have 1+ user
   - ✅ `schools` - Should have your created school
   - ✅ `courses` - Empty (no courses created yet)
   - ✅ `memberships` - Empty (no members yet)

---

## 🐛 Troubleshooting

### "Failed to fetch" error
- Check `.env.local` has correct Supabase URL and key
- Restart dev server: Stop (Ctrl+C) and run `npm run dev` again

### "Cannot read profile" error
- Make sure you ran the SQL migration
- Check Supabase → SQL Editor for any errors

### "Page not found" after signup
- Check Supabase → Authentication → Users
- User should be created there
- Try logging in again at `/login`

### Build errors
```bash
# Clear cache and rebuild
rm -rf .next
npm run build
```

---

## 🎯 What to Do Next

### Option A: Continue to Phase 3 (Student Flow)
Build student dashboard, school discovery, and content locking features.

### Option B: Enhance Phase 2 (Teacher Features)
- Add course creation form
- Add file upload (videos/PDFs)
- Add school settings page

### Option C: Test & Polish
- Add error handling
- Improve UI/UX
- Add loading states
- Mobile responsive testing

---

## 📁 Project Structure Overview

```
src/
├── app/
│   ├── (auth)/              # Login & Signup
│   ├── teacher/             # Teacher dashboard & schools
│   ├── student/             # Student area (Phase 3)
│   └── page.tsx             # Landing page
│
├── components/
│   ├── ui/                  # shadcn components
│   ├── teacher/             # Teacher-specific
│   └── student/             # Student-specific
│
├── lib/
│   ├── supabase/            # Database client
│   └── types/               # TypeScript types
│
supabase/
└── migrations/              # SQL schemas
```

---

## 🔗 Useful Commands

```bash
# Development
npm run dev            # Start dev server
npm run build          # Build for production
npm run start          # Run production build
npm run lint           # Check code quality

# Supabase (if using Supabase CLI)
supabase status        # Check Supabase connection
supabase db reset      # Reset database (CAREFUL!)
```

---

## 📚 Documentation

- [README.md](./README.md) - Full project documentation
- [SETUP_GUIDE.md](./SETUP_GUIDE.md) - Detailed setup instructions
- [Next.js Docs](https://nextjs.org/docs)
- [Supabase Docs](https://supabase.com/docs)

---

## ✨ Features Checklist

### ✅ Working Features
- [x] User signup with role selection (Teacher/Student)
- [x] Login with email/password
- [x] Protected routes (role-based redirects)
- [x] Teacher dashboard with school stats
- [x] Create school with pricing
- [x] School detail page with tabs
- [x] View courses (empty state)
- [x] View members (empty state)

### 🚧 Coming in Phase 3-4
- [ ] Student can browse schools
- [ ] Student can join schools
- [ ] Content locking (Free vs Premium)
- [ ] Video/PDF course player
- [ ] Community feed (posts, comments)
- [ ] Real-time chat
- [ ] Notifications

---

**🎉 Congratulations! Your EDU Platform MVP is ready to use!**

If everything works, you've successfully built:
- A full-stack Next.js application
- Role-based authentication system
- Teacher management interface
- PostgreSQL database with Row Level Security
- Modern UI with Tailwind CSS and shadcn/ui

**Ready for Phase 3? Let me know!** 🚀
