'use client';

import React, { useMemo } from 'react';
import { useTree } from '@headless-tree/react';
import { syncDataLoaderFeature, selectionFeature, hotkeysCoreFeature } from '@headless-tree/core';
import { groupSpeciesByTaxonomy, getOrderDisplayName, getFamilyDisplayNameFromSpecies } from '@/utils/ecoregion';
import type { Species } from '@/types/database';
import { ChevronRight, ChevronDown, FileText, Folder, FolderOpen } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SpeciesTreeProps {
  species: Species[];
  onFilterSelect: (filter: { type: string; value: string; speciesData?: Species }) => void;
  selectedFilter: { type: string; value: string } | null;
}

interface TreeNode {
  id: string;
  name: string;
  type: 'class' | 'order' | 'family' | 'species';
  children?: string[];
  speciesData?: Species;
}

export function SpeciesTree({ species, onFilterSelect, selectedFilter }: SpeciesTreeProps) {
  
  // Build the tree data structure
  const { treeData, rootItems } = useMemo(() => {
    const data: Record<string, TreeNode> = {};
    const roots: string[] = [];
    
    const grouped = groupSpeciesByTaxonomy(species);
    
    Object.entries(grouped).forEach(([className, orders]) => {
      const classId = `class-${className}`;
      const classChildren: string[] = [];
      
      data[classId] = {
        id: classId,
        name: className,
        type: 'class',
        children: classChildren
      };
      roots.push(classId);
      
      Object.entries(orders).forEach(([orderName, genera]) => {
        const orderId = `order-${orderName}`;
        const orderChildren: string[] = [];
        
        data[orderId] = {
          id: orderId,
          name: getOrderDisplayName(orderName),
          type: 'order',
          children: orderChildren
        };
        classChildren.push(orderId);
        
        Object.entries(genera).forEach(([familyName, speciesList]) => {
          const familyId = `family-${familyName}`;
          const familyChildren: string[] = [];
          
          data[familyId] = {
            id: familyId,
            name: `${getFamilyDisplayNameFromSpecies(familyName)} (${speciesList.length})`,
            type: 'family',
            children: familyChildren
          };
          orderChildren.push(familyId);
          
          speciesList.forEach((sp) => {
            const speciesId = `species-${sp.ogc_fid}`;
            data[speciesId] = {
              id: speciesId,
              name: sp.comm_name || sp.sci_name || 'Unknown',
              type: 'species',
              speciesData: sp
            };
            familyChildren.push(speciesId);
          });
        });
      });
    });
    
    return { treeData: data, rootItems: roots };
  }, [species]);

  const tree = useTree<TreeNode>({
    rootItemId: 'root',
    getItemName: (item) => item.getItemData()?.name || '',
    isItemFolder: (item) => item.getItemData()?.type !== 'species',
    dataLoader: {
      getItem: (itemId) => {
        if (itemId === 'root') {
          return { id: 'root', name: 'Root', type: 'class' as const, children: rootItems };
        }
        return treeData[itemId];
      },
      getChildren: (itemId) => {
        if (itemId === 'root') {
          return rootItems;
        }
        return treeData[itemId]?.children || [];
      },
    },
    features: [syncDataLoaderFeature, selectionFeature, hotkeysCoreFeature],
    initialState: {
      expandedItems: ['root']
    }
  });

  const handleItemClick = (item: any) => {
    const itemData = item.getItemData();
    
    if (itemData?.type === 'species' && itemData.speciesData) {
      // Filter to show just this species
      onFilterSelect({ 
        type: 'species', 
        value: itemData.speciesData.ogc_fid.toString(),
        speciesData: itemData.speciesData
      });
    } else if (itemData?.type === 'family') {
      // Filter by family
      const familyName = itemData.name.split(' (')[0]; // Extract family name without count
      onFilterSelect({ type: 'family', value: familyName });
    } else if (itemData?.type === 'order') {
      // Filter by order
      const orderName = itemData.id.replace('order-', '');
      onFilterSelect({ type: 'order', value: orderName });
    } else if (itemData?.type === 'class') {
      // Filter by class
      const className = itemData.id.replace('class-', '');
      onFilterSelect({ type: 'class', value: className });
    }
    
    // Always toggle folders
    if (item.isFolder()) {
      if (item.isExpanded()) {
        item.collapse();
      } else {
        item.expand();
      }
    }
  };

  return (
    <div className="w-full bg-slate-800/50 rounded-lg border border-slate-700 p-4">
      <div {...tree.getContainerProps()} className="tree">
        {tree.getItems().map((item) => {
          const itemData = item.getItemData();
          const level = item.getItemMeta().level;
          
          // Skip root item
          if (itemData?.id === 'root') return null;
          
          const isFolder = item.isFolder();
          const isExpanded = item.isExpanded();
          const isSelected = item.isSelected();
          
          // Check if this item matches the current filter
          let isFilterMatch = false;
          if (selectedFilter) {
            if (selectedFilter.type === 'species' && itemData?.type === 'species') {
              isFilterMatch = itemData.speciesData?.ogc_fid.toString() === selectedFilter.value;
            } else if (selectedFilter.type === 'family' && itemData?.type === 'family') {
              isFilterMatch = itemData.name.split(' (')[0] === selectedFilter.value;
            } else if (selectedFilter.type === 'order' && itemData?.type === 'order') {
              isFilterMatch = itemData.id.replace('order-', '') === selectedFilter.value;
            } else if (selectedFilter.type === 'class' && itemData?.type === 'class') {
              isFilterMatch = itemData.id.replace('class-', '') === selectedFilter.value;
            }
          }
          
          return (
            <div
              {...item.getProps()}
              key={item.getId()}
              onClick={() => handleItemClick(item)}
              className={cn(
                "flex items-center py-1 px-2 rounded cursor-pointer transition-colors",
                "hover:bg-slate-700/50",
                isSelected && "bg-slate-700/70",
                isFilterMatch && "bg-blue-600/30 hover:bg-blue-600/40",
                itemData?.type === 'species' && "hover:bg-slate-700/70"
              )}
              style={{ paddingLeft: `${(level - 1) * 20 + 8}px` }}
            >
              <span className="mr-2 text-slate-400">
                {isFolder ? (
                  isExpanded ? (
                    itemData?.type === 'class' ? <FolderOpen className="w-4 h-4" /> :
                    itemData?.type === 'order' ? <ChevronDown className="w-4 h-4" /> :
                    <ChevronDown className="w-3 h-3" />
                  ) : (
                    itemData?.type === 'class' ? <Folder className="w-4 h-4" /> :
                    itemData?.type === 'order' ? <ChevronRight className="w-4 h-4" /> :
                    <ChevronRight className="w-3 h-3" />
                  )
                ) : (
                  <FileText className="w-3 h-3" />
                )}
              </span>
              <span className={cn(
                "text-sm",
                itemData?.type === 'class' && "font-semibold text-slate-200",
                itemData?.type === 'order' && "font-medium text-slate-300",
                itemData?.type === 'family' && "text-slate-400",
                itemData?.type === 'species' && "text-slate-300 hover:text-slate-100"
              )}>
                {item.getItemName()}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}