import { useEffect, useRef, useCallback } from 'react';
import SignaturePad from 'signature_pad';

export default function useSignaturePad(canvasRef, options = {}) {
  const padRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    padRef.current = new SignaturePad(canvas, options);

    function resizeCanvas() {
      const ratio = Math.max(window.devicePixelRatio || 1, 1);
      const data = padRef.current.toData();
      canvas.width = canvas.offsetWidth * ratio;
      canvas.height = canvas.offsetHeight * ratio;
      canvas.getContext('2d').scale(ratio, ratio);
      padRef.current.fromData(data);
    }

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      padRef.current?.off();
    };
  }, [canvasRef]);

  const isEmpty = useCallback(() => {
    return padRef.current ? padRef.current.isEmpty() : true;
  }, []);

  const clear = useCallback(() => {
    padRef.current?.clear();
  }, []);

  const toDataURL = useCallback((type, encoderOptions) => {
    return padRef.current ? padRef.current.toDataURL(type, encoderOptions) : '';
  }, []);

  return { isEmpty, clear, toDataURL };
}
