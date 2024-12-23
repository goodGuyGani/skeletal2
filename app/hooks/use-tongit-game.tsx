import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, createDeck, dealCards, isValidMeld, calculateHandPoints } from '../utils/card-utils';
import { botPlayTurn } from '../utils/bot-utils';

export type Player = {
  id: number;
  name: string;
  hand: Card[];
  exposedMelds: Card[][];
  secretMelds: Card[][];
  score: number;
  consecutiveWins: number;
  isSapawed: boolean;
  points: number;
  turnsPlayed: number;
};

export type GameState = {
  players: Player[];
  currentPlayerIndex: number;
  deck: Card[];
  discardPile: Card[];
  winner: Player | null;
  potMoney: number;
  tableCharge: number;
  entryFee: number;
  hasDrawnThisTurn: boolean;
  selectedCardIndices: number[];
  gameEnded: boolean;
};

export type GameAction = {
  type: 'draw' | 'meld' | 'sapaw' | 'discard' | 'callDraw';
  player: string;
  details: string;
  card?: Card;
  cards?: Card[];
  fromDiscard?: boolean;
  playerIndex?: number;
  meldIndex?: number;
  cardIndex?: number;
};

export function useTongitGame(initialGameMode: 'bot' | 'multiplayer' | null) {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [gameActions, setGameActions] = useState<GameAction[]>([]);
  const [isProcessingBotTurn, setIsProcessingBotTurn] = useState(false);
  const gameInitializedRef = useRef(false);

  const addGameAction = useCallback((action: GameAction) => {
    setGameActions(prevActions => [...prevActions, action]);
  }, []);

  const callDraw = useCallback(() => {
  setGameState(prevState => {
    if (!prevState) return null;

    const currentPlayer = prevState.players[prevState.currentPlayerIndex];

    // Validate conditions for calling a draw
    if (
      prevState.hasDrawnThisTurn || 
      currentPlayer.turnsPlayed < 2 || 
      currentPlayer.isSapawed
    ) {
      return prevState;
    }

    // Calculate scores for all players
    const playerScores = prevState.players.map(player => ({
      ...player,
      score: calculateHandPoints(player.hand, player.secretMelds)
    }));

    // Determine the winner based on the lowest score
    const winner = playerScores.reduce((min, player) =>
      player.score < min.score ? player : min
    );

    // Update consecutive wins and reset for other players
    const updatedPlayers = playerScores.map(player => ({
      ...player,
      consecutiveWins: player.id === winner.id ? player.consecutiveWins + 1 : 0,
    }));

    // Log the game action
    addGameAction({
      type: 'callDraw',
      player: currentPlayer.name,
      details: `Called draw. ${winner.name} wins with ${winner.score} points.`,
    });

    // End the game and update the state
    return {
      ...prevState,
      players: updatedPlayers,
      winner: winner,
      gameEnded: true,
    };
  });
}, [addGameAction]);


  const drawCard = useCallback((fromDiscard: boolean) => {
    setGameState(prevState => {
      if (!prevState || prevState.hasDrawnThisTurn) return prevState;

      const currentPlayer = prevState.players[prevState.currentPlayerIndex];
      let newCard: Card;
      let newDeck: Card[];
      let newDiscardPile: Card[];

      if (fromDiscard && prevState.discardPile.length > 0) {
        const topDiscardCard = prevState.discardPile[prevState.discardPile.length - 1];
      
        // Check if the top discard card can form a valid meld
        const canDrawFromDiscard = currentPlayer.hand.some((card, index, hand) => {
          for (let i = index + 1; i < hand.length; i++) {
            if (isValidMeld([topDiscardCard, card, hand[i]])) {
              return true;
            }
          }
          return false;
        }) || currentPlayer.exposedMelds.some(meld => isValidMeld([...meld, topDiscardCard]));

        if (!canDrawFromDiscard) {
          // If the player can't form a valid meld with the top discard card, draw from the deck instead
          if (prevState.deck.length === 0) {
            // Handle empty deck (e.g., reshuffle discard pile or end game)
            return prevState;
          }
          newCard = prevState.deck[prevState.deck.length - 1];
          newDeck = prevState.deck.slice(0, -1);
          newDiscardPile = prevState.discardPile;
        } else {
          newCard = topDiscardCard;
          newDiscardPile = prevState.discardPile.slice(0, -1);
          newDeck = prevState.deck;
        }
      } else {
        if (prevState.deck.length === 0) {
          // Handle empty deck (e.g., reshuffle discard pile or end game)
          return prevState;
        }
        newCard = prevState.deck[prevState.deck.length - 1];
        newDeck = prevState.deck.slice(0, -1);
        newDiscardPile = prevState.discardPile;
      }

      const newHand = [...currentPlayer.hand, newCard];
      const newPlayers = prevState.players.map((player, index) =>
        index === prevState.currentPlayerIndex ? { ...player, hand: newHand } : player
      );

      addGameAction({
        type: 'draw',
        player: currentPlayer.name,
        details: `Drew ${newCard.rank} of ${newCard.suit} from ${fromDiscard ? 'discard pile' : 'deck'}`,
        card: newCard
      });

      return {
        ...prevState,
        players: newPlayers,
        deck: newDeck,
        discardPile: newDiscardPile,
        hasDrawnThisTurn: true,
      };
    });
  }, [addGameAction]);

  const discardCard = useCallback((cardIndex: number) => {
    setGameState(prevState => {
      if (!prevState) return null;
      const currentPlayer = prevState.players[prevState.currentPlayerIndex];
      const discardedCard = currentPlayer.hand[cardIndex];
      const newHand = currentPlayer.hand.filter((_, index) => index !== cardIndex);
      const newPlayers = prevState.players.map((player, index) =>
        index === prevState.currentPlayerIndex 
          ? { ...player, hand: newHand, isSapawed: false, turnsPlayed: player.turnsPlayed + 1 } 
          : player
      );

      let nextPlayerIndex = (prevState.currentPlayerIndex + 1) % prevState.players.length;
      if (nextPlayerIndex > 2) nextPlayerIndex = 0; // Stop at Bot 2

      addGameAction({
        type: 'discard',
        player: currentPlayer.name,
        details: `Discarded ${discardedCard.rank} of ${discardedCard.suit}`,
        card: discardedCard
      });

      return {
        ...prevState,
        players: newPlayers,
        currentPlayerIndex: nextPlayerIndex,
        discardPile: [...prevState.discardPile, discardedCard],
        hasDrawnThisTurn: false,
        selectedCardIndices: [],
      };
    });
  }, [addGameAction]);

  const meldCards = useCallback((cardIndices: number[]) => {
    setGameState(prevState => {
      if (!prevState) return null;
      const currentPlayer = prevState.players[prevState.currentPlayerIndex];
      const meldedCards = cardIndices.map(index => currentPlayer.hand[index]);

      if (!isValidMeld(meldedCards)) {
        return prevState;
      }

      const newHand = currentPlayer.hand.filter((_, index) => !cardIndices.includes(index));
      const newPlayers = prevState.players.map((player, index) =>
        index === prevState.currentPlayerIndex
          ? { ...player, hand: newHand, exposedMelds: [...player.exposedMelds, meldedCards], secretMelds: [...player.secretMelds] }
          : player
      );

      addGameAction({
        type: 'meld',
        player: currentPlayer.name,
        details: `Melded ${meldedCards.length} cards`,
        cards: meldedCards
      });

      return {
        ...prevState,
        players: newPlayers,
        selectedCardIndices: [],
      };
    });
  }, [addGameAction]);

  const sapaw = useCallback((playerIndex: number, meldIndex: number, cardIndices: number[]) => {
    setGameState(prevState => {
      if (!prevState) return null;
      const currentPlayer = prevState.players[prevState.currentPlayerIndex];
      const targetPlayer = prevState.players[playerIndex];
      const sapawCards = cardIndices.map(index => currentPlayer.hand[index]);
      const targetMeld = [...targetPlayer.exposedMelds[meldIndex], ...sapawCards];

      if (!isValidMeld(targetMeld)) {
        return prevState;
      }

      const newCurrentPlayerHand = currentPlayer.hand.filter((_, index) => !cardIndices.includes(index));
      const newTargetPlayerMelds = targetPlayer.exposedMelds.map((meld, index) =>
        index === meldIndex ? targetMeld : meld
      );

      const newPlayers = prevState.players.map((player, index) => {
        if (index === prevState.currentPlayerIndex) {
          return { 
            ...player, 
            hand: newCurrentPlayerHand,
            exposedMelds: index === playerIndex 
              ? newTargetPlayerMelds 
              : player.exposedMelds
          };
        } else if (index === playerIndex) {
          return { ...player, exposedMelds: newTargetPlayerMelds, isSapawed: true };
        }
        return player;
      });

      addGameAction({
        type: 'sapaw',
        player: currentPlayer.name,
        details: `Sapawed ${sapawCards.length} cards to ${targetPlayer.name}'s meld`,
        cards: sapawCards,
        playerIndex: playerIndex,
        meldIndex: meldIndex
      });

      return {
        ...prevState,
        players: newPlayers,
        selectedCardIndices: [],
      };
    });
  }, [addGameAction]);


  const checkTongits = useCallback(() => {
    setGameState(prevState => {
      if (!prevState) return null;
      const currentPlayer = prevState.players[prevState.currentPlayerIndex];

      if (currentPlayer.hand.length === 0) {
        const newPlayers = prevState.players.map(player =>
          player.id === currentPlayer.id
            ? { ...player, consecutiveWins: player.consecutiveWins + 1, score: 0 }
            : { ...player, consecutiveWins: 0, score: calculateHandPoints(player.hand, player.secretMelds) }
        );

        addGameAction({
          type: 'callDraw',
          player: currentPlayer.name,
          details: `Called Tongits! ${currentPlayer.name} wins with a score of 0.`,
        });

        return {
          ...prevState,
          players: newPlayers,
          winner: currentPlayer,
          gameEnded: true,
        };
      }

      return prevState;
    });
  }, [addGameAction]);

  const updateSelectedCardIndices = useCallback((indices: number[]) => {
    setGameState(prevState => {
      if (!prevState) return null;
      return {
        ...prevState,
        selectedCardIndices: indices,
      };
    });
  }, []);

  const botTurn = useCallback(() => {
    setIsProcessingBotTurn(true);
    setGameState(prevState => {
      if (!prevState || prevState.currentPlayerIndex === 0) return prevState;

      const botActions = botPlayTurn(prevState);
      let newState = prevState;

      for (const action of botActions) {
        switch (action.type) {
          case 'draw':
            if (!newState.hasDrawnThisTurn) {
              newState = { ...newState, hasDrawnThisTurn: true };
              if (action.fromDiscard && newState.discardPile.length > 0) {
                const drawnCard = newState.discardPile.pop()!;
                newState.players[newState.currentPlayerIndex].hand.push(drawnCard);
                addGameAction({
                  type: 'draw',
                  player: newState.players[newState.currentPlayerIndex].name,
                  details: 'Drew a card from discard pile',
                  fromDiscard: true
                });
              } else if (newState.deck.length > 0) {
                const drawnCard = newState.deck.pop()!;
                newState.players[newState.currentPlayerIndex].hand.push(drawnCard);
                addGameAction({
                  type: 'draw',
                  player: newState.players[newState.currentPlayerIndex].name,
                  details: 'Drew a card from deck'
                });
              }
            }
            break;
          case 'meld':
            newState = { ...newState, ...meldCards(action.cardIndices) };
            break;
          case 'sapaw':
            newState = { ...newState, ...sapaw(action.playerIndex, action.meldIndex, action.cardIndices) };
            break;
          case 'discard':
            newState = { ...newState, ...discardCard(action.cardIndex) };
            break;
        }
      }

      setIsProcessingBotTurn(false);
      return newState;
    });
  }, [meldCards, sapaw, discardCard, addGameAction]);

  const isDeckEmpty = useCallback(() => {
    return gameState?.deck.length === 0;
  }, [gameState]);

  useEffect(() => {
    if (initialGameMode && !gameInitializedRef.current) {
      const deck = createDeck();
      const { hands, remainingDeck } = dealCards(deck, 3, 12);
      const players: Player[] = hands.map((hand, index) => ({
        id: index,
        name: index === 0 ? 'You' : `Bot ${index}`,
        hand,
        exposedMelds: [],
        secretMelds: [],
        score: 0,
        consecutiveWins: 0,
        isSapawed: false,
        points: 0,
        turnsPlayed: 0,
      }));
      setGameState({
        players,
        currentPlayerIndex: 0,
        deck: remainingDeck,
        discardPile: [],
        winner: null,
        potMoney: 0,
        tableCharge: 50,
        entryFee: 100,
        hasDrawnThisTurn: false,
        selectedCardIndices: [],
        gameEnded: false,
      });
      gameInitializedRef.current = true;
    }
  }, [initialGameMode]);

  useEffect(() => {
    if (gameState && isDeckEmpty() && !gameState.gameEnded) {
      const newState: any = callDraw();
      if (newState) {
        setGameState(newState);
      }
    }
  }, [gameState, isDeckEmpty, callDraw]);

  return {
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
  };
}

