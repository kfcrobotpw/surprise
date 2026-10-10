import React, { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import { db } from '../lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/firestoreErrors';
import { DrawTicket } from '../types';
import { playScanSuccess, playWarningBuzzer } from '../lib/audio';
import {
  X,
  Camera,
  AlertTriangle,
  CheckCircle,
  ShieldAlert,
  Gift,
  RefreshCw,
  Search,
  User,
  Clock,
  Sparkles,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  staffName?: string;
  onTicketRedeemed?: (ticket: DrawTicket) => void;
}

export const QRScannerModal: React.FC<QRScannerModalProps> = ({
  isOpen,
  onClose,
  staffName = 'K.F.C. 운영진',
  onTicketRedeemed,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState<string>('');
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [scannedTicket, setScannedTicket] = useState<DrawTicket | null>(null);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [isUpdatingRedemption, setIsUpdatingRedemption] = useState<boolean>(false);
  const [justSuccessRedeemed, setJustSuccessRedeemed] = useState<boolean>(false);

  // Start camera stream
  const startCamera = async () => {
    setCameraError(null);
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
        scanFrame();
      }
    } catch (err: unknown) {
      console.warn('Camera access issue:', err);
      setCameraError('카메라를 열 수 없습니다. 카메라 권한을 확인하거나 아래에 티켓 번호를 직접 입력해 주세요.');
    }
  };

  // Stop camera stream
  const stopCamera = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
      setScannedTicket(null);
      setVerificationError(null);
      setJustSuccessRedeemed(false);
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, facingMode]);

  // Frame scanning loop using jsQR
  const scanFrame = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });

      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'dontInvert',
        });

        if (code && code.data && !isVerifying && !scannedTicket) {
          handleQRCodeFound(code.data);
          return;
        }
      }
    }

    if (!scannedTicket) {
      animationFrameRef.current = requestAnimationFrame(scanFrame);
    }
  };

  // Parse QR content and verify against Firestore
  const handleQRCodeFound = (qrData: string) => {
    let ticketId = qrData.trim();

    try {
      // Check if it's JSON formatted { id, ... }
      if (ticketId.startsWith('{')) {
        const parsed = JSON.parse(ticketId);
        if (parsed.id) {
          ticketId = parsed.id;
        }
      }
    } catch {
      // Use raw string if not JSON
    }

    verifyTicketById(ticketId);
  };

  const verifyTicketById = async (id: string) => {
    const cleanId = id.trim();
    if (!cleanId) return;

    setIsVerifying(true);
    setVerificationError(null);

    try {
      const ticketRef = doc(db, 'tickets', cleanId);
      const snap = await getDoc(ticketRef);

      if (!snap.exists()) {
        playWarningBuzzer();
        setVerificationError(`존재하지 않거나 잘못된 티켓 번호입니다. (${cleanId})`);
        setIsVerifying(false);
        return;
      }

      const ticketData = snap.data() as DrawTicket;
      setScannedTicket(ticketData);

      if (ticketData.redeemed) {
        // Warning sound for already redeemed ticket
        playWarningBuzzer();
      } else {
        // Soft alert sound for found valid ticket
        playScanSuccess();
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, `tickets/${cleanId}`);
    } finally {
      setIsVerifying(false);
    }
  };

  // Confirm redemption in Firestore
  const handleConfirmRedeem = async () => {
    if (!scannedTicket || scannedTicket.redeemed || isUpdatingRedemption) return;

    setIsUpdatingRedemption(true);
    try {
      const ticketRef = doc(db, 'tickets', scannedTicket.id);
      const nowIso = new Date().toISOString();

      await updateDoc(ticketRef, {
        redeemed: true,
        redeemedAt: nowIso,
        redeemedBy: staffName,
      });

      const updated: DrawTicket = {
        ...scannedTicket,
        redeemed: true,
        redeemedAt: nowIso,
        redeemedBy: staffName,
      };

      setScannedTicket(updated);
      setJustSuccessRedeemed(true);
      playScanSuccess();

      try {
        confetti({
          particleCount: 70,
          spread: 60,
          origin: { y: 0.5 },
        });
      } catch {
        // ignore
      }

      if (onTicketRedeemed) {
        onTicketRedeemed(updated);
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `tickets/${scannedTicket.id}`);
    } finally {
      setIsUpdatingRedemption(false);
    }
  };

  const resetScannerForNext = () => {
    setScannedTicket(null);
    setVerificationError(null);
    setJustSuccessRedeemed(false);
    setManualCode('');
    scanFrame();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="relative w-full max-w-md bg-slate-900 border border-cyan-500/30 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 bg-slate-800/80 border-b border-slate-700/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-cyan-500/20 text-cyan-400 rounded-xl">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">선물 수령 QR 스캔 검증</h3>
              <p className="text-xs text-slate-400">부스 관리자: {staffName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-700 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body content */}
        <div className="p-5 overflow-y-auto flex-1 flex flex-col items-center">
          {/* If a ticket was scanned/found */}
          {scannedTicket ? (
            <div className="w-full space-y-4">
              {scannedTicket.redeemed ? (
                /* ALREADY REDEEMED WARNING */
                <div className="p-5 rounded-2xl bg-rose-950/50 border-2 border-rose-500/80 text-rose-200 animate-in fade-in zoom-in-95">
                  <div className="flex items-center gap-3 text-rose-400 font-black text-lg mb-2">
                    <ShieldAlert className="w-7 h-7 text-rose-500 animate-bounce" />
                    <span>⚠️ 이미 수령 완료된 티켓입니다!</span>
                  </div>
                  <p className="text-sm font-semibold text-rose-300 mb-3 leading-snug">
                    이 참가자는 이미 선물을 수령했습니다. 중복 지급이 차단되었습니다!
                  </p>

                  <div className="bg-slate-900/80 rounded-xl p-3.5 space-y-2 text-xs border border-rose-500/30 text-slate-300">
                    <div className="flex justify-between">
                      <span className="text-slate-400">참가자:</span>
                      <span className="font-bold text-white">
                        {scannedTicket.name} ({scannedTicket.age})
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">당첨 상품:</span>
                      <span className="font-bold text-cyan-300">{scannedTicket.prizeName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">수령 시각:</span>
                      <span className="font-bold text-rose-300">
                        {scannedTicket.redeemedAt
                          ? new Date(scannedTicket.redeemedAt).toLocaleString('ko-KR')
                          : '기록 없음'}
                      </span>
                    </div>
                    {scannedTicket.redeemedBy && (
                      <div className="flex justify-between">
                        <span className="text-slate-400">지급 담당자:</span>
                        <span className="text-white">{scannedTicket.redeemedBy}</span>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* VALID & UNREDEEMED - CAN HAND OVER PRIZE */
                <div className="p-5 rounded-2xl bg-emerald-950/40 border-2 border-emerald-500/80 text-emerald-100 animate-in fade-in zoom-in-95">
                  <div className="flex items-center gap-2.5 text-emerald-400 font-extrabold text-lg mb-1">
                    <CheckCircle className="w-6 h-6 text-emerald-400" />
                    <span>정상 수령권 확인!</span>
                  </div>
                  <p className="text-xs text-emerald-200/90 mb-4">
                    아직 선물을 수령하지 않은 정상 티켓입니다. 아래 선물을 지급해 주세요.
                  </p>

                  {/* Prize Highlight Box */}
                  <div className="p-4 rounded-xl bg-gradient-to-r from-cyan-900/40 via-blue-900/40 to-slate-900 border border-cyan-400/40 mb-4 text-center">
                    <div className="text-3xl mb-1">{scannedTicket.prizeEmoji || '🎁'}</div>
                    <div className="text-xs font-bold text-cyan-300 uppercase tracking-wider">
                      {scannedTicket.prizeGrade}
                    </div>
                    <div className="text-lg font-black text-white mt-0.5 break-keep">
                      {scannedTicket.prizeName}
                    </div>
                  </div>

                  {/* Participant details */}
                  <div className="bg-slate-900/80 rounded-xl p-3.5 space-y-1.5 text-xs border border-emerald-500/30 text-slate-300 mb-4">
                    <div className="flex justify-between">
                      <span className="text-slate-400">참가자 성명:</span>
                      <span className="font-bold text-white">{scannedTicket.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">나이 / 학년:</span>
                      <span className="font-semibold text-white">{scannedTicket.age}</span>
                    </div>
                    {scannedTicket.favoriteExperience && (
                      <div className="flex justify-between">
                        <span className="text-slate-400">체험 소감:</span>
                        <span className="text-cyan-200">{scannedTicket.favoriteExperience}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-slate-400">티켓 고유번호:</span>
                      <span className="font-mono text-cyan-300">{scannedTicket.id}</span>
                    </div>
                  </div>

                  {/* Confirm Redemption Button */}
                  <button
                    onClick={handleConfirmRedeem}
                    disabled={isUpdatingRedemption}
                    className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-extrabold text-base shadow-lg shadow-emerald-500/30 transition transform active:scale-95 flex items-center justify-center gap-2"
                  >
                    <Gift className="w-5 h-5" />
                    <span>{isUpdatingRedemption ? '수령 처리 중...' : '선물 지급 완료 확인!'}</span>
                  </button>
                </div>
              )}

              {/* Action buttons after viewing ticket */}
              <div className="flex gap-2 pt-2">
                <button
                  onClick={resetScannerForNext}
                  className="flex-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm border border-slate-700 transition flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>다음 QR 스캔하기</span>
                </button>
                <button
                  onClick={onClose}
                  className="px-4 py-3 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-white text-sm font-semibold transition"
                >
                  닫기
                </button>
              </div>
            </div>
          ) : (
            /* CAMERA SCANNER VIEW */
            <div className="w-full flex flex-col items-center">
              {/* Camera Video Viewport */}
              <div className="relative w-full aspect-square max-w-[280px] bg-black rounded-2xl overflow-hidden border-2 border-cyan-500/50 shadow-inner flex items-center justify-center">
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  autoPlay
                  playsInline
                  muted
                />
                <canvas ref={canvasRef} className="hidden" />

                {/* Laser scan line overlay */}
                <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                  <div className="w-44 h-44 border-2 border-cyan-400/80 rounded-xl relative">
                    <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-cyan-300" />
                    <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-cyan-300" />
                    <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-cyan-300" />
                    <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-cyan-300" />
                    <div className="absolute inset-x-0 h-0.5 bg-cyan-400 shadow-[0_0_8px_#22d3ee] animate-pulse top-1/2 -translate-y-1/2" />
                  </div>
                </div>

                {isVerifying && (
                  <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm flex flex-col items-center justify-center text-cyan-300 text-xs font-bold gap-2">
                    <RefreshCw className="w-6 h-6 animate-spin" />
                    <span>티켓 검증 중...</span>
                  </div>
                )}
              </div>

              {/* Camera flip button */}
              <div className="mt-3 flex items-center gap-3">
                <button
                  onClick={() =>
                    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'))
                  }
                  className="text-xs text-slate-400 hover:text-white px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60 flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>카메라 전환 ({facingMode === 'environment' ? '후면' : '전면'})</span>
                </button>
              </div>

              {cameraError && (
                <div className="mt-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs text-center flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
                  <span>{cameraError}</span>
                </div>
              )}

              {verificationError && (
                <div className="mt-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs text-center flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{verificationError}</span>
                </div>
              )}

              {/* Manual ticket code input alternative */}
              <div className="mt-6 w-full pt-4 border-t border-slate-800">
                <div className="text-xs font-semibold text-slate-400 mb-2 flex items-center gap-1">
                  <Search className="w-3.5 h-3.5" /> 또는 티켓 고유 번호 직접 조회:
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value)}
                    placeholder="예: KFC-1728..."
                    className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        verifyTicketById(manualCode);
                      }
                    }}
                  />
                  <button
                    onClick={() => verifyTicketById(manualCode)}
                    disabled={!manualCode.trim() || isVerifying}
                    className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-800 disabled:text-slate-600 text-white rounded-xl text-sm font-bold transition"
                  >
                    조회
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
