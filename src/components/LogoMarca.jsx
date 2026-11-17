import { useId } from 'react';
import { CUERPO, PUAS, SURCOS, SILVIO, CARA, ALFILER, NCAPAS, DX, DY, VIEWBOX } from './logoGeometria.js';

// Logo: cerebro punk de perfil, extruido en capas (como una pieza impresa en 3D),
// con cresta, alfiler, goteo de filamento y borde de sticker.
// Colores: --acento (cerebro) y --punk (cresta), definidos en contenido/sitio.json.

const [, , VW, VH] = VIEWBOX.split(' ').map(Number);
const sombra = (color, pct) => `color-mix(in srgb, ${color} ${pct}%, #000)`;
const n = (v) => v.toFixed(1);

export default function LogoMarca({ tam = 62, animado = true, className = '' }) {
  const base = useId().replace(/:/g, '');
  const idCuerpo = `cuerpo${base}`;
  const idPuas = `puas${base}`;
  const idClip = `clip${base}`;
  const negro = 'var(--oscuro)';
  const trazo = sombra('var(--acento)', 50);

  // Silueta completa (todas las capas) para armar sombra, contorno negro y borde blanco
  const silueta = Array.from({ length: NCAPAS + 1 }, (_, k) => (
    <g key={k} transform={`translate(${n(k * DX)} ${n(k * DY)})`}>
      <use href={`#${idCuerpo}`} />
      <use href={`#${idPuas}`} />
    </g>
  ));
  const estilo = (relleno, grosor) => ({ fill: relleno, stroke: relleno, strokeWidth: grosor, strokeLinejoin: 'round' });

  return (
    <svg className={`logo-marca ${animado ? 'logo-marca--anim' : ''} ${className}`}
      height={tam} width={(tam * VW) / VH} viewBox={VIEWBOX} role="img" aria-label="Bad Brain 3D">
      <defs>
        <g id={idCuerpo}>{CUERPO.map((d, i) => <path key={i} d={d} />)}</g>
        <g id={idPuas}>{PUAS.map((p, i) => <path key={i} d={p.tri} />)}</g>
        <clipPath id={idClip}><path d={CUERPO[2]} /></clipPath>
      </defs>

      <g transform="translate(7 8)" style={estilo(negro, 20)}>{silueta}</g>
      <g style={estilo(negro, 18)}>{silueta}</g>
      <g style={estilo('var(--papel)', 10)}>{silueta}</g>

      {Array.from({ length: NCAPAS }, (_, i) => {
        const k = NCAPAS - i; // de atrás hacia adelante
        const pct = 62 - k * 1.6 - (k % 2 ? 7 : 0);
        return (
          <g key={k} className="logo-capa" style={{ '--retraso': `${i * 40}ms` }}>
            <g transform={`translate(${n(k * DX)} ${n(k * DY)})`}>
              <use href={`#${idPuas}`} style={{ fill: sombra('var(--punk)', pct) }} />
              <use href={`#${idCuerpo}`} style={{ fill: sombra('var(--acento)', pct) }} />
            </g>
          </g>
        );
      })}

      <g className="logo-capa logo-capa--frente" style={{ '--retraso': `${NCAPAS * 40}ms` }}>
        <use href={`#${idPuas}`} style={{ fill: 'var(--punk)' }} />
        {PUAS.map((p, i) => <path key={i} d={p.faceta} style={{ fill: sombra('var(--punk)', 72) }} />)}
        <use href={`#${idCuerpo}`} style={{ fill: 'var(--acento)' }} />

        <g clipPath={`url(#${idClip})`} fill="none" stroke={trazo} strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
          {SURCOS.map((d, i) => <path key={i} d={d} />)}
        </g>
        <g fill="none" stroke={trazo} strokeWidth="2.8" strokeLinecap="round">
          <path d={SILVIO} />
          <path d="M118 148C132 140 150 142 158 150" strokeWidth="2.6" />
          <path d="M128 158C138 152 148 153 154 158" strokeWidth="2.6" />
        </g>

        {/* Cara de enojado con la boca cosida */}
        <g className="logo-cara">
          {CARA.ojos.map((d, i) => <path key={i} d={d} fill="#fff" stroke={negro} strokeWidth="3.4" />)}
          {CARA.pupilas.map((d, i) => <path key={i} d={d} fill={negro} />)}
          <path d={CARA.cejas} fill="none" stroke={negro} strokeWidth="6.5" strokeLinecap="round" />
          <path d={CARA.boca} fill="none" stroke={negro} strokeWidth="4.2" strokeLinecap="round" />
          <path d={CARA.puntadas} fill="none" stroke={negro} strokeWidth="3" strokeLinecap="round" />
        </g>

        {/* Alfiler de gancho */}
        <g transform={ALFILER.transform} strokeLinecap="round" strokeLinejoin="round">
          <path d={ALFILER.cable} fill="none" stroke={negro} strokeWidth="8" />
          <path d={ALFILER.broche} fill="#E9EAEC" stroke={negro} strokeWidth="4" />
          <path d={ALFILER.cable} fill="none" stroke="#E9EAEC" strokeWidth="3" />
        </g>
      </g>
    </svg>
  );
}
