import React from 'react';
import { AppTab, PresetTrack, UserProfile } from '../types';
import { PWAInstallButton } from './PWAInstallButton';
import {
  Play,
  Square,
  Volume2,
  Sparkles,
  BookOpen,
  Music,
  Code,
  History,
  Cloud,
  LogOut,
  User as UserIcon,
} from 'lucide-react';

interface NavbarProps {
  tracks: PresetTrack[];
  currentTrack: PresetTrack;
  onSelectTrack: (track: PresetTrack) => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  masterVolume: number;
  onChangeMasterVolume: (vol: number) => void;
  onOpenInfoModal: () => void;
  onOpenDevGuide: () => void;
  activeTab: AppTab;
  onSelectTab: (tab: AppTab) => void;
  historyCount: number;
  user: UserProfile | null;
  onLoginGoogle: () => void;
  onLogoutGoogle: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  tracks,
  currentTrack,
  onSelectTrack,
  isPlaying,
  onTogglePlay,
  masterVolume,
  onChangeMasterVolume,
  onOpenInfoModal,
  onOpenDevGuide,
  activeTab,
  onSelectTab,
  historyCount,
  user,
  onLoginGoogle,
  onLogoutGoogle,
}) => {
  return (
    <header className="sticky top-0 z-50 bg-slate-950/90 backdrop-blur-xl border-b border-slate-800 shadow-2xl">
      <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-4">
        {/* Brand / Logo */}
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-cyan-500 via-indigo-600 to-fuchsia-500 shadow-lg shadow-indigo-950/50">
            <Sparkles className="w-5 h-5 text-slate-950" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-black text-slate-100 tracking-tight font-sans">
                AI MUSIC <span className="text-cyan-400 font-mono font-normal">STUDIO</span>
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-indigo-950 text-indigo-300 border border-indigo-700">
                MULTI-STEM COMPOSER
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium">
              멀티 장르 AI 음악 작곡, 스템 믹싱 & 가사 생성 스튜디오
            </p>
          </div>
        </div>

        {/* Tab Switcher: 생성 vs 기록 */}
        <div className="flex items-center p-1 rounded-xl bg-slate-900 border border-slate-800">
          <button
            onClick={() => onSelectTab('generator')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'generator'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-950/50'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>음악 생성</span>
          </button>
          <button
            onClick={() => onSelectTab('history')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'history'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-950/50'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>생성 기록</span>
            {historyCount > 0 && (
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                  activeTab === 'history'
                    ? 'bg-indigo-950 text-indigo-200'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {historyCount}
              </span>
            )}
          </button>
        </div>

        {/* Master Transport Controls */}
        <div className="flex items-center gap-2.5 bg-slate-900 p-1.5 rounded-2xl border border-slate-800">
          {/* Preset Selector */}
          <div className="relative">
            <select
              value={currentTrack.id}
              onChange={e => {
                const sel = tracks.find(t => t.id === e.target.value);
                if (sel) onSelectTrack(sel);
              }}
              className="bg-slate-950 text-xs font-semibold text-slate-200 py-1.5 pl-2.5 pr-7 rounded-xl border border-slate-700 focus:outline-none focus:border-cyan-500 appearance-none cursor-pointer max-w-[160px] truncate"
            >
              {tracks.map(t => (
                <option key={t.id} value={t.id}>
                  🎵 {t.koreanTitle}
                </option>
              ))}
            </select>
            <Music className="w-3 h-3 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
          </div>

          {/* Master Play/Stop Button */}
          <button
            onClick={onTogglePlay}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-lg cursor-pointer ${
              isPlaying
                ? 'bg-rose-500 hover:bg-rose-600 text-slate-950 shadow-rose-950/50'
                : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-cyan-950/50'
            }`}
          >
            {isPlaying ? (
              <>
                <Square className="w-3.5 h-3.5 fill-current" />
                <span className="font-mono text-[11px]">STOP</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span className="font-mono text-[11px]">PLAY</span>
              </>
            )}
          </button>

          {/* Volume Control */}
          <div className="hidden sm:flex items-center gap-1.5 px-1.5">
            <Volume2 className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={masterVolume}
              onChange={e => onChangeMasterVolume(parseFloat(e.target.value))}
              className="w-14 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
            />
          </div>
        </div>

        {/* Google User & Info Buttons */}
        <div className="flex items-center gap-2">
          {/* PWA Install Button */}
          <PWAInstallButton />

          {/* Google Auth Status button */}
          {user ? (
            <div className="flex items-center gap-2 px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || 'Google'}
                  className="w-5 h-5 rounded-full border border-indigo-400"
                />
              ) : (
                <UserIcon className="w-4 h-4 text-indigo-400" />
              )}
              <span className="font-medium max-w-[90px] truncate hidden md:inline">
                {user.displayName || '구글 사용자'}
              </span>
              <button
                onClick={onLogoutGoogle}
                className="text-slate-500 hover:text-rose-400 transition-colors cursor-pointer ml-1"
                title="로그아웃"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={onLoginGoogle}
              className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 text-xs font-medium flex items-center gap-1.5 transition-all hover:border-cyan-500/50 cursor-pointer"
              title="Google 계정으로 로그인하여 생성 이력을 Google Drive에 자동 저장합니다"
            >
              <Cloud className="w-3.5 h-3.5 text-cyan-400" />
              <span className="font-mono text-[11px]">Drive 연동</span>
            </button>
          )}

          <button
            onClick={onOpenDevGuide}
            className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-medium flex items-center gap-1.5 transition-all hover:border-cyan-500/50 cursor-pointer"
          >
            <Code className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden xl:inline font-mono text-[11px]">API 연동</span>
          </button>
          <button
            onClick={onOpenInfoModal}
            className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden xl:inline">가이드</span>
          </button>
        </div>
      </div>
    </header>
  );
};

