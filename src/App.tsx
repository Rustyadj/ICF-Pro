import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import {
  Calculator,
  Clock,
  Layers,
  Box,
  Droplets,
  TrendingUp,
  Info,
  Home,
  Construction,
  ScanLine,
} from 'lucide-react';
import { FloorplanOverlay } from './FloorplanOverlay';
import {
  MANUFACTURERS,
  DEFAULT_MANUFACTURER,
  CORE_THICKNESS_FT,
  getManufacturer,
  type CoreSize,
} from './data/manufacturers';

export default function App() {
  // Inputs
  const [length, setLength] = useState<number>(100);
  const [height, setHeight] = useState<number>(10);
  const [manufacturerId, setManufacturerId] = useState<string>(DEFAULT_MANUFACTURER.id);
  const [coreSize, setCoreSize] = useState<CoreSize>('8');
  const [progress, setProgress] = useState<number>(0);
  const [viewMode, setViewMode] = useState<'timelapse' | 'floorplan'>('timelapse');
  const [floorplanParsed, setFloorplanParsed] = useState(false);

  const manufacturer = getManufacturer(manufacturerId);

  // If the selected core size isn't available for the new manufacturer, reset to first available
  const effectiveCoreSize: CoreSize = manufacturer.coreSizes.includes(coreSize)
    ? coreSize
    : manufacturer.coreSizes[0];

  // Calculations
  const takeoff = useMemo(() => {
    const blockH = manufacturer.blockHeightIn / 12;
    const blockL = manufacturer.blockLengthIn / 12;
    const sqft = blockH * blockL;
    const wallArea = length * height;
    const blockCount = Math.ceil(wallArea / sqft);
    const concreteVolumeCuFt = wallArea * CORE_THICKNESS_FT[effectiveCoreSize];
    const concreteVolumeCuYd = concreteVolumeCuFt / 27;
    const horizontalRuns = Math.ceil(height / blockH);
    const verticalRuns = Math.ceil(length / blockH);
    const totalRebarFt = (horizontalRuns * length) + (verticalRuns * height);
    return { wallArea, blockCount, concreteVolumeCuYd, totalRebarFt };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [length, height, effectiveCoreSize, manufacturer]);

  // Timelapse Stage Logic
  const getStage = (p: number) => {
    if (p < 10) return { label: 'Excavation & Footings', color: 'bg-amber-900' };
    if (p < 30) return { label: 'First Course & Bracing', color: 'bg-zinc-700' };
    if (p < 60) return { label: 'Wall Stacking', color: 'bg-zinc-600' };
    if (p < 80) return { label: 'Rebar & Final Bracing', color: 'bg-zinc-500' };
    if (p < 95) return { label: 'Concrete Pour', color: 'bg-zinc-400' };
    return { label: 'Curing & Finished Walls', color: 'bg-zinc-300' };
  };

  const currentStage = getStage(progress);

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-zinc-950 overflow-hidden">
      {/* Left Panel: Inputs & Takeoff */}
      <div className="w-full lg:w-96 bg-zinc-900 border-r border-zinc-800 p-6 flex flex-col gap-8 overflow-y-auto">
        <header className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/10 rounded-lg">
            <Calculator className="w-6 h-6 text-emerald-500" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">ICF Takeoff</h1>
            <p className="text-xs text-zinc-500 uppercase tracking-widest font-semibold">Quantity Estimator</p>
          </div>
        </header>

        <section className="space-y-6">
          {/* Manufacturer selector */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-zinc-400">Manufacturer</label>
            <select
              value={manufacturerId}
              onChange={(e) => {
                const next = getManufacturer(e.target.value);
                setManufacturerId(next.id);
                if (!next.coreSizes.includes(coreSize)) {
                  setCoreSize(next.coreSizes.includes('8') ? '8' : next.coreSizes[0]);
                }
              }}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
            >
              {MANUFACTURERS.map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
            <p className="text-xs text-zinc-500">{manufacturer.description}</p>
          </div>

          <div className="space-y-4">
            <label className="block text-sm font-medium text-zinc-400">Wall Dimensions</label>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <span className="text-xs text-zinc-500">Length (ft)</span>
                <input
                  type="number"
                  value={length}
                  onChange={(e) => setLength(Number(e.target.value))}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                />
              </div>
              <div className="space-y-2">
                <span className="text-xs text-zinc-500">Height (ft)</span>
                <input
                  type="number"
                  value={height}
                  onChange={(e) => setHeight(Number(e.target.value))}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                />
              </div>
            </div>
            <p className="text-xs text-zinc-500">
              Block: {manufacturer.blockHeightIn}"H × {manufacturer.blockLengthIn}"L
              &nbsp;·&nbsp;
              {(manufacturer.blockHeightIn / 12 * manufacturer.blockLengthIn / 12).toFixed(2)} sqft each
            </p>
          </div>

          <div className="space-y-3">
            <label className="block text-sm font-medium text-zinc-400">Core Thickness</label>
            <div className="flex gap-2 flex-wrap">
              {manufacturer.coreSizes.map((size) => (
                <button
                  key={size}
                  onClick={() => setCoreSize(size)}
                  className={`px-3 py-2 rounded-lg border text-sm transition-all ${
                    effectiveCoreSize === size
                      ? 'bg-emerald-500/10 border-emerald-500 text-emerald-500'
                      : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-600'
                  }`}
                >
                  {size}"
                </button>
              ))}
            </div>
          </div>
        </section>

        <div className="h-px bg-zinc-800" />

        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">Estimates</h2>
          <div className="grid gap-3">
            <EstimateCard 
              icon={<Layers className="w-4 h-4" />} 
              label="ICF Blocks" 
              value={takeoff.blockCount.toLocaleString()} 
              unit="Blocks"
            />
            <EstimateCard 
              icon={<Droplets className="w-4 h-4" />} 
              label="Concrete" 
              value={takeoff.concreteVolumeCuYd.toFixed(1)} 
              unit="Cu Yds"
            />
            <EstimateCard 
              icon={<Box className="w-4 h-4" />} 
              label="Total Area" 
              value={takeoff.wallArea.toLocaleString()} 
              unit="Sq Ft"
            />
            <EstimateCard 
              icon={<TrendingUp className="w-4 h-4" />} 
              label="Rebar" 
              value={takeoff.totalRebarFt.toLocaleString()} 
              unit="Lin Ft"
            />
          </div>
        </section>

        <div className="mt-auto pt-6">
          <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl flex gap-3">
            <Info className="w-5 h-5 text-emerald-500 shrink-0" />
            <p className="text-xs text-zinc-400 leading-relaxed">
              Estimates are based on standard 16"x48" ICF blocks. Actual site conditions and waste factors (typically 5-10%) should be considered.
            </p>
          </div>
        </div>
      </div>

      {/* Right Panel */}
      <main className="flex-1 relative flex flex-col bg-zinc-950 min-h-0">
        <div className="absolute inset-0 opacity-20 pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle at 2px 2px, #3f3f46 1px, transparent 0)',
            backgroundSize: '32px 32px'
          }}
        />

        {/* Tab bar */}
        <div className="relative z-10 flex items-center gap-1 p-4 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-sm">
          <TabButton
            active={viewMode === 'timelapse'}
            onClick={() => setViewMode('timelapse')}
            icon={<Construction className="w-3.5 h-3.5" />}
            label="Construction View"
          />
          <TabButton
            active={viewMode === 'floorplan'}
            onClick={() => setViewMode('floorplan')}
            icon={<ScanLine className="w-3.5 h-3.5" />}
            label="Floorplan Analysis"
            badge={floorplanParsed}
          />
        </div>

        {viewMode === 'floorplan' ? (
          <FloorplanOverlay
            onAnalysisComplete={(wallLengthFt, openingCount) => {
              setLength(wallLengthFt);
              setFloorplanParsed(true);
            }}
          />
        ) : (
          <>
            <div className="flex-1 flex items-center justify-center p-8 lg:p-20">
              <div className="relative w-full max-w-4xl aspect-video bg-zinc-900/50 rounded-3xl border border-zinc-800 shadow-2xl overflow-hidden flex items-center justify-center">

                {/* 3D-ish House Visualization */}
                <div className="relative w-full h-full flex items-center justify-center perspective-1000">
                  <motion.div
                    className="relative w-2/3 h-2/3 flex items-end justify-center"
                    initial={false}
                  >
                    <motion.div
                      className="absolute bottom-0 w-full h-4 bg-amber-900 rounded-full blur-sm opacity-50"
                      animate={{ scale: progress > 5 ? 1 : 0.8, opacity: progress > 5 ? 0.5 : 0 }}
                    />

                    <div className="relative w-full h-full flex items-end justify-center gap-1">
                      <WallSection progress={progress} height={height} side="left" />
                      <WallSection progress={progress} height={height} side="front" />
                      <WallSection progress={progress} height={height} side="right" />
                    </div>

                    {progress > 80 && (
                      <motion.div
                        className="absolute inset-x-0 bottom-0 bg-zinc-400/30 backdrop-blur-sm z-20"
                        initial={{ height: 0 }}
                        animate={{ height: `${(progress - 80) * 5}%` }}
                        transition={{ type: 'spring', damping: 20 }}
                      />
                    )}
                  </motion.div>
                </div>

                <div className="absolute top-8 left-8 flex items-center gap-4">
                  <div className="px-4 py-2 bg-zinc-900/80 backdrop-blur-md border border-zinc-700 rounded-full flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full animate-pulse ${currentStage.color}`} />
                    <span className="text-sm font-medium tracking-wide">{currentStage.label}</span>
                  </div>
                  <div className="px-4 py-2 bg-zinc-900/80 backdrop-blur-md border border-zinc-700 rounded-full">
                    <span className="text-sm font-mono text-emerald-500">{progress}%</span>
                  </div>
                </div>

                <div className="absolute bottom-8 right-8 flex gap-2">
                  <StageIcon active={progress >= 10} icon={<Construction className="w-5 h-5" />} />
                  <StageIcon active={progress >= 30} icon={<Layers className="w-5 h-5" />} />
                  <StageIcon active={progress >= 80} icon={<Droplets className="w-5 h-5" />} />
                  <StageIcon active={progress >= 100} icon={<Home className="w-5 h-5" />} />
                </div>
              </div>
            </div>

            <div className="p-8 bg-zinc-900/50 border-t border-zinc-800 backdrop-blur-xl">
              <div className="max-w-4xl mx-auto space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-zinc-400">
                    <Clock className="w-4 h-4" />
                    <span className="text-xs font-semibold uppercase tracking-widest">Construction Timeline</span>
                  </div>
                  <span className="text-xs text-zinc-500">Slide to visualize build progress</span>
                </div>

                <div className="relative h-12 flex items-center">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={progress}
                    onChange={(e) => setProgress(Number(e.target.value))}
                    className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="absolute top-8 w-full flex justify-between px-1">
                    {[0, 25, 50, 75, 100].map((m) => (
                      <span key={m} className="text-[10px] text-zinc-600 font-mono">{m}%</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function TabButton({
  active, onClick, icon, label, badge,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  badge?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
        active
          ? 'bg-zinc-800 text-zinc-100 border border-zinc-700'
          : 'text-zinc-500 hover:text-zinc-300 border border-transparent'
      }`}
    >
      {icon}
      {label}
      {badge && (
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
      )}
    </button>
  );
}

function EstimateCard({ icon, label, value, unit }: { icon: React.ReactNode, label: string, value: string, unit: string }) {
  return (
    <div className="p-4 bg-zinc-800/50 border border-zinc-700/50 rounded-xl flex items-center justify-between hover:bg-zinc-800 transition-colors group">
      <div className="flex items-center gap-3">
        <div className="text-zinc-500 group-hover:text-emerald-500 transition-colors">
          {icon}
        </div>
        <span className="text-sm text-zinc-400">{label}</span>
      </div>
      <div className="text-right">
        <div className="text-lg font-bold text-zinc-100">{value}</div>
        <div className="text-[10px] text-zinc-500 uppercase font-bold tracking-tighter">{unit}</div>
      </div>
    </div>
  );
}

function StageIcon({ active, icon }: { active: boolean, icon: React.ReactNode }) {
  return (
    <div className={`p-3 rounded-2xl border transition-all duration-500 ${
      active 
        ? 'bg-emerald-500 border-emerald-400 text-white shadow-lg shadow-emerald-500/20 scale-110' 
        : 'bg-zinc-800 border-zinc-700 text-zinc-600 scale-90 opacity-50'
    }`}>
      {icon}
    </div>
  );
}

function WallSection({ progress, height, side }: { progress: number, height: number, side: 'left' | 'front' | 'right' }) {
  // Determine how many blocks to show based on progress
  // Stages: 10-30 (1st course), 30-60 (stacking), 60-80 (full height)
  
  const getBlockOpacity = (row: number) => {
    if (progress < 10) return 0;
    if (row === 0 && progress >= 10) return 1;
    
    const maxRows = 8; // visual rows
    const progressPerRow = 50 / maxRows; // 30 to 80 is 50%
    const currentMaxRow = Math.floor((progress - 30) / progressPerRow);
    
    if (row <= currentMaxRow) return 1;
    return 0;
  };

  const rotation = side === 'left' ? '-rotate-y-45' : side === 'right' ? 'rotate-y-45' : '';
  const width = side === 'front' ? 'w-48' : 'w-32';

  return (
    <div className={`flex flex-col-reverse gap-0.5 ${width} transition-transform duration-700 ${rotation}`}>
      {Array.from({ length: 8 }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ 
            opacity: getBlockOpacity(i),
            scale: getBlockOpacity(i) > 0 ? 1 : 0.8,
            y: getBlockOpacity(i) > 0 ? 0 : 10
          }}
          className={`h-4 w-full rounded-sm border border-zinc-900/50 flex gap-0.5 ${
            progress >= 90 ? 'bg-zinc-400' : 'bg-zinc-600'
          }`}
        >
          {/* Block segments to look like ICF */}
          {Array.from({ length: side === 'front' ? 4 : 2 }).map((_, j) => (
            <div key={j} className="flex-1 border-r border-zinc-900/20 last:border-0" />
          ))}
        </motion.div>
      ))}
    </div>
  );
}
