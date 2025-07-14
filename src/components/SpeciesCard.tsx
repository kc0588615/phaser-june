import React from 'react';
import { MapPin, Ruler, Weight, Clock, Leaf, Shield, Globe, AlertTriangle, Info, Palette, Trees } from "lucide-react"

import type { Species } from '@/types/database';

interface SpeciesCardProps {
  species: Species;
}

// Helper function to get conservation status color
const getConservationColor = (code: string) => {
  const upperCode = code?.toUpperCase();
  switch (upperCode) {
    case 'CR': return 'bg-red-600';
    case 'EN': return 'bg-orange-600';
    case 'VU': return 'bg-orange-500';
    case 'NT': return 'bg-yellow-600';
    case 'LC': return 'bg-green-600';
    case 'DD': return 'bg-gray-500';
    default: return 'bg-gray-500';
  }
};

const getConservationLabel = (code: string) => {
  const upperCode = code?.toUpperCase();
  switch (upperCode) {
    case 'CR': return 'CR - Critically Endangered';
    case 'EN': return 'EN - Endangered';
    case 'VU': return 'VU - Vulnerable';
    case 'NT': return 'NT - Near Threatened';
    case 'LC': return 'LC - Least Concern';
    case 'DD': return 'DD - Data Deficient';
    default: return code;
  }
};

