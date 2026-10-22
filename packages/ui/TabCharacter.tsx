import { useId } from 'react';
import type { Character, Emotion } from '../game-core/types';
export function TabCharacter({
  character,
  speaking = false,
  emotion,
  compact = false,
  gaze = 0,
}: {
  character: Character;
  speaking?: boolean;
  emotion?: Emotion;
  compact?: boolean;
  gaze?: number;
}) {
  const uid = useId().replace(/:/g, '');
  const face = emotion ?? character.emotion;
  const angry = face === 'angry';
  const shocked = face === 'shocked';
  const sad = face === 'crying';
  const happy = face === 'happy' || face === 'victorious';
  return (
    <svg
      className={`tab-rig face-${face} ${speaking ? 'speaking' : ''} ${compact ? 'compact' : ''}`}
      viewBox="4 12 172 146"
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient
          id={`${uid}-shell`}
          x1="25"
          y1="20"
          x2="146"
          y2="130"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#fff8eb" />
          <stop offset=".25" stopColor={character.color} />
          <stop offset=".75" stopColor={character.color} />
          <stop offset="1" stopColor="#526975" />
        </linearGradient>
        <linearGradient id={`${uid}-glass`} x2="0" y2="1">
          <stop stopColor="white" stopOpacity=".6" />
          <stop offset="1" stopColor="white" stopOpacity="0" />
        </linearGradient>
        <radialGradient id={`${uid}-eye`}>
          <stop stopColor="#fff" />
          <stop offset=".8" stopColor="#fff9ed" />
          <stop offset="1" stopColor="#d9d9cc" />
        </radialGradient>
      </defs>
      <ellipse
        className="rig-shadow"
        cx="90"
        cy="151"
        rx="46"
        ry="8"
        fill="#07151b"
        opacity=".35"
      />
      <g className="rig-body">
        <g className="legs" stroke="#222c32" strokeWidth="6" strokeLinecap="round">
          <path className="leg left" d="M66 116v26l-12 2" />
          <path className="leg right" d="M114 116v26l12 2" />
        </g>
        <g stroke="#222c32" strokeWidth="5" strokeLinecap="round">
          <path className="arm left" d="M37 78Q18 80 18 101l-7-4" />
          <path className="arm right" d="M143 78q19 2 19 23l7-4" />
        </g>
        <path
          d="M34 50V32q0-10 10-10h42q6 0 10 7l6 10h34q10 0 10 10v63q0 13-13 13H47q-13 0-13-13Z"
          fill={`url(#${uid}-shell)`}
          stroke="#27313a"
          strokeWidth="3"
        />
        <path
          d="M41 50V33q0-4 5-4h35q6 0 9 5l8 12h37q4 0 4 5v58q0 8-8 8H49q-8 0-8-8Z"
          stroke="white"
          strokeOpacity=".55"
          strokeWidth="1.5"
        />
        <path d="M42 52h94v30Q94 60 42 91Z" fill={`url(#${uid}-glass)`} opacity=".5" />
        <path
          d="M45 121h87q11 0 11-11"
          stroke="#243b46"
          strokeOpacity=".22"
          strokeWidth="5"
          strokeLinecap="round"
        />
        <circle cx="119" cy="49" r="2" fill="white" opacity=".65" />
        <circle cx="127" cy="49" r="2" fill="white" opacity=".45" />
        {character.category === 'code' && (
          <g stroke="#564b81" strokeWidth="2.5" strokeLinecap="round">
            <path d="m47 61 5-4-5-4m83 8-5-4 5-4" />
            <path d="M47 112h12m4 0h5" opacity=".5" />
          </g>
        )}
        {character.category === 'social' && (
          <g transform="translate(136 30)">
            <path d="M-9-5h18v15H4l-5 5V10H-9Z" fill="#fff3ec" stroke="#9e597a" strokeWidth="1.5" />
            <circle cx="-4" cy="3" r="1.4" fill="#9e597a" />
            <circle cx="1" cy="3" r="1.4" fill="#9e597a" />
            <circle cx="6" cy="3" r="1.4" fill="#9e597a" />
          </g>
        )}
        {character.category === 'other' && (
          <path
            d="m86 119 4-4 4 4-2 4 4 12-6 5-6-5 4-12Z"
            fill="#426f83"
            stroke="#25414d"
            strokeWidth="1"
          />
        )}

        <path
          d="M43 112q0 5 6 5h82"
          stroke="white"
          strokeOpacity=".18"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <rect x="43" y="29" width="27" height="19" rx="5" fill="#fff" fillOpacity=".4" />
        <text
          x="56.5"
          y="42"
          textAnchor="middle"
          fill="#263139"
          fontSize="11"
          fontFamily="monospace"
          fontWeight="800"
        >
          {character.category === 'shopping' ? '$' : character.symbol}
        </text>
        {character.category === 'events' && (
          <g transform="translate(124 106) rotate(-12)">
            <path d="M-7-6 8-6 10 18 0 13-9 19Z" fill="#ce744d" />
            <circle r="12" fill="#fff2c5" stroke="#9a7842" strokeWidth="2" />
            <path d="m0-8 2 5 6 .5-4.5 4 1.5 6L0 4-5 3l1-5-4-4 6-.5Z" fill="#9a7842" />
          </g>
        )}
        {character.category === 'design' && (
          <g transform="translate(128 53) rotate(15)">
            <path d="M-9-16v34l9 10 9-10v-34Z" fill="#ecc27b" stroke="#56516a" strokeWidth="2" />
            <path d="m-9 18 9 10 9-10" fill="#fce9c7" />
            <path d="M-2 24 0 28 3 24" fill="#34343e" />
            <path d="M-3-14v31" stroke="#fff5cf" strokeWidth="3" />
          </g>
        )}
        {character.category === 'video' && (
          <path
            d="M41 71V60a49 49 0 0 1 98 0v11M40 65v18m100-18v18"
            stroke="#543d43"
            strokeWidth="9"
            strokeLinecap="round"
          />
        )}
        <g className="eye-pair">
          <ellipse cx="68" cy="78" rx="13" ry={shocked ? 17 : 15} fill={`url(#${uid}-eye)`} />
          <ellipse cx="111" cy="78" rx="13" ry={shocked ? 17 : 15} fill={`url(#${uid}-eye)`} />
          <g className="pupils" style={{ transform: `translateX(${gaze * 3}px)` }}>
            <ellipse
              cx={face === 'suspicious' ? 73 : 70}
              cy="80"
              rx="5"
              ry={happy ? 5 : 7}
              fill="#253039"
            />
            <ellipse
              cx={face === 'suspicious' ? 116 : 113}
              cy="80"
              rx="5"
              ry={happy ? 5 : 7}
              fill="#253039"
            />
            <circle cx="71" cy="77" r="1.5" fill="white" />
            <circle cx="114" cy="77" r="1.5" fill="white" />
          </g>
        </g>
        <g stroke="#283039" strokeWidth="4" strokeLinecap="round">
          <path
            d={
              angry
                ? 'M57 58l21 7'
                : sad
                  ? 'M57 64l20-7'
                  : face === 'smug' || face === 'suspicious'
                    ? 'M57 61h21'
                    : 'M58 57l18-2'
            }
          />
          <path
            d={
              angry
                ? 'M101 65l21-7'
                : sad
                  ? 'M103 57l20 7'
                  : face === 'smug' || face === 'suspicious'
                    ? 'M103 54l18-4'
                    : 'M103 55l18 2'
            }
          />
        </g>
        {character.category === 'study' && (
          <g stroke="#2d5148" strokeWidth="3">
            <rect x="51" y="65" width="33" height="29" rx="10" />
            <rect x="95" y="65" width="33" height="29" rx="10" />
            <path d="M84 75h11" />
          </g>
        )}
        <ellipse cx="53" cy="98" rx="8" ry="4" fill="#e36b79" opacity=".3" />
        <ellipse cx="128" cy="98" rx="8" ry="4" fill="#e36b79" opacity=".3" />
        {shocked || speaking ? (
          <ellipse
            className={speaking ? 'talk-mouth' : ''}
            cx="90"
            cy="104"
            rx="8"
            ry="9"
            fill="#30313c"
          />
        ) : (
          <path
            d={sad ? 'M80 109q10-12 20 0' : angry ? 'M81 106h18' : 'M79 101q11 16 22 0'}
            stroke="#30313c"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
        )}
        {sad && (
          <g fill="#79cce9" className="tears">
            <path d="M57 90q-9 13 0 13t0-13" />
            <path d="M122 90q-9 13 0 13t0-13" />
          </g>
        )}
        {character.category === 'shopping' && (
          <g transform="rotate(15 137 114)">
            <path d="M130 101h18v27h-18l-6-13Z" fill="#fff4d4" stroke="#aa763b" strokeWidth="1.5" />
            <text x="134" y="120" fill="#aa763b" fontSize="14" fontWeight="700">
              $
            </text>
          </g>
        )}
        {character.pinned && (
          <g transform="translate(128 25) rotate(25)">
            <path d="M0 0h12l-2 10 4 4H-2l4-4Z" fill="#f6ca6e" stroke="#3b3934" strokeWidth="2" />
            <path d="M6 14v10" stroke="#3b3934" strokeWidth="2" />
          </g>
        )}
      </g>
    </svg>
  );
}
