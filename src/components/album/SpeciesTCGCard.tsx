import { useState } from 'react';
import { RotateCw, MapPin, Swords, Star } from 'lucide-react';
import { iucnBadgeClasses, iucnLabel } from '@/lib/iucn';
import { cn } from '@/lib/utils';
import type { Species } from '@/types/database';
import type { FeatureClass } from '@/types/gis';

const FEATURE_CLASS_BADGES: Record<FeatureClass, { icon: string; label: string; color: string }> = {
  river: { icon: '🌊', label: 'River', color: 'text-blue-400' },
  lake: { icon: '💧', label: 'Lake', color: 'text-blue-300' },
  protected_area: { icon: '🛡', label: 'Protected', color: 'text-green-400' },
  bioregion: { icon: '🌍', label: 'Bioregion', color: 'text-amber-400' },
  ramsar_site: { icon: '🏞', label: 'Ramsar', color: 'text-cyan-400' },
};

// Conservation-themed frame colors
const FRAME_COLORS: Record<string, { border: string; glow: string; bg: string }> = {
  CR: { border: 'border-red-500', glow: 'shadow-red-500/30', bg: 'from-red-950/40' },
  EN: { border: 'border-amber-500', glow: 'shadow-amber-500/30', bg: 'from-amber-950/40' },
  VU: { border: 'border-cyan-500', glow: 'shadow-cyan-500/20', bg: 'from-cyan-950/30' },
  NT: { border: 'border-green-500', glow: 'shadow-green-500/15', bg: 'from-green-950/20' },
  LC: { border: 'border-slate-500', glow: 'shadow-slate-500/10', bg: 'from-slate-900/30' },
};

const CLASS_EMOJI: Record<string, string> = {
  AVES: '🐦', MAMMALIA: '🦁', REPTILIA: '🦎', AMPHIBIA: '🐸',
  ACTINOPTERYGII: '🐟', CHONDRICHTHYES: '🦈', INSECTA: '🦋',
};

interface SpeciesTCGCardProps {
  species: Species;
  isDiscovered: boolean;
  discoveredAt?: string;
  runMemory?: {
    nodes?: Array<{ nodeType: string; counterGem: string | null; obstacleFamily: string | null; scoreEarned: number }>;
    realm?: string;
    biome?: string;
    bioregion?: string;
    finalScore?: number | null;
    startedAt?: string;
  } | null;
  gisStamps?: FeatureClass[];
  onFlip?: () => void;
}

