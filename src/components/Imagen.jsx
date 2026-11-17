import { useState } from 'react';
import { urlImagen, semilla } from '../util.js';

const TONOS = ['#FF6A2B', '#2BB5D9', '#8B7CF6', '#2BD9A0', '#FFC93C', '#F25C8A'];

// Muestra la foto si existe; si no, un dibujo de "capas" como reemplazo.
export default function Imagen({ src, alt, clave = '', className = '' }) {
  const [fallo, setFallo] = useState(false);
  const url = urlImagen(src);

  if (url && !fallo) {
    return <img className={`imagen ${className}`} src={url} alt={alt} loading="lazy" onError={() => setFallo(true)} />;
  }

  const s = semilla(clave || alt);
  const tono = TONOS[s % TONOS.length];
  const capas = 6 + (s % 4);
  const forma = s % 3; // 0 pirámide, 1 jarrón, 2 torre

  const rects = Array.from({ length: capas }, (_, i) => {
    const t = i / (capas - 1);
    let ancho;
    if (forma === 0) ancho = 150 - t * 110;
    else if (forma === 1) ancho = 70 + Math.sin(t * Math.PI) * 70;
    else ancho = 90 - (i % 2) * 14;
    const y = 160 - i * 15;
    return <rect key={i} x={120 - ancho / 2} y={y} width={ancho} height={11} rx={3}
      fill={tono} opacity={0.35 + 0.65 * (1 - t)} />;
  });

  return (
    <div className={`imagen imagen--vacia ${className}`} role="img" aria-label={alt}>
      <svg viewBox="0 0 240 200" aria-hidden="true">
        <rect x="40" y="174" width="160" height="6" rx="3" fill="currentColor" opacity="0.18" />
        {rects}
      </svg>
    </div>
  );
}
