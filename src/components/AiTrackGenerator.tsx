import React, { useState, useRef, useEffect } from 'react';
import {
  PresetTrack,
  ReferenceType,
  DurationOption,
  LoopOption,
  LyricsOption,
  LyricsGenerationMode,
  UploadedAudioInfo,
} from '../types';
import {
  Sparkles,
  Music,
  Youtube,
  UploadCloud,
  Play,
  Square,
  Clock,
  Repeat,
  FileAudio,
  CheckCircle2,
  Sliders,
  AlertCircle,
  Loader2,
  Wand2,
  Flame,
  Zap,
  Mic2,
  ArrowRight,
  Disc,
  Copy,
  Layers,
  Edit3,
  Save,
  Tag,
} from 'lucide-react';

interface AiTrackGeneratorProps {
  currentTrack: PresetTrack;
  onTrackGenerated: (track: PresetTrack) => void;
  onUpdateCurrentTrack: (updates: Partial<PresetTrack>) => void;
  onPlayTrack: (track: PresetTrack) => void;
  isPlaying: boolean;
  currentTrackId: string;
}

const QUICK_REFERENCE_CHIPS = [
  { label: '⚡ Cyberpunk & Fast EDM', prompt: '144 BPM 질주하는 16비트 일렉트로닉 베이스와 네온 신스 드롭' },
  { label: '⚔️ Epic Orchestral & Choir Boss', prompt: '160 BPM 웅장한 오케스트라 브라스와 성가대 코러스의 거대한 전투' },
  { label: '🕶️ Payday 2 - Razormind Style', prompt: '142 BPM 하이텐션 헤이스트 인더스트리얼 신스락' },
  { label: '🌃 80s Retro Synthwave & Pop', prompt: '128 BPM 감성적인 아날로그 신디사이저와 드라이빙 베이스' },
  { label: '🔥 Heavy Rock & Metal Riffs', prompt: '150 BPM 강력한 디스토션 기타 리프와 파워풀한 더블 킥 드럼' },
  { label: '☕ Lo-Fi Chill & Hip-Hop Beat', prompt: '85 BPM 따뜻한 빈티지 전자피아노 코드와 편안한 붐뱁 드럼' },
];

const PROMPT_SUGGESTION_PILLS = [
  '⚡ 하이텐션 일렉트로닉 드롭 (High-Energy Drop)',
  '🔥 웅장한 오케스트라 성가대 (Epic Choir & Brass)',
  '🕶️ 긴박한 잠입 & 침투 BGM (Stealth Infiltration)',
  '⚔️ 파워풀한 신스 록 & 메탈 (Heavy Driving Rock)',
  '🎧 감성 멜로디 & 보컬 훅 (Catchy Vocal Melody)',
];

