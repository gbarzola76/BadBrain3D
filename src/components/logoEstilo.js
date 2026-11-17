// Estilo del rótulo "ransom note": cada letra es un recorte de revista distinto.
// Para cambiar el look editá esta lista: colores, tipografía, giro (rot, en grados),
// desplazamiento vertical (dy) y tamaño relativo (tam).

export const RECORTES = [
  'polygon(2% 6%, 38% 0, 71% 4%, 100% 0, 97% 52%, 100% 100%, 62% 95%, 30% 100%, 0 96%, 3% 48%)',
  'polygon(0 3%, 45% 7%, 100% 0, 96% 45%, 100% 94%, 55% 100%, 4% 92%, 2% 50%)',
  'polygon(5% 0, 100% 5%, 94% 55%, 100% 100%, 8% 94%, 0 48%)',
  'polygon(0 0, 52% 4%, 97% 0, 100% 50%, 95% 100%, 40% 95%, 3% 100%, 6% 55%)'
];

const F = {
  anton: "'Anton', Impact, sans-serif",
  maquina: "'Special Elite', 'Courier New', monospace",
  serif: "'Abril Fatface', Georgia, serif",
  marcador: "'Permanent Marker', cursive",
  mono: "'Rubik Mono One', 'Arial Black', sans-serif"
};

// Letras de las palabras normales: se reparten en orden (B-A-D  B-R-A-I-N)
export const LETRAS = [
  { bg: 'var(--periodico)', fg: 'var(--oscuro)', fuente: F.anton, rot: -3, dy: 0.02, tam: 1.1 },
  { bg: 'var(--oscuro)', fg: 'var(--periodico)', fuente: F.maquina, rot: 2.5, dy: -0.04, tam: 1 },
  { bg: 'var(--punk)', fg: 'var(--oscuro)', fuente: F.serif, rot: -2, dy: 0.03, tam: 1.05 },
  { bg: 'var(--periodico)', fg: 'var(--oscuro)', fuente: F.marcador, rot: 3, dy: -0.02, tam: 1 },
  { bg: 'var(--amarillo)', fg: 'var(--oscuro)', fuente: F.mono, rot: -2.5, dy: 0.04, tam: 0.9 },
  { bg: 'var(--oscuro)', fg: 'var(--amarillo)', fuente: F.anton, rot: 1.5, dy: -0.03, tam: 1.12 },
  { bg: 'var(--acento)', fg: 'var(--oscuro)', fuente: F.maquina, rot: -3, dy: 0.02, tam: 1 },
  { bg: 'var(--periodico)', fg: 'var(--oscuro)', fuente: F.serif, rot: 2, dy: -0.02, tam: 1.05 }
];

// El "3D" final siempre se destaca
export const LETRAS_3D = [
  { bg: 'var(--punk)', fg: 'var(--oscuro)', fuente: F.mono, rot: -4, dy: 0.02, tam: 1.12 },
  { bg: 'var(--oscuro)', fg: 'var(--acento)', fuente: F.anton, rot: 3, dy: -0.03, tam: 1.25 }
];
