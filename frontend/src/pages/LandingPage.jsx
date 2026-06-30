import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useToast } from '../context/ToastContext'
import './LandingPage.css'

// ── Scroll animation hook ──────────────────────────────────────
// Sets inView=true the first time the element is intersecting the
// viewport (with the given threshold). Once true, stays true — we
// never animate back out.
//
// Defensive against three real-world failure modes that produced the
// "everything stays invisible" bug in earlier versions:
//   1. ref.current null when effect first runs — wait for it before
//      observing.
//   2. IntersectionObserver not supported (very old browsers) — fall
//      back to plain "set true after mount".
//   3. Element above-the-fold at mount but observer's first callback
//      delayed until next paint — works correctly here, but the
//      safety timeout below ensures content never stays hidden for
//      more than ~600ms in any case.
function useInView(threshold = 0.15) {
    const ref = useRef(null)
    const [inView, setInView] = useState(false)

    useEffect(() => {
        // Fallback: if for any reason the observer doesn't fire by 600ms
        // after mount, just show the content. Prevents permanently
        // invisible sections in edge cases (Safari quirks, hidden tabs
        // restoring, etc.). 600ms is long enough that observer-driven
        // animations still happen normally for below-the-fold sections.
        const safety = setTimeout(() => setInView(true), 600)

        if (typeof IntersectionObserver === 'undefined') {
            // Browser doesn't support it — show content immediately.
            setInView(true)
            return () => clearTimeout(safety)
        }

        const obs = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setInView(true)
                    clearTimeout(safety)
                }
            },
            { threshold }
        )

        // Wait briefly for ref.current — React commits refs before
        // running effects, but in some rare strict-mode double-invoke
        // patterns the ref can be null on the first effect run.
        if (ref.current) {
            obs.observe(ref.current)
        } else {
            // Try again on next frame
            requestAnimationFrame(() => {
                if (ref.current) obs.observe(ref.current)
            })
        }

        return () => {
            clearTimeout(safety)
            obs.disconnect()
        }
    }, [threshold])

    return [ref, inView]
}

// ── Animated Counter ───────────────────────────────────────────
function AnimatedCounter({ target, suffix = '', duration = 2000 }) {
    const [count, setCount] = useState(0)
    const [ref, inView] = useInView(0.3)
    useEffect(() => {
        if (!inView) return
        let start = 0
        const step = target / (duration / 16)
        const timer = setInterval(() => {
            start += step
            if (start >= target) { setCount(target); clearInterval(timer) }
            else setCount(Math.floor(start))
        }, 16)
        return () => clearInterval(timer)
    }, [inView, target, duration])
    return <span ref={ref}>{count.toLocaleString()}{suffix}</span>
}

// ── Gym Logo SVG (dumbbell) ────────────────────────────────────
function GymLogo({ size = 32, color = '#ffffff' }) {
    return (
        <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
            {/* Left collar */}
            <rect x="4" y="19" width="6" height="10" rx="2" fill={color} opacity="0.9" />
            {/* Left weight 1 */}
            <rect x="10" y="15" width="5" height="18" rx="2.5" fill={color} />
            {/* Left weight 2 */}
            <rect x="15" y="17" width="4" height="14" rx="2" fill={color} opacity="0.85" />
            {/* Bar */}
            <rect x="19" y="21.5" width="10" height="5" rx="2.5" fill={color} />
            {/* Right weight 2 */}
            <rect x="29" y="17" width="4" height="14" rx="2" fill={color} opacity="0.85" />
            {/* Right weight 1 */}
            <rect x="33" y="15" width="5" height="18" rx="2.5" fill={color} />
            {/* Right collar */}
            <rect x="38" y="19" width="6" height="10" rx="2" fill={color} opacity="0.9" />
        </svg>
    )
}

