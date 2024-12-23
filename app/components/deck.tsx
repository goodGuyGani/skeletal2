import React from 'react';
import { Button } from "@/components/ui/button"

interface DeckProps {
  cardsLeft: number;
  onDraw: () => void;
  disabled: boolean;
}

export function Deck({ cardsLeft, onDraw, disabled }: DeckProps) {
  return (
    <Button 
      className="w-16 h-24 bg-blue-500 border border-blue-700 rounded-lg shadow-md flex items-center justify-center"
      onClick={onDraw}
      disabled={disabled}
    >
      <span className="text-white font-bold">{cardsLeft}</span>
    </Button>
  );
}

