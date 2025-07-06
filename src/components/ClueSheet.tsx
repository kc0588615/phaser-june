import React from 'react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileText } from 'lucide-react';
import type { CluePayload } from '../game/clueConfig';

interface ClueSheetProps {
  clues: CluePayload[];
  speciesName: string;
  hasSelectedSpecies: boolean;
}

export const ClueSheet: React.FC<ClueSheetProps> = ({ clues, speciesName, hasSelectedSpecies }) => {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="w-full bg-slate-700 hover:bg-slate-600 border-slate-600"
          disabled={!hasSelectedSpecies}
        >
          <FileText className="h-4 w-4 mr-2" />
          Field Notes ({clues.length})
        </Button>
      </SheetTrigger>
      <SheetContent className="bg-slate-900 border-slate-700 text-slate-100">
        <SheetHeader>
          <SheetTitle className="text-cyan-300">Field Notes</SheetTitle>
          <SheetDescription className="text-slate-400">
            {speciesName || 'No species selected'}
          </SheetDescription>
        </SheetHeader>
        <ScrollArea className="h-[calc(100vh-120px)] mt-4">
          {clues.length === 0 ? (
            <p className="text-slate-400 italic">No clues discovered yet.</p>
          ) : (
            <div className="space-y-3">
              {clues.map((clue, index) => (
                <div
                  key={index}
                  className="bg-slate-800 rounded-lg p-4"
                  style={{ borderLeft: `4px solid ${clue.color}` }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">{clue.icon}</span>
                    <h3 className="font-semibold text-cyan-300">{clue.name}</h3>
                  </div>
                  <p className="text-sm text-slate-300">{clue.clue}</p>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};