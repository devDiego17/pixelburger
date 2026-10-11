"use client";
import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";

// Escáner de QR con la cámara. Usa BarcodeDetector cuando existe (Android/Chrome) y jsQR como respaldo (iPhone).
export function QrScanner({ onCode, onClose }: { onCode: (code: string) => void; onClose: () => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let stream: MediaStream | null = null;
    let raf = 0;
    let stopped = false;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    type Detector = { detect: (v: HTMLVideoElement) => Promise<{ rawValue: string }[]> };
    const BD = (window as unknown as { BarcodeDetector?: new (o: { formats: string[] }) => Detector }).BarcodeDetector;
    const detector = BD ? new BD({ formats: ["qr_code"] }) : null;

    async function tick() {
      if (stopped || !video.current || video.current.readyState < 2) { raf = requestAnimationFrame(tick); return; }
      try {
        let value: string | null = null;
        if (detector) {
          const r = await detector.detect(video.current);
          value = r[0]?.rawValue ?? null;
        } else if (ctx) {
          const v = video.current; canvas.width = v.videoWidth; canvas.height = v.videoHeight;
          ctx.drawImage(v, 0, 0);
          const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
          value = jsQR(img.data, img.width, img.height)?.data ?? null;
        }
        if (value) { stopped = true; onCode(value); return; }
      } catch { /* sigue intentando */ }
      raf = requestAnimationFrame(tick);
    }

    navigator.mediaDevices?.getUserMedia({ video: { facingMode: "environment" } })
      .then((s) => { stream = s; if (video.current) { video.current.srcObject = s; video.current.play(); tick(); } })
      .catch(() => setError("No pudimos abrir la cámara. Escribe el número del jugador."));

    return () => { stopped = true; cancelAnimationFrame(raf); stream?.getTracks().forEach((t) => t.stop()); };
  }, [onCode]);

  return (
    <div className="flex flex-col gap-2">
      <div className="relative overflow-hidden rounded-xl border-2 border-cheese bg-black">
        <video ref={video} playsInline muted className="aspect-square w-full object-cover" />
        <div className="pointer-events-none absolute inset-[18%] rounded-lg border-4 border-cheese/80" />
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      <button type="button" className="text-sm text-muted underline" onClick={onClose}>Cerrar cámara</button>
    </div>
  );
}
