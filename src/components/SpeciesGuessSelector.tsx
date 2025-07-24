import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { EventBus } from '@/game/EventBus';
import { speciesService } from '@/lib/speciesService';

interface SpeciesGuessSelectorProps {
  speciesId: number;
  disabled?: boolean;
  onGuessSubmitted?: (isCorrect: boolean) => void;
  hiddenSpeciesName?: string;
}

export const SpeciesGuessSelector: React.FC<SpeciesGuessSelectorProps> = ({
  speciesId,
  disabled = false,
  onGuessSubmitted,
  hiddenSpeciesName: propHiddenSpeciesName,
}) => {
  const [open, setOpen] = useState(false);
  const [selectedSpecies, setSelectedSpecies] = useState('');
  const [candidateSpecies, setCandidateSpecies] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasGuessed, setHasGuessed] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [hiddenSpeciesName, setHiddenSpeciesName] = useState<string>(propHiddenSpeciesName || '');
  const [guessedSpecies, setGuessedSpecies] = useState<Set<string>>(new Set());
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Update when prop changes
  useEffect(() => {
    if (propHiddenSpeciesName) {
      setHiddenSpeciesName(propHiddenSpeciesName);
    }
  }, [propHiddenSpeciesName]);

  // Listen for the hidden species name from new-game-started event
  useEffect(() => {
    const handleNewGame = (data: any) => {
      if (data.hiddenSpeciesName) {
        setHiddenSpeciesName(data.hiddenSpeciesName);
        // Reset states for new game
        setHasGuessed(false);
        setIsCorrect(false);
        setSelectedSpecies('');
        setSearchTerm('');
        setGuessedSpecies(new Set());
      }
    };

    EventBus.on('new-game-started', handleNewGame);
    return () => {
      EventBus.off('new-game-started', handleNewGame);
    };
  }, []);

  // Load candidate species when we have both speciesId and hiddenSpeciesName
  useEffect(() => {
    if (speciesId > 0 && hiddenSpeciesName) {
      loadCandidateSpecies();
    }
  }, [speciesId, hiddenSpeciesName]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);

  const loadCandidateSpecies = async () => {
    console.log('Loading candidate species, hiddenSpeciesName:', hiddenSpeciesName, 'speciesId:', speciesId);
    setIsLoading(true);
    try {
      // Fetch 9 random species names from the service (we'll add the correct one to make 10)
      const randomSpecies = await speciesService.getRandomSpeciesNames(9, speciesId);
      console.log('Random species from service:', randomSpecies);
      
      // Always include the correct answer
      const allSpecies = [...randomSpecies];
      if (hiddenSpeciesName && hiddenSpeciesName !== 'Unknown Species' && !allSpecies.includes(hiddenSpeciesName)) {
        allSpecies.push(hiddenSpeciesName);
      }
      
      // Shuffle the array so the correct answer isn't always last
      const shuffled = [...new Set(allSpecies)].sort(() => Math.random() - 0.5).slice(0, 10);
      console.log('Final shuffled species list:', shuffled);
      setCandidateSpecies(shuffled);
      setIsLoading(false);
    } catch (error) {
      console.error('Failed to load candidate species:', error);
      // Fallback to hardcoded list
      const fallback = [
        'Green Sea Turtle',
        'Loggerhead Sea Turtle',
        'Hawksbill Sea Turtle',
        'Leatherback Sea Turtle',
        'Olive Ridley Sea Turtle',
        'Kemp\'s Ridley Sea Turtle',
        'Flatback Sea Turtle',
        'Eastern Box Turtle',
        'Painted Turtle',
        'Red-eared Slider',
      ];
      // Make sure hidden species is in fallback list
      if (hiddenSpeciesName && !fallback.includes(hiddenSpeciesName)) {
        fallback[Math.floor(Math.random() * fallback.length)] = hiddenSpeciesName;
      }
      console.log('Using fallback species list:', fallback);
      setCandidateSpecies(fallback);
      setIsLoading(false);
    }
  };

  const handleGuessSubmit = () => {
    if (!selectedSpecies || hasGuessed) return;

    // Add to guessed species
    setGuessedSpecies(prev => new Set(prev).add(selectedSpecies));

    // Check if the guess is correct
    const correct = selectedSpecies.toLowerCase() === hiddenSpeciesName.toLowerCase();
    setIsCorrect(correct);
    
    if (correct) {
      setHasGuessed(true);
    } else {
      // Allow more guesses if incorrect
      setSelectedSpecies('');
    }

    // Emit the guess event with the result
    EventBus.emit('species-guess-submitted', {
      guessedName: selectedSpecies,
      speciesId: speciesId,
      isCorrect: correct,
      actualName: hiddenSpeciesName
    });
    
    if (onGuessSubmitted) {
      onGuessSubmitted(correct);
    }
  };

  const filteredSpecies = candidateSpecies.filter(species =>
    species.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-2">
      <div className="flex gap-2 items-center">
        <div className="relative flex-1" ref={dropdownRef}>
          <button
            onClick={() => setOpen(!open)}
            disabled={disabled || hasGuessed || isLoading}
            className={cn(
              "w-full px-3 py-2 text-left bg-slate-800 border border-slate-600 rounded-md",
              "hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed",
              "flex items-center justify-between"
            )}
          >
            <span className="truncate">
              {selectedSpecies || (hasGuessed ? 'Correct!' : `Select a species... (${10 - guessedSpecies.size} left)`)}
            </span>
            <ChevronDown className="h-4 w-4 opacity-50" />
          </button>
          
          {open && (
            <div className="absolute z-[200000] w-full mt-1 bg-slate-800 border border-slate-600 rounded-md shadow-lg max-h-60 overflow-hidden">
              <div className="p-2 border-b border-slate-700">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search species..."
                  className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded text-sm focus:outline-none focus:border-cyan-500"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
              <div className="max-h-48 overflow-y-auto">
                {isLoading ? (
                  <div className="px-3 py-2 text-sm text-slate-400">Loading species...</div>
                ) : candidateSpecies.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-slate-400">No species loaded. Please wait...</div>
                ) : filteredSpecies.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-slate-400">No species found matching "{searchTerm}"</div>
                ) : (
                  filteredSpecies.map((species) => {
                    const isGuessed = guessedSpecies.has(species);
                    return (
                      <button
                        key={species}
                        onClick={() => {
                          if (!isGuessed) {
                            setSelectedSpecies(species);
                            setOpen(false);
                            setSearchTerm('');
                          }
                        }}
                        disabled={isGuessed}
                        className={cn(
                          "w-full px-3 py-2 text-left text-sm",
                          "flex items-center gap-2",
                          isGuessed ? "opacity-50 cursor-not-allowed bg-slate-900 text-slate-500" : "hover:bg-slate-700",
                          selectedSpecies === species && !isGuessed && "bg-slate-700"
                        )}
                      >
                        {isGuessed ? (
                          <span className="text-red-400">✗</span>
                        ) : selectedSpecies === species ? (
                          <Check className="h-3 w-3 text-cyan-400" />
                        ) : (
                          <span className="w-3"></span>
                        )}
                        <span className={cn(
                          isGuessed && "line-through"
                        )}>
                          {species}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
        
        <Button
          onClick={handleGuessSubmit}
          disabled={!selectedSpecies || hasGuessed || disabled}
          variant={hasGuessed ? (isCorrect ? 'default' : 'secondary') : 'default'}
          className={cn(
            'min-w-[100px]',
            isCorrect && 'bg-green-600 hover:bg-green-700'
          )}
        >
          {hasGuessed ? (isCorrect ? 'Correct!' : 'Submitted') : 'Guess'}
        </Button>
      </div>
      
      {!hasGuessed && guessedSpecies.size > 0 && (
        <p className="text-sm text-amber-400">
          Incorrect. Keep matching gems to reveal more clues!
        </p>
      )}
      
      {hasGuessed && isCorrect && (
        <p className="text-sm text-green-400">
          Correct! You discovered the {hiddenSpeciesName}!
        </p>
      )}
    </div>
  );
};