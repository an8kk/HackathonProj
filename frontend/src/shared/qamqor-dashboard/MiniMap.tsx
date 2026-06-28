import { C, statusColor } from 'shared/qamqor-data/colors';
import type { LocationStats, LocationStatus } from 'shared/qamqor-data/types';

interface MiniMapProps {
  locations: LocationStats[];
  activeId?: string | null;
  onSelect?: (id: string) => void;
}

// Fixed positions for each known location id in the 320×200 SVG viewport
const POSITIONS: Record<string, { x: number; y: number; labelDx: number; labelDy: number }> = {
  saryarka:   { x: 160, y: 100, labelDx: 10, labelDy: 4 },
  esil:       { x: 200, y: 70,  labelDx: 10, labelDy: 4 },
  almaty:     { x: 240, y: 130, labelDx: 10, labelDy: 4 },
  baikonur:   { x: 80,  y: 60,  labelDx: 10, labelDy: 4 },
  'khan-shatyr': { x: 110, y: 150, labelDx: 10, labelDy: 4 },
  mega:       { x: 270, y: 55,  labelDx: -8, labelDy: -10 },
  keruyen:    { x: 55,  y: 140, labelDx: 10, labelDy: 4 },
};

const STATUS_LABELS: Record<LocationStatus, string> = {
  green: 'Норма',
  amber: 'Расследовать',
  red: 'Хищение',
};

export default function MiniMap({ locations, activeId, onSelect }: MiniMapProps) {
  return (
    <div className="card p-5">
      <div className="mb-3">
        <div className="text-sm font-bold text-charcoal">Карта сети · Астана</div>
        <div className="text-xs text-muted mt-0.5">Интерактивная схема точек</div>
      </div>

      <svg
        viewBox="0 0 320 200"
        width="100%"
        style={{ borderRadius: 12, background: C.offwhite, display: 'block' }}
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Decorative roads / river lines */}
        <line x1="0" y1="100" x2="320" y2="100" stroke={C.line} strokeWidth={1.5} />
        <line x1="160" y1="0" x2="160" y2="200" stroke={C.line} strokeWidth={1.5} />
        <path
          d="M 0 130 Q 80 110 160 120 Q 240 130 320 115"
          fill="none"
          stroke={C.faint}
          strokeWidth={2}
          strokeDasharray="4 3"
        />
        <path
          d="M 30 0 Q 90 50 120 80 Q 150 110 200 160 Q 240 190 280 200"
          fill="none"
          stroke={C.line}
          strokeWidth={1}
        />

        {/* Location markers */}
        {locations.map((loc) => {
          const pos = POSITIONS[loc.locationId];
          if (!pos) return null;

          const isActive = loc.locationId === activeId;
          const fill = statusColor(loc.status);
          const r = isActive ? 9 : 7;
          // Short label — remove 'Bahandi ' prefix
          const label = loc.locationName.replace(/^Bahandi\s*/i, '');

          return (
            <g
              key={loc.locationId}
              onClick={() => onSelect?.(loc.locationId)}
              style={{ cursor: onSelect ? 'pointer' : 'default' }}
            >
              {/* Pulse ring for red status */}
              {loc.status === 'red' && (
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={r + 5}
                  fill={fill}
                  fillOpacity={0.25}
                >
                  <animate
                    attributeName="r"
                    values={`${r + 3};${r + 8};${r + 3}`}
                    dur="2s"
                    repeatCount="indefinite"
                  />
                  <animate
                    attributeName="fill-opacity"
                    values="0.3;0.05;0.3"
                    dur="2s"
                    repeatCount="indefinite"
                  />
                </circle>
              )}

              {/* Active ring */}
              {isActive && (
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={r + 4}
                  fill="none"
                  stroke={C.amber}
                  strokeWidth={2}
                />
              )}

              {/* Main marker */}
              <circle
                cx={pos.x}
                cy={pos.y}
                r={r}
                fill={fill}
                stroke="white"
                strokeWidth={2}
              />

              {/* Label */}
              <text
                x={pos.x + pos.labelDx}
                y={pos.y + pos.labelDy}
                fontSize={9}
                fill={C.text}
                fontFamily="Inter, sans-serif"
                fontWeight={isActive ? 700 : 400}
              >
                {label}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-3">
        {(['green', 'amber', 'red'] as LocationStatus[]).map((s) => (
          <div key={s} className="flex items-center gap-1.5">
            <div
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ background: statusColor(s) }}
            />
            <span className="text-xs text-muted">{STATUS_LABELS[s]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
