import * as React from "react";
import { Check, ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Command, 
  CommandEmpty, 
  CommandGroup, 
  CommandInput, 
  CommandItem, 
  CommandList 
} from "@/components/ui/command";
import type { GroupedSpecies, JumpTarget } from "@/types/speciesBrowser";

interface CategoryGenusPickerProps {
  grouped: GroupedSpecies;
  ecoregionList: string[];
  realmList: string[];
  biomeList: string[];
  selectedFilter: { type: string; value: string } | null;
  onJump: (target: JumpTarget) => void;
  onClearFilter: () => void;
}

export function CategoryGenusPicker({
  grouped,
  ecoregionList,
  realmList,
  biomeList,
  selectedFilter,
  onJump,
  onClearFilter,
}: CategoryGenusPickerProps) {
  const [open, setOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  // Handle click outside to close dropdown
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  const handleSelect = (currentValue: string) => {
    setOpen(false);

    if (currentValue.startsWith("ecoregion:")) {
      const ecoregion = currentValue.replace("ecoregion:", "");
      onJump({ type: "ecoregion", value: ecoregion });
    } else if (currentValue.startsWith("realm:")) {
      const realm = currentValue.replace("realm:", "");
      onJump({ type: "realm", value: realm });
    } else if (currentValue.startsWith("biome:")) {
      const biome = currentValue.replace("biome:", "");
      onJump({ type: "biome", value: biome });
    } else if (currentValue.includes("-")) {
      const [category, genus] = currentValue.split("-");
      onJump({ type: "genus", value: { category, genus } });
    } else {
      onJump({ type: "category", value: currentValue });
    }
  };

  const getDisplayValue = () => {
    if (selectedFilter) {
      const typeLabel = selectedFilter.type.charAt(0).toUpperCase() + selectedFilter.type.slice(1);
      return `${typeLabel}: ${selectedFilter.value}`;
    }
    return "Select category / genus / ecoregion...";
  };

  return (
    <div className="w-full space-y-3">
      <div className="relative" ref={dropdownRef}>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          onClick={() => setOpen(!open)}
          style={{
            backgroundColor: 'rgba(30, 41, 59, 0.9)',
            border: '1px solid #475569',
            color: '#e2e8f0'
          }}
        >
          {getDisplayValue()}
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
        
        {open && (
          <div 
            className="absolute top-full mt-1 w-full z-50 rounded-md shadow-lg"
            style={{
              backgroundColor: '#1e293b',
              border: '1px solid #475569',
              maxHeight: '400px',
              overflow: 'hidden'
            }}
          >
            <Command>
              <CommandInput 
                placeholder="Search..." 
                style={{ borderBottom: '1px solid #475569' }} 
              />
              <CommandEmpty>No results found.</CommandEmpty>
              <CommandList style={{ maxHeight: '350px', overflow: 'auto' }}>
                {/* Category and Genus Groups */}
                {Object.entries(grouped).map(([category, genera]) => (
                  <CommandGroup key={category} heading={category}>
                    <CommandItem
                      key={category}
                      value={category}
                      onSelect={handleSelect}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          selectedFilter?.type === "category" && 
                          selectedFilter?.value === category
                            ? "opacity-100"
                            : "opacity-0"
                        )}
                      />
                      <span className="font-medium">{category} (all)</span>
                      <span className="ml-auto text-xs text-muted-foreground">
                        {Object.values(genera).flat().length} species
                      </span>
                    </CommandItem>
                    {Object.entries(genera).map(([genus, species]) => (
                      <CommandItem
                        key={`${category}-${genus}`}
                        value={`${category}-${genus}`}
                        onSelect={handleSelect}
                        className="pl-6"
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            selectedFilter?.type === "genus" &&
                            selectedFilter?.value === `${category}-${genus}`
                              ? "opacity-100"
                              : "opacity-0"
                          )}
                        />
                        <span>{genus}</span>
                        <span className="ml-auto text-xs text-muted-foreground">
                          {species.length} species
                        </span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                ))}

                {/* Ecoregions Group */}
                {ecoregionList.length > 0 && (
                  <CommandGroup heading="Ecoregions">
                    {ecoregionList.map((eco) => (
                      <CommandItem
                        key={eco}
                        value={`ecoregion:${eco}`}
                        onSelect={handleSelect}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            selectedFilter?.type === "ecoregion" &&
                            selectedFilter?.value === eco
                              ? "opacity-100"
                              : "opacity-0"
                          )}
                        />
                        <span>{eco}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}

                {/* Realms Group */}
                {realmList.length > 0 && (
                  <CommandGroup heading="Realms">
                    {realmList.map((realm) => (
                      <CommandItem
                        key={realm}
                        value={`realm:${realm}`}
                        onSelect={handleSelect}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            selectedFilter?.type === "realm" &&
                            selectedFilter?.value === realm
                              ? "opacity-100"
                              : "opacity-0"
                          )}
                        />
                        <span>{realm}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}

                {/* Biomes Group */}
                {biomeList.length > 0 && (
                  <CommandGroup heading="Biomes">
                    {biomeList.map((biome) => (
                      <CommandItem
                        key={biome}
                        value={`biome:${biome}`}
                        onSelect={handleSelect}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            selectedFilter?.type === "biome" &&
                            selectedFilter?.value === biome
                              ? "opacity-100"
                              : "opacity-0"
                          )}
                        />
                        <span>{biome}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
              </CommandList>
            </Command>
          </div>
        )}
      </div>

      {/* Filter Badge */}
      {selectedFilter && (
        <Badge 
          variant="outline" 
          className="w-fit"
          style={{
            backgroundColor: 'rgba(30, 41, 59, 0.9)',
            border: '1px solid #475569',
            color: '#e2e8f0'
          }}
        >
          <span className="mr-2">Filtered by: {selectedFilter.value}</span>
          <X 
            className="h-3 w-3 cursor-pointer" 
            style={{ color: '#ef4444' }}
            onClick={onClearFilter} 
          />
        </Badge>
      )}
    </div>
  );
}