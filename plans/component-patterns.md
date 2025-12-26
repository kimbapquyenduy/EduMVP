# EdTech Landing Design - Component Code Patterns
**Tech Stack:** React + TypeScript + Tailwind CSS + Framer Motion
**For:** EduMVP Community-Driven Learning Platform

---

## 1. SEGMENTED HERO COMPONENT

```tsx
// components/Hero.tsx
import { motion } from 'framer-motion';
import { ArrowRight, Play } from 'lucide-react';

export function Hero() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.2 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <div className="relative min-h-screen bg-white overflow-hidden">
      {/* Video Background */}
      <video
        autoPlay
        loop
        muted
        className="absolute inset-0 w-full h-full object-cover opacity-10"
      >
        <source src="/hero-bg.mp4" type="video/mp4" />
      </video>

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 py-20">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid md:grid-cols-2 gap-12 items-center"
        >
          {/* Left: Text */}
          <div>
            <motion.h1
              variants={itemVariants}
              className="text-5xl md:text-6xl font-bold text-[#1e3a5f] mb-6 leading-tight"
            >
              The Platform Where Teachers Teach & Students Learn Together
            </motion.h1>

            <motion.p
              variants={itemVariants}
              className="text-xl text-gray-600 mb-8"
            >
              Create courses, build community, earn impact. Join 10K+ educators and 500K+ students.
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              variants={itemVariants}
              className="flex gap-4"
            >
              <button className="bg-[#14b8a6] hover:bg-[#0d9488] text-white px-8 py-4 rounded-lg font-semibold flex items-center gap-2 transition-all hover:shadow-lg">
                Start Teaching
                <ArrowRight size={20} />
              </button>
              <button className="border-2 border-[#14b8a6] text-[#14b8a6] hover:bg-[#14b8a6] hover:text-white px-8 py-4 rounded-lg font-semibold transition-all">
                Browse Courses
              </button>
            </motion.div>

            {/* Stats */}
            <motion.div
              variants={itemVariants}
              className="mt-12 flex gap-8 text-sm"
            >
              <div>
                <div className="text-2xl font-bold text-[#1e3a5f]">500K+</div>
                <div className="text-gray-600">Students</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-[#1e3a5f]">10K+</div>
                <div className="text-gray-600">Educators</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-[#1e3a5f]">95%</div>
                <div className="text-gray-600">Completion</div>
              </div>
            </motion.div>
          </div>

          {/* Right: Visual */}
          <motion.div
            variants={itemVariants}
            className="relative hidden md:block"
          >
            <div className="relative w-full aspect-square rounded-2xl bg-gradient-to-br from-[#14b8a6] to-[#1e3a5f] overflow-hidden shadow-2xl">
              {/* Placeholder: Replace with actual image */}
              <div className="w-full h-full flex items-center justify-center">
                <Play className="text-white" size={64} />
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
```

---

## 2. SEGMENTATION SWITCHER (Teacher vs Student View)

```tsx
// components/AudienceSegment.tsx
import { useState } from 'react';
import { motion } from 'framer-motion';

export function AudienceSegment() {
  const [segment, setSegment] = useState<'teacher' | 'student'>('teacher');

  const teacherContent = {
    title: "Create your own courses",
    description: "Design, upload, and manage your courses. Earn from engaged students.",
    features: ["Video hosting", "Interactive quizzes", "Student tracking", "Certificate generation"],
    cta: "Start Teaching Free"
  };

  const studentContent = {
    title: "Learn from expert teachers",
    description: "Access thousands of courses. Learn at your pace, anywhere.",
    features: ["Browse 10K+ courses", "Lifetime access", "Community support", "Skill verification"],
    cta: "Browse Courses"
  };

  const content = segment === 'teacher' ? teacherContent : studentContent;

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      {/* Segment Switcher */}
      <div className="flex gap-4 mb-12 bg-gray-100 p-1 rounded-lg w-fit">
        {(['teacher', 'student'] as const).map((seg) => (
          <button
            key={seg}
            onClick={() => setSegment(seg)}
            className={`px-6 py-3 rounded-lg font-semibold transition-all ${
              segment === seg
                ? 'bg-white text-[#14b8a6] shadow-md'
                : 'text-gray-600'
            }`}
          >
            {seg === 'teacher' ? '👨‍🏫 I\'m a Teacher' : '👨‍🎓 I\'m a Student'}
          </button>
        ))}
      </div>

      {/* Content */}
      <motion.div
        key={segment}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        <h2 className="text-3xl font-bold text-[#1e3a5f]">{content.title}</h2>
        <p className="text-xl text-gray-600">{content.description}</p>

        <ul className="grid md:grid-cols-2 gap-4">
          {content.features.map((feature) => (
            <li key={feature} className="flex items-center gap-3 text-gray-700">
              <span className="text-[#14b8a6] text-xl">✓</span>
              {feature}
            </li>
          ))}
        </ul>

        <button className="bg-[#14b8a6] text-white px-8 py-4 rounded-lg font-semibold hover:bg-[#0d9488] transition-all mt-8">
          {content.cta}
        </button>
      </motion.div>
    </div>
  );
}
```

