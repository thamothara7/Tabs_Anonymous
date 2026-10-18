import type { Character, Emotion } from '../game-core/types';
export function TabCharacter({
  character,
  speaking = false,
  emotion,
  compact = false,
}: {
  character: Character;
  speaking?: boolean;
  emotion?: Emotion;
  compact?: boolean;
}) {
  const face = emotion ?? character.emotion;
  const angry = face === 'angry';
  const shocked = face === 'shocked';
  const sad = face === 'crying';
  const happy = face === 'happy' || face === 'victorious';
  return (
    <svg
      className={`tab-rig face-${face} ${speaking ? 'speaking' : ''} ${compact ? 'compact' : ''}`}
      viewBox="0 0 180 170"
      fill="none"
      aria-hidden="true"
    >
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
          fill={character.color}
          stroke="#27313a"
          strokeWidth="3"
        />
        <path d="M40 53v-8h94q6 0 6 7v5H40Z" fill="white" opacity=".15" />
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
        {character.category === 'video' && (
          <path
            d="M41 71V60a49 49 0 0 1 98 0v11M40 65v18m100-18v18"
            stroke="#543d43"
            strokeWidth="9"
            strokeLinecap="round"
          />
        )}
        <g className="eye-pair">
          <ellipse cx="68" cy="78" rx="13" ry={shocked ? 17 : 15} fill="#fff9ed" />
          <ellipse cx="111" cy="78" rx="13" ry={shocked ? 17 : 15} fill="#fff9ed" />
          <g className="pupils">
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
          <path d={angry ? 'M57 58l21 7' : sad ? 'M57 64l20-7' : 'M58 57l18-2'} />
          <path d={angry ? 'M101 65l21-7' : sad ? 'M103 57l20 7' : 'M103 55l18 2'} />
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
