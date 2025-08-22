import React, { useEffect, useRef } from "react";
import { BrowserMultiFormatReader, NotFoundException } from "@zxing/library/esm5/index.js";

/**
 * LiveScanner opens the device camera and decodes barcodes continuously.
 * Props:
 *  - onScan(code: string)  called each time a barcode is decoded
 *  - className (optional)  tailwind classes for video element
 */
export default function LiveScanner({ onScan, className="w-full rounded-2xl border border-slate-700" }) {
  const videoRef = useRef(null);
  useEffect(() => {
    const codeReader = new BrowserMultiFormatReader();
    let active = true;

    (async () => {
      try {
        const constraints = { video: { facingMode: "environment" } };
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        if (!videoRef.current) return;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();

        const loop = async () => {
          if (!active) return;
          try {
            const result = await codeReader.decodeOnceFromStream(stream, videoRef.current);
            if (result?.text) onScan?.(result.text);
          } catch (e) {
            if (!(e instanceof NotFoundException)) console.error(e);
          } finally {
            requestAnimationFrame(loop);
          }
        };
        loop();
      } catch (err) {
        console.error("Camera error", err);
      }
    })();
    return () => {
      active = false;
      codeReader.reset();
      const tracks = videoRef.current?.srcObject?.getTracks?.();
      tracks?.forEach((t) => t.stop());
    };
  }, [onScan]);

  return <video ref={videoRef} className={className} playsInline muted />;
}
