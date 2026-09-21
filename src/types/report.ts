export type ProductType = 'PMS' | 'AGO' | 'KERO';

export type PumpId =
  | 'PMS1' | 'PMS2' | 'PMS3' | 'PMS4'
  | 'AGO1' | 'AGO2' | 'AGO3' | 'AGO4' | 'AGO5' | 'AGO6'
  | 'KERO1' | 'KERO2';

export const PUMP_SEQUENCE: { id: PumpId; product: ProductType; name: string; position: number }[] = [
  { id: 'PMS1', product: 'PMS', name: 'PMS 1 (Super)', position: 1 },
  { id: 'PMS2', product: 'PMS', name: 'PMS 2 (Super)', position: 2 },
  { id: 'PMS3', product: 'PMS', name: 'PMS 3 (Super)', position: 3 },
  { id: 'PMS4', product: 'PMS', name: 'PMS 4 (Super)', position: 4 },
  { id: 'AGO1', product: 'AGO', name: 'AGO 1 (Diesel)', position: 5 },
  { id: 'AGO2', product: 'AGO', name: 'AGO 2 (Diesel)', position: 6 },
  { id: 'AGO3', product: 'AGO', name: 'AGO 3 (Diesel)', position: 7 },
  { id: 'AGO4', product: 'AGO', name: 'AGO 4 (Diesel)', position: 8 },
  { id: 'AGO5', product: 'AGO', name: 'AGO 5 (Diesel)', position: 9 },
  { id: 'AGO6', product: 'AGO', name: 'AGO 6 (Diesel)', position: 10 },
  { id: 'KERO1', product: 'KERO', name: 'KERO 1 (Kerosene)', position: 11 },
  { id: 'KERO2', product: 'KERO', name: 'KERO 2 (Kerosene)', position: 12 },
];

export const PRODUCT_CONFIG: Record<ProductType, {
  name: string;
  fullName: string;
  color: string;
  badgeBg: string;
  badgeText: string;
  borderCol: string;
  pumps: PumpId[];
}> = {
  PMS: {
    name: 'PMS',
    fullName: 'Premium Motor Spirit (Super)',
    color: '#10b981', // Emerald
    badgeBg: 'bg-emerald-500/15',
    badgeText: 'text-emerald-400',
    borderCol: 'border-emerald-500/30',
    pumps: ['PMS1', 'PMS2', 'PMS3', 'PMS4'],
  },
  AGO: {
    name: 'AGO',
    fullName: 'Automotive Gas Oil (Diesel)',
    color: '#f59e0b', // Amber
    badgeBg: 'bg-amber-500/15',
    badgeText: 'text-amber-400',
    borderCol: 'border-amber-500/30',
    pumps: ['AGO1', 'AGO2', 'AGO3', 'AGO4', 'AGO5', 'AGO6'],
  },
  KERO: {
    name: 'KERO',
    fullName: 'Kerosene',
    color: '#06b6d4', // Cyan
    badgeBg: 'bg-cyan-500/15',
    badgeText: 'text-cyan-400',
    borderCol: 'border-cyan-500/30',
    pumps: ['KERO1', 'KERO2'],
  },
};

export type OcrStatus = 'idle' | 'queued' | 'processing' | 'candidate' | 'confirmed' | 'failed';

export interface PumpReading {
  pumpId: PumpId;
  product: ProductType;
  openingMeter: number | null; // null represents missing historical record
  closingMeter: number | null;
  daySales: number;
  candidateOcrReading: number | null;
  ocrConfidence?: number;
  ocrStatus: OcrStatus;
  ocrError?: string;
  isRollover: boolean;
  rolloverCapacity?: number; // e.g. 100000
  photoDataUrl?: string;
  photoName?: string;
  photoThumbnail?: string;
  manualNotes?: string;
}

export interface StockReading {
  product: ProductType;
  openingStock: number;
  receipts: number;
  daySales: number; // auto-computed from pump sales
  theoreticalClosingStock: number;
  physicalClosingStock: number | null;
  variance: number | null;
  dipReadingMm?: number;
  photoDataUrl?: string;
}

export interface ExpenseItem {
  id: string;
  category: 'Transport' | 'Maintenance' | 'Staff/Meals' | 'Utilities' | 'Security' | 'Other';
  description: string;
  amount: number;
}

export type ReportStatus = 'Draft' | 'In Progress' | 'Ready for Review' | 'Ready to Send' | 'Sent';

export interface DailyReport {
  id: string; // key: onyx_report_YYYY-MM-DD
  date: string; // YYYY-MM-DD
  stationName: string;
  managerName: string;
  status: ReportStatus;
  createdAt: string;
  updatedAt: string;
  sentAt?: string;
  sentVia?: 'WhatsApp' | 'SMS' | 'Telegram' | 'Clipboard' | 'Export';
  pumps: Record<PumpId, PumpReading>;
  stocks: Record<ProductType, StockReading>;
  expenses: ExpenseItem[];
  notes?: string;
}

export interface ReportIndexEntry {
  id: string;
  date: string;
  status: ReportStatus;
  totalSalesLitres: number;
  totalExpensesGhs: number;
  updatedAt: string;
  sentAt?: string;
}
