import React, { useState } from "react";
import { Check, ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  
  // Debug logging
  React.useEffect(() => {
    console.log('CategoryGenusPicker mounted', {
      groupedKeys: Object.keys(grouped),
      ecoregionCount: ecoregionList.length,
      realmCount: realmList.length,
      biomeCount: biomeList.length
    });
  }, [grouped, ecoregionList, realmList, biomeList]);

  const handleSelect = (selectedValue: string) => {
    setValue(selectedValue === value ? "" : selectedValue);
    setOpen(false);

    if (selectedValue.startsWith("ecoregion:")) {
      const ecoregion = selectedValue.replace("ecoregion:", "");
      onJump({ type: "ecoregion", value: ecoregion });
    } else if (selectedValue.startsWith("realm:")) {
      const realm = selectedValue.replace("realm:", "");
      onJump({ type: "realm", value: realm });
    } else if (selectedValue.startsWith("biome:")) {
      const biome = selectedValue.replace("biome:", "");
      onJump({ type: "biome", value: biome });
    } else if (selectedValue.includes("-")) {
      const [category, genus] = selectedValue.split("-");
      onJump({ type: "genus", value: { category, genus } });
    } else {
      onJump({ type: "category", value: selectedValue });
    }
  };

  const getDisplayValue = () => {
    if (selectedFilter) {
      const typeLabel = selectedFilter.type.charAt(0).toUpperCase() + selectedFilter.type.slice(1);
      return `${typeLabel}: ${selectedFilter.value}`;
    }
    if (value) {
      if (Object.entries(grouped).some(([category]) => category === value)) {
        return `${value} (all)`;
      }
      if (value.includes("-")) {
        return value.split("-").join(" - ");
      }
      return value;
    }
    return "Select category / genus / ecoregion...";
  };

  return (
    <div className="space-y-3">
      <Popover open={open} onOpenChange={(newOpen) => {
        console.log('Popover state change:', newOpen);
        setOpen(newOpen);
      }}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
            style={{
              backgroundColor: 'rgba(30, 41, 59, 0.9)',
              border: '1px solid #475569',
              color: '#e2e8f0'
            }}
          >
            <span className="truncate">{getDisplayValue()}</span>
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent 
          className="w-[400px] p-0" 
          align="start" 
          style={{ 
            maxHeight: '400px', 
            overflow: 'auto',
            backgroundColor: '#1e293b',
            border: '1px solid #475569',
            zIndex: 9999
          }}
        >
          <Command>
            <CommandInput 
              placeholder="Search categories, genera, and ecoregions..." 
              style={{ borderBottom: '1px solid #475569' }}
            />
            <CommandList style={{ maxHeight: '350px', overflow: 'auto' }}>
              <CommandEmpty>No results found.</CommandEmpty>

              {/* Category and Genus Groups */}
              {Object.entries(grouped).map(([category, genera]) => (
                <CommandGroup key={category} heading={category}>
                  <CommandItem value={category} onSelect={() => handleSelect(category)}>
                    <Check className={cn("mr-2 h-4 w-4", value === category ? "opacity-100" : "opacity-0")} />
                    <span className="font-medium">{category} (all)</span>
                    <span className="ml-auto text-xs text-muted-foreground">
                      {Object.values(genera).flat().length} species
                    </span>
                  </CommandItem>
                  {Object.entries(genera).map(([genus, species]) => (
                    <CommandItem
                      key={`${category}-${genus}`}
                      value={`${category}-${genus}`}
                      onSelect={() => handleSelect(`${category}-${genus}`)}
                      className="pl-6"
                    >
                      <Check
                        className={cn("mr-2 h-4 w-4", value === `${category}-${genus}` ? "opacity-100" : "opacity-0")}
                      />
                      <span>{genus}</span>
                      <span className="ml-auto text-xs text-muted-foreground">{species.length} species</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              ))}

              {/* Ecoregions Group */}
              {ecoregionList.length > 0 && (
                <CommandGroup heading="Ecoregions">
                  {ecoregionList.map((eco) => (
                    <CommandItem key={eco} value={`ecoregion:${eco}`} onSelect={() => handleSelect(`ecoregion:${eco}`)}>
                      <Check className={cn("mr-2 h-4 w-4", selectedFilter?.type === "ecoregion" && selectedFilter?.value === eco ? "opacity-100" : "opacity-0")} />
                      <span>{eco}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              {/* Realms Group */}
              {realmList.length > 0 && (
                <CommandGroup heading="Realms">
                  {realmList.map((realm) => (
                    <CommandItem key={realm} value={`realm:${realm}`} onSelect={() => handleSelect(`realm:${realm}`)}>
                      <Check className={cn("mr-2 h-4 w-4", selectedFilter?.type === "realm" && selectedFilter?.value === realm ? "opacity-100" : "opacity-0")} />
                      <span>{realm}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              {/* Biomes Group */}
              {biomeList.length > 0 && (
                <CommandGroup heading="Biomes">
                  {biomeList.map((biome) => (
                    <CommandItem key={biome} value={`biome:${biome}`} onSelect={() => handleSelect(`biome:${biome}`)}>
                      <Check className={cn("mr-2 h-4 w-4", selectedFilter?.type === "biome" && selectedFilter?.value === biome ? "opacity-100" : "opacity-0")} />
                      <span>{biome}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

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