
import React, { useEffect, useRef } from 'react';

interface Props {
  themeColor: string;
}

const LiquidBackground: React.FC<Props> = ({ themeColor }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    let animationFrameId: number;
    let time = 0;

    const init = () => {
      canvas.width = window.innerWidth * window.devicePixelRatio;
      canvas.height = window.innerHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };

    const draw = () => {
      time += 0.003;
      const w = window.innerWidth;
      const h = window.innerHeight;

      // Deep Obsidian Substrate
      ctx.fillStyle = '#010002';
      ctx.fillRect(0, 0, w, h);

      // --- LAYER 1: 4D GHOST CHEETAH SPOTS ---
      // These spots "breathe" and have intense edge glow that collapses inward
      const spotCount = 18;
      ctx.save();
      for (let i = 0; i < spotCount; i++) {
        const x = (Math.sin(time * 0.12 + i * 23.45) * 0.7 + 0.5) * w;
        const y = (Math.cos(time * 0.08 + i * 45.67) * 0.7 + 0.5) * h;
        const baseSize = 220 + Math.sin(time * 0.4 + i) * 80;
        
        // Dynamic color shifting for 4D effect
        const hueShift = Math.sin(time * 0.2 + i) * 30;
        // Use themeColor directly
        const r = parseInt(themeColor.slice(1, 3), 16);
        const g = parseInt(themeColor.slice(3, 5), 16);
        const b = parseInt(themeColor.slice(5, 7), 16);
        
        const brightColor = `rgba(${r}, ${g}, ${b}, 0.12)`;
        const coreColor = `rgba(50, 20, 100, 0.05)`; // Keeping a dark core

        ctx.beginPath();
        // Organic irregular spot shape
        for (let angle = 0; angle < Math.PI * 2; angle += 0.3) {
            const noise = Math.sin(angle * 4 + time + i) * 35;
            const dist = baseSize + noise;
            const px = x + Math.cos(angle) * dist;
            const py = y + Math.sin(angle) * dist;
            if (angle === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
        
        const grad = ctx.createRadialGradient(x, y, 0, x, y, baseSize * 2.5);
        // Bright edges, dark core (as requested)
        grad.addColorStop(0, coreColor);
        grad.addColorStop(0.3, `${themeColor}05`); // Subtle inner glow
        grad.addColorStop(0.8, brightColor); // Peak glow towards edges
        grad.addColorStop(1, 'transparent');
        
        ctx.fillStyle = grad;
        ctx.fill();
      }
      ctx.restore();

      // --- LAYER 2: HOLOGRAPHIC WIREFRAME ---
      // Subtle topological overlay for futuristic depth
      const cols = 28;
      const rows = 20;
      const spacingX = w / (cols - 1);
      const spacingY = h / (rows - 1);

      ctx.beginPath();
      ctx.strokeStyle = `${themeColor}1F`; // Use themeColor for wireframe
      ctx.lineWidth = 0.4;

      const grid: { x: number; y: number; z: number; influence: number }[][] = [];

      for (let i = 0; i < cols; i++) {
        grid[i] = [];
        for (let j = 0; j < rows; j++) {
          const baseX = i * spacingX;
          const baseY = j * spacingY;

          const dx = baseX - mouseRef.current.x;
          const dy = baseY - mouseRef.current.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const influence = Math.max(0, 1 - dist / 700);
          
          const z = Math.sin(time * 0.8 + (i + j) * 0.15) * 60 * influence;

          grid[i][j] = {
            x: baseX + (mouseRef.current.x - baseX) * influence * 0.15,
            y: baseY + (mouseRef.current.y - baseY) * influence * 0.15,
            z,
            influence
          };
        }
      }

      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          const p = grid[i][j];
          if (i < cols - 1) {
            ctx.moveTo(p.x, p.y + p.z);
            ctx.lineTo(grid[i + 1][j].x, grid[i + 1][j].y + grid[i + 1][j].z);
          }
          if (j < rows - 1) {
            ctx.moveTo(p.x, p.y + p.z);
            ctx.lineTo(grid[i][j + 1].x, grid[i][j + 1].y + grid[i][j + 1].z);
          }
        }
      }
      ctx.stroke();

      animationFrameId = requestAnimationFrame(draw);
    };

    window.addEventListener('resize', init);
    window.addEventListener('mousemove', handleMouseMove);
    init();
    draw();
    
    return () => {
      window.removeEventListener('resize', init);
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, [themeColor]);

  return (
    <canvas 
      ref={canvasRef} 
      className="fixed inset-0 -z-10 pointer-events-none w-full h-full"
    />
  );
};

export default LiquidBackground;