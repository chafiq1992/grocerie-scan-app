import React, { useEffect, useRef } from "react";
import Quagga from "quagga";

export default function LiveScanner({ onScan, className="w-full rounded-2xl border border-slate-700" }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const cfg = {
      inputStream: {
        name: "Live",
        type: "LiveStream",
        target: containerRef.current,
        constraints: { facingMode: "environment" },
      },
      decoder: {
        readers: ["ean_reader", "code_128_reader", "upc_reader"],
      },
      locate: true,
    };

    Quagga.init(cfg, (err) => {
      if (err) {
        console.error(err);
        return;
      }
      Quagga.start();
    });

    const handler = (result) => {
      if (result?.codeResult?.code) onScan?.(result.codeResult.code);
    };
    Quagga.onDetected(handler);

    return () => {
      Quagga.offDetected(handler);
      Quagga.stop();
    };
  }, [onScan]);

  return <div ref={containerRef} className={className} />;
}
