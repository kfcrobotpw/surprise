import React, { useEffect, useState, useRef } from 'react';
import QRCode from 'qrcode';
import { DrawTicket } from '../types';
import { db } from '../lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/firestoreErrors';
import { CheckCircle2, Clock, ShieldCheck, Sparkles, Award, User, RefreshCw } from 'lucide-react';
import confetti from 'canvas-confetti';

interface QRCodeDisplayProps {
  initialTicket: DrawTicket;
  onRefresh?: () => void;
}

export const QRCodeDisplay: React.FC<QRCodeDisplayProps> = ({ initialTicket }) => {
  const [ticket, setTicket] = useState<DrawTicket>(initialTicket);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [justRedeemed, setJustRedeemed] = useState<boolean>(false);
  const wasRedeemedRef = useRef<boolean>(initialTicket.redeemed);

  // Generate QR code data URL
  useEffect(() => {
    // Generate QR payload containing ticket ID and verification token
    const payload = JSON.stringify({
      kfc: 'robot_booth',
      id: ticket.id,
      name: ticket.name,
      prize: ticket.prizeName,
    });

    QRCode.toDataURL(payload, {
      width: 280,
      margin: 1.5,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'H',
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error('Failed to generate QR code', err));
  }, [ticket.id, ticket.name, ticket.prizeName]);

  // Real-time listener for ticket redemption status
  useEffect(() => {
    const ticketRef = doc(db, 'tickets', ticket.id);
    const unsubscribe = onSnapshot(
      ticketRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const updated = docSnap.data() as DrawTicket;
          setTicket(updated);

          // If was unredeemed and just became redeemed, celebrate!
          if (!wasRedeemedRef.current && updated.redeemed) {
            wasRedeemedRef.current = true;
            setJustRedeemed(true);
            try {
              confetti({
                particleCount: 80,
                spread: 70,
                origin: { y: 0.6 },
              });
            } catch {
              // ignore
            }
          }
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, `tickets/${ticket.id}`);
      }
    );

    return () => unsubscribe();
  }, [ticket.id]);

  const formattedDate = new Date(ticket.createdAt).toLocaleString('ko-KR', {
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="w-full max-w-sm mx-auto">
      {/* Voucher card */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-b from-slate-900 via-slate-900/95 to-slate-950 border border-cyan-500/30 shadow-[0_0_50px_rgba(6,182,212,0.15)]">
        {/* Top header glow banner */}
        <div className="bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 px-5 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{ticket.prizeEmoji || '🤖'}</span>
            <div>
              <div className="text-[11px] font-bold tracking-wider uppercase text-cyan-200">
                용인시청소년수련관 로봇동아리 K.F.C.
              </div>
              <div className="text-sm font-extrabold tracking-tight">체험부스 선물 수령권</div>
            </div>
          </div>
          <div className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-white/20 backdrop-blur-md">
            {ticket.prizeGrade}
          </div>
        </div>

        {/* Content body */}
        <div className="p-6 flex flex-col items-center text-center">
          {/* Won Prize showcase */}
          <div className="mb-4 w-full p-4 rounded-2xl bg-cyan-950/40 border border-cyan-500/30">
            <div className="text-xs font-semibold text-cyan-400 mb-1 flex items-center justify-center gap-1">
              <Award className="w-3.5 h-3.5" /> 당첨 결과
            </div>
            <div className="text-lg font-black text-white leading-tight break-keep">
              {ticket.prizeName}
            </div>
          </div>

          {/* Participant info pill */}
          <div className="flex items-center gap-2 text-xs text-slate-300 bg-slate-800/60 px-3.5 py-1.5 rounded-full mb-5 border border-slate-700/60">
            <User className="w-3.5 h-3.5 text-cyan-400" />
            <span className="font-semibold text-white">{ticket.name}</span>
            <span className="text-slate-400">({ticket.age})</span>
            {ticket.favoriteExperience && (
              <span className="text-cyan-300 font-medium border-l border-slate-600 pl-2">
                {ticket.favoriteExperience}
              </span>
            )}
          </div>

          {/* QR Code Container */}
          <div className="relative p-3 rounded-2xl bg-white shadow-2xl border-4 border-slate-800 group">
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt="수령 검증 QR 코드"
                className="w-48 h-48 rounded-lg object-contain"
              />
            ) : (
              <div className="w-48 h-48 flex items-center justify-center text-slate-400 text-xs">
                QR 코드 생성 중...
              </div>
            )}

            {/* If redeemed, show overlay stamp */}
            {ticket.redeemed && (
              <div className="absolute inset-0 bg-slate-900/85 backdrop-blur-[2px] rounded-xl flex flex-col items-center justify-center p-3 text-emerald-400 animate-in fade-in zoom-in-95 duration-300">
                <CheckCircle2 className="w-16 h-16 text-emerald-400 mb-2 drop-shadow-[0_0_12px_rgba(52,211,153,0.8)]" />
                <span className="font-black text-lg text-emerald-300 tracking-wider">
                  수령 완료
                </span>
                <span className="text-[11px] text-slate-300 mt-1">
                  선물이 이미 지급되었습니다!
                </span>
              </div>
            )}
          </div>

          {/* Ticket ID display */}
          <div className="mt-3 font-mono text-[11px] text-slate-400 tracking-wider">
            NO. <span className="text-cyan-400 font-bold">{ticket.id}</span>
          </div>

          {/* Status Box */}
          <div className="mt-4 w-full">
            {ticket.redeemed ? (
              <div className="p-3.5 rounded-2xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs flex flex-col items-center gap-1.5">
                <div className="flex items-center gap-1.5 font-bold text-sm text-emerald-400">
                  <ShieldCheck className="w-4 h-4" /> 선물 수령이 확인되었습니다!
                </div>
                <div className="text-[11px] text-emerald-200/80">
                  맛있게 드시고 K.F.C. 동아리 부스를 찾아주셔서 감사합니다!
                </div>
                {ticket.redeemedAt && (
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    수령 시각:{' '}
                    {new Date(ticket.redeemedAt).toLocaleTimeString('ko-KR', {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })}
                  </div>
                )}
              </div>
            ) : (
              <div className="p-3.5 rounded-2xl bg-amber-950/40 border border-amber-500/40 text-amber-200 text-xs flex flex-col items-center gap-1.5 animate-pulse">
                <div className="flex items-center gap-1.5 font-bold text-sm text-amber-400">
                  <Clock className="w-4 h-4" /> 부스 운영진에게 보여주세요!
                </div>
                <div className="text-[11px] text-amber-200/90 leading-tight">
                  운영진이 이 화면의 QR을 스캔하면 맛있는 선물을 전달해 드립니다.
                </div>
              </div>
            )}
          </div>

          {/* Bottom info */}
          <div className="mt-4 text-[11px] text-slate-400">
            참여일시: {formattedDate}
          </div>
        </div>

        {/* Notched perforated line decorative */}
        <div className="relative border-t border-dashed border-slate-700/80 py-3 px-5 bg-slate-950/70 flex items-center justify-between text-[11px] text-slate-400">
          <span>🤖 용인시청소년수련관 K.F.C.</span>
          <span className="text-cyan-400 font-medium">1인 1회 한정 수령</span>
        </div>
      </div>

      {justRedeemed && (
        <div className="mt-4 p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 text-center text-xs animate-bounce">
          🎉 축하합니다! 방금 부스에서 선물 지급이 정상 확인되었습니다.
        </div>
      )}
    </div>
  );
};
