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
  return cores <= 2 || memory <= 2;
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

    // Katta yorug' dog'lar (orb) har kadrda emas, bir marta alohida qatlamga chiziladi —
    // har kadrda faqat tayyor rasm ko'chiriladi va mayda zarralar suriladi (arzon).
    const orbLayer = document.createElement('canvas');
    const orbCtx = orbLayer.getContext('2d');
    let isDark = document.documentElement.classList.contains('dark');

    const paintOrbs = () => {
      if (!orbCtx) return;
      orbLayer.width = Math.round(width * dpr);
      orbLayer.height = Math.round(height * dpr);
      orbCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
      orbCtx.clearRect(0, 0, width, height);
      ambientOrbs.forEach((orb) => {
        const gradient = orbCtx.createRadialGradient(orb.x, orb.y, 0, orb.x, orb.y, orb.radius);
        const [r, g, bl, a] =
          orb.colorType === 'emerald'
            ? [16, 185, 129, isDark ? 0.065 : 0.035]
            : orb.colorType === 'orange'
            ? [249, 115, 22, isDark ? 0.055 : 0.028]
            : [45, 212, 191, isDark ? 0.05 : 0.025];
        gradient.addColorStop(0, `rgba(${r}, ${g}, ${bl}, ${a})`);
        gradient.addColorStop(1, `rgba(${r}, ${g}, ${bl}, 0)`);
        orbCtx.fillStyle = gradient;
        orbCtx.beginPath();
        orbCtx.arc(orb.x, orb.y, orb.radius, 0, Math.PI * 2);
        orbCtx.fill();
      });
    };

    // Zarralar sekin yuqoriga "suzadi" (antigravity), yonga yengil tebranadi va miltillaydi
    particles.forEach((p) => {
      p.vy = -(Math.random() * 0.22 + 0.08);
      p.vx = (Math.random() - 0.5) * 0.12;
    });

    const colorFor = (p: Particle, alpha: number): [string, string] => {
      if (p.colorType === 'emerald')
        return isDark
          ? [`rgba(16, 185, 129, ${alpha})`, `rgba(16, 185, 129, ${alpha * 0.25})`]
          : [`rgba(5, 150, 105, ${alpha * 0.85})`, `rgba(5, 150, 105, ${alpha * 0.18})`];
      if (p.colorType === 'mint')
        return isDark
          ? [`rgba(52, 211, 153, ${alpha})`, `rgba(52, 211, 153, ${alpha * 0.25})`]
          : [`rgba(16, 185, 129, ${alpha * 0.8})`, `rgba(16, 185, 129, ${alpha * 0.15})`];
      if (p.colorType === 'orange')
        return isDark
          ? [`rgba(249, 115, 22, ${alpha})`, `rgba(249, 115, 22, ${alpha * 0.25})`]
          : [`rgba(234, 88, 12, ${alpha * 0.85})`, `rgba(234, 88, 12, ${alpha * 0.18})`];
      return isDark
        ? [`rgba(255, 255, 255, ${alpha * 0.8})`, `rgba(255, 255, 255, ${alpha * 0.18})`]
        : [`rgba(100, 116, 139, ${alpha * 0.45})`, `rgba(148, 163, 184, ${alpha * 0.12})`];
    };

    const drawFrame = (time: number) => {
      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(orbLayer, 0, 0, width, height);
      const t = time / 1000;
      for (const p of particles) {
        const twinkle = 0.75 + 0.25 * Math.sin(t * p.twinkleSpeed * 60 + p.twinklePhase);
        const alpha = Math.max(0.1, Math.min(0.75, p.baseAlpha * twinkle));
        const [fill, halo] = colorFor(p, alpha);
        if (p.hasHalo) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius * 2.8, 0, Math.PI * 2);
          ctx.fillStyle = halo;
          ctx.fill();
        }
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = fill;
        ctx.fill();
      }
    };

    const step = (dt: number, time: number) => {
      const k = dt / 16.67; // 60fps ga nisbatan
      const t = time / 1000;
      for (const p of particles) {
        p.x += (p.vx + Math.sin(t * 0.6 + p.twinklePhase) * 0.06) * k;
        p.y += p.vy * k;
        if (p.y < -10) {
          p.y = height + 10;
          p.x = Math.random() * width;
        }
        if (p.x < -10) p.x = width + 10;
        else if (p.x > width + 10) p.x = -10;
      }
    };

    // ~30 kadr/s: ko'z uchun silliq, batareya uchun tejamkor. Ilova yashirilganda to'xtaydi.
    const FRAME_MS = 1000 / 30;
    let last = 0;
    let running = true;
    const loop = (time: number) => {
      if (!running) return;
      animationFrameId = requestAnimationFrame(loop);
      if (!last) last = time;
      const dt = time - last;
      if (dt < FRAME_MS) return;
      last = time;
      step(Math.min(dt, 100), time);
      drawFrame(time);
    };

    paintOrbs();
    drawFrame(performance.now());
    animationFrameId = requestAnimationFrame(loop);

    const onVisibility = () => {
      if (document.hidden) {
        running = false;
        cancelAnimationFrame(animationFrameId);
      } else if (!running) {
        running = true;
        last = 0;
        animationFrameId = requestAnimationFrame(loop);
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    // Ekran o'lchami yoki tema (yorug'/qorong'i) o'zgarsa fon qatlami qayta chiziladi
    const onResize = () => {
      resize();
      paintOrbs();
    };
    window.removeEventListener('resize', resize);
    window.addEventListener('resize', onResize, { passive: true });
    const themeObserver = new MutationObserver(() => {
      const nextDark = document.documentElement.classList.contains('dark');
      if (nextDark !== isDark) {
        isDark = nextDark;
        paintOrbs();
      }
    });
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    return () => {
      running = false;
      cancelAnimationFrame(animationFrameId);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('resize', onResize);
      themeObserver.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none z-0"
      style={{
        width: '100%',
        height: '100%',
      }}
    />
  );
};
