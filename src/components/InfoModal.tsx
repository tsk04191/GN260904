import React from 'react';
import { X, Sparkles, Music, Layers, Download, Mic2, Disc, Sliders } from 'lucide-react';

interface InfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InfoModal: React.FC<InfoModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto shadow-2xl p-6 relative text-slate-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-100 transition-all cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-2 text-cyan-400 font-mono text-xs">
          <Sparkles className="w-4 h-4" />
          STUDIO ARCHITECTURE & STEM COMPOSITION GUIDE
        </div>

        <h2 className="text-xl font-black text-slate-100 mb-4">
          AI 음악 작곡 & 다중 스템 분리 스튜디오 가이드
        </h2>

        <div className="space-y-4 text-xs text-slate-300 leading-relaxed">
          {/* Section 1 */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
            <h3 className="font-bold text-sm text-cyan-300 mb-1 flex items-center gap-2">
              <Music className="w-4 h-4" />
              1. 다중 스템(Multi-Stem) 합성 원리
            </h3>
            <p className="text-slate-400">
              하나의 완성곡을 단일 오디오 파일로만 생성하는 것이 아니라, <strong>[드럼/비트, 베이스라인, 화음 코드, 신스 리드, 앰비언스/FX]</strong> 5개의 독립된 악기 채널(Stem)로 실시간 분리 합성합니다. 이를 통해 각 악기의 볼륨, 뮤트, 솔로 청음 및 DAW/게임 엔진으로의 개별 WAV 추출이 가능합니다.
            </p>
          </div>

          {/* Section 2 */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
            <h3 className="font-bold text-sm text-purple-300 mb-2 flex items-center gap-2">
              <Layers className="w-4 h-4" />
              2. 트랙 구조 및 옵션 (Intro → Main Loop → Outro)
            </h3>
            <ul className="space-y-1.5 text-slate-300 font-mono">
              <li>• <span className="text-amber-300 font-bold">Intro / Verse (~30s / ~5s)</span>: 빌드업 및 도입부.</li>
              <li>• <span className="text-cyan-300 font-bold">Main Loop / Chorus (~45s / ~20s)</span>: 메인 테마 및 5개 스템 풀 앙상블.</li>
              <li>• <span className="text-emerald-300 font-bold">Outro (~30s / ~5s)</span>: 여운과 페이드아웃의 피날레.</li>
              <li>• <span className="text-pink-300 font-bold">토글 옵션</span>: 풀버전 vs 30초 클립 / 무한 반복 루프 vs 완결곡 선택 지원.</li>
            </ul>
          </div>

          {/* Section 3 */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
            <h3 className="font-bold text-sm text-pink-300 mb-2 flex items-center gap-2">
              <Mic2 className="w-4 h-4" />
              3. 보컬 가사 (Lyrics) 자동 작사 & 커스텀 입력
            </h3>
            <p className="text-slate-400 mb-2">
              가사 옵션을 활성화하면 Gemini AI가 곡의 장르, 템포(BPM), 조성(Key)에 맞는 최적의 [Verse, Chorus, Bridge, Outro] 가사를 자동으로 작사하거나, 사용자가 직접 입력한 가사를 곡의 16스텝 시퀀서 리듬에 융합할 수 있습니다.
            </p>
          </div>

          {/* Section 4 */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
            <h3 className="font-bold text-sm text-emerald-300 mb-2 flex items-center gap-2">
              <Download className="w-4 h-4" />
              4. 스튜디오급 고음질 WAV 내보내기
            </h3>
            <p className="text-slate-400">
              Web Audio API 실시간 신디사이저 엔진을 통해 브라우저에서 직접 <strong>44.1kHz 16-Bit PCM WAV</strong> 형식으로 전체 마스터 트랙, 끊김 없는 심리스 루프, 그리고 5개 개별 스템 트랙을 다운로드할 수 있습니다.
            </p>
          </div>
        </div>

        <div className="mt-5 pt-3 border-t border-slate-800 text-right">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs cursor-pointer transition-all"
          >
            확인 및 닫기
          </button>
        </div>
      </div>
    </div>
  );
};