---

## 3. ANIMATED FEATURE CARDS

```tsx
// components/FeatureCard.tsx
import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface FeatureCardProps {
  icon: ReactNode;
  title: string;
  description: string;
  index: number;
}

export function FeatureCard({ icon, title, description, index }: FeatureCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-100px' }}
      transition={{ delay: index * 0.1 }}
      whileHover={{ y: -4, boxShadow: '0 20px 40px rgba(0,0,0,0.1)' }}
      className="p-8 rounded-xl bg-white border border-gray-200 hover:border-[#14b8a6] transition-colors"
    >
      <div className="text-4xl mb-4 text-[#14b8a6]">{icon}</div>
      <h3 className="text-xl font-bold text-[#1e3a5f] mb-2">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </motion.div>
  );
}

// Usage:
export function FeaturesSection() {
  const features = [
    { icon: '🎥', title: 'Engage Students', description: 'Create interactive video lessons with quizzes' },
    { icon: '📊', title: 'Track Progress', description: 'Monitor student engagement in real-time' },
    { icon: '💬', title: 'Build Community', description: 'Foster peer-to-peer learning with forums' },
    { icon: '🏆', title: 'Earn Recognition', description: 'Get rewarded for creating quality content' },
  ];

  return (
    <div className="max-w-6xl mx-auto px-6 py-20">
      <h2 className="text-4xl font-bold text-center text-[#1e3a5f] mb-16">
        Powerful Features for Teachers & Students
      </h2>
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {features.map((feature, i) => (
          <FeatureCard key={feature.title} {...feature} index={i} />
        ))}
      </div>
    </div>
  );
}
```

---

## 4. ANIMATED TESTIMONIAL SECTION

```tsx
// components/TestimonialSection.tsx
import { motion } from 'framer-motion';
import { Play } from 'lucide-react';

interface Testimonial {
  id: string;
  name: string;
  role: string;
  image: string;
  quote: string;
  videoUrl?: string;
}

const testimonials: Testimonial[] = [
  {
    id: '1',
    name: 'Sarah Chen',
    role: 'High School Teacher',
    image: '/avatars/sarah.jpg',
    quote: 'I\'ve taught over 500 students on this platform. The tools are intuitive and students love the interactive features.',
    videoUrl: '/testimonials/sarah.mp4'
  },
  {
    id: '2',
    name: 'Marcus Johnson',
    role: 'Student, Data Science',
    image: '/avatars/marcus.jpg',
    quote: 'Found the perfect course and completed it in 3 months. Now I have a new job in tech!',
  },
  // ... more testimonials
];

export function TestimonialSection() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.15 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <div className="bg-gray-50 py-20">
      <div className="max-w-6xl mx-auto px-6">
        <h2 className="text-4xl font-bold text-center text-[#1e3a5f] mb-16">
          Loved by Teachers & Students
        </h2>

        {/* Video Testimonials */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid md:grid-cols-3 gap-6 mb-16"
        >
          {testimonials.filter(t => t.videoUrl).map((testimonial) => (
            <motion.div
              key={testimonial.id}
              variants={itemVariants}
              className="relative aspect-video rounded-lg bg-black overflow-hidden group cursor-pointer"
            >
              <img
                src={testimonial.image}
                alt={testimonial.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
              />
              <div className="absolute inset-0 bg-black/40 group-hover:bg-black/50 transition-colors flex items-center justify-center">
                <Play className="text-white" size={48} />
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Text Testimonials */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid md:grid-cols-3 gap-6"
        >
          {testimonials.map((testimonial) => (
            <motion.div
              key={testimonial.id}
              variants={itemVariants}
              className="bg-white p-6 rounded-lg border border-gray-200"
            >
              <p className="text-gray-700 mb-4 italic">"{testimonial.quote}"</p>
              <div className="flex items-center gap-3">
                <img
                  src={testimonial.image}
                  alt={testimonial.name}
                  className="w-12 h-12 rounded-full object-cover"
                />
                <div>
                  <p className="font-semibold text-[#1e3a5f]">{testimonial.name}</p>
                  <p className="text-sm text-gray-600">{testimonial.role}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
```

---

