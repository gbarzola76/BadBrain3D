import { LETRAS, LETRAS_3D, RECORTES } from './logoEstilo.js';

// Nombre de la marca en letras recortadas (ransom note). El "3D" final se destaca solo.
export default function Rotulo({ marca }) {
  const m = String(marca).match(/^(.*?)\s*(3D)$/i);
  const palabras = (m ? m[1] : String(marca)).split(/\s+/).filter(Boolean);
  let i = 0;

  const tile = (letra, estilo, idx) => (
    <span key={idx} className="rotulo__letra" style={{
      '--bg': estilo.bg, '--fg': estilo.fg, '--fuente': estilo.fuente,
      '--rot': `${estilo.rot}deg`, '--dy': `${estilo.dy}em`, '--tam': estilo.tam,
      '--recorte': RECORTES[idx % RECORTES.length]
    }}>{letra}</span>
  );

  return (
    <span className="rotulo" aria-hidden="true">
      {palabras.map((p, pi) => (
        <span key={pi} className="rotulo__palabra">
          {[...p].map((ch) => { const t = tile(ch.toUpperCase(), LETRAS[i % LETRAS.length], i); i += 1; return t; })}
        </span>
      ))}
      {m && (
        <span className="rotulo__palabra">
          {[...m[2]].map((ch, k) => tile(ch.toUpperCase(), LETRAS_3D[k], i + k + 1))}
        </span>
      )}
    </span>
  );
}
