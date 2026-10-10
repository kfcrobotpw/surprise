import React, { useRef, useState, useEffect } from 'react';
import { PrizeItem } from '../types';
import { playSpinTick } from '../lib/audio';
import { Bot, Sparkles } from 'lucide-react';

interface RouletteWheelProps {
  prizes: PrizeItem[];
  isSpinning: boolean;
  onSpinStart: () => void;
  onSpinEnd: (wonPrize: PrizeItem) => void;
  disabled?: boolean;
}

export const RouletteWheel: React.FC<RouletteWheelProps> = ({
  prizes,
  isSpinning,
  onSpinStart,
  onSpinEnd,
  disabled = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const currentAngleRef = useRef<number>(0);
  const animFrameRef = useRef<number | null>(null);
  const lastTickSliceRef = useRef<number>(-1);
  const [highlightPrize, setHighlightPrize] = useState<PrizeItem | null>(null);

  const numSlices = prizes.length;
  const sliceAngle = (2 * Math.PI) / numSlices;

  // Draw wheel on canvas
  const drawWheel = (angle: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = canvas.width;
    const center = size / 2;
    const radius = center - 16;

    ctx.clearRect(0, 0, size, size);

    // Save context for rotation
    ctx.save();
    ctx.translate(center, center);
    ctx.rotate(angle);

    // Draw slices
    prizes.forEach((prize, index) => {
      const startAngle = index * sliceAngle;
      const endAngle = startAngle + sliceAngle;

      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, radius, startAngle, endAngle);
      ctx.closePath();

      // Cyber gradient colors
      const sliceColors = [
        ['#7c3aed', '#6366f1'], // Indigo/Violet
        ['#0284c7', '#06b6d4'], // Sky/Cyan
        ['#059669', '#10b981'], // Emerald
        ['#d97706', '#f59e0b'], // Amber
        ['#db2777', '#ec4899'], // Rose/Pink
        ['#4f46e5', '#3b82f6'], // Blue
      ];
      const colors = sliceColors[index % sliceColors.length];

      const grad = ctx.createRadialGradient(0, 0, 10, 0, 0, radius);
      grad.addColorStop(0, colors[0]);
      grad.addColorStop(1, colors[1]);
      ctx.fillStyle = grad;
      ctx.fill();

      // Border line
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = '#0f172a';
      ctx.stroke();

      // Slice inner highlight
      ctx.save();
      ctx.rotate(startAngle + sliceAngle / 2);
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      
      // Emoji
      ctx.font = '22px sans-serif';
      ctx.fillText(prize.emoji, radius - 20, 0);

      // Prize title
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 13px system-ui, -apple-system, sans-serif';
      ctx.shadowColor = 'rgba(0,0,0,0.7)';
      ctx.shadowBlur = 4;
      
      const shortName = prize.grade;
      ctx.fillText(shortName, radius - 52, 0);
      ctx.restore();
    });

    ctx.restore();

    // Outer cyber glowing border
    ctx.save();
    ctx.beginPath();
    ctx.arc(center, center, radius, 0, 2 * Math.PI);
    ctx.lineWidth = 8;
    ctx.strokeStyle = '#38bdf8';
    ctx.shadowColor = '#0284c7';
    ctx.shadowBlur = 14;
    ctx.stroke();
    ctx.restore();

    // LED dots around edge
    const numDots = 24;
    for (let i = 0; i < numDots; i++) {
      const dotAngle = (i * 2 * Math.PI) / numDots;
      const x = center + (radius + 8) * Math.cos(dotAngle);
      const y = center + (radius + 8) * Math.sin(dotAngle);
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, 2 * Math.PI);
      ctx.fillStyle = i % 2 === 0 ? '#38bdf8' : '#f43f5e';
      ctx.fill();
    }

    // Center Core Hub (Metallic robot circle)
    ctx.save();
    ctx.beginPath();
    ctx.arc(center, center, 32, 0, 2 * Math.PI);
    ctx.fillStyle = '#0f172a';
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#38bdf8';
    ctx.stroke();

    // Inner glowing diode
    ctx.beginPath();
    ctx.arc(center, center, 14, 0, 2 * Math.PI);
    ctx.fillStyle = isSpinning ? '#ec4899' : '#06b6d4';
    ctx.shadowColor = isSpinning ? '#ec4899' : '#06b6d4';
    ctx.shadowBlur = 10;
    ctx.fill();
    ctx.restore();

    // Top Pointer Arrow pointing down into wheel
    ctx.save();
    ctx.translate(center, 12);
    ctx.beginPath();
    ctx.moveTo(-16, 0);
    ctx.lineTo(16, 0);
    ctx.lineTo(0, 26);
    ctx.closePath();
    ctx.fillStyle = '#f43f5e';
    ctx.shadowColor = '#f43f5e';
    ctx.shadowBlur = 10;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();
    ctx.restore();
  };

  // Initial draw and handle canvas resolution
  useEffect(() => {
    drawWheel(currentAngleRef.current);
  }, [prizes]);

  const spin = () => {
    if (isSpinning || disabled) return;
    onSpinStart();

    // Weighted random selection
    const totalWeight = prizes.reduce((acc, p) => acc + p.probabilityWeight, 0);
    let rand = Math.random() * totalWeight;
    let selectedPrize = prizes[prizes.length - 1];

    for (const prize of prizes) {
      if (rand < prize.probabilityWeight) {
        selectedPrize = prize;
        break;
      }
      rand -= prize.probabilityWeight;
    }

    const selectedIndex = prizes.findIndex((p) => p.id === selectedPrize.id);
    
    // Top pointer is at -90 degrees (or 3*PI/2) relative to standard 0-angle
    // To have slice i land under pointer at angle 3*PI/2:
    // angle + index * sliceAngle + sliceAngle / 2 = 3 * PI / 2 (mod 2*PI)
    const pointerAngle = (3 * Math.PI) / 2;
    const targetSliceMid = selectedIndex * sliceAngle + sliceAngle / 2;
    const targetAngleOffset = pointerAngle - targetSliceMid;

    // Minimum rotations for dramatic spin (e.g., 5 to 7 full circles)
    const extraRotations = (5 + Math.floor(Math.random() * 3)) * 2 * Math.PI;
    const startAngle = currentAngleRef.current;
    
    // Normalize target angle
    const targetAngle = startAngle + extraRotations + ((targetAngleOffset - (startAngle % (2 * Math.PI)) + 4 * Math.PI) % (2 * Math.PI));

    const duration = 4500; // 4.5 seconds smooth robotic spin
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Ease out cubic / quartic for realistic inertia
      const ease = 1 - Math.pow(1 - progress, 3.8);
      const currentAngle = startAngle + (targetAngle - startAngle) * ease;
      currentAngleRef.current = currentAngle;

      // Audio tick on slice crossing
      const normalizedAngle = (currentAngle % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
      const currentSlice = Math.floor(normalizedAngle / sliceAngle);
      if (currentSlice !== lastTickSliceRef.current) {
        lastTickSliceRef.current = currentSlice;
        playSpinTick();
      }

      drawWheel(currentAngle);

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(animate);
      } else {
        currentAngleRef.current = targetAngle;
        drawWheel(targetAngle);
        setHighlightPrize(selectedPrize);
        onSpinEnd(selectedPrize);
      }
    };

    animFrameRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center select-none">
      <div className="relative p-2 rounded-full bg-slate-900/90 shadow-[0_0_40px_rgba(56,189,248,0.25)] border border-cyan-500/30">
        <canvas
          ref={canvasRef}
          width={340}
          height={340}
          className="max-w-[85vw] max-h-[85vw] sm:max-w-[340px] sm:max-h-[340px] rounded-full drop-shadow-xl"
        />

        {/* Center robot badge */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none flex items-center justify-center">
          <Bot className={`w-8 h-8 text-white ${isSpinning ? 'animate-spin' : ''}`} />
        </div>
      </div>

      {/* Spin button */}
      <div className="mt-6 flex flex-col items-center">
        <button
          onClick={spin}
          disabled={isSpinning || disabled}
          className={`relative group px-8 py-3.5 rounded-2xl font-bold text-lg text-white shadow-xl transition-all duration-300 transform active:scale-95 flex items-center gap-2.5 ${
            isSpinning || disabled
              ? 'bg-slate-700/60 text-slate-400 cursor-not-allowed border border-slate-600'
              : 'bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 shadow-cyan-500/30 hover:shadow-cyan-500/50 hover:scale-105 border border-cyan-300/40'
          }`}
        >
          <Sparkles className={`w-5 h-5 ${isSpinning ? 'animate-spin text-amber-300' : 'text-cyan-200'}`} />
          <span>{isSpinning ? '로봇 코어가 회전 중...' : '행운의 뽑기 돌리기!'}</span>
        </button>
        <p className="text-xs text-slate-400 mt-2 font-medium">
          {disabled ? '참가자 정보를 먼저 입력해 주세요' : '버튼을 터치하면 K.F.C. 룰렛이 돌아갑니다!'}
        </p>
      </div>
    </div>
  );
};
