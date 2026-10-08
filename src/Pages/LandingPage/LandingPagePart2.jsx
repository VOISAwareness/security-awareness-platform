import React, { useEffect, useRef, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useUserType } from '../../UserTypeContext/UserTypeContext';
import DepthCarousel from './DepthCarousel';
import { 
  Sliders, 
  GraduationCap, 
  CalendarClock, 
  Activity, 
  Users, 
  Globe2, 
  Trophy, 
  ShieldCheck, 
  GitPullRequest, 
  KeyRound,
  Sparkles
} from 'lucide-react';

// =========================================================================
// 🎛️ CONTROLLERS: Quick adjust variables for Size, Spacing, Speed & Globe Colors
// =========================================================================
const VarDepthCarouselAnimationSpeed = 500;  // Transition speed in ms
const VarCardWidth = 290;                   // Card width in px
const VarCardHeight = 360;                  // Card height in px
const VarCardSpread = 65;                   // Symmetrical lateral spread in px
const VarCardDepth = 140;                   // 3D Z-depth between cards in px
const VarShowCarouselControls = false;      // Removed arrow buttons
const VarShowCarouselIndicators = true;     // Show bottom dots

// 🌐 GLOBE SURFACE (NON-CONTINENT OCEANS) & CONTINENT DOT COLOR CONTROLLERS
// DARK MODE: White-dominant globe surface with opposite dark/black continent dots
const VarDarkModeGlobeSurfaceColor = [255, 255, 255];       // Dominant white non-continent globe surface
const VarDarkModeGlobeContinentColor = [20, 24, 32];        // Opposite dark continent dots
const VarDarkModeGlobeColorOpacity = 0.98;                  // Surface opacity (0.1 - 1.0)

// LIGHT MODE: Black-dominant globe surface with opposite white continent dots
const VarLightModeGlobeSurfaceColor = [18, 22, 28];         // Dominant black non-continent globe surface
const VarLightModeGlobeContinentColor = [255, 255, 255];    // Opposite white continent dots
const VarLightModeGlobeColorOpacity = 0.95;                 // Surface opacity (0.1 - 1.0)

// 10 CAPABILITIES DATA
const rawCapabilities = [
  { id: 1, tag: "CAPABILITY 01", title: "Design Interactive Scenarios", desc: "Construct highly customizable outreach templates to simulate real-world situations and evaluate audience responses.", icon: Sliders },
  { id: 2, tag: "CAPABILITY 02", title: "Develop Educational Modules", desc: "Build and integrate engaging multimedia content, interactive quizzes, and downloadable digital certificates directly into your communication pathways.", icon: GraduationCap },
  { id: 3, tag: "CAPABILITY 03", title: "Automate Campaign Scheduling", desc: "Precisely time and distribute targeted communications to specific audience segments across your global network.", icon: CalendarClock },
  { id: 4, tag: "CAPABILITY 04", title: "Track User Interaction Metrics", desc: "Monitor real-time performance data, including open rates, click-throughs, and geographic engagement heatmaps.", icon: Activity },
  { id: 5, tag: "CAPABILITY 05", title: "Segment Target Audiences", desc: "Upload and manage dynamic distribution lists to ensure your content reaches the exact intended demographic.", icon: Users },
  { id: 6, tag: "CAPABILITY 06", title: "Manage Custom Outreach Domains", desc: "Configure and control the specific sender identities and email environments used for your internal deployments.", icon: Globe2 },
  { id: 7, tag: "CAPABILITY 07", title: "Drive Participation with Incentives", desc: "Configure dynamic point structures, achievement badges, and competitive leaderboards to maximize user completion rates.", icon: Trophy },
  { id: 8, tag: "CAPABILITY 08", title: "Centralize Workspace Access", desc: "Granularly control which team members have administrative or creative privileges within specific platform modules.", icon: ShieldCheck },
  { id: 9, tag: "CAPABILITY 09", title: "Enforce Publishing Workflows", desc: "Maintain strict quality control by routing drafted campaigns through authorized managerial review before final deployment.", icon: GitPullRequest },
  { id: 10, tag: "CAPABILITY 10", title: "Enterprise Single Sign-On Integration", desc: "Provide frictionless and protected platform access for your entire workforce using your existing corporate identity provider.", icon: KeyRound }
];

