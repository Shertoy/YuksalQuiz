import React, { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  baseAlpha: number;
  colorType: 'emerald' | 'mint' | 'orange' | 'white';
  twinkleSpeed: number;
  twinklePhase: number;
  hasHalo: boolean;
}

interface AmbientOrb {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  colorType: 'emerald' | 'orange' | 'teal';
}

/**
 * Kuchsiz telefon yoki "harakatni kamaytirish" yoqilgan bo'lsa animatsiya o'chiriladi
 * (doimiy 60fps chizish batareya va tezlikka ta'sir qiladi).
 */
export function shouldReduceBackgroundMotion(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return true;
  } catch {}
  const cores = (navigator as any)?.hardwareConcurrency || 8;
  const memory = (navigator as any)?.deviceMemory || 8;
  return cores <= 4 || memory <= 2;
}

export const ParticleBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let animationFrameId: number;
    let width = window.innerWidth;
    let height = window.innerHeight;

    // Cap DPR at 1.5 for optimal performance and battery efficiency on mobile
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      // setTransform: har resize da masshtab ustma-ust ko'paymasin
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    window.addEventListener('resize', resize, { passive: true });

    // Interactive pointer coordinates
    let mouseX = -1000;
    let mouseY = -1000;
    let lastMouseMoveTime = 0;

    const onPointerMove = (e: MouseEvent | TouchEvent) => {
      lastMouseMoveTime = performance.now();
      if ('touches' in e && e.touches.length > 0) {
        mouseX = e.touches[0].clientX;
        mouseY = e.touches[0].clientY;
      } else if ('clientX' in e) {
        mouseX = e.clientX;
        mouseY = e.clientY;
      }
    };

    const onPointerLeave = () => {
      mouseX = -1000;
      mouseY = -1000;
    };

    window.addEventListener('mousemove', onPointerMove, { passive: true });
    window.addEventListener('touchmove', onPointerMove, { passive: true });
    window.addEventListener('mouseleave', onPointerLeave, { passive: true });
    window.addEventListener('touchend', onPointerLeave, { passive: true });

    // Create particles based on screen size (35 on mobile, 55 on desktop)
    const particleCount = width < 640 ? 36 : 58;
    const particles: Particle[] = [];
    const colorTypes: ('emerald' | 'mint' | 'orange' | 'white')[] = [
      'emerald',
      'mint',
      'mint',
      'orange',
      'orange',
      'white',
      'white',
    ];

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
        radius: Math.random() * 2.2 + 1.1,
        baseAlpha: Math.random() * 0.45 + 0.25,
        colorType: colorTypes[Math.floor(Math.random() * colorTypes.length)],
        twinkleSpeed: Math.random() * 0.03 + 0.015,
        twinklePhase: Math.random() * Math.PI * 2,
        hasHalo: Math.random() < 0.25,
      });
    }

    // 3 large subtle ambient glowing orbs in the background
    const ambientOrbs: AmbientOrb[] = [
      {
        x: width * 0.2,
        y: height * 0.25,
        vx: 0.08,
        vy: 0.06,
        radius: Math.min(width, height) * 0.35,
        colorType: 'emerald',
      },
      {
        x: width * 0.8,
        y: height * 0.75,
        vx: -0.07,
        vy: -0.05,
        radius: Math.min(width, height) * 0.32,
        colorType: 'orange',
      },
      {
        x: width * 0.5,
        y: height * 0.5,
        vx: 0.05,
        vy: -0.06,
        radius: Math.min(width, height) * 0.28,
        colorType: 'teal',
      },
    ];

    let isRunning = true;

    const render = () => {
      if (!isRunning) return;

      const now = performance.now();
      // Decay interactive pointer if inactive for > 1.8s
      if (now - lastMouseMoveTime > 1800) {
        mouseX = -1000;
        mouseY = -1000;
      }

      const isDark = document.documentElement.classList.contains('dark');

      ctx.clearRect(0, 0, width, height);

      // 1. Draw large subtle ambient orbs
      ambientOrbs.forEach((orb) => {
        orb.x += orb.vx;
        orb.y += orb.vy;

        if (orb.x < -orb.radius) orb.x = width + orb.radius;
        if (orb.x > width + orb.radius) orb.x = -orb.radius;
        if (orb.y < -orb.radius) orb.y = height + orb.radius;
        if (orb.y > height + orb.radius) orb.y = -orb.radius;

        const gradient = ctx.createRadialGradient(
          orb.x,
          orb.y,
          0,
          orb.x,
          orb.y,
          orb.radius
        );

        if (orb.colorType === 'emerald') {
          const alpha = isDark ? 0.065 : 0.035;
          gradient.addColorStop(0, `rgba(16, 185, 129, ${alpha})`);
          gradient.addColorStop(1, 'rgba(16, 185, 129, 0)');
        } else if (orb.colorType === 'orange') {
          const alpha = isDark ? 0.055 : 0.028;
          gradient.addColorStop(0, `rgba(249, 115, 22, ${alpha})`);
          gradient.addColorStop(1, 'rgba(249, 115, 22, 0)');
        } else {
          const alpha = isDark ? 0.05 : 0.025;
          gradient.addColorStop(0, `rgba(45, 212, 191, ${alpha})`);
          gradient.addColorStop(1, 'rgba(45, 212, 191, 0)');
        }

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(orb.x, orb.y, orb.radius, 0, Math.PI * 2);
        ctx.fill();
      });

      // 2. Draw star-like floating circular particles
      const interactionRadius = 90;
      const interactionRadiusSq = interactionRadius * interactionRadius;

      particles.forEach((p) => {
        // Natural gentle drift
        p.x += p.vx;
        p.y += p.vy;

        // Interactive gentle repulsion/reaction when touch/pointer is near
        if (mouseX > -500 && mouseY > -500) {
          const dx = p.x - mouseX;
          const dy = p.y - mouseY;
          const distSq = dx * dx + dy * dy;

          if (distSq < interactionRadiusSq && distSq > 0) {
            const dist = Math.sqrt(distSq);
            const force = (1 - dist / interactionRadius) * 1.8;
            p.x += (dx / dist) * force;
            p.y += (dy / dist) * force;
          }
        }

        // Screen wrap
        if (p.x < -10) p.x = width + 10;
        if (p.x > width + 10) p.x = -10;
        if (p.y < -10) p.y = height + 10;
        if (p.y > height + 10) p.y = -10;

        // Star twinkling calculation: sine cycle on opacity and size
        p.twinklePhase += p.twinkleSpeed;
        const twinkleFactor = Math.sin(p.twinklePhase);
        const currentAlpha = Math.max(
          0.12,
          Math.min(0.9, p.baseAlpha + twinkleFactor * 0.28)
        );
        const currentRadius = Math.max(0.8, p.radius + twinkleFactor * 0.45);

        // Color palette based on theme (Soft Emerald/Mint, Clean Orange, Starry White)
        let fillColor: string;
        let haloColor: string;

        if (p.colorType === 'emerald') {
          fillColor = isDark
            ? `rgba(16, 185, 129, ${currentAlpha})`
            : `rgba(5, 150, 105, ${currentAlpha * 0.85})`;
          haloColor = isDark
            ? `rgba(16, 185, 129, ${currentAlpha * 0.25})`
            : `rgba(5, 150, 105, ${currentAlpha * 0.18})`;
        } else if (p.colorType === 'mint') {
          fillColor = isDark
            ? `rgba(52, 211, 153, ${currentAlpha})`
            : `rgba(16, 185, 129, ${currentAlpha * 0.8})`;
          haloColor = isDark
            ? `rgba(52, 211, 153, ${currentAlpha * 0.25})`
            : `rgba(16, 185, 129, ${currentAlpha * 0.15})`;
        } else if (p.colorType === 'orange') {
          fillColor = isDark
            ? `rgba(249, 115, 22, ${currentAlpha})`
            : `rgba(234, 88, 12, ${currentAlpha * 0.85})`;
          haloColor = isDark
            ? `rgba(249, 115, 22, ${currentAlpha * 0.25})`
            : `rgba(234, 88, 12, ${currentAlpha * 0.18})`;
        } else {
          fillColor = isDark
            ? `rgba(255, 255, 255, ${currentAlpha * 0.9})`
            : `rgba(100, 116, 139, ${currentAlpha * 0.45})`;
          haloColor = isDark
            ? `rgba(255, 255, 255, ${currentAlpha * 0.2})`
            : `rgba(148, 163, 184, ${currentAlpha * 0.12})`;
        }

        // Draw soft outer halo for special star particles
        if (p.hasHalo) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, currentRadius * 2.8, 0, Math.PI * 2);
          ctx.fillStyle = haloColor;
          ctx.fill();
        }

        // Draw star core
        ctx.beginPath();
        ctx.arc(p.x, p.y, currentRadius, 0, Math.PI * 2);
        ctx.fillStyle = fillColor;
        ctx.fill();
      });

      animationFrameId = requestAnimationFrame(render);
    };

    // Start loop
    animationFrameId = requestAnimationFrame(render);

    let isDisposed = false;

    // Pause animation when tab or Telegram is backgrounded to save 100% battery
    const onVisibilityChange = () => {
      if (isDisposed) return;
      if (document.hidden) {
        isRunning = false;
        cancelAnimationFrame(animationFrameId);
      } else if (!isRunning) {
        isRunning = true;
        cancelAnimationFrame(animationFrameId);
        animationFrameId = requestAnimationFrame(render);
      }
    };

    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      isDisposed = true;
      isRunning = false;
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onPointerMove);
      window.removeEventListener('touchmove', onPointerMove);
      window.removeEventListener('mouseleave', onPointerLeave);
      window.removeEventListener('touchend', onPointerLeave);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none z-0 transition-opacity duration-700 ease-out"
      style={{
        width: '100%',
        height: '100%',
      }}
    />
  );
};
