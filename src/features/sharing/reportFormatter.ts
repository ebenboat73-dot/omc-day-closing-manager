import { DailyReport, ProductType } from '../../types/report';

export function formatNumberWithCommas(val: number | null | undefined, decimals = 2): string {
  if (val === null || val === undefined || isNaN(val)) return '—';
  return val.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatVariance(val: number | null | undefined): string {
  if (val === null || val === undefined || isNaN(val)) return '—L';
  const sign = val > 0 ? '+' : '';
  return `${sign}${val.toLocaleString('en-US', { maximumFractionDigits: 1 })}L`;
}

export function formatReportDate(dateStr: string): string {
  try {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

/**
 * Generates the standardized OMC Daily Station Report string
 * conforming strictly to Appendix A of the PRD.
 */
export function generateStandardReportText(report: DailyReport): string {
  const formattedDate = formatReportDate(report.date);

  // PMS Section
  const pmsPumps = ['PMS1', 'PMS2', 'PMS3', 'PMS4'] as const;
  const pmsMeters = pmsPumps
    .map((p) => {
      const val = report.pumps[p]?.closingMeter;
      const formatted = val !== null && val !== undefined ? `${formatNumberWithCommas(val, 2)}L` : '…L';
      return `${p} Closing Meter ${formatted}`;
    })
    .join('; ');

  const pmsTotalSales = pmsPumps.reduce((sum, p) => sum + (report.pumps[p]?.daySales || 0), 0);
  const pmsStock = report.stocks.PMS;
  const pmsPhysical = pmsStock.physicalClosingStock !== null
    ? `${pmsStock.physicalClosingStock.toLocaleString('en-US')}L`
    : '…L';
  const pmsTheoretical = `${Math.round(pmsStock.theoreticalClosingStock).toLocaleString('en-US')}L`;
  const pmsVariance = formatVariance(pmsStock.variance);

  const pmsLine = `PMS: ${pmsMeters}. Total PMS Sales: ${formatNumberWithCommas(pmsTotalSales, 2)}L. Physical Stock: ${pmsPhysical}. Theoretical Stock: ${pmsTheoretical}. Variance: ${pmsVariance}.`;

  // AGO Section
  const agoPumps = ['AGO1', 'AGO2', 'AGO3', 'AGO4', 'AGO5', 'AGO6'] as const;
  const agoMeters = agoPumps
    .map((p) => {
      const val = report.pumps[p]?.closingMeter;
      const formatted = val !== null && val !== undefined ? `${formatNumberWithCommas(val, 2)}L` : '…L';
      return `${p} Closing Meter ${formatted}`;
    })
    .join('; ');

  const agoTotalSales = agoPumps.reduce((sum, p) => sum + (report.pumps[p]?.daySales || 0), 0);
  const agoStock = report.stocks.AGO;
  const agoPhysical = agoStock.physicalClosingStock !== null
    ? `${agoStock.physicalClosingStock.toLocaleString('en-US')}L`
    : '…L';
  const agoTheoretical = `${Math.round(agoStock.theoreticalClosingStock).toLocaleString('en-US')}L`;
  const agoVariance = formatVariance(agoStock.variance);

  const agoLine = `AGO: ${agoMeters}. Total AGO Sales: ${formatNumberWithCommas(agoTotalSales, 2)}L. Physical Stock: ${agoPhysical}. Theoretical Stock: ${agoTheoretical}. Variance: ${agoVariance}.`;

  // KERO Section
  const keroPumps = ['KERO1', 'KERO2'] as const;
  const keroMeters = keroPumps
    .map((p) => {
      const val = report.pumps[p]?.closingMeter;
      const formatted = val !== null && val !== undefined ? `${formatNumberWithCommas(val, 2)}L` : '…L';
      return `${p} Closing Meter ${formatted}`;
    })
    .join('; ');

  const keroTotalSales = keroPumps.reduce((sum, p) => sum + (report.pumps[p]?.daySales || 0), 0);
  const keroStock = report.stocks.KERO;
  const keroPhysical = keroStock.physicalClosingStock !== null
    ? `${keroStock.physicalClosingStock.toLocaleString('en-US')}L`
    : '…L';
  const keroTheoretical = `${Math.round(keroStock.theoreticalClosingStock).toLocaleString('en-US')}L`;
  const keroVariance = formatVariance(keroStock.variance);

  const keroLine = `KERO: ${keroMeters}. Total KERO Sales: ${formatNumberWithCommas(keroTotalSales, 2)}L. Physical Stock: ${keroPhysical}. Theoretical Stock: ${keroTheoretical}. Variance: ${keroVariance}.`;

  // Expenses Section
  const expenseItems = report.expenses
    .filter((e) => e.amount > 0 || e.description.trim() !== '')
    .map((e) => `${e.description || e.category} — GHS ${formatNumberWithCommas(e.amount, 2)}`)
    .join('; ');

  const totalExpenses = report.expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const expensesLine = expenseItems
    ? `EXPENSES: ${expenseItems}. Total Expenses: GHS ${formatNumberWithCommas(totalExpenses, 2)}.`
    : `EXPENSES: None recorded. Total Expenses: GHS 0.00.`;

  // Status line
  const statusLine = `STATUS: ${report.status}`;

  return [
    `ONYXMA DAILY STATION REPORT — ${formattedDate}`,
    '',
    pmsLine,
    '',
    agoLine,
    '',
    keroLine,
    '',
    expensesLine,
    '',
    statusLine,
  ].join('\n');
}

export function getShareUrls(reportText: string) {
  const encoded = encodeURIComponent(reportText);
  return {
    whatsapp: `https://api.whatsapp.com/send?text=${encoded}`,
    telegram: `https://t.me/share/url?text=${encoded}`,
    sms: `sms:?body=${encoded}`,
  };
}
