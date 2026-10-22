import { useEffect, useState } from 'react';
import type { GameState } from '../game-core/types';
import { awardPng } from './recap';
export function AwardCard({ state }: { state: GameState }) {
  const [url, setUrl] = useState('');
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let obsolete = false,
      objectUrl = '';
    void awardPng(state)
      .then((blob) => {
        if (obsolete) return;
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      })
      .catch(() => {
        if (!obsolete) setFailed(true);
      });
    return () => {
      obsolete = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [state]);
  return (
    <figure className="png-award">
      <figcaption>
        <b>Your award, ready to share.</b>
        <span>PNG · 2400 × 1350</span>
      </figcaption>
      {url ? (
        <img
          src={url}
          width={2400}
          height={1350}
          alt="Your award card with fictional characters and session verdict counts. No browsing details."
        />
      ) : (
        <p role="status">
          {failed ? 'Preview unavailable. Try Save PNG card.' : 'Preparing your award…'}
        </p>
      )}
    </figure>
  );
}