// REAL LOCATIONS WITH ACCURATE LATITUDE & LONGITUDE
const locationMarkers = [
  { name: "India", lat: 20.5937, lon: 78.9629, code: "IND-NODE-01" },
  { name: "United Kingdom", lat: 55.3781, lon: -3.4360, code: "UK-SEC-HQ" },
  { name: "Egypt", lat: 26.8206, lon: 30.8025, code: "EGY-HUB-04" },
  { name: "Spain", lat: 40.4637, lon: -3.7492, code: "ESP-GATE-02" },
  { name: "Italy", lat: 41.8719, lon: 12.5674, code: "ITA-CORE-07" },
  { name: "Albania", lat: 41.1533, lon: 20.1683, code: "ALB-RELAY" },
  { name: "South Africa", lat: -30.5595, lon: 22.9375, code: "ZAF-DEFENSE" }
];

// CYBER ARCS LINKING THE NODES
const cyberArcs = [
  { from: locationMarkers[0], to: locationMarkers[1] },
  { from: locationMarkers[1], to: locationMarkers[3] },
  { from: locationMarkers[3], to: locationMarkers[4] },
  { from: locationMarkers[4], to: locationMarkers[5] },
  { from: locationMarkers[5], to: locationMarkers[2] },
  { from: locationMarkers[2], to: locationMarkers[6] },
  { from: locationMarkers[6], to: locationMarkers[0] },
];

