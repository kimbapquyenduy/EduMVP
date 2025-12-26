import Link from "next/link";

/* Navigation Component */
function Navigation() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-20">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
              <span className="text-white font-bold text-lg">E</span>
            </div>
            <span className="text-xl font-bold text-foreground">EDU Platform</span>
          </Link>
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-muted-foreground hover:text-foreground transition-smooth font-medium">Features</a>
            <a href="#how-it-works" className="text-muted-foreground hover:text-foreground transition-smooth font-medium">How it Works</a>
            <a href="#testimonials" className="text-muted-foreground hover:text-foreground transition-smooth font-medium">Testimonials</a>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="px-4 py-2 text-foreground font-medium hover:bg-white/50 rounded-xl transition-smooth hidden sm:block">
              Login
            </Link>
            <Link href="/signup" className="px-5 py-2.5 bg-primary text-white font-semibold rounded-xl hover:bg-primary/90 transition-smooth shadow-lg shadow-primary/25">
              Get Started
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}

/* Hero Section with Storytelling */
function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-muted/30" />

      {/* Floating decorative elements */}
      <div className="absolute top-32 left-10 w-20 h-20 rounded-full bg-gradient-to-br from-primary/30 to-secondary/30 animate-float blur-sm" />
      <div className="absolute top-48 right-20 w-32 h-32 rounded-full bg-gradient-to-br from-secondary/20 to-primary/20 animate-float-delayed blur-sm" />
      <div className="absolute bottom-32 left-1/4 w-16 h-16 rounded-2xl bg-gradient-to-br from-accent/20 to-primary/20 animate-float-slow rotate-12" />
      <div className="absolute top-1/3 right-1/4 w-24 h-24 rounded-3xl bg-gradient-to-br from-primary/15 to-secondary/15 animate-float rotate-45" />
      <div className="absolute bottom-48 right-10 w-12 h-12 rounded-full bg-accent/20 animate-pulse-glow" />

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="animate-slide-up">
          <span className="inline-block px-4 py-2 rounded-full bg-primary/10 text-primary font-medium text-sm mb-6">
            Community-Driven Learning Platform
          </span>
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold text-foreground mb-6 animate-slide-up stagger-1 leading-tight">
          Learn Together,<br />
          <span className="text-gradient">Grow Together</span>
        </h1>

        <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 animate-slide-up stagger-2 leading-relaxed">
          Join vibrant learning communities where teachers share knowledge and students thrive.
          Access premium courses, connect in real-time, and achieve your goals.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center animate-slide-up stagger-3">
          <Link
            href="/signup?role=teacher"
            className="group px-8 py-4 bg-primary text-white font-bold rounded-2xl hover:bg-primary/90 transition-smooth shadow-xl shadow-primary/30 flex items-center justify-center gap-3"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            I&apos;m a Teacher
            <span className="group-hover:translate-x-1 transition-transform">→</span>
          </Link>
          <Link
            href="/signup?role=student"
            className="group px-8 py-4 bg-accent text-white font-bold rounded-2xl hover:bg-accent/90 transition-smooth shadow-xl shadow-accent/30 flex items-center justify-center gap-3"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            I&apos;m a Student
            <span className="group-hover:translate-x-1 transition-transform">→</span>
          </Link>
        </div>
      </div>
    </section>
  );
}

