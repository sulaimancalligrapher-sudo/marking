import React, { useRef, useState, useEffect } from "react";
import { Play, Pause, Volume2, VolumeX, RotateCcw, FastForward, Activity } from "lucide-react";

interface AudioPlayerProps {
  fileId: string;
}

export function ProfessionalAudioPlayer({ fileId }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);

  const mediaUrl = `/api/media/${fileId}`;

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.load();
      setIsPlaying(false);
      setCurrentTime(0);
    }
  }, [fileId]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(err => console.error("Playback failed:", err));
    }
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

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = val;
      setCurrentTime(val);
    }
  };

  const handlePlaybackRateChange = (rate: number) => {
    setPlaybackRate(rate);
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    setIsMuted(val === 0);
    if (audioRef.current) {
      audioRef.current.volume = val;
      audioRef.current.muted = val === 0;
    }
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    const nextMute = !isMuted;
    setIsMuted(nextMute);
    audioRef.current.muted = nextMute;
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return "00:00";
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-xl max-w-xl mx-auto text-white">
      <audio
        ref={audioRef}
        src={mediaUrl}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => setIsPlaying(false)}
      />

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 bg-amber-500/10 text-amber-400 px-3 py-1 rounded-full text-xs font-semibold">
          <Activity className="w-4 h-4 animate-pulse" />
          <span>مستمع الصوت الاحترافي المباشر</span>
        </div>
        <div className="text-zinc-500 text-xs font-mono">
          ID: {fileId.substring(0, 8)}...
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {/* Progress Bar & Seek */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-zinc-400 w-10 text-right">
            {formatTime(currentTime)}
          </span>
          <div className="flex-1 relative group">
            <input
              type="range"
              min={0}
              max={duration || 100}
              value={currentTime}
              onChange={handleSeekChange}
              className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
            {/* Simulated Audio Waveform Bar Background */}
            <div className="absolute inset-0 flex items-center justify-between pointer-events-none opacity-10 h-1.5 px-1">
              {Array.from({ length: 40 }).map((_, i) => (
                <div 
                  key={i} 
                  className="w-0.5 bg-white rounded-full" 
                  style={{ height: `${Math.sin(i * 0.2) * 8 + 10}px` }}
                />
              ))}
            </div>
          </div>
          <span className="text-xs font-mono text-zinc-400 w-10 text-left">
            {formatTime(duration)}
          </span>
        </div>

        {/* Controls Panel */}
        <div className="flex flex-wrap items-center justify-between gap-4 mt-2">
          {/* Main Playback Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={togglePlay}
              className="w-12 h-12 bg-amber-500 hover:bg-amber-400 active:scale-95 text-zinc-950 flex items-center justify-center rounded-full transition-all shadow-md shadow-amber-500/20"
            >
              {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current translate-x-0.5" />}
            </button>
            
            <button
              onClick={() => {
                if (audioRef.current) {
                  audioRef.current.currentTime = 0;
                  setCurrentTime(0);
                }
              }}
              title="إعادة الاستماع"
              className="w-9 h-9 border border-zinc-700 hover:bg-zinc-800 active:scale-95 text-zinc-300 flex items-center justify-center rounded-full transition-all"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          {/* Speed / Playback rate selectors */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-zinc-400 ml-1">سرعة الصوت:</span>
            {[0.5, 0.8, 1, 1.2, 1.5].map((rate) => (
              <button
                key={rate}
                onClick={() => handlePlaybackRateChange(rate)}
                className={`px-2 py-1 rounded text-xs transition-all font-mono border ${
                  playbackRate === rate
                    ? "bg-amber-500 text-zinc-950 border-amber-500 font-bold"
                    : "border-zinc-800 text-zinc-400 hover:bg-zinc-800"
                }`}
              >
                {rate}x
              </button>
            ))}
          </div>

          {/* Volume Control */}
          <div className="flex items-center gap-2">
            <button onClick={toggleMute} className="text-zinc-400 hover:text-white transition-colors">
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={isMuted ? 0 : volume}
              onChange={handleVolumeChange}
              className="w-20 h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

interface VideoPlayerProps {
  fileId: string;
}

export function ProfessionalVideoPlayer({ fileId }: VideoPlayerProps) {
  const mediaUrl = `/api/media/${fileId}`;

  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl max-w-2xl mx-auto relative group">
      <video
        src={mediaUrl}
        controls
        className="w-full max-h-[400px] object-contain block"
      />
      <div className="absolute top-4 left-4 bg-zinc-900/80 backdrop-blur border border-zinc-800 text-zinc-300 px-3 py-1 rounded-full text-xs font-mono">
        Video Player
      </div>
    </div>
  );
}
