// Copia contenido/ → public/contenido/ antes de "npm run dev" y "npm run build".
// Así se edita en un solo lugar (contenido/) y la web siempre usa lo último.
// También revisa que los JSON estén bien escritos y que existan las fotos que nombran.
import { cpSync, existsSync, readFileSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const origen = path.join(raiz, 'contenido');
const destino = path.join(raiz, 'public', 'contenido');

let errores = 0;
const avisos = [];

for (const nombre of ['sitio.json', 'productos.json', 'muestrario.json']) {
  let datos;
  try {
    datos = JSON.parse(readFileSync(path.join(origen, nombre), 'utf8'));
  } catch (err) {
    console.error(`✗ contenido/${nombre} está mal escrito: ${err.message}`);
    errores++;
    continue;
  }
  const items = Array.isArray(datos) ? datos : [datos.hero || {}];
  for (const item of items) {
    const img = item.imagen;
    if (img && !/^https?:\/\//.test(img) && !existsSync(path.join(origen, 'imagenes', img))) {
      avisos.push(`contenido/${nombre}: no existe la foto "${img}" (${item.nombre || item.titulo || 'inicio'})`);
    }
  }
}

if (errores) {
  console.error('Corregí el JSON y volvé a intentar (podés validarlo en https://jsonlint.com).');
  process.exit(1);
}
for (const a of avisos) console.warn(`⚠ ${a} — se va a ver el dibujo de reemplazo.`);

// Se borra la copia anterior para que no queden fotos que ya no están en contenido/.
rmSync(destino, { recursive: true, force: true });
cpSync(origen, destino, { recursive: true, force: true });
console.log('✓ contenido/ copiado a public/contenido/');
