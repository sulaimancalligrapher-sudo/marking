import React, { useRef, useState, useEffect } from 'react';
import { 
  Play, Pause, SkipBack, SkipForward, Volume2, 
  VolumeX, Gauge, RotateCcw
} from 'lucide-react';

interface AudioPlayerProps {
  audioUrl: string | null;
  studentName: string;
  isLoading: boolean;
}

export default function AudioPlayer({ audioUrl, studentName, isLoading }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    // Reset play state when url changes
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
    }
  }, [audioUrl]);

  // Handle keyboard shortcut for play/pause (Space bar)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && audioUrl) {
        // Prevent default spacebar scrolling
        if (document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
          e.preventDefault();
          togglePlay();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [audioUrl, isPlaying]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio || !audioUrl) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().then(() => {
        setIsPlaying(true);
      }).catch(err => console.log("Playback error: ", err));
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const skipTime = (amount: number) => {
    if (audioRef.current) {
      let newTime = audioRef.current.currentTime + amount;
      if (newTime < 0) newTime = 0;
      if (newTime > duration) newTime = duration;
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const targetTime = Number(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = targetTime;
      setCurrentTime(targetTime);
    }
  };

  const changeSpeed = (rate: number) => {
    setPlaybackRate(rate);
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
    }
  };

  const toggleMute = () => {
    if (audioRef.current) {
      const nextMuted = !isMuted;
      audioRef.current.muted = nextMuted;
      setIsMuted(nextMuted);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setVolume(val);
    if (audioRef.current) {
      audioRef.current.volume = val;
      audioRef.current.muted = val === 0;
      setIsMuted(val === 0);
    }
  };

  // Helper to format seconds into MM:SS
  const formatTime = (timeInSeconds: number) => {
    if (isNaN(timeInSeconds)) return '00:00';
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-lg border border-slate-800 flex flex-col gap-4 font-sans">
      <audio
        ref={audioRef}
        src={audioUrl || undefined}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleAudioEnded}
      />

      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex flex-col">
          <span className="text-xs text-slate-400 font-sans">تسميع صوت الطالب</span>
          <span className="text-md font-bold text-emerald-400 font-sans">{studentName || 'غير معروف'}</span>
        </div>
        <div className="flex items-center gap-2 bg-slate-800/80 px-2.5 py-1.5 rounded-xl text-xs text-slate-300">
          <Gauge className="w-4 h-4 text-emerald-400" />
          <span>سرعة الاستماع: {playbackRate}x</span>
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-4 gap-2 text-slate-400 text-sm">
          <div className="w-4 h-4 border-2 border-slate-600 border-t-emerald-400 rounded-full animate-spin"></div>
          <span>جاري تحميل الملف الصوتي...</span>
        </div>
      )}

      {!audioUrl && !isLoading && (
        <p className="text-center py-4 text-xs text-slate-500 italic">لا يوجد ملف صوتي مرفق في هذا الدرس</p>
      )}

      {audioUrl && !isLoading && (
        <div className="flex flex-col gap-3">
          {/* Waves simulation visual decor */}
          <div className="flex items-end justify-center gap-[3px] h-12 px-4 py-2 bg-slate-950/60 rounded-xl overflow-hidden">
            {Array.from({ length: 42 }).map((_, i) => {
              // Create reactive heights simulation
              const isCenterActive = isPlaying ? Math.abs(currentTime % 3 - (i % 3)) < 1 : false;
              const hVal = isCenterActive 
                ? Math.max(15, Math.floor(Math.sin((i + currentTime) * 0.8) * 24) + 20)
                : Math.max(4, Math.floor(Math.sin(i * 0.5) * 8) + 10);
              return (
                <div 
                  key={i} 
                  className={`w-[4px] rounded-full transition-all duration-300 ${isPlaying ? 'bg-emerald-400' : 'bg-slate-700'}`}
                  style={{ height: `${hVal}px` }}
                />
              );
            })}
          </div>

          {/* Time slider */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-slate-400">{formatTime(currentTime)}</span>
            <input
              type="range"
              min="0"
              max={duration || 100}
              value={currentTime}
              onChange={handleSeekChange}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
            />
            <span className="text-xs font-mono text-slate-400">{formatTime(duration)}</span>
          </div>

          {/* Primary Controls */}
          <div className="flex flex-wrap items-center justify-between gap-4 mt-1">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => skipTime(-5)}
                className="p-2.5 bg-slate-800 hover:bg-slate-700 rounded-xl transition-all"
                title="إرجاع ٥ ثوانٍ"
              >
                <SkipBack className="w-4 h-4 text-slate-300" />
              </button>

              <button
                type="button"
                onClick={togglePlay}
                className="p-4 bg-emerald-500 hover:bg-emerald-600 active:scale-95 rounded-2xl shadow-md transition-all flex items-center justify-center"
                title="تشغيل / إيقاف مؤقت (المسافة)"
              >
                {isPlaying ? (
                  <Pause className="w-5 h-5 text-slate-950" />
                ) : (
                  <Play className="w-5 h-5 text-slate-950 fill-slate-950" />
                )}
              </button>

              <button
                type="button"
                onClick={() => skipTime(5)}
                className="p-2.5 bg-slate-800 hover:bg-slate-700 rounded-xl transition-all"
                title="تقديم ٥ ثوانٍ"
              >
                <SkipForward className="w-4 h-4 text-slate-300" />
              </button>

              <button
                type="button"
                onClick={() => {
                  if (audioRef.current) audioRef.current.currentTime = 0;
                  setCurrentTime(0);
                }}
                className="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-400"
                title="إعادة من البداية"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>

            {/* Speeds selector */}
            <div className="flex items-center gap-1.5 bg-slate-800/60 p-1 rounded-xl">
              {[0.75, 1.0, 1.25, 1.5, 1.75].map(rate => (
                <button
                  key={rate}
                  type="button"
                  onClick={() => changeSpeed(rate)}
                  className={`px-2 py-1 rounded-lg text-xs font-semibold transition-all ${playbackRate === rate ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:text-white'}`}
                >
                  {rate}x
                </button>
              ))}
            </div>

            {/* Volume */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={toggleMute}
                className="p-1.5 text-slate-400 hover:text-white transition-all"
              >
                {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-16 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-slate-300"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
