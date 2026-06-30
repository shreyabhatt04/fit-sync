// GymScene.jsx
//
// A stylized flat-SVG illustration of a gym interior at dusk/early morning.
// Used as the background for the landing page hero and (later) the auth
// page left panel. Pure SVG + CSS animations — no canvas, no WebGL, no JS.
//
// viewBox is 1600x900 (16:9). preserveAspectRatio="xMidYMid slice" in the
// consuming <svg> means the image fills its container and crops what
// doesn't fit, so it works from phone to ultrawide.
//
// Every animated element uses transform-only animations for 60fps.
// See GymScene.css for keyframes.

import './GymScene.css'

export default function GymScene() {
    return (
        <svg
            className="gym-scene"
            viewBox="0 0 1600 900"
            preserveAspectRatio="xMidYMid slice"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
        >
            {/* ═══════════════════════════════════════════════════════
                LAYER 0 — Sky gradient + city silhouette through window
            ═══════════════════════════════════════════════════════ */}
            <defs>
                {/* Dusk sky gradient */}
                <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"  stopColor="#0a1428" />
                    <stop offset="60%" stopColor="#0f1d35" />
                    <stop offset="100%" stopColor="#15223d" />
                </linearGradient>

                {/* Warm amber floor wash — the "gym light" spilling forward */}
                <radialGradient id="amberWash" cx="50%" cy="85%" r="55%">
                    <stop offset="0%"  stopColor="#f59e0b" stopOpacity="0.18" />
                    <stop offset="60%" stopColor="#f59e0b" stopOpacity="0.06" />
                    <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
                </radialGradient>

                {/* Teal ambient glow — upper right */}
                <radialGradient id="tealGlow" cx="80%" cy="20%" r="40%">
                    <stop offset="0%"   stopColor="#10b981" stopOpacity="0.14" />
                    <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                </radialGradient>

                {/* Floor gradient — darker in front, lighter toward back */}
                <linearGradient id="floor" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="#1a2740" />
                    <stop offset="100%" stopColor="#0a1020" />
                </linearGradient>

                {/* Window amber pool (cast on floor) */}
                <radialGradient id="windowPool" cx="50%" cy="0%" r="80%">
                    <stop offset="0%"   stopColor="#fbbf24" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="#fbbf24" stopOpacity="0" />
                </radialGradient>
            </defs>

            {/* Sky background */}
            <rect x="0" y="0" width="1600" height="900" fill="url(#sky)" />

            {/* Teal glow, top right */}
            <rect x="0" y="0" width="1600" height="900" fill="url(#tealGlow)" />

            {/* City silhouette — far background */}
            <g className="gs-city" opacity="0.65">
                <rect x="30"   y="340" width="60"  height="200" fill="#1e3a5f" />
                <rect x="100"  y="280" width="80"  height="260" fill="#16304d" />
                <rect x="190"  y="320" width="50"  height="220" fill="#1e3a5f" />
                <rect x="250"  y="260" width="90"  height="280" fill="#16304d" />
                <rect x="350"  y="310" width="55"  height="230" fill="#1e3a5f" />
                <rect x="415"  y="240" width="100" height="300" fill="#16304d" />
                <rect x="525"  y="300" width="65"  height="240" fill="#1e3a5f" />
                <rect x="600"  y="270" width="75"  height="270" fill="#16304d" />
                <rect x="685"  y="330" width="45"  height="210" fill="#1e3a5f" />
                <rect x="740"  y="255" width="90"  height="285" fill="#16304d" />
                <rect x="840"  y="300" width="60"  height="240" fill="#1e3a5f" />
                <rect x="910"  y="270" width="80"  height="270" fill="#16304d" />
                <rect x="1000" y="320" width="55"  height="220" fill="#1e3a5f" />
                <rect x="1065" y="240" width="105" height="300" fill="#16304d" />
                <rect x="1180" y="290" width="70"  height="250" fill="#1e3a5f" />
                <rect x="1260" y="270" width="90"  height="270" fill="#16304d" />
                <rect x="1360" y="310" width="60"  height="230" fill="#1e3a5f" />
                <rect x="1430" y="260" width="90"  height="280" fill="#16304d" />
                <rect x="1530" y="300" width="50"  height="240" fill="#1e3a5f" />

                {/* Tiny window lights in the city — a few blink */}
                <rect x="115"  y="320" width="4" height="4" fill="#fbbf24" className="gs-blink-1" />
                <rect x="130"  y="360" width="4" height="4" fill="#fbbf24" />
                <rect x="280"  y="300" width="4" height="4" fill="#fbbf24" className="gs-blink-2" />
                <rect x="310"  y="340" width="4" height="4" fill="#fbbf24" />
                <rect x="445"  y="280" width="4" height="4" fill="#fbbf24" />
                <rect x="470"  y="320" width="4" height="4" fill="#fbbf24" className="gs-blink-3" />
                <rect x="625"  y="310" width="4" height="4" fill="#fbbf24" />
                <rect x="780"  y="290" width="4" height="4" fill="#fbbf24" className="gs-blink-1" />
                <rect x="935"  y="310" width="4" height="4" fill="#fbbf24" />
                <rect x="1095" y="280" width="4" height="4" fill="#fbbf24" className="gs-blink-2" />
                <rect x="1130" y="330" width="4" height="4" fill="#fbbf24" />
                <rect x="1285" y="310" width="4" height="4" fill="#fbbf24" className="gs-blink-3" />
                <rect x="1470" y="300" width="4" height="4" fill="#fbbf24" />
            </g>

            {/* Window frame — implies we're looking out from inside */}
            <g className="gs-window">
                {/* Window glass area already shows sky through it */}
                {/* Top beam */}
                <rect x="140" y="140" width="1320" height="14" fill="#0a1020" />
                {/* Vertical dividers */}
                <rect x="580"  y="140" width="8" height="420" fill="#0a1020" />
                <rect x="1020" y="140" width="8" height="420" fill="#0a1020" />
                {/* Horizontal middle divider */}
                <rect x="140" y="340" width="1320" height="6" fill="#0a1020" />
                {/* Bottom sill */}
                <rect x="140" y="555" width="1320" height="10" fill="#111a2c" />
            </g>

            {/* Floor (below window) */}
            <rect x="0" y="560" width="1600" height="340" fill="url(#floor)" />

            {/* Window pool — warm light spilling onto floor */}
            <ellipse cx="800" cy="580" rx="700" ry="120" fill="url(#windowPool)" />

            {/* ═══════════════════════════════════════════════════════
                LAYER 1 — Back wall elements (static)
            ═══════════════════════════════════════════════════════ */}

            {/* Weight plate rack — left of window area */}
            <g className="gs-plate-rack" transform="translate(60, 420)">
                {/* Rack frame */}
                <rect x="0" y="0" width="90" height="140" fill="#1e293b" />
                <rect x="0" y="0" width="90" height="6"   fill="#334155" />
                {/* Plates stacked */}
                <circle cx="45" cy="30"  r="20" fill="#10b981" opacity="0.9" />
                <circle cx="45" cy="30"  r="6"  fill="#0a1020" />
                <circle cx="45" cy="72"  r="18" fill="#f59e0b" opacity="0.85" />
                <circle cx="45" cy="72"  r="5"  fill="#0a1020" />
                <circle cx="45" cy="110" r="16" fill="#64748b" />
                <circle cx="45" cy="110" r="4"  fill="#0a1020" />
            </g>

            {/* Wall clock */}
            <g className="gs-clock" transform="translate(1460, 200)">
                <circle cx="0" cy="0" r="42" fill="#1e293b" />
                <circle cx="0" cy="0" r="36" fill="#0f172a" />
                <circle cx="0" cy="0" r="36" fill="none" stroke="#10b981" strokeWidth="1.5" opacity="0.5" />
                {/* 12 / 3 / 6 / 9 marks */}
                <rect x="-1" y="-32" width="2" height="6" fill="#cbd5e1" />
                <rect x="26" y="-1"  width="6" height="2" fill="#cbd5e1" />
                <rect x="-1" y="26"  width="2" height="6" fill="#cbd5e1" />
                <rect x="-32" y="-1" width="6" height="2" fill="#cbd5e1" />
                {/* Hands — 5:45 AM */}
                <line x1="0" y1="0" x2="0" y2="-20" stroke="#f1f5f9" strokeWidth="2.5" strokeLinecap="round" />
                <line x1="0" y1="0" x2="-22" y2="6" stroke="#f1f5f9" strokeWidth="2" strokeLinecap="round" />
                {/* Center dot */}
                <circle cx="0" cy="0" r="3" fill="#10b981" />
            </g>

            {/* Wall-mounted barbell (horizontal on wall) */}
            <g className="gs-wallbar" transform="translate(1200, 410)">
                <rect x="0" y="0"  width="180" height="5" fill="#475569" />
                <rect x="0" y="-8" width="10"  height="20" rx="2" fill="#1e293b" />
                <rect x="170" y="-8" width="10" height="20" rx="2" fill="#1e293b" />
                {/* Plates */}
                <rect x="14" y="-14" width="8" height="30" rx="2" fill="#f59e0b" opacity="0.85" />
                <rect x="26" y="-11" width="6" height="24" rx="2" fill="#f59e0b" opacity="0.7" />
                <rect x="148" y="-14" width="8" height="30" rx="2" fill="#f59e0b" opacity="0.85" />
                <rect x="138" y="-11" width="6" height="24" rx="2" fill="#f59e0b" opacity="0.7" />
            </g>

            {/* ═══════════════════════════════════════════════════════
                LAYER 2 — Mid floor: treadmill + runner, squat rack, punching bag
            ═══════════════════════════════════════════════════════ */}

            {/* ── Treadmill with running figure ── */}
            <g className="gs-treadmill" transform="translate(220, 600)">
                {/* Base */}
                <rect x="0" y="80" width="180" height="40" rx="6" fill="#1e293b" />
                <rect x="0" y="78" width="180" height="6"  fill="#334155" />
                {/* Belt rollers */}
                <circle cx="8"   cy="100" r="7" fill="#0f172a" />
                <circle cx="172" cy="100" r="7" fill="#0f172a" />
                {/* Belt (animated) */}
                <g className="gs-belt">
                    <rect x="-200" y="96" width="30" height="8" fill="#334155" opacity="0.6" />
                    <rect x="-150" y="96" width="30" height="8" fill="#334155" opacity="0.6" />
                    <rect x="-100" y="96" width="30" height="8" fill="#334155" opacity="0.6" />
                    <rect x="-50"  y="96" width="30" height="8" fill="#334155" opacity="0.6" />
                    <rect x="0"    y="96" width="30" height="8" fill="#334155" opacity="0.6" />
                    <rect x="50"   y="96" width="30" height="8" fill="#334155" opacity="0.6" />
                    <rect x="100"  y="96" width="30" height="8" fill="#334155" opacity="0.6" />
                    <rect x="150"  y="96" width="30" height="8" fill="#334155" opacity="0.6" />
                </g>
                {/* Console (vertical posts + display) */}
                <rect x="5"   y="-60" width="4" height="145" fill="#334155" />
                <rect x="171" y="-60" width="4" height="145" fill="#334155" />
                <rect x="-6"  y="-70" width="192" height="20" rx="3" fill="#1e293b" />
                <rect x="65"  y="-66" width="50" height="12" rx="2" fill="#10b981" opacity="0.85" />

                {/* Running figure — head, torso, cycling legs */}
                <g className="gs-runner" transform="translate(60, 0)">
                    {/* Head */}
                    <circle cx="30" cy="10" r="9" fill="#0f172a" />
                    {/* Torso (leaning slightly forward) */}
                    <path d="M26 18 L40 18 L42 56 L24 56 Z" fill="#0f172a" />
                    {/* Arm back */}
                    <path d="M24 24 L12 42 L18 46 L30 28 Z" fill="#0f172a" />
                    {/* Arm front */}
                    <path d="M40 22 L54 30 L50 36 L38 28 Z" fill="#0f172a" />
                    {/* Legs group — cycling animation */}
                    <g className="gs-runner-legs">
                        <g className="gs-leg-a">
                            <path d="M26 56 L22 78 L26 82 L32 58 Z" fill="#0f172a" />
                        </g>
                        <g className="gs-leg-b">
                            <path d="M38 56 L48 74 L44 80 L34 58 Z" fill="#0f172a" />
                        </g>
                    </g>
                </g>
            </g>

            {/* ── Squat rack with barbell ── */}
            <g className="gs-squat" transform="translate(540, 610)">
                {/* Uprights */}
                <rect x="0"  y="-80" width="10" height="170" fill="#1e293b" />
                <rect x="130" y="-80" width="10" height="170" fill="#1e293b" />
                {/* Base bars */}
                <rect x="-20" y="85" width="50"  height="8" fill="#1e293b" />
                <rect x="110" y="85" width="50"  height="8" fill="#1e293b" />
                {/* J-hooks */}
                <rect x="-8"  y="-20" width="18" height="6" fill="#475569" />
                <rect x="130" y="-20" width="18" height="6" fill="#475569" />
                {/* Barbell resting on hooks */}
                <rect x="-40" y="-18" width="220" height="5" fill="#cbd5e1" />
                <rect x="-60" y="-24" width="20" height="18" rx="2" fill="#1e293b" />
                <rect x="180" y="-24" width="20" height="18" rx="2" fill="#1e293b" />
                {/* Big plates */}
                <circle cx="-50" cy="-15" r="22" fill="#10b981" opacity="0.9" />
                <circle cx="-50" cy="-15" r="6"  fill="#0a1020" />
                <circle cx="190" cy="-15" r="22" fill="#10b981" opacity="0.9" />
                <circle cx="190" cy="-15" r="6"  fill="#0a1020" />
            </g>

            {/* ── Punching bag (swings gently) ── */}
            <g className="gs-punch-wrap" transform="translate(880, 560)">
                {/* Chain mount on ceiling */}
                <rect x="-2" y="0" width="4" height="20" fill="#475569" />
                {/* Swinging bag group — animation origin = the top */}
                <g className="gs-punch">
                    <rect x="-3" y="18" width="6" height="10" fill="#334155" />
                    <rect x="-16" y="28" width="32" height="100" rx="6" fill="#1e293b" />
                    <rect x="-14" y="30" width="28" height="12" rx="4" fill="#f59e0b" opacity="0.85" />
                    <rect x="-14" y="115" width="28" height="10" rx="4" fill="#1a2033" />
                </g>
            </g>

            {/* ═══════════════════════════════════════════════════════
                LAYER 3 — Foreground: pull-up bar + person, dumbbells
            ═══════════════════════════════════════════════════════ */}

            {/* ── Pull-up bar + person (animated up/down) ── */}
            <g className="gs-pullup-wrap" transform="translate(1100, 580)">
                {/* Uprights */}
                <rect x="0"   y="0" width="8" height="140" fill="#1e293b" />
                <rect x="140" y="0" width="8" height="140" fill="#1e293b" />
                {/* Crossbar */}
                <rect x="-4"  y="-4" width="156" height="10" rx="2" fill="#334155" />
                {/* Bases */}
                <rect x="-20" y="136" width="50" height="8" fill="#1e293b" />
                <rect x="118" y="136" width="50" height="8" fill="#1e293b" />

                {/* Person doing pull-ups — hangs from crossbar */}
                <g className="gs-puller">
                    {/* Arms up */}
                    <path d="M65 6 L60 28 L72 28 L78 6 Z" fill="#0f172a" />
                    <path d="M83 6 L78 28 L90 28 L95 6 Z" fill="#0f172a" />
                    {/* Head */}
                    <circle cx="78" cy="34" r="9" fill="#0f172a" />
                    {/* Torso */}
                    <path d="M70 42 L88 42 L90 82 L68 82 Z" fill="#0f172a" />
                    {/* Legs (bent, hanging) */}
                    <path d="M70 82 L66 100 L74 108 L78 86 Z" fill="#0f172a" />
                    <path d="M88 82 L92 100 L84 108 L80 86 Z" fill="#0f172a" />
                </g>
            </g>

            {/* ── Dumbbell rack in lower foreground ── */}
            <g className="gs-dumbbells" transform="translate(1380, 740)">
                {/* Rack frame */}
                <rect x="0"  y="30" width="160" height="40" rx="4" fill="#1e293b" />
                <rect x="0"  y="0"  width="160" height="8" fill="#334155" />
                {/* Dumbbells on rack */}
                <g transform="translate(12, 10)">
                    <rect x="0" y="4" width="30" height="8" fill="#10b981" opacity="0.85" />
                    <rect x="-3" y="0" width="6" height="16" rx="2" fill="#1e293b" />
                    <rect x="30" y="0" width="6" height="16" rx="2" fill="#1e293b" />
                </g>
                <g transform="translate(55, 10)">
                    <rect x="0" y="4" width="30" height="8" fill="#f59e0b" opacity="0.85" />
                    <rect x="-3" y="0" width="6" height="16" rx="2" fill="#1e293b" />
                    <rect x="30" y="0" width="6" height="16" rx="2" fill="#1e293b" />
                </g>
                <g transform="translate(100, 10)">
                    <rect x="0" y="4" width="30" height="8" fill="#64748b" />
                    <rect x="-3" y="0" width="6" height="16" rx="2" fill="#1e293b" />
                    <rect x="30" y="0" width="6" height="16" rx="2" fill="#1e293b" />
                </g>
            </g>

            {/* ═══════════════════════════════════════════════════════
                LAYER 4 — Lighting accents (glows, highlights)
            ═══════════════════════════════════════════════════════ */}

            {/* Amber floor wash */}
            <rect x="0" y="0" width="1600" height="900" fill="url(#amberWash)" />

            {/* Subtle scan line / dust particles (purely decorative) */}
            <g className="gs-dust" opacity="0.4">
                <circle cx="420"  cy="620" r="1.5" fill="#fbbf24" />
                <circle cx="680"  cy="580" r="1.2" fill="#fbbf24" />
                <circle cx="950"  cy="640" r="1.5" fill="#fbbf24" />
                <circle cx="1250" cy="600" r="1.2" fill="#fbbf24" />
                <circle cx="1450" cy="660" r="1.5" fill="#fbbf24" />
            </g>

            {/* Teal pulse on the treadmill console LED */}
            <circle className="gs-led-pulse" cx="310" cy="540" r="12" fill="#10b981" opacity="0" />
        </svg>
    )
}
