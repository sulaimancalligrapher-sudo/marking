import React, { useRef, useState, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, FastForward, Rewind } from 'lucide-react';

interface AudioPlayerProps {
  audioUrl: string;
}

export default function AudioPlayer({ audioUrl }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [volume, setVolume] = useState<number>(0.8);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [playbackRate, setPlaybackRate] = useState<number>(1);

  // Equalizer visual animation frame
  const [visualizerBars, setVisualizerBars] = useState<number[]>(new Array(18).fill(20));
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    // Reset player states on audio URL changes
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    if (audioRef.current) {
      audioRef.current.load();
    }
  }, [audioUrl]);

  // Handle playing state
  useEffect(() => {
    if (isPlaying) {
      audioRef.current?.play().catch(() => setIsPlaying(false));
      animateVisualizer();
    } else {
      audioRef.current?.pause();
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      setVisualizerBars(new Array(18).fill(2));
    }
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isPlaying]);

  // Animate Equalizer
  const animateVisualizer = () => {
    setVisualizerBars(prev =>
      prev.map(() => Math.floor(Math.random() * 32) + 6)
    );
    animationRef.current = requestAnimationFrame(animateVisualizer);
  };

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration || 0);
    }
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = val;
      setCurrentTime(val);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (audioRef.current) {
      audioRef.current.volume = val;
      audioRef.current.muted = val === 0;
      setIsMuted(val === 0);
    }
  };

  const toggleMute = () => {
    if (audioRef.current) {
      const nextMute = !isMuted;
      setIsMuted(nextMute);
      audioRef.current.muted = nextMute;
    }
  };

  const handleSpeedChange = (rate: number) => {
    setPlaybackRate(rate);
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
    }
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return '00:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  return (
    <div className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg text-slate-100 flex flex-col gap-6" dir="rtl">
      {/* Invisible HTML5 Audio Tag */}
      <audio
        ref={audioRef}
        src={audioUrl}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleAudioEnded}
      />

      {/* Simulated Waveform Visualizer */}
      <div className="flex items-center justify-center gap-1.5 h-16 bg-slate-950/60 rounded-xl px-4 border border-slate-800/80">
        {visualizerBars.map((height, i) => (
          <div
            key={i}
            className="w-1.5 rounded-full bg-gradient-to-t from-emerald-500 to-teal-400 transition-all duration-75"
            style={{ height: `${height}px` }}
          />
        ))}
      </div>

      {/* Custom Timeline Slider */}
      <div className="flex flex-col gap-2">
        <input
          type="range"
          min="0"
          max={duration || 100}
          value={currentTime}
          onChange={handleSeek}
          className="w-full h-1.5 rounded-lg appearance-none cursor-pointer bg-slate-800 accent-emerald-500"
        />
        <div className="flex justify-between text-xs font-semibold text-slate-400 tracking-wider">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Core Player Controls Row */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        
        {/* Playback Controls */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              if (audioRef.current) {
                audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - 5);
              }
            }}
            className="p-2 rounded-lg bg-slate-850 hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition"
            title="رجوع 5 ثواني"
          >
            <Rewind size={20} />
          </button>

          <button
            onClick={togglePlay}
            className="w-12 h-12 rounded-full flex items-center justify-center bg-emerald-600 hover:bg-emerald-500 text-white shadow-md hover:shadow-emerald-500/20 hover:scale-105 transition"
          >
            {isPlaying ? <Pause size={22} fill="white" /> : <Play size={22} className="mr-0.5" fill="white" />}
          </button>

          <button
            onClick={() => {
              if (audioRef.current) {
                audioRef.current.currentTime = Math.min(duration, audioRef.current.currentTime + 5);
              }
            }}
            className="p-2 rounded-lg bg-slate-850 hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition"
            title="تقديم 5 ثواني"
          >
            <FastForward size={20} />
          </button>
        </div>

        {/* Playback Rate speed selectors */}
        <div className="flex items-center gap-1.5 bg-slate-850 border border-slate-800 p-1 rounded-xl">
          {[1, 1.25, 1.5, 2].map(speed => (
            <button
              key={speed}
              onClick={() => handleSpeedChange(speed)}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition ${
                playbackRate === speed
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              {speed}x
            </button>
          ))}
        </div>

        {/* Volume controller */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleMute}
            className="text-slate-400 hover:text-slate-200 transition"
          >
            {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={isMuted ? 0 : volume}
            onChange={handleVolumeChange}
            className="w-20 h-1 rounded-lg appearance-none bg-slate-800 accent-emerald-500"
          />
        </div>

      </div>
    </div>
  );
}
