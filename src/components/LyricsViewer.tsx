import React, { useState } from 'react';
import { Mic2, Copy, Check, Sparkles, Edit3, Volume2, Music2 } from 'lucide-react';

interface LyricsViewerProps {
  lyrics?: string;
  songTitle: string;
  genreTag: string;
  onUpdateLyrics: (newLyrics: string) => void;
  onGenerateLyricsWithAi: () => void;
  isGeneratingLyrics: boolean;
}

export const LyricsViewer: React.FC<LyricsViewerProps> = ({
  lyrics,
  songTitle,
  genreTag,
  onUpdateLyrics,
  onGenerateLyricsWithAi,
  isGeneratingLyrics
}) => {
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(lyrics || '');

  const handleCopy = async () => {
    if (!lyrics) return;
    try {
      await navigator.clipboard.writeText(lyrics);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveEdit = () => {
    onUpdateLyrics(editedText);
    setIsEditing(false);
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl backdrop-blur-md relative overflow-hidden">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-pink-500/20 border border-pink-500/30 text-pink-400">
            <Mic2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-100 flex items-center gap-2">
              곡 가사 스튜디오 (Song Lyrics Studio)
              {lyrics ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-pink-950 text-pink-300 border border-pink-700">
                  VOCAL TRACK
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-800 text-slate-400 border border-slate-700">
                  INSTRUMENTAL
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {songTitle} • {genreTag}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {lyrics && (
            <>
              <button
                type="button"
                onClick={handleCopy}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? '복사 완료!' : '가사 복사'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (isEditing) {
                    handleSaveEdit();
                  } else {
                    setEditedText(lyrics);
                    setIsEditing(true);
                  }
                }}
                className="px-3 py-1.5 rounded-xl bg-indigo-950 hover:bg-indigo-900 text-indigo-300 border border-indigo-700 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>{isEditing ? '수정 저장' : '가사 직접 편집'}</span>
              </button>
            </>
          )}

          <button
            type="button"
            onClick={onGenerateLyricsWithAi}
            disabled={isGeneratingLyrics}
            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-pink-500 to-indigo-600 hover:from-pink-400 hover:to-indigo-500 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-md shadow-pink-950/40 transition-all cursor-pointer disabled:opacity-50"
          >
            <Sparkles className={`w-3.5 h-3.5 ${isGeneratingLyrics ? 'animate-spin' : ''}`} />
            <span>{isGeneratingLyrics ? 'AI 가사 작성 중...' : '🪄 AI 가사 자동 생성'}</span>
          </button>
        </div>
      </div>

      {/* Body */}
      {isEditing ? (
        <div className="space-y-3">
          <textarea
            value={editedText}
            onChange={e => setEditedText(e.target.value)}
            rows={8}
            className="w-full bg-slate-950 border border-slate-700 rounded-xl p-4 text-xs font-mono text-slate-200 focus:outline-none focus:border-pink-500 leading-relaxed resize-y"
            placeholder="[Verse 1]&#10;가사를 입력하세요...&#10;&#10;[Chorus]&#10;후렴구 가사..."
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs cursor-pointer hover:bg-slate-700"
            >
              취소
            </button>
            <button
              type="button"
              onClick={handleSaveEdit}
              className="px-4 py-1.5 rounded-lg bg-pink-500 text-slate-950 font-bold text-xs cursor-pointer hover:bg-pink-400"
            >
              적용하기
            </button>
          </div>
        </div>
      ) : lyrics ? (
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-4 max-h-60 overflow-y-auto">
          <pre className="whitespace-pre-wrap font-sans text-xs text-slate-300 leading-relaxed tracking-wide">
            {lyrics}
          </pre>
        </div>
      ) : (
        <div className="p-6 rounded-xl bg-slate-950/50 border border-dashed border-slate-800 text-center flex flex-col items-center justify-center">
          <Music2 className="w-8 h-8 text-slate-600 mb-2" />
          <p className="text-xs text-slate-400 font-medium mb-3">
            현재 연주곡(Instrumental) 모드로 설정되어 있습니다.
          </p>
          <button
            type="button"
            onClick={onGenerateLyricsWithAi}
            disabled={isGeneratingLyrics}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-pink-300 border border-pink-500/30 text-xs font-bold flex items-center gap-2 transition-all cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-pink-400" />
            <span>이 곡에 맞는 AI 보컬 가사 생성하기</span>
          </button>
        </div>
      )}
    </div>
  );
};
