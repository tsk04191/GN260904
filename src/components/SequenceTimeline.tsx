import React from 'react';
import { PresetTrack } from '../types';
import { Clock, RefreshCw, Activity, SlidersHorizontal, Music2 } from 'lucide-react';

interface SequenceTimelineProps {
  track: PresetTrack;
  currentStep: number;
  bpm: number;
  onChangeBpm: (newBpm: number) => void;
  isPlaying: boolean;
}

export const SequenceTimeline: React.FC<SequenceTimelineProps> = ({
  track,
  currentStep,
  bpm,
  onChangeBpm,
  isPlaying,
}) => {
  const currentChord =
    track.pattern.harmonyChords[Math.floor(currentStep / 4)] || track.key;

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl backdrop-blur-md">
      {/* Title & BPM Control */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-800">
        <div>
          <h2 className="text-base font-black text-slate-100 flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-400" />
            트랙 구조 & 16-스텝 시퀀서 타임라인 (Timeline & Sequencer)
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            구조: Intro ({track.introDurationSec}s) → Main Theme/Loop ({track.loopDurationSec}s) → Outro ({track.exitDurationSec}s)
          </p>
        </div>

        {/* BPM Slider */}
        <div className="flex items-center gap-3 bg-slate-950 px-3.5 py-1.5 rounded-xl border border-slate-800">
          <SlidersHorizontal className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-mono font-bold text-slate-300">
            BPM: <span className="text-amber-400">{bpm}</span>
          </span>
          <input
            type="range"
            min="75"
            max="180"
            value={bpm}
            onChange={e => onChangeBpm(parseInt(e.target.value))}
            className="w-24 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
          />
        </div>
      </div>

      {/* 3-Part Track Structure Visualizer */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
        {/* Intro */}
        <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-300">1. Intro / Verse</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 text-slate-400">
              ~{track.introDurationSec}s
            </span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed mb-2">
            곡 도입부 및 빌드업. 리듬과 베이스라인이 시작되는 도입 구간.
          </p>
          <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full bg-amber-500 transition-all ${
                isPlaying ? 'w-full opacity-80' : 'w-0'
              }`}
            ></div>
          </div>
        </div>

        {/* Main Theme / Loop */}
        <div className="p-3.5 rounded-xl bg-slate-950/80 border border-cyan-500/30 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute -right-2 -top-2 w-16 h-16 bg-cyan-500/10 rounded-full blur-xl pointer-events-none"></div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
              <RefreshCw className={`w-3.5 h-3.5 ${isPlaying ? 'animate-spin' : ''}`} />
              2. Main Chorus / Loop
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
              ~{track.loopDurationSec}s ({track.loopMode === 'complete' ? '완결형' : '무한 루프'})
            </span>
          </div>
          <p className="text-[11px] text-slate-300 leading-relaxed mb-2">
            5개 스템 전체가 완벽한 조화를 이루며 폭발하는 클라이맥스 메인 테마 구간.
          </p>
          <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full bg-cyan-400 transition-all ${
                isPlaying ? 'w-full animate-pulse' : 'w-0'
              }`}
            ></div>
          </div>
        </div>

        {/* Outro */}
        <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-300">3. Outro / Climax</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 text-slate-400">
              ~{track.exitDurationSec}s
            </span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed mb-2">
            화음의 여운을 남기며 깔끔하게 종결되거나 페이드아웃되는 피날레 구간.
          </p>
          <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full bg-emerald-500 transition-all ${
                isPlaying ? 'w-full opacity-80' : 'w-0'
              }`}
            ></div>
          </div>
        </div>
      </div>

      {/* 16-Step Realtime Rhythm Playhead & Active Chord */}
      <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-bold text-slate-200">
              16-스텝 실시간 시퀀서 트래커 (Step Tracker)
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-mono font-bold text-pink-400 bg-pink-950/60 px-2 py-0.5 rounded border border-pink-700/50">
              CHORD: {currentChord}
            </span>
            <span className="text-[11px] font-mono text-cyan-400">
              STEP: {currentStep + 1} / 16
            </span>
          </div>
        </div>

        <div className="grid grid-cols-16 gap-1 md:gap-1.5">
          {Array.from({ length: 16 }).map((_, idx) => {
            const isCurrent = currentStep === idx && isPlaying;
            const isBeatHeader = idx % 4 === 0;

            return (
              <div
                key={idx}
                className={`h-9 rounded flex flex-col items-center justify-center font-mono text-[10px] transition-all ${
                  isCurrent
                    ? 'bg-cyan-500 text-slate-950 font-bold scale-105 shadow-md shadow-cyan-500/50'
                    : isBeatHeader
                    ? 'bg-slate-800 text-slate-200 border border-slate-700'
                    : 'bg-slate-900 text-slate-500 border border-slate-800'
                }`}
              >
                <span>{idx + 1}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
