import React, { useState, useEffect, useRef } from 'react';
import { PrizeItem } from '../types';
import {
  playCoinInsert,
  playClawMotor,
  playClawDrop,
  playClawGrab,
  playChuteDrop,
} from '../lib/audio';
import { Bot, Sparkles, ArrowLeft, ArrowRight, Play, Gift } from 'lucide-react';

interface ClawMachineProps {
  prizes: PrizeItem[];
  isDrawing: boolean;
  onDrawStart: () => void;
  onDrawEnd: (wonPrize: PrizeItem) => void;
  disabled?: boolean;
}

type ClawStage =
  | 'idle'
  | 'targeting'
  | 'dropping'
  | 'grabbing'
  | 'lifting'
  | 'moving_to_chute'
  | 'releasing'
  | 'revealing';

export const ClawMachine: React.FC<ClawMachineProps> = ({
  prizes,
  isDrawing,
  onDrawStart,
  onDrawEnd,
  disabled = false,
}) => {
  const [clawStage, setClawStage] = useState<ClawStage>('idle');
  const [clawX, setClawX] = useState<number>(50); // percentage 20% to 80%
  const [clawY, setClawY] = useState<number>(15); // percentage 15% (top) to 75% (bottom pile)
  const [isClawClosed, setIsClawClosed] = useState<boolean>(false);
  const [grabbedPrize, setGrabbedPrize] = useState<PrizeItem | null>(null);
  const [revealedCapsule, setRevealedCapsule] = useState<boolean>(false);

  // Decorative capsules scattered on the floor
  const capsuleHeap = useRef([
    { x: 22, y: 76, color: '#8b5cf6', emoji: '🤖', size: 36, rot: -15 },
    { x: 38, y: 78, color: '#06b6d4', emoji: '⚙️', size: 38, rot: 10 },
    { x: 52, y: 75, color: '#10b981', emoji: '🍫', size: 34, rot: 25 },
    { x: 68, y: 77, color: '#f59e0b', emoji: '⚡', size: 36, rot: -8 },
    { x: 80, y: 79, color: '#ec4899', emoji: '🍬', size: 32, rot: 18 },
    { x: 30, y: 83, color: '#ec4899', emoji: '🍬', size: 34, rot: -20 },
    { x: 45, y: 84, color: '#38bdf8', emoji: '🦾', size: 38, rot: 5 },
    { x: 60, y: 82, color: '#a855f7', emoji: '🤖', size: 36, rot: -12 },
    { x: 74, y: 85, color: '#10b981', emoji: '🍫', size: 32, rot: 30 },
  ]).current;

  // Move claw left or right
  const moveClaw = (direction: 'left' | 'right') => {
    if (clawStage !== 'idle' || isDrawing || disabled) return;
    playClawMotor();
    setClawX((prev) => {
      const step = 8;
      if (direction === 'left') return Math.max(22, prev - step);
      return Math.min(78, prev + step);
    });
  };

  // Start the Claw Catch sequence
  const startCatch = () => {
    if (clawStage !== 'idle' || isDrawing || disabled) return;

    onDrawStart();
    playCoinInsert();
    setClawStage('targeting');
    setRevealedCapsule(false);

    // Pick prize using probability weights
    const totalWeight = prizes.reduce((acc, p) => acc + (p.probabilityWeight || 0), 0);
    let rand = Math.random() * totalWeight;
    let selectedPrize = prizes[prizes.length - 1];

    for (const prize of prizes) {
      if (rand < prize.probabilityWeight) {
        selectedPrize = prize;
        break;
      }
      rand -= prize.probabilityWeight;
    }
    setGrabbedPrize(selectedPrize);

    // Sequence timing
    // 1. Move claw slightly into target position (1s)
    setTimeout(() => {
      setClawStage('dropping');
      playClawDrop();
      setClawY(74); // Plunge down into heap
    }, 800);

    // 2. Clamp claw fingers onto capsule (1.4s after drop)
    setTimeout(() => {
      setClawStage('grabbing');
      playClawGrab();
      setIsClawClosed(true);
    }, 2100);

    // 3. Winch up with capsule (1.2s after grab)
    setTimeout(() => {
      setClawStage('lifting');
      setClawY(18); // Lift back to top
    }, 3200);

    // 4. Move over to the drop chute on the left (at 12%)
    setTimeout(() => {
      setClawStage('moving_to_chute');
      playClawMotor();
      setClawX(12); // Above chute
    }, 4500);

    // 5. Open claw and drop capsule down chute
    setTimeout(() => {
      setClawStage('releasing');
      setIsClawClosed(false);
      playChuteDrop();
    }, 5800);

    // 6. Capsule drops into tray and cracks open
    setTimeout(() => {
      setClawStage('revealing');
      setRevealedCapsule(true);
      setTimeout(() => {
        onDrawEnd(selectedPrize);
      }, 1200);
    }, 6600);
  };

  return (
    <div className="flex flex-col items-center justify-center w-full max-w-sm mx-auto select-none">
      {/* Claw Machine Arcade Cabinet */}
      <div className="relative w-full rounded-3xl overflow-hidden bg-slate-900 border-2 border-cyan-400/50 shadow-[0_0_50px_rgba(6,182,212,0.25)] flex flex-col">
        {/* Top Marquee Header */}
        <div className="bg-gradient-to-r from-cyan-600 via-indigo-600 to-purple-600 px-4 py-3 border-b-2 border-cyan-400/40 flex items-center justify-between shadow-inner">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-lg bg-black/30 text-cyan-300">
              <Bot className="w-5 h-5 animate-pulse" />
            </span>
            <div>
              <div className="text-[10px] font-black text-cyan-200 tracking-wider">
                용인시청소년수련관 K.F.C.
              </div>
              <div className="text-sm font-black text-white tracking-wide flex items-center gap-1">
                <span>로봇 인형 & 캡슐 뽑기</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping ml-1" />
              </div>
            </div>
          </div>
          <div className="px-2.5 py-1 rounded-full bg-black/40 border border-cyan-300/30 text-[10px] font-mono font-bold text-cyan-300">
            {clawStage === 'idle' ? 'INSERT 1 COIN' : 'PLAYING...'}
          </div>
        </div>

        {/* Glass Showcase Chamber */}
        <div className="relative w-full h-72 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 overflow-hidden border-b-2 border-slate-800">
          {/* Glass reflection gloss overlay */}
          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-cyan-500/5 to-white/10 pointer-events-none z-20" />

          {/* Grid neon background inside cabinet */}
          <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:16px_16px]" />

          {/* Overhead Horizontal Crane Rail */}
          <div className="absolute top-2 inset-x-3 h-2.5 bg-slate-800 border border-slate-700 rounded-full z-10 shadow-md">
            {/* Sliding carriage */}
            <div
              className="absolute top-1/2 -translate-y-1/2 w-8 h-4 bg-cyan-400 rounded border border-white/60 shadow-[0_0_10px_#22d3ee] transition-all duration-500 ease-out -translate-x-1/2"
              style={{ left: `${clawX}%` }}
            />
          </div>

          {/* Prize Drop Chute on bottom left */}
          <div className="absolute bottom-0 left-2 w-16 h-28 border-r-2 border-t-2 border-dashed border-cyan-500/40 bg-slate-950/60 rounded-tr-2xl flex flex-col items-center justify-end pb-2 z-10">
            <div className="text-[9px] font-black text-cyan-400 tracking-tighter leading-tight text-center">
              선물 배출구 <br />
              <span className="text-xs">⬇</span>
            </div>
            {/* Chute sensor light */}
            <div
              className={`w-3 h-3 rounded-full mt-1 ${
                clawStage === 'releasing' || clawStage === 'revealing'
                  ? 'bg-emerald-400 animate-ping shadow-[0_0_12px_#34d399]'
                  : 'bg-slate-700'
              }`}
            />
          </div>

          {/* The Claw Mechanism Assembly */}
          <div
            className="absolute z-15 -translate-x-1/2 flex flex-col items-center transition-all duration-700 ease-in-out pointer-events-none"
            style={{
              left: `${clawX}%`,
              top: 14,
              height: `${clawY}%`,
            }}
          >
            {/* Steel Winch Cable */}
            <div className="w-0.5 bg-gradient-to-b from-cyan-300 via-slate-400 to-slate-200 h-full shadow-[0_0_6px_rgba(56,189,248,0.5)]" />

            {/* Claw Base Hub */}
            <div className="relative -mt-1 w-7 h-5 bg-gradient-to-b from-slate-700 to-slate-900 border border-cyan-400 rounded-md flex items-center justify-center shadow-lg">
              <div
                className={`w-2 h-2 rounded-full ${
                  isClawClosed ? 'bg-rose-400 animate-pulse' : 'bg-cyan-400'
                }`}
              />
            </div>

            {/* 3 Mechanical Fingers */}
            <div className="relative -mt-0.5 w-12 h-8 flex justify-center items-start">
              {/* Left finger */}
              <div
                className={`w-1.5 h-6 bg-cyan-300 rounded-full origin-top transition-transform duration-300 shadow-md ${
                  isClawClosed ? 'rotate-20 translate-x-2' : '-rotate-35 -translate-x-1'
                }`}
              />
              {/* Center finger */}
              <div
                className={`w-1.5 h-7 bg-cyan-400 rounded-full origin-top transition-transform duration-300 mx-1 shadow-md ${
                  isClawClosed ? 'scale-y-105' : 'scale-y-90'
                }`}
              />
              {/* Right finger */}
              <div
                className={`w-1.5 h-6 bg-cyan-300 rounded-full origin-top transition-transform duration-300 shadow-md ${
                  isClawClosed ? '-rotate-20 -translate-x-2' : 'rotate-35 translate-x-1'
                }`}
              />

              {/* Grabbed Mystery Capsule attached to claw */}
              {isClawClosed && grabbedPrize && clawStage !== 'releasing' && clawStage !== 'revealing' && (
                <div className="absolute top-4 w-9 h-9 rounded-full bg-gradient-to-br from-cyan-300 via-indigo-400 to-purple-500 border-2 border-white shadow-[0_0_15px_rgba(255,255,255,0.8)] flex items-center justify-center text-sm animate-bounce">
                  <span>{grabbedPrize.emoji || '🎁'}</span>
                </div>
              )}
            </div>
          </div>

          {/* Heap of Capsules at the bottom of the chamber */}
          <div className="absolute inset-x-0 bottom-0 h-20 pointer-events-none">
            {capsuleHeap.map((cap, i) => (
              <div
                key={i}
                className="absolute rounded-full border border-white/40 shadow-md flex items-center justify-center text-xs backdrop-blur-[1px] transform transition-transform"
                style={{
                  left: `${cap.x}%`,
                  bottom: `${100 - cap.y}%`,
                  width: `${cap.size}px`,
                  height: `${cap.size}px`,
                  backgroundColor: cap.color,
                  transform: `rotate(${cap.rot}deg)`,
                }}
              >
                <div className="opacity-80 scale-90">{cap.emoji}</div>
              </div>
            ))}
          </div>

          {/* Falling capsule in chute animation */}
          {clawStage === 'releasing' && grabbedPrize && (
            <div className="absolute left-[12%] top-20 w-9 h-9 rounded-full bg-gradient-to-br from-amber-300 to-pink-500 border-2 border-white shadow-xl flex items-center justify-center text-sm animate-bounce z-25 -translate-x-1/2">
              <span>{grabbedPrize.emoji}</span>
            </div>
          )}
        </div>

        {/* Lower Cabinet: Arcade Controls & Prize Retrieval Tray */}
        <div className="p-4 bg-slate-950 flex flex-col items-center gap-3">
          {/* Status text display */}
          <div className="w-full py-1.5 px-3 rounded-xl bg-slate-900 border border-slate-800 text-center text-xs font-mono">
            {clawStage === 'idle' && (
              <span className="text-cyan-300 font-bold">좌우 버튼으로 조준 후 [뽑기]를 누르세요!</span>
            )}
            {clawStage === 'targeting' && (
              <span className="text-amber-300 font-bold">크레인 목표 지점 정렬 중...</span>
            )}
            {clawStage === 'dropping' && (
              <span className="text-cyan-400 font-bold">집게가 하강합니다! ⬇️</span>
            )}
            {clawStage === 'grabbing' && (
              <span className="text-pink-400 font-bold">선물 캡슐을 단단히 잡았습니다! 🦾</span>
            )}
            {clawStage === 'lifting' && (
              <span className="text-emerald-400 font-bold">조심스럽게 인양 중... ⬆️</span>
            )}
            {clawStage === 'moving_to_chute' && (
              <span className="text-purple-400 font-bold">배출구로 이동 중... 🚚</span>
            )}
            {clawStage === 'releasing' && (
              <span className="text-amber-400 font-bold">배출구로 낙하! 🎁</span>
            )}
            {clawStage === 'revealing' && (
              <span className="text-emerald-300 font-bold animate-pulse">
                🎉 축하합니다! 선물 캡슐이 나왔습니다!
              </span>
            )}
          </div>

          {/* Arcade Controls Row */}
          <div className="w-full flex items-center justify-between gap-2">
            {/* Left/Right directional buttons */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => moveClaw('left')}
                disabled={clawStage !== 'idle' || isDrawing || disabled}
                className="w-12 h-12 rounded-2xl bg-slate-800 hover:bg-slate-700 active:bg-cyan-600 disabled:opacity-40 disabled:cursor-not-allowed border border-slate-700 text-white flex items-center justify-center shadow-lg transition active:scale-90"
                title="크레인 왼쪽으로 이동"
              >
                <ArrowLeft className="w-5 h-5 text-cyan-400" />
              </button>

              <button
                type="button"
                onClick={() => moveClaw('right')}
                disabled={clawStage !== 'idle' || isDrawing || disabled}
                className="w-12 h-12 rounded-2xl bg-slate-800 hover:bg-slate-700 active:bg-cyan-600 disabled:opacity-40 disabled:cursor-not-allowed border border-slate-700 text-white flex items-center justify-center shadow-lg transition active:scale-90"
                title="크레인 오른쪽으로 이동"
              >
                <ArrowRight className="w-5 h-5 text-cyan-400" />
              </button>
            </div>

            {/* Big Shiny Arcade Grab Button */}
            <button
              type="button"
              onClick={startCatch}
              disabled={clawStage !== 'idle' || isDrawing || disabled}
              className={`flex-1 py-3.5 px-4 rounded-2xl font-black text-sm text-white shadow-xl transition transform active:scale-95 flex items-center justify-center gap-2 ${
                clawStage !== 'idle' || isDrawing || disabled
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                  : 'bg-gradient-to-r from-rose-500 via-pink-600 to-indigo-600 hover:from-rose-400 hover:to-indigo-500 shadow-rose-500/30 hover:shadow-rose-500/50 hover:scale-[1.02] border border-rose-400/40 animate-pulse'
              }`}
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>{clawStage === 'idle' ? '집게 투하 & 잡기!' : '인형 뽑는 중...'}</span>
            </button>
          </div>

          {/* Bottom Prize Retrieval Tray */}
          <div className="w-full mt-1 p-3 rounded-2xl bg-slate-900 border-2 border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <Gift className="w-4 h-4 text-cyan-400" />
              <span>선물 수령구 (PRIZE TRAY)</span>
            </div>
            {revealedCapsule && grabbedPrize ? (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40 animate-bounce">
                <span>{grabbedPrize.emoji}</span>
                <span>{grabbedPrize.grade} 획득!</span>
              </div>
            ) : (
              <span className="text-[11px] text-slate-500">배출 대기 중</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
