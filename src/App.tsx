import React, { useState, useEffect, useCallback } from 'react';
import { PRESET_TRACKS, INITIAL_STEMS } from './audio/presets';
import { AppTab, GenerationHistoryItem, PresetTrack, StemConfig, UserProfile } from './types';
import { globalSynthEngine } from './audio/synthEngine';

import { Navbar } from './components/Navbar';
import { AiTrackGenerator } from './components/AiTrackGenerator';
import { LyricsViewer } from './components/LyricsViewer';
import { VisualizerCanvas } from './components/VisualizerCanvas';
import { SequenceTimeline } from './components/SequenceTimeline';
import { StemMixer } from './components/StemMixer';
import { AudioExporter } from './components/AudioExporter';
import { HistoryViewer } from './components/HistoryViewer';
import { InfoModal } from './components/InfoModal';
import { DeveloperGuide } from './components/DeveloperGuide';
import { OfflineIndicator } from './components/OfflineIndicator';

import {
  initAuth,
  loginWithGoogle,
  logoutGoogle,
  getAccessToken,
} from './services/authService';
import {
  saveTrackToDrive,
  fetchTracksFromDrive,
  deleteTrackFromDrive,
  updateTrackOnDrive,
} from './services/googleDriveService';
import {
  getLocalHistory,
  saveLocalHistory,
  addTrackToHistory,
  updateHistoryItem,
  removeHistoryItem,
  mergeDriveAndLocalHistory,
} from './services/historyStorage';

