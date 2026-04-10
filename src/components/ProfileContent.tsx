import { useEffect, useState } from 'react';
import { useUser } from '@clerk/nextjs';
import {
  Globe, Leaf, Droplets, Waves, TreePine, Star, MapPin, Clock, Zap, Layers, BookOpen,
} from 'lucide-react';

// ---- types ------------------------------------------------------------------

interface ProfileData {
  profile: {
    userId: string;
    username: string | null;
    avatarUrl: string | null;
    createdAt: string | null;
  };
  stats: {
    totalSpeciesDiscovered: number;
    totalScore: number;
    totalGamesPlayed: number;
    totalPlayTimeSeconds: number;
    marineSpeciesCount: number;
    terrestrialSpeciesCount: number;
    freshwaterSpeciesCount: number;
    aquaticSpeciesCount: number;
    speciesByBiome: Record<string, number>;
    speciesByFamily: Record<string, number>;
    speciesByGenus: Record<string, number>;
    speciesByOrder: Record<string, number>;
    speciesByRealm: Record<string, number>;
    speciesByBioregion: Record<string, number>;
    speciesByIucnStatus: Record<string, number>;
    cluesByCategory: Record<string, number>;
    favoriteClueCategory: string | null;
    firstDiscoveryAt: string | null;
    lastDiscoveryAt: string | null;
  } | null;
  topLocations: Array<{
    locationKey: string;
    biome: string | null;
    realm: string | null;
    bioregion: string | null;
    runsCompleted: number;
    bestRunScore: number;
    totalSpeciesDiscovered: number;
    masteryTier: number;
    lastPlayedAt: string | null;
  }>;
}

// ---- helpers ----------------------------------------------------------------

const IUCN_LABELS: Record<string, { label: string; color: string }> = {
  LC: { label: 'Least Concern', color: '#10b981' },
  NT: { label: 'Near Threatened', color: '#22d3ee' },
  VU: { label: 'Vulnerable', color: '#f59e0b' },
  EN: { label: 'Endangered', color: '#fb923c' },
  CR: { label: 'Critically Endangered', color: '#f43f5e' },
  EW: { label: 'Extinct in Wild', color: '#a855f7' },
  EX: { label: 'Extinct', color: '#6b7280' },
  DD: { label: 'Data Deficient', color: '#94a3b8' },
};

function fmtTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function fmtNum(n: number): string {
  return n.toLocaleString();
}

function sortedEntries(obj: Record<string, number> | null | undefined): [string, number][] {
  if (!obj) return [];
  return Object.entries(obj).sort((a, b) => b[1] - a[1]);
}

function masteryLabel(tier: number): string {
  return ['Uncharted', 'Familiar', 'Scout', 'Ranger', 'Expert', 'Master'][Math.min(tier, 5)];
}

function masteryColor(tier: number): string {
  return ['#64748b', '#22d3ee', '#10b981', '#f59e0b', '#fb923c', '#f43f5e'][Math.min(tier, 5)];
}

// ---- sub-components ---------------------------------------------------------

function StatCard({ value, label, color = '#22d3ee' }: { value: string; label: string; color?: string }) {
  return (
    <div className="flex-1 flex flex-col items-center gap-1 glass-bg shadow-card border border-ds-subtle rounded-[10px] py-3 px-2">
      <span className="text-xl font-bold" style={{ color }}>{value}</span>
      <span className="text-ds-badge uppercase text-ds-text-muted">{label}</span>
    </div>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-ds-heading-sm text-ds-text-primary uppercase tracking-wider mb-3 flex items-center gap-2">
      {children}
    </h2>
  );
}

function BiomeChip({ name, count }: { name: string; count: number }) {
  return (
    <div className="flex items-center gap-2 glass-bg border border-ds-accent rounded-full px-3 py-1.5">
      <Leaf className="w-3 h-3 text-ds-emerald flex-shrink-0" />
      <span className="text-[12px] text-ds-text-primary truncate max-w-[130px]">{name}</span>
      <span className="text-ds-badge font-bold text-ds-cyan ml-auto flex-shrink-0">{count}</span>
    </div>
  );
}

