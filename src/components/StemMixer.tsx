import React from 'react';
import { StemConfig } from '../types';
import {
  Volume2,
  VolumeX,
  Disc,
  Sliders,
  Play,
  Square,
  Activity,
  Layers,
  Sparkles,
  Zap,
  Flame,
  Music,
  Headphones,
} from 'lucide-react';

interface StemMixerProps {
  stems: StemConfig[];
  isPlaying: boolean;
  onTogglePlay: () => void;
  onUpdateStem: (stemId: string, volume: number, muted: boolean, solo: boolean) => void;
  onSoloAuditionStem: (stemId: string) => void;
}

export const StemMixer: React.FC<StemMixerProps> = ({
  stems,
  isPlaying,
  onTogglePlay,
  onUpdateStem,
  onSoloAuditionStem,
}) => {
  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl backdrop-blur-md relative overflow-hidden">
      {/* Top Header with Mixer Transport */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-5 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-tr from-indigo-500 to-cyan-500 shadow-md shadow-indigo-950/40">
            <Sliders className="w-5 h-5 text-slate-950 font-black" />
          </div>
          <div>
            <h2 className="text-base font-black text-slate-100 flex items-center gap-2">
              실시간 5-트랙 스템 믹서 (Multi-Track Stem Mixer)
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-950 text-cyan-300 border border-cyan-700">
                5-Channel Realtime
              </span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              각 악기 스템을 독립적으로 제어하고 개별 청취(Solo Audition), 뮤트, 레벨을 실시간 믹싱합니다.
            </p>
          </div>
        </div>

        {/* Playback action inside Mixer */}
        <div className="flex items-center gap-2">
          <button
            onClick={onTogglePlay}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-md cursor-pointer ${
              isPlaying
                ? 'bg-rose-500 hover:bg-rose-600 text-slate-950 shadow-rose-950/50'
                : 'bg-gradient-to-r from-cyan-500 to-indigo-500 hover:from-cyan-400 hover:to-indigo-400 text-slate-950 shadow-cyan-950/50'
            }`}
          >
            {isPlaying ? (
              <>
                <Square className="w-4 h-4 fill-current" />
                <span className="font-mono">믹서 전체 정지 (STOP)</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                <span className="font-mono">믹서 실시간 재생 (PLAY)</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 5 Stem Channel Strips */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
        {stems.map((stem, index) => {
          const isAudible = isPlaying && !stem.muted && (stems.some(s => s.solo) ? stem.solo : true);

          return (
            <div
              key={stem.id}
              className={`p-4 rounded-xl border flex flex-col justify-between transition-all relative overflow-hidden ${
                isAudible
                  ? 'bg-slate-950/90 border-slate-700 shadow-xl ring-1 ring-cyan-500/30'
                  : 'bg-slate-950/40 border-slate-800/80 opacity-75'
              }`}
            >
              {/* Channel Strip Header */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: stem.color }}
                    ></span>
                    <span className="text-xs font-black text-slate-200">{stem.koreanName}</span>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-slate-400">
                    CH {index + 1}
                  </span>
                </div>

                <div className="text-[10px] font-mono text-slate-400 mb-2 truncate">
                  {stem.name}
                </div>

                {/* Animated Level Meter / Wave activity */}
                <div className="h-2 bg-slate-900 rounded-full overflow-hidden mb-3 border border-slate-800/80 flex items-center px-0.5">
                  <div
                    className={`h-1 rounded-full transition-all duration-100 ${
                      isAudible
                        ? 'animate-pulse'
                        : 'w-0'
                    }`}
                    style={{
                      width: isAudible ? `${Math.max(15, stem.volume * 100)}%` : '0%',
                      backgroundColor: stem.color,
                      boxShadow: isAudible ? `0 0 8px ${stem.color}` : 'none',
                    }}
                  ></div>
                </div>

                {/* Volume Slider & Level % */}
                <div className="mb-3">
                  <div className="flex justify-between text-[10px] font-mono text-slate-400 mb-1">
                    <span>LEVEL</span>
                    <span className="text-slate-200 font-bold">{Math.round(stem.volume * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={stem.volume}
                    onChange={e =>
                      onUpdateStem(stem.id, parseFloat(e.target.value), stem.muted, stem.solo)
                    }
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                  />
                </div>
              </div>

              {/* Action Buttons: Solo Audition, Mute, Solo */}
              <div className="space-y-1.5 pt-1 border-t border-slate-800/80">
                {/* 1-Click Single Stem Solo Audition */}
                <button
                  type="button"
                  onClick={() => onSoloAuditionStem(stem.id)}
                  className="w-full py-1.5 px-2 rounded-lg bg-indigo-950/80 hover:bg-indigo-900 text-indigo-300 hover:text-indigo-100 border border-indigo-800/60 text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer font-mono"
                  title="이 스템만 단독으로 재생/듣기"
                >
                  <Headphones className="w-3.5 h-3.5" />
                  <span>단독 재생 (Audition)</span>
                </button>

                <div className="flex items-center justify-between gap-1.5">
                  <button
                    onClick={() =>
                      onUpdateStem(stem.id, stem.volume, !stem.muted, stem.solo)
                    }
                    className={`flex-1 py-1 rounded text-[11px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                      stem.muted
                        ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                    }`}
                  >
                    {stem.muted ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
                    MUTE
                  </button>

                  <button
                    onClick={() =>
                      onUpdateStem(stem.id, stem.volume, stem.muted, !stem.solo)
                    }
                    className={`flex-1 py-1 rounded text-[11px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                      stem.solo
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                    }`}
                  >
                    <Disc className="w-3 h-3" />
                    SOLO
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Stem Master Summary */}
      <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 font-mono text-slate-300">
          <Layers className="w-4 h-4 text-cyan-400" />
          <span>활성 트랙 채널:</span>
          <span className="font-bold text-cyan-300">
            {stems.filter(s => !s.muted).length} / {stems.length} 채널 ON
          </span>
        </div>

        <div className="flex items-center gap-3 text-[11px] font-mono text-slate-400">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            실시간 32-bit Float 가산 합성 버스 연동
          </span>
        </div>
      </div>
    </div>
  );
};
