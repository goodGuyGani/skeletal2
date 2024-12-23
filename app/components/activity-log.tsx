import React, { useRef, useEffect, useState } from 'react';
import { GameAction } from '../hooks/use-tongit-game';
import { Card } from './card';

interface ActivityLogProps {
  activities: GameAction[];
}

export function ActivityLog({ activities }: ActivityLogProps) {
  const logEndRef = useRef<HTMLDivElement>(null);
  const [displayedActivities, setDisplayedActivities] = useState<GameAction[]>([]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [displayedActivities]);

  useEffect(() => {
    if (activities.length > displayedActivities.length) {
      const newActivity = activities[activities.length - 1];
      setDisplayedActivities(prev => [...prev, { ...newActivity, details: '' }]);
      let charIndex = 0;
      const intervalId = setInterval(() => {
        if (charIndex <= newActivity.details.length) {
          setDisplayedActivities(prev => [
            ...prev.slice(0, -1),
            { ...newActivity, details: newActivity.details.slice(0, charIndex) }
          ]);
          charIndex++;
        } else {
          clearInterval(intervalId);
        }
      }, 30);
      return () => clearInterval(intervalId);
    }
  }, [activities]);

  const renderCards = (cards: any[]) => {
    return (
      <div className="flex flex-wrap gap-1 mt-1">
        {cards.map((card, i) => (
          <Card key={`${i}-${card.suit}-${card.rank}`} card={card} small />
        ))}
      </div>
    );
  };

  return (
    <div className="h-full overflow-y-auto">
      {displayedActivities.map((activity, index) => (
        <div key={index} className="mb-2 text-sm">
          <strong>{activity.player}:</strong> {activity.details}
          {activity.type === 'meld' && activity.cards && renderCards(activity.cards)}
          {activity.type === 'sapaw' && activity.cards && (
            <div className="mt-1">
              <span>Sapawed to Player {activity.playerIndex}, Meld {activity.meldIndex}</span>
              {renderCards(activity.cards)}
            </div>
          )}
          {(activity.type === 'draw' || activity.type === 'discard') && activity.card && (
            <div className="transform scale-75 origin-left inline-block ml-2">
              <Card card={activity.card} small={false} />
            </div>
          )}
        </div>
      ))}
      <div ref={logEndRef} />
    </div>
  );
}

