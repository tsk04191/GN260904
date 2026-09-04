import React, { useState } from 'react';
import { GenerationHistoryItem, PresetTrack, StemConfig, UserProfile } from '../types';
import { globalSynthEngine } from '../audio/synthEngine';
import { INITIAL_STEMS } from '../audio/presets';
import { uploadWavAudioToDrive } from '../services/googleDriveService';
import { getAccessToken } from '../services/authService';
import {
  History,
  Cloud,
  CloudCheck,
  CloudUpload,
  Play,
  Square,
  ArrowUpRight,
  Download,
  Trash2,
  Search,
  Filter,
  Music,
  Disc,
  Tag,
  Mic2,
  FileAudio,
  Layers,
  Copy,
  Check,
  ExternalLink,
  RefreshCw,
  Loader2,
  Sparkles,
  Folder,
  Sliders,
  Calendar,
  Clock,
  Edit3,
  Save,
  X,
  CheckCircle2,
  Volume2,
  VolumeX,
  Activity,
  AlertTriangle,
} from 'lucide-react';

const STEM_BUTTON_DEFINITIONS = [
  { id: 'drum', label: '드럼', icon: '🥁', desc: 'Kick / Snare / Hats' },
  { id: 'bass', label: '베이스', icon: '🎸', desc: 'Sub / Reese Bass' },
  { id: 'harmony', label: '하모니', icon: '🎹', desc: 'Chords / Pads' },
  { id: 'lead', label: '리드', icon: '⚡', desc: 'Melody / Hook' },
  { id: 'ambience', label: '앰비언스', icon: '🌌', desc: 'Atmosphere / FX' },
  { id: 'all', label: '전체 믹스', icon: '🎛️', desc: 'Full 5 Stems' },
] as const;

interface HistoryViewerProps {
  historyItems: GenerationHistoryItem[];
  currentTrack: PresetTrack;
  isPlaying: boolean;
  activeSoloStemId?: string | null;
  onPlayTrack: (track: PresetTrack) => void;
  onPlayTrackStem?: (track: PresetTrack, stemId: string | 'all') => void;
  onSelectTrack: (track: PresetTrack) => void;
  onUpdateHistoryTrack: (id: string, updatedFields: Partial<PresetTrack>) => void;
  onDeleteHistoryItem: (id: string, driveFileId?: string) => void;
  onSyncWithDrive: () => Promise<void>;
  isSyncing: boolean;
  user: UserProfile | null;
  onLoginGoogle: () => void;
  onLogoutGoogle: () => void;
}

