# EDU Platform MVP 🎓

A modern educational platform connecting teachers and students through community-driven learning and content locking mechanisms.

## 🚀 What's Built (Phase 0-2)

### ✅ Phase 0: Setup & Infrastructure
- [x] Next.js 15 with TypeScript and Tailwind CSS
- [x] Supabase integration (Auth, Database, RLS)
- [x] shadcn/ui component library
- [x] Project folder structure
- [x] Configuration files (TypeScript, Tailwind, ESLint)

### ✅ Phase 1: Authentication & RBAC
- [x] Role-based signup (Teacher/Student)
- [x] Login with email/password
- [x] Protected routes middleware
- [x] Auto-redirect based on user role
- [x] Database schema for user profiles
- [x] Row Level Security (RLS) policies

### ✅ Phase 2: Teacher Flow
- [x] Teacher dashboard with school overview
- [x] Create school functionality
- [x] School detail page with tabs
- [x] Courses management interface
- [x] Members list view
- [x] Database schema for schools, courses, memberships

## 🏗️ Tech Stack

- **Frontend**: Next.js 15 (App Router), React, TypeScript, Tailwind CSS
- **UI Components**: shadcn/ui
- **Backend**: Supabase (PostgreSQL, Auth, RLS)
- **Icons**: Lucide React
- **Hosting**: Ready for Vercel deployment

## 📦 Installation

```bash
# Install dependencies
npm install

# Setup environment variables
cp .env.local.example .env.local
# Edit .env.local with your Supabase credentials

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## 🗄️ Database Setup

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Copy your project URL and anon key to `.env.local`
3. Run the migration script:
   - Go to Supabase Dashboard → SQL Editor
   - Copy content from `supabase/migrations/001_initial_schema.sql`
   - Execute the SQL

See [SETUP_GUIDE.md](./SETUP_GUIDE.md) for detailed instructions.

## 🎯 Features Implemented

### For Teachers:
- ✅ Create and manage multiple schools
- ✅ Set membership pricing (Free or Paid - MVP simulation)
- ✅ View school statistics (members, courses)
- ✅ Manage courses with tier settings (Free/Premium)
- ✅ View members list with status

### For Students:
- 🚧 Join schools (Coming in Phase 3)
- 🚧 Access free content (Coming in Phase 3)
- 🚧 Unlock premium content (Coming in Phase 3)
- 🚧 Chat with teachers (Coming in Phase 4)

## 📁 Project Structure

```
edu-mvp/
├── src/
│   ├── app/
│   │   ├── (auth)/           # Auth routes (login, signup)
│   │   ├── teacher/          # Teacher dashboard & school management
│   │   ├── student/          # Student routes (Phase 3)
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── globals.css
│   ├── components/
│   │   ├── ui/               # shadcn/ui components
│   │   ├── teacher/          # Teacher-specific components
│   │   └── student/          # Student components (Phase 3)
│   ├── lib/
│   │   ├── supabase/         # Supabase client utilities
│   │   ├── types/            # TypeScript types
│   │   └── utils.ts
│   └── hooks/                # Custom React hooks
├── supabase/
│   └── migrations/           # Database migration SQL files
├── public/
└── [config files]
```

## 🔐 Authentication Flow

1. User visits `/signup`
2. Chooses role: Teacher or Student
3. Fills in registration form
4. Account created in Supabase Auth
5. Profile created automatically via trigger
6. Redirected to role-specific dashboard

## 🛣️ Routes

### Public Routes
- `/` - Landing page
- `/login` - Login page
- `/signup` - Registration with role selection

### Teacher Routes (Protected)
- `/teacher/dashboard` - Teacher dashboard
- `/teacher/schools/new` - Create new school
- `/teacher/schools/[schoolId]` - School detail & management

### Student Routes (Protected - Phase 3)
- `/student/dashboard` - Student dashboard
- `/student/schools/[schoolId]` - School view & courses

## 🗃️ Database Schema

### Tables:
- **profiles** - User profiles with role (TEACHER/STUDENT)
- **schools** - Learning communities created by teachers
- **courses** - Learning content (videos, PDFs) with tier settings
- **memberships** - Student subscriptions to schools (FREE/PREMIUM)

### Row Level Security (RLS):
- Teachers can only manage their own schools
- Students can view schools they've joined
- Content access based on membership tier
- Automatic profile creation on signup

## 🧪 Testing Checklist

- [x] Create teacher account
- [x] Teacher can access dashboard
- [x] Teacher can create school
- [x] School detail page loads correctly
- [ ] Create student account
- [ ] Student can access dashboard
- [ ] Authentication redirects work correctly

## 🚧 What's Next (Phase 3-5)

### Phase 3: Student Flow
- Student dashboard
- Browse and join schools
- Subscription simulation (upgrade to premium)
- Course viewing with lock/unlock UI
- Video player & PDF viewer

### Phase 4: Social Features
- Community feed (posts, likes, comments)
- Real-time chat (peer-to-peer & teacher chat)
- Notifications

### Phase 5: Deployment
- Environment variables check
- Vercel deployment
- Production database setup
- Final testing

## 🐛 Known Issues & Limitations

- This is an MVP with simulated payments (no actual payment processing)
- Email confirmation is disabled for easier testing
- Some features are placeholders (Phase 3-4)
- Video/PDF upload not yet implemented (URLs only)

## 📚 Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [shadcn/ui Documentation](https://ui.shadcn.com)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

## 🤝 Contributing

This is an MVP project. For production use, consider:
- Implementing real payment processing (Stripe/PayPal)
- Adding email verification
- Implementing file upload for courses
- Adding search and discovery features
- Implementing analytics dashboard

## 📝 License

MIT License - feel free to use this for your own projects!

---

**Built with ❤️ using Next.js and Supabase**

**Status**: Phase 0-2 Complete ✅ | Ready for Phase 3 Development
