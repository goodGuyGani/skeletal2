import React from "react";
import { Card as CardType } from "../utils/card-utils";
import { Cards } from "./card";
import { motion } from "framer-motion";

interface PlayerHandProps {
  hand: CardType[];
  onCardClick: (index: number) => void;
  selectedIndices: number[];
  isCurrentPlayer: boolean;
}

export function PlayerHand({
  hand,
  onCardClick,
  selectedIndices,
  isCurrentPlayer,
}: PlayerHandProps) {
  return (
    <div
      className={`flex flex-wrap justify-center gap-4 p-4 rounded-lg ${
        isCurrentPlayer ? "bg-gray-200 shadow-lg" : "bg-gray-100 opacity-50"
      }`}
    >
      {hand.map((card, index) => (
        <motion.div
          key={`${card.suit}-${card.rank}-${index}`}
          layout
          initial={false}
          animate={{
            y: selectedIndices.includes(index) ? -16 : 0,
          }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
        >
          <Cards
            card={card}
            onClick={() => isCurrentPlayer && onCardClick(index)}
          />
        </motion.div>
      ))}
    </div>
  );
}

