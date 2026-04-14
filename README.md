# Smart DP Optimizer (Full Stack)

Upload one image and generate optimized display pictures for major social networks with smart subject-aware cropping.

## Stack

- **Frontend:** React + Vite + Tailwind CSS
- **Backend:** Node.js + Express
- **Image processing:** Sharp
- **Face detection:** face-api.js + TensorFlow.js (with graceful fallback)

## Supported Output Sizes

- WhatsApp — 640x640
- Instagram — 320x320
- Facebook — 170x170 and 720x720 HD
- Snapchat — 320x320
- Twitter/X — 400x400
- LinkedIn — 400x400

## Features

- Drag-and-drop upload (JPG, PNG, WEBP)
- Auto face/subject-aware crop (fallback if model files are missing)
- Smart square crop with zoom + offset controls
- Background modes: original / blur / solid color
- Auto enhancement (sharpness, brightness, contrast)
- Optional upscaling path for low-resolution images
- Per-platform preview cards with resolution and file size
- Download each output or the full ZIP batch
- Dark/light mode
- Temporary output cache with auto cleanup

## Project Structure

```bash
.
├── backend
│   ├── src
│   │   ├── faceDetection.js
│   │   ├── imageProcessor.js
│   │   ├── platforms.js
│   │   └── server.js
│   └── models
├── frontend
│   └── src
└── README.md
```

## Setup

1. Install dependencies:

```bash
npm install
```

2. (Optional but recommended) place TinyFaceDetector model files in:

```bash
backend/models
```

Expected files:
- `tiny_face_detector_model-weights_manifest.json`
- associated shard files (`.bin`)

If models are missing, the app automatically falls back to a center-priority smart crop.

3. Run frontend + backend in dev mode:

```bash
npm run dev
```

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:4000`

## API Endpoints

- `GET /api/health`
- `POST /api/process` (multipart form-data)
  - `image` (required)
  - `zoom`, `offsetX`, `offsetY`, `backgroundMode`, `backgroundColor`, `enableUpscale`
- `GET /api/download/:batchId/:filename`
- `GET /api/download-zip/:batchId`

## Performance Notes

- Sharp-based pipeline keeps processing fast for common images.
- Output compression is optimized per format.
- Temporary file cache auto-cleans every 20 minutes (30-minute TTL).

## Beginner Tips

- Start without ML models to test full flow.
- Add face models later for better face-centric cropping.
- Keep source images above 1000px for best quality.
