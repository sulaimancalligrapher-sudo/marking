import React, { useRef, useState, useEffect } from 'react';
import { Mic, Square, Trash2, CheckCircle, Volume2, Play, Pause } from 'lucide-react';

interface AudioRecorderProps {
  onSaveRecording: (base64: string) => void;
  recordedBase64: string | null;
  onClearRecording: () => void;
}

export default function AudioRecorder({ onSaveRecording, recordedBase64, onClearRecording }: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [playbackPlaying, setPlaybackPlaying] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const playbackAudioRef = useRef<HTMLAudioElement | null>(null);

  // Live wave visualizer references
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    return () => {
      stopTimer();
      stopVisuals();
    };
  }, []);

  const startTimer = () => {
    setDuration(0);
    timerRef.current = setInterval(() => {
      setDuration(prev => prev + 1);
    }, 1000);
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const startRecording = async () => {
    audioChunksRef.current = [];
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/mp4' });
        const reader = new FileReader();
        reader.onloadend = () => {
          if (reader.result && typeof reader.result === 'string') {
            onSaveRecording(reader.result);
          }
        };
        reader.readAsDataURL(audioBlob);
        stopVisuals();
      };

      // Start actual audio recording
      mediaRecorder.start();
      setIsRecording(true);
      startTimer();
      setupLiveVisuals(stream);

    } catch (err) {
      console.error('Microphone permission denied or unsupported:', err);
      alert('لا يمكن الوصول إلى الميكروفون. يرجى تفعيل الصلاحية.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      stopTimer();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    }
  };

  const setupLiveVisuals = (stream: MediaStream) => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioContextClass();
      audioContextRef.current = audioCtx;

      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      analyserRef.current = analyser;

      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      drawWaveform();
    } catch (e) {
      console.error('Audio visualizer failed:', e);
    }
  };

  const drawWaveform = () => {
    const canvas = canvasRef.current;
    const analyser = analyserRef.current;
    if (!canvas || !analyser) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animationFrameRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const barWidth = (canvas.width / bufferLength) * 1.5;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        // Compute height
        const barHeight = (dataArray[i] / 255) * canvas.height;
        ctx.fillStyle = `rgb(16, 185, 129)`; // emerald green
        
        // Draw centered bar
        const y = (canvas.height - barHeight) / 2;
        ctx.fillRect(x, y, barWidth - 1, barHeight);
        x += barWidth;
      }
    };

    draw();
  };

  const stopVisuals = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
    }
  };

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Playback local testing
  const togglePlayback = () => {
    const audio = playbackAudioRef.current;
    if (!audio || !recordedBase64) return;

    if (playbackPlaying) {
      audio.pause();
      setPlaybackPlaying(false);
    } else {
      audio.play().then(() => {
        setPlaybackPlaying(true);
      }).catch(() => {});
    }
  };

  return (
    <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex flex-col gap-3 font-sans" id="vocal-recorder">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
          <Mic className="w-4 h-4 text-emerald-600" />
          ملاحظة صوتية تفاعلية للمعلّم
        </span>
        {recordedBase64 && (
          <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
            <CheckCircle className="w-3 h-3" />
            صوت جاهز للحفظ
          </span>
        )}
      </div>

      <div className="flex flex-col items-center justify-center py-4 bg-white border border-slate-100 rounded-xl relative overflow-hidden min-h-[90px]">
        {isRecording ? (
          <div className="flex flex-col items-center gap-2 w-full px-8">
            <span className="text-red-600 font-bold font-mono flex items-center gap-1.5 animate-pulse text-lg">
              <span className="w-2.5 h-2.5 bg-red-600 rounded-full"></span>
              جاري التسجيل... {formatSeconds(duration)}
            </span>
            <canvas 
              ref={canvasRef} 
              width={220} 
              height={40} 
              className="w-full max-w-[280px] h-[40px] opacity-80"
            />
          </div>
        ) : recordedBase64 ? (
          <div className="flex flex-col items-center gap-2">
            <span className="text-xs text-slate-500">تم تسجيل ملاحظة صوتية بنجاح</span>
            <audio 
              ref={playbackAudioRef} 
              src={recordedBase64} 
              onEnded={() => setPlaybackPlaying(false)}
            />
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={togglePlayback}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold transition-all"
              >
                {playbackPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-white" />}
                {playbackPlaying ? 'إيقاف الاستماع' : 'استمع لتسجيلك'}
              </button>
              <button
                type="button"
                onClick={onClearRecording}
                className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition-all"
                title="حذف التسجيل"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1">
            <span className="text-xs text-slate-400">انقر على الزر بالأسفل لبدء تسجيل ردّك الصوتي</span>
            <span className="text-xs text-slate-400 italic">الحد الأقصى الموصى به: دقيقتان</span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-center">
        {!isRecording && !recordedBase64 ? (
          <button
            type="button"
            onClick={startRecording}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-semibold text-xs rounded-xl shadow-xs transition-all"
          >
            <Mic className="w-4 h-4" />
            بدء تسجيل الصوت المباشر
          </button>
        ) : isRecording ? (
          <button
            type="button"
            onClick={stopRecording}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-semibold text-xs rounded-xl shadow-xs transition-all animate-bounce"
          >
            <Square className="w-4 h-4" />
            إنهاء وحفظ التسجيل
          </button>
        ) : null}
      </div>
    </div>
  );
}
