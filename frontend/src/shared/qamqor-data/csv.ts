import type { WriteOffRequest, LocationStats } from './types';

/**
 * Экранирует значение для CSV по RFC4180.
 * Если значение содержит ;, ", или перевод строки — заключает в двойные кавычки
 * и дублирует внутренние кавычки.
 */
function escapeCsvValue(value: string | number | undefined | null): string {
  if (value === null || value === undefined) {
    return '';
  }

  const str = String(value);

  if (str.includes(';') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

/**
 * Конвертирует массив заявок на списание в CSV.
 * Разделитель: ;
 * Кодировка: UTF-8 с BOM
 */
export function requestsToCsv(requests: WriteOffRequest[]): string {
  const headers = [
    'Дата',
    'Точка',
    'Сотрудник',
    'Товар',
    'Тип',
    'Кол-во',
    'Отход %',
    'Причина',
    'Этап',
    'Смена',
    'Статус',
    'Флаги',
  ];

  const statusMap: Record<string, string> = {
    pending: 'На проверке',
    approved: 'Одобрено',
    rejected: 'Отклонено',
  };

  const typeMap: Record<string, string> = {
    unit: 'шт',
    weight: 'г',
  };

  const rows: string[] = [];

  requests.forEach((req) => {
    const date = new Date(req.timestamp);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const formattedDate = `${day}.${month}.${year}`;

    const wastePercent = req.wastePercent !== undefined ? req.wastePercent : '';
    const flags = req.flags?.join('|') || '';
    const status = statusMap[req.status] || req.status;
    const type = typeMap[req.productType] || req.productType;

    const row = [
      escapeCsvValue(formattedDate),
      escapeCsvValue(req.locationName),
      escapeCsvValue(req.employeeName),
      escapeCsvValue(req.productName),
      escapeCsvValue(type),
      escapeCsvValue(req.quantity),
      escapeCsvValue(wastePercent),
      escapeCsvValue(req.reasonLabel),
      escapeCsvValue(req.stageLabel),
      escapeCsvValue(req.shift),
      escapeCsvValue(status),
      escapeCsvValue(flags),
    ].join(';');

    rows.push(row);
  });

  const headerLine = headers.map(escapeCsvValue).join(';');
  return [headerLine, ...rows].join('\n');
}

/**
 * Конвертирует массив статистики точек в CSV.
 * Разделитель: ;
 */
export function locationsToCsv(locations: LocationStats[]): string {
  const headers = [
    'Точка',
    'Район',
    'Теор.норма',
    'Задекларировано',
    'Факт.недостача',
    'Variance %',
    'Необъяснённое',
    'Статус',
  ];

  const rows: string[] = [];

  locations.forEach((loc) => {
    const row = [
      escapeCsvValue(loc.locationName),
      escapeCsvValue(loc.district),
      escapeCsvValue(Math.round(loc.theoreticalLoss)),
      escapeCsvValue(Math.round(loc.declaredWriteOffs)),
      escapeCsvValue(Math.round(loc.actualDeficit)),
      escapeCsvValue(loc.variancePercent.toFixed(1)),
      escapeCsvValue(Math.round(loc.unexplainedDeficit)),
      escapeCsvValue(loc.status),
    ].join(';');

    rows.push(row);
  });

  const headerLine = headers.map(escapeCsvValue).join(';');
  return [headerLine, ...rows].join('\n');
}

/**
 * Скачивает CSV файл в браузере.
 * Добавляет BOM '﻿' для корректного отображения кириллицы в Excel.
 */
export function downloadCsv(filename: string, csv: string): void {
  // BOM для UTF-8 (U+FEFF в виде байтов: EF BB BF)
  const bom = '﻿';
  const content = bom + csv;

  const blob = new Blob([content], {
    type: 'text/csv;charset=utf-8;',
  });

  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}
