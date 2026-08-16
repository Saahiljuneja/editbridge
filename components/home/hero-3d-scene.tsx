"use client";

import { useEffect, useRef, useState } from "react";

interface Point3D {
  x: number;
  y: number;
  z: number;
}

export function Hero3DScene() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const mouseRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = 0;
    let height = 0;

    // Generate vertices for a 3D geodesic sphere / mesh
    const points: Point3D[] = [];
    const numRings = 10;
    const pointsPerRing = 16;
    const radius = 150;

    for (let i = 0; i < numRings; i++) {
      const phi = (Math.PI * i) / (numRings - 1);
      const sinPhi = Math.sin(phi);
      const cosPhi = Math.cos(phi);

      for (let j = 0; j < pointsPerRing; j++) {
        const theta = (Math.PI * 2 * j) / pointsPerRing;
        points.push({
          x: radius * sinPhi * Math.cos(theta),
          y: radius * sinPhi * Math.sin(theta),
          z: radius * cosPhi,
        });
      }
    }

    // Handles resizing
    const resize = () => {
      if (!canvas || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      width = rect.width || 350;
      height = rect.height || 350;
      
      const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.scale(dpr, dpr);
    };

    resize();
    window.addEventListener("resize", resize);

    let angleX = 0.003;
    let angleY = 0.004;

    // Track mouse positioning
    const onMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left - width / 2;
      const y = e.clientY - rect.top - height / 2;
      mouseRef.current.targetX = x * 0.005;
      mouseRef.current.targetY = y * 0.005;
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener("mousemove", onMouseMove);
    }

    // Main render loop
    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Smooth mouse spring dampening
      mouseRef.current.x += (mouseRef.current.targetX - mouseRef.current.x) * 0.08;
      mouseRef.current.y += (mouseRef.current.targetY - mouseRef.current.y) * 0.08;

      // Base rotation + mouse tilt influence
      const rotX = angleX + mouseRef.current.y * 0.05;
      const rotY = angleY + mouseRef.current.x * 0.05;

      const cosX = Math.cos(rotX);
      const sinX = Math.sin(rotX);
      const cosY = Math.cos(rotY);
      const sinY = Math.sin(rotY);

      // Rotate and project points
      const projected = points.map((p) => {
        // Rotate Y
        let x1 = p.x * cosY - p.z * sinY;
        let z1 = p.x * sinY + p.z * cosY;

        // Rotate X
        let y2 = p.y * cosX - z1 * sinX;
        let z2 = p.y * sinX + z1 * cosX;

        // Perspective projection
        const depth = 350;
        const scale = depth / (depth + z2);
        
        return {
          x: x1 * scale + width / 2,
          y: y2 * scale + height / 2,
          z: z2,
        };
      });

      // Draw contour vector lines
      ctx.lineWidth = 0.6;
      ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";

      // Latitudinal lines
      for (let i = 0; i < numRings; i++) {
        ctx.beginPath();
        for (let j = 0; j < pointsPerRing; j++) {
          const idx = i * pointsPerRing + j;
          const p = projected[idx];
          if (j === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        }
        ctx.closePath();
        ctx.stroke();
      }

      // Longitudinal lines
      for (let j = 0; j < pointsPerRing; j++) {
        ctx.beginPath();
        for (let i = 0; i < numRings; i++) {
          const idx = i * pointsPerRing + j;
          const p = projected[idx];
          if (i === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        }
        ctx.stroke();
      }

      // Draw point nodes at line junctions for technical texture
      projected.forEach((p) => {
        const size = p.z < 0 ? 1.5 : 0.8;
        ctx.beginPath();
        ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255, 255, 255, 0.15)";
        ctx.fill();
      });

      // Update base angles slowly for continuous rotation
      angleX += 0.0005;
      angleY += 0.0008;

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", resize);
      if (container) {
        container.removeEventListener("mousemove", onMouseMove);
      }
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        mouseRef.current.targetX = 0;
        mouseRef.current.targetY = 0;
      }}
      className="relative w-full h-[320px] md:h-[400px] flex items-center justify-center pointer-events-auto select-none"
    >
      <canvas ref={canvasRef} className="z-10 block" />
      {/* Blueprint stats overlap badge */}
      <div className="absolute bottom-6 right-6 z-25 bg-black/80 backdrop-blur-md border border-neutral-800 rounded-2xl p-3 shadow-md text-left transition-all duration-300 transform hover:scale-[1.04]">
        <p className="text-[9px] font-mono font-bold text-neutral-400 uppercase tracking-widest leading-none">Perspective Node</p>
        <p className="text-xs font-black text-white mt-1 leading-none">60 FPS Geodesic Mesh</p>
        <p className="text-[10px] font-medium text-neutral-500 mt-1 leading-none">React 19 Native Vector Engine</p>
      </div>
    </div>
  );
}