export const HistoryViewer: React.FC<HistoryViewerProps> = ({
  historyItems,
  currentTrack,
  isPlaying,
  activeSoloStemId,
  onPlayTrack,
  onPlayTrackStem,
  onSelectTrack,
  onUpdateHistoryTrack,
  onDeleteHistoryItem,
  onSyncWithDrive,
  isSyncing,
  user,
  onLoginGoogle,
  onLogoutGoogle,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterGenre, setFilterGenre] = useState<string>('all');
  const [filterLyrics, setFilterLyrics] = useState<'all' | 'lyrics' | 'instrumental'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedLyricsId, setExpandedLyricsId] = useState<string | null>(null);

  // In-app Deletion confirmation state (bypasses iframe confirm limitations)
  const [itemToDelete, setItemToDelete] = useState<GenerationHistoryItem | null>(null);
  const [deleteSuccessMsg, setDeleteSuccessMsg] = useState<string | null>(null);

  // Editing states for history items
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editKoreanTitle, setEditKoreanTitle] = useState<string>('');
  const [editTitle, setEditTitle] = useState<string>('');
  const [editGenreTag, setEditGenreTag] = useState<string>('');
  const [editDescription, setEditDescription] = useState<string>('');
  const [editSuccessId, setEditSuccessId] = useState<string | null>(null);

  const handleStartEdit = (item: GenerationHistoryItem) => {
    setEditingItemId(item.id);
    setEditKoreanTitle(item.track.koreanTitle);
    setEditTitle(item.track.title);
    setEditGenreTag(item.track.genreTag);
    setEditDescription(item.track.description);
  };

  const handleCancelEdit = () => {
    setEditingItemId(null);
  };

  const handleSaveEdit = (item: GenerationHistoryItem) => {
    onUpdateHistoryTrack(item.id, {
      koreanTitle: editKoreanTitle.trim() || item.track.koreanTitle,
      title: editTitle.trim() || item.track.title,
      genreTag: editGenreTag.trim() || item.track.genreTag,
      description: editDescription.trim() || item.track.description,
    });
    setEditSuccessId(item.id);
    setEditingItemId(null);
    setTimeout(() => setEditSuccessId(null), 2500);
  };

  // Audio rendering / exporting states
  const [exportingItemId, setExportingItemId] = useState<string | null>(null);
  const [exportTaskText, setExportTaskText] = useState<string>('');
  const [uploadingDriveItemId, setUploadingDriveItemId] = useState<string | null>(null);

  // Filter items
  const filteredItems = historyItems.filter(item => {
    const t = item.track;
    const matchesSearch =
      searchQuery.trim() === '' ||
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.koreanTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.genreTag.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.lyrics && t.lyrics.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesGenre =
      filterGenre === 'all' || t.genreTag.toLowerCase().includes(filterGenre.toLowerCase());

    const matchesLyrics =
      filterLyrics === 'all' ||
      (filterLyrics === 'lyrics' && t.lyricsOption === 'lyrics') ||
      (filterLyrics === 'instrumental' && t.lyricsOption !== 'lyrics');

    return matchesSearch && matchesGenre && matchesLyrics;
  });

  // Extract unique genres for filter pills
  const genres = Array.from(new Set(historyItems.map(item => item.track.genreTag)));

  const handleCopyLyrics = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Download Full Master WAV for historical item
  const handleDownloadFullWav = async (item: GenerationHistoryItem) => {
    try {
      setExportingItemId(item.id);
      setExportTaskText('마스터 WAV 음원 렌더링 중...');

      const track = item.track;
      // Temporary setup engine for this track
      globalSynthEngine.setTrackAndStems(track, INITIAL_STEMS);
      const totalDuration = track.introDurationSec + track.loopDurationSec + track.exitDurationSec;
      const wavBlob = await globalSynthEngine.renderWavBuffer(totalDuration, 'battle');

      const url = URL.createObjectURL(wavBlob);
      const filename = `${track.title.replace(/\s+/g, '_')}_Master.wav`;
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      // Restore current track in engine
      globalSynthEngine.setTrackAndStems(currentTrack, INITIAL_STEMS);
    } catch (e) {
      console.error(e);
      alert('WAV 렌더링 다운로드 중 오류가 발생했습니다.');
    } finally {
      setExportingItemId(null);
      setExportTaskText('');
    }
  };

  // Download Loop WAV for historical item
  const handleDownloadLoopWav = async (item: GenerationHistoryItem) => {
    try {
      setExportingItemId(item.id);
      setExportTaskText('심리스 루프 WAV 음원 렌더링 중...');

      const track = item.track;
      globalSynthEngine.setTrackAndStems(track, INITIAL_STEMS);
      const wavBlob = await globalSynthEngine.renderWavBuffer(track.loopDurationSec, 'battle');

      const url = URL.createObjectURL(wavBlob);
      const filename = `${track.title.replace(/\s+/g, '_')}_Loop.wav`;
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      globalSynthEngine.setTrackAndStems(currentTrack, INITIAL_STEMS);
    } catch (e) {
      console.error(e);
      alert('루프 WAV 렌더링 다운로드 중 오류가 발생했습니다.');
    } finally {
      setExportingItemId(null);
      setExportTaskText('');
    }
  };

  // Download isolated stem for historical item
  const handleDownloadStemWav = async (item: GenerationHistoryItem, stem: StemConfig) => {
    try {
      setExportingItemId(`${item.id}-${stem.id}`);
      setExportTaskText(`${stem.koreanName} 스템 WAV 렌더링 중...`);

      const track = item.track;
      globalSynthEngine.setTrackAndStems(track, INITIAL_STEMS);
      const wavBlob = await globalSynthEngine.renderWavBuffer(track.loopDurationSec, 'battle', stem.id);

      const url = URL.createObjectURL(wavBlob);
      const filename = `${track.title.replace(/\s+/g, '_')}_STEM_${stem.name.replace(/\s+/g, '_')}.wav`;
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      globalSynthEngine.setTrackAndStems(currentTrack, INITIAL_STEMS);
    } catch (e) {
      console.error(e);
      alert('스템 WAV 렌더링 중 오류가 발생했습니다.');
    } finally {
      setExportingItemId(null);
      setExportTaskText('');
    }
  };

  // Upload full WAV to Google Drive folder
  const handleUploadWavToDrive = async (item: GenerationHistoryItem) => {
    const token = getAccessToken();
    if (!token || !user) {
      alert('구글 로그인이 필요합니다. 상단의 구글 로그인 버튼을 클릭해 주세요.');
      return;
    }

    try {
      setUploadingDriveItemId(item.id);
      const track = item.track;
      globalSynthEngine.setTrackAndStems(track, INITIAL_STEMS);
      const totalDuration = track.introDurationSec + track.loopDurationSec + track.exitDurationSec;
      const wavBlob = await globalSynthEngine.renderWavBuffer(totalDuration, 'battle');

      const filename = `${track.title.replace(/\s+/g, '_')}_Master_${Date.now().toString().slice(-4)}.wav`;
      const uploadRes = await uploadWavAudioToDrive(
        token,
        wavBlob,
        filename,
        `AI Music Studio Render: ${track.koreanTitle} (${track.genreTag})`
      );

      alert(`✅ Google Drive에 WAV 음원이 성공적으로 저장되었습니다!\n파일명: ${filename}`);
      globalSynthEngine.setTrackAndStems(currentTrack, INITIAL_STEMS);
    } catch (e: any) {
      console.error(e);
      alert(`Google Drive WAV 업로드 오류: ${e.message || e}`);
    } finally {
      setUploadingDriveItemId(null);
    }
  };

  const syncedCount = historyItems.filter(i => i.syncedToDrive).length;

  return (
    <div className="space-y-6">
      {/* Google Drive Status & Cloud Integration Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 shadow-xl">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          {/* Left Info */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-indigo-950 text-indigo-400 border border-indigo-800">
                <Cloud className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-100 flex items-center gap-2">
                  Google Drive 음악 보관함 & 생성 이력
                  {user && (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-emerald-950 text-emerald-300 border border-emerald-800 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      연동 활성화됨
                    </span>
                  )}
                </h2>
                <p className="text-xs text-slate-400">
                  생성된 모든 곡, 5개 스템 설정값 및 가사를 사용자의 구글 드라이브(
                  <code className="text-cyan-400 font-mono">AI_Music_Studio_History</code>)에 안전하게 백업 및 동기화합니다.
                </p>
              </div>
            </div>

            {/* Quick Metrics */}
            <div className="flex flex-wrap items-center gap-4 pt-1 text-xs font-mono">
              <div className="px-3 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center gap-2">
                <Music className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-slate-400">총 저장된 곡:</span>
                <span className="font-bold text-slate-100">{historyItems.length}곡</span>
              </div>
              <div className="px-3 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center gap-2">
                <CloudCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-slate-400">Drive 동기화:</span>
                <span className="font-bold text-emerald-400">{syncedCount}곡</span>
              </div>
              {user && (
                <div className="px-3 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center gap-2">
                  <Folder className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="text-slate-400">드라이브 폴더:</span>
                  <span className="font-bold text-indigo-300">AI_Music_Studio_History</span>
                </div>
              )}
            </div>
          </div>

          {/* Right Action: Google Auth or Sync Controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0 w-full lg:w-auto">
            {user ? (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                {/* User Profile Card */}
                <div className="flex items-center gap-3 px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800">
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.displayName || 'Google User'}
                      className="w-7 h-7 rounded-full border border-indigo-500"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-bold text-white">
                      {user.displayName?.charAt(0) || 'G'}
                    </div>
                  )}
                  <div className="text-left">
                    <div className="text-xs font-bold text-slate-200">
                      {user.displayName || 'Google User'}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono truncate max-w-[130px]">
                      {user.email}
                    </div>
                  </div>
                  <button
                    onClick={onLogoutGoogle}
                    className="ml-2 text-[10px] text-rose-400 hover:text-rose-300 underline cursor-pointer"
                  >
                    로그아웃
                  </button>
                </div>

                {/* Sync Now Button */}
                <button
                  onClick={onSyncWithDrive}
                  disabled={isSyncing}
                  className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-950/60 cursor-pointer transition-all"
                >
                  <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>{isSyncing ? '동기화 중...' : 'Google Drive 동기화'}</span>
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {/* Google Sign-in Official Styled Button */}
                <button
                  onClick={onLoginGoogle}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-bold text-xs flex items-center justify-center gap-3 shadow-xl hover:shadow-cyan-500/20 transition-all cursor-pointer border border-slate-300"
                >
                  <svg className="w-4 h-4" viewBox="0 0 48 48">
                    <path
                      fill="#EA4335"
                      d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                    />
                    <path
                      fill="#4285F4"
                      d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                    />
                    <path
                      fill="#34A853"
                      d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                    />
                  </svg>
                  <span>Google 로그인 & Drive 연동</span>
                </button>
                <div className="text-[10px] text-slate-400 text-center sm:text-right">
                  로그인 시 생성된 모든 곡이 내 구글 드라이브에 자동 보관됩니다
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-slate-900/80 p-4 rounded-2xl border border-slate-800">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="곡 제목, 한글명, 장르(EDM, Rock, Synthwave), 가사 검색..."
            className="w-full bg-slate-950 text-slate-100 text-xs pl-10 pr-4 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-cyan-500 transition-all placeholder:text-slate-500"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Genre select */}
          <select
            value={filterGenre}
            onChange={e => setFilterGenre(e.target.value)}
            className="bg-slate-950 text-xs text-slate-300 py-2 px-3 rounded-xl border border-slate-800 focus:outline-none focus:border-cyan-500 cursor-pointer"
          >
            <option value="all">모든 장르 ({historyItems.length})</option>
            {genres.map(g => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>

          {/* Lyrics filter */}
          <select
            value={filterLyrics}
            onChange={e => setFilterLyrics(e.target.value as any)}
            className="bg-slate-950 text-xs text-slate-300 py-2 px-3 rounded-xl border border-slate-800 focus:outline-none focus:border-cyan-500 cursor-pointer"
          >
            <option value="all">가사 유무 전체</option>
            <option value="lyrics">✨ 가사 포함만</option>
            <option value="instrumental">🎹 연주곡(Instrumental)만</option>
          </select>
        </div>
      </div>

      {/* Exporting Indicator Toast */}
      {exportingItemId && (
        <div className="p-3.5 rounded-xl bg-cyan-950/80 border border-cyan-500/50 flex items-center justify-between gap-3 text-xs text-cyan-300 animate-pulse">
          <div className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
            <span className="font-bold font-mono">{exportTaskText}</span>
          </div>
          <span className="text-[11px] text-cyan-400">고음질 44.1kHz PCM 인코딩 처리 중</span>
        </div>
      )}

      {/* History Items List */}
      {filteredItems.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-slate-900/40 border border-slate-800/80 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
            <History className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-200">생성된 이력이 없습니다.</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
            상단의 <strong>"생성"</strong> 탭에서 원하는 장르나 레퍼런스 음악을 바탕으로 첫 번째 AI 다중 스템 음악을 생성해 보세요!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredItems.map(item => {
            const track = item.track;
            const isCurrentPlaying = isPlaying && currentTrack.id === track.id;
            const isSelected = currentTrack.id === track.id;
            const isLyricsExpanded = expandedLyricsId === item.id;
            const isDriveWavUploading = uploadingDriveItemId === item.id;
            const isEditing = editingItemId === item.id;
            const isEditSaved = editSuccessId === item.id;

            return (
              <div
                key={item.id}
                className={`p-5 rounded-2xl border transition-all shadow-xl bg-slate-900/90 ${
                  isSelected
                    ? 'border-cyan-500/60 bg-gradient-to-r from-slate-900 via-cyan-950/20 to-slate-900 ring-1 ring-cyan-500/30'
                    : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                {/* Editing Form Mode */}
                {isEditing ? (
                  <div className="space-y-4 bg-slate-950 p-4 rounded-xl border border-indigo-500/50 animate-in fade-in">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                      <div className="flex items-center gap-2">
                        <Edit3 className="w-4 h-4 text-indigo-400" />
                        <span className="text-xs font-bold text-indigo-200">
                          곡 이름 & 메타데이터 수정
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(item)}
                          className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1 shadow-md shadow-indigo-950/50 cursor-pointer transition-all"
                        >
                          <Save className="w-3.5 h-3.5" />
                          <span>저장 완료</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleCancelEdit}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center gap-1 cursor-pointer transition-all"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>취소</span>
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-300 mb-1">
                          한글 곡명
                        </label>
                        <input
                          type="text"
                          value={editKoreanTitle}
                          onChange={e => setEditKoreanTitle(e.target.value)}
                          placeholder="한글 곡명 입력"
                          className="w-full bg-slate-900 border border-slate-700 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-300 mb-1">
                          영문 곡명 (Title)
                        </label>
                        <input
                          type="text"
                          value={editTitle}
                          onChange={e => setEditTitle(e.target.value)}
                          placeholder="English Title"
                          className="w-full bg-slate-900 border border-slate-700 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-300 mb-1">
                          장르 태그
                        </label>
                        <input
                          type="text"
                          value={editGenreTag}
                          onChange={e => setEditGenreTag(e.target.value)}
                          placeholder="Cyberpunk, EDM..."
                          className="w-full bg-slate-900 border border-slate-700 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 mb-1">
                        곡 설명 & 분위기 묘사 (Description)
                      </label>
                      <textarea
                        rows={2}
                        value={editDescription}
                        onChange={e => setEditDescription(e.target.value)}
                        placeholder="곡의 설명 및 분위기를 입력하세요..."
                        className="w-full bg-slate-900 border border-slate-700 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none resize-none leading-relaxed"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                    {/* Track Info */}
                    <div className="space-y-2 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-cyan-950 text-cyan-300 border border-cyan-800 flex items-center gap-1">
                          <Tag className="w-3 h-3" />
                          {track.genreTag}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-indigo-950 text-indigo-300 border border-indigo-800 flex items-center gap-1">
                          <Disc className="w-3 h-3" />
                          {track.paydayReference}
                        </span>
                        {track.lyricsOption === 'lyrics' && (
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-pink-950 text-pink-300 border border-pink-800 flex items-center gap-1">
                            <Mic2 className="w-3 h-3" />
                            가사 포함
                          </span>
                        )}
                        {item.syncedToDrive ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-emerald-950 text-emerald-300 border border-emerald-800 flex items-center gap-1">
                            <CloudCheck className="w-3 h-3 text-emerald-400" />
                            Drive 동기화됨
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-amber-950 text-amber-300 border border-amber-800">
                            로컬 저장 (Drive 미동기화)
                          </span>
                        )}
                        {isEditSaved && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-950 text-emerald-300 border border-emerald-600 flex items-center gap-1 animate-in fade-in">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            수정됨
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        <h3 className="text-base font-black text-slate-100 flex items-center gap-2">
                          {track.koreanTitle}
                          <span className="text-xs font-mono font-normal text-slate-400">
                            ({track.title})
                          </span>
                        </h3>
                      </div>

                      <p className="text-xs text-slate-300 leading-relaxed max-w-3xl">
                        {track.description}
                      </p>

                      {/* Metadata specs */}
                      <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono text-slate-400 pt-1">
                        <span className="flex items-center gap-1 text-cyan-400">
                          <Sliders className="w-3 h-3" />
                          {track.key} {track.scale.toUpperCase()}
                        </span>
                        <span>•</span>
                        <span className="text-amber-400 font-bold">{track.bpm} BPM</span>
                        <span>•</span>
                        <span className="text-slate-300 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-500" />
                          {track.introDurationSec + track.loopDurationSec + track.exitDurationSec}초 (Intro {track.introDurationSec}s / Loop {track.loopDurationSec}s / Outro {track.exitDurationSec}s)
                        </span>
                        <span>•</span>
                        <span className="text-slate-400 flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-500" />
                          {new Date(item.createdAt).toLocaleString('ko-KR')}
                        </span>
                      </div>
                    </div>

                    {/* Right Action Buttons */}
                    <div className="flex flex-wrap lg:flex-nowrap items-center gap-2 shrink-0">
                      {/* Play in Studio Button */}
                      <button
                        onClick={() => onPlayTrack(track)}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                          isCurrentPlaying
                            ? 'bg-rose-500 hover:bg-rose-600 text-slate-950 shadow-lg shadow-rose-950'
                            : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-lg shadow-cyan-950'
                        }`}
                      >
                        {isCurrentPlaying ? (
                          <>
                            <Square className="w-4 h-4 fill-current" />
                            <span className="font-mono">정지</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-4 h-4 fill-current" />
                            <span className="font-mono">즉시 재생</span>
                          </>
                        )}
                      </button>

                      {/* Edit Button */}
                      <button
                        onClick={() => handleStartEdit(item)}
                        className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 border border-slate-700 cursor-pointer transition-all"
                        title="곡 이름 및 설명 수정"
                      >
                        <Edit3 className="w-4 h-4 text-indigo-400" />
                        <span>수정</span>
                      </button>

                      {/* Load to Studio Editor */}
                      <button
                        onClick={() => onSelectTrack(track)}
                        className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 border border-slate-700 cursor-pointer transition-all"
                        title="이 곡을 스튜디오 편집기로 불러옵니다"
                      >
                        <ArrowUpRight className="w-4 h-4 text-cyan-400" />
                        <span>스튜디오 열기</span>
                      </button>

                      {/* Drive Upload WAV button (if user logged in) */}
                      {user && (
                        <button
                          onClick={() => handleUploadWavToDrive(item)}
                          disabled={isDriveWavUploading}
                          className="px-3 py-2 rounded-xl bg-indigo-950 hover:bg-indigo-900 text-indigo-300 text-xs font-semibold flex items-center gap-1.5 border border-indigo-800 cursor-pointer transition-all disabled:opacity-50"
                          title="Google Drive 폴더에 고음질 마스터 WAV 파일 업로드"
                        >
                          {isDriveWavUploading ? (
                            <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                          ) : (
                            <CloudUpload className="w-4 h-4 text-indigo-400" />
                          )}
                          <span>{isDriveWavUploading ? '업로드 중' : 'Drive에 WAV 백업'}</span>
                        </button>
                      )}

                      {/* Open in Drive link if synced */}
                      {item.driveWebViewLink && (
                        <a
                          href={item.driveWebViewLink}
                          target="_blank"
                          rel="noreferrer"
                          className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-slate-700 transition-all"
                          title="Google Drive에서 파일 보기"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}

                      {/* Delete Item Button */}
                      <button
                        onClick={() => setItemToDelete(item)}
                        className="p-2 rounded-xl bg-slate-950 hover:bg-rose-950/60 text-slate-500 hover:text-rose-400 border border-slate-800 hover:border-rose-800 transition-all cursor-pointer"
                        title="이력에서 삭제"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Stem Parts Audition Section (파츠별 개별 청음) */}
                <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2.5 text-xs bg-slate-950/40 -mx-5 px-5 py-2.5">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-slate-300 font-mono text-[11px] font-semibold flex items-center gap-1 mr-1">
                      <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
                      파츠별 청음:
                    </span>
                    {STEM_BUTTON_DEFINITIONS.map(stem => {
                      const isThisTrackActive = currentTrack.id === track.id && isPlaying;
                      const isThisStemActive =
                        isThisTrackActive &&
                        (stem.id === 'all'
                          ? activeSoloStemId === 'all' || activeSoloStemId === null
                          : activeSoloStemId === stem.id);

                      return (
                        <button
                          key={stem.id}
                          onClick={() => {
                            if (onPlayTrackStem) {
                              onPlayTrackStem(track, stem.id);
                            } else {
                              onPlayTrack(track);
                            }
                          }}
                          className={`px-2.5 py-1 rounded-lg font-mono text-[11px] font-semibold flex items-center gap-1.5 transition-all cursor-pointer border ${
                            isThisStemActive
                              ? 'bg-cyan-500 text-slate-950 border-cyan-300 shadow-md shadow-cyan-950 ring-2 ring-cyan-400/50'
                              : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800 hover:border-slate-700'
                          }`}
                          title={`${track.koreanTitle} - ${stem.label} (${stem.desc}) ${isThisStemActive ? '정지' : '단독 청음'}`}
                        >
                          <span className="text-xs">{stem.icon}</span>
                          <span>{stem.label}</span>
                          {isThisStemActive ? (
                            <span className="flex items-center gap-0.5 ml-0.5 text-slate-950 font-bold">
                              <Square className="w-2.5 h-2.5 fill-current" />
                              <span className="text-[10px]">재생중</span>
                            </span>
                          ) : (
                            <Play className="w-2.5 h-2.5 opacity-50 ml-0.5" />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {isCurrentPlaying && (
                    <div className="flex items-center gap-1.5 text-[11px] font-mono text-cyan-300 bg-cyan-950/60 px-2.5 py-1 rounded-full border border-cyan-800/80">
                      <Activity className="w-3 h-3 animate-pulse text-cyan-400" />
                      <span>
                        {activeSoloStemId && activeSoloStemId !== 'all'
                          ? `${STEM_BUTTON_DEFINITIONS.find(s => s.id === activeSoloStemId)?.label || activeSoloStemId} 파트 솔로 청음 중`
                          : '전체 파트 믹스 재생 중'}
                      </span>
                    </div>
                  )}
                </div>

                {/* WAV Download Options Bar */}
                <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-slate-400 font-mono text-[11px] flex items-center gap-1 mr-1">
                      <Download className="w-3.5 h-3.5 text-emerald-400" />
                      WAV 다운로드:
                    </span>
                    <button
                      onClick={() => handleDownloadFullWav(item)}
                      disabled={exportingItemId === item.id}
                      className="px-2.5 py-1 rounded-lg bg-emerald-950 hover:bg-emerald-900 text-emerald-300 font-mono text-[11px] border border-emerald-800 flex items-center gap-1 cursor-pointer transition-all disabled:opacity-50"
                    >
                      <FileAudio className="w-3 h-3" />
                      마스터 풀트랙 ({track.introDurationSec + track.loopDurationSec + track.exitDurationSec}s)
                    </button>
                    <button
                      onClick={() => handleDownloadLoopWav(item)}
                      disabled={exportingItemId === item.id}
                      className="px-2.5 py-1 rounded-lg bg-cyan-950 hover:bg-cyan-900 text-cyan-300 font-mono text-[11px] border border-cyan-800 flex items-center gap-1 cursor-pointer transition-all disabled:opacity-50"
                    >
                      <Music className="w-3 h-3" />
                      심리스 루프 ({track.loopDurationSec}s)
                    </button>
                  </div>

                  {/* 5 Stem downloads */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-slate-500 font-mono text-[10px] mr-1 flex items-center gap-1">
                      <Layers className="w-3 h-3 text-purple-400" />
                      스템 개별 추출:
                    </span>
                    {INITIAL_STEMS.map(s => (
                      <button
                        key={s.id}
                        onClick={() => handleDownloadStemWav(item, s)}
                        disabled={exportingItemId === `${item.id}-${s.id}`}
                        className="px-2 py-0.5 rounded bg-slate-950 hover:bg-slate-800 text-slate-300 font-mono text-[10px] border border-slate-800 flex items-center gap-1 cursor-pointer transition-all disabled:opacity-50"
                        title={`${s.koreanName} 스템 WAV 다운로드`}
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: s.color }}
                        ></span>
                        {s.koreanName}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Lyrics Section (if track has lyrics) */}
                {track.lyricsOption === 'lyrics' && track.lyrics && (
                  <div className="mt-3 pt-3 border-t border-slate-800/80">
                    <div className="flex items-center justify-between mb-2">
                      <button
                        onClick={() =>
                          setExpandedLyricsId(isLyricsExpanded ? null : item.id)
                        }
                        className="text-xs font-bold text-pink-400 hover:text-pink-300 flex items-center gap-1.5 cursor-pointer"
                      >
                        <Mic2 className="w-3.5 h-3.5" />
                        <span>
                          {isLyricsExpanded ? '보컬 가사 접기 ▲' : '보컬 가사 펼쳐보기 ▼'}
                        </span>
                      </button>
                      <button
                        onClick={() => handleCopyLyrics(track.lyrics || '', item.id)}
                        className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-pink-300 text-[11px] font-mono flex items-center gap-1 cursor-pointer transition-all"
                      >
                        {copiedId === item.id ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                        <span>{copiedId === item.id ? '복사 완료!' : '가사 전체 복사'}</span>
                      </button>
                    </div>

                    {isLyricsExpanded && (
                      <pre className="p-3.5 rounded-xl bg-slate-950 text-slate-300 font-mono text-xs overflow-x-auto whitespace-pre-wrap leading-relaxed border border-pink-950/60 max-h-52 overflow-y-auto">
                        {track.lyrics}
                      </pre>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Modal (In-app safe modal, works seamlessly inside iframes) */}
      {itemToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="w-10 h-10 rounded-xl bg-rose-950/60 border border-rose-800 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-rose-400" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-100">곡 삭제 확인</h3>
                <p className="text-xs text-slate-400">보관함에서 곡을 영구 삭제합니다.</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/70 p-3.5 rounded-xl border border-slate-800/80">
              정말 <strong className="text-rose-300">'{itemToDelete.track.koreanTitle}'</strong> ({itemToDelete.track.title}) 곡을 이력에서 삭제하시겠습니까?
              {itemToDelete.syncedToDrive && (
                <span className="block text-slate-400 text-[11px] mt-1.5 pt-1.5 border-t border-slate-800/50">
                  * 연동된 Google Drive 및 로컬 브라우저 보관함에서 모두 삭제됩니다.
                </span>
              )}
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setItemToDelete(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer transition-all"
              >
                취소
              </button>
              <button
                type="button"
                onClick={() => {
                  const id = itemToDelete.id;
                  const driveId = itemToDelete.driveFileId;
                  const title = itemToDelete.track.koreanTitle;
                  onDeleteHistoryItem(id, driveId);
                  setItemToDelete(null);
                  setDeleteSuccessMsg(`'${title}' 곡이 이력에서 삭제되었습니다.`);
                  setTimeout(() => setDeleteSuccessMsg(null), 3000);
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold cursor-pointer transition-all shadow-lg shadow-rose-950 flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>삭제 확인</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification for Successful Deletion */}
      {deleteSuccessMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 border border-slate-700 text-slate-200 text-xs font-mono px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 animate-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4 text-rose-400" />
          <span>{deleteSuccessMsg}</span>
        </div>
      )}
    </div>
  );
};