/* Stats/Trust Bar */
function StatsSection() {
  const stats = [
    { value: "10,000+", label: "Students" },
    { value: "500+", label: "Teachers" },
    { value: "1,000+", label: "Courses" },
    { value: "95%", label: "Satisfaction" },
  ];

  return (
    <section className="py-16 bg-white/50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((stat, i) => (
            <div key={stat.label} className={`text-center animate-count-up stagger-${i + 1}`}>
              <div className="text-3xl sm:text-4xl font-extrabold text-primary mb-1">{stat.value}</div>
              <div className="text-muted-foreground font-medium">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* How It Works Section */
function HowItWorksSection() {
  const steps = [
    {
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      title: "Join a Community",
      description: "Find learning communities that match your interests or create your own as a teacher."
    },
    {
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      ),
      title: "Access Premium Content",
      description: "Unlock courses, videos, PDFs, and exclusive resources from expert teachers."
    },
    {
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
      title: "Grow Together",
      description: "Chat, collaborate, and succeed with peers who share your learning journey."
    }
  ];

  return (
    <section id="how-it-works" className="py-20 md:py-28">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">How It Works</h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Get started in three simple steps and transform your learning experience
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 relative">
          {/* Connection line */}
          <div className="hidden md:block absolute top-16 left-1/6 right-1/6 h-0.5 bg-gradient-to-r from-primary/20 via-primary to-primary/20" />

          {steps.map((step, i) => (
            <div key={step.title} className="relative">
              <div className="clay-card p-8 text-center transition-smooth h-full">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white mx-auto mb-6 relative z-10">
                  {step.icon}
                </div>
                <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-accent text-white font-bold flex items-center justify-center text-sm">
                  {i + 1}
                </div>
                <h3 className="text-xl font-bold text-foreground mb-3">{step.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* Features Bento Grid */
function FeaturesSection() {
  const features = [
    { icon: "🎓", title: "Community Learning", desc: "Learn with peers in focused communities", size: "md:col-span-2" },
    { icon: "📹", title: "Video Courses", desc: "HD video lessons with progress tracking", size: "" },
    { icon: "💬", title: "Real-time Chat", desc: "Connect instantly with teachers and students", size: "" },
    { icon: "🔒", title: "Content Locking", desc: "Free and premium tier access control", size: "" },
    { icon: "📊", title: "Progress Tracking", desc: "Monitor your learning journey", size: "" },
    { icon: "🌟", title: "Teacher Profiles", desc: "Build your reputation and reach", size: "md:col-span-2" },
  ];

  return (
    <section id="features" className="py-20 md:py-28 bg-gradient-to-b from-muted/30 to-background">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">Everything You Need</h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Powerful features designed for modern education
          </p>
        </div>

        <div className="grid md:grid-cols-4 gap-4">
          {features.map((f) => (
            <div key={f.title} className={`clay-card p-6 transition-smooth group cursor-pointer ${f.size}`}>
              <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">{f.icon}</div>
              <h3 className="text-lg font-bold text-foreground mb-2">{f.title}</h3>
              <p className="text-muted-foreground text-sm">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* Testimonial Section */
function TestimonialSection() {
  return (
    <section id="testimonials" className="py-20 md:py-28">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="clay-card p-8 md:p-12 text-center relative overflow-hidden">
          {/* Decorative quote marks */}
          <div className="absolute top-4 left-4 text-8xl text-primary/10 font-serif leading-none">&ldquo;</div>
          <div className="absolute bottom-4 right-4 text-8xl text-primary/10 font-serif leading-none">&rdquo;</div>

          <p className="text-xl md:text-2xl text-foreground font-medium mb-8 relative z-10 leading-relaxed">
            This platform transformed how I teach my students online. The community features and content management tools are exactly what I needed.
          </p>

          <div className="flex items-center justify-center gap-4">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold text-xl">
              S
            </div>
            <div className="text-left">
              <div className="font-bold text-foreground">Sarah M.</div>
              <div className="text-muted-foreground text-sm">Math Teacher</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* Final CTA Section */
function CTASection() {
  return (
    <section className="py-20 md:py-28 bg-gradient-to-br from-primary to-secondary relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute top-10 left-10 w-32 h-32 rounded-full bg-white/10 animate-float" />
      <div className="absolute bottom-10 right-10 w-24 h-24 rounded-full bg-white/10 animate-float-delayed" />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-6">
          Ready to Start Your Learning Journey?
        </h2>
        <p className="text-white/80 text-lg mb-10 max-w-2xl mx-auto">
          Join thousands of teachers and students already transforming education together.
        </p>
        <Link
          href="/signup"
          className="inline-flex items-center gap-3 px-10 py-5 bg-white text-primary font-bold rounded-2xl hover:bg-white/90 transition-smooth shadow-2xl text-lg"
        >
          Get Started for Free
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </Link>
      </div>
    </section>
  );
}

/* Footer */
function Footer() {
  return (
    <footer className="py-12 bg-foreground text-white/70">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
              <span className="text-white font-bold text-sm">E</span>
            </div>
            <span className="font-bold text-white">EDU Platform</span>
          </div>

          <div className="flex flex-wrap justify-center gap-6 text-sm">
            <a href="#" className="hover:text-white transition-smooth">About</a>
            <a href="#" className="hover:text-white transition-smooth">Contact</a>
            <a href="#" className="hover:text-white transition-smooth">Privacy</a>
            <a href="#" className="hover:text-white transition-smooth">Terms</a>
          </div>

          <div className="text-sm">
            © 2024 EDU Platform. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
}

/* Main Page */
export default function Home() {
  return (
    <main className="min-h-screen">
      <Navigation />
      <HeroSection />
      <StatsSection />
      <HowItWorksSection />
      <FeaturesSection />
      <TestimonialSection />
      <CTASection />
      <Footer />
    </main>
  );
}
