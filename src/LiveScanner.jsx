import React, { useEffect, useRef } from "react";
import Quagga from "quagga";

export default function LiveScanner({ onScan, zoom=2, className="w-full rounded-2xl border border-slate-700 overflow-hidden h-64" }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // ---------- 1) Fast path: native BarcodeDetector ----------
    let stop = () => {};
    if ("BarcodeDetector" in window) {
      (async () => {
        try {
          let constraints = { video: { facingMode: { exact: "environment" } } };
          // try to pick the last camera which is usually rear on mobile
          const devices = await navigator.mediaDevices.enumerateDevices();
          const cams = devices.filter(d=> d.kind==='videoinput');
          if (cams.length>1) constraints = { video: { deviceId: { exact: cams[cams.length-1].deviceId } } };
          const stream = await navigator.mediaDevices.getUserMedia(constraints);
          const video = document.createElement("video");
          video.playsInline = true;
          video.srcObject = stream;
          await video.play();
          video.style.transform = `scale(${zoom})`;
          video.style.transformOrigin = "center center";
          video.style.objectFit = "cover";
          video.className = "w-full h-full";
          containerRef.current.appendChild(video);

          const detector = new window.BarcodeDetector({ formats: ["ean_13", "ean_8", "upc_a", "code_128"] });
          let active = true;
          const loop = async () => {
            if (!active) return;
            try {
              const bitmap = await createImageBitmap(video);
              const codes = await detector.detect(bitmap);
              bitmap.close();
              if (codes[0]?.rawValue) onScan?.(codes[0].rawValue);
            } catch {}
            requestAnimationFrame(loop);
          };
          loop();
          stop = () => { active = false; stream.getTracks().forEach(t=>t.stop()); };
        } catch(e) {
          console.error("BarcodeDetector error", e);
        }
      })();
      return stop;
    }

    // ---------- 2) Fallback: Quagga ----------
    const cfg = {
      inputStream: {
        name: "Live",
        type: "LiveStream",
        target: containerRef.current,
        constraints: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
      },
      decoder: { readers: ["ean_reader", "upc_reader", "ean_8_reader"] },
      locate: true,
      numOfWorkers: navigator.hardwareConcurrency || 4,
      frequency: 10,
    };

    Quagga.init(cfg, (err) => {
      if (err) { console.error(err); return; }
      Quagga.start();
      const video = containerRef.current.querySelector("video");
      if (video) {
        video.style.transform = `scale(${zoom})`;
        video.style.transformOrigin = "center center";
        video.style.objectFit = "cover";
      }
    });
    const handler = (result) => {
      if (result?.codeResult?.code) onScan?.(result.codeResult.code);
    };
    Quagga.onDetected(handler);
    stop = () => { Quagga.offDetected(handler); Quagga.stop(); };

    return () => stop();
  }, [onScan, zoom]);

  return <div ref={containerRef} className={className} />;
}
