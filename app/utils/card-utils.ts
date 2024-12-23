export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';
export type Card = { suit: Suit; rank: Rank };

export function createDeck(): Card[] {
  const suits: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
  const ranks: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  const deck: Card[] = [];

  for (const suit of suits) {
    for (const rank of ranks) {
      deck.push({ suit, rank });
    }
  }

  return shuffleDeck(deck);
}

export function shuffleDeck(deck: Card[]): Card[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function dealCards(deck: Card[], numPlayers: number, cardsPerPlayer: number): { hands: Card[][]; remainingDeck: Card[] } {
  const hands: Card[][] = Array(numPlayers).fill(null).map(() => []);
  
  for (let i = 0; i < cardsPerPlayer; i++) {
    for (let j = 0; j < numPlayers; j++) {
      if (deck.length > 0) {
        const card = deck.pop()!;
        hands[j].push(card);
      }
    }
  }

  return { hands, remainingDeck: deck };
}

export function isThreeOfAKind(cards: Card[]): boolean {
  return cards.length === 3 && cards.every(card => card && card.rank === cards[0]?.rank);
}

export function isFourOfAKind(cards: Card[]): boolean {
  return cards.length === 4 && cards.every(card => card && card.rank === cards[0]?.rank);
}

export function isStraightFlush(cards: Card[]): boolean {
  if (cards.length < 3 || !cards.every(card => card && card.suit && card.rank)) return false;
  const sortedCards = [...cards].sort((a, b) => rankToNumber(a.rank) - rankToNumber(b.rank));
  const sameSuit = sortedCards.every(card => card && card.suit === sortedCards[0]?.suit);
  const consecutive = sortedCards.every((card, index) => 
    index === 0 || (card && sortedCards[index - 1] && rankToNumber(card.rank) - rankToNumber(sortedCards[index - 1].rank) === 1)
  );
  return sameSuit && consecutive;
}

export function isValidMeld(cards: Card[]): boolean {
  return isThreeOfAKind(cards) || isFourOfAKind(cards) || isStraightFlush(cards);
}

export function rankToNumber(rank: Rank): number {
  const rankOrder: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  return rankOrder.indexOf(rank);
}

export function calculateCardPoints(card: Card): number {
  if (card.rank === 'A') return 1;
  if (['J', 'Q', 'K'].includes(card.rank)) return 10;
  return parseInt(card.rank) || 0;
}

export function calculateHandPoints(hand: Card[], secretMelds: Card[][] = []): number {
  const allCards = [...hand];
  const allMelds = [...secretMelds];

  // Find and remove all valid melds from the hand
  while (true) {
    const meldFound = findAndRemoveMeld(allCards);
    if (!meldFound) break;
    allMelds.push(meldFound);
  }

  // Calculate points only for the remaining cards in hand
  return allCards.reduce((total, card) => total + calculateCardPoints(card), 0);
}

function findAndRemoveMeld(cards: Card[]): Card[] | null {
  // Check for sets (three or more of the same rank)
  for (let i = 0; i < cards.length - 2; i++) {
    for (let j = i + 1; j < cards.length - 1; j++) {
      for (let k = j + 1; k < cards.length; k++) {
        if (cards[i].rank === cards[j].rank && cards[j].rank === cards[k].rank) {
          const meld = [cards[i], cards[j], cards[k]];
          cards.splice(k, 1);
          cards.splice(j, 1);
          cards.splice(i, 1);
          return meld;
        }
      }
    }
  }

  // Check for runs (three or more consecutive cards of the same suit)
  const sortedCards = [...cards].sort((a, b) => rankToNumber(a.rank) - rankToNumber(b.rank));
  for (let i = 0; i < sortedCards.length - 2; i++) {
    if (
      sortedCards[i].suit === sortedCards[i + 1].suit &&
      sortedCards[i + 1].suit === sortedCards[i + 2].suit &&
      rankToNumber(sortedCards[i + 1].rank) - rankToNumber(sortedCards[i].rank) === 1 &&
      rankToNumber(sortedCards[i + 2].rank) - rankToNumber(sortedCards[i + 1].rank) === 1
    ) {
      const meld = [sortedCards[i], sortedCards[i + 1], sortedCards[i + 2]];
      cards.splice(cards.indexOf(sortedCards[i + 2]), 1);
      cards.splice(cards.indexOf(sortedCards[i + 1]), 1);
      cards.splice(cards.indexOf(sortedCards[i]), 1);
      return meld;
    }
  }

  return null;
}

