import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, RotateCcw, Volume2, VolumeX, Gauge } from 'lucide-react';

interface AudioPlayerProps {
  src: string;
  title?: string;
}

export default function AudioPlayer({ src, title = 'تسجيل الطالب الصوتي' }: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressRef = useRef<HTMLDivElement | null>(null);

  const [cleanSrc, setCleanSrc] = useState('');

  useEffect(() => {
    // Reset state on source change
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);

    if (src) {
      if (src.includes('drive.google.com')) {
        let fileId = '';
        const driveRegExp = /\/file\/d\/([a-zA-Z0-9-_]+)/;
        const match = src.match(driveRegExp);
        if (match && match[1]) {
          fileId = match[1];
        } else {
          const idRegExp = /[?&]id=([a-zA-Z0-9-_]+)/;
          const idMatch = src.match(idRegExp);
          if (idMatch && idMatch[1]) {
            fileId = idMatch[1];
          }
        }

        if (fileId) {
          setCleanSrc(`/api/drive-proxy?id=${fileId}`);
        } else {
          setCleanSrc(src);
        }
      } else {
        setCleanSrc(src);
      }
    } else {
      setCleanSrc('');
    }
  }, [src]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(err => console.log('Audio playback failed:', err));
    }
    setIsPlaying(!isPlaying);
  };

  const restart = () => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = 0;
    setCurrentTime(0);
    if (!isPlaying) {
      audioRef.current.play().catch(err => console.log('Audio playback failed:', err));
      setIsPlaying(true);
    }
  };

  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    setCurrentTime(audioRef.current.currentTime);
  };

  const handleLoadedMetadata = () => {
    if (!audioRef.current) return;
    setDuration(audioRef.current.duration);
  };

  const handleSpeedChange = (rate: number) => {
    if (!audioRef.current) return;
    setPlaybackRate(rate);
    audioRef.current.playbackRate = rate;
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    setVolume(v);
    setIsMuted(v === 0);
    if (audioRef.current) {
      audioRef.current.volume = v;
      audioRef.current.muted = v === 0;
    }
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    const nextMute = !isMuted;
    setIsMuted(nextMute);
    audioRef.current.muted = nextMute;
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || !progressRef.current || duration === 0) return;
    const rect = progressRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;
    const percentage = clickX / width;
    const newTime = percentage * duration;
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return '00:00';
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="bg-zinc-950/80 border border-zinc-800 rounded-2xl p-5 shadow-inner" id="audio-player">
      <audio
        ref={audioRef}
        src={cleanSrc}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => setIsPlaying(false)}
      />

      <div className="space-y-4">
        {/* Title and Badge */}
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">مشغل الصوت الذكي</span>
          <h4 className="text-sm font-bold text-zinc-200 font-sans">{title}</h4>
        </div>

        {/* Audio Progress Bar */}
        <div className="space-y-1">
          <div
            ref={progressRef}
            onClick={handleProgressClick}
            className="w-full h-3 bg-zinc-900 rounded-full overflow-hidden cursor-pointer relative group"
          >
            {/* Hover tooltip or highlight */}
            <div className="absolute inset-0 bg-zinc-800 opacity-0 group-hover:opacity-30 transition-opacity" />
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full relative transition-all duration-100"
              style={{ width: `${progressPercent}%` }}
            >
              {/* Pulsing playhead */}
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white shadow-lg border border-blue-600 scale-0 group-hover:scale-100 transition-transform" />
            </div>
          </div>

          <div className="flex justify-between text-[11px] font-mono text-zinc-500">
            <span>{formatTime(duration)}</span>
            <span>{formatTime(currentTime)}</span>
          </div>
        </div>

        {/* Player Controls Panel */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-1 border-t border-zinc-900/50">
          
          {/* Main Action Buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={togglePlay}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 shadow-md cursor-pointer ${
                isPlaying
                  ? 'bg-red-500 hover:bg-red-600 text-white shadow-red-950/20'
                  : 'bg-blue-500 hover:bg-blue-600 text-white shadow-blue-950/20'
              }`}
            >
              {isPlaying ? <Pause className="w-5.5 h-5.5 fill-white" /> : <Play className="w-5.5 h-5.5 fill-white ml-0.5" />}
            </button>

            <button
              onClick={restart}
              className="w-10 h-10 rounded-full bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-400 hover:text-zinc-200 flex items-center justify-center transition-all cursor-pointer"
              title="إعادة التشغيل من البداية"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          {/* Playback Speed Controller */}
          <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-850 px-2.5 py-1.5 rounded-xl">
            <Gauge className="w-3.5 h-3.5 text-zinc-500" />
            <div className="flex items-center gap-1.5 text-[10.5px] font-semibold text-zinc-400">
              {[0.5, 1, 1.25, 1.5, 2].map((rate) => (
                <button
                  key={rate}
                  onClick={() => handleSpeedChange(rate)}
                  className={`px-2 py-1 rounded transition-all cursor-pointer ${
                    playbackRate === rate
                      ? 'bg-zinc-800 text-[#d4a017] border border-zinc-700/60'
                      : 'hover:text-zinc-200'
                  }`}
                >
                  {rate}x
                </button>
              ))}
            </div>
          </div>

          {/* Volume and Mute Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={toggleMute}
              className="text-zinc-500 hover:text-zinc-300 transition-all cursor-pointer"
            >
              {isMuted ? <VolumeX className="w-4.5 h-4.5 text-red-400" /> : <Volume2 className="w-4.5 h-4.5" />}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={isMuted ? 0 : volume}
              onChange={handleVolumeChange}
              className="w-20 accent-blue-500 h-1 bg-zinc-900 rounded-full cursor-pointer"
            />
          </div>

        </div>
      </div>
    </div>
  );
}
