import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CLUE_CONFIG, GemCategory } from '../game/clueConfig';

interface GemLegendDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const GemLegendDialog: React.FC<GemLegendDialogProps> = ({ open, onOpenChange }) => {
  const legendItemStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '12px',
    padding: '8px',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: '4px'
  };

  const gemIconStyle: React.CSSProperties = {
    width: '32px',
    height: '32px',
    marginRight: '12px',
    imageRendering: 'pixelated'
  };

  const textStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px'
  };

  const categoryStyle: React.CSSProperties = {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#4a90e2'
  };


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto bg-black border-gray-700" style={{ backgroundColor: '#000000' }}>
        <DialogHeader>
          <DialogTitle>Gem Legend</DialogTitle>
          <DialogDescription>
            Match 3 or more gems to reveal clues about the species
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4">
          {Object.entries(CLUE_CONFIG).map(([categoryId, config]) => {
            const category = parseInt(categoryId) as GemCategory;
            return (
              <div key={category} style={legendItemStyle}>
                <img
                  src={`/assets/${config.color}_gem_0.png`}
                  alt={`${config.categoryName} gem`}
                  style={gemIconStyle}
                />
                <div style={textStyle}>
                  <div style={categoryStyle}>
                    {config.icon} {config.categoryName}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
};