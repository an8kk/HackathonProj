import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, RefreshCw, Upload } from 'lucide-react';

export interface CapturedPhoto {
  filename: string;
  contentType: string;
  /** base64 WITHOUT the data: prefix — ready for the API. */
  base64: string;
  /** full data URL for inline preview. */
  dataUrl: string;
}

interface CameraCaptureProps {
  onCapture: (photo: CapturedPhoto) => void;
  /** Called when the user chooses the file fallback (no camera / permission denied). */
  onPickFile?: () => void;
}

const MAX_WIDTH = 1280;

/**
 * Live in-app camera using getUserMedia. Works on desktop webcams and mobile
 * (secure context — localhost or https). Falls back to file upload if the
 * camera is unavailable or permission is denied.
 */
export function CameraCapture({ onCapture, onPickFile }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
  }, []);

  const start = useCallback(async () => {
    setError(null);
    setReady(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 960 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setReady(true);
    } catch {
      setError('Камера недоступна или доступ запрещён. Загрузите фото файлом.');
    }
  }, []);

  useEffect(() => {
    start();
    return stop;
  }, [start, stop]);

  function capture() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const scale = Math.min(1, MAX_WIDTH / video.videoWidth);
    const width = Math.round(video.videoWidth * scale);
    const height = Math.round(video.videoHeight * scale);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, width, height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1);
    stop();
    onCapture({
      filename: `capture-${Date.now()}.jpg`,
      contentType: 'image/jpeg',
      base64,
      dataUrl,
    });
  }

  if (error) {
    return (
      <div className="w-full rounded-2xl border-2 border-dashed border-theft/40 bg-theft-light p-5 text-center">
        <p className="text-sm text-theft font-medium mb-3">{error}</p>
        {onPickFile && (
          <button
            type="button"
            onClick={onPickFile}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-ink text-white text-sm font-semibold"
          >
            <Upload className="w-4 h-4" /> Загрузить файл
          </button>
        )}
        <button type="button" onClick={start} className="block mx-auto mt-3 text-xs text-text-muted underline">
          Повторить попытку
        </button>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="relative w-full overflow-hidden rounded-2xl bg-ink" style={{ aspectRatio: '4 / 3' }}>
        <video ref={videoRef} playsInline muted className="w-full h-full object-cover" />
        {!ready && (
          <div className="absolute inset-0 flex items-center justify-center text-white/70 text-sm">
            Включаем камеру…
          </div>
        )}
      </div>
      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={capture}
          disabled={!ready}
          className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl font-bold text-ink disabled:opacity-40"
          style={{ background: '#F5A300' }}
        >
          <Camera className="w-5 h-5" /> Снять
        </button>
        <button
          type="button"
          onClick={start}
          className="px-4 py-3 rounded-2xl bg-offwhite text-text-primary"
          aria-label="Перезапустить камеру"
        >
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>
      {onPickFile && (
        <button type="button" onClick={onPickFile} className="mt-2 mx-auto block text-xs text-text-muted underline">
          или загрузить файл
        </button>
      )}
    </div>
  );
}
