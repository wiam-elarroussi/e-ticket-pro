'use client';

import { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import { Camera, CameraOff, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useI18nStore } from '@/store/i18n-store';

interface CameraScannerProps {
  /** Appelé à chaque QR code détecté et décodé. Le composant se met en pause 2s après un envoi
   * réussi pour éviter de renvoyer plusieurs fois le même code tant qu'il reste dans le cadre. */
  onDetected: (code: string) => void;
  disabled?: boolean;
}

/** Scan QR par webcam : pas de dépendance native, décodage image-par-image côté navigateur (jsQR).
 * Aucun flux vidéo n'est envoyé où que ce soit — tout se passe en local dans le navigateur. */
export function CameraScanner({ onDetected, disabled }: CameraScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const frameRef = useRef<number | null>(null);
  const pausedUntilRef = useRef(0);

  const [active, setActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const t = useI18nStore((s) => s.t);

  const stop = () => {
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setActive(false);
  };

  const tick = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const result = jsQR(imageData.data, imageData.width, imageData.height);
        if (result?.data && Date.now() > pausedUntilRef.current) {
          pausedUntilRef.current = Date.now() + 2000;
          onDetected(result.data);
        }
      }
    }
    frameRef.current = requestAnimationFrame(tick);
  };

  const start = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setActive(true);
      frameRef.current = requestAnimationFrame(tick);
    } catch {
      setError(t('access.camera.error'));
    }
  };

  useEffect(() => stop, []);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('access.camera.scan_label')}</p>
        <Button
          type="button"
          variant={active ? 'secondary' : 'primary'}
          disabled={disabled}
          onClick={() => (active ? stop() : start())}
        >
          {active ? <CameraOff className="h-4 w-4" /> : <Camera className="h-4 w-4" />}
          {active ? t('access.camera.disable') : t('access.camera.enable')}
        </Button>
      </div>

      {error && (
        <p className="flex items-center gap-1.5 text-xs text-carmin-600">
          <AlertTriangle className="h-3.5 w-3.5" />
          {error}
        </p>
      )}

      <div className={active ? 'relative overflow-hidden rounded-lg bg-black' : 'hidden'}>
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <video ref={videoRef} className="max-h-64 w-full object-contain" muted playsInline />
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-32 w-32 rounded-lg border-2 border-white/70" />
        </div>
      </div>
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