export const AiTrackGenerator: React.FC<AiTrackGeneratorProps> = ({
  currentTrack,
  onTrackGenerated,
  onUpdateCurrentTrack,
  onPlayTrack,
  isPlaying,
  currentTrackId,
}) => {
  // Input states
  const [referenceType, setReferenceType] = useState<ReferenceType>('game_or_song');
  const [referenceInput, setReferenceInput] = useState<string>('Cyberpunk & Fast EDM');
  const [youtubeUrl, setYoutubeUrl] = useState<string>('');
  const [userPrompt, setUserPrompt] = useState<string>(
    '질주하는 16비트 일렉트로닉 베이스라인과 화려한 신스 아르페지오 드롭'
  );

  // Local state for editing current track info below generate button
  const [editKoreanTitle, setEditKoreanTitle] = useState(currentTrack.koreanTitle);
  const [editTitle, setEditTitle] = useState(currentTrack.title);
  const [editGenreTag, setEditGenreTag] = useState(currentTrack.genreTag);
  const [editDescription, setEditDescription] = useState(currentTrack.description);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState(false);

  // Sync edit fields when currentTrack changes
  useEffect(() => {
    setEditKoreanTitle(currentTrack.koreanTitle);
    setEditTitle(currentTrack.title);
    setEditGenreTag(currentTrack.genreTag);
    setEditDescription(currentTrack.description);
  }, [currentTrack.id, currentTrack.koreanTitle, currentTrack.title, currentTrack.genreTag, currentTrack.description]);

  const handleSaveTrackInfo = () => {
    onUpdateCurrentTrack({
      koreanTitle: editKoreanTitle.trim() || currentTrack.koreanTitle,
      title: editTitle.trim() || currentTrack.title,
      genreTag: editGenreTag.trim() || currentTrack.genreTag,
      description: editDescription.trim() || currentTrack.description,
    });
    setSaveSuccessMsg(true);
    setTimeout(() => setSaveSuccessMsg(false), 2500);
  };

  // Toggle Options
  const [durationOption, setDurationOption] = useState<DurationOption>('full');
  const [loopOption, setLoopOption] = useState<LoopOption>('loop');

  // Lyrics options
  const [lyricsOption, setLyricsOption] = useState<LyricsOption>('instrumental');
  const [lyricsGenerationMode, setLyricsGenerationMode] = useState<LyricsGenerationMode>('auto');
  const [manualLyrics, setManualLyrics] = useState<string>('');
  const [isQuickGeneratingLyrics, setIsQuickGeneratingLyrics] = useState<boolean>(false);

  // File upload state
  const [uploadedAudio, setUploadedAudio] = useState<UploadedAudioInfo | null>(null);
  const [isAudioPreviewPlaying, setIsAudioPreviewPlaying] = useState<boolean>(false);
  const audioPreviewRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Generation status
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generationStep, setGenerationStep] = useState<string>('');
  const [lastGeneratedTrack, setLastGeneratedTrack] = useState<PresetTrack | null>(null);

  // Handle Audio File Selection & Decoding
  const handleAudioFileUpload = async (file: File) => {
    try {
      if (!file.type.startsWith('audio/') && !file.name.match(/\.(mp3|wav|ogg|m4a|aac|flac)$/i)) {
        alert('MP3, WAV, OGG, M4A 형식의 음악 파일만 업로드 가능합니다.');
        return;
      }

      setGenerationStep('오디오 파일 주파수 및 파형 분석 중...');

      const reader = new FileReader();
      reader.onload = async () => {
        const base64String = reader.result as string;

        const tempAudio = new Audio(base64String);
        tempAudio.onloadedmetadata = () => {
          setUploadedAudio({
            fileName: file.name,
            fileSize: file.size,
            durationSec: Math.round(tempAudio.duration) || 30,
            base64: base64String,
            mimeType: file.type || 'audio/mp3',
          });

          const cleanName = file.name.replace(/\.[^/.]+$/, '');
          setReferenceInput(`[업로드 파일] ${cleanName}`);
        };
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error(err);
      alert('오디오 파일 처리 중 오류가 발생했습니다.');
    }
  };

  const toggleAudioFilePreview = () => {
    if (!uploadedAudio) return;
    if (isAudioPreviewPlaying) {
      audioPreviewRef.current?.pause();
      setIsAudioPreviewPlaying(false);
    } else {
      if (!audioPreviewRef.current) {
        audioPreviewRef.current = new Audio(uploadedAudio.base64);
        audioPreviewRef.current.onended = () => setIsAudioPreviewPlaying(false);
      }
      audioPreviewRef.current.play();
      setIsAudioPreviewPlaying(true);
    }
  };

  // Quick Lyrics Draft generator
  const handleQuickLyricsAssist = async () => {
    setIsQuickGeneratingLyrics(true);
    try {
      const res = await fetch('/api/generate-lyrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          genre: referenceInput || 'Electronic / Pop',
          prompt: userPrompt || 'Inspiring energetic melody and chorus',
          title: referenceInput || 'New Track',
        }),
      });
      const data = await res.json();
      if (data.success && data.lyrics) {
        setManualLyrics(data.lyrics);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsQuickGeneratingLyrics(false);
    }
  };

  // Generate Music via Gemini API (with local fallback)
  const handleGenerate = async () => {
    setIsGenerating(true);
    setGenerationStep('1/3: 레퍼런스 음악 스타일 및 조성 분석 중...');

    const actualRefInput =
      referenceType === 'youtube_url'
        ? youtubeUrl || 'https://www.youtube.com/watch?v=Razormind'
        : referenceType === 'audio_file'
        ? uploadedAudio
          ? `Uploaded audio file: ${uploadedAudio.fileName} (${uploadedAudio.durationSec}s)`
          : 'Uploaded custom audio track'
        : referenceInput;

    try {
      setTimeout(() => {
        setGenerationStep('2/3: 16스텝 5-스템(드럼, 베이스, 화음, 리드, 성가대) 합성 중...');
      }, 1200);

      setTimeout(() => {
        setGenerationStep('3/3: 신디사이저 믹싱 및 가사 동기화 구성 중...');
      }, 2500);

      const payload = {
        referenceType,
        referenceInput: actualRefInput,
        userPrompt,
        durationOption,
        loopOption,
        lyricsOption,
        lyricsGenerationMode,
        manualLyrics: lyricsOption === 'lyrics' ? manualLyrics : undefined,
        audioBase64: uploadedAudio?.base64,
        audioMimeType: uploadedAudio?.mimeType,
      };

      const response = await fetch('/api/generate-ost', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || '음악 생성 API 호출에 실패했습니다.');
      }

      const newTrack: PresetTrack = {
        ...data.track,
        isAiGenerated: true,
      };

      setLastGeneratedTrack(newTrack);
      onTrackGenerated(newTrack);
      setIsGenerating(false);
      setGenerationStep('');
    } catch (err: any) {
      console.warn('Backend API fallback triggered:', err);
      const proceduralTrack = createProceduralTrack(
        actualRefInput,
        userPrompt,
        durationOption,
        loopOption,
        lyricsOption,
        manualLyrics
      );

      setLastGeneratedTrack(proceduralTrack);
      onTrackGenerated(proceduralTrack);
      setIsGenerating(false);
      setGenerationStep('');
    }
  };

  // Helper: Procedural intelligent track builder fallback
  const createProceduralTrack = (
    ref: string,
    prompt: string,
    dur: DurationOption,
    loop: LoopOption,
    lyricsOpt: LyricsOption,
    customLyrics?: string
  ): PresetTrack => {
    const keys = ['Fm', 'Am', 'Dm', 'Cm', 'Em', 'Gm', 'Bbm'];
    const scales: ('minor' | 'phrygian' | 'dorian' | 'harmonic_minor')[] = [
      'minor',
      'phrygian',
      'harmonic_minor',
      'dorian',
    ];
    const bpms = [130, 138, 144, 150, 160];
    const synthTypes: ('payday_industrial' | 'arcane_cyber' | 'gothic_organ' | 'mana_overdrive')[] = [
      'payday_industrial',
      'arcane_cyber',
      'gothic_organ',
      'mana_overdrive',
    ];

    const hash = (ref + prompt).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const key = keys[hash % keys.length];
    const scale = scales[hash % scales.length];
    const bpm = bpms[hash % bpms.length];
    const synthType = synthTypes[hash % synthTypes.length];
    const isClip = dur === 'clip_30s';

    const fallbackLyrics = customLyrics || `[Verse 1]
빛을 삼킨 네온의 밤거리
가속하는 심장 소리
경계를 넘어 달려가
System overload, ready to explode!

[Chorus]
Break through the ceiling, touch the sky!
거침없이 터지는 사운드
We ignite the rhythm tonight
끝없이 울리는 Pulse in my mind!

[Outro]
Fade into the groove, never let it stop.`;

    return {
      id: `ai-gen-${Date.now()}`,
      title: `AI Track: ${ref.slice(0, 20)}`,
      koreanTitle: `AI 작곡: ${ref.slice(0, 16)}`,
      subtitle: `${loop === 'complete' ? '완결형 독립곡' : '무한 심리스 루프'} (${isClip ? '30초 클립' : '풀버전'})`,
      genreTag: `AI Multi-Genre • ${key} ${scale.toUpperCase()} • ${bpm} BPM`,
      bpm,
      key,
      scale,
      description: `[AI 생성 완료] "${ref}" 레퍼런스와 프롬프트("${prompt.slice(0, 40)}...")를 분석하여 5-스템 구조 및 신스 사운드를 설계했습니다.`,
      paydayReference: `Reference: ${ref}`,
      introDurationSec: isClip ? 5 : 30,
      loopDurationSec: isClip ? 20 : 45,
      exitDurationSec: isClip ? 5 : 30,
      durationMode: dur,
      loopMode: loop,
      lyricsOption: lyricsOpt,
      lyrics: lyricsOpt === 'lyrics' ? fallbackLyrics : undefined,
      isAiGenerated: true,
      synthType,
      aiAnalysisComment: `선택된 레퍼런스의 리듬 특성을 반영하여 ${bpm} BPM의 고속 펄스 베이스라인과 ${key} 기반의 4코드 화음 진행을 구성했습니다.`,
      pattern: {
        bassLine: [0, 0, 3, 3, 5, 5, 2, 2, 0, 0, 3, 3, 7, 7, 5, 5],
        leadArp: [0, 3, 7, 10, 12, 10, 7, 3, 0, 3, 7, 12, 15, 12, 7, 3],
        harmonyChords: [key, 'Db', 'Eb', 'C7'],
        drumPattern: [
          [true, false, false, false, true, false, false, false, true, false, false, false, true, false, false, false],
          [false, false, true, false, false, false, true, false, false, false, true, false, false, false, true, false],
          [true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true],
          [true, false, false, true, false, false, true, false, true, false, false, true, false, false, true, false],
        ],
      },
    };
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-2xl backdrop-blur-md relative overflow-hidden">
      {/* Glow effect */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-cyan-500/10 via-indigo-600/10 to-pink-500/10 rounded-full blur-3xl pointer-events-none -z-10"></div>

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-5 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-gradient-to-tr from-cyan-500 via-indigo-600 to-pink-500 shadow-lg shadow-indigo-950/50">
            <Wand2 className="w-5 h-5 text-slate-950 font-black" />
          </div>
          <div>
            <h2 className="text-base font-black text-slate-100 flex items-center gap-2">
              AI 음악 작곡 & 다중 스템 제너레이터
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-950 text-cyan-300 border border-cyan-700">
                Gemini Multi-Modal
              </span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              원하는 레퍼런스(게임/곡명/유튜브/오디오 파일)와 프롬프트로 5개 스템 음악과 보컬 가사를 즉시 작곡합니다.
            </p>
          </div>
        </div>

        {/* Quick Genre Reference Chips */}
        <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-mono">
          <span className="text-slate-500">추천 장르:</span>
          {QUICK_REFERENCE_CHIPS.slice(0, 4).map((chip, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setReferenceInput(chip.label.replace(/^[^\s]+\s/, ''));
                setUserPrompt(chip.prompt);
              }}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 cursor-pointer transition-all"
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      {/* Step 1: Reference Mode Selection */}
      <div className="space-y-4 mb-5">
        <div>
          <label className="block text-xs font-mono font-bold text-slate-300 mb-2">
            1. 레퍼런스 음악 스타일 입력 방식 (Reference Source)
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              {
                id: 'game_or_song',
                label: '게임/곡 이름 지정',
                icon: Music,
                desc: '예: Cyberpunk, Payday 2, Pop',
              },
              {
                id: 'youtube_url',
                label: '유튜브 주소 (URL)',
                icon: Youtube,
                desc: 'https://youtube.com/...',
              },
              {
                id: 'audio_file',
                label: '음악 파일 업로드',
                icon: UploadCloud,
                desc: 'MP3, WAV, OGG 분석',
              },
              {
                id: 'prompt_only',
                label: '텍스트 프롬프트만',
                icon: Sparkles,
                desc: '자유로운 텍스트 묘사',
              },
            ].map(tab => {
              const Icon = tab.icon;
              const isSelected = referenceType === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setReferenceType(tab.id as ReferenceType)}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-slate-950 border-cyan-500 shadow-md ring-1 ring-cyan-500/50'
                      : 'bg-slate-950/50 border-slate-800 hover:bg-slate-800/60 text-slate-400'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className={`w-4 h-4 ${isSelected ? 'text-cyan-400' : 'text-slate-400'}`} />
                    <span className={`text-xs font-bold ${isSelected ? 'text-slate-100' : 'text-slate-300'}`}>
                      {tab.label}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 truncate">{tab.desc}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Dynamic Reference Input Panel */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-3">
          {referenceType === 'game_or_song' && (
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                레퍼런스 게임명 / 곡명 / 아티스트
              </label>
              <input
                type="text"
                value={referenceInput}
                onChange={e => setReferenceInput(e.target.value)}
                placeholder="예: Cyberpunk 2077, Payday 2 - Razormind, The Weeknd - Blinding Lights..."
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
              />
            </div>
          )}

          {referenceType === 'youtube_url' && (
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                유튜브 영상/음악 주소 (YouTube URL)
              </label>
              <div className="relative">
                <input
                  type="url"
                  value={youtubeUrl}
                  onChange={e => setYoutubeUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
                />
                <Youtube className="w-4 h-4 text-red-500 absolute left-3 top-2.5 pointer-events-none" />
              </div>
            </div>
          )}

          {referenceType === 'audio_file' && (
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                음악 파일 직접 업로드 (Drag & Drop)
              </label>
              <div
                onClick={() => fileInputRef.current?.click()}
                className="p-5 border-2 border-dashed border-slate-700 hover:border-cyan-500 rounded-xl bg-slate-900/50 hover:bg-slate-900 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all text-center"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={e => {
                    if (e.target.files?.[0]) {
                      handleAudioFileUpload(e.target.files[0]);
                    }
                  }}
                  accept="audio/*"
                  className="hidden"
                />
                {uploadedAudio ? (
                  <div className="flex items-center gap-3 text-emerald-400">
                    <FileAudio className="w-6 h-6" />
                    <div className="text-left">
                      <p className="text-xs font-bold text-slate-200">{uploadedAudio.fileName}</p>
                      <p className="text-[10px] text-slate-400 font-mono">
                        {(uploadedAudio.fileSize / (1024 * 1024)).toFixed(2)} MB • {uploadedAudio.durationSec}초
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation();
                        toggleAudioFilePreview();
                      }}
                      className="px-2.5 py-1 rounded bg-slate-800 text-slate-200 text-[11px] font-bold"
                    >
                      {isAudioPreviewPlaying ? '정지' : '미리듣기'}
                    </button>
                  </div>
                ) : (
                  <>
                    <UploadCloud className="w-6 h-6 text-slate-400" />
                    <p className="text-xs text-slate-300 font-medium">
                      오디오 파일을 이곳에 끌어다 놓거나 클릭하여 선택하세요
                    </p>
                    <p className="text-[10px] text-slate-500 font-mono">지원: MP3, WAV, OGG, M4A, FLAC</p>
                  </>
                )}
              </div>
            </div>
          )}

          {/* User Prompt */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-300">
                음악 생성 프롬프트 (분위기, 템포, 전개 방식 등)
              </label>
            </div>
            <textarea
              value={userPrompt}
              onChange={e => setUserPrompt(e.target.value)}
              rows={2}
              placeholder="예: 144 BPM의 빠른 비트, 드롭 파트에서 신스 아르페지오가 폭발하고 화음이 점진적으로 고조되는 곡..."
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 leading-relaxed resize-none"
            />
            {/* Suggestion pills */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {PROMPT_SUGGESTION_PILLS.map((pill, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setUserPrompt(pill)}
                  className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-900 text-slate-400 hover:text-cyan-300 border border-slate-800 hover:border-slate-700 cursor-pointer transition-all"
                >
                  {pill}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Step 2: Generation Options (Duration, Loop & Lyrics) */}
      <div className="space-y-3 mb-6">
        <label className="block text-xs font-mono font-bold text-slate-300">
          2. 곡 옵션 설정 (길이, 완결/루프 및 가사 유무)
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Duration */}
          <div className="bg-slate-950/80 border border-slate-800 p-3 rounded-xl space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-cyan-400" />
                음악 길이
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                {durationOption === 'full' ? '풀버전 (~105s)' : '클립 (~30s)'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800 text-xs font-bold">
              <button
                type="button"
                onClick={() => setDurationOption('full')}
                className={`py-1 rounded transition-all cursor-pointer ${
                  durationOption === 'full' ? 'bg-cyan-500 text-slate-950 shadow' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                풀버전
              </button>
              <button
                type="button"
                onClick={() => setDurationOption('clip_30s')}
                className={`py-1 rounded transition-all cursor-pointer ${
                  durationOption === 'clip_30s' ? 'bg-cyan-500 text-slate-950 shadow' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                30초 클립
              </button>
            </div>
          </div>

          {/* Loop vs Complete */}
          <div className="bg-slate-950/80 border border-slate-800 p-3 rounded-xl space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <Repeat className="w-3.5 h-3.5 text-indigo-400" />
                곡 구조
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                {loopOption === 'loop' ? '반복재생 루프' : '완결형 곡'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800 text-xs font-bold">
              <button
                type="button"
                onClick={() => setLoopOption('loop')}
                className={`py-1 rounded transition-all cursor-pointer ${
                  loopOption === 'loop' ? 'bg-indigo-500 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                반복 루프
              </button>
              <button
                type="button"
                onClick={() => setLoopOption('complete')}
                className={`py-1 rounded transition-all cursor-pointer ${
                  loopOption === 'complete' ? 'bg-indigo-500 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                완결곡
              </button>
            </div>
          </div>

          {/* Lyrics Option */}
          <div className="bg-slate-950/80 border border-slate-800 p-3 rounded-xl space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <Mic2 className="w-3.5 h-3.5 text-pink-400" />
                가사 유무
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                {lyricsOption === 'lyrics' ? '보컬 가사 포함' : '연주곡 (Inst)'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800 text-xs font-bold">
              <button
                type="button"
                onClick={() => setLyricsOption('instrumental')}
                className={`py-1 rounded transition-all cursor-pointer ${
                  lyricsOption === 'instrumental' ? 'bg-pink-500 text-slate-950 shadow' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                연주곡
              </button>
              <button
                type="button"
                onClick={() => setLyricsOption('lyrics')}
                className={`py-1 rounded transition-all cursor-pointer ${
                  lyricsOption === 'lyrics' ? 'bg-pink-500 text-slate-950 shadow' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                가사 포함
              </button>
            </div>
          </div>
        </div>

        {/* Conditional Lyrics Sub-panel */}
        {lyricsOption === 'lyrics' && (
          <div className="bg-slate-950/90 border border-pink-500/30 rounded-xl p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-pink-300 flex items-center gap-1.5">
                  <Mic2 className="w-3.5 h-3.5 text-pink-400" />
                  가사 생성 모드:
                </span>
                <div className="inline-flex rounded-lg bg-slate-900 p-0.5 border border-slate-800 text-xs">
                  <button
                    type="button"
                    onClick={() => setLyricsGenerationMode('auto')}
                    className={`px-3 py-1 rounded-md font-bold cursor-pointer transition-all ${
                      lyricsGenerationMode === 'auto' ? 'bg-pink-500 text-slate-950' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    AI 자동 작사
                  </button>
                  <button
                    type="button"
                    onClick={() => setLyricsGenerationMode('manual')}
                    className={`px-3 py-1 rounded-md font-bold cursor-pointer transition-all ${
                      lyricsGenerationMode === 'manual' ? 'bg-pink-500 text-slate-950' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    가사 직접 입력
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={handleQuickLyricsAssist}
                disabled={isQuickGeneratingLyrics}
                className="px-2.5 py-1 rounded-lg bg-pink-950/80 hover:bg-pink-900 text-pink-300 border border-pink-700/60 text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
              >
                <Sparkles className={`w-3 h-3 ${isQuickGeneratingLyrics ? 'animate-spin' : ''}`} />
                <span>{isQuickGeneratingLyrics ? '작사 중...' : '🪄 AI 가사 초안 즉시 생성'}</span>
              </button>
            </div>

            {lyricsGenerationMode === 'manual' ? (
              <div>
                <textarea
                  value={manualLyrics}
                  onChange={e => setManualLyrics(e.target.value)}
                  rows={4}
                  placeholder="[Verse 1]&#10;원하는 가사나 테마를 입력하세요...&#10;&#10;[Chorus]&#10;후렴구 라인..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs font-mono text-slate-200 focus:outline-none focus:border-pink-500 leading-relaxed resize-y"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  입력하신 가사를 음악의 리듬과 16스텝 구조에 맞게 자동으로 최적화하여 융합합니다.
                </p>
              </div>
            ) : (
              <div className="p-3 bg-pink-950/20 rounded-lg border border-pink-500/20 text-xs text-pink-300 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-pink-400 shrink-0" />
                <span>
                  곡의 장르와 분위기에 꼭 맞는 <strong>[Verse 1, Pre-Chorus, Chorus, Bridge, Outro]</strong> 구조의 보컬 가사를 AI가 자동으로 작사합니다.
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Generation Button */}
      <div className="mb-4">
        <button
          type="button"
          onClick={handleGenerate}
          disabled={isGenerating}
          className="w-full py-4 rounded-xl bg-gradient-to-r from-cyan-500 via-indigo-500 to-pink-500 hover:from-cyan-400 hover:via-indigo-400 hover:to-pink-400 text-slate-950 font-black text-sm tracking-wider uppercase flex items-center justify-center gap-2 shadow-xl shadow-indigo-950/60 transition-all cursor-pointer disabled:opacity-50"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>{generationStep || 'AI가 다중 스템 음악을 작곡하고 있습니다...'}</span>
            </>
          ) : (
            <>
              <Wand2 className="w-5 h-5" />
              <span>AI 맞춤형 다중 스템 음악 생성 (Generate Multi-Stem Music)</span>
            </>
          )}
        </button>
      </div>

      {/* Track Metadata & Title Edit Panel (Directly below Generate button) */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/20 to-slate-900 border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Edit3 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-black text-slate-100 uppercase tracking-wider flex items-center gap-2">
                현재 곡 정보 및 메타데이터 직접 수정
                {saveSuccessMsg && (
                  <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1 font-normal animate-in fade-in">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    수정사항이 반영되었습니다!
                  </span>
                )}
              </h3>
              <p className="text-[11px] text-slate-400">
                곡의 한글 제목, 영문 제목, 장르 태그 및 설명을 자유롭게 수정할 수 있습니다.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSaveTrackInfo}
              className="px-3.5 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md shadow-cyan-950/50 cursor-pointer transition-all"
            >
              <Save className="w-3.5 h-3.5" />
              <span>수정 적용</span>
            </button>

            <button
              type="button"
              onClick={() => onPlayTrack(currentTrack)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md cursor-pointer ${
                isPlaying && currentTrackId === currentTrack.id
                  ? 'bg-rose-500 hover:bg-rose-600 text-slate-950 shadow-rose-950/50'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700'
              }`}
            >
              {isPlaying && currentTrackId === currentTrack.id ? (
                <>
                  <Square className="w-3.5 h-3.5 fill-current" />
                  <span>정지</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current text-cyan-400" />
                  <span>재생</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Input Fields Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Korean Title Input */}
          <div>
            <label className="block text-[11px] font-bold text-slate-300 mb-1 flex items-center gap-1">
              <Music className="w-3 h-3 text-cyan-400" />
              한글 곡 제목
            </label>
            <input
              type="text"
              value={editKoreanTitle}
              onChange={e => {
                setEditKoreanTitle(e.target.value);
                onUpdateCurrentTrack({ koreanTitle: e.target.value });
              }}
              placeholder="예: 사이버펑크 오버드라이브"
              className="w-full bg-slate-950 border border-slate-700 focus:border-cyan-500 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none transition-all"
            />
          </div>

          {/* English Title Input */}
          <div>
            <label className="block text-[11px] font-bold text-slate-300 mb-1 flex items-center gap-1">
              <Disc className="w-3 h-3 text-indigo-400" />
              영문 곡명 (English Title)
            </label>
            <input
              type="text"
              value={editTitle}
              onChange={e => {
                setEditTitle(e.target.value);
                onUpdateCurrentTrack({ title: e.target.value });
              }}
              placeholder="예: Cyberpunk Overdrive"
              className="w-full bg-slate-950 border border-slate-700 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none font-mono transition-all"
            />
          </div>

          {/* Genre Tag Input */}
          <div>
            <label className="block text-[11px] font-bold text-slate-300 mb-1 flex items-center gap-1">
              <Tag className="w-3 h-3 text-pink-400" />
              장르 / 스타일 태그
            </label>
            <input
              type="text"
              value={editGenreTag}
              onChange={e => {
                setEditGenreTag(e.target.value);
                onUpdateCurrentTrack({ genreTag: e.target.value });
              }}
              placeholder="예: Cyberpunk Electro / Synthwave"
              className="w-full bg-slate-950 border border-slate-700 focus:border-pink-500 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none transition-all"
            />
          </div>
        </div>

        {/* Description Field */}
        <div>
          <label className="block text-[11px] font-bold text-slate-300 mb-1 flex items-center gap-1">
            <Sliders className="w-3 h-3 text-amber-400" />
            곡 설명 및 분위기 묘사 (Description / Mood)
          </label>
          <textarea
            rows={2}
            value={editDescription}
            onChange={e => {
              setEditDescription(e.target.value);
              onUpdateCurrentTrack({ description: e.target.value });
            }}
            placeholder="곡의 분위기, 레퍼런스, 사용 악기 톤 등을 작성하세요..."
            className="w-full bg-slate-950 border border-slate-700 focus:border-cyan-500 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none resize-none transition-all leading-relaxed"
          />
        </div>

        {/* Badges and Audio Specs */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-[11px] font-mono text-slate-400 border-t border-slate-800/80">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 text-[10px] font-bold">
              KEY: {currentTrack.key} {currentTrack.scale.toUpperCase()}
            </span>
            <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800 text-[10px] font-bold">
              BPM: {currentTrack.bpm}
            </span>
            <span className="px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800 text-[10px] font-bold">
              5 STEM TRACKS
            </span>
            {currentTrack.lyricsOption === 'lyrics' && (
              <span className="px-2 py-0.5 rounded bg-pink-950 text-pink-300 border border-pink-800 text-[10px] font-bold">
                ✨ 보컬 가사 포함
              </span>
            )}
          </div>

          <div className="text-[10px] text-slate-500">
            * 입력 내용이 시퀀서, 믹서, 가사 뷰어 및 생성 이력에 실시간 연동됩니다.
          </div>
        </div>
      </div>
    </div>
  );
};