function AffinityBadge({ family, count }: { family: string; count: number }) {
  const hue = family.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360;
  const color = `hsl(${hue}, 70%, 60%)`;
  const glow = `0 0 12px hsla(${hue}, 70%, 60%, 0.5)`;
  const initials = family.slice(0, 2).toUpperCase();

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div
        className="w-12 h-12 rounded-full flex items-center justify-center border-2 text-[13px] font-bold"
        style={{ borderColor: color, boxShadow: glow, color, background: `hsla(${hue}, 70%, 15%, 0.6)` }}
      >
        {initials}
      </div>
      <span className="text-[9px] font-medium uppercase tracking-wide text-ds-text-secondary text-center max-w-[52px] leading-tight truncate">{family}</span>
      <span className="text-[10px] font-bold" style={{ color }}>{count}</span>
    </div>
  );
}

function EcosystemBar({ label, count, total, color, icon }: {
  label: string; count: number; total: number; color: string; icon: React.ReactNode;
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-1.5 w-28 flex-shrink-0">
        <span style={{ color }}>{icon}</span>
        <span className="text-[12px] text-ds-text-secondary">{label}</span>
      </div>
      <div className="flex-1 bg-ds-bg rounded-full h-2">
        <div className="h-2 rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-[11px] font-bold w-8 text-right" style={{ color }}>{count}</span>
    </div>
  );
}

function LocationCard({ loc }: { loc: ProfileData['topLocations'][0] }) {
  const color = masteryColor(loc.masteryTier);
  return (
    <div className="glass-bg shadow-card border border-ds-subtle rounded-[10px] p-3 flex items-center gap-3">
      <div className="w-8 h-8 rounded-full flex items-center justify-center border flex-shrink-0"
        style={{ borderColor: color, boxShadow: `0 0 8px ${color}44`, color }}>
        <MapPin className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[12px] font-semibold text-ds-text-primary truncate">{loc.biome ?? loc.realm ?? loc.bioregion ?? loc.locationKey}</div>
        <div className="text-ds-caption text-ds-text-muted">{masteryLabel(loc.masteryTier)} · {loc.runsCompleted} runs · {loc.totalSpeciesDiscovered} sp.</div>
      </div>
      <div className="text-right flex-shrink-0">
        <div className="text-[12px] font-bold" style={{ color }}>{fmtNum(loc.bestRunScore)}</div>
        <div className="text-[9px] text-ds-text-muted">best score</div>
      </div>
    </div>
  );
}

// ---- main component ---------------------------------------------------------

interface ProfileContentProps {
  /** Optional userId override; if omitted, uses Clerk auth */
  userId?: string | null;
  /** Hide the back button / page-level chrome */
  inline?: boolean;
}

