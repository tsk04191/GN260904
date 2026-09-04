import { GenerationHistoryItem, PresetTrack } from '../types';

const STORAGE_KEY = 'ai_music_studio_history_v1';

export const getLocalHistory = (): GenerationHistoryItem[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to read local history:', e);
    return [];
  }
};

export const saveLocalHistory = (items: GenerationHistoryItem[]): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch (e) {
    console.error('Failed to save local history:', e);
  }
};

export const addTrackToHistory = (
  track: PresetTrack,
  notes?: string
): GenerationHistoryItem => {
  const current = getLocalHistory();
  const newItem: GenerationHistoryItem = {
    id: `history-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    track,
    createdAt: new Date().toISOString(),
    syncedToDrive: false,
    notes,
  };

  const updated = [newItem, ...current.filter(item => item.track.id !== track.id)];
  saveLocalHistory(updated);
  return newItem;
};

export const updateHistoryItem = (
  updatedItem: GenerationHistoryItem
): GenerationHistoryItem[] => {
  const current = getLocalHistory();
  const updated = current.map(item => (item.id === updatedItem.id ? updatedItem : item));
  saveLocalHistory(updated);
  return updated;
};

const DELETED_IDS_KEY = 'ai_music_studio_deleted_ids_v1';

export const getDeletedItemIds = (): string[] => {
  try {
    const raw = localStorage.getItem(DELETED_IDS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const markItemIdDeleted = (id: string, trackId?: string) => {
  try {
    const ids = getDeletedItemIds();
    if (!ids.includes(id)) ids.push(id);
    if (trackId && !ids.includes(trackId)) ids.push(trackId);
    localStorage.setItem(DELETED_IDS_KEY, JSON.stringify(ids));
  } catch {
    // ignore
  }
};

export const removeHistoryItem = (id: string): GenerationHistoryItem[] => {
  const current = getLocalHistory();
  const target = current.find(item => item.id === id || item.track.id === id);
  if (target) {
    markItemIdDeleted(target.id, target.track.id);
  } else {
    markItemIdDeleted(id);
  }

  const updated = current.filter(item => item.id !== id && item.track.id !== id);
  saveLocalHistory(updated);
  return updated;
};

// Merge Drive items with local items, deduplicating by track.id or history id
export const mergeDriveAndLocalHistory = (
  driveItems: GenerationHistoryItem[],
  localItems: GenerationHistoryItem[]
): GenerationHistoryItem[] => {
  const map = new Map<string, GenerationHistoryItem>();

  // Add all local items first
  localItems.forEach(item => {
    map.set(item.track.id, item);
  });

  // Merge/Overwrite with Drive items (which are marked syncedToDrive: true)
  driveItems.forEach(item => {
    const existing = map.get(item.track.id);
    if (existing) {
      map.set(item.track.id, {
        ...existing,
        ...item,
        syncedToDrive: true,
      });
    } else {
      map.set(item.track.id, {
        ...item,
        syncedToDrive: true,
      });
    }
  });

  const deletedIds = new Set(getDeletedItemIds());
  const merged = Array.from(map.values())
    .filter(item => !deletedIds.has(item.id) && !deletedIds.has(item.track.id))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  saveLocalHistory(merged);
  return merged;
};
