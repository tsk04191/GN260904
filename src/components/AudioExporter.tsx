import React, { useState } from 'react';
import { PresetTrack, StemConfig, ExportProgress } from '../types';
import { globalSynthEngine } from '../audio/synthEngine';
import { Download, Music, Layers, CheckCircle2, Loader2, FileAudio, Disc } from 'lucide-react';

interface AudioExporterProps {
  track: PresetTrack;
  stems: StemConfig[];
}

export const AudioExporter: React.FC<AudioExporterProps> = ({ track, stems }) => {
  const [exportProgress, setExportProgress] = useState<ExportProgress>({
    isExporting: false,
    progressPercent: 0,
    currentTask: '',
  });

  const [downloadLogs, setDownloadLogs] = useState<string[]>([]);

  const handleDownloadFullSequence = async () => {
    try {
      setExportProgress({
        isExporting: true,
        progressPercent: 25,
        currentTask: '마스터 음원 렌더링 중 (Intro + Loop + Outro)...',
      });

      const duration = track.introDurationSec + track.loopDurationSec + track.exitDurationSec;
      const wavBlob = await globalSynthEngine.renderWavBuffer(duration, 'battle');

      setExportProgress({
        isExporting: true,
        progressPercent: 90,
        currentTask: 'WAV 44.1kHz 16-Bit PCM 헤더 작성 및 인코딩 완료!',
      });

      const url = URL.createObjectURL(wavBlob);
      const filename = `${track.title.replace(/\s+/g, '_')}_FullMaster.wav`;

      triggerDownload(url, filename);

      setDownloadLogs(prev => [
        `[${new Date().toLocaleTimeString()}] ${filename} (마스터 풀트랙 WAV) 다운로드 완료`,
        ...prev,
      ]);

      setExportProgress({
        isExporting: false,
        progressPercent: 100,
        currentTask: '다운로드 완료!',
      });
    } catch (err) {
      console.error(err);
      alert('오디오 다운로드 중 오류가 발생했습니다.');
      setExportProgress({ isExporting: false, progressPercent: 0, currentTask: '' });
    }
  };

  const handleDownloadLoop = async () => {
    try {
      setExportProgress({
        isExporting: true,
        progressPercent: 35,
        currentTask: '심리스 메인 루프 (Seamless Loop) WAV 합성 중...',
      });

      const duration = track.loopDurationSec;
      const wavBlob = await globalSynthEngine.renderWavBuffer(duration, 'battle');

      const url = URL.createObjectURL(wavBlob);
      const filename = `${track.title.replace(/\s+/g, '_')}_Main_Seamless_Loop.wav`;

      triggerDownload(url, filename);

      setDownloadLogs(prev => [
        `[${new Date().toLocaleTimeString()}] ${filename} (무한 루프 WAV) 다운로드 완료`,
        ...prev,
      ]);

      setExportProgress({
        isExporting: false,
        progressPercent: 100,
        currentTask: '다운로드 완료!',
      });
    } catch (err) {
      console.error(err);
      alert('루프 오디오 다운로드 오류');
      setExportProgress({ isExporting: false, progressPercent: 0, currentTask: '' });
    }
  };

  const handleDownloadIsolatedStem = async (stem: StemConfig) => {
    try {
      setExportProgress({
        isExporting: true,
        progressPercent: 30,
        currentTask: `${stem.koreanName} 개별 스템 WAV 렌더링 중...`,
      });

      const duration = track.loopDurationSec;
      const wavBlob = await globalSynthEngine.renderWavBuffer(duration, 'battle', stem.id);

      const url = URL.createObjectURL(wavBlob);
      const filename = `${track.title.replace(/\s+/g, '_')}_STEM_${stem.name.replace(/\s+/g, '_')}.wav`;

      triggerDownload(url, filename);

      setDownloadLogs(prev => [
        `[${new Date().toLocaleTimeString()}] ${filename} (개별 스템 WAV) 다운로드 완료`,
        ...prev,
      ]);

      setExportProgress({
        isExporting: false,
        progressPercent: 100,
        currentTask: '다운로드 완료!',
      });
    } catch (err) {
      console.error(err);
      alert('개별 스템 다운로드 오류');
      setExportProgress({ isExporting: false, progressPercent: 0, currentTask: '' });
    }
  };

  const triggerDownload = (url: string, filename: string) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl backdrop-blur-md">
      {/* Title */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
        <div>
          <h2 className="text-base font-black text-slate-100 flex items-center gap-2">
            <Download className="w-5 h-5 text-emerald-400" />
            음원 내보내기 & WAV 파일 다운로드 (Audio Exporter)
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            DAW, 게임 엔진(Unity / Unreal) 및 미디어 편집용 고음질 44.1kHz 16-bit PCM WAV 음원 및 개별 스템 추출
          </p>
        </div>
      </div>

      {/* Progress Bar (if exporting) */}
      {exportProgress.isExporting && (
        <div className="p-4 mb-5 rounded-xl bg-cyan-950/60 border border-cyan-500/40">
          <div className="flex items-center justify-between text-xs font-mono font-bold text-cyan-300 mb-2">
            <span className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
              {exportProgress.currentTask}
            </span>
            <span>{exportProgress.progressPercent}%</span>
          </div>
          <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden">
            <div
              className="h-full bg-cyan-400 transition-all duration-300"
              style={{ width: `${exportProgress.progressPercent}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* Download Options Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Option 1: Full Track Sequence */}
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between hover:border-emerald-500/40 transition-all">
          <div>
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm mb-1.5">
              <FileAudio className="w-4 h-4" />
              1. 전체 마스터 트랙 WAV
            </div>
            <p className="text-xs text-slate-400 leading-relaxed mb-4">
              Intro ({track.introDurationSec}s) → Main Loop ({track.loopDurationSec}s) → Outro ({track.exitDurationSec}s) 완성 음원
            </p>
          </div>
          <button
            onClick={handleDownloadFullSequence}
            disabled={exportProgress.isExporting}
            className="w-full py-2.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-950 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            전체 곡 WAV 다운로드 (~{track.introDurationSec + track.loopDurationSec + track.exitDurationSec}초)
          </button>
        </div>

        {/* Option 2: Seamless Main Loop */}
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between hover:border-cyan-500/40 transition-all">
          <div>
            <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm mb-1.5">
              <Music className="w-4 h-4" />
              2. 심리스 메인 루프 WAV
            </div>
            <p className="text-xs text-slate-400 leading-relaxed mb-4">
              클릭이나 끊김 없이 반복 재생되는 {track.loopDurationSec}초 Seamless Audio Loop 음원
            </p>
          </div>
          <button
            onClick={handleDownloadLoop}
            disabled={exportProgress.isExporting}
            className="w-full py-2.5 px-3 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-cyan-950 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            메인 루프 WAV 다운로드 (~{track.loopDurationSec}초)
          </button>
        </div>

        {/* Option 3: Isolated Stem WAVs */}
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between hover:border-purple-500/40 transition-all">
          <div>
            <div className="flex items-center gap-2 text-purple-400 font-bold text-sm mb-1.5">
              <Layers className="w-4 h-4" />
              3. 5개 분리 스템(Stem) 추출
            </div>
            <p className="text-xs text-slate-400 leading-relaxed mb-3">
              DAW 믹싱 및 게임 엔진용 개별 악기 트랙 분리 WAV
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {stems.map(stem => (
              <button
                key={stem.id}
                onClick={() => handleDownloadIsolatedStem(stem)}
                disabled={exportProgress.isExporting}
                className="py-1 px-2.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-200 font-mono text-[11px] border border-slate-800 flex items-center gap-1.5 cursor-pointer transition-all"
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: stem.color }}></span>
                {stem.koreanName}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Download History Log */}
      {downloadLogs.length > 0 && (
        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs">
          <div className="font-bold text-slate-300 font-mono mb-1.5 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            다운로드 기록 (Download History)
          </div>
          <div className="space-y-1 font-mono text-[11px] text-slate-400 max-h-24 overflow-y-auto">
            {downloadLogs.map((log, idx) => (
              <div key={idx}>{log}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
