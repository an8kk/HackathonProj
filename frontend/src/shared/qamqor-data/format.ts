/**
 * Утилиты форматирования для Qamqor.
 * Валюта ₸ (тенге), проценты, даты на русском.
 */

/** Компактный формат суммы (K, M суффиксы). */
export function fmtMoney(n: number): string {
  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(n);

  if (abs >= 1_000_000) {
    const millions = abs / 1_000_000;
    return `${sign}₸${millions.toFixed(1).replace('.', ',')}M`;
  }

  if (abs >= 1_000) {
    const thousands = Math.round(abs / 1_000);
    return `${sign}₸${thousands}K`;
  }

  return `${sign}₸${Math.round(abs)}`;
}

/**
 * Полная сумма с разрядами через неразрывный пробел (U+00A0).
 * Пример: 1046600 -> '₸1 046 600', 812000 -> '₸812 000'
 */
export function fmtMoneyFull(n: number): string {
  const sign = n < 0 ? '-' : '';
  const abs = Math.round(Math.abs(n));
  const grouped = abs.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `${sign}₸${grouped}`;
}

/**
 * Русское склонение по числу.
 * forms: [для 1, для 2–4, для 5+]. Пример: pluralRu(3, ['точка','точки','точек']) -> 'точки'.
 */
export function pluralRu(n: number, forms: [string, string, string]): string {
  const abs = Math.abs(n) % 100;
  const mod10 = abs % 10;
  if (abs >= 11 && abs <= 14) return forms[2];
  if (mod10 === 1) return forms[0];
  if (mod10 >= 2 && mod10 <= 4) return forms[1];
  return forms[2];
}

/**
 * Форматирование процентов.
 * По умолчанию 1 десятичный знак.
 */
export function fmtPercent(n: number, digits: number = 1): string {
  return `${n.toFixed(digits)}%`;
}

/**
 * Дата из ISO строки в формат DD.MM.
 * Пример: '2026-06-27T22:14:00' -> '27.06'
 */
export function fmtDate(iso: string): string {
  try {
    const date = new Date(iso);
    if (isNaN(date.getTime())) {
      return '—';
    }
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${day}.${month}`;
  } catch {
    return '—';
  }
}

/**
 * Дата и время из ISO строки в формат DD.MM HH:MM.
 * Пример: '2026-06-27T22:14:00' -> '27.06 22:14'
 */
export function fmtDateTime(iso: string): string {
  try {
    const date = new Date(iso);
    if (isNaN(date.getTime())) {
      return '—';
    }
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${day}.${month} ${hours}:${minutes}`;
  } catch {
    return '—';
  }
}

/**
 * Тренд относительно прошлого значения.
 * Возвращает процент изменения и направление.
 * Если |изменение| < 0.5%, считается 'flat'.
 */
export function fmtDelta(value: number, prev: number): {
  pct: number;
  dir: 'up' | 'down' | 'flat';
} {
  if (prev === 0) {
    return { pct: 0, dir: 'flat' };
  }

  const change = ((value - prev) / Math.abs(prev)) * 100;
  const absPct = Math.abs(change);

  if (absPct < 0.5) {
    return { pct: 0, dir: 'flat' };
  }

  return {
    pct: Math.round(absPct),
    dir: change > 0 ? 'up' : 'down',
  };
}
