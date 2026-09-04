import React, { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';

export const OfflineIndicator: React.FC = () => {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-xl bg-amber-500/90 text-slate-950 font-bold px-3.5 py-2 text-xs shadow-2xl backdrop-blur-md animate-in fade-in">
      <WifiOff className="w-4 h-4 text-slate-950" />
      <span>오프라인 모드 — 내장 신시사이저 및 로컬 캐시가 작동 중입니다.</span>
    </div>
  );
};
