'use client'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Globe, ArrowLeft, Shield, AlertTriangle, MapPin, Dna, Leaf, Clock } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { Species } from '@/types/database'
import { iucnBadgeClasses, iucnLabel } from '@/lib/iucn'
import '../styles/category-heading.css'

interface SpeciesDetailsProps {
  species: Species
  onBack: () => void
}

const sections = [
  { id: 'overview', label: 'Overview', icon: <Globe className="w-4 h-4" /> },
  { id: 'family', label: 'Family Tree', icon: <Shield className="w-4 h-4" /> },
  { id: 'risk', label: 'At Risk?', icon: <AlertTriangle className="w-4 h-4" /> },
  { id: 'habitat', label: 'Where It Lives', icon: <MapPin className="w-4 h-4" /> },
  { id: 'looks', label: 'What It Looks Like', icon: <Dna className="w-4 h-4" /> },
  { id: 'behavior', label: 'Habits & Food', icon: <Leaf className="w-4 h-4" /> },
  { id: 'life', label: 'Growing Up', icon: <Clock className="w-4 h-4" /> },
]

export function SpeciesDetailsImproved({ species, onBack }: SpeciesDetailsProps) {
  const [activeSection, setActiveSection] = useState('overview')
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({})
  const headerRef = useRef<HTMLDivElement | null>(null)
  const offset = useRef(80) // fallback

  // Category header classes with colors and emojis
  const getCategoryHeader = (emoji: string, color: string, text: string) => (
    <h4 className={`category-title ${color} mb-3`}>
      <span>{emoji}</span>
      {text}
    </h4>
  );

  // Measure header height to compute sticky/scroll offset (accounts for safe-area)
  useEffect(() => {
    const measure = () => {
      const h = headerRef.current?.getBoundingClientRect().height ?? 80
      offset.current = Math.round(h)
      document.documentElement.style.setProperty('--sticky-offset', `${offset.current}px`)
    }
    measure()
    const ro = new ResizeObserver(measure)
    if (headerRef.current) ro.observe(headerRef.current)
    window.addEventListener('orientationchange', measure)
    return () => {
      ro.disconnect()
      window.removeEventListener('orientationchange', measure)
    }
  }, [])

  // Observe which section is in view
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
        if (visible?.target?.id) setActiveSection(visible.target.id)
      },
      {
        rootMargin: `-${offset.current + 8}px 0px -60% 0px`,
        threshold: [0.15, 0.4, 0.6],
      }
    )
    const els = Object.values(sectionRefs.current).filter(Boolean) as HTMLElement[]
    els.forEach((el) => obs.observe(el))
    return () => obs.disconnect()
  }, [])

  const scrollToSection = (id: string) => {
    const el = sectionRefs.current[id]
    if (!el) return
    const top = el.getBoundingClientRect().top + window.scrollY - offset.current
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    window.scrollTo({ top, behavior: reduceMotion ? 'auto' : 'smooth' })
    try { navigator.vibrate?.(8) } catch {}
  }

  // Helper function to check if a value exists and is not null/NULL
  const hasValue = (value: any) => value && value !== 'NULL' && value !== 'null'

  // Compute family tree clues count
  const familyClues = useMemo(() => {
    const taxonomy = [species.kingdom, species.phylum, species.class, species.order_, species.family, species.genus].filter(hasValue)
    return taxonomy.length
  }, [species])

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Fixed Header */}
      <div ref={headerRef} className="sticky top-[env(safe-area-inset-top)] z-50 bg-slate-950/95 backdrop-blur border-b border-slate-800">
        <div className="flex items-center gap-3 p-4">
          <Button variant="ghost" size="sm" onClick={onBack} className="text-white hover:bg-slate-800">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold truncate">{species.comm_name || species.sci_name}</h1>
            <p className="text-sm text-slate-400 truncate italic">{species.sci_name}</p>
          </div>
        </div>

        {/* Sticky Navigation Chips */}
        <nav aria-label="Section navigation" className="flex gap-2 px-4 pb-3 overflow-x-auto scrollbar-hide">
          {sections.map((s, idx) => {
            const isActive = activeSection === s.id
            return (
              <button
                key={s.id}
                onClick={() => scrollToSection(s.id)}
                aria-current={isActive ? 'true' : undefined}
                aria-controls={s.id}
                className={`inline-flex items-center gap-2 h-11 px-4 rounded-full text-sm font-medium whitespace-nowrap transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${
                  isActive ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
                    e.preventDefault()
                    const dir = e.key === 'ArrowRight' ? 1 : -1
                    const next = (idx + dir + sections.length) % sections.length
                    scrollToSection(sections[next].id)
                  }
                }}
              >
                {s.icon}
                {s.label}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Content */}
      <div className="p-4 space-y-6">
        {/* Overview */}
        <section id="overview" ref={(el) => { sectionRefs.current.overview = el }} className="scroll-mt-[var(--sticky-offset,80px)]">
          <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              {hasValue(species.cons_code) && (
                <Badge className={`${iucnBadgeClasses(species.cons_code!)} font-medium`}>
                  {species.cons_code} - {iucnLabel(species.cons_code!)}
                </Badge>
              )}
              {hasValue(species.bioregio_1) && (
                <Badge variant="outline" className="text-slate-300 border-slate-600">
                  {species.bioregio_1}
                </Badge>
              )}
            </div>
            {hasValue(species.http_iucn) && (
              <Button asChild variant="ghost" size="sm" className="text-slate-300 hover:text-white">
                <Link
                  href={species.http_iucn!}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Open IUCN page in a new tab"
                >
                  <Globe className="w-4 h-4 mr-1" />
                  IUCN Page
                </Link>
              </Button>
            )}
          </div>
        </section>

        {/* Family Tree */}
        <section id="family" ref={(el) => { sectionRefs.current.family = el }} className="scroll-mt-[var(--sticky-offset,80px)]">
          <div className="bg-slate-900 rounded-xl p-4">
            {getCategoryHeader('🧬', 'red', 'Taxonomy')}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              {hasValue(species.kingdom) && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Kingdom:</span>
                  <span className="text-white font-medium">{species.kingdom}</span>
                </div>
              )}
              {hasValue(species.phylum) && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Phylum:</span>
                  <span className="text-white font-medium">{species.phylum}</span>
                </div>
              )}
              {hasValue(species.class) && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Class:</span>
                  <span className="text-white font-medium">{species.class}</span>
                </div>
              )}
              {hasValue(species.order_) && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Order:</span>
                  <span className="text-white font-medium">{species.order_}</span>
                </div>
              )}
              {hasValue(species.family) && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Family:</span>
                  <span className="text-white font-medium">{species.family}</span>
                </div>
              )}
              {hasValue(species.genus) && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Genus:</span>
                  <span className="text-white font-medium">{species.genus}</span>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* At Risk */}
        <section id="risk" ref={(el) => { sectionRefs.current.risk = el }} className="scroll-mt-[var(--sticky-offset,80px)]">
          <div className="bg-slate-900 rounded-xl p-4">
            {getCategoryHeader('🛡️', 'white', 'Conservation Status')}
            {hasValue(species.cons_text) && (
              <p className="text-sm text-slate-300 leading-relaxed line-clamp-4">
                {species.cons_text}
              </p>
            )}
            {hasValue(species.threats) && (
              <div className="mt-3">
                {getCategoryHeader('🛡️', 'white', 'Threats')}
                <p className="text-sm text-slate-300 leading-relaxed line-clamp-3">
                  {species.threats}
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Where It Lives */}
        <section id="habitat" ref={(el) => { sectionRefs.current.habitat = el }} className="scroll-mt-[var(--sticky-offset,80px)]">
          <div className="bg-slate-900 rounded-xl p-4">
            {getCategoryHeader('🗺️', 'blue', 'Habitat')}
            {hasValue(species.hab_desc) && (
              <p className="text-sm text-slate-300 leading-relaxed line-clamp-4 mb-3">
                {species.hab_desc}
              </p>
            )}
            {hasValue(species.geo_desc) && (
              <div className="mb-3">
                {getCategoryHeader('🗺️', 'blue', 'Geographic Range')}
                <p className="text-sm text-slate-300 leading-relaxed line-clamp-3">
                  {species.geo_desc}
                </p>
              </div>
            )}
            <div className="flex gap-2 flex-wrap">
              {species.marine && <Badge variant="outline" className="text-blue-300 border-blue-600">Marine</Badge>}
              {species.terrestria && <Badge variant="outline" className="text-green-300 border-green-600">Terrestrial</Badge>}
              {species.freshwater && <Badge variant="outline" className="text-cyan-300 border-cyan-600">Freshwater</Badge>}
            </div>
          </div>
        </section>

        {/* What It Looks Like */}
        <section id="looks" ref={(el) => { sectionRefs.current.looks = el }} className="scroll-mt-[var(--sticky-offset,80px)]">
          <div className="bg-slate-900 rounded-xl p-4">
            {getCategoryHeader('🐾', 'orange', 'Physical Characteristics')}
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                {hasValue(species.color_prim) && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Primary Color:</span>
                    <span className="text-white font-medium">{species.color_prim}</span>
                  </div>
                )}
                {hasValue(species.color_sec) && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Secondary Color:</span>
                    <span className="text-white font-medium">{species.color_sec}</span>
                  </div>
                )}
                {hasValue(species.pattern) && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Pattern:</span>
                    <span className="text-white font-medium">{species.pattern}</span>
                  </div>
                )}
                {(hasValue(species.size_min) || hasValue(species.size_max)) && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Size Range:</span>
                    <span className="text-white font-medium">
                      {hasValue(species.size_min) && hasValue(species.size_max) 
                        ? `${species.size_min} - ${species.size_max} cm`
                        : hasValue(species.size_min) ? `${species.size_min} cm` : `${species.size_max} cm`}
                    </span>
                  </div>
                )}
                {hasValue(species.weight_kg) && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Weight:</span>
                    <span className="text-white font-medium">{species.weight_kg} kg</span>
                  </div>
                )}
              </div>
              {hasValue(species.shape_desc) && (
                <div>
                  {getCategoryHeader('🐾', 'orange', 'Shape & Form')}
                  <p className="text-sm text-slate-300 leading-relaxed line-clamp-3">
                    {species.shape_desc}
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Habits & Food */}
        <section id="behavior" ref={(el) => { sectionRefs.current.behavior = el }} className="scroll-mt-[var(--sticky-offset,80px)]">
          <div className="bg-slate-900 rounded-xl p-4">
            {getCategoryHeader('💨', 'yellow', 'Behavior & Diet')}
            <div className="space-y-3">
              {hasValue(species.diet_type) && (
                <div>
                  <Badge variant="outline" className="text-orange-300 border-orange-600 mb-2">
                    {species.diet_type}
                  </Badge>
                </div>
              )}
              {hasValue(species.diet_prey) && (
                <div>
                  {getCategoryHeader('💨', 'yellow', 'Prey')}
                  <div className="flex gap-1 flex-wrap">
                    {species.diet_prey!.split(/[,;]/).map((item, index) => (
                      <Badge key={index} variant="outline" className="text-red-300 border-red-600 text-xs">
                        {item.trim()}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {hasValue(species.diet_flora) && (
                <div>
                  {getCategoryHeader('💨', 'yellow', 'Plant Food')}
                  <div className="flex gap-1 flex-wrap">
                    {species.diet_flora!.split(/[,;]/).map((item, index) => (
                      <Badge key={index} variant="outline" className="text-green-300 border-green-600 text-xs">
                        {item.trim()}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {hasValue(species.behav_1) && (
                <div>
                  {getCategoryHeader('💨', 'yellow', 'Behavior')}
                  <p className="text-sm text-slate-300 leading-relaxed line-clamp-4">
                    {species.behav_1}
                  </p>
                </div>
              )}
              {hasValue(species.behav_2) && (
                <div>
                  {getCategoryHeader('💨', 'yellow', 'Additional Behavior')}
                  <p className="text-sm text-slate-300 leading-relaxed line-clamp-4">
                    {species.behav_2}
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Growing Up */}
        <section id="life" ref={(el) => { sectionRefs.current.life = el }} className="scroll-mt-[var(--sticky-offset,80px)]">
          <div className="bg-slate-900 rounded-xl p-4">
            {getCategoryHeader('⏳', 'black', 'Life Cycle')}
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                {hasValue(species.lifespan) && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Lifespan:</span>
                    <span className="text-white font-medium">{species.lifespan} years</span>
                  </div>
                )}
                {hasValue(species.maturity) && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Sexual Maturity:</span>
                    <span className="text-white font-medium">{species.maturity}</span>
                  </div>
                )}
                {hasValue(species.repro_type) && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Reproduction:</span>
                    <span className="text-white font-medium">{species.repro_type}</span>
                  </div>
                )}
                {hasValue(species.clutch_sz) && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Clutch Size:</span>
                    <span className="text-white font-medium">{species.clutch_sz}</span>
                  </div>
                )}
              </div>
              {hasValue(species.life_desc1) && (
                <div>
                  {getCategoryHeader('⏳', 'black', 'Life Cycle Details')}
                  <p className="text-sm text-slate-300 leading-relaxed line-clamp-4">
                    {species.life_desc1}
                  </p>
                </div>
              )}
              {hasValue(species.life_desc2) && (
                <div>
                  {getCategoryHeader('⏳', 'black', 'Additional Life Info')}
                  <p className="text-sm text-slate-300 leading-relaxed line-clamp-4">
                    {species.life_desc2}
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Key Facts */}
        {(hasValue(species.key_fact1) || hasValue(species.key_fact2) || hasValue(species.key_fact3)) && (
          <section className="bg-slate-900 rounded-xl p-4">
            {getCategoryHeader('🔮', 'purple', 'Key Facts')}
            <div className="space-y-2">
              {hasValue(species.key_fact1) && (
                <p className="text-sm text-slate-300 leading-relaxed">
                  • {species.key_fact1}
                </p>
              )}
              {hasValue(species.key_fact2) && (
                <p className="text-sm text-slate-300 leading-relaxed">
                  • {species.key_fact2}
                </p>
              )}
              {hasValue(species.key_fact3) && (
                <p className="text-sm text-slate-300 leading-relaxed">
                  • {species.key_fact3}
                </p>
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}