// ── Data ───────────────────────────────────────────────────────
const features = [
    {
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
        ),
        title: 'Member Management',
        desc: 'Onboard members, manage profiles, emergency contacts, and track complete histories — all from one screen.',
        tag: 'Core',
    },
    {
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <rect x="1" y="4" width="22" height="16" rx="2" />
                <line x1="1" y1="10" x2="23" y2="10" />
            </svg>
        ),
        title: 'Payment Tracking',
        desc: 'Collect payments, generate invoices, send due reminders, and monitor your revenue stream in real time.',
        tag: 'Finance',
    },
    {
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M9 11l3 3L22 4" />
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
            </svg>
        ),
        title: 'Attendance System',
        desc: 'Mark daily attendance with one click, view monthly calendars, and track rates across all active members.',
        tag: 'Daily',
    },
    {
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <line x1="18" y1="20" x2="18" y2="10" />
                <line x1="12" y1="20" x2="12" y2="4" />
                <line x1="6" y1="20" x2="6" y2="14" />
            </svg>
        ),
        title: 'Business Reports',
        desc: 'Financial statements, client reports, subscription summaries, balance sheets — every insight you need.',
        tag: 'Analytics',
    },
    {
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
            </svg>
        ),
        title: 'Membership Plans',
        desc: 'Create flexible plans — Basic, Standard, Premium, Elite. Set durations, prices, and features with ease.',
        tag: 'Plans',
    },
    {
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
        ),
        title: 'Member Portal',
        desc: 'Give members their own login — view attendance, subscriptions, payment history, and message the gym.',
        tag: 'Portal',
    },
]

// ── Pricing modules data ──────────────────────────────────────
const pricingModules = [
    { name: 'members',     label: 'Member Management',   desc: 'Profiles, history, emergency contacts', monthly: 199, quarterly: 499, yearly: 1499, core: true },
    { name: 'attendance',  label: 'Attendance Tracking', desc: 'Daily check-in with calendar view',      monthly: 149, quarterly: 399, yearly: 999,  core: true },
    { name: 'payments',    label: 'Payment Tracking',    desc: 'Invoices, dues & revenue reports',       monthly: 149, quarterly: 399, yearly: 999,  core: true },
    { name: 'memberships', label: 'Membership Plans',    desc: 'Flexible plan creation & management',    monthly: 99,  quarterly: 249, yearly: 699,  core: true },
    { name: 'reports',     label: 'Business Reports',    desc: 'Financial & subscription analytics',     monthly: 199, quarterly: 499, yearly: 1499, core: false },
    { name: 'tasks',       label: 'Task Manager',        desc: 'Kanban board for gym operations',        monthly: 99,  quarterly: 249, yearly: 699,  core: false },
    { name: 'targets',     label: 'Targets & Goals',     desc: 'Revenue & member growth tracking',       monthly: 99,  quarterly: 249, yearly: 699,  core: false },
    { name: 'promotions',  label: 'Email Promotions',    desc: 'Send campaigns to your members',         monthly: 149, quarterly: 399, yearly: 999,  core: false },
    { name: 'staff',       label: 'Staff Management',    desc: 'Staff accounts & permissions',           monthly: 149, quarterly: 399, yearly: 999,  core: false },
]

const steps = [
    { num: '01', title: 'Sign Up as Admin', desc: 'Create your gym account in under a minute. No credit card required.' },
    { num: '02', title: 'Set Up Your Plans', desc: 'Add membership plans — duration, pricing, and feature list.' },
    { num: '03', title: 'Add Your Members', desc: 'Import or manually add members and assign their subscriptions.' },
    { num: '04', title: 'Run Your Gym', desc: 'Mark attendance, collect payments, view reports — all in one place.' },
]

const testimonials = [
    {
        quote: 'FitSync completely replaced our spreadsheet chaos. Payments, attendance, reports — everything just works.',
        name: 'Rajesh Patel',
        role: 'Owner, PowerHouse Gym · Ahmedabad',
        initials: 'RP',
    },
    {
        quote: 'My members love having their own portal. They can see attendance and payments without calling us.',
        name: 'Priya Shah',
        role: 'Founder, FlexFit Studio · Surat',
        initials: 'PS',
    },
    {
        quote: 'Setup took less than an hour. The due payment reminders alone save me 3 hours every week.',
        name: 'Amit Verma',
        role: 'Manager, IronEdge Fitness · Vadodara',
        initials: 'AV',
    },
]

const faqs = [
    { q: 'Is FitSync free to use?', a: 'Yes — FitSync is completely free. Create your admin account and start managing your gym today with no hidden charges.' },
    { q: 'Can my members log in separately?', a: 'Absolutely. Each member gets their own login to view attendance, subscriptions, payments, and message the gym directly.' },
    { q: 'How many members can I add?', a: 'There is no limit. Add as many members, plans, and subscriptions as your gym needs without any restrictions.' },
    { q: 'Is my data safe and private?', a: 'All data is stored securely in a dedicated database for your gym. No other gym or user can access your data.' },
    { q: 'Can I manage multiple branches?', a: 'Yes. The Branches module lets you add and manage multiple gym locations all under one admin account.' },
]