export function ProfileContent({ userId, inline }: ProfileContentProps) {
  const [data, setData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { isSignedIn, isLoaded } = useUser();

  useEffect(() => {
    if (!isLoaded) return;
    if (!userId && !isSignedIn) return;
    setLoading(true);
    setError(null);
    const url = userId
      ? `/api/player/profile?userId=${encodeURIComponent(userId)}`
      : '/api/player/profile';
    fetch(url)
      .then((r) => r.json())
      .then((json) => {
        if (json.error) throw new Error(json.error);
        setData(json);
        setError(null);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [userId, isSignedIn, isLoaded]);

  const stats = data?.stats;
  const totalEco = stats
    ? stats.marineSpeciesCount + stats.terrestrialSpeciesCount + stats.freshwaterSpeciesCount + stats.aquaticSpeciesCount
    : 0;

  const topFamilies = sortedEntries(stats?.speciesByFamily).slice(0, 18);
  const topBiomes = sortedEntries(stats?.speciesByBiome).slice(0, 12);
  const topRealms = sortedEntries(stats?.speciesByRealm).slice(0, 8);
  const iucnEntries = sortedEntries(stats?.speciesByIucnStatus);
  const topGenera = sortedEntries(stats?.speciesByGenus).slice(0, 8);
  const topOrders = sortedEntries(stats?.speciesByOrder).slice(0, 8);
  const topBioregions = sortedEntries(stats?.speciesByBioregion).slice(0, 8);
  const clueCategories = sortedEntries(stats?.cluesByCategory);

  if (!isLoaded) return null;

  if (!userId && !isSignedIn && !loading) {
    return (
      <div className={inline ? 'p-4' : 'mx-4 mt-8'}>
        <div className="glass-bg shadow-card border border-ds-accent rounded-[16px] p-6 text-center">
          <Globe className="w-12 h-12 text-ds-cyan mx-auto mb-3 glow-cyan" />
          <p className="text-ds-heading-sm mb-1">Sign in to view your profile</p>
          <p className="text-ds-body text-ds-text-muted mb-4">Track biomes explored, family affinities, and discovery history.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="text-ds-text-primary">
      {loading && (
        <div className="flex items-center justify-center mt-20">
          <div className="w-8 h-8 border-2 border-ds-cyan border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {error && (
        <div className="mx-4 mt-8 glass-bg shadow-card border border-ds-rose/30 rounded-[16px] p-4 text-center text-ds-body text-ds-rose">
          {error}
        </div>
      )}

      {data && (
        <div className="px-4 space-y-6">
          {/* Profile header */}
          <div className="flex items-center gap-4 glass-bg shadow-card rounded-[16px] p-4 border border-ds-subtle">
            {data.profile.avatarUrl ? (
              <img
                src={data.profile.avatarUrl}
                alt=""
                className="w-14 h-14 rounded-full border-2 border-ds-accent flex-shrink-0 object-cover glow-cyan"
              />
            ) : (
              <div className="w-14 h-14 rounded-full flex items-center justify-center text-[22px] font-bold border-2 border-ds-accent flex-shrink-0 bg-ds-surface-elevated glow-cyan">
                {data.profile.username ? data.profile.username.slice(0, 1).toUpperCase() : '?'}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="text-[16px] font-bold truncate">{data.profile.username ?? 'Anonymous'}</div>
              <span className="inline-block text-ds-badge uppercase text-ds-cyan bg-ds-cyan/10 border border-ds-cyan/30 rounded-full px-2 py-0.5">Field Researcher</span>
              {data.profile.createdAt && (
                <div className="flex items-center gap-1 mt-1 text-ds-caption text-ds-text-muted">
                  <Clock className="w-3 h-3" />
                  <span>Since {new Date(data.profile.createdAt).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          </div>

          {!stats && (
            <div className="glass-bg shadow-card border border-ds-accent rounded-[16px] p-6 text-center">
              <p className="text-ds-body text-ds-text-muted">No expeditions completed yet. Head to the Globe to start your first run.</p>
            </div>
          )}

          {stats && <div className="flex gap-2">
            <StatCard value={fmtNum(stats.totalSpeciesDiscovered)} label="Species" color="#10b981" />
            <StatCard value={fmtNum(stats.totalScore)} label="Score" color="#22d3ee" />
            <StatCard value={String(stats.totalGamesPlayed)} label="Runs" color="#f59e0b" />
            <StatCard value={fmtTime(stats.totalPlayTimeSeconds)} label="Time" color="#94a3b8" />
          </div>}

          {topBiomes.length > 0 && (
            <div>
              <SectionHeader><Leaf className="w-4 h-4 text-ds-emerald" /> Biomes Explored</SectionHeader>
              <div className="flex flex-wrap gap-2">
                {topBiomes.map(([biome, count]) => <BiomeChip key={biome} name={biome} count={count} />)}
              </div>
            </div>
          )}

          {topRealms.length > 0 && (
            <div>
              <SectionHeader><Globe className="w-4 h-4 text-ds-cyan" /> Biogeographic Realms</SectionHeader>
              <div className="grid grid-cols-2 gap-2">
                {topRealms.map(([realm, count]) => (
                  <div key={realm} className="glass-bg border border-ds-accent rounded-[10px] px-3 py-2 flex justify-between items-center">
                    <span className="text-[12px] text-ds-text-secondary truncate">{realm}</span>
                    <span className="text-[12px] font-bold text-ds-cyan ml-2 flex-shrink-0">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {topFamilies.length > 0 && (
            <div>
              <SectionHeader><Star className="w-4 h-4 text-ds-amber" /> Family Affinities</SectionHeader>
              <div className="glass-bg shadow-card border border-ds-subtle rounded-[16px] p-4">
                <div className="flex flex-wrap gap-4 justify-start">
                  {topFamilies.map(([family, count]) => <AffinityBadge key={family} family={family} count={count} />)}
                </div>
              </div>
            </div>
          )}

          {topGenera.length > 0 && (
            <div>
              <SectionHeader><TreePine className="w-4 h-4 text-ds-emerald" /> Top Genera</SectionHeader>
              <div className="glass-bg shadow-card border border-ds-subtle rounded-[16px] overflow-hidden">
                {topGenera.map(([genus, count], i) => (
                  <div key={genus} className="flex items-center justify-between px-4 py-2.5 border-b border-ds-subtle last:border-0">
                    <div className="flex items-center gap-2">
                      <span className="text-ds-caption text-ds-text-muted w-4">{i + 1}</span>
                      <span className="text-ds-body italic text-ds-text-primary">{genus}</span>
                    </div>
                    <span className="text-[12px] font-bold text-ds-emerald">{count} sp.</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {stats && totalEco > 0 && (
            <div>
              <SectionHeader><Waves className="w-4 h-4 text-ds-cyan" /> Ecosystem Types</SectionHeader>
              <div className="glass-bg shadow-card border border-ds-subtle rounded-[16px] p-4 space-y-3">
                <EcosystemBar label="Terrestrial" count={stats.terrestrialSpeciesCount} total={totalEco} color="#10b981" icon={<TreePine className="w-4 h-4" />} />
                <EcosystemBar label="Marine" count={stats.marineSpeciesCount} total={totalEco} color="#22d3ee" icon={<Waves className="w-4 h-4" />} />
                <EcosystemBar label="Freshwater" count={stats.freshwaterSpeciesCount} total={totalEco} color="#3b82f6" icon={<Droplets className="w-4 h-4" />} />
                <EcosystemBar label="Aquatic" count={stats.aquaticSpeciesCount} total={totalEco} color="#8b5cf6" icon={<Droplets className="w-4 h-4" />} />
              </div>
            </div>
          )}

          {iucnEntries.length > 0 && (
            <div>
              <SectionHeader><Zap className="w-4 h-4 text-ds-amber" /> Conservation Status</SectionHeader>
              <div className="flex flex-wrap gap-2">
                {iucnEntries.map(([code, count]) => {
                  const meta = IUCN_LABELS[code] ?? { label: code, color: '#94a3b8' };
                  return (
                    <div key={code} className="flex items-center gap-2 glass-bg rounded-full px-3 py-1.5 border" style={{ borderColor: `${meta.color}33` }}>
                      <span className="text-[11px] font-bold" style={{ color: meta.color }}>{code}</span>
                      <span className="text-[11px] text-ds-text-secondary">{meta.label}</span>
                      <span className="text-[11px] font-bold ml-1" style={{ color: meta.color }}>{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {topOrders.length > 0 && (
            <div>
              <SectionHeader><Layers className="w-4 h-4 text-ds-amber" /> Taxonomic Orders</SectionHeader>
              <div className="flex flex-wrap gap-1.5">
                {topOrders.map(([order, count]) => (
                  <span key={order} className="glass-bg border border-ds-subtle rounded-full px-2.5 py-0.5 text-ds-caption">
                    {order} <span className="text-ds-text-muted">({count})</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {topBioregions.length > 0 && (
            <div>
              <SectionHeader><Globe className="w-4 h-4 text-ds-emerald" /> Bioregions</SectionHeader>
              <div className="flex flex-wrap gap-1.5">
                {topBioregions.map(([region, count]) => (
                  <span key={region} className="glass-bg border border-ds-subtle rounded-full px-2.5 py-0.5 text-ds-caption">
                    {region} <span className="text-ds-text-muted">({count})</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {clueCategories.length > 0 && (
            <div>
              <SectionHeader><BookOpen className="w-4 h-4 text-ds-cyan" /> Clue Categories</SectionHeader>
              <div className="flex flex-wrap gap-1.5">
                {clueCategories.map(([cat, count]) => (
                  <span key={cat} className="glass-bg border border-ds-subtle rounded-full px-2.5 py-0.5 text-ds-caption">
                    {cat} <span className="text-ds-text-muted">({count})</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {data.topLocations.length > 0 && (
            <div>
              <SectionHeader><MapPin className="w-4 h-4 text-ds-cyan" /> Field Mastery</SectionHeader>
              <div className="space-y-2">
                {data.topLocations.map((loc) => <LocationCard key={loc.locationKey} loc={loc} />)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