import { Tag, Disc } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<AppTab>('generator');
  const [tracks, setTracks] = useState<PresetTrack[]>(PRESET_TRACKS);
  const [currentTrack, setCurrentTrack] = useState<PresetTrack>(PRESET_TRACKS[0]);
  const [stems, setStems] = useState<StemConfig[]>(INITIAL_STEMS);

  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [masterVolume, setMasterVolume] = useState<number>(0.8);
  const [bpm, setBpm] = useState<number>(PRESET_TRACKS[0].bpm);

  // History & Google Auth state
  const [historyItems, setHistoryItems] = useState<GenerationHistoryItem[]>([]);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [activeSoloStemId, setActiveSoloStemId] = useState<string | null>(null);

  const [isInfoModalOpen, setIsInfoModalOpen] = useState<boolean>(false);
  const [isDevGuideOpen, setIsDevGuideOpen] = useState<boolean>(false);

  // Initialize local history on mount (seed with preset items if clean and first time)
  useEffect(() => {
    const isInitialized = localStorage.getItem('ai_music_studio_initialized_v1');
    let local = getLocalHistory();
    if (!isInitialized && local.length === 0) {
      // Seed with initial presets so library isn't completely empty
      local = PRESET_TRACKS.map((t, idx) => ({
        id: `preset-history-${t.id}`,
        track: t,
        createdAt: new Date(Date.now() - idx * 3600000).toISOString(),
        syncedToDrive: false,
        notes: '기본 내장 프리셋',
      }));
      saveLocalHistory(local);
      localStorage.setItem('ai_music_studio_initialized_v1', 'true');
    }
    setHistoryItems(local);
  }, []);

  // Sync Google Drive history
  const syncWithDrive = useCallback(async () => {
    const token = getAccessToken();
    if (!token) return;

    try {
      setIsSyncing(true);
      // 1. Fetch remote tracks from Drive
      const remoteItems = await fetchTracksFromDrive(token);

      // 2. Identify local items that are not yet on Drive
      const currentLocal = getLocalHistory();
      const unsyncedItems = currentLocal.filter(item => !item.syncedToDrive);

      const newlyUploadedItems: GenerationHistoryItem[] = [];
      for (const item of unsyncedItems) {
        try {
          const uploadRes = await saveTrackToDrive(token, item);
          newlyUploadedItems.push({
            ...item,
            driveFileId: uploadRes.fileId,
            driveFolderId: uploadRes.folderId,
            driveWebViewLink: uploadRes.webViewLink,
            syncedToDrive: true,
          });
        } catch (err) {
          console.warn('Failed to upload track to Drive:', item.track.title, err);
        }
      }

      // Merge remote + newly uploaded + local
      const merged = mergeDriveAndLocalHistory(
        [...remoteItems, ...newlyUploadedItems],
        currentLocal
      );
      setHistoryItems(merged);
    } catch (e: any) {
      console.error('Drive sync failed:', e);
      alert(`Google Drive 동기화 중 오류가 발생했습니다: ${e.message || e}`);
    } finally {
      setIsSyncing(false);
    }
  }, []);

  // Listen to Auth State
  useEffect(() => {
    const unsubscribe = initAuth(
      (authUser, token) => {
        setUser({
          uid: authUser.uid,
          displayName: authUser.displayName,
          email: authUser.email,
          photoURL: authUser.photoURL,
        });
        if (token) {
          syncWithDrive();
        }
      },
      () => {
        setUser(null);
      }
    );
    return () => unsubscribe();
  }, [syncWithDrive]);

  // Initialize synth engine with track and stems
  useEffect(() => {
    globalSynthEngine.setTrackAndStems(currentTrack, stems);
    globalSynthEngine.setPhase('battle'); // Full layered composition mode
    globalSynthEngine.setOnStepCallback(step => {
      setCurrentStep(step);
    });
  }, [currentTrack, stems]);

  // Handle Google Login
  const handleLoginGoogle = async () => {
    try {
      const result = await loginWithGoogle();
      if (result) {
        setUser(result.profile);
        await syncWithDrive();
      }
    } catch (e: any) {
      console.error('Login error:', e);
      if (e.code !== 'auth/popup-closed-by-user') {
        alert(`구글 로그인 실패: ${e.message || e}`);
      }
    }
  };

  // Handle Google Logout
  const handleLogoutGoogle = async () => {
    await logoutGoogle();
    setUser(null);
  };

  // Handle preset or generated track change
  const handleSelectTrack = (track: PresetTrack) => {
    setCurrentTrack(track);
    setBpm(track.bpm);
    globalSynthEngine.setTrackAndStems(track, stems);
  };

  // Handle new track generated by AI
  const handleTrackGenerated = async (newTrack: PresetTrack) => {
    // Update tracks state
    setTracks(prev => [newTrack, ...prev.filter(t => t.id !== newTrack.id)]);
    setCurrentTrack(newTrack);
    setBpm(newTrack.bpm);
    globalSynthEngine.setTrackAndStems(newTrack, stems);

    // Save to local history
    const historyItem = addTrackToHistory(newTrack, newTrack.aiAnalysisComment);
    setHistoryItems(prev => [historyItem, ...prev.filter(i => i.track.id !== newTrack.id)]);

    // If logged in to Google, auto-save to Google Drive
    const token = getAccessToken();
    if (token) {
      try {
        const driveRes = await saveTrackToDrive(token, historyItem);
        const syncedItem: GenerationHistoryItem = {
          ...historyItem,
          driveFileId: driveRes.fileId,
          driveFolderId: driveRes.folderId,
          driveWebViewLink: driveRes.webViewLink,
          syncedToDrive: true,
        };
        const updatedHistory = updateHistoryItem(syncedItem);
        setHistoryItems(updatedHistory);
      } catch (e) {
        console.warn('Auto-save to Google Drive failed:', e);
      }
    }
  };

  // Handle play specific track (all stems)
  const handlePlayTrack = (track: PresetTrack) => {
    if (isPlaying && currentTrack.id === track.id && (activeSoloStemId === 'all' || activeSoloStemId === null)) {
      globalSynthEngine.stop();
      setIsPlaying(false);
      setActiveSoloStemId(null);
    } else {
      if (currentTrack.id !== track.id) {
        handleSelectTrack(track);
      }
      // Reset stems to all un-soloed for full layered mix
      const unSoloedStems = stems.map(s => ({ ...s, muted: false, solo: false }));
      setStems(unSoloedStems);
      globalSynthEngine.setTrackAndStems(track, unSoloedStems);
      unSoloedStems.forEach(s =>
        globalSynthEngine.updateStemUserConfig(s.id, s.volume, s.muted, s.solo)
      );
      setActiveSoloStemId('all');
      globalSynthEngine.start();
      setIsPlaying(true);
    }
  };

  // Handle playing track with specific stem solo or full mix
  const handlePlayTrackStem = (track: PresetTrack, stemId: string | 'all') => {
    const isThisTrackPlaying = isPlaying && currentTrack.id === track.id;
    const isSameStemActive =
      (stemId === 'all' && (activeSoloStemId === 'all' || activeSoloStemId === null)) ||
      (activeSoloStemId === stemId);

    if (isThisTrackPlaying && isSameStemActive) {
      // Toggle stop
      globalSynthEngine.stop();
      setIsPlaying(false);
      setActiveSoloStemId(null);
      return;
    }

    if (currentTrack.id !== track.id) {
      setCurrentTrack(track);
      setBpm(track.bpm);
    }

    let updatedStems: StemConfig[];
    if (stemId === 'all') {
      updatedStems = stems.map(s => ({ ...s, muted: false, solo: false }));
      setActiveSoloStemId('all');
    } else {
      updatedStems = stems.map(s => ({
        ...s,
        solo: s.id === stemId,
        muted: false,
      }));
      setActiveSoloStemId(stemId);
    }

    setStems(updatedStems);
    globalSynthEngine.setTrackAndStems(track, updatedStems);
    updatedStems.forEach(s =>
      globalSynthEngine.updateStemUserConfig(s.id, s.volume, s.muted, s.solo)
    );

    if (!isPlaying || currentTrack.id !== track.id) {
      globalSynthEngine.start();
      setIsPlaying(true);
    }
  };

  // Handle Play/Stop toggle
  const handleTogglePlay = () => {
    if (isPlaying) {
      globalSynthEngine.stop();
      setIsPlaying(false);
      setActiveSoloStemId(null);
    } else {
      globalSynthEngine.start();
      setIsPlaying(true);
    }
  };

  // Handle stem volume / mute / solo update
  const handleUpdateStem = (
    stemId: string,
    volume: number,
    muted: boolean,
    solo: boolean
  ) => {
    const updated = stems.map(s => {
      if (s.id === stemId) {
        return { ...s, volume, muted, solo };
      }
      return s;
    });
    setStems(updated);
    globalSynthEngine.updateStemUserConfig(stemId, volume, muted, solo);
  };

  // Handle Solo Audition for a specific stem
  const handleSoloAuditionStem = (stemId: string) => {
    const updated = stems.map(s => {
      if (s.id === stemId) {
        return { ...s, solo: !s.solo, muted: false };
      }
      return { ...s, solo: false };
    });
    setStems(updated);
    updated.forEach(s => globalSynthEngine.updateStemUserConfig(s.id, s.volume, s.muted, s.solo));

    if (!isPlaying) {
      globalSynthEngine.start();
      setIsPlaying(true);
    }
  };

  // Handle master volume change
  const handleChangeMasterVolume = (vol: number) => {
    setMasterVolume(vol);
    globalSynthEngine.setMasterVolume(vol);
  };

  // Handle BPM change
  const handleChangeBpm = (newBpm: number) => {
    setBpm(newBpm);
    globalSynthEngine.setBpm(newBpm);
  };

  // Handle updating track metadata (title, koreanTitle, description, genreTag)
  const handleUpdateTrackMetadata = async (
    trackId: string,
    updates: Partial<PresetTrack>
  ) => {
    // 1. Update current track if it's the target
    if (currentTrack.id === trackId) {
      setCurrentTrack(prev => ({ ...prev, ...updates }));
    }

    // 2. Update tracks array
    setTracks(prev =>
      prev.map(t => (t.id === trackId ? { ...t, ...updates } : t))
    );

    // 3. Update history items & localStorage
    const targetHistory = historyItems.find(
      i => i.track.id === trackId || i.id === trackId
    );
    if (targetHistory) {
      const updatedTrack: PresetTrack = { ...targetHistory.track, ...updates };
      const updatedItem: GenerationHistoryItem = {
        ...targetHistory,
        track: updatedTrack,
      };
      const updatedHistory = updateHistoryItem(updatedItem);
      setHistoryItems(updatedHistory);

      // If synced to Drive, also update on Google Drive
      const token = getAccessToken();
      if (token && targetHistory.syncedToDrive && targetHistory.driveFileId) {
        try {
          await updateTrackOnDrive(token, updatedItem);
        } catch (e) {
          console.warn('Failed to update track on Google Drive:', e);
        }
      }
    }
  };

  // Handle manual or AI lyrics update
  const handleUpdateLyrics = (lyrics: string) => {
    const updatedTrack = {
      ...currentTrack,
      lyrics,
      lyricsOption: 'lyrics' as const,
    };
    setCurrentTrack(updatedTrack);
    setTracks(prev => prev.map(t => (t.id === updatedTrack.id ? updatedTrack : t)));

    // Update in history as well
    const targetHistory = historyItems.find(i => i.track.id === updatedTrack.id);
    if (targetHistory) {
      const updatedItem = {
        ...targetHistory,
        track: updatedTrack,
      };
      const newHistory = updateHistoryItem(updatedItem);
      setHistoryItems(newHistory);
    }
  };

  // Handle delete history item
  const handleDeleteHistoryItem = async (id: string, driveFileId?: string) => {
    // 1. Identify target item
    const target = historyItems.find(i => i.id === id || i.track.id === id);

    // 2. Remove from local storage (and mark tombstone)
    const newHistory = removeHistoryItem(id);
    setHistoryItems(newHistory);

    // 3. If the deleted item was currently playing, stop playback
    if (target && currentTrack.id === target.track.id && isPlaying) {
      globalSynthEngine.stop();
      setIsPlaying(false);
      setActiveSoloStemId(null);
    }

    // 4. If in tracks list, remove from tracks list
    if (target && tracks.length > 1) {
      const remainingTracks = tracks.filter(t => t.id !== target.track.id);
      setTracks(remainingTracks);
      if (currentTrack.id === target.track.id && remainingTracks.length > 0) {
        setCurrentTrack(remainingTracks[0]);
      }
    }

    // 5. If synced to Drive, delete from Drive as well
    const token = getAccessToken();
    if (token && driveFileId) {
      try {
        await deleteTrackFromDrive(token, driveFileId);
      } catch (e) {
        console.warn('Failed to delete track from drive:', e);
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased selection:bg-cyan-500 selection:text-slate-950">
      {/* Header / Navbar */}
      <Navbar
        tracks={tracks}
        currentTrack={currentTrack}
        onSelectTrack={handleSelectTrack}
        isPlaying={isPlaying}
        onTogglePlay={handleTogglePlay}
        masterVolume={masterVolume}
        onChangeMasterVolume={handleChangeMasterVolume}
        onOpenInfoModal={() => setIsInfoModalOpen(true)}
        onOpenDevGuide={() => setIsDevGuideOpen(true)}
        activeTab={activeTab}
        onSelectTab={tab => setActiveTab(tab)}
        historyCount={historyItems.length}
        user={user}
        onLoginGoogle={handleLoginGoogle}
        onLogoutGoogle={handleLogoutGoogle}
      />

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Tab 1: AI Music Generator & Studio */}
        {activeTab === 'generator' && (
          <div className="space-y-6">
            {/* AI Track Generator & Metadata Editor Component */}
            <AiTrackGenerator
              currentTrack={currentTrack}
              onTrackGenerated={handleTrackGenerated}
              onUpdateCurrentTrack={updates =>
                handleUpdateTrackMetadata(currentTrack.id, updates)
              }
              onPlayTrack={handlePlayTrack}
              isPlaying={isPlaying}
              currentTrackId={currentTrack.id}
            />

            {/* Lyrics Viewer Section */}
            <LyricsViewer
              track={currentTrack}
              onUpdateLyrics={handleUpdateLyrics}
            />

            {/* Spectrum Canvas & Step Sequencer Tracker */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1">
                <VisualizerCanvas isPlaying={isPlaying} />
              </div>
              <div className="lg:col-span-2">
                <SequenceTimeline
                  track={currentTrack}
                  currentStep={currentStep}
                  bpm={bpm}
                  onChangeBpm={handleChangeBpm}
                  isPlaying={isPlaying}
                />
              </div>
            </div>

            {/* Stem Track Mixer with Playback & Audition Controls */}
            <StemMixer
              stems={stems}
              onUpdateStem={handleUpdateStem}
              onSoloAuditionStem={handleSoloAuditionStem}
              isPlaying={isPlaying}
              onTogglePlay={handleTogglePlay}
            />

            {/* Audio Download Exporter */}
            <AudioExporter
              track={currentTrack}
              stems={stems}
            />
          </div>
        )}

        {/* Tab 2: Generation History & Google Drive Library */}
        {activeTab === 'history' && (
          <HistoryViewer
            historyItems={historyItems}
            currentTrack={currentTrack}
            isPlaying={isPlaying}
            activeSoloStemId={activeSoloStemId}
            onPlayTrack={handlePlayTrack}
            onPlayTrackStem={handlePlayTrackStem}
            onSelectTrack={track => {
              handleSelectTrack(track);
              setActiveTab('generator');
            }}
            onUpdateHistoryTrack={handleUpdateTrackMetadata}
            onDeleteHistoryItem={handleDeleteHistoryItem}
            onSyncWithDrive={syncWithDrive}
            isSyncing={isSyncing}
            user={user}
            onLoginGoogle={handleLoginGoogle}
            onLogoutGoogle={handleLogoutGoogle}
          />
        )}
      </main>

      {/* Offline Status Pill for PWA */}
      <OfflineIndicator />

      {/* Modals */}
      <InfoModal
        isOpen={isInfoModalOpen}
        onClose={() => setIsInfoModalOpen(false)}
      />
      <DeveloperGuide
        isOpen={isDevGuideOpen}
        onClose={() => setIsDevGuideOpen(false)}
      />
    </div>
  );
}
