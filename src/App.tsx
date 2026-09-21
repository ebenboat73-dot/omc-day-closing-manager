/**
 * OMC Manager Day Sales & Stock Reporting App
 * Version 2.0 • Onyxma Energy
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  DailyReport,
  PumpId,
  ProductType,
  PumpReading,
  StockReading,
  ExpenseItem,
  ReportStatus,
  PUMP_SEQUENCE,
  PRODUCT_CONFIG,
} from './types/report';
import {
  loadReportFromStorage,
  saveReportToStorage,
  createEmptyReport,
  findPreviousDayReport,
  initializeSampleDataIfEmpty,
  getPreviousDate,
} from './features/reports/storage';
import { ReportHeader } from './features/reports/ReportHeader';
import { MeterSequenceGrid } from './features/meters/MeterSequenceGrid';
import { StockReconciliationSection } from './features/stock/StockReconciliationSection';
import { ExpensesSection } from './features/expenses/ExpensesSection';
import { BulkUploadModal } from './features/meters/BulkUploadModal';
import { SendReportModal } from './features/sharing/SendReportModal';
import { ReportHistoryModal } from './features/reports/ReportHistoryModal';
import { PhotoPreviewModal } from './features/meters/PhotoPreviewModal';
import { SAMPLE_CLOSING_READINGS } from './features/ocr/sampleMeterImages';
import { generateStandardReportText } from './features/sharing/reportFormatter';
import { UploadCloud, Send, Fuel, Layers, Receipt, ShieldCheck } from 'lucide-react';

export default function App() {
  // Current selected report date (defaults to today or sample date)
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return '2026-09-21';
  });

  const [report, setReport] = useState<DailyReport | null>(null);
  const [previousDayReport, setPreviousDayReport] = useState<DailyReport | null>(null);
  const [isAutoSaving, setIsAutoSaving] = useState(false);

  // Modals state
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [isSendModalOpen, setIsSendModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState<{ isOpen: boolean; url: string; title: string }>({
    isOpen: false,
    url: '',
    title: '',
  });

  // Active section tab for mobile quick jumping
  const [activeTab, setActiveTab] = useState<'meters' | 'stock' | 'expenses'>('meters');

  // Load report on mount or date change
  useEffect(() => {
    initializeSampleDataIfEmpty();

    const prev = findPreviousDayReport(selectedDate);
    setPreviousDayReport(prev);

    const existing = loadReportFromStorage(selectedDate);
    if (existing) {
      setReport(existing);
    } else {
      const fresh = createEmptyReport(selectedDate, prev);
      setReport(fresh);
      saveReportToStorage(fresh);
    }
  }, [selectedDate]);

  // Debounced auto-save to LocalStorage
  const persistReport = useCallback((updatedReport: DailyReport) => {
    setIsAutoSaving(true);
    saveReportToStorage(updatedReport);
    setTimeout(() => setIsAutoSaving(false), 500);
  }, []);

  // Update a single pump and cascade recalculations
  const handleUpdatePump = (pumpId: PumpId, updated: Partial<PumpReading>) => {
    if (!report) return;

    setReport((prev) => {
      if (!prev) return null;

      const currentPump = prev.pumps[pumpId];
      const mergedPump: PumpReading = {
        ...currentPump,
        ...updated,
      };

      const newPumps = {
        ...prev.pumps,
        [pumpId]: mergedPump,
      };

      // Recalculate day sales for this pump's product
      const targetProduct = mergedPump.product;
      const productPumps = PRODUCT_CONFIG[targetProduct].pumps;
      const newProductSales = productPumps.reduce((sum, pid) => sum + (newPumps[pid]?.daySales || 0), 0);

      // Recalculate stock for that product
      const currentStock = prev.stocks[targetProduct];
      const theoreticalClosing = currentStock.openingStock + currentStock.receipts - newProductSales;
      const variance = currentStock.physicalClosingStock !== null
        ? currentStock.physicalClosingStock - theoreticalClosing
        : null;

      const newStocks: Record<ProductType, StockReading> = {
        ...prev.stocks,
        [targetProduct]: {
          ...currentStock,
          daySales: Math.round(newProductSales * 100) / 100,
          theoreticalClosingStock: theoreticalClosing,
          variance: variance !== null ? Math.round(variance * 10) / 10 : null,
        },
      };

      // Auto-advance status from Draft to In Progress if closing readings are entered
      let nextStatus = prev.status;
      if (nextStatus === 'Draft' && mergedPump.closingMeter !== null) {
        nextStatus = 'In Progress';
      }

      const nextReport: DailyReport = {
        ...prev,
        status: nextStatus,
        pumps: newPumps,
        stocks: newStocks,
      };

      persistReport(nextReport);
      return nextReport;
    });
  };

  // Batch apply readings from Bulk Upload / OCR
  const handleApplyBulkReadings = (readings: Record<PumpId, Partial<PumpReading>>) => {
    if (!report) return;

    setReport((prev) => {
      if (!prev) return null;

      const newPumps = { ...prev.pumps };

      Object.entries(readings).forEach(([pid, partial]) => {
        const id = pid as PumpId;
        newPumps[id] = {
          ...newPumps[id],
          ...partial,
        };
      });

      // Recalculate all 3 products
      const newStocks = { ...prev.stocks };
      (['PMS', 'AGO', 'KERO'] as const).forEach((prod) => {
        const pPumps = PRODUCT_CONFIG[prod].pumps;
        const totalSales = pPumps.reduce((sum, pid) => sum + (newPumps[pid]?.daySales || 0), 0);
        const curStock = newStocks[prod];
        const theoretical = curStock.openingStock + curStock.receipts - totalSales;
        const variance = curStock.physicalClosingStock !== null ? curStock.physicalClosingStock - theoretical : null;

        newStocks[prod] = {
          ...curStock,
          daySales: Math.round(totalSales * 100) / 100,
          theoreticalClosingStock: theoretical,
          variance: variance !== null ? Math.round(variance * 10) / 10 : null,
        };
      });

      const nextReport: DailyReport = {
        ...prev,
        status: 'Ready for Review',
        pumps: newPumps,
        stocks: newStocks,
      };

      persistReport(nextReport);
      return nextReport;
    });
  };

  // Update stock readings
  const handleUpdateStock = (prod: ProductType, updated: Partial<StockReading>) => {
    if (!report) return;

    setReport((prev) => {
      if (!prev) return null;

      const newStocks = {
        ...prev.stocks,
        [prod]: {
          ...prev.stocks[prod],
          ...updated,
        },
      };

      const nextReport: DailyReport = {
        ...prev,
        stocks: newStocks,
      };

      persistReport(nextReport);
      return nextReport;
    });
  };

  // Update expenses
  const handleUpdateExpenses = (expenses: ExpenseItem[]) => {
    if (!report) return;

    setReport((prev) => {
      if (!prev) return null;

      const nextReport: DailyReport = {
        ...prev,
        expenses,
      };

      persistReport(nextReport);
      return nextReport;
    });
  };

  // Load complete sample dataset matching PRD Appendix A
  const handleLoadSampleData = () => {
    if (!report) return;

    const newPumps = { ...report.pumps };

    PUMP_SEQUENCE.forEach(({ id }) => {
      const closing = SAMPLE_CLOSING_READINGS[id];
      const opening = newPumps[id].openingMeter ?? (closing - 850);
      const sales = Math.max(0, closing - opening);

      newPumps[id] = {
        ...newPumps[id],
        openingMeter: opening,
        closingMeter: closing,
        daySales: Math.round(sales * 100) / 100,
        ocrStatus: 'confirmed',
      };
    });

    // Reconcile stocks according to Appendix A figures
    const pmsSales = ['PMS1', 'PMS2', 'PMS3', 'PMS4'].reduce((sum, p) => sum + newPumps[p as PumpId].daySales, 0);
    const agoSales = ['AGO1', 'AGO2', 'AGO3', 'AGO4', 'AGO5', 'AGO6'].reduce((sum, p) => sum + newPumps[p as PumpId].daySales, 0);
    const keroSales = ['KERO1', 'KERO2'].reduce((sum, p) => sum + newPumps[p as PumpId].daySales, 0);

    const newStocks: Record<ProductType, StockReading> = {
      PMS: {
        product: 'PMS',
        openingStock: 16420 + 3530 - 3450, // 16500 theoretical
        receipts: 3450.20,
        daySales: Math.round(pmsSales * 100) / 100,
        theoreticalClosingStock: 16500,
        physicalClosingStock: 16420,
        variance: -80,
      },
      AGO: {
        product: 'AGO',
        openingStock: 24150,
        receipts: 5610.90,
        daySales: Math.round(agoSales * 100) / 100,
        theoreticalClosingStock: 24150,
        physicalClosingStock: 24100,
        variance: -50,
      },
      KERO: {
        product: 'KERO',
        openingStock: 5100,
        receipts: 420.50,
        daySales: Math.round(keroSales * 100) / 100,
        theoreticalClosingStock: 5100,
        physicalClosingStock: 5120,
        variance: 20,
      },
    };

    const newExpenses: ExpenseItem[] = [
      { id: 'exp_1', category: 'Transport', description: 'Transport', amount: 50 },
      { id: 'exp_2', category: 'Maintenance', description: 'Maintenance', amount: 120 },
      { id: 'exp_3', category: 'Other', description: 'Other', amount: 30 },
    ];

    const nextReport: DailyReport = {
      ...report,
      status: 'Ready to Send',
      pumps: newPumps,
      stocks: newStocks,
      expenses: newExpenses,
    };

    setReport(nextReport);
    persistReport(nextReport);
  };

  const handleUpdateStatus = (newStatus: ReportStatus, sentVia?: any) => {
    if (!report) return;

    const nextReport: DailyReport = {
      ...report,
      status: newStatus,
      sentAt: newStatus === 'Sent' ? new Date().toISOString() : report.sentAt,
      sentVia: sentVia || report.sentVia,
    };

    setReport(nextReport);
    persistReport(nextReport);
  };

  if (!report) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center">
        <div className="text-center space-y-2">
          <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-slate-400">Loading station report...</p>
        </div>
      </div>
    );
  }

  const previousDateStr = previousDayReport?.date;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      
      {/* Top Application Header */}
      <ReportHeader
        report={report}
        previousDayFound={!!previousDayReport}
        previousDateStr={previousDateStr}
        onDateChange={setSelectedDate}
        onOpenHistory={() => setIsHistoryModalOpen(true)}
        onOpenBulkUpload={() => setIsBulkModalOpen(true)}
        onOpenReview={() => setIsSendModalOpen(true)}
        onLoadSampleData={handleLoadSampleData}
        isAutoSaving={isAutoSaving}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-8 pb-24 lg:pb-12">
        
        {/* Navigation Tabs for quick section jumping */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-900/90 rounded-xl border border-slate-800 w-full sm:w-fit overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('meters')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
              activeTab === 'meters'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Fuel className="w-4 h-4" />
            <span>1. Pump Meters & Sales (12)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('stock')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
              activeTab === 'stock'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>2. Stock Dipping & Variance</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('expenses')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
              activeTab === 'expenses'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Receipt className="w-4 h-4" />
            <span>3. Station Expenses</span>
          </button>
        </div>

        {/* Section 1: Meter Readings & Sales */}
        <div className={activeTab === 'meters' ? 'block' : 'hidden lg:block'}>
          <MeterSequenceGrid
            report={report}
            onUpdatePump={handleUpdatePump}
            onOpenBulkUpload={() => setIsBulkModalOpen(true)}
            onPreviewPhoto={(url, title) => setPreviewPhoto({ isOpen: true, url, title })}
          />
        </div>

        {/* Section 2: Stock Dipping & Variance */}
        <div className={activeTab === 'stock' ? 'block' : 'hidden lg:block'}>
          <StockReconciliationSection
            report={report}
            onUpdateStock={handleUpdateStock}
          />
        </div>

        {/* Section 3: Expenses */}
        <div className={activeTab === 'expenses' ? 'block' : 'hidden lg:block'}>
          <ExpensesSection
            expenses={report.expenses}
            onUpdateExpenses={handleUpdateExpenses}
          />
        </div>

        {/* Quick Review & Dispatch Banner at bottom of page */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 rounded-2xl border border-slate-800 p-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
          <div>
            <h3 className="font-bold text-base text-slate-100 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <span>Report Ready for Final Operational Dispatch?</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1 max-w-xl">
              Inspect Appendix A standardized text format, execute completion integrity checks, and broadcast via WhatsApp, Telegram, or SMS directly to OMC management.
            </p>
          </div>

          <button
            type="button"
            id="btn-bottom-review-send"
            onClick={() => setIsSendModalOpen(true)}
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25 transition-all transform active:scale-98 shrink-0"
          >
            <Send className="w-4 h-4" />
            <span>Review & Broadcast Report</span>
          </button>
        </div>

      </main>

      {/* Floating Bottom Action Bar for Mobile */}
      <div className="fixed bottom-0 inset-x-0 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 p-3 flex lg:hidden items-center justify-between gap-2 z-20">
        <button
          type="button"
          onClick={() => setIsBulkModalOpen(true)}
          className="flex-1 py-2.5 px-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-blue-600/20"
        >
          <UploadCloud className="w-4 h-4" />
          <span>Bulk Upload</span>
        </button>

        <button
          type="button"
          onClick={() => setIsSendModalOpen(true)}
          className="flex-1 py-2.5 px-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/20"
        >
          <Send className="w-4 h-4" />
          <span>Review & Send</span>
        </button>
      </div>

      {/* Modals */}
      <BulkUploadModal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        report={report}
        onApplyReadings={handleApplyBulkReadings}
        onPreviewPhoto={(url, title) => setPreviewPhoto({ isOpen: true, url, title })}
      />

      <SendReportModal
        isOpen={isSendModalOpen}
        onClose={() => setIsSendModalOpen(false)}
        report={report}
        onUpdateStatus={handleUpdateStatus}
      />

      <ReportHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        currentDate={selectedDate}
        onSelectDate={setSelectedDate}
        onNewReport={(newDate) => {
          setSelectedDate(newDate);
        }}
        onSeedSample={() => {
          initializeSampleDataIfEmpty();
          const prev = findPreviousDayReport(selectedDate);
          setPreviousDayReport(prev);
          if (prev) {
            const fresh = createEmptyReport(selectedDate, prev);
            setReport(fresh);
            saveReportToStorage(fresh);
          }
        }}
      />

      <PhotoPreviewModal
        isOpen={previewPhoto.isOpen}
        onClose={() => setPreviewPhoto({ isOpen: false, url: '', title: '' })}
        imageUrl={previewPhoto.url}
        title={previewPhoto.title}
      />

      {/* Hidden printable receipt sheet for window.print() */}
      <div className="hidden print-only p-6 font-mono text-black bg-white">
        <pre className="text-xs leading-relaxed whitespace-pre-wrap">
          {generateStandardReportText(report)}
        </pre>
      </div>

    </div>
  );
}
