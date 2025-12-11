import React, { useEffect, useRef } from 'react';

const Confetti: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let particles: any[] = [];
    
    // Confetti configuration
    const colors = ['#38bdf8', '#fbbf24', '#34d399', '#f472b6', '#a78bfa'];
    const particleCount = 150;
    const startTime = Date.now();
    const duration = 5000; // Hard stop at 4 seconds

    // Handle High DPI displays
    const resizeCanvas = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      
      // Set actual size in memory (scaled to account for extra pixel density)
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      
      // Set visible style size
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      
      // Normalize coordinate system to use css pixels
      ctx.scale(dpr, dpr);
    };

    // Initial Resize
    resizeCanvas();

    // Initialize particles
    // We use window.innerWidth/Height (logical pixels) because ctx is scaled
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight - window.innerHeight, // Start above screen
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 8 + 4,
        speedY: Math.random() * 8 + 5, 
        speedX: Math.random() * 4 - 2,
        rotation: Math.random() * 360,
        rotationSpeed: Math.random() * 15 - 7.5
      });
    }

    // Animation Loop
    const animate = () => {
      const elapsed = Date.now() - startTime;
      
      // Stop animation completely after duration
      if (elapsed > duration) {
        ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
        return; 
      }

      // Stop respawning particles after 2.5 seconds
      const stopRespawning = elapsed > (duration - 5500);

      // Clear rect uses logical pixels due to scale()
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

      particles.forEach((p) => {
        p.y += p.speedY;
        p.x += p.speedX;
        p.rotation += p.rotationSpeed;

        // Draw particle
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        ctx.restore();

        // Respawn logic
        if (p.y > window.innerHeight) {
          if (!stopRespawning) {
            p.y = -20;
            p.x = Math.random() * window.innerWidth;
          }
        }
      });

      animationId = requestAnimationFrame(animate);
    };

    animate();

    // Handle window resize dynamically
    const handleResize = () => {
        resizeCanvas();
        // Note: resizing resets the context scale, so we don't need to re-init particles, 
        // but they might shift position relative to the new scale. For a 4s animation, this is acceptable.
    };
    
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <canvas 
      ref={canvasRef} 
      className="fixed inset-0 pointer-events-none z-[100]"
      aria-hidden="true"
    />
  );
};

export default Confetti;