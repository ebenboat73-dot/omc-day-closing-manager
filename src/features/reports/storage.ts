import { DailyReport, ReportIndexEntry, PumpId, ProductType, PUMP_SEQUENCE, PumpReading, StockReading } from '../../types/report';

const STORAGE_PREFIX = 'onyx_report_';
const INDEX_KEY = 'onyx_reports_index';
const CURRENT_DATE_KEY = 'onyx_current_report_date';

export function getReportStorageKey(date: string): string {
  return `${STORAGE_PREFIX}${date}`;
}

export function createEmptyReport(date: string, previousReport?: DailyReport | null): DailyReport {
  const pumps: Record<PumpId, PumpReading> = {} as Record<PumpId, PumpReading>;

  PUMP_SEQUENCE.forEach(({ id, product }) => {
    const prevClosing = previousReport?.pumps[id]?.closingMeter;
    pumps[id] = {
      pumpId: id,
      product,
      openingMeter: prevClosing !== undefined ? prevClosing : null, // null if missing
      closingMeter: null,
      daySales: 0,
      candidateOcrReading: null,
      ocrStatus: 'idle',
      isRollover: false,
      rolloverCapacity: 100000,
    };
  });

  const stocks: Record<ProductType, StockReading> = {
    PMS: {
      product: 'PMS',
      openingStock: previousReport?.stocks.PMS?.physicalClosingStock ?? 15000,
      receipts: 0,
      daySales: 0,
      theoreticalClosingStock: previousReport?.stocks.PMS?.physicalClosingStock ?? 15000,
      physicalClosingStock: null,
      variance: null,
    },
    AGO: {
      product: 'AGO',
      openingStock: previousReport?.stocks.AGO?.physicalClosingStock ?? 22000,
      receipts: 0,
      daySales: 0,
      theoreticalClosingStock: previousReport?.stocks.AGO?.physicalClosingStock ?? 22000,
      physicalClosingStock: null,
      variance: null,
    },
    KERO: {
      product: 'KERO',
      openingStock: previousReport?.stocks.KERO?.physicalClosingStock ?? 5000,
      receipts: 0,
      daySales: 0,
      theoreticalClosingStock: previousReport?.stocks.KERO?.physicalClosingStock ?? 5000,
      physicalClosingStock: null,
      variance: null,
    },
  };

  return {
    id: getReportStorageKey(date),
    date,
    stationName: 'ONYXMA ENERGY — CENTRAL STATION',
    managerName: 'Station Manager',
    status: 'Draft',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    pumps,
    stocks,
    expenses: [
      { id: 'exp_1', category: 'Transport', description: 'Transport', amount: 50 },
      { id: 'exp_2', category: 'Maintenance', description: 'Maintenance', amount: 120 },
      { id: 'exp_3', category: 'Other', description: 'Other', amount: 30 },
    ],
  };
}

export function saveReportToStorage(report: DailyReport): void {
  try {
    const key = getReportStorageKey(report.date);
    const updatedReport: DailyReport = {
      ...report,
      updatedAt: new Date().toISOString(),
    };
    
    localStorage.setItem(key, JSON.stringify(updatedReport));
    localStorage.setItem(CURRENT_DATE_KEY, report.date);

    // Update index
    const index = getReportsIndex();
    const existingIdx = index.findIndex((i) => i.date === report.date);
    
    // Calculate total sales
    let totalSales = 0;
    Object.values(report.pumps).forEach((p) => {
      totalSales += p.daySales || 0;
    });

    const totalExpenses = report.expenses.reduce((sum, e) => sum + (e.amount || 0), 0);

    const entry: ReportIndexEntry = {
      id: key,
      date: report.date,
      status: report.status,
      totalSalesLitres: Math.round(totalSales * 100) / 100,
      totalExpensesGhs: Math.round(totalExpenses * 100) / 100,
      updatedAt: updatedReport.updatedAt,
      sentAt: report.sentAt,
    };

    if (existingIdx >= 0) {
      index[existingIdx] = entry;
    } else {
      index.push(entry);
    }

    // Sort newest first
    index.sort((a, b) => b.date.localeCompare(a.date));
    localStorage.setItem(INDEX_KEY, JSON.stringify(index));
  } catch (err) {
    console.error('Failed to save report to localStorage', err);
  }
}

