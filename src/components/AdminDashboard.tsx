import React, { useState, useEffect } from 'react';
import { db, auth } from '../lib/firebase';
import {
  collection,
  onSnapshot,
  query,
  doc,
  updateDoc,
  deleteDoc,
  setDoc,
  getDoc,
} from 'firebase/firestore';
import { GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { handleFirestoreError, OperationType } from '../lib/firestoreErrors';
import {
  DrawTicket,
  PrizeItem,
  DEFAULT_PRIZES,
  DEFAULT_BOOTH_ACTIVITIES,
  BoothSettings,
} from '../types';
import { QRScannerModal } from './QRScannerModal';
import { playScanSuccess } from '../lib/audio';
import QRCode from 'qrcode';
import {
  Bot,
  Camera,
  Users,
  Gift,
  CheckCircle2,
  Clock,
  Search,
  Download,
  QrCode,
  ShieldCheck,
  LogOut,
  ExternalLink,
  Trash2,
  Plus,
  Save,
  RotateCcw,
  AlertTriangle,
  Sliders,
  ListOrdered,
  RefreshCw,
  Edit2,
  Eye,
  Volume2,
  Music,
} from 'lucide-react';
import { playWinningFanfare, playPartyHornSound } from '../lib/audio';

export const AdminDashboard: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [isStaffAuthenticated, setIsStaffAuthenticated] = useState<boolean>(() => {
    return sessionStorage.getItem('kfc_admin_auth') === 'true';
  });

  // Login credentials state
  const [adminIdInput, setAdminIdInput] = useState<string>('');
  const [adminPwInput, setAdminPwInput] = useState<string>('');
  const [staffName, setStaffName] = useState<string>(() => {
    return sessionStorage.getItem('kfc_staff_name') || 'K.F.C. 부스운영진';
  });
  const [loginError, setLoginError] = useState<string | null>(null);

  // Tickets state
  const [tickets, setTickets] = useState<DrawTicket[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'unredeemed' | 'redeemed'>('all');

  // Scanner modal state
  const [isScannerOpen, setIsScannerOpen] = useState<boolean>(false);

  // Booth QR Display modal
  const [isBoothQrOpen, setIsBoothQrOpen] = useState<boolean>(false);
  const [boothQrDataUrl, setBoothQrDataUrl] = useState<string>('');

  // Active Tab
  const [activeTab, setActiveTab] = useState<'participants' | 'prizes' | 'activities' | 'sound'>('participants');

  // Settings: Prizes and Activities
  const [prizesList, setPrizesList] = useState<PrizeItem[]>(DEFAULT_PRIZES);
  const [activitiesList, setActivitiesList] = useState<string[]>(DEFAULT_BOOTH_ACTIVITIES);
  const [customSoundUrl, setCustomSoundUrl] = useState<string>(() => localStorage.getItem('kfc_custom_sound') || '');
  const [isSavingSettings, setIsSavingSettings] = useState<boolean>(false);
  const [settingsSuccessMessage, setSettingsSuccessMessage] = useState<string | null>(null);

  // New activity input
  const [newActivityInput, setNewActivityInput] = useState<string>('');

  // Reset all modal state
  const [isResetModalOpen, setIsResetModalOpen] = useState<boolean>(false);
  const [resetConfirmInput, setResetConfirmInput] = useState<string>('');
  const [isResetting, setIsResetting] = useState<boolean>(false);

  // Track Firebase auth state
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (user && user.email === 'kfcrobotpw@gmail.com') {
        setIsStaffAuthenticated(true);
        sessionStorage.setItem('kfc_admin_auth', 'true');
      }
    });
    return () => unsub();
  }, []);

  // Listen to Firestore real-time updates for tickets
  useEffect(() => {
    if (!isStaffAuthenticated) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const ticketsQuery = query(collection(db, 'tickets'));

    const unsubscribe = onSnapshot(
      ticketsQuery,
      (snapshot) => {
        const list: DrawTicket[] = [];
        snapshot.forEach((d) => {
          list.push(d.data() as DrawTicket);
        });

        // Sort descending by createdAt
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setTickets(list);
        setIsLoading(false);
      },
      (error) => {
        setIsLoading(false);
        handleFirestoreError(error, OperationType.LIST, 'tickets');
      }
    );

    return () => unsubscribe();
  }, [isStaffAuthenticated]);

  // Load booth settings (prizes & activities) from Firestore
  useEffect(() => {
    const settingsRef = doc(db, 'settings', 'config');
    const unsubscribe = onSnapshot(
      settingsRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data() as BoothSettings;
          if (data.prizes && Array.isArray(data.prizes) && data.prizes.length > 0) {
            setPrizesList(data.prizes);
          }
          if (data.boothActivities && Array.isArray(data.boothActivities) && data.boothActivities.length > 0) {
            setActivitiesList(data.boothActivities);
          }
        }
      },
      (error) => {
        console.warn('Config fetch notice:', error);
      }
    );

    return () => unsubscribe();
  }, []);

  // Generate Booth Entrance QR
  useEffect(() => {
    const participantUrl = window.location.origin;
    QRCode.toDataURL(participantUrl, {
      width: 320,
      margin: 2,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    })
      .then((url) => setBoothQrDataUrl(url))
      .catch((err) => console.error(err));
  }, []);

  // Handle Login: id: admin, pw: 1234
  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminIdInput.trim() === 'admin' && adminPwInput.trim() === '1234') {
      setIsStaffAuthenticated(true);
      sessionStorage.setItem('kfc_admin_auth', 'true');
      sessionStorage.setItem('kfc_staff_name', staffName.trim() || 'K.F.C. 운영진');
      setLoginError(null);
    } else {
      setLoginError('아이디 또는 비밀번호가 일치하지 않습니다.');
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      setIsStaffAuthenticated(true);
      sessionStorage.setItem('kfc_admin_auth', 'true');
    } catch (err: unknown) {
      console.error(err);
      setLoginError('Google 로그인에 실패했습니다. 아이디/비밀번호 로그인을 이용해 주세요.');
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('kfc_admin_auth');
    setIsStaffAuthenticated(false);
    signOut(auth);
  };

  // Manual one-click redemption from list
  const handleManualRedeem = async (ticket: DrawTicket) => {
    if (ticket.redeemed) return;
    const confirmAction = window.confirm(
      `[${ticket.name} (${ticket.age})] 님에게 '${ticket.prizeName}' 선물을 지급 완료하시겠습니까?`
    );
    if (!confirmAction) return;

    try {
      const ticketRef = doc(db, 'tickets', ticket.id);
      const nowIso = new Date().toISOString();
      await updateDoc(ticketRef, {
        redeemed: true,
        redeemedAt: nowIso,
        redeemedBy: staffName,
      });
      playScanSuccess();
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `tickets/${ticket.id}`);
    }
  };

  // Reset ALL participants
  const handleResetAllParticipants = async () => {
    if (resetConfirmInput.trim() !== '초기화') {
      alert("확인을 위해 '초기화'를 정확히 입력해 주세요.");
      return;
    }

    setIsResetting(true);
    try {
      // Delete every ticket in tickets list
      for (const t of tickets) {
        try {
          await deleteDoc(doc(db, 'tickets', t.id));
        } catch (err) {
          console.error(`Failed to delete ${t.id}`, err);
        }
      }
      setIsResetModalOpen(false);
      setResetConfirmInput('');
      alert('모든 참가자 데이터가 성공적으로 초기화되었습니다.');
    } catch (err) {
      console.error('Reset error:', err);
      alert('초기화 중 오류가 발생했습니다.');
    } finally {
      setIsResetting(false);
    }
  };

  // Save Prizes changes to Firestore
  const handleSavePrizes = async () => {
    setIsSavingSettings(true);
    setSettingsSuccessMessage(null);
    try {
      const settingsRef = doc(db, 'settings', 'config');
      await setDoc(
        settingsRef,
        {
          boothName: '용인시청소년수련관 로봇동아리 K.F.C.',
          prizes: prizesList,
          boothActivities: activitiesList,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
      setSettingsSuccessMessage('상품 및 당첨 확률 설정이 저장되었습니다! (체험자 화면에 즉시 적용)');
      setTimeout(() => setSettingsSuccessMessage(null), 3000);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'settings/config');
    } finally {
      setIsSavingSettings(false);
    }
  };

  // Save Activities changes to Firestore
  const handleSaveActivities = async () => {
    setIsSavingSettings(true);
    setSettingsSuccessMessage(null);
    try {
      const settingsRef = doc(db, 'settings', 'config');
      await setDoc(
        settingsRef,
        {
          boothName: '용인시청소년수련관 로봇동아리 K.F.C.',
          prizes: prizesList,
          boothActivities: activitiesList,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
      setSettingsSuccessMessage('체험 부스 프로그램 목록이 저장되었습니다! (체험자 화면에 즉시 적용)');
      setTimeout(() => setSettingsSuccessMessage(null), 3000);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'settings/config');
    } finally {
      setIsSavingSettings(false);
    }
  };

  // Add new activity
  const handleAddActivity = () => {
    if (!newActivityInput.trim()) return;
    if (activitiesList.includes(newActivityInput.trim())) {
      alert('이미 목록에 있는 프로그램입니다.');
      return;
    }
    setActivitiesList([...activitiesList, newActivityInput.trim()]);
    setNewActivityInput('');
  };

  // Remove activity
  const handleRemoveActivity = (indexToRemove: number) => {
    if (activitiesList.length <= 1) {
      alert('최소 1개 이상의 프로그램이 필요합니다.');
      return;
    }
    setActivitiesList(activitiesList.filter((_, idx) => idx !== indexToRemove));
  };

  // Update a prize item field
  const handleUpdatePrize = (index: number, field: keyof PrizeItem, value: any) => {
    const updated = [...prizesList];
    updated[index] = {
      ...updated[index],
      [field]: field === 'probabilityWeight' ? Number(value) || 0 : value,
    };
    setPrizesList(updated);
  };

  // Add new prize
  const handleAddPrize = () => {
    const newId = `prize-${Date.now()}`;
    const newPrize: PrizeItem = {
      id: newId,
      name: '새로운 선물',
      grade: `${prizesList.length + 1}등`,
      emoji: '🎁',
      color: '#06b6d4',
      description: '부스 참가 선물',
      probabilityWeight: 10,
    };
    setPrizesList([...prizesList, newPrize]);
  };

  // Remove a prize
  const handleRemovePrize = (indexToRemove: number) => {
    if (prizesList.length <= 2) {
      alert('룰렛 뽑기를 위해 최소 2개 이상의 상품이 등록되어 있어야 합니다.');
      return;
    }
    setPrizesList(prizesList.filter((_, idx) => idx !== indexToRemove));
  };

  // Export CSV
  const handleExportCSV = () => {
    if (tickets.length === 0) {
      alert('내보낼 참여 데이터가 없습니다.');
      return;
    }

    const headers = [
      '티켓번호',
      '참가자이름',
      '나이/학년',
      '체험소감',
      '당첨상품',
      '등급',
      '수령여부',
      '수령시각',
      '지급담당자',
      '참여일시',
    ];

    const rows = tickets.map((t) => [
      t.id,
      `"${t.name.replace(/"/g, '""')}"`,
      `"${t.age.replace(/"/g, '""')}"`,
      `"${(t.favoriteExperience || '').replace(/"/g, '""')}"`,
      `"${t.prizeName.replace(/"/g, '""')}"`,
      `"${t.prizeGrade.replace(/"/g, '""')}"`,
      t.redeemed ? '수령완료' : '미수령',
      t.redeemedAt || '',
      t.redeemedBy || '',
      t.createdAt,
    ]);

    const csvContent =
      '\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `KFC_로봇부스_참여명단_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtered tickets
  const filteredTickets = tickets.filter((t) => {
    const matchSearch =
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.age.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.prizeName.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchSearch) return false;
    if (filterStatus === 'unredeemed') return !t.redeemed;
    if (filterStatus === 'redeemed') return t.redeemed;
    return true;
  });

  // Stats calculation
  const totalCount = tickets.length;
  const redeemedCount = tickets.filter((t) => t.redeemed).length;
  const unredeemedCount = totalCount - redeemedCount;
  const rate = totalCount > 0 ? Math.round((redeemedCount / totalCount) * 100) : 0;

  // Unauthenticated Admin Gate
  if (!isStaffAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-slate-900 border border-cyan-500/30 rounded-3xl p-7 shadow-2xl relative overflow-hidden">
          <div className="text-center space-y-2 mb-6">
            <div className="inline-flex p-3 bg-cyan-500/20 text-cyan-400 rounded-2xl mb-1">
              <Bot className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-black text-white">K.F.C. 부스 관리자 모드</h2>
            <p className="text-xs text-slate-400">
              용인시청소년수련관 로봇동아리 K.F.C. 운영진 전용 로그인
            </p>
          </div>

          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">관리자 아이디</label>
              <input
                type="text"
                required
                autoComplete="username"
                value={adminIdInput}
                onChange={(e) => setAdminIdInput(e.target.value)}
                placeholder="아이디를 입력하세요"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">비밀번호</label>
              <input
                type="password"
                required
                autoComplete="current-password"
                value={adminPwInput}
                onChange={(e) => setAdminPwInput(e.target.value)}
                placeholder="비밀번호를 입력하세요"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                운영진 이름 / 닉네임 (선택)
              </label>
              <input
                type="text"
                value={staffName}
                onChange={(e) => setStaffName(e.target.value)}
                placeholder="예: 김동아리 부원"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
              />
            </div>

            {loginError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                {loginError}
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-sm shadow-lg shadow-cyan-500/25 transition"
            >
              운영자 모드 접속
            </button>
          </form>

          <div className="mt-5 pt-4 border-t border-slate-800 flex flex-col items-center gap-2">
            <button
              onClick={handleGoogleLogin}
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 transition"
            >
              <span>또는 동아리 대표 Google 계정으로 로그인</span>
            </button>
            <a
              href="/"
              className="text-xs text-cyan-400 hover:text-cyan-300 mt-2 flex items-center gap-1"
            >
              <span>← 체험자 뽑기 화면으로 돌아가기</span>
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Navigation */}
      <nav className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-cyan-500/20 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-cyan-500/20 text-cyan-400 rounded-xl">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-bold text-cyan-400">용인시청소년수련관 K.F.C.</div>
              <div className="text-sm font-extrabold text-white flex items-center gap-1.5">
                <span>부스 운영진 관리자 모드</span>
                <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  실시간 연동 중
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsBoothQrOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700 flex items-center gap-1.5 transition"
              title="부스 안내용 QR 보기"
            >
              <QrCode className="w-4 h-4 text-cyan-400" />
              <span className="hidden sm:inline">체험자 QR 안내판</span>
            </button>

            <a
              href="/"
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700 flex items-center gap-1.5 transition"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">뽑기 페이지 열기</span>
            </a>

            <button
              onClick={handleLogout}
              className="p-1.5 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
              title="로그아웃"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </nav>

      {/* Main Tabs Header */}
      <div className="bg-slate-900 border-b border-slate-800 px-4">
        <div className="max-w-7xl mx-auto flex items-center gap-2 overflow-x-auto py-2">
          <button
            onClick={() => setActiveTab('participants')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 ${
              activeTab === 'participants'
                ? 'bg-cyan-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>실시간 참여 현황 & QR 스캔 ({totalCount}명)</span>
          </button>

          <button
            onClick={() => setActiveTab('prizes')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 ${
              activeTab === 'prizes'
                ? 'bg-cyan-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Gift className="w-4 h-4" />
            <span>상품별 당첨 현황 및 상품 목록 설정</span>
          </button>

          <button
            onClick={() => setActiveTab('activities')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 ${
              activeTab === 'activities'
                ? 'bg-cyan-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <ListOrdered className="w-4 h-4" />
            <span>체험 부스 프로그램 목록 설정</span>
          </button>

          <button
            onClick={() => setActiveTab('sound')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 ${
              activeTab === 'sound'
                ? 'bg-cyan-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Volume2 className="w-4 h-4" />
            <span>축하 효과음 설정 & 테스트</span>
          </button>
        </div>
      </div>

      {/* Success Notification Bar */}
      {settingsSuccessMessage && (
        <div className="bg-emerald-500/20 border-b border-emerald-500/40 text-emerald-300 text-xs py-2 px-4 text-center font-bold animate-in fade-in">
          {settingsSuccessMessage}
        </div>
      )}

      {/* Main Container */}
      <main className="max-w-7xl mx-auto w-full px-4 py-6 space-y-6 flex-1">
        {/* TAB 1: PARTICIPANTS & SCANNER */}
        {activeTab === 'participants' && (
          <div className="space-y-6">
            {/* Action Banner */}
            <div className="bg-gradient-to-r from-cyan-900/60 via-blue-900/50 to-indigo-900/60 border border-cyan-400/40 rounded-3xl p-5 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4 text-center sm:text-left">
                <div className="p-3.5 bg-cyan-500 text-slate-950 rounded-2xl shadow-lg shadow-cyan-500/40 shrink-0">
                  <Camera className="w-7 h-7" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-white">
                    선물 지급 시 참가자 QR을 스캔하세요!
                  </h2>
                  <p className="text-xs text-cyan-200/90 mt-0.5">
                    당첨 상품을 확인하고 중복 간식 수령을 자동으로 차단합니다.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  onClick={() => setIsScannerOpen(true)}
                  className="flex-1 sm:flex-none px-6 py-3.5 rounded-2xl bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-slate-950 font-black text-base shadow-xl shadow-cyan-400/30 transition transform active:scale-95 flex items-center justify-center gap-2"
                >
                  <Camera className="w-5 h-5 text-slate-950" />
                  <span>QR 코드 스캔 검증</span>
                </button>

                <button
                  onClick={() => setIsResetModalOpen(true)}
                  className="px-4 py-3.5 rounded-2xl bg-rose-950/80 hover:bg-rose-900 border border-rose-500/40 text-rose-300 hover:text-white font-bold text-xs transition flex items-center gap-1.5"
                  title="참가자 전체 초기화"
                >
                  <Trash2 className="w-4 h-4 text-rose-400" />
                  <span className="hidden md:inline">참가자 전체 초기화</span>
                </button>
              </div>
            </div>

            {/* Live Metrics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
                <div className="flex items-center justify-between text-slate-400 text-xs font-bold">
                  <span>총 부스 참여자</span>
                  <Users className="w-4 h-4 text-cyan-400" />
                </div>
                <div className="mt-3">
                  <span className="text-3xl font-black text-white">{totalCount}</span>
                  <span className="text-xs text-slate-400 ml-1">명</span>
                </div>
                <div className="text-[11px] text-cyan-400/80 mt-1">실시간 집계</div>
              </div>

              <div className="bg-slate-900/90 border border-amber-500/30 rounded-2xl p-4 flex flex-col justify-between">
                <div className="flex items-center justify-between text-amber-300 text-xs font-bold">
                  <span>선물 지급 대기 (미수령)</span>
                  <Clock className="w-4 h-4 text-amber-400 animate-pulse" />
                </div>
                <div className="mt-3">
                  <span className="text-3xl font-black text-amber-400">{unredeemedCount}</span>
                  <span className="text-xs text-slate-400 ml-1">건</span>
                </div>
                <div className="text-[11px] text-amber-300/80 mt-1">부스에서 수령 대기 중</div>
              </div>

              <div className="bg-slate-900/90 border border-emerald-500/30 rounded-2xl p-4 flex flex-col justify-between">
                <div className="flex items-center justify-between text-emerald-300 text-xs font-bold">
                  <span>지급 완료 (수령됨)</span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="mt-3">
                  <span className="text-3xl font-black text-emerald-400">{redeemedCount}</span>
                  <span className="text-xs text-slate-400 ml-1">건</span>
                </div>
                <div className="text-[11px] text-emerald-300/80 mt-1">지급률: {rate}%</div>
              </div>

              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
                <div className="flex items-center justify-between text-slate-400 text-xs font-bold">
                  <span>현재 운영 담당자</span>
                  <ShieldCheck className="w-4 h-4 text-indigo-400" />
                </div>
                <div className="mt-3">
                  <div className="text-lg font-bold text-white truncate">{staffName}</div>
                  <div className="text-xs text-slate-400 truncate">K.F.C. 로봇동아리</div>
                </div>
                <div className="text-[11px] text-slate-500 mt-1">용인시청소년수련관</div>
              </div>
            </div>

            {/* Quick Prize Won Summary Bar */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4">
              <div className="text-xs font-bold text-slate-300 mb-3 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Gift className="w-4 h-4 text-cyan-400" /> 상품별 당첨 & 지급 현황
                </span>
                <button
                  onClick={() => setActiveTab('prizes')}
                  className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold"
                >
                  상품 및 당첨확률 설정하기 →
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                {prizesList.map((prize) => {
                  const wonCount = tickets.filter((t) => t.prizeId === prize.id).length;
                  const givenCount = tickets.filter((t) => t.prizeId === prize.id && t.redeemed).length;
                  return (
                    <div
                      key={prize.id}
                      className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-2.5 flex flex-col justify-between text-xs"
                    >
                      <div className="flex items-center gap-1.5 font-bold text-slate-300 truncate">
                        <span>{prize.emoji}</span>
                        <span className="truncate">{prize.grade}</span>
                      </div>
                      <div className="mt-2 flex items-baseline justify-between">
                        <span className="font-extrabold text-base text-white">{wonCount}명 당첨</span>
                        <span className="text-[11px] text-emerald-400 font-semibold">{givenCount}개 지급</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Participant Table */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              {/* Filters Bar */}
              <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <div className="relative flex-1 sm:w-64">
                    <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="참가자 이름, 티켓번호 검색..."
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                    />
                  </div>

                  {/* Status Filter Tabs */}
                  <div className="flex bg-slate-800 p-1 rounded-xl border border-slate-700 text-xs shrink-0">
                    <button
                      onClick={() => setFilterStatus('all')}
                      className={`px-3 py-1 rounded-lg font-bold transition ${
                        filterStatus === 'all'
                          ? 'bg-cyan-500 text-slate-950'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      전체 ({totalCount})
                    </button>
                    <button
                      onClick={() => setFilterStatus('unredeemed')}
                      className={`px-3 py-1 rounded-lg font-bold transition ${
                        filterStatus === 'unredeemed'
                          ? 'bg-amber-400 text-slate-950'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      미수령 ({unredeemedCount})
                    </button>
                    <button
                      onClick={() => setFilterStatus('redeemed')}
                      className={`px-3 py-1 rounded-lg font-bold transition ${
                        filterStatus === 'redeemed'
                          ? 'bg-emerald-400 text-slate-950'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      수령완료 ({redeemedCount})
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <button
                    onClick={handleExportCSV}
                    className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-300 hover:text-white rounded-xl transition flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>엑셀(CSV) 저장</span>
                  </button>
                </div>
              </div>

              {/* Table Body */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/60 text-slate-400 uppercase tracking-wider text-[11px] border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4">티켓 번호</th>
                      <th className="py-3 px-4">참가자 (나이/학년)</th>
                      <th className="py-3 px-4">체험 소감</th>
                      <th className="py-3 px-4">당첨 상품</th>
                      <th className="py-3 px-4">수령 상태</th>
                      <th className="py-3 px-4">참여 일시</th>
                      <th className="py-3 px-4 text-right">관리 작업</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {isLoading ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-slate-400">
                          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-cyan-400" />
                          실시간 참여 현황 불러오는 중...
                        </td>
                      </tr>
                    ) : filteredTickets.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-slate-500">
                          참여 기록이 없습니다.
                        </td>
                      </tr>
                    ) : (
                      filteredTickets.map((ticket) => (
                        <tr key={ticket.id} className="hover:bg-slate-800/40 transition group">
                          <td className="py-3 px-4 font-mono font-bold text-cyan-400">
                            {ticket.id}
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-extrabold text-white text-sm">
                              {ticket.name}
                            </div>
                            <div className="text-[11px] text-slate-400">{ticket.age}</div>
                          </td>
                          <td className="py-3 px-4 text-slate-300 max-w-[180px] truncate">
                            {ticket.favoriteExperience || '-'}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1.5">
                              <span>{ticket.prizeEmoji || '🎁'}</span>
                              <div>
                                <div className="font-bold text-white leading-tight">
                                  {ticket.prizeGrade}
                                </div>
                                <div className="text-[11px] text-slate-400">
                                  {ticket.prizeName}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            {ticket.redeemed ? (
                              <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>수령 완료</span>
                              </div>
                            ) : (
                              <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                <Clock className="w-3.5 h-3.5" />
                                <span>미수령</span>
                              </div>
                            )}
                            {ticket.redeemed && ticket.redeemedAt && (
                              <div className="text-[10px] text-slate-500 mt-1">
                                {new Date(ticket.redeemedAt).toLocaleTimeString('ko-KR', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                                {ticket.redeemedBy && ` (${ticket.redeemedBy})`}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4 text-slate-400 text-[11px]">
                            {new Date(ticket.createdAt).toLocaleTimeString('ko-KR', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </td>
                          <td className="py-3 px-4 text-right">
                            {ticket.redeemed ? (
                              <span className="text-slate-500 text-[11px] font-medium">
                                지급 완료됨
                              </span>
                            ) : (
                              <button
                                onClick={() => handleManualRedeem(ticket)}
                                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition shadow-sm"
                              >
                                수령 처리
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: PRIZES MANAGEMENT */}
        {activeTab === 'prizes' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 border border-slate-800 rounded-2xl p-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Gift className="w-5 h-5 text-cyan-400" /> 상품별 당첨 현황 및 상품 목록 수정
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  상품명, 등급, 아이콘, 당첨 확률 가중치를 직접 수정할 수 있으며 체험자 룰렛에 즉시 적용됩니다.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleAddPrize}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center gap-1.5 transition"
                >
                  <Plus className="w-4 h-4 text-cyan-400" />
                  <span>상품 추가</span>
                </button>

                <button
                  onClick={handleSavePrizes}
                  disabled={isSavingSettings}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-extrabold flex items-center gap-1.5 shadow-lg shadow-cyan-500/20 transition disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSavingSettings ? '저장 중...' : '설정 저장'}</span>
                </button>
              </div>
            </div>

            {/* Total weight calculation */}
            {(() => {
              const totalWeight = prizesList.reduce((acc, p) => acc + (p.probabilityWeight || 0), 0);
              return (
                <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 text-xs text-slate-400 flex items-center justify-between">
                  <span>총 당첨 가중치 합계: <strong className="text-cyan-400 font-mono text-sm">{totalWeight}</strong></span>
                  <span className="text-slate-500">각 상품의 당첨 확률은 (가중치 ÷ 총 가중치)로 자동 계산됩니다.</span>
                </div>
              );
            })()}

            {/* Prizes Edit List */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {prizesList.map((prize, idx) => {
                const totalWeight = prizesList.reduce((acc, p) => acc + (p.probabilityWeight || 0), 0);
                const wonCount = tickets.filter((t) => t.prizeId === prize.id).length;
                const givenCount = tickets.filter((t) => t.prizeId === prize.id && t.redeemed).length;
                const chance = totalWeight > 0 ? Math.round(((prize.probabilityWeight || 0) / totalWeight) * 100) : 0;

                return (
                  <div
                    key={prize.id}
                    className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 relative overflow-hidden"
                  >
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{prize.emoji}</span>
                        <div className="font-extrabold text-white text-sm">
                          {prize.grade || `상품 #${idx + 1}`}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <span className="text-[11px] font-bold text-cyan-400">{chance}% 확률</span>
                          <span className="text-[10px] text-slate-400 block">{wonCount}명 당첨 / {givenCount}개 지급</span>
                        </div>
                        {prizesList.length > 2 && (
                          <button
                            onClick={() => handleRemovePrize(idx)}
                            className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
                            title="상품 삭제"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <label className="block text-slate-400 mb-1 font-semibold">등급명</label>
                        <input
                          type="text"
                          value={prize.grade}
                          onChange={(e) => handleUpdatePrize(idx, 'grade', e.target.value)}
                          className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-white"
                          placeholder="예: 1등 대박상"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-400 mb-1 font-semibold">이모지 아이콘</label>
                        <input
                          type="text"
                          value={prize.emoji}
                          onChange={(e) => handleUpdatePrize(idx, 'emoji', e.target.value)}
                          className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-white"
                          placeholder="예: 🤖"
                        />
                      </div>
                    </div>

                    <div className="text-xs">
                      <label className="block text-slate-400 mb-1 font-semibold">상품명</label>
                      <input
                        type="text"
                        value={prize.name}
                        onChange={(e) => handleUpdatePrize(idx, 'name', e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-white"
                        placeholder="예: 로봇 키트 & 간식팩"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <label className="block text-slate-400 mb-1 font-semibold">상품 설명</label>
                        <input
                          type="text"
                          value={prize.description}
                          onChange={(e) => handleUpdatePrize(idx, 'description', e.target.value)}
                          className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-white"
                          placeholder="설명 문구"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-400 mb-1 font-semibold">
                          당첨 확률 가중치 ({chance}%)
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={100}
                          value={prize.probabilityWeight}
                          onChange={(e) => handleUpdatePrize(idx, 'probabilityWeight', e.target.value)}
                          className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-white font-mono"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 3: BOOTH ACTIVITIES MANAGEMENT */}
        {activeTab === 'activities' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 border border-slate-800 rounded-2xl p-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <ListOrdered className="w-5 h-5 text-cyan-400" /> 가장 재밌었던 부스 프로그램 선택지 수정
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  체험자들이 뽑기 전 선택할 수 있는 부스 활동 목록을 추가, 수정, 삭제할 수 있습니다.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActivitiesList(DEFAULT_BOOTH_ACTIVITIES)}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold flex items-center gap-1.5 transition"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>기본값 복원</span>
                </button>

                <button
                  onClick={handleSaveActivities}
                  disabled={isSavingSettings}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-extrabold flex items-center gap-1.5 shadow-lg shadow-cyan-500/20 transition disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSavingSettings ? '저장 중...' : '설정 저장'}</span>
                </button>
              </div>
            </div>

            {/* Add activity box */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex gap-2">
              <input
                type="text"
                value={newActivityInput}
                onChange={(e) => setNewActivityInput(e.target.value)}
                placeholder="예: 🦾 로봇 코딩 시연 체험"
                className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleAddActivity();
                  }
                }}
              />
              <button
                onClick={handleAddActivity}
                className="px-4 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>추가</span>
              </button>
            </div>

            {/* Activity list cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {activitiesList.map((activity, index) => (
                <div
                  key={index}
                  className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex items-center justify-between text-xs group hover:border-slate-700 transition"
                >
                  <div className="flex items-center gap-2 flex-1 mr-2">
                    <span className="font-mono text-cyan-400 text-[11px] font-bold w-5">
                      #{index + 1}
                    </span>
                    <input
                      type="text"
                      value={activity}
                      onChange={(e) => {
                        const updated = [...activitiesList];
                        updated[index] = e.target.value;
                        setActivitiesList(updated);
                      }}
                      className="flex-1 bg-transparent border-b border-transparent focus:border-cyan-400 text-white focus:outline-none py-0.5"
                    />
                  </div>

                  <button
                    onClick={() => handleRemoveActivity(index)}
                    className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
                    title="삭제"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: SOUND SETTINGS */}
        {activeTab === 'sound' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-3 gap-2">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Volume2 className="w-5 h-5 text-cyan-400" /> 축하 효과음 설정 & 테스트
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    인형 뽑기 성공 및 선물 당첨 시 재생되는 신나는 축하 효과음(파티 호른 / 팡파르)입니다.
                  </p>
                </div>
                <div className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/30 self-start sm:self-auto">
                  🎺 파티 호른 ("뿌우우-!") 효과음 기본 활성화
                </div>
              </div>

              <div className="p-4 bg-slate-950/70 border border-cyan-500/30 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-cyan-500/20 text-cyan-300 rounded-xl">
                    <Music className="w-6 h-6 animate-pulse" />
                  </div>
                  <div>
                    <div className="text-sm font-extrabold text-white">
                      {customSoundUrl ? '사용자 등록 오디오 파일' : '신나는 파티 피리 & 호른 소리 (Party Horn SFX)'}
                    </div>
                    <div className="text-xs text-slate-400">
                      {customSoundUrl
                        ? '사용자가 업로드한 커스텀 오디오 파일이 적용되어 있습니다.'
                        : '업로드해주신 경쾌한 파티 피리 ("뿌우우우-!") 효과음이 재생됩니다.'}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => playWinningFanfare(customSoundUrl)}
                  className="w-full sm:w-auto px-5 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-extrabold text-xs shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 transition transform active:scale-95"
                >
                  <Volume2 className="w-4 h-4" />
                  <span>🔊 지금 효과음 들어보기 (테스트 재생)</span>
                </button>
              </div>

              {/* Upload custom sound if desired */}
              <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-4 space-y-3">
                <div className="text-xs font-bold text-slate-300">
                  다른 오디오 파일로 교체 등록하기 (선택 사항)
                </div>
                <p className="text-xs text-slate-400">
                  새로운 MP3/WAV 오디오 파일을 등록하면 Firestore 및 기기에 동기화되어 모든 참가자 스마트폰에서 해당 소리가 재생됩니다.
                </p>

                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <input
                    type="file"
                    accept="audio/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = async (evt) => {
                        const base64 = evt.target?.result as string;
                        setCustomSoundUrl(base64);
                        localStorage.setItem('kfc_custom_sound', base64);
                        try {
                          await setDoc(doc(db, 'settings', 'config'), { celebrationSoundUrl: base64 }, { merge: true });
                          setSettingsSuccessMessage('새로운 축하 오디오 파일이 성공적으로 등록되었습니다!');
                          playWinningFanfare(base64);
                        } catch (err) {
                          console.warn(err);
                        }
                      };
                      reader.readAsDataURL(file);
                    }}
                    className="text-xs text-slate-400 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-cyan-600 file:text-white hover:file:bg-cyan-500 cursor-pointer"
                  />

                  {customSoundUrl && (
                    <button
                      onClick={async () => {
                        setCustomSoundUrl('');
                        localStorage.removeItem('kfc_custom_sound');
                        try {
                          await setDoc(doc(db, 'settings', 'config'), { celebrationSoundUrl: '' }, { merge: true });
                          setSettingsSuccessMessage('기본 파티 호른 효과음으로 복원되었습니다.');
                          playWinningFanfare();
                        } catch (err) {
                          console.warn(err);
                        }
                      }}
                      className="text-xs text-rose-400 hover:text-rose-300 font-bold px-3 py-1.5 rounded-lg border border-rose-500/30 hover:bg-rose-500/10 transition"
                    >
                      기본 파티 호른 소리로 복원
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* QR Scanner Modal */}
      <QRScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        staffName={staffName}
      />

      {/* Reset All Participants Confirmation Modal */}
      {isResetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
          <div className="relative w-full max-w-md bg-slate-900 border border-rose-500/50 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="p-2.5 bg-rose-500/20 rounded-2xl">
                <AlertTriangle className="w-6 h-6 text-rose-400" />
              </div>
              <h3 className="text-lg font-black text-white">참가자 데이터 전체 초기화</h3>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              정말 모든 참가자 기록과 티켓 데이터를 초기화하시겠습니까? <br />
              현재 등록된 <strong className="text-rose-400 font-bold">{tickets.length}명</strong>의
              모든 당첨 및 수령 내역이 영구적으로 삭제됩니다.
            </p>

            <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 text-xs">
              <label className="block text-slate-400 mb-1.5">
                확인을 위해 아래 입력창에 <span className="text-rose-400 font-bold">'초기화'</span>를 입력해 주세요.
              </label>
              <input
                type="text"
                value={resetConfirmInput}
                onChange={(e) => setResetConfirmInput(e.target.value)}
                placeholder="초기화"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-rose-400"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={handleResetAllParticipants}
                disabled={resetConfirmInput.trim() !== '초기화' || isResetting}
                className="flex-1 py-3 bg-rose-600 hover:bg-rose-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-bold text-xs rounded-xl transition"
              >
                {isResetting ? '삭제 처리 중...' : '전체 삭제 확인'}
              </button>
              <button
                onClick={() => {
                  setIsResetModalOpen(false);
                  setResetConfirmInput('');
                }}
                disabled={isResetting}
                className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Booth Participant QR Display Modal */}
      {isBoothQrOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="relative w-full max-w-sm bg-slate-900 border border-cyan-500/30 rounded-3xl p-6 text-center shadow-2xl">
            <h3 className="text-lg font-black text-white mb-1">체험자 스마트폰 접속용 QR</h3>
            <p className="text-xs text-slate-400 mb-4">
              부스를 체험한 사람들에게 이 QR을 폰 카메라로 비추도록 안내하세요!
            </p>

            <div className="p-3 bg-white rounded-2xl mx-auto inline-block shadow-lg">
              {boothQrDataUrl && (
                <img
                  src={boothQrDataUrl}
                  alt="부스 참여 QR"
                  className="w-56 h-56 rounded-lg object-contain"
                />
              )}
            </div>

            <div className="mt-4 p-3 rounded-xl bg-slate-800 text-xs text-cyan-300 font-mono break-all">
              {window.location.origin}
            </div>

            <button
              onClick={() => setIsBoothQrOpen(false)}
              className="mt-5 w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm transition"
            >
              닫기
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
