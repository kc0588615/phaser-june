import React from 'react';
import { MapPin, Ruler, Weight, Clock, Leaf, Shield, Globe, AlertTriangle, Info, Palette, Trees } from "lucide-react"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

import type { Species } from '@/types/database';

interface SpeciesCardProps {
  species: Species;
  category: string;
  onNavigateToTop: () => void;
  isDiscovered?: boolean;
  discoveredAt?: string;
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

export default function SpeciesCard({ species, category, onNavigateToTop, isDiscovered, discoveredAt }: SpeciesCardProps) {
  const hasValue = (value: any) => value && value !== 'NULL' && value !== 'null';

  return (
    <div 
      className="bg-slate-800 border border-slate-700 rounded-lg sm:rounded-xl p-4 sm:p-6 shadow-lg transition-all duration-200 w-full box-border"
      data-species-id={species.ogc_fid}
    >
      {/* Breadcrumb Navigation */}
      <div className="mb-4">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink 
                onClick={(e) => {
                  e.preventDefault();
                  onNavigateToTop();
                }}
                className="cursor-pointer hover:text-primary"
              >
                Select
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{category}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>
      
      {/* Header */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="inline-flex items-center px-3 py-0.5 rounded-full text-xs font-semibold border border-secondary text-secondary-foreground">
            {category}
          </span>
          {isDiscovered && (
            <span className="inline-flex items-center px-3 py-0.5 rounded-full text-xs font-semibold bg-green-600 text-white">
              ✅ Known
            </span>
          )}
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-1">
          {species.comm_name || species.sci_name}
        </h2>
        <p className="text-base sm:text-lg italic text-muted-foreground mb-2">
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
        <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
          {hasValue(species.kingdom) && (
            <>
              <span className="text-muted-foreground">Kingdom:</span>
              <span className="text-foreground">{species.kingdom}</span>
            </>
          )}
          {hasValue(species.phylum) && (
            <>
              <span className="text-muted-foreground">Phylum:</span>
              <span className="text-foreground">{species.phylum}</span>
            </>
          )}
          {hasValue(species.class) && (
            <>
              <span className="text-muted-foreground">Class:</span>
              <span className="text-foreground">{species.class}</span>
            </>
          )}
          {hasValue(species.order_) && (
            <>
              <span className="text-muted-foreground">Order:</span>
              <span className="text-foreground">{species.order_}</span>
            </>
          )}
          {hasValue(species.family) && (
            <>
              <span className="text-muted-foreground">Family:</span>
              <span className="text-foreground">{species.family}</span>
            </>
          )}
          {hasValue(species.genus) && (
            <>
              <span className="text-muted-foreground">Genus:</span>
              <span className="text-foreground">{species.genus}</span>
            </>
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
            <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
              {hasValue(species.bioregio_1) && (
                <>
                  <span className="text-muted-foreground">Bioregion:</span>
                  <span className="text-foreground">{species.bioregio_1}</span>
                </>
              )}
              {hasValue(species.realm) && (
                <>
                  <span className="text-muted-foreground">Realm:</span>
                  <span className="text-foreground">{species.realm}</span>
                </>
              )}
              {hasValue(species.sub_realm) && (
                <>
                  <span className="text-muted-foreground">Sub-realm:</span>
                  <span className="text-foreground">{species.sub_realm}</span>
                </>
              )}
              {hasValue(species.biome) && (
                <>
                  <span className="text-muted-foreground">Biome:</span>
                  <span className="text-foreground">{species.biome}</span>
                </>
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
            <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
              {hasValue(species.color_prim) && (
                <>
                  <span className="text-muted-foreground">Primary Color:</span>
                  <span className="text-foreground">{species.color_prim}</span>
                </>
              )}
              {hasValue(species.color_sec) && (
                <>
                  <span className="text-muted-foreground">Secondary Color:</span>
                  <span className="text-foreground">{species.color_sec}</span>
                </>
              )}
              {hasValue(species.pattern) && (
                <>
                  <span className="text-muted-foreground">Pattern:</span>
                  <span className="text-foreground">{species.pattern}</span>
                </>
              )}
              {(hasValue(species.size_min) || hasValue(species.size_max)) && (
                <>
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Ruler size={14} className="text-muted-foreground" />
                    Size Range:
                  </span>
                  <span className="text-foreground">
                    {hasValue(species.size_min) && hasValue(species.size_max) 
                      ? `${species.size_min} - ${species.size_max} cm`
                      : hasValue(species.size_min) ? `${species.size_min} cm` : `${species.size_max} cm`}
                  </span>
                </>
              )}
              {hasValue(species.weight_kg) && (
                <>
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Weight size={14} className="text-muted-foreground" />
                    Weight:
                  </span>
                  <span className="text-foreground">{species.weight_kg} kg</span>
                </>
              )}
              {hasValue(species.shape_desc) && (
                <>
                  <span className="text-muted-foreground">Shape:</span>
                  <span className="text-foreground">{species.shape_desc}</span>
                </>
              )}
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
                <div className="mb-3">
                  <span className="text-sm text-muted-foreground block mb-1">Prey:</span>
                  <div className="flex flex-wrap gap-1">
                    {species.diet_prey!.split(/[,;]/).map((item, index) => (
                      <span key={index} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-400/10 border border-orange-400/30 text-orange-300">
                        {item.trim()}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {hasValue(species.diet_flora) && (
                <div className="mb-3">
                  <span className="text-sm text-muted-foreground block mb-1">Plant Food:</span>
                  <div className="flex flex-wrap gap-1">
                    {species.diet_flora!.split(/[,;]/).map((item, index) => (
                      <span key={index} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-400/10 border border-green-400/30 text-green-300">
                        {item.trim()}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {hasValue(species.behav_1) && (
                <div className="mb-2">
                  <span className="text-sm text-muted-foreground">Behavior:</span>
                  <p className="text-sm text-foreground">{species.behav_1}</p>
                </div>
              )}
              {hasValue(species.behav_2) && (
                <div>
                  <span className="text-sm text-muted-foreground">Additional Behavior:</span>
                  <p className="text-sm text-foreground">{species.behav_2}</p>
                </div>
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
            <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm mb-3">
              {hasValue(species.lifespan) && (
                <>
                  <span className="text-muted-foreground">Lifespan:</span>
                  <span className="text-foreground">{species.lifespan} years</span>
                </>
              )}
              {hasValue(species.maturity) && (
                <>
                  <span className="text-muted-foreground">Sexual Maturity:</span>
                  <span className="text-foreground">{species.maturity}</span>
                </>
              )}
              {hasValue(species.repro_type) && (
                <>
                  <span className="text-muted-foreground">Reproduction:</span>
                  <span className="text-foreground">{species.repro_type}</span>
                </>
              )}
              {hasValue(species.clutch_sz) && (
                <>
                  <span className="text-muted-foreground">Clutch Size:</span>
                  <span className="text-foreground">{species.clutch_sz}</span>
                </>
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