import { GenerationHistoryItem, PresetTrack } from '../types';

const DRIVE_API_BASE = 'https://www.googleapis.com/drive/v3';
const DRIVE_UPLOAD_BASE = 'https://www.googleapis.com/upload/drive/v3';
export const DRIVE_FOLDER_NAME = 'AI_Music_Studio_History';
const INDEX_FILENAME = 'ai_music_history_index.json';

// Find or create the dedicated app folder in Google Drive
export const findOrCreateAppFolder = async (accessToken: string): Promise<string> => {
  const query = `name = '${DRIVE_FOLDER_NAME}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
  const listRes = await fetch(
    `${DRIVE_API_BASE}/files?q=${encodeURIComponent(query)}&fields=files(id,name,webViewLink)`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!listRes.ok) {
    const errorText = await listRes.text();
    throw new Error(`Google Drive 폴더 조회 실패: ${errorText}`);
  }

  const listData = await listRes.json();
  if (listData.files && listData.files.length > 0) {
    return listData.files[0].id;
  }

  // Create folder
  const createRes = await fetch(`${DRIVE_API_BASE}/files`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: DRIVE_FOLDER_NAME,
      mimeType: 'application/vnd.google-apps.folder',
      description: 'AI Music Studio에서 생성된 음악 트랙 및 스템 이력 보관함',
    }),
  });

  if (!createRes.ok) {
    const errorText = await createRes.text();
    throw new Error(`Google Drive 폴더 생성 실패: ${errorText}`);
  }

  const folderData = await createRes.json();
  return folderData.id;
};

// Save a track to Google Drive (as JSON project and updates index)
export const saveTrackToDrive = async (
  accessToken: string,
  historyItem: GenerationHistoryItem
): Promise<{ fileId: string; folderId: string; webViewLink?: string }> => {
  const folderId = await findOrCreateAppFolder(accessToken);

  // Clean filename
  const cleanTitle = (historyItem.track.title || 'track').replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `track_${cleanTitle}_${historyItem.id.slice(0, 8)}.aimusic.json`;

  const metadata = {
    name: filename,
    parents: [folderId],
    mimeType: 'application/json',
    description: `AI Music Studio Track: ${historyItem.track.koreanTitle} (${historyItem.track.genreTag})`,
  };

  const fileContent = JSON.stringify(historyItem, null, 2);

  const boundary = '-------314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const multipartRequestBody =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    'Content-Type: application/json\r\n\r\n' +
    fileContent +
    closeDelimiter;

  const uploadRes = await fetch(
    `${DRIVE_UPLOAD_BASE}/files?uploadType=multipart&fields=id,name,webViewLink`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: multipartRequestBody,
    }
  );

  if (!uploadRes.ok) {
    const errorText = await uploadRes.text();
    throw new Error(`Google Drive 파일 업로드 실패: ${errorText}`);
  }

  const uploadedData = await uploadRes.json();
  return {
    fileId: uploadedData.id,
    folderId,
    webViewLink: uploadedData.webViewLink,
  };
};

// Upload generated WAV audio file directly to Google Drive
export const uploadWavAudioToDrive = async (
  accessToken: string,
  wavBlob: Blob,
  filename: string,
  description?: string
): Promise<{ audioFileId: string; webViewLink?: string }> => {
  const folderId = await findOrCreateAppFolder(accessToken);

  const metadata = {
    name: filename,
    parents: [folderId],
    mimeType: 'audio/wav',
    description: description || 'AI Music Studio High-Fidelity WAV Export',
  };

  const boundary = '-------WAV314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  // Convert Blob to ArrayBuffer for multipart body
  const metadataString =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    'Content-Type: audio/wav\r\n\r\n';

  const metadataBytes = new TextEncoder().encode(metadataString);
  const closingBytes = new TextEncoder().encode(closeDelimiter);
  const wavBuffer = await wavBlob.arrayBuffer();

  const combinedBody = new Uint8Array(
    metadataBytes.byteLength + wavBuffer.byteLength + closingBytes.byteLength
  );
  combinedBody.set(metadataBytes, 0);
  combinedBody.set(new Uint8Array(wavBuffer), metadataBytes.byteLength);
  combinedBody.set(closingBytes, metadataBytes.byteLength + wavBuffer.byteLength);

  const uploadRes = await fetch(
    `${DRIVE_UPLOAD_BASE}/files?uploadType=multipart&fields=id,name,webViewLink`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: combinedBody,
    }
  );

  if (!uploadRes.ok) {
    const errorText = await uploadRes.text();
    throw new Error(`WAV 오디오 Google Drive 업로드 실패: ${errorText}`);
  }

  const result = await uploadRes.json();
  return {
    audioFileId: result.id,
    webViewLink: result.webViewLink,
  };
};

// Fetch all tracks and sync history from Google Drive
export const fetchTracksFromDrive = async (
  accessToken: string
): Promise<GenerationHistoryItem[]> => {
  const folderId = await findOrCreateAppFolder(accessToken);

  // Search for JSON track files in the folder
  const query = `'${folderId}' in parents and name contains '.aimusic.json' and trashed = false`;
  const listRes = await fetch(
    `${DRIVE_API_BASE}/files?q=${encodeURIComponent(query)}&fields=files(id,name,createdTime,webViewLink)&orderBy=createdTime desc`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!listRes.ok) {
    const errorText = await listRes.text();
    throw new Error(`Google Drive 음악 목록 조회 실패: ${errorText}`);
  }

  const listData = await listRes.json();
  const files = listData.files || [];

  const items: GenerationHistoryItem[] = [];

  // Download content for each track metadata
  await Promise.all(
    files.map(async (file: any) => {
      try {
        const contentRes = await fetch(`${DRIVE_API_BASE}/files/${file.id}?alt=media`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (contentRes.ok) {
          const itemJson = await contentRes.json();
          items.push({
            ...itemJson,
            driveFileId: file.id,
            driveFolderId: folderId,
            driveWebViewLink: file.webViewLink || itemJson.driveWebViewLink,
            syncedToDrive: true,
          });
        }
      } catch (e) {
        console.warn('Failed to parse file from drive:', file.id, e);
      }
    })
  );

  // Sort descending by creation date
  return items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
};

// Update an existing track file on Google Drive
export const updateTrackOnDrive = async (
  accessToken: string,
  historyItem: GenerationHistoryItem
): Promise<void> => {
  if (!historyItem.driveFileId) return;

  const metadata = {
    description: `AI Music Studio Track: ${historyItem.track.koreanTitle} (${historyItem.track.genreTag})`,
  };

  const fileContent = JSON.stringify(historyItem, null, 2);
  const boundary = '-------314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const multipartRequestBody =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    'Content-Type: application/json\r\n\r\n' +
    fileContent +
    closeDelimiter;

  const res = await fetch(
    `${DRIVE_UPLOAD_BASE}/files/${historyItem.driveFileId}?uploadType=multipart`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: multipartRequestBody,
    }
  );

  if (!res.ok) {
    const errorText = await res.text();
    console.warn(`Drive file update warning: ${errorText}`);
  }
};

// Delete a track file from Google Drive
export const deleteTrackFromDrive = async (
  accessToken: string,
  driveFileId: string
): Promise<void> => {
  const res = await fetch(`${DRIVE_API_BASE}/files/${driveFileId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok && res.status !== 404) {
    const errorText = await res.text();
    throw new Error(`Google Drive 파일 삭제 실패: ${errorText}`);
  }
};