export default function SpeciesTCGCard({ species, isDiscovered, discoveredAt, runMemory, gisStamps, onFlip }: SpeciesTCGCardProps) {
  const [flipped, setFlipped] = useState(false);
  const code = species.conservation_code || '';
  const frame = FRAME_COLORS[code] || FRAME_COLORS.LC!;
  const emoji = CLASS_EMOJI[species.class || ''] || '🐾';

  const handleFlip = () => {
    setFlipped(f => !f);
    onFlip?.();
  };

  return (
    <div
      className="w-full max-w-[320px] mx-auto perspective-1000"
      style={{ perspective: '1000px' }}
    >
      <div
        className={cn(
          'relative w-full transition-transform duration-500 cursor-pointer',
          flipped && '[transform:rotateY(180deg)]'
        )}
        style={{ transformStyle: 'preserve-3d' }}
        onClick={handleFlip}
      >
        {/* ===== FRONT ===== */}
        <div
          className={cn(
            'rounded-xl border-2 p-4 bg-gradient-to-b to-slate-900',
            frame.border, frame.bg,
            'shadow-lg', frame.glow,
            '[backface-visibility:hidden]'
          )}
          style={{ backfaceVisibility: 'hidden' }}
        >
          {/* Top band */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              {code && (
                <span className={cn('px-2 py-0.5 rounded text-[10px] font-bold uppercase', iucnBadgeClasses(code))}>
                  {code}
                </span>
              )}
              {species.biome && (
                <span className="text-[10px] text-slate-400 truncate max-w-[120px]">{species.biome}</span>
              )}
            </div>
            <RotateCw className="w-3.5 h-3.5 text-slate-500" />
          </div>

          {/* Art window */}
          <div className="aspect-[4/3] rounded-lg bg-slate-900/80 border border-slate-700/50 flex items-center justify-center mb-3 overflow-hidden">
            {isDiscovered ? (
              <span className="text-6xl">{emoji}</span>
            ) : (
              <div className="text-center">
                <span className="text-5xl opacity-15 block">?</span>
                <span className="text-[10px] text-slate-600 mt-1 block">Undiscovered</span>
              </div>
            )}
          </div>

          {/* Name plate */}
          <div className="mb-3 min-h-[3rem]">
            {isDiscovered ? (
              <>
                <h3 className="text-base font-bold text-white leading-tight truncate">
                  {species.common_name || species.scientific_name}
                </h3>
                <p className="text-xs italic text-slate-400 truncate">{species.scientific_name}</p>
              </>
            ) : (
              <>
                <h3 className="text-base font-bold text-slate-500 leading-tight">???</h3>
                <p className="text-xs italic text-slate-600">Unknown Species</p>
              </>
            )}
          </div>

          {/* Quick facts (discovered only) */}
          {isDiscovered && (
            <div className="space-y-1.5 mb-3">
              {species.key_fact_1 && (
                <p className="text-[11px] text-slate-300 leading-snug line-clamp-2">
                  <Star className="w-3 h-3 inline mr-1 text-amber-400" />{species.key_fact_1}
                </p>
              )}
              {species.key_fact_2 && (
                <p className="text-[11px] text-slate-400 leading-snug line-clamp-2">
                  <Star className="w-3 h-3 inline mr-1 text-amber-400/60" />{species.key_fact_2}
                </p>
              )}
            </div>
          )}

          {/* Locked fact slots (undiscovered) */}
          {!isDiscovered && (
            <div className="space-y-1.5 mb-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-4 bg-slate-800/60 rounded border border-slate-700/30" />
              ))}
              <p className="text-[9px] text-slate-600 text-center mt-1">Facts unlock on discovery</p>
            </div>
          )}

          {/* Set footer */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-700/50">
            <div className="flex gap-1.5 flex-wrap">
              {species.family && (
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700/50">
                  {species.family}
                </span>
              )}
              {species.marine && <span className="text-[8px] px-1 py-0.5 rounded bg-blue-500/20 text-blue-300">Marine</span>}
              {species.terrestrial && <span className="text-[8px] px-1 py-0.5 rounded bg-green-500/20 text-green-300">Land</span>}
              {species.freshwater && <span className="text-[8px] px-1 py-0.5 rounded bg-teal-500/20 text-teal-300">Fresh</span>}
            </div>
            <span className="text-[9px] text-slate-600 font-mono">#{species.ogc_fid}</span>
          </div>
        </div>

        {/* ===== BACK ===== */}
        <div
          className={cn(
            'absolute inset-0 rounded-xl border-2 p-4 bg-gradient-to-b to-slate-900',
            frame.border, frame.bg,
            'shadow-lg', frame.glow,
            '[transform:rotateY(180deg)] [backface-visibility:hidden]'
          )}
          style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
        >
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-white">Expedition Memory</h4>
            <RotateCw className="w-3.5 h-3.5 text-slate-500" />
          </div>

          {runMemory ? (
            <div className="space-y-3">
              {/* Location */}
              <div className="flex items-start gap-2">
                <MapPin className="w-3.5 h-3.5 text-cyan-400 mt-0.5 flex-shrink-0" />
                <div className="text-xs">
                  <p className="text-slate-300">{runMemory.bioregion || runMemory.realm || 'Unknown Region'}</p>
                  {runMemory.biome && <p className="text-slate-500 text-[10px]">{runMemory.biome}</p>}
                </div>
              </div>

              {/* Node timeline */}
              {runMemory.nodes && runMemory.nodes.length > 0 && (
                <div>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1.5">Route Nodes</p>
                  <div className="flex gap-1 flex-wrap">
                    {runMemory.nodes.map((node, i) => (
                      <div
                        key={i}
                        className="px-1.5 py-1 rounded bg-slate-800/80 border border-slate-700/50 text-center"
                        title={`${node.nodeType} — ${node.obstacleFamily || 'none'}`}
                      >
                        <p className="text-[9px] text-slate-400 truncate max-w-[60px]">{node.nodeType.replace(/_/g, ' ')}</p>
                        {node.counterGem && (
                          <p className="text-[8px] text-cyan-400">{node.counterGem}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Score */}
              {runMemory.finalScore != null && (
                <div className="flex items-center gap-2">
                  <Swords className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                  <span className="text-sm font-semibold text-amber-300">{runMemory.finalScore} pts</span>
                </div>
              )}

              {/* GIS stamps */}
              {gisStamps && gisStamps.length > 0 && (
                <div>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Evidence Stamps</p>
                  <div className="flex gap-1 flex-wrap">
                    {[...new Set(gisStamps)].map((fc) => {
                      const badge = FEATURE_CLASS_BADGES[fc];
                      return badge ? (
                        <span key={fc} className={`text-[9px] ${badge.color} bg-slate-800/80 px-1.5 py-0.5 rounded`}>
                          {badge.icon} {badge.label}
                        </span>
                      ) : null;
                    })}
                  </div>
                </div>
              )}

              {/* Date */}
              {runMemory.startedAt && (
                <p className="text-[10px] text-slate-600">
                  {new Date(runMemory.startedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                </p>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-sm text-slate-500">No expedition memory yet</p>
              <p className="text-[10px] text-slate-600 mt-1">Complete a run to record your journey</p>
            </div>
          )}

          {/* Discovery info */}
          {isDiscovered && discoveredAt && (
            <div className="mt-3 pt-2 border-t border-slate-700/50">
              <p className="text-[10px] text-green-400/70">
                First discovered {new Date(discoveredAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
