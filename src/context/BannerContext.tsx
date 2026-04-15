// ========================================
// Глобальный контекст для баннеров-таймеров
// ========================================

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

// Типы баннеров
export type BannerType = 'habit-timer' | 'focus-session';

export interface HabitTimerBannerData {
  type: 'habit-timer';
  habit: { id: number; name: string; plan: number; unit: string };
  day: number;
  existingMinutes: number;
  onSave: (totalMinutes: number) => void;
  onClose: () => void;
}

export interface FocusSessionBannerData {
  type: 'focus-session';
  taskName: string;
  plannedMinutes: number;
  onSave: (elapsedMinutes: number) => void;
  onClose: () => void;
}

export type BannerData = HabitTimerBannerData | FocusSessionBannerData;

interface BannerContextType {
  banner: BannerData | null;
  showBanner: (data: BannerData) => void;
  closeBanner: () => void;
}

const BannerContext = createContext<BannerContextType | null>(null);

export function BannerProvider({ children }: { children: ReactNode }) {
  const [banner, setBanner] = useState<BannerData | null>(null);

  const showBanner = useCallback((data: BannerData) => {
    setBanner(data);
  }, []);

  const closeBanner = useCallback(() => {
    setBanner(null);
  }, []);

  return (
    <BannerContext.Provider value={{ banner, showBanner, closeBanner }}>
      {children}
    </BannerContext.Provider>
  );
}

export function useBanner() {
  const ctx = useContext(BannerContext);
  if (!ctx) throw new Error('useBanner must be used within BannerProvider');
  return ctx;
}