export function loadReportFromStorage(date: string): DailyReport | null {
  try {
    const key = getReportStorageKey(date);
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as DailyReport;
  } catch (err) {
    console.error('Failed to load report from localStorage', err);
    return null;
  }
}

export function getReportsIndex(): ReportIndexEntry[] {
  try {
    const raw = localStorage.getItem(INDEX_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as ReportIndexEntry[];
  } catch {
    return [];
  }
}

export function getPreviousDate(dateStr: string): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
}

export function findPreviousDayReport(currentDate: string): DailyReport | null {
  // First check exact previous calendar day
  const prevDate = getPreviousDate(currentDate);
  const exactPrev = loadReportFromStorage(prevDate);
  if (exactPrev) return exactPrev;

  // Otherwise, find the most recent saved report strictly before current date
  const index = getReportsIndex();
  const prior = index.filter((e) => e.date < currentDate);
  if (prior.length > 0) {
    return loadReportFromStorage(prior[0].date);
  }

  return null;
}

export function initializeSampleDataIfEmpty(): void {
  const index = getReportsIndex();
  if (index.length === 0) {
    // Seed yesterday's report (e.g., 2026-09-20) with realistic closing meter readings
    // so today's opening meters are populated smoothly
    const prevDate = '2026-09-20';
    const samplePrev = createEmptyReport(prevDate);
    samplePrev.status = 'Sent';
    samplePrev.sentAt = '2026-09-20T21:45:00.000Z';
    samplePrev.sentVia = 'WhatsApp';

    // Prior closing readings based on the appendix & realistic forecourt numbers
    samplePrev.pumps['PMS1'].openingMeter = 30100.00;
    samplePrev.pumps['PMS1'].closingMeter = 30945.20;
    samplePrev.pumps['PMS1'].daySales = 845.20;

    samplePrev.pumps['PMS2'].openingMeter = 28400.00;
    samplePrev.pumps['PMS2'].closingMeter = 29200.00;
    samplePrev.pumps['PMS2'].daySales = 800.00;

    samplePrev.pumps['PMS3'].openingMeter = 30510.00;
    samplePrev.pumps['PMS3'].closingMeter = 31420.10;
    samplePrev.pumps['PMS3'].daySales = 910.10;

    samplePrev.pumps['PMS4'].openingMeter = 28955.70;
    samplePrev.pumps['PMS4'].closingMeter = 29850.60;
    samplePrev.pumps['PMS4'].daySales = 894.90;

    samplePrev.pumps['AGO1'].openingMeter = 44250.00;
    samplePrev.pumps['AGO1'].closingMeter = 45100.00;
    samplePrev.pumps['AGO1'].daySales = 850.00;

    samplePrev.pumps['AGO2'].openingMeter = 51400.00;
    samplePrev.pumps['AGO2'].closingMeter = 52320.50;
    samplePrev.pumps['AGO2'].daySales = 920.50;

    samplePrev.pumps['AGO3'].openingMeter = 38020.00;
    samplePrev.pumps['AGO3'].closingMeter = 38900.00;
    samplePrev.pumps['AGO3'].daySales = 880.00;

    samplePrev.pumps['AGO4'].openingMeter = 40150.00;
    samplePrev.pumps['AGO4'].closingMeter = 41200.10;
    samplePrev.pumps['AGO4'].daySales = 1050.10;

    samplePrev.pumps['AGO5'].openingMeter = 38900.00;
    samplePrev.pumps['AGO5'].closingMeter = 39810.00;
    samplePrev.pumps['AGO5'].daySales = 910.00;

    samplePrev.pumps['AGO6'].openingMeter = 43150.30;
    samplePrev.pumps['AGO6'].closingMeter = 44150.30;
    samplePrev.pumps['AGO6'].daySales = 1000.00;

    samplePrev.pumps['KERO1'].openingMeter = 12240.00;
    samplePrev.pumps['KERO1'].closingMeter = 12450.00;
    samplePrev.pumps['KERO1'].daySales = 210.00;

    samplePrev.pumps['KERO2'].openingMeter = 10670.00;
    samplePrev.pumps['KERO2'].closingMeter = 10880.20;
    samplePrev.pumps['KERO2'].daySales = 210.20;

    samplePrev.stocks.PMS.physicalClosingStock = 16420;
    samplePrev.stocks.AGO.physicalClosingStock = 24100;
    samplePrev.stocks.KERO.physicalClosingStock = 5120;

    saveReportToStorage(samplePrev);
  }
}