## 5. STATS COUNTER (Scroll-Triggered)

```tsx
// components/StatsCounter.tsx
import { useEffect, useState } from 'react';
import { useInView } from 'react-intersection-observer';

interface Stat {
  label: string;
  value: number;
  suffix?: string;
}

export function StatsCounter() {
  const { ref, inView } = useInView({ threshold: 0.5 });
  const [counts, setCounts] = useState({ students: 0, teachers: 0, courses: 0 });

  const stats: Stat[] = [
    { label: 'Students Learning', value: 500000, suffix: '+' },
    { label: 'Educators Teaching', value: 10000, suffix: '+' },
    { label: 'Courses Created', value: 50000, suffix: '+' },
  ];

  useEffect(() => {
    if (!inView) return;

    const intervals = [
      setInterval(() => {
        setCounts(prev => ({
          students: prev.students < 500000 ? prev.students + 5000 : 500000,
          teachers: prev.teachers < 10000 ? prev.teachers + 100 : 10000,
          courses: prev.courses < 50000 ? prev.courses + 500 : 50000
        }));
      }, 30)
    ];

    return () => intervals.forEach(clearInterval);
  }, [inView]);

  return (
    <div ref={ref} className="bg-[#1e3a5f] text-white py-12">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid md:grid-cols-3 gap-12 text-center">
          <div>
            <div className="text-4xl md:text-5xl font-bold mb-2">
              {counts.students.toLocaleString()}{stats[0].suffix}
            </div>
            <p className="text-blue-100">{stats[0].label}</p>
          </div>
          <div>
            <div className="text-4xl md:text-5xl font-bold mb-2">
              {counts.teachers.toLocaleString()}{stats[1].suffix}
            </div>
            <p className="text-blue-100">{stats[1].label}</p>
          </div>
          <div>
            <div className="text-4xl md:text-5xl font-bold mb-2">
              {counts.courses.toLocaleString()}{stats[2].suffix}
            </div>
            <p className="text-blue-100">{stats[2].label}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

## 6. COMMUNITY ACTIVITY FEED

```tsx
// components/ActivityFeed.tsx
import { motion } from 'framer-motion';

interface Activity {
  id: string;
  user: string;
  action: string;
  course?: string;
  timestamp: string;
  icon: string;
}

const activities: Activity[] = [
  { id: '1', user: 'Sarah Chen', action: 'uploaded course', course: 'Advanced Python', timestamp: '30 min ago', icon: '📹' },
  { id: '2', user: 'Marcus Johnson', action: 'completed course', course: 'Data Science 101', timestamp: '1 hour ago', icon: '✅' },
  { id: '3', user: 'Emma Rodriguez', action: 'started learning', course: 'Web Design Basics', timestamp: '2 hours ago', icon: '🎓' },
];

