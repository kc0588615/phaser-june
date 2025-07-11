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
    case 'CR': return '#dc2626';
    case 'EN': return '#ea580c';
    case 'VU': return '#f97316';
    case 'NT': return '#ca8a04';
    case 'LC': return '#16a34a';
    case 'DD': return '#6b7280';
    default: return '#6b7280';
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

  // Inline styles for the card
  const cardStyle: React.CSSProperties = {
    backgroundColor: 'rgba(30, 41, 59, 0.9)',
    border: '1px solid #475569',
    borderRadius: '12px',
    padding: '24px',
    marginBottom: '24px',
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
    transition: 'all 0.2s',
    width: '100%',
    boxSizing: 'border-box',
  };

  const sectionStyle: React.CSSProperties = {
    marginBottom: '24px',
  };

  const headingStyle: React.CSSProperties = {
    fontSize: '18px',
    fontWeight: 'bold',
    marginBottom: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    color: '#e2e8f0',
  };

  const separatorStyle: React.CSSProperties = {
    height: '1px',
    backgroundColor: '#475569',
    margin: '24px 0',
  };

  const badgeStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '2px 10px',
    borderRadius: '9999px',
    fontSize: '12px',
    fontWeight: '600',
    marginRight: '8px',
    marginBottom: '8px',
  };

  return (
    <div style={cardStyle}>
      {/* Header */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <span style={{ ...badgeStyle, border: '1px solid #64748b', color: '#cbd5e1' }}>Turtles</span>
        </div>
        <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#f1f5f9', marginBottom: '4px' }}>
          {species.comm_name || species.sci_name}
        </h2>
        <p style={{ fontSize: '18px', fontStyle: 'italic', color: '#94a3b8', marginBottom: '8px' }}>
          {species.sci_name}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {hasValue(species.cons_code) && (
            <span style={{ 
              ...badgeStyle, 
              backgroundColor: getConservationColor(species.cons_code),
              color: 'white',
              border: 'none'
            }}>
              {getConservationLabel(species.cons_code)}
            </span>
          )}
          {hasValue(species.http_iucn) && (
            <a 
              href={species.http_iucn!} 
              target="_blank" 
              rel="noopener noreferrer" 
              style={{ 
                fontSize: '14px', 
                color: '#3b82f6',
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <Globe size={12} />
              IUCN Page
            </a>
          )}
        </div>
      </div>

      <div style={separatorStyle} />

      {/* Taxonomy Section */}
      <div style={sectionStyle}>
        <h3 style={{ ...headingStyle, color: '#a78bfa' }}>
          <Shield size={20} />
          Taxonomy
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', fontSize: '14px' }}>
          {hasValue(species.kingdom) && (
            <div>
              <span style={{ fontWeight: '500', color: '#e2e8f0' }}>Kingdom:</span>
              <p style={{ color: '#94a3b8' }}>{species.kingdom}</p>
            </div>
          )}
          {hasValue(species.phylum) && (
            <div>
              <span style={{ fontWeight: '500', color: '#e2e8f0' }}>Phylum:</span>
              <p style={{ color: '#94a3b8' }}>{species.phylum}</p>
            </div>
          )}
          {hasValue(species.class) && (
            <div>
              <span style={{ fontWeight: '500', color: '#e2e8f0' }}>Class:</span>
              <p style={{ color: '#94a3b8' }}>{species.class}</p>
            </div>
          )}
          {hasValue(species.order_) && (
            <div>
              <span style={{ fontWeight: '500', color: '#e2e8f0' }}>Order:</span>
              <p style={{ color: '#94a3b8' }}>{species.order_}</p>
            </div>
          )}
          {hasValue(species.family) && (
            <div>
              <span style={{ fontWeight: '500', color: '#e2e8f0' }}>Family:</span>
              <p style={{ color: '#94a3b8' }}>{species.family}</p>
            </div>
          )}
          {hasValue(species.genus) && (
            <div>
              <span style={{ fontWeight: '500', color: '#e2e8f0' }}>Genus:</span>
              <p style={{ color: '#94a3b8' }}>{species.genus}</p>
            </div>
          )}
        </div>
      </div>

      {/* Conservation Status */}
      {hasValue(species.cons_text) && (
        <>
          <div style={separatorStyle} />
          <div style={sectionStyle}>
            <h3 style={{ ...headingStyle, color: '#fb923c' }}>
              <AlertTriangle size={20} />
              Conservation Status
            </h3>
            <div style={{ 
              backgroundColor: 'rgba(251, 146, 60, 0.1)', 
              border: '1px solid rgba(251, 146, 60, 0.3)',
              borderRadius: '8px',
              padding: '16px'
            }}>
              <p style={{ fontSize: '14px', color: '#e2e8f0' }}>
                <strong>Conservation Notes:</strong> {species.cons_text}
              </p>
            </div>
          </div>
        </>
      )}

      {/* Habitat Section */}
      {(hasValue(species.hab_tags) || hasValue(species.hab_desc) || hasValue(species.marine) || hasValue(species.terrestria) || hasValue(species.freshwater)) && (
        <>
          <div style={separatorStyle} />
          <div style={sectionStyle}>
            <h3 style={{ ...headingStyle, color: '#4ade80' }}>
              <MapPin size={20} />
              Habitat
            </h3>
            <div>
              {hasValue(species.hab_tags) && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
                  {species.hab_tags.split(',').map((tag, index) => (
                    <span key={index} style={{ 
                      ...badgeStyle, 
                      backgroundColor: '#475569',
                      color: '#e2e8f0',
                      border: 'none'
                    }}>
                      {tag.trim()}
                    </span>
                  ))}
                </div>
              )}
              {hasValue(species.hab_desc) && (
                <p style={{ fontSize: '14px', color: '#94a3b8', marginBottom: '12px' }}>{species.hab_desc}</p>
              )}
              <div style={{ display: 'flex', gap: '16px', fontSize: '14px' }}>
                {species.marine === 't' && <span style={{ ...badgeStyle, border: '1px solid #64748b', color: '#cbd5e1' }}>Marine</span>}
                {species.terrestria === 't' && <span style={{ ...badgeStyle, border: '1px solid #64748b', color: '#cbd5e1' }}>Terrestrial</span>}
                {species.freshwater === 't' && <span style={{ ...badgeStyle, border: '1px solid #64748b', color: '#cbd5e1' }}>Freshwater</span>}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Geographic Distribution */}
      {hasValue(species.geo_desc) && (
        <>
          <div style={separatorStyle} />
          <div style={sectionStyle}>
            <h3 style={{ ...headingStyle, color: '#3b82f6' }}>
              <Globe size={20} />
              Geographic Distribution
            </h3>
            <p style={{ fontSize: '14px', color: '#94a3b8' }}>{species.geo_desc}</p>
          </div>
        </>
      )}

      {/* Bioregion Information */}
      {(hasValue(species.bioregio_1) || hasValue(species.realm) || hasValue(species.sub_realm) || hasValue(species.biome)) && (
        <>
          <div style={separatorStyle} />
          <div style={sectionStyle}>
            <h3 style={{ ...headingStyle, color: '#10b981' }}>
              <Trees size={20} />
              Ecoregion
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', fontSize: '14px' }}>
              {hasValue(species.bioregio_1) && (
                <div>
                  <span style={{ fontWeight: '500', color: '#e2e8f0' }}>Bioregion:</span>
                  <p style={{ color: '#94a3b8' }}>{species.bioregio_1}</p>
                </div>
              )}
              {hasValue(species.realm) && (
                <div>
                  <span style={{ fontWeight: '500', color: '#e2e8f0' }}>Realm:</span>
                  <p style={{ color: '#94a3b8' }}>{species.realm}</p>
                </div>
              )}
              {hasValue(species.sub_realm) && (
                <div>
                  <span style={{ fontWeight: '500', color: '#e2e8f0' }}>Sub-realm:</span>
                  <p style={{ color: '#94a3b8' }}>{species.sub_realm}</p>
                </div>
              )}
              {hasValue(species.biome) && (
                <div>
                  <span style={{ fontWeight: '500', color: '#e2e8f0' }}>Biome:</span>
                  <p style={{ color: '#94a3b8' }}>{species.biome}</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Physical Characteristics */}
      {(hasValue(species.color_prim) || hasValue(species.color_sec) || hasValue(species.pattern) || hasValue(species.size_min) || hasValue(species.size_max) || hasValue(species.weight_kg) || hasValue(species.shape_desc)) && (
        <>
          <div style={separatorStyle} />
          <div style={sectionStyle}>
            <h3 style={{ ...headingStyle, color: '#ef4444' }}>
              <Palette size={20} />
              Physical Characteristics
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
              <div>
                {hasValue(species.color_prim) && (
                  <div style={{ marginBottom: '12px' }}>
                    <span style={{ fontWeight: '500', fontSize: '14px', color: '#e2e8f0' }}>Primary Color:</span>
                    <p style={{ fontSize: '14px', color: '#94a3b8' }}>{species.color_prim}</p>
                  </div>
                )}
                {hasValue(species.color_sec) && (
                  <div style={{ marginBottom: '12px' }}>
                    <span style={{ fontWeight: '500', fontSize: '14px', color: '#e2e8f0' }}>Secondary Color:</span>
                    <p style={{ fontSize: '14px', color: '#94a3b8' }}>{species.color_sec}</p>
                  </div>
                )}
                {hasValue(species.pattern) && (
                  <div>
                    <span style={{ fontWeight: '500', fontSize: '14px', color: '#e2e8f0' }}>Pattern:</span>
                    <p style={{ fontSize: '14px', color: '#94a3b8' }}>{species.pattern}</p>
                  </div>
                )}
              </div>
              <div>
                {(hasValue(species.size_min) || hasValue(species.size_max)) && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                    <Ruler size={16} color="#64748b" />
                    <span style={{ fontWeight: '500', fontSize: '14px', color: '#e2e8f0' }}>Size Range:</span>
                    <span style={{ fontSize: '14px', color: '#94a3b8' }}>
                      {hasValue(species.size_min) && hasValue(species.size_max) 
                        ? `${species.size_min} - ${species.size_max} cm`
                        : hasValue(species.size_min) ? `${species.size_min} cm` : `${species.size_max} cm`}
                    </span>
                  </div>
                )}
                {hasValue(species.weight_kg) && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                    <Weight size={16} color="#64748b" />
                    <span style={{ fontWeight: '500', fontSize: '14px', color: '#e2e8f0' }}>Weight:</span>
                    <span style={{ fontSize: '14px', color: '#94a3b8' }}>{species.weight_kg} kg</span>
                  </div>
                )}
                {hasValue(species.shape_desc) && (
                  <div>
                    <span style={{ fontWeight: '500', fontSize: '14px', color: '#e2e8f0' }}>Shape:</span>
                    <p style={{ fontSize: '14px', color: '#94a3b8' }}>{species.shape_desc}</p>
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
          <div style={separatorStyle} />
          <div style={sectionStyle}>
            <h3 style={{ ...headingStyle, color: '#fb923c' }}>
              <Leaf size={20} />
              Behavior & Diet
            </h3>
            <div>
              {hasValue(species.diet_type) && (
                <div style={{ marginBottom: '8px' }}>
                  <span style={{ ...badgeStyle, border: '1px solid #64748b', color: '#cbd5e1' }}>{species.diet_type}</span>
                </div>
              )}
              {hasValue(species.diet_prey) && (
                <p style={{ fontSize: '14px', color: '#94a3b8', marginBottom: '8px' }}>
                  <strong style={{ color: '#e2e8f0' }}>Prey:</strong> {species.diet_prey}
                </p>
              )}
              {hasValue(species.diet_flora) && (
                <p style={{ fontSize: '14px', color: '#94a3b8', marginBottom: '8px' }}>
                  <strong style={{ color: '#e2e8f0' }}>Plant Food:</strong> {species.diet_flora}
                </p>
              )}
              {hasValue(species.behav_1) && (
                <p style={{ fontSize: '14px', color: '#94a3b8', marginBottom: '8px' }}>
                  <strong style={{ color: '#e2e8f0' }}>Behavior:</strong> {species.behav_1}
                </p>
              )}
              {hasValue(species.behav_2) && (
                <p style={{ fontSize: '14px', color: '#94a3b8' }}>
                  <strong style={{ color: '#e2e8f0' }}>Additional Behavior:</strong> {species.behav_2}
                </p>
              )}
            </div>
          </div>
        </>
      )}

      {/* Life Cycle */}
      {(hasValue(species.lifespan) || hasValue(species.maturity) || hasValue(species.repro_type) || hasValue(species.clutch_sz) || hasValue(species.life_desc1) || hasValue(species.life_desc2)) && (
        <>
          <div style={separatorStyle} />
          <div style={sectionStyle}>
            <h3 style={{ ...headingStyle, color: '#ec4899' }}>
              <Clock size={20} />
              Life Cycle
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '12px' }}>
              {hasValue(species.lifespan) && (
                <div>
                  <span style={{ fontWeight: '500', fontSize: '14px', color: '#e2e8f0' }}>Lifespan:</span>
                  <p style={{ fontSize: '14px', color: '#94a3b8' }}>{species.lifespan} years</p>
                </div>
              )}
              {hasValue(species.maturity) && (
                <div>
                  <span style={{ fontWeight: '500', fontSize: '14px', color: '#e2e8f0' }}>Sexual Maturity:</span>
                  <p style={{ fontSize: '14px', color: '#94a3b8' }}>{species.maturity}</p>
                </div>
              )}
              {hasValue(species.repro_type) && (
                <div>
                  <span style={{ fontWeight: '500', fontSize: '14px', color: '#e2e8f0' }}>Reproduction:</span>
                  <p style={{ fontSize: '14px', color: '#94a3b8' }}>{species.repro_type}</p>
                </div>
              )}
              {hasValue(species.clutch_sz) && (
                <div>
                  <span style={{ fontWeight: '500', fontSize: '14px', color: '#e2e8f0' }}>Clutch Size:</span>
                  <p style={{ fontSize: '14px', color: '#94a3b8' }}>{species.clutch_sz}</p>
                </div>
              )}
            </div>
            {hasValue(species.life_desc1) && (
              <p style={{ fontSize: '14px', color: '#94a3b8', marginBottom: '8px' }}>{species.life_desc1}</p>
            )}
            {hasValue(species.life_desc2) && (
              <p style={{ fontSize: '14px', color: '#94a3b8' }}>{species.life_desc2}</p>
            )}
          </div>
        </>
      )}

      {/* Threats */}
      {hasValue(species.threats) && (
        <>
          <div style={separatorStyle} />
          <div style={sectionStyle}>
            <h3 style={{ ...headingStyle, color: '#6b7280' }}>
              <AlertTriangle size={20} />
              Threats
            </h3>
            <p style={{ fontSize: '14px', color: '#94a3b8' }}>{species.threats}</p>
          </div>
        </>
      )}

      {/* Key Facts */}
      {(hasValue(species.key_fact1) || hasValue(species.key_fact2) || hasValue(species.key_fact3)) && (
        <>
          <div style={separatorStyle} />
          <div style={sectionStyle}>
            <h3 style={{ ...headingStyle, color: '#fbbf24' }}>
              <Info size={20} />
              Key Facts
            </h3>
            <div>
              {hasValue(species.key_fact1) && (
                <p style={{ fontSize: '14px', color: '#94a3b8', marginBottom: '8px' }}>• {species.key_fact1}</p>
              )}
              {hasValue(species.key_fact2) && (
                <p style={{ fontSize: '14px', color: '#94a3b8', marginBottom: '8px' }}>• {species.key_fact2}</p>
              )}
              {hasValue(species.key_fact3) && (
                <p style={{ fontSize: '14px', color: '#94a3b8' }}>• {species.key_fact3}</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}