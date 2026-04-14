import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs/promises';
import path from 'path';
import { PLATFORM_SPECS, QUALITY_MAP } from './platforms.js';
import { detectPrimarySubject, getSquareCropFromBox } from './faceDetection.js';

const CACHE_DIR = path.resolve('cache');

export async function ensureCacheDir() {
  await fs.mkdir(CACHE_DIR, { recursive: true });
}

function normalizeExt(mimeType = 'image/jpeg') {
  if (mimeType.includes('png')) return 'png';
  if (mimeType.includes('webp')) return 'webp';
  return 'jpeg';
}

async function enhance(image) {
  return image
    .modulate({ brightness: 1.05, saturation: 1.05 })
    .sharpen({ sigma: 1.2, m1: 1, m2: 2.2, x1: 2, y2: 10, y3: 20 });
}

function positionCrop(crop, xOffset, yOffset, metadata) {
  const left = Math.max(0, Math.min(metadata.width - crop.width, crop.left + xOffset));
  const top = Math.max(0, Math.min(metadata.height - crop.height, crop.top + yOffset));
  return { ...crop, left, top };
}

async function buildBaseSquare(inputBuffer, opts = {}) {
  const base = sharp(inputBuffer);
  const metadata = await base.metadata();
  const detection = await detectPrimarySubject(inputBuffer, metadata);

  let crop = getSquareCropFromBox(detection.box, metadata, Number(opts.zoom ?? 1));
  crop = positionCrop(crop, Number(opts.offsetX ?? 0), Number(opts.offsetY ?? 0), metadata);

  let subject = sharp(inputBuffer).extract(crop);

  if (metadata.width < 720 || metadata.height < 720 || opts.enableUpscale === 'true') {
    subject = subject.resize(1024, 1024, {
      fit: 'cover',
      kernel: sharp.kernel.lanczos3
    });
  }

  subject = await enhance(subject);

  return {
    subject,
    crop,
    metadata,
    detection
  };
}

async function applyBackground(subjectBuffer, size, opts) {
  const mode = opts.backgroundMode || 'original';

  if (mode === 'solid') {
    const color = opts.backgroundColor || '#1f2937';
    return sharp({
      create: {
        width: size,
        height: size,
        channels: 3,
        background: color
      }
    })
      .composite([{ input: subjectBuffer, blend: 'over' }])
      .toBuffer();
  }

  if (mode === 'blur') {
    const blurred = await sharp(subjectBuffer).resize(size, size).blur(22).toBuffer();
    return sharp(blurred)
      .composite([{ input: subjectBuffer, gravity: 'center' }])
      .toBuffer();
  }

  return sharp(subjectBuffer).resize(size, size).toBuffer();
}

export async function processImage(file, options) {
  await ensureCacheDir();

  const extension = normalizeExt(file.mimetype);
  const qualityOptions = QUALITY_MAP[extension] || QUALITY_MAP.jpeg;
  const batchId = uuidv4();

  const { subject, detection, crop } = await buildBaseSquare(file.buffer, options);
  const subjectBuffer = await subject.resize(1024, 1024, { fit: 'cover' }).toBuffer();

  const outputs = [];

  for (const [platform, specs] of Object.entries(PLATFORM_SPECS)) {
    for (const spec of specs) {
      const prepared = await applyBackground(subjectBuffer, spec.width, options);
      const filename = `${platform}-${spec.label}.${extension === 'jpeg' ? 'jpg' : extension}`;
      const filepath = path.join(CACHE_DIR, `${batchId}-${filename}`);

      let pipeline = sharp(prepared).resize(spec.width, spec.height, {
        fit: 'cover',
        position: 'centre'
      });

      if (extension === 'png') pipeline = pipeline.png(qualityOptions);
      if (extension === 'webp') pipeline = pipeline.webp(qualityOptions);
      if (extension === 'jpeg') pipeline = pipeline.jpeg(qualityOptions);

      const info = await pipeline.toFile(filepath);

      outputs.push({
        id: `${platform}-${spec.label}`,
        platform,
        label: spec.label,
        width: spec.width,
        height: spec.height,
        sizeKB: Number((info.size / 1024).toFixed(2)),
        path: filepath,
        filename
      });
    }
  }

  return {
    batchId,
    detectionStrategy: detection.strategy,
    crop,
    outputs
  };
}
