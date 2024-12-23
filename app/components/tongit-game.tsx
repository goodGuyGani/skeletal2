'use client'

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useTongitGame } from '../hooks/use-tongit-game';
import { PlayerHand } from "./player-hand";
import { Deck } from "./deck";
import { DiscardPile } from "./discard-pile";
import { GameBoard } from "./game-board";
import { ActivityLog } from "./activity-log";
import { MeldedCards } from "./melded-cards";
import { motion, AnimatePresence } from 'framer-motion';
import { isValidMeld } from '../utils/card-utils';
import { Cards } from './card';

export function TongitGame() {
  const [gameMode, setGameMode] = useState<'bot' | 'multiplayer' | null>(null);
  const [selectedSapawTarget, setSelectedSapawTarget] = useState<{ playerIndex: number; meldIndex: number } | null>(null);
  const { 
    gameState, 
    gameActions,
    drawCard, 
    discardCard, 
    meldCards, 
    sapaw, 
    checkTongits, 
    updateSelectedCardIndices,
    botTurn,
    isProcessingBotTurn,
    isDeckEmpty,
    callDraw
  } = useTongitGame(gameMode);
  const [sapawTarget, setSapawTarget] = useState<{ playerIndex: number; meldIndex: number } | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('');

  const handleCardClick = useCallback((index: number) => {
    if (gameState && !gameState.gameEnded && gameState.currentPlayerIndex === 0) {
      const newSelectedIndices = gameState.selectedCardIndices.includes(index)
        ? gameState.selectedCardIndices.filter(i => i !== index)
        : [...gameState.selectedCardIndices, index];
      updateSelectedCardIndices(newSelectedIndices);
    }
  }, [gameState, updateSelectedCardIndices]);

  const handleDiscard = useCallback(() => {
    if (gameState && gameState.currentPlayerIndex === 0 && gameState.selectedCardIndices.length === 1 && !gameState.gameEnded) {
      discardCard(gameState.selectedCardIndices[0]);
    }
  }, [gameState, discardCard]);

  const handleMeld = useCallback(() => {
    if (gameState && gameState.currentPlayerIndex === 0 && gameState.selectedCardIndices.length >= 3 && !gameState.gameEnded) {
      meldCards(gameState.selectedCardIndices);
      setStatusMessage('Meld successful. You can continue your turn.');
    }
  }, [gameState, meldCards, setStatusMessage]);

  const handleSapaw = useCallback(() => {
    if (gameState && gameState.currentPlayerIndex === 0 && sapawTarget && gameState.selectedCardIndices.length > 0 && !gameState.gameEnded) {
      sapaw(sapawTarget.playerIndex, sapawTarget.meldIndex, gameState.selectedCardIndices);
      setSapawTarget(null);
      setSelectedSapawTarget(null);
      setStatusMessage('Sapaw successful. You can continue your turn.');
    }
  }, [gameState, sapawTarget, sapaw, setSapawTarget, setStatusMessage, setSelectedSapawTarget]);

  const handleCallDraw = useCallback(() => {
    if (gameState && gameState.currentPlayerIndex === 0 && !gameState.gameEnded && gameState.players[0].exposedMelds.length > 0 && !gameState.hasDrawnThisTurn) {
      callDraw();
    }
  }, [gameState, callDraw]);

  const canDrawFromDiscard = useCallback(() => {
    if (!gameState || gameState.discardPile.length === 0) return false;
    const topDiscardCard = gameState.discardPile[gameState.discardPile.length - 1];
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];

    // Check if the top discard card can form a valid meld with any combination of cards in the player's hand
    for (let i = 0; i < currentPlayer.hand.length; i++) {
      for (let j = i + 1; j < currentPlayer.hand.length; j++) {
        if (isValidMeld([topDiscardCard, currentPlayer.hand[i], currentPlayer.hand[j]])) {
          return true;
        }
      }
    }

    // Check if the top discard card can be added to any existing meld
    for (const meld of currentPlayer.exposedMelds) {
      if (isValidMeld([...meld, topDiscardCard])) {
        return true;
      }
    }

    return false;
  }, [gameState]);

  useEffect(() => {
    if (gameState && gameState.currentPlayerIndex !== 0 && !isProcessingBotTurn && !gameState.gameEnded) {
      const timer = setTimeout(() => {
        botTurn();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [gameState, botTurn, isProcessingBotTurn]);

  useEffect(() => {
    if (gameState && isDeckEmpty() && !gameState.gameEnded) {
      callDraw();
    }
  }, [gameState, isDeckEmpty, callDraw]); 

  if (!gameMode) {
    return (
      <Card className="w-full max-w-md">
        <CardContent className="flex flex-col items-center space-y-4 p-6">
          <h1 className="text-3xl font-bold mb-4">Choose Game Mode</h1>
          <Button onClick={() => setGameMode('bot')} className="w-full">
            Play against Bot
          </Button>
          <Button onClick={() => setGameMode('multiplayer')} className="w-full">
            Multiplayer
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!gameState) {
    return <div>Loading...</div>;
  }

  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  const isPlayerTurn = gameState.currentPlayerIndex === 0;

  return (
    <div className="flex flex-col items-center justify-center w-full p-4 min-h-screen bg-gray-100">
      <h1 className="text-3xl font-bold mb-4">Tongit Game</h1>
      <div className="flex w-full max-w-7xl gap-4">
        <div className="w-1/4">
          <Card className="h-[calc(100vh-8rem)]">
            <CardContent className="p-4 h-full flex flex-col">
              <h2 className="text-xl font-semibold mb-2">Activity Log</h2>
              <div className="flex-grow overflow-y-auto">
                <ActivityLog activities={gameActions} />
              </div>
            </CardContent>
          </Card>
        </div>
        <div className="w-1/2 flex flex-col gap-4">
          <Card>
            <CardContent className="p-4">
              <h2 className="text-xl font-semibold mb-2">
                {gameState.gameEnded ? "Game Over" : (isPlayerTurn ? "Your Turn" : `${currentPlayer.name}'s Turn`)}
              </h2>
              {gameState.gameEnded ? (
                <div>
                  <p className="font-bold">Final Scores:</p>
                  {gameState.players.map(player => (
                    <div key={player.id}>
                      <p>{player.name}: {player.score} points</p>
                      {player.secretMelds && player.secretMelds.length > 0 && (
                        <div>
                          <p>Secret Melds:</p>
                          {player.secretMelds.map((meld, index) => (
                            <div key={index} className="flex space-x-1">
                              {meld.map((card, cardIndex) => (
                                <Cards key={cardIndex} card={card} small />
                              ))}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                  <p className="mt-2 font-bold">Winner: {gameState.winner?.name}</p>
                </div>
              ) : (
                gameState.hasDrawnThisTurn ? (
                  <p className="text-sm text-gray-600">
                    {isPlayerTurn ? 'You have' : `${currentPlayer.name} has`} drawn a card. 
                    {isPlayerTurn ? 'You can' : 'They can'} meld, sapaw, or discard to end the turn.
                  </p>
                ) : (
                  <p className="text-sm text-gray-600">
                    {isPlayerTurn ? 'Draw a card' : `${currentPlayer.name} needs to draw a card`} from the deck or discard pile to start the turn.
                  </p>
                )
              )}
              {statusMessage && <p className="text-sm text-blue-600 mt-2">{statusMessage}</p>}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex justify-center space-x-4">
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Deck 
                  cardsLeft={gameState.deck.length} 
                  onDraw={() => isPlayerTurn && !gameState.gameEnded && drawCard(false)} 
                  disabled={gameState.hasDrawnThisTurn || !isPlayerTurn || gameState.gameEnded}
                />
              </motion.div>
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <DiscardPile 
                  topCard={gameState.discardPile[gameState.discardPile.length - 1] || null} 
                  onDraw={() => isPlayerTurn && !gameState.gameEnded && drawCard(true)} 
                  disabled={gameState.hasDrawnThisTurn || !isPlayerTurn || gameState.gameEnded || !canDrawFromDiscard()}
                  canDraw={canDrawFromDiscard()}
                />
              </motion.div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <PlayerHand 
                hand={gameState.players[0].hand} 
                onCardClick={handleCardClick} 
                selectedIndices={gameState.selectedCardIndices} 
                isCurrentPlayer={isPlayerTurn && !gameState.gameEnded}
              />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex space-x-2">
              <Button 
                onClick={handleDiscard} 
                disabled={!isPlayerTurn || gameState.selectedCardIndices.length !== 1 || !gameState.hasDrawnThisTurn || gameState.gameEnded}
              >
                Discard (End Turn)
              </Button>
              <Button 
                onClick={handleMeld} 
                disabled={!isPlayerTurn || gameState.selectedCardIndices.length < 3 || !gameState.hasDrawnThisTurn || gameState.gameEnded}
              >
                Meld
              </Button>
              <Button 
                onClick={handleSapaw} 
                disabled={!isPlayerTurn || !sapawTarget || gameState.selectedCardIndices.length === 0 || !gameState.hasDrawnThisTurn || gameState.gameEnded}
              >
                Sapaw
              </Button>
              <Button 
                onClick={handleCallDraw} 
                disabled={
                  !isPlayerTurn || 
                  currentPlayer.exposedMelds.length === 0 || 
                  gameState.hasDrawnThisTurn || 
                  gameState.gameEnded ||
                  currentPlayer.turnsPlayed <= 1 ||
                  currentPlayer.isSapawed
                }
              >
                Call Draw
              </Button>
            </CardContent>
          </Card>
        </div>
        <div className="w-1/4">
          <Card className="h-[calc(100vh-8rem)] overflow-y-auto">
            <CardContent className="p-4">
              <h2 className="text-xl font-semibold mb-2">Melded Cards</h2>
              <MeldedCards 
                players={gameState.players}
                onSapawSelect={(target) => {
                  setSapawTarget(target);
                  setSelectedSapawTarget(target);
                }}
                currentPlayerIndex={gameState.currentPlayerIndex}
                selectedSapawTarget={selectedSapawTarget}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

