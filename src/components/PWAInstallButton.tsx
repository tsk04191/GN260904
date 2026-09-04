import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, Smartphone, Share, X, CheckCircle2 } from 'lucide-react';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [installedNotice, setInstalledNotice] = useState(false);

  if (isInstalled) {
    return null;
  }

  const handleInstallClick = async () => {
    const success = await install();
    if (success) {
      setInstalledNotice(true);
      setTimeout(() => setInstalledNotice(false), 3000);
    }
  };

  // Android / Chromium / Desktop prompt
  if (isInstallable) {
    return (
      <>
        <button
          type="button"
          onClick={handleInstallClick}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-slate-950 font-bold text-xs shadow-md shadow-cyan-950/50 cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]"
          title="모바일 / 데스크톱에 앱 설치 (PWA)"
        >
          <Download className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">앱 설치</span>
          <span className="sm:hidden">PWA</span>
        </button>

        {installedNotice && (
          <div className="fixed top-16 right-4 z-50 p-3 rounded-xl bg-slate-900 border border-emerald-500/50 text-emerald-300 text-xs shadow-xl flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>앱이 성공적으로 설치되었습니다!</span>
          </div>
        )}
      </>
    );
  }

  // iOS Safari flow
  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-xs cursor-pointer transition-all"
          title="iPhone / iPad 홈 화면에 추가"
        >
          <Smartphone className="w-3.5 h-3.5 text-cyan-400" />
          <span>홈 화면에 추가</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-in fade-in">
            <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-700 p-5 shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-sm font-bold text-slate-100">
                    iOS 홈 화면에 앱 설치
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
                <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="p-1.5 rounded-lg bg-cyan-950 text-cyan-400 font-bold shrink-0">1</div>
                  <p className="pt-0.5">
                    Safari 하단 툴바의 <strong>공유(Share)</strong> <Share className="w-3 h-3 inline text-cyan-400 mx-0.5" /> 버튼을 누릅니다.
                  </p>
                </div>
                <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="p-1.5 rounded-lg bg-indigo-950 text-indigo-400 font-bold shrink-0">2</div>
                  <p className="pt-0.5">
                    스크롤을 내려 <strong>'홈 화면에 추가(Add to Home Screen)'</strong>를 탭합니다.
                  </p>
                </div>
                <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="p-1.5 rounded-lg bg-pink-950 text-pink-400 font-bold shrink-0">3</div>
                  <p className="pt-0.5">
                    상단 우측 <strong>'추가'</strong>를 누르면 전체화면 PWA 모드로 실행됩니다!
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all cursor-pointer"
              >
                닫기
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  // Fallback for browsers that support install or manual prompt
  return null;
};
