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

    // Fon BIR MARTA chiziladi (animatsiyasiz). Har kadrda qayta chizish ustidagi
    // backdrop-blur qatlamlari bilan birga Android Telegram'da ekranni pirpiratardi.
    const draw = () => {
      const isDark = document.documentElement.classList.contains('dark');
      ctx.clearRect(0, 0, width, height);

      ambientOrbs.forEach((orb) => {
        const gradient = ctx.createRadialGradient(orb.x, orb.y, 0, orb.x, orb.y, orb.radius);
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

      particles.forEach((p) => {
        const alpha = Math.max(0.12, Math.min(0.75, p.baseAlpha));
        let fillColor: string;
        let haloColor: string;
        if (p.colorType === 'emerald') {
          fillColor = isDark ? `rgba(16, 185, 129, ${alpha})` : `rgba(5, 150, 105, ${alpha * 0.85})`;
          haloColor = isDark ? `rgba(16, 185, 129, ${alpha * 0.25})` : `rgba(5, 150, 105, ${alpha * 0.18})`;
        } else if (p.colorType === 'mint') {
          fillColor = isDark ? `rgba(52, 211, 153, ${alpha})` : `rgba(16, 185, 129, ${alpha * 0.8})`;
          haloColor = isDark ? `rgba(52, 211, 153, ${alpha * 0.25})` : `rgba(16, 185, 129, ${alpha * 0.15})`;
        } else if (p.colorType === 'orange') {
          fillColor = isDark ? `rgba(249, 115, 22, ${alpha})` : `rgba(234, 88, 12, ${alpha * 0.85})`;
          haloColor = isDark ? `rgba(249, 115, 22, ${alpha * 0.25})` : `rgba(234, 88, 12, ${alpha * 0.18})`;
        } else {
          fillColor = isDark ? `rgba(255, 255, 255, ${alpha * 0.8})` : `rgba(100, 116, 139, ${alpha * 0.45})`;
          haloColor = isDark ? `rgba(255, 255, 255, ${alpha * 0.18})` : `rgba(148, 163, 184, ${alpha * 0.12})`;
        }
        if (p.hasHalo) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius * 2.8, 0, Math.PI * 2);
          ctx.fillStyle = haloColor;
          ctx.fill();
        }
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = fillColor;
        ctx.fill();
      });
    };

    draw();

    // Ekran o'lchami o'zgarsa yoki tema (yorug'/qorong'i) almashsa qayta chiziladi
    const onResize = () => {
      resize();
      draw();
    };
    window.removeEventListener('resize', resize);
    window.addEventListener('resize', onResize, { passive: true });
    const themeObserver = new MutationObserver(() => draw());
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    return () => {
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
