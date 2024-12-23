import React from 'react';
import { Card as CardType } from '../utils/card-utils';
import { Cards } from './card';
import { Button } from "@/components/ui/button"

interface DiscardPileProps {
  topCard: CardType | null;
  onDraw: () => void;
  disabled: boolean;
  canDraw: boolean;
}

export function DiscardPile({ topCard, onDraw, disabled, canDraw }: DiscardPileProps) {
  if (!topCard) {
    return (
      <Button 
        className="w-16 h-24 bg-gray-300 border border-gray-400 rounded-lg shadow-md flex items-center justify-center"
        disabled={true}
      >
        Empty
      </Button>
    );
  }

  return (
    <Button 
      className={`p-0 bg-transparent hover:bg-transparent ${!canDraw ? 'opacity-50 cursor-not-allowed' : ''}`}
      onClick={onDraw}
      disabled={disabled || !canDraw}
    >
      <Cards card={topCard} />
    </Button>
  );
}