export function ActivityFeed() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <div className="bg-white rounded-lg border border-gray-200 p-8">
        <h3 className="text-2xl font-bold text-[#1e3a5f] mb-6 flex items-center gap-2">
          <span className="text-2xl">🔴</span> Live Activity
        </h3>

        <div className="space-y-4">
          {activities.map((activity, index) => (
            <motion.div
              key={activity.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex items-center gap-4 pb-4 border-b border-gray-100 last:border-0"
            >
              <span className="text-2xl">{activity.icon}</span>
              <div className="flex-1">
                <p className="text-gray-900">
                  <span className="font-semibold">{activity.user}</span>
                  {' '}{activity.action}
                  {activity.course && (
                    <>
                      {' '}<span className="text-[#14b8a6] font-semibold">"{activity.course}"</span>
                    </>
                  )}
                </p>
                <p className="text-sm text-gray-500">{activity.timestamp}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

---

## 7. HOW-IT-WORKS ANIMATED STEPS

```tsx
// components/HowItWorks.tsx
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

interface Step {
  number: number;
  icon: string;
  title: string;
  description: string;
}

const teacherSteps: Step[] = [
  { number: 1, icon: '📝', title: 'Create', description: 'Design your course with our intuitive builder' },
  { number: 2, icon: '👥', title: 'Invite', description: 'Invite students or publish to our marketplace' },
  { number: 3, icon: '🎓', title: 'Teach', description: 'Engage students with interactive lessons' },
];

export function HowItWorks() {
  return (
    <div className="max-w-6xl mx-auto px-6 py-20">
      <h2 className="text-4xl font-bold text-center text-[#1e3a5f] mb-16">
        How It Works
      </h2>

      <div className="grid md:grid-cols-3 gap-8">
        {teacherSteps.map((step, index) => (
          <motion.div
            key={step.number}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.15 }}
            className="relative"
          >
            {/* Step Card */}
            <div className="bg-white rounded-lg p-8 border border-gray-200 text-center h-full">
              <div className="text-5xl mb-4">{step.icon}</div>
              <div className="text-4xl font-bold text-[#14b8a6] mb-3">{step.number}</div>
              <h3 className="text-xl font-bold text-[#1e3a5f] mb-2">{step.title}</h3>
              <p className="text-gray-600">{step.description}</p>
            </div>

            {/* Arrow */}
            {index < teacherSteps.length - 1 && (
              <div className="hidden md:flex absolute -right-4 top-1/2 -translate-y-1/2 text-[#14b8a6]">
                <ArrowRight size={32} />
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
```

---

## 8. CTA BUTTON WITH RIPPLE EFFECT

```tsx
// components/CTAButton.tsx
import { motion } from 'framer-motion';
import { MouseEvent, useState } from 'react';

interface CTAButtonProps {
  text: string;
  onClick?: () => void;
  variant?: 'primary' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
}

export function CTAButton({
  text,
  onClick,
  variant = 'primary',
  size = 'md'
}: CTAButtonProps) {
  const [ripples, setRipples] = useState<Array<{ x: number; y: number; id: string }>>([]);

  const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const id = Math.random().toString();

    setRipples(prev => [...prev, { x, y, id }]);

    setTimeout(() => {
      setRipples(prev => prev.filter(r => r.id !== id));
    }, 600);

    onClick?.();
  };

  const baseStyles = "relative overflow-hidden font-semibold transition-all duration-200";
  const sizeStyles = {
    sm: 'px-4 py-2 text-sm rounded-lg',
    md: 'px-8 py-3 text-base rounded-lg',
    lg: 'px-10 py-4 text-lg rounded-xl'
  };

  const variantStyles = {
    primary: 'bg-[#14b8a6] hover:bg-[#0d9488] text-white hover:shadow-lg',
    secondary: 'border-2 border-[#14b8a6] text-[#14b8a6] hover:bg-[#14b8a6] hover:text-white'
  };

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={handleClick}
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]}`}
    >
      {text}

      {/* Ripple Effect */}
      {ripples.map(ripple => (
        <motion.span
          key={ripple.id}
          className="absolute rounded-full bg-white/40"
          initial={{
            width: 0,
            height: 0,
            x: ripple.x,
            y: ripple.y
          }}
          animate={{
            width: 300,
            height: 300,
            x: ripple.x - 150,
            y: ripple.y - 150
          }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6 }}
        />
      ))}
    </motion.button>
  );
}
```

---

## 9. RESPONSIVE MOBILE OPTIMIZATION

```tsx
// utils/useIsMobile.ts
import { useState, useEffect } from 'react';

export function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < breakpoint);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [breakpoint]);

  return isMobile;
}

// components/ResponsiveHero.tsx
export function ResponsiveHero() {
  const isMobile = useIsMobile();

  return (
    <div className="min-h-screen">
      {isMobile ? (
        // Mobile layout
        <div className="bg-white px-4 py-12">
          <h1 className="text-3xl font-bold mb-4 text-[#1e3a5f]">
            The Platform for Teachers & Students
          </h1>
          <button className="w-full bg-[#14b8a6] text-white py-3 rounded-lg">
            Get Started
          </button>
        </div>
      ) : (
        // Desktop layout
        <div className="grid grid-cols-2 gap-12">
          {/* Content */}
        </div>
      )}
    </div>
  );
}
```

---

## 10. TAILWIND CONFIG FOR COLORS

```ts
// tailwind.config.ts
import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          navy: '#1e3a5f',  // Trust, authority
          teal: '#14b8a6',  // Action, modern
          gold: '#fbbf24',  // Community, warmth
          green: '#10b981', // Success
        },
        neutral: {
          light: '#f3f4f6',
          medium: '#e5e7eb',
          dark: '#1f2937',
        }
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in',
        'slide-up': 'slideUp 0.5s ease-out',
        'count-up': 'countUp 2s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        countUp: {
          '0%': { '--num': '0' },
          '100%': { '--num': '100' },
        }
      }
    },
  },
  plugins: [],
}
export default config
```

---

## IMPLEMENTATION NOTES

1. **Framer Motion:** Install with `npm install framer-motion`
2. **Intersection Observer:** Use `react-intersection-observer` for scroll-triggered animations
3. **Performance:** Test with Lighthouse; aim for 90+ performance score
4. **Accessibility:** Add `aria-labels` to all interactive elements
5. **Mobile:** Test all animations on actual devices; disable parallax on mobile
6. **Colors:** Use the palette defined in Tailwind config consistently

All components are TypeScript-safe and follow React best practices.
