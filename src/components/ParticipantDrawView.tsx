import React, { useState, useEffect } from 'react';
import {
  DEFAULT_PRIZES,
  DEFAULT_BOOTH_ACTIVITIES,
  DrawTicket,
  PrizeItem,
  BoothSettings,
} from '../types';
import { ClawMachine } from './ClawMachine';
import { QRCodeDisplay } from './QRCodeDisplay';
import { db } from '../lib/firebase';
import { doc, setDoc, getDoc, onSnapshot } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/firestoreErrors';
import { playWinningFanfare, playRobotBeep } from '../lib/audio';
import confetti from 'canvas-confetti';
import {
  Bot,
  Sparkles,
  Gift,
  ArrowRight,
  RotateCcw,
  Cpu,
  Zap,
  CheckCircle2,
  ChevronRight,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';

export const ParticipantDrawView: React.FC = () => {
  const [existingTicket, setExistingTicket] = useState<DrawTicket | null>(null);
  const [isLoadingExisting, setIsLoadingExisting] = useState<boolean>(true);

  // Dynamic settings from Firestore
  const [prizes, setPrizes] = useState<PrizeItem[]>(DEFAULT_PRIZES);
  const [activities, setActivities] = useState<string[]>(DEFAULT_BOOTH_ACTIVITIES);

  // Form states
  const [name, setName] = useState<string>('');
  const [age, setAge] = useState<string>('');
  const [selectedActivity, setSelectedActivity] = useState<string>(DEFAULT_BOOTH_ACTIVITIES[0]);
  const [isFormSubmitted, setIsFormSubmitted] = useState<boolean>(false);

  // Spin states
  const [isSpinning, setIsSpinning] = useState<boolean>(false);
  const [currentTicket, setCurrentTicket] = useState<DrawTicket | null>(null);

  // Listen to Firestore real-time settings for prizes and activities
  useEffect(() => {
    const settingsRef = doc(db, 'settings', 'config');
    const unsubscribe = onSnapshot(
      settingsRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data() as BoothSettings;
          if (data.prizes && Array.isArray(data.prizes) && data.prizes.length >= 2) {
            setPrizes(data.prizes);
          }
          if (data.boothActivities && Array.isArray(data.boothActivities) && data.boothActivities.length > 0) {
            setActivities(data.boothActivities);
            setSelectedActivity((prev) =>
              data.boothActivities.includes(prev) ? prev : data.boothActivities[0]
            );
          }
          if (data.celebrationSoundUrl) {
            localStorage.setItem('kfc_custom_sound', data.celebrationSoundUrl);
          } else {
            localStorage.removeItem('kfc_custom_sound');
          }
        }
      },
      (error) => {
        console.warn('Settings fetch error:', error);
      }
    );

    return () => unsubscribe();
  }, []);

  // Check existing ticket from localStorage
  useEffect(() => {
    const savedTicketId = localStorage.getItem('kfc_booth_ticket_id');
    if (savedTicketId) {
      const fetchSaved = async () => {
        try {
          const snap = await getDoc(doc(db, 'tickets', savedTicketId));
          if (snap.exists()) {
            const ticketData = snap.data() as DrawTicket;
            setExistingTicket(ticketData);
            setCurrentTicket(ticketData);
          } else {
            // Ticket was deleted by admin reset
            localStorage.removeItem('kfc_booth_ticket_id');
            setExistingTicket(null);
            setCurrentTicket(null);
          }
        } catch (e) {
          console.warn('Could not load saved ticket:', e);
        } finally {
          setIsLoadingExisting(false);
        }
      };
      fetchSaved();
    } else {
      setIsLoadingExisting(false);
    }
  }, []);

  const handleStartDraw = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !age.trim()) return;
    playRobotBeep();
    setIsFormSubmitted(true);
  };

  const handleSpinEnd = async (wonPrize: PrizeItem) => {
    setIsSpinning(false);
    playWinningFanfare();

    try {
      confetti({
        particleCount: 100,
        spread: 80,
        origin: { y: 0.6 },
      });
    } catch {
      // ignore
    }

    // Generate ticket ID e.g. KFC-9821
    const randomHex = Math.random().toString(36).substring(2, 7).toUpperCase();
    const ticketId = `KFC-${randomHex}`;

    const newTicket: DrawTicket = {
      id: ticketId,
      name: name.trim(),
      age: age.trim(),
      favoriteExperience: selectedActivity,
      prizeId: wonPrize.id,
      prizeName: wonPrize.name,
      prizeGrade: wonPrize.grade,
      prizeEmoji: wonPrize.emoji,
      redeemed: false,
      createdAt: new Date().toISOString(),
      deviceId: localStorage.getItem('kfc_device_id') || `dev-${Date.now()}`,
    };

    try {
      await setDoc(doc(db, 'tickets', ticketId), newTicket);
      localStorage.setItem('kfc_booth_ticket_id', ticketId);
      setCurrentTicket(newTicket);
      setExistingTicket(newTicket);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `tickets/${ticketId}`);
    }
  };

  if (isLoadingExisting) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-cyan-400">
        <Bot className="w-12 h-12 animate-bounce mb-3 text-cyan-400" />
        <p className="text-sm font-semibold tracking-wider">K.F.C. 로봇 시스템 접속 중...</p>
      </div>
    );
  }

  // If user already has a drawn ticket, show ticket screen directly
  if (currentTicket) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between py-6 px-4">
        <div className="max-w-md mx-auto w-full space-y-4">
          {/* Top badge */}
          <div className="text-center space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 text-xs font-bold">
              <Bot className="w-3.5 h-3.5" /> 용인시청소년수련관 로봇동아리 K.F.C.
            </div>
            <h1 className="text-xl font-black text-white tracking-tight">
              🎁 부스체험 선물 수령권
            </h1>
          </div>

          {/* QR & Voucher Display */}
          <QRCodeDisplay initialTicket={currentTicket} />

          {/* Tips for booth visitors */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 text-xs text-slate-400 space-y-2">
            <div className="font-bold text-slate-300 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-cyan-400" /> 수령 안내 사항
            </div>
            <ul className="list-disc list-inside space-y-1 text-slate-400">
              <li>부스 운영진에게 위 화면의 <strong className="text-white">QR 코드</strong>를 보여주시면 확인 후 선물을 드립니다.</li>
              <li>1인 1회 한정이며, 선물 수령 처리 후에는 재참여 또는 재수령이 불가능합니다.</li>
              <li>화면을 닫아도 나중에 같은 폰으로 접속 시 수령권이 유지됩니다.</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <footer className="text-center text-[11px] text-slate-600 mt-6">
          © 2026 Yongin Youth Center Robot Club K.F.C.
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-100 flex flex-col justify-between py-6 px-4">
      <div className="max-w-md mx-auto w-full space-y-6">
        {/* Header Hero */}
        <header className="text-center space-y-2 pt-2">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-cyan-950/80 border border-cyan-400/40 text-cyan-300 text-xs font-extrabold shadow-[0_0_15px_rgba(6,182,212,0.3)]">
            <Cpu className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
            <span>용인시청소년수련관 로봇동아리 K.F.C.</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-snug">
            부스 체험 완료! <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-300 to-indigo-400">
              행운의 로봇 선물 뽑기
            </span>
          </h1>

          <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
            K.F.C. 동아리 부스를 체험해 주셔서 감사합니다! <br />
            아래 정보를 입력하고 로봇 인형뽑기 집게를 조작해 선물을 받아가세요!
          </p>
        </header>

        {/* Step 1: Input Form */}
        {!isFormSubmitted ? (
          <div className="bg-slate-900/90 border border-cyan-500/30 rounded-3xl p-6 shadow-2xl backdrop-blur-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-28 h-28 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />

            <form onSubmit={handleStartDraw} className="space-y-4 relative z-10">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  참가자 이름 <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  maxLength={20}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="예: 김민우"
                  className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-cyan-400 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  나이 또는 학년 <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  maxLength={20}
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  placeholder="예: 초등 5학년 / 16세 / 중3"
                  className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-cyan-400 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-2">
                  가장 재미있었던 부스 체험은?
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {activities.map((act) => (
                    <button
                      type="button"
                      key={act}
                      onClick={() => setSelectedActivity(act)}
                      className={`text-left p-2.5 rounded-xl text-xs font-semibold transition border ${
                        selectedActivity === act
                          ? 'bg-cyan-950/80 border-cyan-400 text-cyan-200 shadow-sm'
                          : 'bg-slate-800/60 border-slate-700/60 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {act}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={!name.trim() || !age.trim()}
                className="w-full mt-4 py-3.5 px-4 rounded-xl font-bold text-base bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white shadow-lg shadow-cyan-500/25 flex items-center justify-center gap-2 transition transform active:scale-95"
              >
                <span>뽑기 화면으로 이동</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>
        ) : (
          /* Step 2: Interactive Robot Claw Machine */
          <div className="bg-slate-900/80 border border-cyan-500/30 rounded-3xl p-4 shadow-2xl backdrop-blur-sm flex flex-col items-center">
            {/* Participant quick info strip */}
            <div className="w-full flex items-center justify-between text-xs text-slate-300 bg-slate-800/80 px-4 py-2 rounded-xl mb-4 border border-slate-700/60">
              <div className="flex items-center gap-1.5 font-bold text-white">
                <span className="text-cyan-400">{name}</span>님 ({age})
              </div>
              <button
                onClick={() => setIsFormSubmitted(false)}
                disabled={isSpinning}
                className="text-[11px] text-slate-400 hover:text-slate-200 underline"
              >
                정보 수정
              </button>
            </div>

            {/* The Claw Machine */}
            <ClawMachine
              prizes={prizes}
              isDrawing={isSpinning}
              onDrawStart={() => setIsSpinning(true)}
              onDrawEnd={handleSpinEnd}
            />
          </div>
        )}

        {/* Prize Pool Preview Modal / Cards */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
          <div className="text-xs font-bold text-slate-300 mb-3 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Gift className="w-4 h-4 text-cyan-400" /> K.F.C. 부스 선물 목록
            </span>
            <span className="text-[11px] text-slate-500">100% 당첨 보장</span>
          </div>
          <div className="space-y-2">
            {prizes.map((prize) => (
              <div
                key={prize.id}
                className="flex items-center justify-between p-2 rounded-xl bg-slate-800/40 border border-slate-700/40 text-xs"
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">{prize.emoji}</span>
                  <div>
                    <div className="font-bold text-white">{prize.grade}</div>
                    <div className="text-[11px] text-slate-400">{prize.name}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <footer className="text-center text-[11px] text-slate-600 mt-6">
        © 2026 용인시청소년수련관 K.F.C. Robot Club. All rights reserved.
      </footer>
    </div>
  );
};
