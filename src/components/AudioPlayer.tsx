import React, { useRef, useState, useEffect } from 'react';
import { 
  Play, Pause, Volume2, VolumeX, RotateCcw, SkipBack, SkipForward,
  FastForward, Info
} from 'lucide-react';

interface AudioPlayerProps {
  audioSrc: string | null;
  studentName: string;
  lessonNumber: string | number;
}

export default function AudioPlayer({ audioSrc, studentName, lessonNumber }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [animationFrameId, setAnimationFrameId] = useState<number | null>(null);

  // Synchronize audio states
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onDurationChange = () => setDuration(audio.duration || 0);
    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('durationchange', onDurationChange);
    audio.addEventListener('ended', onEnded);

    // Reset playback rate and state when source changes
    audio.playbackRate = playbackRate;
    setIsPlaying(false);
    setCurrentTime(0);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('durationchange', onDurationChange);
      audio.removeEventListener('ended', onEnded);
    };
  }, [audioSrc]);

  // Audio frequency wave mock visualization
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let localFrameId: number;
    const barCount = 45;
    const barHeights = Array.from({ length: barCount }, () => Math.random() * 20 + 5);

    const drawWave = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const width = canvas.width;
      const height = canvas.height;
      const barWidth = width / barCount - 2;

      for (let i = 0; i < barCount; i++) {
        // Generate moving waveform heights if audio is playing, else static minor wave
        let displayHeight = barHeights[i];
        if (isPlaying) {
          displayHeight = Math.sin(Date.now() * 0.005 + i * 0.2) * (height / 2.5) + (height / 2) + Math.random() * 10;
        } else {
          displayHeight = Math.sin(i * 0.15) * 8 + 15;
        }

        const x = i * (barWidth + 2);
        const y = height / 2 - displayHeight / 2;

        // Custom metallic emerald & teal gradient
        const gradient = ctx.createLinearGradient(0, y, 0, y + displayHeight);
        gradient.addColorStop(0, '#10B981'); // Emerald
        gradient.addColorStop(1, '#06B6D4'); // Cyan

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect?.(x, y, barWidth, displayHeight, 3);
        ctx.fill();
      }

      localFrameId = requestAnimationFrame(drawWave);
    };

    drawWave();

    return () => {
      cancelAnimationFrame(localFrameId);
    };
  }, [isPlaying]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().catch(e => console.error("Playback error:", e));
      setIsPlaying(true);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextVolume = parseFloat(e.target.value);
    setVolume(nextVolume);
    if (audioRef.current) {
      audioRef.current.volume = nextVolume;
      audioRef.current.muted = nextVolume === 0;
      setIsMuted(nextVolume === 0);
    }
  };

  const toggleMute = () => {
    const nextMute = !isMuted;
    setIsMuted(nextMute);
    if (audioRef.current) {
      audioRef.current.muted = nextMute;
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const seekTarget = parseFloat(e.target.value);
    setCurrentTime(seekTarget);
    if (audioRef.current) {
      audioRef.current.currentTime = seekTarget;
    }
  };

  const handleSpeedChange = (rate: number) => {
    setPlaybackRate(rate);
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
    }
  };

  const skipSeconds = (secs: number) => {
    if (audioRef.current) {
      let target = audioRef.current.currentTime + secs;
      if (target < 0) target = 0;
      if (target > duration) target = duration;
      audioRef.current.currentTime = target;
      setCurrentTime(target);
    }
  };

  // Convert seconds to MM:SS format
  const formatTime = (secs: number) => {
    if (isNaN(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl text-white">
      {/* Invisible HTML5 Audio Tag */}
      {audioSrc && <audio ref={audioRef} src={audioSrc} />}

      {/* Student/Lesson Title Badge */}
      <div className="flex items-center gap-3 bg-slate-950 p-3 rounded-xl border border-slate-800 mb-6">
        <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-lg">
          <Info className="w-5 h-5" />
        </div>
        <div className="text-right">
          <h3 className="font-semibold text-sm text-slate-200">الاستماع لتسجيل الطالب: {studentName}</h3>
          <p className="text-xs text-slate-400">الدرس رقم: {lessonNumber}</p>
        </div>
      </div>

      {/* Waveform Visualization Canvas */}
      <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 mb-6">
        <canvas 
          ref={canvasRef} 
          width={500} 
          height={80} 
          className="w-full h-20 bg-slate-950 rounded"
        />
      </div>

      {/* Seek and Time Display */}
      <div className="mb-6">
        <input
          type="range"
          min={0}
          max={duration || 100}
          value={currentTime}
          onChange={handleSeek}
          className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
        />
        <div className="flex justify-between text-xs text-slate-400 font-mono mt-2">
          <span>{formatTime(duration)}</span>
          <span>{formatTime(currentTime)}</span>
        </div>
      </div>

      {/* Main Playback Controls bar */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        
        {/* Skip & Play Buttons */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => skipSeconds(-10)}
            className="p-2.5 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-300 transition"
            title="رجوع 10 ثواني"
          >
            <SkipBack className="w-5 h-5" />
          </button>
          
          <button
            onClick={togglePlay}
            className="p-4 bg-emerald-500 hover:bg-emerald-600 rounded-full text-white shadow-lg hover:shadow-emerald-500/20 transition-all scale-110 active:scale-95"
            title={isPlaying ? "إيقاف مؤقت" : "تشغيل"}
          >
            {isPlaying ? <Pause className="w-6 h-6 fill-white" /> : <Play className="w-6 h-6 fill-white" />}
          </button>

          <button
            onClick={() => skipSeconds(10)}
            className="p-2.5 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-300 transition"
            title="تقديم 10 ثواني"
          >
            <SkipForward className="w-5 h-5" />
          </button>
        </div>

        {/* Speed Adjustment Controls */}
        <div className="flex items-center gap-1 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
          {[0.75, 1.0, 1.25, 1.5, 2.0].map(speed => (
            <button
              key={speed}
              onClick={() => handleSpeedChange(speed)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold font-mono transition ${
                playbackRate === speed 
                  ? 'bg-emerald-500 text-white' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              x{speed}
            </button>
          ))}
        </div>

        {/* Volume & Mute Controls */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <button
            onClick={toggleMute}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
          >
            {isMuted ? <VolumeX className="w-5 h-5 text-red-400" /> : <Volume2 className="w-5 h-5 text-emerald-400" />}
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={isMuted ? 0 : volume}
            onChange={handleVolumeChange}
            className="w-24 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
          />
        </div>

      </div>
    </div>
  );
}
