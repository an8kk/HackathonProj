import type { LocationStatus } from './types';

/** Бренд-палитра Qamqor (синхронизирована с tailwind.config.js и index.css). */
export const C = {
  ink: '#141210',
  amber: '#F5A300',
  amberDark: '#C47F00',
  red: '#D62828',
  green: '#2E7D32',
  offwhite: '#F6F3EE',
  text: '#33312E',
  muted: '#8C8780',
  faint: '#B8B4AF',
  line: '#F0EDE9',
} as const;

/** Цвет по порогам AvT variance: <2% норма, 2–3% расследовать, >3% хищение. */
export function varianceColor(v: number): string {
  if (v < 2) return C.green;
  if (v < 3) return C.amber;
  return C.red;
}

export function statusColor(status: LocationStatus): string {
  if (status === 'green') return C.green;
  if (status === 'amber') return C.amber;
  return C.red;
}
