import { useMemo, useState } from 'react';
import axios from 'axios';
import { Download, ImagePlus, Moon, Sun, Upload } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

const initialControls = {
  zoom: 1,
  offsetX: 0,
  offsetY: 0,
  backgroundMode: 'original',
  backgroundColor: '#1f2937',
  enableUpscale: true,
  radius: 'circle'
};

export default function App() {
  const [dark, setDark] = useState(true);
  const [file, setFile] = useState(null);
  const [controls, setControls] = useState(initialControls);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const grouped = useMemo(() => {
    if (!result?.outputs) return {};
    return result.outputs.reduce((acc, item) => {
      acc[item.platform] = acc[item.platform] || [];
      acc[item.platform].push(item);
      return acc;
    }, {});
  }, [result]);

  const onFile = (chosen) => {
    if (!chosen) return;
    setFile(chosen);
    setResult(null);
    setError('');
  };

  const processImage = async () => {
    if (!file) return;
    setLoading(true);
    setError('');

    const formData = new FormData();
    formData.append('image', file);
    Object.entries(controls).forEach(([key, value]) => formData.append(key, value));

    try {
      const { data } = await axios.post(`${API_BASE}/api/process`, formData);
      setResult(data);
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to process image');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className={dark ? 'dark' : ''}>
      <div className="min-h-screen bg-slate-100 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
        <div className="mx-auto max-w-6xl p-4 md:p-8">
          <header className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold md:text-4xl">Smart DP Optimizer</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">Upload once, get platform-perfect profile pictures.</p>
            </div>
            <button
              onClick={() => setDark((s) => !s)}
              className="rounded-full border border-slate-300 p-2 dark:border-slate-700"
              type="button"
            >
              {dark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </header>

          <section className="grid gap-6 lg:grid-cols-3">
            <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 lg:col-span-1">
              <label className="flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 p-6 text-center dark:border-slate-700">
                <Upload className="mb-2" />
                <span>Drag & drop or click to upload</span>
                <small className="text-slate-500">JPG, PNG, WEBP</small>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => onFile(e.target.files?.[0])}
                />
              </label>

              {file && <p className="text-sm">Selected: {file.name}</p>}

              <ControlSlider label="Zoom" min={0.7} max={1.8} step={0.1} value={controls.zoom} onChange={(v) => setControls((s) => ({ ...s, zoom: v }))} />
              <ControlSlider label="Move X" min={-180} max={180} step={5} value={controls.offsetX} onChange={(v) => setControls((s) => ({ ...s, offsetX: v }))} />
              <ControlSlider label="Move Y" min={-180} max={180} step={5} value={controls.offsetY} onChange={(v) => setControls((s) => ({ ...s, offsetY: v }))} />

              <div>
                <label className="mb-1 block text-sm">Background</label>
                <select
                  className="w-full rounded-md border border-slate-300 bg-transparent p-2 dark:border-slate-700"
                  value={controls.backgroundMode}
                  onChange={(e) => setControls((s) => ({ ...s, backgroundMode: e.target.value }))}
                >
                  <option value="original">Original</option>
                  <option value="blur">Blur</option>
                  <option value="solid">Solid color</option>
                </select>
              </div>

              {controls.backgroundMode === 'solid' && (
                <div>
                  <label className="mb-1 block text-sm">Solid color</label>
                  <input
                    type="color"
                    value={controls.backgroundColor}
                    onChange={(e) => setControls((s) => ({ ...s, backgroundColor: e.target.value }))}
                  />
                </div>
              )}

              <div>
                <label className="mb-1 block text-sm">Preview shape</label>
                <select
                  className="w-full rounded-md border border-slate-300 bg-transparent p-2 dark:border-slate-700"
                  value={controls.radius}
                  onChange={(e) => setControls((s) => ({ ...s, radius: e.target.value }))}
                >
                  <option value="circle">Circle</option>
                  <option value="square">Square</option>
                </select>
              </div>

              <button
                disabled={!file || loading}
                type="button"
                onClick={processImage}
                className="w-full rounded-xl bg-indigo-600 px-4 py-3 font-semibold text-white disabled:opacity-50"
              >
                {loading ? 'Optimizing...' : 'Generate DPs'}
              </button>

              {error && <p className="text-sm text-red-500">{error}</p>}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 lg:col-span-2">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold">Outputs</h2>
                {result?.batchId && (
                  <a
                    href={`${API_BASE}/api/download-zip/${result.batchId}`}
                    className="inline-flex items-center gap-2 rounded-lg bg-slate-200 px-3 py-2 text-sm dark:bg-slate-800"
                  >
                    <Download size={16} /> Download ZIP
                  </a>
                )}
              </div>

              {!result && (
                <div className="flex h-64 flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 text-slate-500 dark:border-slate-700">
                  <ImagePlus className="mb-2" />
                  Generate to preview platform outputs.
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                {Object.entries(grouped).map(([platform, items]) => (
                  <article key={platform} className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                    <h3 className="mb-2 font-semibold capitalize">{platform}</h3>
                    <div className="space-y-3">
                      {items.map((item) => (
                        <div key={item.id} className="flex items-center gap-3 rounded-lg bg-slate-50 p-2 dark:bg-slate-800">
                          <img
                            src={item.previewUrl}
                            alt={item.filename}
                            className={`h-16 w-16 object-cover ${controls.radius === 'circle' ? 'rounded-full' : 'rounded-md'}`}
                          />
                          <div className="text-xs">
                            <p>{item.width}×{item.height}</p>
                            <p>{item.sizeKB} KB</p>
                            <a
                              className="text-indigo-600"
                              href={`${API_BASE}/api/download/${result.batchId}/${item.filename}`}
                            >
                              Download
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

function ControlSlider({ label, min, max, step, value, onChange }) {
  return (
    <label className="block text-sm">
      {label}: <span className="font-mono">{value}</span>
      <input
        className="mt-1 w-full"
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}
