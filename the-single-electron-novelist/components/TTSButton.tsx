import React, { useState, useRef, useEffect } from 'react';
import { streamTTS, generateSpeechRaw } from '../services/geminiService';
import { createWavBlob } from '../services/audioUtils';
import { Play, Square, Loader2, Download } from 'lucide-react';

interface TTSButtonProps {
  text: string;
  className?: string;
  title?: string;
}

export const TTSButton: React.FC<TTSButtonProps> = ({ text, className, title }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);

  useEffect(() => {
    return () => {
      stopAudio();
    };
  }, []);

  const stopAudio = () => {
    if (sourceRef.current) {
      sourceRef.current.stop();
      sourceRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    setIsPlaying(false);
    setIsLoading(false);
  };

  const playAudio = async () => {
    if (isPlaying) {
      stopAudio();
      return;
    }

    if (!text) return;

    setIsLoading(true);
    try {
      await streamTTS(text, (buffer) => {
        if (!audioContextRef.current) {
          audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        }
        
        const ctx = audioContextRef.current;
        if(ctx.state === 'suspended') {
            ctx.resume();
        }

        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        source.onended = () => {
             setIsPlaying(false);
             sourceRef.current = null;
        };
        sourceRef.current = source;
        source.start();
        setIsLoading(false);
        setIsPlaying(true);
      });
    } catch (e) {
      console.error("TTS Error", e);
      setIsLoading(false);
      setIsPlaying(false);
    }
  };

  const downloadAudio = async () => {
    if (!text) return;
    setIsDownloading(true);
    try {
        const rawBytes = await generateSpeechRaw(text);
        if (rawBytes) {
            const wavBlob = createWavBlob(rawBytes);
            const url = URL.createObjectURL(wavBlob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${title || 'audio'}_snippet.wav`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }
    } catch (e) {
        console.error("Download Error", e);
        alert("Failed to download audio.");
    } finally {
        setIsDownloading(false);
    }
  };

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <button
        onClick={playAudio}
        disabled={isLoading || isDownloading || !text}
        className={`p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
        title="Read Aloud"
      >
        {isLoading ? (
          <Loader2 size={18} className="animate-spin text-blue-500" />
        ) : isPlaying ? (
          <Square size={18} className="text-red-500 fill-current" />
        ) : (
          <Play size={18} className="text-gray-600 dark:text-gray-300 fill-current" />
        )}
      </button>

      <button
        onClick={downloadAudio}
        disabled={isLoading || isDownloading || !text}
        className={`p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors ${isDownloading ? 'opacity-50 cursor-not-allowed' : ''}`}
        title="Download WAV"
      >
         {isDownloading ? (
            <Loader2 size={16} className="animate-spin text-green-500" />
         ) : (
            <Download size={16} className="text-gray-500 dark:text-gray-400" />
         )}
      </button>
    </div>
  );
};
