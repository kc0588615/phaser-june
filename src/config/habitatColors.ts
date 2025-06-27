// src/config/habitatColors.ts

// Habitat color mapping based on IUCN habitat codes
// Colors are from the official IUCN colormap and should match the TiTiler backend.
export const habitatColorMap: Record<string, string> = {
  // Water
  'Water': '#002de1',
  
  // Forest types
  'Forest': '#0a941c',
  'Forest - Boreal': '#115e4e',
  'Forest - Subarctic': '#07a187',
  'Forest - Subantarctic': '#00fac0',
  'Forest - Temperate': '#27a170',
  'Forest - Subtropical-tropical dry': '#9df941',
  'Forest - Subtropical-tropical moist lowland': '#2af434',
  'Forest - Subtropical-tropical mangrove vegetation': '#a0fecc',
  'Forest - Subtropical-tropical swamp': '#677e2d',
  'Forest - Subtropical-tropical moist montane': '#00c410',
  
  // Savanna
  'Savanna': '#c6ff53',
  'Savanna - Dry': '#f5e936',
  'Savanna - Moist': '#cdff27',
  
  // Shrubland
  'Shrubland': '#eaa03f',
  'Shrubland - Subarctic': '#645800',
  'Shrubland - Subantarctic': '#7b7a60',
  'Shrubland - Boreal': '#84a79b',
  'Shrubland - Temperate': '#9addd4',
  'Shrubland - Subtropical-tropical dry': '#ffe97b',
  'Shrubland - Subtropical-tropical moist': '#f0a625',
  'Shrubland - Subtropical-tropical high altitude': '#ce9bc2',
  'Shrubland - Mediterranean-type': '#7f1dd5',
  
  // Grassland
  'Grassland': '#98fae7',
  'Grassland - Tundra': '#bdeed8',
  'Grassland - Subarctic': '#adc4c0',
  'Grassland - Subantarctic': '#264758',
  'Grassland - Temperate': '#33b988',
  'Grassland - Subtropical-tropical dry': '#fff5cb',
  'Grassland - Subtropical-tropical seasonally wet or flooded': '#89e8f0',
  'Grassland - Subtropical-tropical high altitude': '#facbff',
  
  // Wetlands
  'Wetlands (inland)': '#5bb5ff',
  'Wetlands (inland) - Permanent rivers streams creeks': '#00fafa',
  'Wetlands (inland) - Seasonal/intermittent/irregular rivers/streams/creeks': '#d6a0f9',
  'Wetlands (inland) - Shrub dominated wetlands': '#bf2ae8',
  'Wetlands (inland) - Bogs/marshes/swamps/fens/peatlands': '#314872',
  'Wetlands (inland) - Permanent freshwater lakes': '#0e77d9',
  'Wetlands (inland) - Seasonal/intermittent freshwater lakes (over 8 ha)': '#6e96c4',
  'Wetlands (inland) - Permanent freshwater marshes/pools (under 8 ha)': '#00add8',
  'Wetlands (inland) - Seasonal/intermittent freshwater marshes/pools (under 8 ha)': '#218ed6',
  'Wetlands (inland) - Freshwater springs and oases': '#301f99',
  'Wetlands (inland) - Tundra wetlands': '#a1e6ec',
  'Wetlands (inland) - Alpine wetlands': '#c7e1e4',
  'Wetlands (inland) - Geothermal wetlands': '#f9e9d4',
  'Wetlands (inland) - Permanent inland deltas': '#0025fc',
  'Wetlands (inland) - Permanent saline brackish or alkaline lakes': '#166b95',
  'Wetlands (inland) - Seasonal/intermittent saline brackish or alkaline lakes and flats': '#46a4c0',
  'Wetlands (inland) - Permanent /saline / brackish or alkaline marshes/pools': '#3e71e0',
  'Wetlands (inland) - Seasonal/intermittent /saline / brackish or alkaline marshes/pools': '#9c75d0',
  'Wetlands (inland) / Karst and other subterranean hydrological systems': '#ff01bc',

  // Rocky Areas
  'Rocky Areas': '#a59283',
  
  // Desert
  'Desert': '#fffce1',
  'Desert - Hot': '#ffb701',
  'Desert - Temperate': '#e4e9d4',
  'Desert - Cold': '#daedf5',

  // Marine
  'Marine - Neritic': '#99ddf7',
  'Marine - Neritic Pelagic': '#d1ecf7',
  'Marine - Coral Reefs': '#fd7c6e',
  'Marine - Seagrass (submerged)': '#86a475',
  'Marine - Oceanic': '#1da2d8',
  'Marine - Epipelagic': '#1781ac',
  'Marine - Mesopelagic': '#0e516c',
  'Marine - Bathypelagic': '#083040',
  'Marine - Abyssopelagic': '#021015',
  'Marine - Deep Ocean Floor': '#7fcdff',
  'Marine - Continental Slope/Bathyl zone': '#1199d1',
  'Marine - Abyssal Plain ': '#60bde3',
  'Marine - Abyssal Mountains/Hills ': '#1a91c2',
  'Marine - Hadal/Deep Sea Trench ': '#027495',
  'Marine - Seamounts ': '#6baed6',
  'Marine - Deep Sea Vent ': '#7F00FF',
  'Marine - Intertidal': '#4ce6e6',
  'Marine - Tidepools': '#3212b3',
  'Marine - Mangroves submerged Roots': '#7cd9cc',

  // Artificial/Terrestrial
  'Artificial - Terrestrial': '#d95049',
  'Arable land': '#ffa083',
  'Pastureland': '#ff83ca',
  'Plantations': '#FF0800',
  'Rural Gardens': '#ddcb25',
  'Urban Areas': '#000000',
  'Subtropical/Tropical Heavily Degraded Former Forest': '#ff1601',

  // Unknown
  'Unknown': '#ffffff'
};

/**
 * Gets the official IUCN hex color for a given habitat type.
 * @param habitatType The string label of the habitat.
 * @returns The hex color code as a string. Defaults to white ('#ffffff') if the habitat type is not found.
 */
export function getHabitatColor(habitatType: string): string {
  // The official color for 'Unknown' is white. This serves as a good default.
  return habitatColorMap[habitatType] || '#ffffff';
}