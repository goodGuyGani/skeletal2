import { GameState, Player } from '../hooks/use-tongit-game';
import { Card, isValidMeld, calculateCardPoints } from './card-utils';

type BotAction = 
  | { type: 'draw'; fromDiscard: boolean }
  | { type: 'meld'; cardIndices: number[] }
  | { type: 'sapaw'; playerIndex: number; meldIndex: number; cardIndices: number[] }
  | { type: 'discard'; cardIndex: number }
  | { type: 'callDraw' };

function calculateHandPoints(hand: Card[]): number {
  return hand.reduce((sum, card) => sum + calculateCardPoints(card), 0);
}

function calculateDrawProbability(hand: Card[], discardPile: Card[]): number {
  const neededRanks = new Set(hand.map(card => card.rank));
  const availableCards = 52 - hand.length - discardPile.length;
  const neededCards = neededRanks.size * 4 - hand.length;

  return neededCards / availableCards;
}

export function botPlayTurn(gameState: GameState): BotAction[] {
  const actions: BotAction[] = [];
  const botPlayer = gameState.players[gameState.currentPlayerIndex];
  
  if (!gameState.hasDrawnThisTurn) {
    if (gameState.deck.length === 0) {
      // If the deck is empty, call draw if possible
      if (botPlayer.exposedMelds.length > 0) {
        actions.push({ type: 'callDraw' });
        return actions;
      }
      // If can't call draw, end turn without drawing
      actions.push({ type: 'discard', cardIndex: chooseCardToDiscard(botPlayer.hand) });
      return actions;
    }
    const drawFromDiscard = shouldDrawFromDiscard(gameState.discardPile[gameState.discardPile.length - 1], botPlayer);
    actions.push({ type: 'draw', fromDiscard: drawFromDiscard });
  }

  const possibleMelds = findPossibleMelds(botPlayer.hand);
  possibleMelds.forEach(meld => {
    actions.push({ type: 'meld', cardIndices: meld });
  });

  const sapawAction = findPossibleSapaw(gameState, botPlayer);
  if (sapawAction) {
    actions.push(sapawAction);
  }

  if (shouldCallDraw(gameState, botPlayer)) {
    actions.push({ type: 'callDraw' });
  } else {
    const discardIndex = chooseCardToDiscard(botPlayer.hand);
    actions.push({ type: 'discard', cardIndex: discardIndex });
  }

  return actions;
}

function shouldCallDraw(gameState: GameState, botPlayer: Player): boolean {
  return botPlayer.exposedMelds.length > 0 && gameState.hasDrawnThisTurn && (
    gameState.deck.length === 0 || (
      calculateHandPoints(botPlayer.hand) <= Math.min(
        ...gameState.players
          .filter(player => player.id !== botPlayer.id)
          .map(player => calculateHandPoints(player.hand))
      )
    )
  );
}

function shouldDrawFromDiscard(topDiscard: Card, player: Player): boolean {
  const handWithDiscard = [...player.hand, topDiscard];
  const meldsWithDiscard = findPossibleMelds(handWithDiscard);
  const meldsWithoutDiscard = findPossibleMelds(player.hand);

  if (meldsWithDiscard.length > meldsWithoutDiscard.length) {
    return true;
  }

  const drawProbability = calculateDrawProbability(player.hand, [topDiscard]);
  return drawProbability < 0.2; // Adjust this threshold as needed
}

function findPossibleMelds(hand: Card[]): number[][] {
  const melds: number[][] = [];
  for (let i = 0; i < hand.length - 2; i++) {
    for (let j = i + 1; j < hand.length - 1; j++) {
      for (let k = j + 1; k < hand.length; k++) {
        if (isValidMeld([hand[i], hand[j], hand[k]])) {
          melds.push([i, j, k]);
        }
      }
    }
  }
  return melds;
}

function findPossibleSapaw(gameState: GameState, botPlayer: Player): BotAction | null {
  for (let playerIndex = 0; playerIndex < gameState.players.length; playerIndex++) {
    if (playerIndex === 1) continue;
    const player = gameState.players[playerIndex];
    for (let meldIndex = 0; meldIndex < player.exposedMelds.length; meldIndex++) {
      const meld = player.exposedMelds[meldIndex];
      for (let i = 0; i < botPlayer.hand.length; i++) {
        if (isValidMeld([...meld, botPlayer.hand[i]])) {
          return { type: 'sapaw', playerIndex, meldIndex, cardIndices: [i] };
        }
      }
    }
  }
  return null;
}

function chooseCardToDiscard(hand: Card[]): number {
  let maxPoints = -1;
  let maxPointIndex = -1;
  for (let i = 0; i < hand.length; i++) {
    const points = calculateCardPoints(hand[i]);
    if (points > maxPoints) {
      maxPoints = points;
      maxPointIndex = i;
    }
  }
  return maxPointIndex;
}

