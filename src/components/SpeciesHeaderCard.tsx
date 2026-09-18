import React from 'react';

interface SpeciesHeaderCardProps {
  speciesName: string;
  speciesId: number;
  currentSpeciesIndex: number;
  totalSpecies: number;
}

export const SpeciesHeaderCard: React.FC<SpeciesHeaderCardProps> = ({
  speciesName,
  speciesId,
  currentSpeciesIndex,
  totalSpecies,
}) => {

  return (
    <div className="bg-slate-800 rounded-lg p-3 space-y-2">
      {/* Species Info Row */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-cyan-300 font-semibold text-lg">
            {speciesName === 'Mystery Species' 
              ? `🔍 Mystery Species #${speciesId}` 
              : (speciesName || 'Select a location to discover species')}
          </h3>
          {totalSpecies > 0 && (
            <p className="text-slate-400 text-sm">
              Species {currentSpeciesIndex} of {totalSpecies}
            </p>
          )}
        </div>
      </div>

    </div>
  );
};