export default function SpeciesCard({ species }: SpeciesCardProps) {
  const hasValue = (value: any) => value && value !== 'NULL' && value !== 'null';

  return (
    <div className="bg-card/90 border border-border rounded-xl p-6 mb-6 shadow-lg transition-all duration-200 w-full box-border">
      {/* Header */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="inline-flex items-center px-3 py-0.5 rounded-full text-xs font-semibold border border-secondary text-secondary-foreground">
            Turtles
          </span>
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-1">
          {species.comm_name || species.sci_name}
        </h2>
        <p className="text-lg italic text-muted-foreground mb-2">
          {species.sci_name}
        </p>
        <div className="flex items-center gap-3">
          {hasValue(species.cons_code) && (
            <span className={`inline-flex items-center px-3 py-0.5 rounded-full text-xs font-semibold text-white ${getConservationColor(species.cons_code!)}`}>
              {getConservationLabel(species.cons_code!)}
            </span>
          )}
          {hasValue(species.http_iucn) && (
            <a 
              href={species.http_iucn!} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-sm text-primary hover:underline flex items-center gap-1"
            >
              <Globe size={12} />
              IUCN Page
            </a>
          )}
        </div>
      </div>

      <div className="h-px bg-border my-6" />

      {/* Taxonomy Section */}
      <div className="mb-6">
        <h3 className="text-lg font-bold mb-3 flex items-center gap-2 text-violet-400">
          <Shield size={20} />
          Taxonomy
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
          {hasValue(species.kingdom) && (
            <div>
              <span className="font-medium text-foreground">Kingdom:</span>
              <p className="text-muted-foreground">{species.kingdom}</p>
            </div>
          )}
          {hasValue(species.phylum) && (
            <div>
              <span className="font-medium text-foreground">Phylum:</span>
              <p className="text-muted-foreground">{species.phylum}</p>
            </div>
          )}
          {hasValue(species.class) && (
            <div>
              <span className="font-medium text-foreground">Class:</span>
              <p className="text-muted-foreground">{species.class}</p>
            </div>
          )}
          {hasValue(species.order_) && (
            <div>
              <span className="font-medium text-foreground">Order:</span>
              <p className="text-muted-foreground">{species.order_}</p>
            </div>
          )}
          {hasValue(species.family) && (
            <div>
              <span className="font-medium text-foreground">Family:</span>
              <p className="text-muted-foreground">{species.family}</p>
            </div>
          )}
          {hasValue(species.genus) && (
            <div>
              <span className="font-medium text-foreground">Genus:</span>
              <p className="text-muted-foreground">{species.genus}</p>
            </div>
          )}
        </div>
      </div>

      {/* Conservation Status */}
      {hasValue(species.cons_text) && (
        <>
          <div className="h-px bg-border my-6" />
          <div className="mb-6">
            <h3 className="text-lg font-bold mb-3 flex items-center gap-2 text-orange-400">
              <AlertTriangle size={20} />
              Conservation Status
            </h3>
            <div className="bg-orange-400/10 border border-orange-400/30 rounded-lg p-4">
              <p className="text-sm text-foreground">
                <strong>Conservation Notes:</strong> {species.cons_text}
              </p>
            </div>
          </div>
        </>
      )}

      {/* Habitat Section */}
      {(hasValue(species.hab_tags) || hasValue(species.hab_desc) || hasValue(species.marine) || hasValue(species.terrestria) || hasValue(species.freshwater)) && (
        <>
          <div className="h-px bg-border my-6" />
          <div className="mb-6">
            <h3 className="text-lg font-bold mb-3 flex items-center gap-2 text-green-400">
              <MapPin size={20} />
              Habitat
            </h3>
            <div>
              {hasValue(species.hab_tags) && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {species.hab_tags!.split(',').map((tag, index) => (
                    <span key={index} className="inline-flex items-center px-3 py-0.5 rounded-full text-xs font-semibold bg-secondary text-secondary-foreground">
                      {tag.trim()}
                    </span>
                  ))}
                </div>
              )}
              {hasValue(species.hab_desc) && (
                <p className="text-sm text-muted-foreground mb-3">{species.hab_desc}</p>
              )}
              <div className="flex gap-4 text-sm">
                {species.marine && <span className="inline-flex items-center px-3 py-0.5 rounded-full text-xs font-semibold border border-secondary text-secondary-foreground">Marine</span>}
                {species.terrestria && <span className="inline-flex items-center px-3 py-0.5 rounded-full text-xs font-semibold border border-secondary text-secondary-foreground">Terrestrial</span>}
                {species.freshwater && <span className="inline-flex items-center px-3 py-0.5 rounded-full text-xs font-semibold border border-secondary text-secondary-foreground">Freshwater</span>}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Geographic Distribution */}
      {hasValue(species.geo_desc) && (
        <>
          <div className="h-px bg-border my-6" />
          <div className="mb-6">
            <h3 className="text-lg font-bold mb-3 flex items-center gap-2 text-blue-400">
              <Globe size={20} />
              Geographic Distribution
            </h3>
            <p className="text-sm text-muted-foreground">{species.geo_desc}</p>
          </div>
        </>
      )}

      {/* Bioregion Information */}
      {(hasValue(species.bioregio_1) || hasValue(species.realm) || hasValue(species.sub_realm) || hasValue(species.biome)) && (
        <>
          <div className="h-px bg-border my-6" />
          <div className="mb-6">
            <h3 className="text-lg font-bold mb-3 flex items-center gap-2 text-emerald-400">
              <Trees size={20} />
              Ecoregion
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              {hasValue(species.bioregio_1) && (
                <div>
                  <span className="font-medium text-foreground">Bioregion:</span>
                  <p className="text-muted-foreground">{species.bioregio_1}</p>
                </div>
              )}
              {hasValue(species.realm) && (
                <div>
                  <span className="font-medium text-foreground">Realm:</span>
                  <p className="text-muted-foreground">{species.realm}</p>
                </div>
              )}
              {hasValue(species.sub_realm) && (
                <div>
                  <span className="font-medium text-foreground">Sub-realm:</span>
                  <p className="text-muted-foreground">{species.sub_realm}</p>
                </div>
              )}
              {hasValue(species.biome) && (
                <div>
                  <span className="font-medium text-foreground">Biome:</span>
                  <p className="text-muted-foreground">{species.biome}</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Physical Characteristics */}
      {(hasValue(species.color_prim) || hasValue(species.color_sec) || hasValue(species.pattern) || hasValue(species.size_min) || hasValue(species.size_max) || hasValue(species.weight_kg) || hasValue(species.shape_desc)) && (
        <>
          <div className="h-px bg-border my-6" />
          <div className="mb-6">
            <h3 className="text-lg font-bold mb-3 flex items-center gap-2 text-red-400">
              <Palette size={20} />
              Physical Characteristics
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                {hasValue(species.color_prim) && (
                  <div className="mb-3">
                    <span className="font-medium text-sm text-foreground">Primary Color:</span>
                    <p className="text-sm text-muted-foreground">{species.color_prim}</p>
                  </div>
                )}
                {hasValue(species.color_sec) && (
                  <div className="mb-3">
                    <span className="font-medium text-sm text-foreground">Secondary Color:</span>
                    <p className="text-sm text-muted-foreground">{species.color_sec}</p>
                  </div>
                )}
                {hasValue(species.pattern) && (
                  <div>
                    <span className="font-medium text-sm text-foreground">Pattern:</span>
                    <p className="text-sm text-muted-foreground">{species.pattern}</p>
                  </div>
                )}
              </div>
              <div>
                {(hasValue(species.size_min) || hasValue(species.size_max)) && (
                  <div className="flex items-center gap-2 mb-3">
                    <Ruler size={16} className="text-secondary" />
                    <span className="font-medium text-sm text-foreground">Size Range:</span>
                    <span className="text-sm text-muted-foreground">
                      {hasValue(species.size_min) && hasValue(species.size_max) 
                        ? `${species.size_min} - ${species.size_max} cm`
                        : hasValue(species.size_min) ? `${species.size_min} cm` : `${species.size_max} cm`}
                    </span>
                  </div>
                )}
                {hasValue(species.weight_kg) && (
                  <div className="flex items-center gap-2 mb-3">
                    <Weight size={16} className="text-secondary" />
                    <span className="font-medium text-sm text-foreground">Weight:</span>
                    <span className="text-sm text-muted-foreground">{species.weight_kg} kg</span>
                  </div>
                )}
                {hasValue(species.shape_desc) && (
                  <div>
                    <span className="font-medium text-sm text-foreground">Shape:</span>
                    <p className="text-sm text-muted-foreground">{species.shape_desc}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Behavior & Diet */}
      {(hasValue(species.diet_type) || hasValue(species.diet_prey) || hasValue(species.diet_flora) || hasValue(species.behav_1) || hasValue(species.behav_2)) && (
        <>
          <div className="h-px bg-border my-6" />
          <div className="mb-6">
            <h3 className="text-lg font-bold mb-3 flex items-center gap-2 text-orange-400">
              <Leaf size={20} />
              Behavior & Diet
            </h3>
            <div>
              {hasValue(species.diet_type) && (
                <div className="mb-2">
                  <span className="inline-flex items-center px-3 py-0.5 rounded-full text-xs font-semibold border border-secondary text-secondary-foreground">
                    {species.diet_type}
                  </span>
                </div>
              )}
              {hasValue(species.diet_prey) && (
                <p className="text-sm text-muted-foreground mb-2">
                  <strong className="text-foreground">Prey:</strong> {species.diet_prey}
                </p>
              )}
              {hasValue(species.diet_flora) && (
                <p className="text-sm text-muted-foreground mb-2">
                  <strong className="text-foreground">Plant Food:</strong> {species.diet_flora}
                </p>
              )}
              {hasValue(species.behav_1) && (
                <p className="text-sm text-muted-foreground mb-2">
                  <strong className="text-foreground">Behavior:</strong> {species.behav_1}
                </p>
              )}
              {hasValue(species.behav_2) && (
                <p className="text-sm text-muted-foreground">
                  <strong className="text-foreground">Additional Behavior:</strong> {species.behav_2}
                </p>
              )}
            </div>
          </div>
        </>
      )}

      {/* Life Cycle */}
      {(hasValue(species.lifespan) || hasValue(species.maturity) || hasValue(species.repro_type) || hasValue(species.clutch_sz) || hasValue(species.life_desc1) || hasValue(species.life_desc2)) && (
        <>
          <div className="h-px bg-border my-6" />
          <div className="mb-6">
            <h3 className="text-lg font-bold mb-3 flex items-center gap-2 text-pink-400">
              <Clock size={20} />
              Life Cycle
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-3">
              {hasValue(species.lifespan) && (
                <div>
                  <span className="font-medium text-sm text-foreground">Lifespan:</span>
                  <p className="text-sm text-muted-foreground">{species.lifespan} years</p>
                </div>
              )}
              {hasValue(species.maturity) && (
                <div>
                  <span className="font-medium text-sm text-foreground">Sexual Maturity:</span>
                  <p className="text-sm text-muted-foreground">{species.maturity}</p>
                </div>
              )}
              {hasValue(species.repro_type) && (
                <div>
                  <span className="font-medium text-sm text-foreground">Reproduction:</span>
                  <p className="text-sm text-muted-foreground">{species.repro_type}</p>
                </div>
              )}
              {hasValue(species.clutch_sz) && (
                <div>
                  <span className="font-medium text-sm text-foreground">Clutch Size:</span>
                  <p className="text-sm text-muted-foreground">{species.clutch_sz}</p>
                </div>
              )}
            </div>
            {hasValue(species.life_desc1) && (
              <p className="text-sm text-muted-foreground mb-2">{species.life_desc1}</p>
            )}
            {hasValue(species.life_desc2) && (
              <p className="text-sm text-muted-foreground">{species.life_desc2}</p>
            )}
          </div>
        </>
      )}

      {/* Threats */}
      {hasValue(species.threats) && (
        <>
          <div className="h-px bg-border my-6" />
          <div className="mb-6">
            <h3 className="text-lg font-bold mb-3 flex items-center gap-2 text-gray-400">
              <AlertTriangle size={20} />
              Threats
            </h3>
            <p className="text-sm text-muted-foreground">{species.threats}</p>
          </div>
        </>
      )}

      {/* Key Facts */}
      {(hasValue(species.key_fact1) || hasValue(species.key_fact2) || hasValue(species.key_fact3)) && (
        <>
          <div className="h-px bg-border my-6" />
          <div className="mb-6">
            <h3 className="text-lg font-bold mb-3 flex items-center gap-2 text-yellow-400">
              <Info size={20} />
              Key Facts
            </h3>
            <div>
              {hasValue(species.key_fact1) && (
                <p className="text-sm text-muted-foreground mb-2">• {species.key_fact1}</p>
              )}
              {hasValue(species.key_fact2) && (
                <p className="text-sm text-muted-foreground mb-2">• {species.key_fact2}</p>
              )}
              {hasValue(species.key_fact3) && (
                <p className="text-sm text-muted-foreground">• {species.key_fact3}</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}