// Habitat color mapping based on IUCN habitat codes
// Colors should match the TiTiler backend colormap
export const habitatColorMap: Record<string, string> = {
  // Water
  'Water': '#002DE1',
  
  // Forest types - Green shades
  'Forest': '#0A941C',
  'Forest - Boreal': '#115E4E',
  'Forest - Subarctic': '#146E3E',
  'Forest - Subantarctic': '#176E4E',
  'Forest - Temperate': '#98FAE7',
  'Forest - Subtropical-tropical dry': '#1A8E3E',
  'Forest - Subtropical-tropical moist lowland': '#1D9E2E',
  'Forest - Subtropical-tropical mangrove vegetation': '#20AE3E',
  'Forest - Subtropical-tropical swamp': '#23BE2E',
  'Forest - Subtropical-tropical moist montane': '#26CE3E',
  
  // Savanna - Yellow/Light green
  'Savanna': '#C6FF53',
  'Savanna - Dry': '#D6FF63',
  'Savanna - Moist': '#E6FF73',
  
  // Shrubland - Brown/Orange shades
  'Shrubland': '#7B7A60',
  'Shrubland - Subarctic': '#8B8A70',
  'Shrubland - Subantarctic': '#9B9A80',
  'Shrubland - Boreal': '#6B6A50',
  'Shrubland - Temperate': '#7B7A60',
  'Shrubland - Subtropical-tropical dry': '#8B8A70',
  'Shrubland - Subtropical-tropical moist': '#9B9A80',
  'Shrubland - Subtropical-tropical high altitude': '#ABAA90',
  'Shrubland - Mediterranean-type': '#BBBAA0',
  
  // Grassland - Light blue/Cyan shades
  'Grassland': '#5BB5FF',
  'Grassland - Tundra': '#4BA5EF',
  'Grassland - Subarctic': '#3B95DF',
  'Grassland - Subantarctic': '#2B85CF',
  'Grassland - Temperate': '#5BB5FF',
  'Grassland - Subtropical-tropical dry': '#6BC5FF',
  'Grassland - Subtropical-tropical seasonally wet or flooded': '#7BD5FF',
  'Grassland - Subtropical-tropical high altitude': '#8BE5FF',
  
  // Wetlands - Darker blue shades
  'Wetlands (inland)': '#EA9F3F',
  'Wetlands (inland) - Permanent rivers streams creeks': '#EA9F3F',
  'Wetlands (inland) - Seasonal/intermittent/irregular rivers/streams/creeks': '#DAAF4F',
  'Wetlands (inland) - Shrub dominated wetlands': '#CABF5F',
  'Wetlands (inland) - Bogs/marshes/swamps/fens/peatlands': '#BACF6F',
  'Wetlands (inland) - Permanent freshwater lakes': '#AADF7F',
  'Wetlands (inland) - Seasonal/intermittent freshwater lakes (over 8 ha)': '#9AEF8F',
  'Wetlands (inland) - Permanent freshwater marshes/pools (under 8 ha)': '#8AFF9F',
  'Wetlands (inland) - Seasonal/intermittent freshwater marshes/pools (under 8 ha)': '#7AFFAF',
  'Wetlands (inland) - Freshwater springs and oases': '#6AFFBF',
  'Wetlands (inland) - Tundra wetlands': '#5AFFCF',
  'Wetlands (inland) - Alpine wetlands': '#4AFFDF',
  'Wetlands (inland) - Geothermal wetlands': '#3AFFEF',
  'Wetlands (inland) - Permanent inland deltas': '#645800',
  'Wetlands (inland) - Permanent saline brackish or alkaline lakes': '#2AFFFF',
  'Wetlands (inland) - Seasonal/intermittent saline brackish or alkaline lakes and flats': '#1AEFFF',
  'Wetlands (inland) - Permanent /saline / brackish or alkaline marshes/pools': '#0ADFFF',
  'Wetlands (inland) - Seasonal/intermittent /saline / brackish or alkaline marshes/pools': '#00CFFF',
  'Wetlands (inland) / Karst and other subterranean hydrological systems': '#00BFFF',
  
  // Rocky Areas - Gray
  'Rocky Areas': '#7B7A60',
  
  // Desert - Orange/Yellow shades
  'Desert': '#F0A625',
  'Desert - Hot': '#FFB635',
  'Desert - Temperate': '#FFC645',
  'Desert - Cold': '#FFD655',
  
  // Marine - Blue shades
  'Marine - Neritic': '#C6FF53',
  'Marine - Neritic Pelagic': '#B6EF43',
  'Marine - Coral Reefs': '#A6DF33',
  'Marine - Seagrass (submerged)': '#96CF23',
  'Marine - Oceanic': '#F5E936',
  'Marine - Epipelagic': '#E5D926',
  'Marine - Mesopelagic': '#D5C916',
  'Marine - Bathypelagic': '#C5B906',
  'Marine - Abyssopelagic': '#B5A900',
  'Marine - Deep Ocean Floor': '#A59900',
  'Marine - Continental Slope/Bathyl zone': '#958900',
  'Marine - Abyssal Plain': '#857900',
  'Marine - Abyssal Mountains/Hills': '#756900',
  'Marine - Hadal/Deep Sea Trench': '#655900',
  'Marine - Seamounts': '#554900',
  'Marine - Deep Sea Vent': '#453900',
  'Marine - Intertidal': '#352900',
  'Marine - Tidepools': '#251900',
  'Marine - Mangroves submerged Roots': '#150900',
  
  // Artificial/Agricultural - Purple/Pink shades
  'Artificial - Terrestrial': '#CE9BC2',
  'Arable land': '#F0A625',
  'Pastureland': '#CE9BC2',
  'Plantations': '#7F1DD5',
  'Rural Gardens': '#8F2DE5',
  'Urban Areas': '#0A941C',
  'Subtropical/Tropical Heavily Degraded Former Forest': '#9F3DF5',
  
  // Unknown - Gray
  'Unknown': '#808080'
};

// Function to get color for a habitat type
export function getHabitatColor(habitatType: string): string {
  return habitatColorMap[habitatType] || '#808080'; // Default to gray if not found
}