// ── Main Component ─────────────────────────────────────────────
export default function LandingPage() {
    const [menuOpen, setMenuOpen] = useState(false)
    const [scrolled, setScrolled] = useState(false)
    const [openFaq, setOpenFaq] = useState(null)

    // Newsletter form state — purely cosmetic on the demo build, no
    // backend endpoint. The handler shows a toast on submit so the
    // interaction feels real for visitors without us actually capturing
    // anything.
    const [newsletterEmail, setNewsletterEmail] = useState('')
    const toast = useToast()
    const handleNewsletterSubmit = (e) => {
        e.preventDefault()
        const email = newsletterEmail.trim()
        if (!email || !email.includes('@')) {
            toast.error('Please enter a valid email address')
            return
        }
        toast.success('Thanks! We\'ll keep you posted.')
        setNewsletterEmail('')
    }

    useEffect(() => {
        const handler = () => setScrolled(window.scrollY > 50)
        window.addEventListener('scroll', handler)
        return () => window.removeEventListener('scroll', handler)
    }, [])

    const [heroRef, heroIn] = useInView(0.05)
    const [statsRef, statsIn] = useInView(0.2)
    const [featRef, featIn] = useInView(0.05)
    const [stepsRef, stepsIn] = useInView(0.05)
    const [testRef, testIn] = useInView(0.05)
    const [faqRef, faqIn] = useInView(0.05)
    const [ctaRef, ctaIn] = useInView(0.1)
    const [pricingRef, pricingIn] = useInView(0.05)
    const [billingCycle, setBillingCycle] = useState('monthly')
    const [selectedModules, setSelectedModules] = useState(['members','attendance','payments','memberships'])
    const toggleModule = (name) => setSelectedModules(prev =>
        prev.includes(name) ? prev.filter(m => m !== name) : [...prev, name]
    )
    const totalPrice = pricingModules
        .filter(m => selectedModules.includes(m.name))
        .reduce((sum, m) => sum + m[billingCycle], 0)

    return (
        <div className="lp">

            {/* ── NAVBAR ─────────────────────────────── */}
            <nav className={`lp-nav ${scrolled ? 'lp-nav--solid' : ''}`}>
                <div className="lp-nav__inner">

                    {/* Logo */}
                    <div className="lp-logo">
                        <GymLogo size={34} color={scrolled ? "#111111" : "#ffffff"} />
                        <span className="lp-logo__text">FitSync</span>
                    </div>

                    {/* Desktop links */}
                    <div className={`lp-nav__links ${menuOpen ? 'lp-nav__links--open' : ''}`}>
                        {[
                            { label: 'Features', href: '#features' },
                            { label: 'How It Works', href: '#how-it-works' },
                            { label: 'Pricing', href: '#pricing' },
                            { label: 'FAQ', href: '#faq' },
                        ].map((l) => (
                            <a key={l.label} href={l.href} className="lp-nav__link"
                                onClick={() => setMenuOpen(false)}>
                                {l.label}
                            </a>
                        ))}
                    </div>

                    {/* CTA buttons */}
                    <div className="lp-nav__cta">
                        <Link to="/login" className="lp-btn lp-btn--ghost">Sign In</Link>
                        <Link to="/signup" className="lp-btn lp-btn--pill">Get Started Free</Link>
                    </div>

                    {/* Hamburger */}
                    <button
                        className={`lp-hamburger ${menuOpen ? 'lp-hamburger--open' : ''}`}
                        onClick={() => setMenuOpen(!menuOpen)}
                        aria-label="Toggle menu"
                    >
                        <span /><span /><span />
                    </button>
                </div>
            </nav>

            {/* Mobile menu overlay */}
            {menuOpen && (
                <div className="lp-mobile-menu">
                    {[
                        { label: 'Features', href: '#features' },
                        { label: 'How It Works', href: '#how-it-works' },
                        { label: 'Pricing', href: '#pricing' },
                        { label: 'FAQ', href: '#faq' },
                    ].map((l) => (
                        <a key={l.label} href={l.href} className="lp-mobile-menu__link"
                            onClick={() => setMenuOpen(false)}>
                            {l.label}
                        </a>
                    ))}
                    <div className="lp-mobile-menu__actions">
                        <Link to="/login" className="lp-btn lp-btn--ghost" onClick={() => setMenuOpen(false)}>
                            Sign In
                        </Link>
                        <Link to="/signup" className="lp-btn lp-btn--pill" onClick={() => setMenuOpen(false)}>
                            Get Started Free
                        </Link>
                    </div>
                </div>
            )}

            {/* ── HERO ───────────────────────────────── */}
            <section className="lp-hero" ref={heroRef}>
                {/* Animated background blobs */}
                <div className="lp-hero__blob lp-hero__blob--1" />
                <div className="lp-hero__blob lp-hero__blob--2" />
                <div className="lp-hero__blob lp-hero__blob--3" />

                {/* Floating gym-themed decorations. Inline SVGs in the same
                    clean geometric style as GymLogo above. Pure decoration
                    — pointer-events: none in the CSS so they don't catch
                    clicks. Each icon has its own drift animation so they
                    don't move in sync. */}
                <div className="lp-hero__icons" aria-hidden="true">
                    {/* Dumbbell — top right */}
                    <svg className="lp-hero__icon lp-hero__icon--1" viewBox="0 0 48 48" fill="none">
                        <rect x="4" y="19" width="6" height="10" rx="2" fill="currentColor" opacity="0.9"/>
                        <rect x="10" y="15" width="5" height="18" rx="2.5" fill="currentColor"/>
                        <rect x="15" y="17" width="4" height="14" rx="2" fill="currentColor" opacity="0.85"/>
                        <rect x="19" y="21.5" width="10" height="5" rx="2.5" fill="currentColor"/>
                        <rect x="29" y="17" width="4" height="14" rx="2" fill="currentColor" opacity="0.85"/>
                        <rect x="33" y="15" width="5" height="18" rx="2.5" fill="currentColor"/>
                        <rect x="38" y="19" width="6" height="10" rx="2" fill="currentColor" opacity="0.9"/>
                    </svg>

                    {/* Kettlebell — bottom left */}
                    <svg className="lp-hero__icon lp-hero__icon--2" viewBox="0 0 48 48" fill="none">
                        <rect x="18" y="6" width="12" height="6" rx="3" stroke="currentColor" strokeWidth="2.5"/>
                        <path d="M14 14 Q14 12 16 12 H32 Q34 12 34 14 L40 36 Q40 42 34 42 H14 Q8 42 8 36 Z"
                              fill="currentColor" opacity="0.9"/>
                    </svg>

                    {/* Heart-pulse — middle right area */}
                    <svg className="lp-hero__icon lp-hero__icon--3" viewBox="0 0 48 48" fill="none">
                        <path d="M3 24 H10 L14 14 L20 34 L26 18 L30 24 H45"
                              stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>

                    {/* Lightning bolt — top left */}
                    <svg className="lp-hero__icon lp-hero__icon--4" viewBox="0 0 48 48" fill="none">
                        <path d="M28 4 L10 26 H22 L18 44 L36 22 H24 Z"
                              fill="currentColor"/>
                    </svg>

                    {/* Stopwatch / timer — bottom right */}
                    <svg className="lp-hero__icon lp-hero__icon--5" viewBox="0 0 48 48" fill="none">
                        <circle cx="24" cy="26" r="16" stroke="currentColor" strokeWidth="2.5"/>
                        <path d="M24 18 V26 L30 30" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
                        <rect x="20" y="4" width="8" height="4" rx="1" fill="currentColor"/>
                    </svg>

                    {/* Small dumbbell — center-left, smaller */}
                    <svg className="lp-hero__icon lp-hero__icon--6" viewBox="0 0 48 48" fill="none">
                        <rect x="6" y="20" width="5" height="8" rx="1.5" fill="currentColor"/>
                        <rect x="11" y="22" width="3" height="4" fill="currentColor"/>
                        <rect x="14" y="22.5" width="20" height="3" rx="1.5" fill="currentColor"/>
                        <rect x="34" y="22" width="3" height="4" fill="currentColor"/>
                        <rect x="37" y="20" width="5" height="8" rx="1.5" fill="currentColor"/>
                    </svg>
                </div>

                {/* Radial grid */}
                <div className="lp-hero__grid" />

                <div className="lp-container lp-hero__layout">
                    {/* Left content */}
                    <div className={`lp-hero__left ${heroIn ? 'lp-anim-up' : 'lp-invisible'}`}>
                        <div className="lp-hero__badge">
                            <span className="lp-hero__badge-pulse" />
                            Complete Gym Management System
                        </div>

                        <h1 className="lp-hero__h1">
                            Run Your Gym<br />
                            <span className="lp-hero__h1-accent">Smarter.</span>
                            <br />Not Harder.
                        </h1>

                        <p className="lp-hero__para">
                            FitSync brings members, payments, attendance, and reports into
                            one clean dashboard — built for gym owners who want results,
                            not complexity.
                        </p>

                        <div className="lp-hero__actions">
                            <Link to="/signup" className="lp-btn lp-btn--primary lp-btn--lg">
                                Start Free Today
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="18" height="18">
                                    <line x1="5" y1="12" x2="19" y2="12" />
                                    <polyline points="12 5 19 12 12 19" />
                                </svg>
                            </Link>
                            <Link to="/login" className="lp-btn lp-btn--outline lp-btn--lg">
                                View Demo
                            </Link>
                        </div>

                        {/* Social proof */}
                        <div className="lp-hero__proof">
                            <div className="lp-hero__avatars">
                                {['RP', 'PS', 'AV', 'MK'].map((ini, i) => (
                                    <div key={i} className="lp-hero__av" style={{ zIndex: 5 - i, marginLeft: i === 0 ? 0 : -10 }}>
                                        {ini}
                                    </div>
                                ))}
                            </div>
                            <p>Trusted by gym owners across Gujarat</p>
                        </div>
                    </div>

                    {/* Right — dashboard mockup */}
                </div>

                {/* Scroll indicator */}
                <div className="lp-hero__scroll">
                    <div className="lp-hero__scroll-mouse">
                        <div className="lp-hero__scroll-dot" />
                    </div>
                    <span>Scroll to explore</span>
                </div>
            </section>

            {/* ── STATS ──────────────────────────────── */}
            <section className="lp-stats" ref={statsRef}>
                <div className="lp-container">
                    <div className={`lp-stats__grid ${statsIn ? 'lp-anim-up' : 'lp-invisible'}`}>
                        {[
                            { val: 500, suf: '+', label: 'Members Managed' },
                            { val: 98, suf: '%', label: 'System Uptime' },
                            { val: 3, suf: 'hrs', label: 'Saved Per Week' },
                            { val: 100, suf: '%', label: 'Free to Use' },
                        ].map((s, i) => (
                            <div key={i} className="lp-stats__item" style={{ animationDelay: `${i * 0.1}s` }}>
                                <p className="lp-stats__num">
                                    <AnimatedCounter target={s.val} suffix={s.suf} />
                                </p>
                                <p className="lp-stats__label">{s.label}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── FEATURES ───────────────────────────── */}
            <section className="lp-features" id="features" ref={featRef}>
                <div className="lp-container">
                    <div className={`lp-section-head ${featIn ? 'lp-anim-up' : 'lp-invisible'}`}>
                        <span className="lp-section-tag">Everything You Need</span>
                        <h2 className="lp-section-h2">Built for Real Gym Owners</h2>
                        <p className="lp-section-sub">
                            Every feature is designed around how gyms actually operate — no bloat, no learning curve.
                        </p>
                    </div>

                    <div className="lp-features__grid">
                        {features.map((f, i) => (
                            <div
                                key={i}
                                className={`lp-feat-card ${featIn ? 'lp-anim-up' : 'lp-invisible'}`}
                                style={{ animationDelay: `${0.1 + i * 0.08}s` }}
                            >
                                <div className="lp-feat-card__top">
                                    <div className="lp-feat-card__icon">{f.icon}</div>
                                    <span className="lp-feat-card__tag">{f.tag}</span>
                                </div>
                                <h3 className="lp-feat-card__title">{f.title}</h3>
                                <p className="lp-feat-card__desc">{f.desc}</p>
                                <div className="lp-feat-card__arrow">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <line x1="5" y1="12" x2="19" y2="12" />
                                        <polyline points="12 5 19 12 12 19" />
                                    </svg>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── HOW IT WORKS ───────────────────────── */}
            <section className="lp-steps" id="how-it-works" ref={stepsRef}>
                <div className="lp-container">
                    <div className={`lp-section-head ${stepsIn ? 'lp-anim-up' : 'lp-invisible'}`}>
                        <span className="lp-section-tag">Simple Setup</span>
                        <h2 className="lp-section-h2">Up and Running in Minutes</h2>
                        <p className="lp-section-sub">
                            No technical knowledge needed. If you can use a smartphone, you can run FitSync.
                        </p>
                    </div>

                    <div className="lp-steps__grid">
                        {steps.map((s, i) => (
                            <div
                                key={i}
                                className={`lp-step-card ${stepsIn ? 'lp-anim-up' : 'lp-invisible'}`}
                                style={{ animationDelay: `${0.1 + i * 0.12}s` }}
                            >
                                <div className="lp-step-card__num">{s.num}</div>
                                {i < steps.length - 1 && <div className="lp-step-card__line" />}
                                <h3 className="lp-step-card__title">{s.title}</h3>
                                <p className="lp-step-card__desc">{s.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── TESTIMONIALS ───────────────────────── */}
            <section className="lp-testimonials" id="testimonials" ref={testRef}>
                <div className="lp-container">
                    <div className={`lp-section-head ${testIn ? 'lp-anim-up' : 'lp-invisible'}`}>
                        <span className="lp-section-tag">Real Stories</span>
                        <h2 className="lp-section-h2">Gym Owners Love FitSync</h2>
                    </div>

                    <div className="lp-test__grid">
                        {testimonials.map((t, i) => (
                            <div
                                key={i}
                                className={`lp-test-card ${testIn ? 'lp-anim-up' : 'lp-invisible'}`}
                                style={{ animationDelay: `${0.1 + i * 0.12}s` }}
                            >
                                <div className="lp-test-card__quote">
                                    <svg viewBox="0 0 32 32" fill="currentColor" width="28" height="28">
                                        <path d="M10 8C6.686 8 4 10.686 4 14v10h10V14H7.5c0-1.38 1.12-2.5 2.5-2.5V8zm18 0c-3.314 0-6 2.686-6 6v10h10V14h-6.5c0-1.38 1.12-2.5 2.5-2.5V8z" />
                                    </svg>
                                </div>
                                <p className="lp-test-card__text">{t.quote}</p>
                                <div className="lp-test-card__author">
                                    <div className="lp-test-card__av">{t.initials}</div>
                                    <div>
                                        <p className="lp-test-card__name">{t.name}</p>
                                        <p className="lp-test-card__role">{t.role}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>


            {/* ── PRICING ────────────────────────────── */}
            <section className="lp-pricing" id="pricing" ref={pricingRef}>
                <div className="lp-container">
                    <div className={`lp-pricing__head ${pricingIn ? 'lp-anim-up' : 'lp-invisible'}`}>
                        <span className="lp-section-tag">Our Plans</span>
                        <h2 className="lp-section-h2">Simple, Transparent Pricing</h2>
                        <p className="lp-pricing__sub">
                            Choose the plan that fits your gym — no hidden charges, no surprises.
                        </p>
                    </div>

                    {/* Billing toggle */}
                    <div className={`lp-pricing__toggle-wrap ${pricingIn ? 'lp-anim-up lp-d2' : 'lp-invisible'}`}>
                        <div className="lp-pricing__toggle">
                            {[
                                { key: 'monthly',   label: 'Monthly' },
                                { key: 'yearly',    label: 'Yearly', badge: 'Save 20%' },
                            ].map(b => (
                                <button
                                    key={b.key}
                                    className={`lp-pricing__toggle-btn ${billingCycle === b.key ? 'active' : ''}`}
                                    onClick={() => setBillingCycle(b.key)}
                                >
                                    {b.label}
                                    {b.badge && <span className="lp-pricing__badge">{b.badge}</span>}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* 3-tier plan cards */}
                    <div className={`lp-plans__grid ${pricingIn ? 'lp-anim-up lp-d3' : 'lp-invisible'}`}>

                        {/* ── Starter ── */}
                        <div className="lp-plan-card">
                            <p className="lp-plan-card__name">Starter</p>
                            <div className="lp-plan-card__price">
                                <span className="lp-plan-card__amount">
                                    ₹{billingCycle === 'monthly' ? '999' : '9,999'}
                                </span>
                                <span className="lp-plan-card__cycle">/month</span>
                            </div>
                            <p className="lp-plan-card__desc">Perfect for small gyms just getting started.</p>
                            <ul className="lp-plan-card__features">
                                {['Up to 100 Members', 'Member Management', 'Attendance Tracking', 'Payment Tracking', 'Membership Plans', 'Email Support'].map(f => (
                                    <li key={f} className="lp-plan-card__feature">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                                        {f}
                                    </li>
                                ))}
                            </ul>
                            <Link to="/signup" className="lp-plan-card__btn lp-plan-card__btn--outline">
                                Get Started →
                            </Link>
                        </div>

                        {/* ── Growth (popular) ── */}
                        <div className="lp-plan-card lp-plan-card--popular">
                            <div className="lp-plan-card__popular-tag">Most Popular</div>
                            <p className="lp-plan-card__name">Growth</p>
                            <div className="lp-plan-card__price">
                                <span className="lp-plan-card__amount">
                                    ₹{billingCycle === 'monthly' ? '2,499' : '24,999'}
                                </span>
                                <span className="lp-plan-card__cycle">/month</span>
                            </div>
                            <p className="lp-plan-card__desc">For growing gyms that need full control.</p>
                            <ul className="lp-plan-card__features">
                                {['Up to 500 Members', 'Everything in Starter', 'Business Reports', 'Task Manager', 'Targets & Goals', 'Email Promotions', 'Priority Support'].map(f => (
                                    <li key={f} className="lp-plan-card__feature">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                                        {f}
                                    </li>
                                ))}
                            </ul>
                            <Link to="/signup" className="lp-plan-card__btn lp-plan-card__btn--primary">
                                Get Started →
                            </Link>
                        </div>

                        {/* ── Pro ── */}
                        <div className="lp-plan-card">
                            <p className="lp-plan-card__name">Pro</p>
                            <div className="lp-plan-card__price">
                                <span className="lp-plan-card__amount">
                                    ₹{billingCycle === 'monthly' ? '4,999' : '49,999'}
                                </span>
                                <span className="lp-plan-card__cycle">/month</span>
                            </div>
                            <p className="lp-plan-card__desc">Full-scale solution for large gym chains.</p>
                            <ul className="lp-plan-card__features">
                                {['Unlimited Members', 'Everything in Growth', 'Staff Management', 'Multi-Branch Support', 'Dedicated Manager', 'Custom Branding', '24/7 Support'].map(f => (
                                    <li key={f} className="lp-plan-card__feature">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                                        {f}
                                    </li>
                                ))}
                            </ul>
                            <Link to="/signup" className="lp-plan-card__btn lp-plan-card__btn--outline">
                                Get Started →
                            </Link>
                        </div>

                    </div>
                </div>
            </section>

            {/* ── FAQ ────────────────────────────────── */}
            <section className="lp-faq" id="faq" ref={faqRef}>
                <div className="lp-container lp-container--sm">
                    <div className={`lp-section-head ${faqIn ? 'lp-anim-up' : 'lp-invisible'}`}>
                        <span className="lp-section-tag">Got Questions?</span>
                        <h2 className="lp-section-h2">Frequently Asked</h2>
                    </div>

                    <div className={`lp-faq__list ${faqIn ? 'lp-anim-up lp-delay-2' : 'lp-invisible'}`}>
                        {faqs.map((f, i) => (
                            <div
                                key={i}
                                className={`lp-faq__item ${openFaq === i ? 'lp-faq__item--open' : ''}`}
                                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                            >
                                <div className="lp-faq__q">
                                    <span>{f.q}</span>
                                    <div className="lp-faq__chevron">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                            <polyline points="6 9 12 15 18 9" />
                                        </svg>
                                    </div>
                                </div>
                                <div className="lp-faq__a"><p>{f.a}</p></div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── CTA ────────────────────────────────── */}
            <section className="lp-cta" ref={ctaRef}>
                <div className="lp-cta__blob lp-cta__blob--1" />
                <div className="lp-cta__blob lp-cta__blob--2" />
                <div className={`lp-container lp-cta__inner ${ctaIn ? 'lp-anim-up' : 'lp-invisible'}`}>
                    <GymLogo size={56} color="#ffffff" />
                    <div className="lp-cta__badge">Zero setup cost · No credit card · Free forever</div>
                    <h2 className="lp-cta__h2">Your Gym Deserves Better Tools.</h2>
                    <p className="lp-cta__sub">
                        Join gym owners who've already replaced spreadsheets and guesswork
                        with FitSync's clean, powerful management system.
                    </p>
                    <div className="lp-cta__actions">
                        <Link to="/signup" className="lp-btn lp-btn--primary lp-btn--lg lp-btn--glow">
                            Create Free Account
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="18" height="18">
                                <line x1="5" y1="12" x2="19" y2="12" />
                                <polyline points="12 5 19 12 12 19" />
                            </svg>
                        </Link>
                        <Link to="/login" className="lp-btn lp-btn--outline lp-btn--lg">
                            Sign In Instead
                        </Link>
                    </div>
                </div>
            </section>

            {/* ── FOOTER ─────────────────────────────── */}
            <footer className="lp-footer">
                {/* Section 1 — Newsletter Strip */}
                <div className="lp-footer__newsletter">
                    <div className="lp-container lp-footer__newsletter-inner">
                        <div className="lp-footer__newsletter-text">
                            <h3 className="lp-footer__newsletter-heading">Stay in the loop</h3>
                            <p className="lp-footer__newsletter-sub">
                                Product updates, gym-management tips, and the occasional honest take on running a fitness business.
                            </p>
                        </div>
                        <form className="lp-footer__newsletter-form" onSubmit={handleNewsletterSubmit}>
                            <input
                                type="email"
                                className="lp-footer__newsletter-input"
                                placeholder="Your email address"
                                value={newsletterEmail}
                                onChange={(e) => setNewsletterEmail(e.target.value)}
                            />
                            <button type="submit" className="lp-footer__newsletter-btn">
                                Subscribe
                            </button>
                        </form>
                    </div>
                </div>

                {/* Section 2 — Main Footer Grid */}
                <div className="lp-footer__main">
                    <div className="lp-container">
                        <div className="lp-footer__grid">
                            {/* Column 1 — Brand */}
                            <div className="lp-footer__col lp-footer__col--brand">
                                <div className="lp-footer__brand-row">
                                    <div className="lp-footer__brand-mark">
                                        <GymLogo size={22} color="#10b981" />
                                    </div>
                                    <div>
                                        <p className="lp-footer__brand-name">FITSYNC</p>
                                        <p className="lp-footer__brand-sub">GYM MANAGEMENT</p>
                                    </div>
                                </div>
                                <p className="lp-footer__tagline">
                                    Built in Bharuch, Gujarat — helping gyms across India run smarter, one swipe-in at a time.
                                </p>
                                <div className="lp-footer__social">
                                    <a href="#" className="lp-footer__social-btn" data-net="fb" aria-label="Facebook">f</a>
                                    <a href="#" className="lp-footer__social-btn" data-net="tw" aria-label="Twitter">tw</a>
                                    <a href="#" className="lp-footer__social-btn" data-net="ln" aria-label="LinkedIn">in</a>
                                    <a href="#" className="lp-footer__social-btn" data-net="ig" aria-label="Instagram">ig</a>
                                </div>
                            </div>

                            {/* Column 2 — Quick Links (these scroll to existing sections via id anchors) */}
                            <div className="lp-footer__col">
                                <p className="lp-footer__col-head">Quick Links</p>
                                <a href="#features" className="lp-footer__col-link">Features</a>
                                <a href="#how-it-works" className="lp-footer__col-link">How It Works</a>
                                <a href="#pricing" className="lp-footer__col-link">Pricing</a>
                                <a href="#faq" className="lp-footer__col-link">FAQ</a>
                                <Link to="/login" className="lp-footer__col-link">Sign In</Link>
                                <Link to="/signup" className="lp-footer__col-link">Sign Up Free</Link>
                            </div>

                            {/* Column 3 — Modules (FitSync's main capabilities) */}
                            <div className="lp-footer__col">
                                <p className="lp-footer__col-head">Modules</p>
                                <a href="#features" className="lp-footer__col-link">Members</a>
                                <a href="#features" className="lp-footer__col-link">Subscriptions</a>
                                <a href="#features" className="lp-footer__col-link">Payments &amp; GST</a>
                                <a href="#features" className="lp-footer__col-link">Reports</a>
                                <a href="#features" className="lp-footer__col-link">Staff &amp; Payroll</a>
                                <a href="#features" className="lp-footer__col-link">Multi-Branch</a>
                            </div>

                            {/* Column 4 — Contact (placeholder details — not real contact info) */}
                            <div className="lp-footer__col">
                                <p className="lp-footer__col-head">Contact Us</p>
                                <p className="lp-footer__contact-line">
                                    <span className="lp-footer__contact-icon">📍</span>
                                    Bharuch, Gujarat, India
                                </p>
                                <p className="lp-footer__contact-line">
                                    <span className="lp-footer__contact-icon">📞</span>
                                    +91 90333 20453
                                </p>
                                <p className="lp-footer__contact-line">
                                    <span className="lp-footer__contact-icon">✉️</span>
                                    hello@fitsync.in
                                </p>
                                <p className="lp-footer__contact-line">
                                    <span className="lp-footer__contact-icon">🕐</span>
                                    Mon–Sat: 9 AM – 7 PM
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Section 3 — Bottom Bar */}
                <div className="lp-footer__bar">
                    <div className="lp-container lp-footer__bar-inner">
                        <p className="lp-footer__bar-left">
                            © {new Date().getFullYear()} FITSYNC · ALL RIGHTS RESERVED
                        </p>
                        <p className="lp-footer__bar-right">
                            Crafted with care in Bharuch, Gujarat 🇮🇳
                        </p>
                    </div>
                </div>
            </footer>
        </div>
    )
}