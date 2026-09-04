import React, { useEffect, useRef } from 'react';
import { globalSynthEngine } from '../audio/synthEngine';

interface VisualizerCanvasProps {
  isPlaying: boolean;
}

export const VisualizerCanvas: React.FC<VisualizerCanvasProps> = ({ isPlaying }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const render = () => {
      animId = requestAnimationFrame(render);
      const width = canvas.width;
      const height = canvas.height;

      ctx.clearRect(0, 0, width, height);

      // Background subtle gradient
      const bgGrad = ctx.createLinearGradient(0, 0, width, height);
      bgGrad.addColorStop(0, '#0a0f1d');
      bgGrad.addColorStop(1, '#020617');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      const analyser = globalSynthEngine.getAnalyser();

      if (analyser && isPlaying) {
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyser.getByteFrequencyData(dataArray);

        // Draw Spectrum Bars
        const barWidth = (width / bufferLength) * 2.2;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          const barHeight = (dataArray[i] / 255) * (height * 0.8);

          const grad = ctx.createLinearGradient(0, height, 0, height - barHeight);
          grad.addColorStop(0, '#06b6d4'); // Cyan
          grad.addColorStop(0.5, '#6366f1'); // Indigo
          grad.addColorStop(1, '#ec4899'); // Pink

          ctx.fillStyle = grad;
          ctx.fillRect(x, height - barHeight, Math.max(1, barWidth - 1), barHeight);

          x += barWidth;
        }

        // Draw Central Energy Pulse Ring
        let bassSum = 0;
        for (let i = 0; i < 8; i++) bassSum += dataArray[i];
        const bassAvg = bassSum / 8;
        const pulseRadius = 20 + (bassAvg / 255) * 30;

        ctx.save();
        ctx.beginPath();
        ctx.arc(width / 2, height / 2, pulseRadius, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(6, 182, 212, 0.6)';
        ctx.lineWidth = 2.5;
        ctx.shadowBlur = 12;
        ctx.shadowColor = '#06b6d4';
        ctx.stroke();
        ctx.restore();

      } else {
        // Idle animation
        ctx.fillStyle = '#334155';
        ctx.font = '11px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('AUDIO ENGINE READY • CLICK PLAY TO SYNTHESIZE', width / 2, height / 2 + 4);
      }
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [isPlaying]);

  return (
    <div className="relative w-full h-full min-h-[140px] bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 shadow-xl flex flex-col justify-between p-3">
      <div className="flex items-center justify-between text-[10px] font-mono text-cyan-400">
        <span className="px-2 py-0.5 rounded bg-slate-950/80 border border-cyan-500/30">
          LIVE FFT SPECTRUM
        </span>
        <span className="text-slate-400">
          {isPlaying ? '● AUDIO ACTIVE' : '○ STANDBY'}
        </span>
      </div>

      <canvas
        ref={canvasRef}
        width={600}
        height={140}
        className="w-full h-24 rounded-lg object-cover"
      />

      <div className="text-[10px] text-slate-500 font-mono text-center">
        32-Band Web Audio AnalyserNode
      </div>
    </div>
  );
};
