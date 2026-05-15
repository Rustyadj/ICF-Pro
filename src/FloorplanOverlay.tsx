import React, { useState, useRef, useCallback, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';
import { Upload, Scan, AlertCircle, CheckCircle2, X, RefreshCw } from 'lucide-react';

interface IcfWall {
  label: string;
  estimated_length_ft: number;
  bbox: [number, number, number, number]; // y_min, x_min, y_max, x_max (0-1000 normalized)
}

interface Opening {
  type: 'window' | 'door' | 'garage';
  estimated_width_ft: number;
  estimated_height_ft: number;
  bbox: [number, number, number, number];
}

interface FloorplanAnalysis {
  icf_walls: IcfWall[];
  openings: Opening[];
  scale_assumption: string;
  total_icf_wall_length_ft: number;
}

interface FloorplanOverlayProps {
  onAnalysisComplete: (wallLengthFt: number, openingCount: number) => void;
}

const WALL_COLOR = 'rgba(16, 185, 129, 0.3)';
const WALL_STROKE = 'rgba(16, 185, 129, 0.9)';
const WINDOW_COLOR = 'rgba(251, 191, 36, 0.4)';
const WINDOW_STROKE = 'rgba(251, 191, 36, 0.9)';
const DOOR_COLOR = 'rgba(251, 146, 60, 0.4)';
const DOOR_STROKE = 'rgba(251, 146, 60, 0.9)';
const GARAGE_COLOR = 'rgba(239, 68, 68, 0.4)';
const GARAGE_STROKE = 'rgba(239, 68, 68, 0.9)';

function getOpeningColors(type: Opening['type']) {
  if (type === 'window') return { fill: WINDOW_COLOR, stroke: WINDOW_STROKE };
  if (type === 'garage') return { fill: GARAGE_COLOR, stroke: GARAGE_STROKE };
  return { fill: DOOR_COLOR, stroke: DOOR_STROKE };
}

export function FloorplanOverlay({ onAnalysisComplete }: FloorplanOverlayProps) {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<FloorplanAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const imageRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file (PNG, JPG, WEBP)');
      return;
    }
    if (imageUrl) URL.revokeObjectURL(imageUrl);
    setImageFile(file);
    setImageUrl(URL.createObjectURL(file));
    setAnalysis(null);
    setError(null);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, []);

  const drawOverlay = useCallback((result: FloorplanAnalysis) => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img) return;

    const w = img.offsetWidth;
    const h = img.offsetHeight;
    canvas.width = w;
    canvas.height = h;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, w, h);

    const sx = w / 1000;
    const sy = h / 1000;

    result.icf_walls.forEach(wall => {
      const [y1, x1, y2, x2] = wall.bbox;
      const rx = x1 * sx, ry = y1 * sy, rw = (x2 - x1) * sx, rh = (y2 - y1) * sy;
      ctx.fillStyle = WALL_COLOR;
      ctx.strokeStyle = WALL_STROKE;
      ctx.lineWidth = 2;
      ctx.fillRect(rx, ry, rw, rh);
      ctx.strokeRect(rx, ry, rw, rh);
      ctx.fillStyle = WALL_STROKE;
      ctx.font = 'bold 11px system-ui';
      ctx.fillText(`${wall.estimated_length_ft}ft`, rx + 4, ry + 14);
    });

    result.openings.forEach(opening => {
      const [y1, x1, y2, x2] = opening.bbox;
      const rx = x1 * sx, ry = y1 * sy, rw = (x2 - x1) * sx, rh = (y2 - y1) * sy;
      const { fill, stroke } = getOpeningColors(opening.type);
      ctx.fillStyle = fill;
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 2;
      ctx.fillRect(rx, ry, rw, rh);
      ctx.strokeRect(rx, ry, rw, rh);
      ctx.fillStyle = stroke;
      ctx.font = 'bold 10px system-ui';
      const label = opening.type === 'door' ? 'D' : opening.type === 'garage' ? 'G' : 'W';
      ctx.fillText(label, rx + 3, ry + 12);
    });
  }, []);

  useEffect(() => {
    if (analysis) drawOverlay(analysis);
  }, [analysis, drawOverlay]);

  const analyzeFloorplan = async () => {
    if (!imageFile) return;
    setAnalyzing(true);
    setError(null);

    try {
      const apiKey = process.env.API_KEY;
      if (!apiKey) throw new Error('GEMINI_API_KEY not configured in environment');

      const ai = new GoogleGenAI({ apiKey });

      const bytes = await imageFile.arrayBuffer();
      const base64 = btoa(
        new Uint8Array(bytes).reduce((s, b) => s + String.fromCharCode(b), '')
      );

      const prompt = `You are an expert architectural plan reader for ICF (Insulated Concrete Form) construction takeoffs.

Analyze this floorplan and identify:
1. All EXTERIOR walls that would use ICF (thick double-lined walls forming the building perimeter)
2. All openings in exterior walls: windows, doors, garage openings

Return ONLY valid JSON — no markdown, no explanation:
{
  "icf_walls": [
    { "label": "North wall", "estimated_length_ft": 40, "bbox": [y_min, x_min, y_max, x_max] }
  ],
  "openings": [
    { "type": "window|door|garage", "estimated_width_ft": 3, "estimated_height_ft": 4, "bbox": [y_min, x_min, y_max, x_max] }
  ],
  "scale_assumption": "explanation of scale used",
  "total_icf_wall_length_ft": 160
}

bbox coordinates are normalized 0–1000 (0,0 = top-left, 1000,1000 = bottom-right).
Focus ONLY on exterior ICF walls. Ignore interior partition walls.
If a scale bar is visible, use it. Otherwise estimate from typical construction (exterior walls 6–8" thick when drawn).`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: [
          {
            role: 'user',
            parts: [
              { inlineData: { mimeType: imageFile.type as 'image/png' | 'image/jpeg' | 'image/webp', data: base64 } },
              { text: prompt },
            ],
          },
        ],
      });

      const raw = response.text ?? '';
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('AI returned an unexpected format — try again');

      const result: FloorplanAnalysis = JSON.parse(jsonMatch[0]);
      setAnalysis(result);
      onAnalysisComplete(
        result.total_icf_wall_length_ft,
        result.openings.length
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setAnalyzing(false);
    }
  };

  const clearFloorplan = () => {
    if (imageUrl) URL.revokeObjectURL(imageUrl);
    setImageFile(null);
    setImageUrl(null);
    setAnalysis(null);
    setError(null);
  };

  const reanalyze = () => {
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
    setAnalysis(null);
    setError(null);
  };

  const windows = analysis?.openings.filter(o => o.type === 'window').length ?? 0;
  const doors = analysis?.openings.filter(o => o.type === 'door').length ?? 0;
  const garages = analysis?.openings.filter(o => o.type === 'garage').length ?? 0;

  if (!imageUrl) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <div
          className={`w-full flex-1 flex flex-col items-center justify-center border-2 border-dashed rounded-2xl transition-all cursor-pointer min-h-64 ${
            dragOver
              ? 'border-emerald-500 bg-emerald-500/5'
              : 'border-zinc-700 hover:border-zinc-500 bg-zinc-900/30'
          }`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
          <div className="flex flex-col items-center gap-4 text-center p-8">
            <div className="p-4 bg-zinc-800 rounded-2xl">
              <Upload className="w-8 h-8 text-zinc-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-300">Drop architectural floorplan here</p>
              <p className="text-xs text-zinc-500 mt-1">PNG · JPG · WEBP</p>
              <p className="text-xs text-zinc-600 mt-2">AI will detect exterior ICF walls and openings</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col gap-4 p-6 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {analysis
            ? <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            : <Scan className="w-4 h-4 text-zinc-400" />}
          <span className="text-sm font-medium text-zinc-300 truncate max-w-48">
            {analysis ? 'Analysis complete' : imageFile?.name}
          </span>
        </div>
        <button
          onClick={clearFloorplan}
          className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors"
          title="Remove floorplan"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Floorplan + canvas overlay */}
      <div className="relative rounded-xl overflow-hidden bg-zinc-900 border border-zinc-800">
        <img
          ref={imageRef}
          src={imageUrl}
          alt="Architectural floorplan"
          className="w-full h-auto block"
          onLoad={() => { if (analysis) drawOverlay(analysis); }}
        />
        <canvas
          ref={canvasRef}
          className="absolute inset-0 pointer-events-none"
          style={{ width: '100%', height: '100%' }}
        />
        {analyzing && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950/70 backdrop-blur-sm gap-3">
            <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-zinc-300 font-medium">Analyzing floorplan…</p>
          </div>
        )}
      </div>

      {/* Legend */}
      {analysis && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
          <LegendDot color="bg-emerald-500/60 border-emerald-500" label="ICF Exterior Wall" />
          <LegendDot color="bg-amber-400/60 border-amber-400" label="Window" />
          <LegendDot color="bg-orange-400/60 border-orange-400" label="Door" />
          <LegendDot color="bg-red-500/60 border-red-500" label="Garage" />
        </div>
      )}

      {/* Summary cards */}
      {analysis && (
        <div className="grid grid-cols-4 gap-2">
          <SummaryCard value={analysis.total_icf_wall_length_ft} label="Lin Ft Wall" accent />
          <SummaryCard value={windows} label="Windows" />
          <SummaryCard value={doors} label="Doors" />
          <SummaryCard value={garages} label="Garages" />
        </div>
      )}

      {analysis && (
        <p className="text-xs text-zinc-500 italic">{analysis.scale_assumption}</p>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <p className="text-xs text-red-300">{error}</p>
        </div>
      )}

      {/* Action buttons */}
      {!analysis && !analyzing && (
        <button
          onClick={analyzeFloorplan}
          className="w-full py-3 rounded-xl font-semibold text-sm bg-emerald-500 hover:bg-emerald-400 text-white shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2"
        >
          <Scan className="w-4 h-4" />
          Analyze with AI
        </button>
      )}

      {analysis && (
        <button
          onClick={reanalyze}
          className="w-full py-2 rounded-xl text-sm text-zinc-400 hover:text-zinc-200 border border-zinc-700 hover:border-zinc-500 transition-all flex items-center justify-center gap-2"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Re-analyze
        </button>
      )}
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className={`w-3 h-3 rounded-sm border ${color}`} />
      <span className="text-zinc-400">{label}</span>
    </div>
  );
}

function SummaryCard({ value, label, accent }: { value: number; label: string; accent?: boolean }) {
  return (
    <div className={`p-3 rounded-xl border ${accent ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-zinc-800 border-zinc-700'}`}>
      <div className={`text-lg font-bold ${accent ? 'text-emerald-400' : 'text-zinc-100'}`}>{value}</div>
      <div className="text-[10px] text-zinc-400 leading-tight">{label}</div>
    </div>
  );
}
