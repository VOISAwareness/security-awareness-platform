---
version: 2.0.0
name: VOIS Shield Design System
description: A cinematic, high-contrast, scroll-driven digital identity for enterprise security awareness.
colors:
  dark-mode:
    background-primary: "#030403" # Deep space black
    background-elevated: "#0B1121" # Rich navy-black for cards/modals
    text-primary: "#ffffff"
    text-secondary: "#94a3b8" # slate-400
    border-subtle: "rgba(255,255,255,0.1)"
    glass-panel: "rgba(11, 17, 33, 0.6)"
  light-mode:
    background-primary: "#f8fafc" # slate-50
    background-elevated: "#ffffff"
    text-primary: "#0f172a" # slate-900
    text-secondary: "#64748b" # slate-500
    border-subtle: "rgba(0,0,0,0.05)"
    glass-panel: "rgba(255, 255, 255, 0.8)"
  brand-accents:
    vois-red: "#E60000"
    vois-purple: "#990099"
    gradient-primary: "linear-gradient(to right, #E60000, #990099)"
    gradient-hover: "linear-gradient(to right, #E60000, #ff4d4d)"
typography:
  display:
    family: "Outfit, sans-serif"
    weight: "800" (Extrabold)
    lineHeight: "1" (leading-none)
    letterSpacing: "-0.05em" (tracking-tighter)
  heading:
    family: "Outfit, sans-serif"
    weight: "600" (SemiBold)
    lineHeight: "1.2"
    letterSpacing: "-0.025em" (tracking-tight)
  body:
    family: "Inter, sans-serif"
    weight: "400"
    lineHeight: "1.625" (leading-relaxed)
    letterSpacing: "0.025em" (tracking-wide)
  label:
    family: "Inter, sans-serif"
    weight: "700" (Bold)
    size: "10px"
    letterSpacing: "0.1em" (tracking-widest)
    case: "uppercase"
spacing:
  container-max: "1600px"
  header-height: "65px"
  grid-columns: "12"
  gap-standard: "24px" (gap-6)
rounded:
  card: "16px" (rounded-2xl)
  modal: "24px" (rounded-3xl)
  button: "12px" (rounded-xl)
  pill: "9999px" (rounded-full)
motion:
  easing-standard: "cubic-bezier(0.16, 1, 0.3, 1)"
  spring-stiffness: "300"
  spring-damping: "25"
  scroll-engine: "Lenis (duration: 1.2)"
---


Overview
VOIS Shield utilizes a "Cinematic Editorial" design language. It abandons traditional flat SaaS layouts in favor of immersive, scroll-driven storytelling. The system relies on heavy contrast, atmospheric lighting (ambient glowing orbs and film grain), and buttery-smooth layout morphing to create a premium, native-app feel in the browser.

Colors & Theming
The palette transitions flawlessly between a stark, clean Light Mode and a deep, immersive Dark Mode.

Brand Identity: The core identity is maintained through the strict use of the #E60000 (Red) to #990099 (Purple) gradient.
Text: To maintain an editorial feel, text is never pure black or pure white; it uses deep slates (slate-900) or off-whites (slate-50) to reduce eye strain.
Typography
Hierarchy is established through extreme contrast in scale and tracking:

Hero/Display Text: Massive (6xl to 7xl), extremely tight tracking (tracking-tighter), and tight line-heights.
Eyebrows & Labels: Micro-typography (10px), fully uppercase, and extremely wide tracking (tracking-widest) to create a technical, "cyber-security" aesthetic.
Elevation & Depth
Depth is not achieved through standard drop shadows. Instead, we use physical lighting emulation:

Volumetric Backgrounds: Massive 50vw colored orbs with blur-[150px] sit in the background to create ambient light bleed.
Dynamic Ground Shadows: 3D objects feature independent, animated ground shadows that shrink and fade as the object levitates, simulating real physics.
Film Grain: A 3% opacity SVG fractal noise overlay (mix-blend-overlay) is applied globally to prevent color banding and give the application a physical, premium texture.
Glassmorphism: Cards use backdrop-blur-xl combined with highly transparent backgrounds (bg-white/80 or bg-[#0B1121]/60) and 1px borders to separate foreground from background.
Layout & Scroll Architecture
The application avoids standard document flow in favor of Sticky Canvas Morphing:

The Hero Section is pinned using sticky top-0 h-screen. Instead of scrolling out of view, its height dynamically shrinks (from 75vh to 25vh) and fades out based on scroll depth.
The Gallery (Bento Box) utilizes Framer Motion's layout engine. It begins as a horizontal row (grid-cols-6) peeking out from the bottom of the screen. Upon scrolling, it physically detaches and morphs into a centered 3x2 grid, expanding its height to fill the available space.

Components
Header: Fixed at exactly 65px. Starts completely transparent and transitions to a blurred glass panel with a 1px bottom border immediately upon scroll.
AIDA Badge: A technical pill shape featuring a pulsating 3px dot to indicate active AI integration.
SSO Button: High-visibility, solid contrast block (White in dark mode, Black in light mode) to draw the primary Call to Action, featuring a 3D hover lift and group-hover arrow translation.
Login Modal: Hidden from the DOM until triggered. Enters via a 3D spring-loaded animation (rotateX: 10 to 0) over a blurred backdrop.

Do's and Don'ts
Do use Framer Motion for all layout changes to ensure smooth interpolation between CSS states.
Do map all colors to Tailwind's dark: modifier to ensure perfect theme toggling.
Don't use standard overflow-hidden on containers holding interactive elements (like the Hero section), as it will clip hover states and dropdowns.
Don't use solid backgrounds for cards; always use a translucent color + backdrop blur to allow the ambient background orbs to bleed through.