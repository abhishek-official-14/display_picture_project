import * as tf from '@tensorflow/tfjs-node';
import * as faceapi from 'face-api.js';
import canvas from 'canvas';

const { Canvas, Image, ImageData, loadImage } = canvas;
faceapi.env.monkeyPatch({ Canvas, Image, ImageData });

let initialized = false;

export async function initFaceDetector(modelPath = 'models') {
  if (initialized) return;
  try {
    await faceapi.nets.tinyFaceDetector.loadFromDisk(modelPath);
    initialized = true;
  } catch (error) {
    console.warn('Face detector models unavailable; using entropy strategy.', error.message);
  }
}

export async function detectPrimarySubject(imageBuffer, metadata) {
  if (!initialized) {
    return {
      strategy: 'center-fallback',
      box: {
        x: metadata.width * 0.2,
        y: metadata.height * 0.1,
        width: metadata.width * 0.6,
        height: metadata.height * 0.7
      }
    };
  }

  const image = await loadImage(imageBuffer);
  const detections = await faceapi.detectAllFaces(
    image,
    new faceapi.TinyFaceDetectorOptions({ inputSize: 512, scoreThreshold: 0.45 })
  );

  if (!detections.length) {
    return {
      strategy: 'center-fallback',
      box: {
        x: metadata.width * 0.2,
        y: metadata.height * 0.1,
        width: metadata.width * 0.6,
        height: metadata.height * 0.7
      }
    };
  }

  const best = detections.sort((a, b) => b.score - a.score)[0].box;

  return {
    strategy: 'face-detection',
    box: {
      x: best.x,
      y: best.y,
      width: best.width,
      height: best.height
    }
  };
}

export function getSquareCropFromBox(box, metadata, zoom = 1) {
  const paddingFactor = 1.8 / Math.max(zoom, 0.6);
  const size = Math.max(box.width, box.height) * paddingFactor;
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;

  let left = Math.max(0, Math.round(cx - size / 2));
  let top = Math.max(0, Math.round(cy - size / 2));
  let right = Math.min(metadata.width, Math.round(cx + size / 2));
  let bottom = Math.min(metadata.height, Math.round(cy + size / 2));

  const width = right - left;
  const height = bottom - top;
  const square = Math.min(width, height);

  left = Math.max(0, Math.round(left + (width - square) / 2));
  top = Math.max(0, Math.round(top + (height - square) / 2));

  return {
    left,
    top,
    width: square,
    height: square
  };
}

export async function disposeTf() {
  await tf.nextFrame();
}
