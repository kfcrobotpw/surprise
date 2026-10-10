export interface PrizeItem {
  id: string;
  name: string;
  grade: string;
  emoji: string;
  color: string;
  description: string;
  probabilityWeight: number; // e.g. 5, 10, 25, 30, 30
}

export interface DrawTicket {
  id: string;
  name: string;
  age: string;
  favoriteExperience?: string;
  prizeId: string;
  prizeName: string;
  prizeGrade: string;
  prizeEmoji?: string;
  redeemed: boolean;
  redeemedAt?: string;
  redeemedBy?: string;
  createdAt: string;
  deviceId?: string;
}

export interface BoothSettings {
  boothName: string;
  prizes: PrizeItem[];
  boothActivities: string[];
  celebrationSoundUrl?: string;
  updatedAt?: string;
}

export const DEFAULT_BOOTH_ACTIVITIES = [
  '🤖 스마트 배틀 로봇 축구',
  '🏎️ 자율주행 RC카 트랙 레이스',
  '🦾 3D프린팅 로봇 팔 조종',
  '🕺 휴머노이드 댄스 로봇 공연',
  '👁️ AI 비전 사물인식 체험',
  '✨ K.F.C. 부원들의 제작 스토리',
];

export const DEFAULT_PRIZES: PrizeItem[] = [
  {
    id: 'prize-1',
    name: 'K.F.C. 특별 로봇 조립 키트 & 대형 간식팩',
    grade: '1등 대박상',
    emoji: '🤖',
    color: '#8b5cf6', // purple
    description: 'DIY 미니 로봇 키트와 푸짐한 프리미엄 스낵 세트!',
    probabilityWeight: 5,
  },
  {
    id: 'prize-2',
    name: 'K.F.C. 3D프린팅 커스텀 로봇 키링 & 간식세트',
    grade: '2등 로봇상',
    emoji: '⚙️',
    color: '#06b6d4', // cyan
    description: '동아리 부원들이 직접 3D프린터로 제작한 한정판 메카 키링!',
    probabilityWeight: 15,
  },
  {
    id: 'prize-3',
    name: '달콤바삭 초코/젤리 에너지 간식팩',
    grade: '3등 에너지상',
    emoji: '🍫',
    color: '#10b981', // emerald
    description: '체험 후 당충전 100%! 초콜릿과 젤리 간식 세트',
    probabilityWeight: 30,
  },
  {
    id: 'prize-4',
    name: 'K.F.C. 홀로그램 로봇 스티커팩 & 비타민 캔디',
    grade: '4등 사이버상',
    emoji: '⚡',
    color: '#f59e0b', // amber
    description: '노트북, 폰케이스용 사이버네틱 홀로그램 스티커 & 달콤 사탕',
    probabilityWeight: 30,
  },
  {
    id: 'prize-5',
    name: '부스 참가 응원 비타민 간식',
    grade: '참가 응원상',
    emoji: '🍬',
    color: '#ec4899', // pink
    description: 'K.F.C. 부스를 빛내주셔서 감사합니다! 달콤 캔디 & 스낵',
    probabilityWeight: 20,
  },
];
