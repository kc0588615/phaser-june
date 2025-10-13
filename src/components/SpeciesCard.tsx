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
import { Button } from "@/components/ui/button";
import Link from 'next/link';
import { iucnBadgeClasses, iucnLabel } from '@/lib/iucn';
import type { Species } from '@/types/database';

interface SpeciesCardProps {
  species: Species;
  category: string;
  onNavigateToTop: () => void;
  isDiscovered?: boolean;
  discoveredAt?: string;
  speciesPositionLabel?: string;
}


export default function SpeciesCard({ species, category, onNavigateToTop, isDiscovered, discoveredAt, speciesPositionLabel }: SpeciesCardProps) {
  const hasValue = (value: any) => value && value !== 'NULL' && value !== 'null';

  // Category header classes with colors and emojis
  const getCategoryHeader = (emoji: string, color: string, text: string) => (
    <h4 className={`category-title ${color} mb-3`}>
      <span>{emoji}</span>
      {text}
    </h4>
  );

  return (
    <div 
      className="species-card-mobile bg-slate-800 border border-slate-700 rounded-lg sm:rounded-xl p-3 sm:p-4 md:p-6 shadow-lg transition-all duration-200 w-full box-border"
      data-species-id={species.ogc_fid}
      style={{ 
        wordBreak: 'break-word', 
        overflowWrap: 'break-word',
        whiteSpace: 'normal',
        minWidth: '0',
        maxWidth: '100%'
      }}
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
          {speciesPositionLabel && (
            <span className="text-xs text-muted-foreground">
              {speciesPositionLabel}
            </span>
          )}
          {isDiscovered && (
            <span className="inline-flex items-center px-3 py-0.5 rounded-full text-xs font-semibold bg-green-600 text-white">
              ✅ Known
            </span>
          )}
        </div>
        <h2 
          className="font-bold text-white mb-2 break-words whitespace-normal leading-tight"
          style={{ 
            fontSize: 'clamp(18px, 5vw, 36px)',
            lineHeight: '1.2'
          }}
        >
          {species.comm_name || species.sci_name}
        </h2>
        <p 
          className="italic text-slate-200 mb-3 break-words whitespace-normal leading-relaxed"
          style={{ 
            fontSize: 'clamp(16px, 4.5vw, 30px)',
            lineHeight: '1.3'
          }}
        >
          {species.sci_name}
        </p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          {hasValue(species.cons_code) && (
            <span className={`inline-flex items-center px-3 py-0.5 rounded-full text-xs font-semibold ${iucnBadgeClasses(species.cons_code!)}`}>
              {species.cons_code} - {iucnLabel(species.cons_code!)}
            </span>
          )}
          {hasValue(species.http_iucn) && (
            <Button asChild variant="ghost" size="sm" className="text-slate-300 hover:text-white text-xs">
              <Link href={species.http_iucn!} target="_blank" rel="noopener noreferrer" aria-label="Open IUCN page in a new tab">
                <Globe className="w-3 h-3 mr-1" />
                IUCN Page
              </Link>
            </Button>
          )}
        </div>
      </div>

      <div className="h-px bg-border my-4 sm:my-6" />

      {/* Taxonomy Section */}
      <div className="mb-4 sm:mb-6">
        {getCategoryHeader('🧬', 'red', 'Taxonomy')}
        <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm w-full">
          {[
            [
              { label: 'Kingdom', value: species.kingdom },
              { label: 'Order', value: species.order_ },
            ],
            [
              { label: 'Phylum', value: species.phylum },
              { label: 'Family', value: species.family },
            ],
            [
              { label: 'Class', value: species.class },
              { label: 'Genus', value: species.genus },
            ],
          ].map((row, rowIndex) =>
            row.map(({ label, value }) => (
              <div key={`${label}-${rowIndex}`} className="min-w-0">
                {hasValue(value) ? (
                  <div className="overflow-hidden">
                    <span className="text-slate-400">{label}:</span>
                    <p className="font-medium break-words whitespace-normal max-w-full">{value}</p>
                  </div>
                ) : (
                  <div className="h-6" aria-hidden />
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Conservation Status */}
      {(hasValue(species.cons_text) || hasValue(species.threats)) && (
        <>
          <div className="h-px bg-border my-4 sm:my-6" />
          <div className="mb-4 sm:mb-6">
            {getCategoryHeader('🛡️', 'white', 'Conservation Status')}
            <div className="bg-orange-400/15 border border-orange-400/40 rounded-lg p-4 sm:p-5">
              {hasValue(species.cons_text) && (
                <p
                  className="text-slate-100 text-sm sm:text-base leading-relaxed mb-3"
                  style={{
                    wordBreak: 'break-word',
                    overflowWrap: 'anywhere',
                    whiteSpace: 'normal',
                    width: '100%',
                    maxWidth: '100%',
                    hyphens: 'auto'
                  }}
                >
                  <strong className="text-orange-200">Conservation Notes:</strong> {species.cons_text}
                </p>
              )}
              {hasValue(species.threats) && (
                <p
                  className="text-slate-100 text-sm sm:text-base leading-relaxed"
                  style={{
                    wordBreak: 'break-word',
                    overflowWrap: 'anywhere',
                    whiteSpace: 'normal',
                    width: '100%',
                    maxWidth: '100%',
                    hyphens: 'auto'
                  }}
                >
                  <strong className="text-orange-200">Threats:</strong> {species.threats}
                </p>
              )}
            </div>
          </div>
        </>
      )}

      {/* Habitat Section */}
      {(hasValue(species.hab_tags) || hasValue(species.hab_desc) || hasValue(species.marine) || hasValue(species.terrestria) || hasValue(species.freshwater)) && (
        <>
          <div className="h-px bg-border my-4 sm:my-6" />
          <div className="mb-4 sm:mb-6">
            {getCategoryHeader('🗺️', 'blue', 'Habitat')}
            <div>
              {hasValue(species.hab_tags) && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {species.hab_tags!.split(',').map((tag, index) => (
                    <span key={`habitat-${species.ogc_fid}-${tag.trim()}`} className="inline-flex items-center px-3 py-0.5 rounded-full text-xs font-semibold bg-secondary text-secondary-foreground">
                      {tag.trim()}
                    </span>
                  ))}
                </div>
              )}
              {hasValue(species.hab_desc) && (
                <p 
                  className="text-slate-200 mb-4 text-sm sm:text-base leading-relaxed"
                  style={{ 
                    wordBreak: 'break-word',
                    overflowWrap: 'anywhere',
                    whiteSpace: 'normal',
                    width: '100%',
                    maxWidth: '100%',
                    hyphens: 'auto'
                  }}
                >
                  {species.hab_desc}
                </p>
              )}
              <div className="flex gap-4 text-xs sm:text-sm">
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
          <div className="h-px bg-border my-4 sm:my-6" />
          <div className="mb-4 sm:mb-6">
            {getCategoryHeader('🗺️', 'blue', 'Geographic Distribution')}
            <p 
              className="text-slate-200 text-sm sm:text-base leading-relaxed"
              style={{ 
                wordBreak: 'break-word',
                overflowWrap: 'anywhere',
                whiteSpace: 'normal',
                width: '100%',
                maxWidth: '100%',
                hyphens: 'auto'
              }}
            >
              {species.geo_desc}
            </p>
          </div>
        </>
      )}

      {/* Bioregion Information */}
      {(hasValue(species.bioregio_1) || hasValue(species.realm) || hasValue(species.sub_realm) || hasValue(species.biome)) && (
        <>
          <div className="h-px bg-border my-4 sm:my-6" />
          <div className="mb-4 sm:mb-6">
            {getCategoryHeader('🌳', 'green', 'Ecoregion')}
            <div className="grid grid-cols-[minmax(0,auto)_1fr] gap-x-3 sm:gap-x-4 gap-y-2 text-sm sm:text-base items-start">
              {hasValue(species.bioregio_1) && (
                <>
                  <span className="text-slate-300 font-medium">Bioregion:</span>
                  <span className="text-white grid-value" style={{ wordBreak: 'normal', overflowWrap: 'normal' }}>{species.bioregio_1}</span>
                </>
              )}
              {hasValue(species.realm) && (
                <>
                  <span className="text-slate-300 font-medium">Realm:</span>
                  <span className="text-white grid-value" style={{ wordBreak: 'normal', overflowWrap: 'normal' }}>{species.realm}</span>
                </>
              )}
              {hasValue(species.sub_realm) && (
                <>
                  <span className="text-slate-300 font-medium">Sub-realm:</span>
                  <span className="text-white grid-value" style={{ wordBreak: 'normal', overflowWrap: 'normal' }}>{species.sub_realm}</span>
                </>
              )}
              {hasValue(species.biome) && (
                <>
                  <span className="text-slate-300 font-medium">Biome:</span>
                  <span className="text-white grid-value" style={{ wordBreak: 'normal', overflowWrap: 'normal' }}>{species.biome}</span>
                </>
              )}
            </div>
          </div>
        </>
      )}

      {/* Physical Characteristics */}
      {(hasValue(species.color_prim) || hasValue(species.color_sec) || hasValue(species.pattern) || hasValue(species.size_min) || hasValue(species.size_max) || hasValue(species.weight_kg) || hasValue(species.shape_desc)) && (
        <>
          <div className="h-px bg-border my-4 sm:my-6" />
          <div className="mb-4 sm:mb-6">
            {getCategoryHeader('🐾', 'orange', 'Physical Characteristics')}
            <div className="grid grid-cols-[minmax(0,auto)_1fr] gap-x-3 sm:gap-x-4 gap-y-2 text-sm sm:text-base items-start">
              {hasValue(species.color_prim) && (
                <>
                  <span className="text-slate-300 font-medium">Primary Color:</span>
                  <span className="text-white grid-value" style={{ wordBreak: 'keep-all', overflowWrap: 'break-word' }}>{species.color_prim}</span>
                </>
              )}
              {hasValue(species.color_sec) && (
                <>
                  <span className="text-slate-300 font-medium">Secondary Color:</span>
                  <span className="text-white grid-value" style={{ wordBreak: 'keep-all', overflowWrap: 'break-word' }}>{species.color_sec}</span>
                </>
              )}
              {hasValue(species.pattern) && (
                <>
                  <span className="text-slate-300 font-medium">Pattern:</span>
                  <span className="text-white grid-value" style={{ wordBreak: 'keep-all', overflowWrap: 'break-word' }}>{species.pattern}</span>
                </>
              )}
              {(hasValue(species.size_min) || hasValue(species.size_max)) && (
                <>
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Ruler size={14} className="text-muted-foreground" />
                    Size Range:
                  </span>
                  <span className="text-white grid-value" style={{ wordBreak: 'keep-all', overflowWrap: 'break-word' }}>
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
                  <span className="text-white grid-value" style={{ wordBreak: 'keep-all', overflowWrap: 'break-word' }}>{species.weight_kg} kg</span>
                </>
              )}
              {hasValue(species.shape_desc) && (
                <>
                  <span className="text-muted-foreground">Shape:</span>
                  <span className="text-white grid-value" style={{ wordBreak: 'keep-all', overflowWrap: 'break-word' }}>{species.shape_desc}</span>
                </>
              )}
            </div>
          </div>
        </>
      )}

      {/* Behavior & Diet */}
      {(hasValue(species.diet_type) || hasValue(species.diet_prey) || hasValue(species.diet_flora) || hasValue(species.behav_1) || hasValue(species.behav_2)) && (
        <>
          <div className="h-px bg-border my-4 sm:my-6" />
          <div className="mb-4 sm:mb-6">
            {getCategoryHeader('💨', 'yellow', 'Behavior & Diet')}
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
                  <span className="text-xs sm:text-sm text-muted-foreground block mb-1">Prey:</span>
                  <div className="flex flex-wrap gap-1">
                    {species.diet_prey!.split(/[,;]/).map((item, index) => (
                      <span key={`prey-${species.ogc_fid}-${item.trim()}`} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-400/10 border border-orange-400/30 text-orange-300">
                        {item.trim()}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {hasValue(species.diet_flora) && (
                <div className="mb-3">
                  <span className="text-xs sm:text-sm text-muted-foreground block mb-1">Plant Food:</span>
                  <div className="flex flex-wrap gap-1">
                    {species.diet_flora!.split(/[,;]/).map((item, index) => (
                      <span key={`flora-${species.ogc_fid}-${item.trim()}`} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-400/10 border border-green-400/30 text-green-300">
                        {item.trim()}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {hasValue(species.behav_1) && (
                <div className="mb-2 w-full">
                  <span 
                    className="text-muted-foreground block mb-1"
                    style={{ fontSize: 'clamp(9px, 2vw, 12px)' }}
                  >
                    Behavior:
                  </span>
                  <p 
                    className="text-foreground"
                    style={{ 
                      fontSize: 'clamp(12px, 3.5vw, 14px)',
                      lineHeight: '1.4',
                      wordBreak: 'break-word',
                      overflowWrap: 'anywhere',
                      whiteSpace: 'normal',
                      width: '100%',
                      maxWidth: '100%',
                      hyphens: 'auto'
                    }}
                  >
                    {species.behav_1}
                  </p>
                </div>
              )}
              {hasValue(species.behav_2) && (
                <div className="w-full">
                  <span 
                    className="text-muted-foreground block mb-1"
                    style={{ fontSize: 'clamp(9px, 2vw, 12px)' }}
                  >
                    Additional Behavior:
                  </span>
                  <p 
                    className="text-foreground"
                    style={{ 
                      fontSize: 'clamp(12px, 3.5vw, 14px)',
                      lineHeight: '1.4',
                      wordBreak: 'break-word',
                      overflowWrap: 'anywhere',
                      whiteSpace: 'normal',
                      width: '100%',
                      maxWidth: '100%',
                      hyphens: 'auto'
                    }}
                  >
                    {species.behav_2}
                  </p>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Life Cycle */}
      {(hasValue(species.lifespan) || hasValue(species.maturity) || hasValue(species.repro_type) || hasValue(species.clutch_sz) || hasValue(species.life_desc1) || hasValue(species.life_desc2)) && (
        <>
          <div className="h-px bg-border my-4 sm:my-6" />
          <div className="mb-4 sm:mb-6">
            {getCategoryHeader('⏳', 'black', 'Life Cycle')}
            <div className="grid grid-cols-[minmax(0,auto)_1fr] gap-x-2 sm:gap-x-4 gap-y-1 text-xs sm:text-sm mb-3 items-start break-words">
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
              <p 
                className="text-muted-foreground mb-2"
                style={{ 
                  fontSize: 'clamp(12px, 3.5vw, 14px)',
                  lineHeight: '1.4',
                  wordBreak: 'break-word',
                  overflowWrap: 'anywhere',
                  whiteSpace: 'normal',
                  width: '100%',
                  maxWidth: '100%',
                  hyphens: 'auto'
                }}
              >
                {species.life_desc1}
              </p>
            )}
            {hasValue(species.life_desc2) && (
              <p 
                className="text-muted-foreground"
                style={{ 
                  fontSize: 'clamp(12px, 3.5vw, 14px)',
                  lineHeight: '1.4',
                  wordBreak: 'break-word',
                  overflowWrap: 'anywhere',
                  whiteSpace: 'normal',
                  width: '100%',
                  maxWidth: '100%',
                  hyphens: 'auto'
                }}
              >
                {species.life_desc2}
              </p>
            )}
          </div>
        </>
      )}

      {/* Key Facts */}
      {(hasValue(species.key_fact1) || hasValue(species.key_fact2) || hasValue(species.key_fact3)) && (
        <>
          <div className="h-px bg-border my-4 sm:my-6" />
          <div className="mb-4 sm:mb-6">
            {getCategoryHeader('🔮', 'purple', 'Key Facts')}
            <div>
              {hasValue(species.key_fact1) && (
                <p 
                  className="text-muted-foreground mb-2"
                  style={{ 
                    fontSize: 'clamp(12px, 3.5vw, 14px)',
                    lineHeight: '1.4',
                    wordBreak: 'break-word',
                    overflowWrap: 'anywhere',
                    whiteSpace: 'normal',
                    width: '100%',
                    maxWidth: '100%',
                    hyphens: 'auto'
                  }}
                >
                  • {species.key_fact1}
                </p>
              )}
              {hasValue(species.key_fact2) && (
                <p 
                  className="text-muted-foreground mb-2"
                  style={{ 
                    fontSize: 'clamp(12px, 3.5vw, 14px)',
                    lineHeight: '1.4',
                    wordBreak: 'break-word',
                    overflowWrap: 'anywhere',
                    whiteSpace: 'normal',
                    width: '100%',
                    maxWidth: '100%',
                    hyphens: 'auto'
                  }}
                >
                  • {species.key_fact2}
                </p>
              )}
              {hasValue(species.key_fact3) && (
                <p 
                  className="text-muted-foreground"
                  style={{ 
                    fontSize: 'clamp(12px, 3.5vw, 14px)',
                    lineHeight: '1.4',
                    wordBreak: 'break-word',
                    overflowWrap: 'anywhere',
                    whiteSpace: 'normal',
                    width: '100%',
                    maxWidth: '100%',
                    hyphens: 'auto'
                  }}
                >
                  • {species.key_fact3}
                </p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