// =========================================================================
// 🌐 3D CYBER SECURITY GLOBE (SURFACE DOMINANT COLOR + OPPOSITE CONTINENTS)
// =========================================================================
const NextGenCyberGlobe = ({ isDark }) => {
  const canvasRef = useRef(null);
  const [rotation, setRotation] = useState({ phi: 0.6, theta: 0.28 });
  const [activeLocations, setActiveLocations] = useState([]);
  const [dotsData, setDotsData] = useState([]);
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0, phi: 0, theta: 0 });

  // Load and sample true landmass points from World Map
  useEffect(() => {
    let isMounted = true;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 180" width="360" height="180"><rect width="360" height="180" fill="white"/><g fill="black"><path d="M72,25 Q85,15 110,20 Q145,18 165,30 Q170,45 155,55 Q130,55 120,40 Z"/><path d="M170,30 Q210,25 250,35 Q290,45 300,70 Q280,95 240,85 Q210,65 190,50 Z"/><path d="M185,55 Q215,65 240,75 Q260,95 245,115 Q230,105 210,80 Z"/><path d="M180,75 Q215,80 225,110 Q210,150 190,140 Q175,110 170,85 Z"/><path d="M40,35 Q75,25 90,50 Q85,85 55,90 Q40,65 35,45 Z"/><path d="M60,95 Q85,95 90,120 Q80,165 60,155 Q50,125 55,100 Z"/><path d="M280,120 Q320,115 330,140 Q310,160 275,150 Z"/><path d="M172,40 Q178,35 180,48 Q174,52 172,40 Z"/><path d="M225,65 Q238,70 235,90 Q220,85 225,65 Z"/></g></svg>';

    img.onload = () => {
      const offCanvas = document.createElement('canvas');
      offCanvas.width = 360;
      offCanvas.height = 180;
      const offCtx = offCanvas.getContext('2d');
      offCtx.drawImage(img, 0, 0);
      const imgData = offCtx.getImageData(0, 0, 360, 180).data;

      const sampled = [];
      for (let lat = -75; lat <= 75; lat += 2.8) {
        const latRad = (lat * Math.PI) / 180;
        const count = Math.floor(Math.cos(latRad) * 90);
        if (count <= 0) continue;

        for (let i = 0; i < count; i++) {
          const lon = -180 + (i * 360) / count;
          const px = Math.floor(((lon + 180) / 360) * 360);
          const py = Math.floor(((90 - lat) / 180) * 180);
          const idx = (py * 360 + px) * 4;

          const isLand = imgData[idx] < 128;
          if (isLand || Math.random() < 0.03) {
            sampled.push({ lat, lon, isLand });
          }
        }
      }

      if (isMounted) setDotsData(sampled);
    };

    return () => { isMounted = false; };
  }, []);

  // Continuous auto-rotation
  useEffect(() => {
    let animId;
    const rotate = () => {
      if (!isDragging.current) {
        setRotation(prev => ({
          ...prev,
          phi: prev.phi + 0.005
        }));
      }
      animId = requestAnimationFrame(rotate);
    };
    animId = requestAnimationFrame(rotate);
    return () => cancelAnimationFrame(animId);
  }, []);

  // Main Canvas Render
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const cx = width / 2;
    const cy = height / 2;
    const radius = width * 0.38;

    ctx.clearRect(0, 0, width, height);

    const phi = rotation.phi;
    const theta = rotation.theta;

    // Theme-driven colors for surface and continent dots
    const [sR, sG, sB] = isDark ? VarDarkModeGlobeSurfaceColor : VarLightModeGlobeSurfaceColor;
    const [cR, cG, cB] = isDark ? VarDarkModeGlobeContinentColor : VarLightModeGlobeContinentColor;
    const surfaceOpacity = isDark ? VarDarkModeGlobeColorOpacity : VarLightModeGlobeColorOpacity;

    const project = (lat, lon, r = radius) => {
      const latRad = (lat * Math.PI) / 180;
      const lonRad = (lon * Math.PI) / 180 + phi;

      const x = r * Math.cos(latRad) * Math.sin(lonRad);
      const y = -r * Math.sin(latRad) * Math.cos(theta) + r * Math.cos(latRad) * Math.cos(lonRad) * Math.sin(theta);
      const z = r * Math.cos(latRad) * Math.cos(lonRad) * Math.cos(theta) + r * Math.sin(latRad) * Math.sin(theta);

      return { x: cx + x, y: cy + y, z, visible: z > -r * 0.1 };
    };

    // 1. Atmosphere Radial Glow
    const glowGrad = ctx.createRadialGradient(cx, cy, radius * 0.7, cx, cy, radius * 1.18);
    if (isDark) {
      glowGrad.addColorStop(0, 'rgba(255, 255, 255, 0.08)');
      glowGrad.addColorStop(0.65, 'rgba(230, 0, 0, 0.2)');
      glowGrad.addColorStop(1, 'rgba(35, 35, 35, 0)');
    } else {
      glowGrad.addColorStop(0, 'rgba(0, 0, 0, 0.08)');
      glowGrad.addColorStop(0.65, 'rgba(230, 0, 0, 0.16)');
      glowGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    }
    ctx.fillStyle = glowGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 1.18, 0, Math.PI * 2);
    ctx.fill();

    // 2. Globe Surface Shading (Non-Continent Oceans Body)
    const sphereShading = ctx.createRadialGradient(
      cx - radius * 0.35,
      cy - radius * 0.35,
      radius * 0.1,
      cx,
      cy,
      radius
    );
    sphereShading.addColorStop(0, `rgba(${sR}, ${sG}, ${sB}, ${surfaceOpacity})`);
    sphereShading.addColorStop(0.85, `rgba(${Math.max(0, sR - 30)}, ${Math.max(0, sG - 30)}, ${Math.max(0, sB - 30)}, ${surfaceOpacity * 0.95})`);
    sphereShading.addColorStop(1, `rgba(${Math.max(0, sR - 60)}, ${Math.max(0, sG - 60)}, ${Math.max(0, sB - 60)}, ${surfaceOpacity})`);

    ctx.fillStyle = sphereShading;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();

    // 3. Telemetry Wireframe Rings
    ctx.lineWidth = 0.8;
    ctx.strokeStyle = `rgba(${cR}, ${cG}, ${cB}, 0.12)`;
    [-40, 0, 40].forEach(lat => {
      ctx.beginPath();
      for (let lon = -180; lon <= 180; lon += 5) {
        const p = project(lat, lon);
        if (p.z > 0) {
          ctx.lineTo(p.x, p.y);
        } else {
          ctx.moveTo(p.x, p.y);
        }
      }
      ctx.stroke();
    });

    // 4. Draw Continent Matrix Dots (Opposite Color of Surface)
    dotsData.forEach(dot => {
      const p = project(dot.lat, dot.lon);
      if (p.z > 0) {
        const alpha = Math.max(0.15, (p.z / radius) * (dot.isLand ? 0.95 : 0.2));
        const dotSize = Math.max(1, (p.z / radius) * (dot.isLand ? 1.9 : 1.1));

        ctx.fillStyle = `rgba(${cR}, ${cG}, ${cB}, ${alpha})`;

        ctx.beginPath();
        ctx.arc(p.x, p.y, dotSize, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    // 5. Draw Animated Cyber Defense Laser Arcs
    const time = Date.now() * 0.002;
    cyberArcs.forEach((arc, i) => {
      const p1 = project(arc.from.lat, arc.from.lon);
      const p2 = project(arc.to.lat, arc.to.lon);

      if (p1.z > -radius * 0.2 || p2.z > -radius * 0.2) {
        const midLat = (arc.from.lat + arc.to.lat) / 2;
        const midLon = (arc.from.lon + arc.to.lon) / 2;
        const pMid = project(midLat, midLon, radius * 1.24);

        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.quadraticCurveTo(pMid.x, pMid.y, p2.x, p2.y);
        ctx.strokeStyle = 'rgba(230, 0, 0, 0.65)';
        ctx.lineWidth = 1.6;
        ctx.stroke();

        // Traveling Photon Pulse
        const t = ((time + i * 0.3) % 1);
        const qx = (1 - t) * (1 - t) * p1.x + 2 * (1 - t) * t * pMid.x + t * t * p2.x;
        const qy = (1 - t) * (1 - t) * p1.y + 2 * (1 - t) * t * pMid.y + t * t * p2.y;

        ctx.fillStyle = '#ff1a1a';
        ctx.shadowColor = '#ff1a1a';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(qx, qy, 2.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    });

    // 6. Draw Cyber Security Target Nodes & Radar Ripples
    const projectedPositions = [];
    locationMarkers.forEach((node, idx) => {
      const p = project(node.lat, node.lon);
      const isFront = p.z > -radius * 0.15;

      if (isFront) {
        const pulse = (time * 2 + idx * 0.4) % 1;
        const pulseRadius = 5 + pulse * 14;
        const pulseAlpha = Math.max(0, 1 - pulse) * (p.z > 0 ? 0.85 : 0.3);

        // Radar ripple
        ctx.strokeStyle = '#E60000';
        ctx.lineWidth = 1.6;
        ctx.globalAlpha = pulseAlpha;
        ctx.beginPath();
        ctx.arc(p.x, p.y, pulseRadius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1.0;

        // Core Node
        ctx.fillStyle = '#E60000';
        ctx.shadowColor = '#E60000';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        projectedPositions.push({
          ...node,
          x: (p.x / width) * 100,
          y: (p.y / height) * 100,
          z: p.z,
          visible: p.z > 0
        });
      }
    });

    setActiveLocations(projectedPositions);
  }, [rotation, isDark, dotsData]);

  // Drag Handlers
  const handleMouseDown = e => {
    isDragging.current = true;
    dragStart.current = {
      x: e.clientX,
      y: e.clientY,
      phi: rotation.phi,
      theta: rotation.theta
    };
  };

  const handleMouseMove = e => {
    if (!isDragging.current) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    setRotation({
      phi: dragStart.current.phi + dx * 0.007,
      theta: Math.min(Math.max(dragStart.current.theta + dy * 0.007, -0.6), 0.6)
    });
  };

  const handleMouseUp = () => {
    isDragging.current = false;
  };

  return (
    <div 
      className="relative w-full max-w-[390px] aspect-square flex items-center justify-center my-auto select-none cursor-grab active:cursor-grabbing"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <canvas
        ref={canvasRef}
        width={780}
        height={780}
        className="w-full h-full object-contain pointer-events-none"
      />

      {/* 3D TRANSLUCENT RED FLOATING COUNTRY BADGES */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {activeLocations.map(loc => {
          if (!loc.visible) return null;
          const scale = 0.82 + (loc.z / 180) * 0.28;
          const opacity = Math.min(1, Math.max(0, loc.z / 50));

          return (
            <div
              key={loc.name}
              style={{
                left: `${loc.x}%`,
                top: `${loc.y}%`,
                transform: `translate(-50%, -125%) scale(${scale})`,
                opacity: opacity,
              }}
              className="absolute flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#E60000]/25 dark:bg-[#E60000]/35 text-white border border-[#E60000]/50 shadow-md shadow-[#E60000]/20 backdrop-blur-md transition-transform duration-75"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              <div className="flex flex-col">
                <span className="text-[10px] font-black tracking-wider leading-none text-white">{loc.name}</span>
                <span className="text-[7.5px] font-mono text-[#E60000] dark:text-white/80 leading-none mt-0.5">{loc.code}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Outer Orbit Hologram Ring */}
      <div className="absolute inset-0 rounded-full border border-dashed border-[#E60000]/25 animate-[spin_40s_linear_infinite] pointer-events-none scale-105" />
    </div>
  );
};

// =========================================================================
// MAIN PART 2 COMPONENT
// =========================================================================
const LandingPagePart2 = () => {
  const { isDark } = useUserType();

  const carouselItems = useMemo(() => {
    return rawCapabilities.map((item) => {
      const IconComponent = item.icon;
      return {
        id: item.id,
        content: (
          <div className="h-full w-full p-5 sm:p-6 flex flex-col justify-between bg-[#07090e] dark:bg-white text-white dark:text-slate-900 border border-white/10 dark:border-slate-200 rounded-[10px] shadow-xl relative overflow-hidden group transition-colors duration-500">
            <div className="absolute -top-12 -right-12 w-32 h-32 bg-gradient-to-br from-[#E60000]/20 to-[#990099]/20 dark:from-[#E60000]/10 dark:to-[#990099]/10 rounded-full blur-xl pointer-events-none" />

            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-[9.5px] font-extrabold tracking-widest uppercase px-2.5 py-1 rounded-md bg-white/10 dark:bg-black/5 border border-white/10 dark:border-black/5 text-slate-300 dark:text-slate-600 transition-colors">
                  {item.tag}
                </span>

                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#E60000] to-[#990099] flex items-center justify-center text-white shadow-md shadow-[#E60000]/20">
                  <IconComponent className="w-5 h-5 text-white" strokeWidth={2.2} />
                </div>
              </div>

              <h3 className="text-base sm:text-lg font-black tracking-tight leading-snug mb-2.5 text-white dark:text-slate-900 transition-colors">
                {item.title}
              </h3>

              <p className="text-[12.5px] text-slate-300 dark:text-slate-600 leading-relaxed font-normal transition-colors line-clamp-4">
                {item.desc}
              </p>
            </div>

            <div className="pt-3 border-t border-white/10 dark:border-black/5 flex items-center justify-between transition-colors">
              <span className="text-[9.5px] font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase flex items-center gap-1.5 transition-colors">
                <Sparkles className="w-3 h-3 text-[#E60000]" />
                VOIS Shield Feature
              </span>
              <div className="w-1.5 h-1.5 rounded-full bg-[#E60000] animate-pulse" />
            </div>
          </div>
        )
      };
    });
  }, []);

  return (
    <section className="w-full bg-slate-50 dark:bg-[#030403] pt-6 pb-0 px-6 lg:px-6 relative z-30 transition-colors duration-500 flex flex-col justify-between">
      
      {/* ========================================================= */}
      {/* UNIFIED CONTAINER: LIGHT = WHITE, DARK = #232323          */}
      {/* ========================================================= */}
      <div className="max-w-[1600px] w-full mx-auto rounded-[10px] bg-white dark:bg-[#232323] border border-slate-200 dark:border-white/10 shadow-sm px-6 py-8 sm:px-8 sm:py-5 lg:px-10 lg:py-8 transition-colors duration-500">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          
          {/* LEFT SIDE: DEPTH CAROUSEL CAPABILITIES CARDS */}
          <div className="lg:col-span-6 flex flex-col gap-4 ">
            <div>
              <h2 className="text-2xl sm:text-3xl xl:text-4xl font-black uppercase tracking-tighter text-slate-900/90 dark:text-white/90 leading-snug transition-colors duration-300 -mt-4 pl-4">
                Immersive Phishing Simulation &amp; Campaign Management Tool
              </h2>
            </div>

            <div className="w-full h-[390px] relative overflow-hidden rounded-xl bg-slate-100/70 dark:bg-black/50 border border-slate-200/80 dark:border-white/5 p-1 transition-colors duration-500">
              <DepthCarousel
                items={carouselItems}
                cardWidth={VarCardWidth}
                cardHeight={VarCardHeight}
                radius={18}
                depth={VarCardDepth}
                spread={VarCardSpread}
                tilt={20}
                perspective={1200}
                visibleCards={3}
                falloff={0.2}
                blur={3}
                tint={isDark ? '#cbd5e1' : '#05060a'}
                duration={VarDepthCarouselAnimationSpeed}
                autoplay={true}
                autoplayDelay={3000}
                loop={true}
                showControls={VarShowCarouselControls}
                showIndicators={VarShowCarouselIndicators}
              />
            </div>
          </div>

          {/* RIGHT SIDE: 3D DOTTED GLOBE ANIMATION */}
          <div className="lg:col-span-6 flex flex-col items-center justify-center">
            
            {/* Header Behind Globe */}
            <div className="relative w-full text-center select-none -mb-8 z-0">
              <h2 className="text-2xl sm:text-3xl xl:text-4xl font-black uppercase tracking-tighter text-slate-900/90 dark:text-white/90 transition-colors duration-300">
                ACROSS GLOBAL<br />
                <span className="relative inline-block">
                  LOCATIONS
                  <span className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-white dark:to-[#232323] pointer-events-none" />
                </span>
              </h2>
            </div>

            {/* 3D Dotted Canvas Globe Container */}
            <NextGenCyberGlobe isDark={isDark} />

            {/* Translucent Red Country Tags Bottom Row */}
            <div className="w-full max-w-[420px] mt-2 flex flex-wrap justify-center gap-1.5">
              {locationMarkers.map((loc) => (
                <span
                  key={loc.name}
                  className="px-2.5 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider bg-[#E60000]/15 dark:bg-[#E60000]/25 border border-[#E60000]/30 text-[#E60000] dark:text-[#ff4d4d] transition-colors duration-300 flex items-center gap-1"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[#E60000] animate-pulse" />
                  {loc.name}
                </span>
              ))}
            </div>

          </div>

        </div>
      </div>

      {/* ========================================================= */}
      {/* FINAL FOOTER SECTION (WITH UPPER BORDER LINE)             */}
      {/* ========================================================= */}
      <footer className="w-full max-w-[1600px] mx-auto mt-12 pt-10 pb-6 text-slate-900 dark:text-white border-t border-black/10 dark:border-white/10 transition-colors duration-500 select-none">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 pb-8 items-start">
          
          <div className="md:col-span-3 flex flex-col gap-3">
            <h4 className="text-sm font-bold tracking-tight text-slate-900 dark:text-white mb-1">
              Policies
            </h4>
            <a href="#privacy" className="text-xs text-slate-600 dark:text-slate-400 hover:text-[#E60000] dark:hover:text-[#E60000] transition-colors">
              Privacy policy
            </a>
            <a href="#cookies" className="text-xs text-slate-600 dark:text-slate-400 hover:text-[#E60000] dark:hover:text-[#E60000] transition-colors">
              Cookie notice
            </a>
            <a href="#terms" className="text-xs text-slate-600 dark:text-slate-400 hover:text-[#E60000] dark:hover:text-[#E60000] transition-colors">
              Terms &amp; conditions
            </a>
          </div>

          <div className="md:col-span-4 flex flex-col gap-3">
            <h4 className="text-sm font-bold tracking-tight text-slate-900 dark:text-white mb-1">
              Operating responsibility
            </h4>
            <a href="#code-of-conduct" className="text-xs text-slate-600 dark:text-slate-400 hover:text-[#E60000] dark:hover:text-[#E60000] transition-colors">
              Code of conduct
            </a>
          </div>

          <div className="md:col-span-5 flex flex-col items-start md:items-end justify-between gap-6">
            <div className="flex flex-col items-start md:items-end">
              <h3 className="text-2xl font-black tracking-tight flex items-baseline">
                <span className="text-slate-900 dark:text-white font-extrabold tracking-tight">VOIS</span>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#E60000] to-[#990099] ml-0.5">Shield</span>
                <span className="text-slate-900 dark:text-white font-black">.</span>
              </h3>
              <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                Powered by AIDA
              </p>
            </div>

            <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
              Contact us:&nbsp;
              <a href="mailto:abhay.hs1@vodafone.com" className="font-semibold text-slate-900 dark:text-slate-200 hover:text-[#E60000] dark:hover:text-[#E60000] transition-colors">
                abhay.hs1@vodafone.com
              </a>
            </p>
          </div>

        </div>

        <div className="border-t border-black/10 dark:border-white/10 pt-4 flex items-center justify-center text-[11px] font-semibold tracking-wide text-slate-500 dark:text-slate-400">
          <span>All Rights Reserved</span>
          <span className="mx-2 text-slate-400 dark:text-slate-600">|</span>
          <span>VOISShield</span>
          <span className="mx-2 text-slate-400 dark:text-slate-600">|</span>
          <span className="font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-[#E60000] to-[#990099]">VOIS</span>
        </div>
      </footer>

    </section>
  );
};

export default LandingPagePart2;