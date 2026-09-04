import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const app = express();
const PORT = 3000;

// Body parsers (support large audio base64 uploads)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Lazy Gemini AI Client initialization
function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  return new GoogleGenAI({
    apiKey: apiKey || '',
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// System instruction for universal music & dynamic OST composition
const MUSIC_COMPOSER_SYSTEM_INSTRUCTION = `You are a world-class professional music producer, dynamic soundtrack architect, and songwriter across diverse genres (EDM, Synthwave, Cyberpunk, Cinematic Orchestral, Rock/Metal, Lo-Fi Chill, Pop, and Game Soundtracks).

Your task is to take a user's musical reference (game/song title, artist, genre, youtube info, or audio characteristics), user prompt, and lyrics requirements, then generate a complete, mathematically coherent 16-step multi-stem music configuration that can be rendered in real-time WebAudio synthesis, along with formatted lyrics if requested.

You MUST produce a JSON output adhering strictly to the schema.

Guidelines for musical generation:
1. BPM: between 75 and 180 according to the genre and energy level.
2. Key: Standard root minor/major keys (e.g., 'Fm', 'Am', 'Dm', 'Cm', 'Em', 'Gm', 'Bbm', 'Ebm', 'C', 'G', 'D', 'A', 'E', 'F').
3. Scale: Choose from 'minor', 'phrygian', 'dorian', 'harmonic_minor'.
4. Pattern generation:
   - bassLine: Exactly 16 integers (semitone offsets from root note, e.g. [0, 0, 3, 3, 5, 5, 2, 2, 0, 0, 3, 3, 7, 7, 5, 5])
   - leadArp: Exactly 16 integers (semitone offsets for arpeggios/leads, e.g. [0, 3, 7, 10, 12, 10, 7, 3, 0, 3, 7, 12, 15, 12, 7, 3])
   - harmonyChords: Exactly 4 chord names (e.g. ["Fm", "Db", "Eb", "C7"], ["Am", "F", "C", "G"], ["Dm", "Bb", "F", "C"])
   - drumPattern: 4 rows (row 0: Kick, row 1: Snare, row 2: Hihat, row 3: Perc), each row MUST have exactly 16 booleans.
5. synthType: Choose 'payday_industrial', 'arcane_cyber', 'gothic_organ', or 'mana_overdrive'.
6. Durations:
   - If durationOption is 'clip_30s': introDurationSec: 5, loopDurationSec: 20, exitDurationSec: 5
   - If durationOption is 'full': introDurationSec: 30, loopDurationSec: 45, exitDurationSec: 30
7. Lyrics generation (if lyricsOption is 'lyrics'):
   - Generate structured, rhythmic, emotive lyrics with section headers: [Verse 1], [Pre-Chorus], [Chorus], [Verse 2], [Bridge], [Outro].
   - If the user provided manual lyrics, polish and format them into the structured sections.
   - If lyricsOption is 'instrumental', lyrics should be null or empty string.
8. Titles and descriptions should be punchy, evocative, and provided in both Korean and English.`;

// API endpoint: Generate AI Dynamic Music Track & Stems
app.post('/api/generate-ost', async (req, res) => {
  try {
    const {
      referenceType = 'game_or_song',
      referenceInput = 'Cyberpunk Synthwave & EDM',
      userPrompt = '강렬한 일렉트로닉 비트와 감각적인 신스 베이스라인',
      durationOption = 'full', // 'full' | 'clip_30s'
      loopOption = 'loop',     // 'complete' | 'loop'
      lyricsOption = 'instrumental', // 'instrumental' | 'lyrics'
      lyricsGenerationMode = 'auto',  // 'auto' | 'manual'
      manualLyrics = '',
      audioBase64,
      audioMimeType = 'audio/mp3',
    } = req.body;

    const ai = getGeminiClient();

    let userMessage = `Reference Type: ${referenceType}
Reference Target / Title: ${referenceInput}
User Musical Prompt: ${userPrompt}
Duration Mode: ${durationOption === 'clip_30s' ? '30-second High-Impact Clip' : 'Full Version Track (~105s)'}
Loop/Structure Mode: ${loopOption === 'complete' ? 'Complete Standalone Song (Intro -> Verse -> Climax -> Ending Outro)' : 'Seamless Stage/Background Loop'}
Lyrics Option: ${lyricsOption === 'lyrics' ? `With Vocal Lyrics (Mode: ${lyricsGenerationMode})` : 'Instrumental (연주곡)'}
${lyricsOption === 'lyrics' && manualLyrics ? `User-Provided Lyrics / Theme to incorporate:\n${manualLyrics}` : ''}

Please compose and synthesize the complete dynamic music and multi-stem parameters according to this reference and request.`;

    const contents: any = [];

    // If audio file was uploaded, attach it for multimodal audio analysis
    if (audioBase64 && typeof audioBase64 === 'string') {
      contents.push({
        inlineData: {
          data: audioBase64.replace(/^data:audio\/[a-z0-9]+;base64,/, ''),
          mimeType: audioMimeType || 'audio/mp3',
        },
      });
      userMessage += `\n[Note: An audio file has been provided as reference. Analyze its tempo, key, mood, and rhythmic structure to inspire the synthesized track.]`;
    }

    contents.push({ text: userMessage });

    const response = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: contents,
      config: {
        systemInstruction: MUSIC_COMPOSER_SYSTEM_INSTRUCTION,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            title: { type: Type.STRING },
            koreanTitle: { type: Type.STRING },
            subtitle: { type: Type.STRING },
            genreTag: { type: Type.STRING },
            bpm: { type: Type.INTEGER },
            key: { type: Type.STRING },
            scale: {
              type: Type.STRING,
              enum: ['minor', 'phrygian', 'dorian', 'harmonic_minor'],
            },
            description: { type: Type.STRING },
            paydayReference: { type: Type.STRING },
            durationMode: { type: Type.STRING, enum: ['full', 'clip_30s'] },
            loopMode: { type: Type.STRING, enum: ['complete', 'loop'] },
            lyricsOption: { type: Type.STRING, enum: ['instrumental', 'lyrics'] },
            lyrics: {
              type: Type.STRING,
              description: 'Formatted lyrics with [Verse 1], [Chorus], etc. if lyricsOption is lyrics.',
            },
            introDurationSec: { type: Type.INTEGER },
            loopDurationSec: { type: Type.INTEGER },
            exitDurationSec: { type: Type.INTEGER },
            synthType: {
              type: Type.STRING,
              enum: [
                'payday_industrial',
                'arcane_cyber',
                'gothic_organ',
                'mana_overdrive',
              ],
            },
            pattern: {
              type: Type.OBJECT,
              properties: {
                bassLine: {
                  type: Type.ARRAY,
                  items: { type: Type.INTEGER },
                  description: '16 semitone offset numbers for 16 steps',
                },
                leadArp: {
                  type: Type.ARRAY,
                  items: { type: Type.INTEGER },
                  description: '16 semitone offset numbers for lead synth',
                },
                harmonyChords: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: '4 chord names like Fm, Db, Eb, C7',
                },
                drumPattern: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.ARRAY,
                    items: { type: Type.BOOLEAN },
                  },
                  description:
                    '4 rows (Kick, Snare, Hihat, Perc), 16 booleans each',
                },
              },
              required: ['bassLine', 'leadArp', 'harmonyChords', 'drumPattern'],
            },
            aiAnalysisComment: {
              type: Type.STRING,
              description:
                'Brief explanation of how the reference and prompt influenced the synthesized instruments, harmony, and rhythm.',
            },
          },
          required: [
            'id',
            'title',
            'koreanTitle',
            'subtitle',
            'genreTag',
            'bpm',
            'key',
            'scale',
            'description',
            'paydayReference',
            'introDurationSec',
            'loopDurationSec',
            'exitDurationSec',
            'synthType',
            'pattern',
          ],
        },
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error('Gemini did not return any output text.');
    }

    const generatedTrack = JSON.parse(text);

    // Sanitize track id & defaults
    if (!generatedTrack.id) {
      generatedTrack.id = 'ai-music-' + Date.now();
    } else {
      generatedTrack.id =
        'ai-' + generatedTrack.id.toLowerCase().replace(/[^a-z0-9]/g, '-');
    }

    // Ensure durations match toggle options accurately
    if (durationOption === 'clip_30s') {
      generatedTrack.introDurationSec = 5;
      generatedTrack.loopDurationSec = 20;
      generatedTrack.exitDurationSec = 5;
    } else {
      generatedTrack.introDurationSec = 30;
      generatedTrack.loopDurationSec = 45;
      generatedTrack.exitDurationSec = 30;
    }

    generatedTrack.durationMode = durationOption;
    generatedTrack.loopMode = loopOption;
    generatedTrack.lyricsOption = lyricsOption;
    if (lyricsOption === 'lyrics' && !generatedTrack.lyrics && manualLyrics) {
      generatedTrack.lyrics = manualLyrics;
    }

    res.json({
      success: true,
      track: generatedTrack,
    });
  } catch (error: any) {
    console.error('Error generating Music with Gemini:', error);
    res.status(500).json({
      success: false,
      error: error.message || '음악 생성 중 오류가 발생했습니다.',
    });
  }
});

// API endpoint: Standalone Lyrics Generation
app.post('/api/generate-lyrics', async (req, res) => {
  try {
    const { genre, mood, prompt, title } = req.body;
    const ai = getGeminiClient();

    const lyricsPrompt = `You are a hit songwriter. Write compelling, rhythmic lyrics for a song titled "${title || 'Untitled'}" with genre "${genre || 'Pop/EDM'}" and mood/theme "${prompt || mood || 'Energetic and inspiring'}".
Format the lyrics clearly with section headings like [Verse 1], [Pre-Chorus], [Chorus], [Verse 2], [Bridge], [Chorus], [Outro].
Write primarily in Korean with natural English punchlines/hooks if appropriate for modern K-Pop/EDM style.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: [{ text: lyricsPrompt }],
    });

    res.json({
      success: true,
      lyrics: response.text || '',
    });
  } catch (error: any) {
    console.error('Error generating lyrics:', error);
    res.status(500).json({
      success: false,
      error: error.message || '가사 생성 중 오류가 발생했습니다.',
    });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Vite middleware for development vs static hosting in production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Arcane Heist OST Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
