import * as React from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import type { GroupedSpecies, JumpTarget } from "@/types/speciesBrowser";
import type { Species } from "@/types/database";
import { getOrderFromCategory, getCategoryOrderMapping, getCategoryFromOrder, getUniqueGenera, getUniqueFamilies, getUniqueOrders, getFamilyDisplayNameFromSpecies } from "@/utils/ecoregion";
import { searchFamiliesByCommonName, getFamilyCommonName } from "@/config/familyCommonNames";

interface SpeciesSearchInputProps {
  grouped: GroupedSpecies;
  ecoregionList: string[];
  realmList: string[];
  biomeList: string[];
  species: Species[];
  selectedFilter: { type: string; value: string } | null;
  onJump: (target: JumpTarget) => void;
  onClearFilter: () => void;
}

interface SearchOption {
  value: string;
  label: string;
  type: 'category' | 'genus' | 'family' | 'order' | 'ecoregion' | 'realm' | 'biome' | 'species';
  category?: string;
  speciesData?: Species;
}

export function SpeciesSearchInput({
  grouped,
  ecoregionList,
  realmList,
  biomeList,
  species,
  selectedFilter,
  onJump,
  onClearFilter,
}: SpeciesSearchInputProps) {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [showResults, setShowResults] = React.useState(false);
  const [selectedIndex, setSelectedIndex] = React.useState(-1);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const resultsRef = React.useRef<HTMLDivElement>(null);

  // Build searchable options
  const searchOptions = React.useMemo(() => {
    const options: SearchOption[] = [];

    // Add category search options (both singular and plural forms)
    const categoryMapping = getCategoryOrderMapping();
    Object.keys(categoryMapping).forEach(categoryName => {
      options.push({
        value: categoryName,
        label: categoryName,
        type: 'category'
      });
    });

    // Add all unique genus values
    const allGenera = getUniqueGenera(species);
    allGenera.forEach(genus => {
      options.push({
        value: genus,
        label: genus,
        type: 'genus'
      });
    });

    // Add all unique family values with common names
    const allFamilies = getUniqueFamilies(species);
    allFamilies.forEach(family => {
      // Add scientific name option
      options.push({
        value: family,
        label: getFamilyDisplayNameFromSpecies(family),
        type: 'family'
      });
      
      // Add common name option if available
      const commonName = getFamilyCommonName(family);
      if (commonName) {
        options.push({
          value: family,
          label: commonName,
          type: 'family'
        });
      }
    });

    // Add all unique order values
    const allOrders = getUniqueOrders(species);
    allOrders.forEach(order => {
      options.push({
        value: order,
        label: order,
        type: 'order'
      });
    });

    // Add geographic filters
    ecoregionList.forEach(eco => {
      options.push({
        value: `ecoregion:${eco}`,
        label: eco,
        type: 'ecoregion'
      });
    });

    realmList.forEach(realm => {
      options.push({
        value: `realm:${realm}`,
        label: realm,
        type: 'realm'
      });
    });

    biomeList.forEach(biome => {
      options.push({
        value: `biome:${biome}`,
        label: biome,
        type: 'biome'
      });
    });

    // Add individual species
    species.forEach(sp => {
      options.push({
        value: `species:${sp.ogc_fid}`,
        label: sp.comm_name || sp.sci_name || 'Unknown',
        type: 'species',
        speciesData: sp
      });
    });

    return options;
  }, [grouped, ecoregionList, realmList, biomeList, species]);

  // Filter options based on search query
  const filteredOptions = React.useMemo(() => {
    if (!searchQuery.trim()) return [];
    
    const query = searchQuery.toLowerCase();
    let filteredResults = searchOptions
      .filter(option => option.label.toLowerCase().includes(query));
    
    // Also search for families by common name if query doesn't match existing options
    if (filteredResults.length < 5) {
      const familyMatches = searchFamiliesByCommonName(searchQuery);
      familyMatches.forEach(scientificFamily => {
        const commonName = getFamilyCommonName(scientificFamily);
        if (commonName && !filteredResults.some(option => option.value === scientificFamily && option.type === 'family')) {
          filteredResults.push({
            value: scientificFamily,
            label: `${commonName} (${scientificFamily})`,
            type: 'family'
          });
        }
      });
    }
    
    return filteredResults.slice(0, 10); // Limit to 10 results
  }, [searchQuery, searchOptions]);

  // Handle click outside
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        inputRef.current && 
        !inputRef.current.contains(event.target as Node) &&
        resultsRef.current &&
        !resultsRef.current.contains(event.target as Node)
      ) {
        setShowResults(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (option: SearchOption) => {
    setShowResults(false);
    setSearchQuery("");
    setSelectedIndex(-1);

    if (option.type === 'ecoregion') {
      onJump({ type: 'ecoregion', value: option.label });
    } else if (option.type === 'realm') {
      onJump({ type: 'realm', value: option.label });
    } else if (option.type === 'biome') {
      onJump({ type: 'biome', value: option.label });
    } else if (option.type === 'genus') {
      onJump({ type: 'genus', value: option.value });
    } else if (option.type === 'family') {
      onJump({ type: 'family', value: option.value });
    } else if (option.type === 'order') {
      onJump({ type: 'order', value: option.value });
    } else if (option.type === 'species' && option.speciesData) {
      onJump({ type: 'species', value: option.speciesData.ogc_fid.toString() });
    } else if (option.type === 'category') {
      // Convert category to order value for filtering
      const orderValue = getOrderFromCategory(option.value);
      if (orderValue) {
        onJump({ type: 'order', value: orderValue });
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showResults || filteredOptions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < filteredOptions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : filteredOptions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < filteredOptions.length) {
          handleSelect(filteredOptions[selectedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setShowResults(false);
        setSelectedIndex(-1);
        break;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'category': return 'Category';
      case 'genus': return 'Genus';
      case 'family': return 'Family';
      case 'order': return 'Order';
      case 'species': return 'Species';
      case 'ecoregion': return 'Ecoregion';
      case 'realm': return 'Realm';
      case 'biome': return 'Biome';
      default: return type;
    }
  };

  return (
    <div className="w-full space-y-3">
      <div className="relative">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            ref={inputRef}
            type="text"
            placeholder="Search species, family, genus, order, location"
            value={searchQuery}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              setSearchQuery(e.target.value);
              setShowResults(e.target.value.length > 0);
              setSelectedIndex(-1);
            }}
            onFocus={() => {
              if (searchQuery.length > 0) {
                setShowResults(true);
              }
            }}
            onKeyDown={handleKeyDown}
            style={{ paddingLeft: '2rem' }}
            className="w-full pr-2 h-12 bg-slate-800 border-slate-700 text-slate-100 placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-xs"
          />
        </div>

        {/* Search Results Dropdown */}
        {showResults && filteredOptions.length > 0 && (
          <div 
            ref={resultsRef}
            className="absolute z-50 w-full mt-1 bg-slate-800 border border-slate-700 rounded-md shadow-xl max-h-[50vh] sm:max-h-[60vh] overflow-y-auto"
          >
            {filteredOptions.map((option, index) => (
              <div
                key={`${option.type}-${option.value}-${option.label}`}
                className={cn(
                  "px-4 py-3 cursor-pointer transition-colors border-b border-slate-700/50 last:border-0",
                  "hover:bg-slate-700",
                  selectedIndex === index && "bg-slate-700"
                )}
                onClick={() => handleSelect(option)}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-100 truncate flex-1">{option.label}</span>
                  <span className="text-xs text-slate-400 whitespace-nowrap">
                    {getTypeLabel(option.type)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Filter Badge */}
      {selectedFilter && (
        <Badge 
          variant="outline" 
          className="w-fit bg-blue-600/20 border-blue-600/50 text-blue-300"
        >
          <span className="mr-2 capitalize">
            {selectedFilter.type}: {selectedFilter.value}
          </span>
          <X 
            className="h-3 w-3 cursor-pointer hover:text-blue-100 transition-colors"
            onClick={onClearFilter} 
          />
        </Badge>
      )}
    </div>
  );
}