export type StagePhase = 'intro' | 'ready' | 'battle' | 'boss' | 'result' | 'exit';

export interface StemConfig {
  id: string;
  name: string;
  koreanName: string;
  category: 'drums' | 'bass' | 'harmony' | 'lead' | 'boss';
  color: string;
  iconName: string;
  volume: number; // 0.0 to 1.0
  muted: boolean;
  solo: boolean;
  
  // Phase mapping: determines target volume or state in each game phase
  phaseVolumes: Record<StagePhase, number>;
}

export interface ChordNote {
  rootNote: string; // e.g. "C", "D#", "F"
  octave: number;
  type: 'minor' | 'major' | 'sus4' | 'dim' | '5';
}

export interface TrackPattern {
  bassLine: number[]; // Midi pitch relative offsets
  leadArp: number[];
  harmonyChords: string[]; // Chord progression
  drumPattern: boolean[][]; // 16 steps x 4 elements (kick, snare, hihat, perc)
}

export interface PresetTrack {
  id: string;
  title: string;
  koreanTitle: string;
  subtitle: string;
  genreTag: string; // e.g. "EDM / Synthwave / Orchestral / Rock"
  bpm: number;
  key: string;
  scale: 'minor' | 'phrygian' | 'dorian' | 'harmonic_minor';
  description: string;
  paydayReference: string; // Reference tag
  
  // Duration specs
  introDurationSec: number;
  loopDurationSec: number;
  exitDurationSec: number;
  
  durationMode?: 'full' | 'clip_30s';
  loopMode?: 'complete' | 'loop';
  
  // Lyrics specs
  lyricsOption?: 'instrumental' | 'lyrics';
  lyricsGenerationMode?: 'auto' | 'manual';
  lyrics?: string;
  
  aiAnalysisComment?: string;
  isAiGenerated?: boolean;
  
  // Pattern settings
  pattern: TrackPattern;
  
  // Sound Timbres
  synthType: 'payday_industrial' | 'arcane_cyber' | 'gothic_organ' | 'mana_overdrive';
}

export type ReferenceType = 'game_or_song' | 'youtube_url' | 'audio_file' | 'prompt_only';
export type DurationOption = 'full' | 'clip_30s';
export type LoopOption = 'complete' | 'loop';
export type LyricsOption = 'instrumental' | 'lyrics';
export type LyricsGenerationMode = 'auto' | 'manual';

export interface GenerateOstRequest {
  referenceType: ReferenceType;
  referenceInput: string;
  userPrompt: string;
  durationOption: DurationOption;
  loopOption: LoopOption;
  lyricsOption: LyricsOption;
  lyricsGenerationMode: LyricsGenerationMode;
  manualLyrics?: string;
  audioBase64?: string;
  audioFileName?: string;
  audioMimeType?: string;
}

export interface UploadedAudioInfo {
  fileName: string;
  fileSize: number;
  durationSec: number;
  base64: string;
  mimeType: string;
  peaks?: number[];
}

export type ExportFormat = 'wav_full' | 'wav_loop_phase' | 'wav_stems';

export interface ExportProgress {
  isExporting: boolean;
  progressPercent: number;
  currentTask: string;
  downloadUrl?: string;
  filename?: string;
}

export type AppTab = 'generator' | 'history';

export interface GenerationHistoryItem {
  id: string; // Unique record id
  track: PresetTrack;
  createdAt: string; // ISO string
  driveFileId?: string; // Google Drive file id if synced
  driveFolderId?: string;
  driveAudioFileId?: string; // Google Drive audio WAV id if uploaded
  driveWebViewLink?: string;
  syncedToDrive: boolean;
  fileSizeBytes?: number;
  notes?: string;
}

export interface UserProfile {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
}
