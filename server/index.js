import express from 'express';
import multer from 'multer';
import { readFile, writeFile, mkdir, unlink } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(__dirname, '..');
const CONTENIDO = path.join(RAIZ, 'contenido');
const DATOS = path.join(__dirname, 'data');
const ARCHIVOS = path.join(DATOS, 'archivos');
const DIST = path.join(RAIZ, 'dist');
const PUERTO = process.env.PORT || 3001;

await mkdir(ARCHIVOS, { recursive: true });

const app = express();
app.use(express.json());

// Lee un JSON de /contenido en cada pedido: si editás el archivo, el cambio se ve al recargar la página.
async function leerContenido(nombre) {
  const texto = await readFile(path.join(CONTENIDO, nombre), 'utf8');
  return JSON.parse(texto);
}

function ruta(handler) {
  return (req, res) =>
    handler(req, res).catch((err) => {
      console.error(err);
      res.status(500).json({ error: 'Error leyendo el contenido. Revisá que el JSON sea válido.', detalle: err.message });
    });
}

app.get('/api/sitio', ruta(async (_req, res) => res.json(await leerContenido('sitio.json'))));
app.get('/api/productos', ruta(async (_req, res) => res.json(await leerContenido('productos.json'))));
app.get('/api/muestrario', ruta(async (_req, res) => res.json(await leerContenido('muestrario.json'))));

// Fotos de productos y trabajos
app.use('/imagenes', express.static(path.join(CONTENIDO, 'imagenes'), { maxAge: '1h' }));

// Formulario de presupuesto: guarda la consulta y el archivo 3D adjunto
const EXTENSIONES = ['.stl', '.obj', '.3mf', '.jpg', '.jpeg', '.png', '.webp', '.pdf'];
const MAX_MB = 50;
class ErrorArchivo extends Error {}
const subida = multer({
  storage: multer.diskStorage({
    destination: ARCHIVOS,
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      const base = path.basename(file.originalname, ext).replace(/[^a-z0-9_-]+/gi, '-').slice(0, 40);
      cb(null, `${Date.now()}-${base}${ext}`);
    }
  }),
  limits: { fileSize: MAX_MB * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (EXTENSIONES.includes(ext)) return cb(null, true);
    cb(new ErrorArchivo(`Formato no permitido (${ext || 'sin extensión'}). Usá STL, OBJ, 3MF, JPG, PNG, WEBP o PDF.`));
  }
});

// Recibe el archivo y, si algo falla, responde con un mensaje claro en JSON
// (multer borra solo el archivo parcial cuando hay error).
function recibirArchivo(req, res, next) {
  subida.single('archivo')(req, res, (err) => {
    if (!err) return next();
    if (err instanceof ErrorArchivo) return res.status(400).json({ error: err.message });
    if (err instanceof multer.MulterError) {
      const error = err.code === 'LIMIT_FILE_SIZE'
        ? `El archivo supera los ${MAX_MB} MB.`
        : 'No se pudo recibir el archivo. Probá de nuevo.';
      return res.status(400).json({ error });
    }
    console.error(err);
    res.status(500).json({ error: 'No se pudo recibir el archivo. Probá de nuevo.' });
  });
}

async function borrarArchivo(file) {
  if (file) await unlink(file.path).catch(() => {});
}

// Las escrituras de consultas.json van de a una, para que dos consultas
// simultáneas no se pisen.
const ARCHIVO_CONSULTAS = path.join(DATOS, 'consultas.json');
let colaEscritura = Promise.resolve();
function guardarConsulta(consulta) {
  const tarea = colaEscritura.then(async () => {
    const consultas = existsSync(ARCHIVO_CONSULTAS) ? JSON.parse(await readFile(ARCHIVO_CONSULTAS, 'utf8')) : [];
    consultas.push(consulta);
    await writeFile(ARCHIVO_CONSULTAS, JSON.stringify(consultas, null, 2));
  });
  colaEscritura = tarea.catch(() => {});
  return tarea;
}

app.post('/api/consultas', recibirArchivo, async (req, res) => {
  const { nombre = '', contacto = '', material = '', cantidad = '1', detalle = '' } = req.body;
  if (!nombre.trim() || !contacto.trim()) {
    await borrarArchivo(req.file);
    return res.status(400).json({ error: 'Completá tu nombre y un email o WhatsApp.' });
  }
  const consulta = {
    id: Date.now(),
    fecha: new Date().toISOString(),
    nombre: nombre.trim(),
    contacto: contacto.trim(),
    material,
    cantidad: Number(cantidad) || 1,
    detalle: detalle.trim(),
    archivo: req.file ? req.file.filename : null
  };
  try {
    await guardarConsulta(consulta);
  } catch (err) {
    console.error('No se pudo guardar la consulta:', err);
    await borrarArchivo(req.file);
    return res.status(500).json({ error: 'No se pudo guardar tu consulta. Probá de nuevo o escribinos por WhatsApp.' });
  }
  console.log(`Nueva consulta de ${consulta.nombre} (${consulta.contacto})`);
  res.status(201).json({ ok: true });
});

app.use('/api', (_req, res) => res.status(404).json({ error: 'No encontrado' }));

// En producción, Express sirve también la web compilada (npm run build)
if (existsSync(DIST)) {
  app.use(express.static(DIST));
  app.get('*', (_req, res) => res.sendFile(path.join(DIST, 'index.html')));
}

app.listen(PUERTO, () => {
  console.log(`Servidor listo en http://localhost:${PUERTO}`);
});
