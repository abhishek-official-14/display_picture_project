import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import fsPromises from 'fs/promises';
import archiver from 'archiver';
import { fileURLToPath } from 'url';
import { processImage, ensureCacheDir } from './imageProcessor.js';
import { initFaceDetector } from './faceDetection.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = process.env.PORT || 4000;
const CACHE_DIR = path.resolve('cache');
const MODEL_DIR = path.resolve('models');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (_, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    cb(null, allowed.includes(file.mimetype));
  }
});

app.use(cors());
app.use(express.json());
app.use('/assets', express.static(CACHE_DIR));

app.get('/api/health', (_, res) => {
  res.json({ status: 'ok', service: 'dp-optimizer' });
});

app.post('/api/process', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Image is required.' });
    }

    const result = await processImage(req.file, req.body);
    const previewBase = `${req.protocol}://${req.get('host')}/assets`;

    return res.json({
      ...result,
      outputs: result.outputs.map((item) => ({
        ...item,
        previewUrl: `${previewBase}/${path.basename(item.path)}`
      }))
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to process image.', details: error.message });
  }
});

app.get('/api/download/:batchId/:filename', async (req, res) => {
  const target = path.join(CACHE_DIR, `${req.params.batchId}-${req.params.filename}`);
  if (!fs.existsSync(target)) return res.status(404).json({ error: 'File not found' });
  return res.download(target, req.params.filename);
});

app.get('/api/download-zip/:batchId', async (req, res) => {
  const { batchId } = req.params;
  const files = (await fsPromises.readdir(CACHE_DIR)).filter((f) => f.startsWith(batchId));

  if (!files.length) {
    return res.status(404).json({ error: 'Batch not found' });
  }

  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename=${batchId}-dps.zip`);

  const archive = archiver('zip', { zlib: { level: 9 } });
  archive.pipe(res);

  for (const file of files) {
    archive.file(path.join(CACHE_DIR, file), { name: file.replace(`${batchId}-`, '') });
  }

  await archive.finalize();
});

const cleanupIntervalMs = 1000 * 60 * 20;
setInterval(async () => {
  const now = Date.now();
  const ttl = 1000 * 60 * 30;
  const files = await fsPromises.readdir(CACHE_DIR);

  await Promise.all(
    files.map(async (file) => {
      const filepath = path.join(CACHE_DIR, file);
      const stats = await fsPromises.stat(filepath);
      if (now - stats.mtimeMs > ttl) await fsPromises.unlink(filepath);
    })
  );
}, cleanupIntervalMs);

(async () => {
  await ensureCacheDir();
  await initFaceDetector(MODEL_DIR);

  app.listen(PORT, () => {
    console.log(`Backend listening on http://localhost:${PORT}`);
    console.log(`Frontend expected at http://localhost:5173`);
    console.log(`Drop tinyFaceDetector model files under ${MODEL_DIR}`);
  });
})();
