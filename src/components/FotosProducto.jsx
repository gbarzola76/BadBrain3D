import { useRef, useState } from 'react';
import Imagen from './Imagen.jsx';

// Fotos de un producto: con más de una, flechas, puntitos y deslizar con el dedo.
export default function FotosProducto({ fotos, nombre, clave }) {
  const [i, setI] = useState(0);
  const toque = useRef(null);
  const total = fotos.length;
  const ir = (d) => setI((n) => (n + d + total) % total);

  if (total <= 1) return <Imagen src={fotos[0]} alt={nombre} clave={clave} />;

  return (
    <div className="fotos"
      onTouchStart={(e) => { toque.current = e.touches[0].clientX; }}
      onTouchEnd={(e) => {
        if (toque.current == null) return;
        const dx = e.changedTouches[0].clientX - toque.current;
        if (Math.abs(dx) > 40) ir(dx < 0 ? 1 : -1);
        toque.current = null;
      }}>
      <Imagen key={fotos[i]} src={fotos[i]} alt={`${nombre} (foto ${i + 1} de ${total})`} clave={clave} />
      <button type="button" className="fotos__flecha fotos__flecha--izq" onClick={() => ir(-1)} aria-label="Foto anterior">‹</button>
      <button type="button" className="fotos__flecha fotos__flecha--der" onClick={() => ir(1)} aria-label="Foto siguiente">›</button>
      <div className="fotos__puntos">
        {fotos.map((f, k) => (
          <button key={f} type="button" className={k === i ? 'activo' : ''} onClick={() => setI(k)}
            aria-label={`Ver foto ${k + 1}`} aria-current={k === i} />
        ))}
      </div>
    </div>
  );
}
