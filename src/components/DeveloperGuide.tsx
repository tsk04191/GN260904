import React, { useState } from 'react';
import { Code, Copy, Check, Terminal, Cpu, FileCode2, Layers, Globe, Bot, Mic2 } from 'lucide-react';

interface DeveloperGuideProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DeveloperGuide: React.FC<DeveloperGuideProps> = ({ isOpen, onClose }) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const lyriaGptSystemPrompt = `[System Instructions for Custom GPT / AI Music & Stem Studio]
Website: https://lyria-ost-studio.tsk04191.chatgpt.site/

You are an expert AI Music Composer and Audio Engineer capable of creating multi-genre music compositions across EDM, Rock, Lo-Fi, Orchestral, and Cyberpunk styles.

When the user asks to compose music from reference songs, genres, or prompts, output a complete 5-Stem JSON structure and optional lyrics adhering to this specification:

{
  "title": "Neon Velocity",
  "bpm": 144,
  "key": "Fm",
  "scale": "minor",
  "genre": "Fast Electronic / Synthwave",
  "lyrics": "[Verse 1]\\nNeon lights glowing in the dark\\nRacing through the speed of sound...\\n\\n[Chorus]\\nBreak through the night, reach for the stars!",
  "stems": [
    { "id": "drums", "name": "Percussion & Kick", "category": "drums", "volume": 1.0 },
    { "id": "bass", "name": "Driving Sub & Saw Bass", "category": "bass", "volume": 1.0 },
    { "id": "harmony", "name": "Polyphonic Chord Pads", "category": "harmony", "volume": 0.9 },
    { "id": "lead", "name": "Main Synth Arp & Melody", "category": "lead", "volume": 0.85 },
    { "id": "atmos", "name": "Atmosphere & Sweep FX", "category": "atmos", "volume": 0.75 }
  ],
  "pattern": {
    "drumPattern": [
      [1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0], // Kick
      [0,0,1,0, 0,0,1,0, 0,0,1,0, 0,0,1,0], // Snare / Clap
      [1,1,1,1, 1,1,1,1, 1,1,1,1, 1,1,1,1], // Hi-Hat 16th
      [0,0,0,1, 0,0,0,1, 0,0,0,1, 0,0,0,1]  // Percussion FX
    ],
    "bassLine": [0, 0, 3, 3, 5, 5, 2, 2, 0, 0, 3, 3, 7, 7, 5, 5],
    "harmonyChords": ["Fm", "Db", "Eb", "C7"],
    "leadArp": [0, 3, 7, 10, 12, 10, 7, 3, 0, 3, 7, 12, 15, 12, 7, 3]
  }
}`;

  const htmlCanvasSnippet = `<!-- Embeddable Multi-Stem Web Audio Engine for https://lyria-ost-studio.tsk04191.chatgpt.site/ -->
<script>
class UniversalStemStudioEngine {
  constructor() {
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.8;
    this.masterGain.connect(this.ctx.destination);
    this.stems = {};
  }

  // Register stem channels with independent gain nodes
  registerStem(stemId, initialVol = 1.0) {
    const gainNode = this.ctx.createGain();
    gainNode.gain.value = initialVol;
    gainNode.connect(this.masterGain);
    this.stems[stemId] = { gainNode, isMuted: false, isSolo: false };
  }

  // Real-time Mixer Controls
  setStemVolume(stemId, volume) {
    if (this.stems[stemId]) {
      this.stems[stemId].gainNode.gain.setValueAtTime(volume, this.ctx.currentTime);
    }
  }

  setMute(stemId, muted) {
    if (this.stems[stemId]) {
      this.stems[stemId].isMuted = muted;
      this.stems[stemId].gainNode.gain.setValueAtTime(muted ? 0 : 1, this.ctx.currentTime);
    }
  }
}
</script>`;

  const apiCurlSnippet = `// REST API Endpoint for Music & Multi-Stem Generation
POST /api/generate-ost
Content-Type: application/json

{
  "referenceType": "game_or_song",
  "referenceInput": "Cyberpunk 2077 - The Rebel Path",
  "userPrompt": "144 BPM fast driving electronic synthwave with catchy vocal hook",
  "durationOption": "full", // "full" (~105s) or "clip_30s" (~30s)
  "loopOption": "loop",     // "loop" (seamless) or "complete" (standalone)
  "lyricsOption": "lyrics", // "instrumental" or "lyrics"
  "lyricsGenerationMode": "auto"
}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full max-h-[88vh] overflow-y-auto shadow-2xl p-6 relative text-slate-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-100 transition-all cursor-pointer"
        >
          ✕
        </button>

        <div className="flex items-center gap-2 mb-2 text-cyan-400 font-mono text-xs">
          <Terminal className="w-4 h-4" />
          DEVELOPER API & SYSTEM INTEGRATION SPECIFICATION
        </div>

        <h2 className="text-xl font-black text-slate-100 mb-2 flex items-center gap-2">
          <Globe className="w-5 h-5 text-cyan-400" />
          외부 사이트 및 ChatGPT 연동 개발자 가이드
        </h2>

        <p className="text-xs text-slate-400 mb-5">
          <a
            href="https://lyria-ost-studio.tsk04191.chatgpt.site/"
            target="_blank"
            rel="noreferrer"
            className="text-cyan-400 underline font-mono hover:text-cyan-300"
          >
            https://lyria-ost-studio.tsk04191.chatgpt.site/
          </a> 및 외부 앱에 동일한 다중 스템 음악 생성 엔진을 탑재하는 연동 명세입니다.
        </p>

        <div className="space-y-6 text-xs">
          {/* Section 1: ChatGPT Prompt */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 font-bold text-slate-200">
                <Bot className="w-4 h-4 text-cyan-400" />
                1. Custom GPT 시스템 프롬프트 (System Instruction)
              </div>
              <button
                onClick={() => copyToClipboard(lyriaGptSystemPrompt, 'gpt')}
                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 text-[11px] font-mono flex items-center gap-1 cursor-pointer"
              >
                {copiedKey === 'gpt' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                {copiedKey === 'gpt' ? '복사됨!' : '프롬프트 복사'}
              </button>
            </div>
            <pre className="p-3 bg-slate-900 rounded-lg text-slate-300 font-mono text-[11px] overflow-x-auto leading-relaxed border border-slate-800">
              {lyriaGptSystemPrompt}
            </pre>
          </div>

          {/* Section 2: REST API Call */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 font-bold text-slate-200">
                <FileCode2 className="w-4 h-4 text-pink-400" />
                2. 다중 스템 및 가사 생성 API 요청 (REST Endpoint)
              </div>
              <button
                onClick={() => copyToClipboard(apiCurlSnippet, 'api')}
                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-pink-300 text-[11px] font-mono flex items-center gap-1 cursor-pointer"
              >
                {copiedKey === 'api' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                {copiedKey === 'api' ? '복사됨!' : '요청 JSON 복사'}
              </button>
            </div>
            <pre className="p-3 bg-slate-900 rounded-lg text-pink-300 font-mono text-[11px] overflow-x-auto leading-relaxed border border-slate-800">
              {apiCurlSnippet}
            </pre>
          </div>

          {/* Section 3: WebAudio Engine */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 font-bold text-slate-200">
                <Cpu className="w-4 h-4 text-emerald-400" />
                3. 웹 오디오 스템 플레이어 엔진 스니펫 (WebAudio JS)
              </div>
              <button
                onClick={() => copyToClipboard(htmlCanvasSnippet, 'code')}
                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-emerald-300 text-[11px] font-mono flex items-center gap-1 cursor-pointer"
              >
                {copiedKey === 'code' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                {copiedKey === 'code' ? '복사됨!' : '코드 복사'}
              </button>
            </div>
            <pre className="p-3 bg-slate-900 rounded-lg text-emerald-300 font-mono text-[11px] overflow-x-auto leading-relaxed border border-slate-800">
              {htmlCanvasSnippet}
            </pre>
          </div>
        </div>

        <div className="mt-5 pt-3 border-t border-slate-800 text-right">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs cursor-pointer transition-all"
          >
            가이드 닫기
          </button>
        </div>
      </div>
    </div>
  );
};
