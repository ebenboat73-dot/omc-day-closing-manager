import React from 'react';
import { DailyReport, ReportStatus } from '../../types/report';
import { formatReportDate } from '../sharing/reportFormatter';
import { Calendar, History, Sparkles, AlertCircle, CheckCircle2, Send, Save } from 'lucide-react';

interface ReportHeaderProps {
  report: DailyReport;
  previousDayFound: boolean;
  previousDateStr?: string;
  onDateChange: (newDate: string) => void;
  onOpenHistory: () => void;
  onOpenBulkUpload: () => void;
  onOpenReview: () => void;
  onLoadSampleData: () => void;
  isAutoSaving?: boolean;
}

const STATUS_COLORS: Record<ReportStatus, { bg: string; text: string; border: string }> = {
  Draft: { bg: 'bg-slate-700/60', text: 'text-slate-300', border: 'border-slate-600' },
  'In Progress': { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/40' },
  'Ready for Review': { bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/40' },
  'Ready to Send': { bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/40' },
  Sent: { bg: 'bg-purple-500/20', text: 'text-purple-300', border: 'border-purple-500/40' },
};

export const ReportHeader: React.FC<ReportHeaderProps> = ({
  report,
  previousDayFound,
  previousDateStr,
  onDateChange,
  onOpenHistory,
  onOpenBulkUpload,
  onOpenReview,
  onLoadSampleData,
  isAutoSaving = false,
}) => {
  const statusStyle = STATUS_COLORS[report.status] || STATUS_COLORS.Draft;

  // Calculate quick metrics
  let totalSales = 0;
  let missingClosingCount = 0;
  let missingOpeningCount = 0;

  Object.values(report.pumps).forEach((p) => {
    totalSales += p.daySales || 0;
    if (p.closingMeter === null) missingClosingCount++;
    if (p.openingMeter === null) missingOpeningCount++;
  });

  const totalExpenses = report.expenses.reduce((sum, e) => sum + (e.amount || 0), 0);

  return (
    <header className="bg-slate-900/90 backdrop-blur-md border-b border-slate-800 sticky top-0 z-30 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          
          {/* Brand & Station Info */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-md shadow-amber-500/20 ring-1 ring-amber-400/40">
                <span className="font-extrabold text-slate-950 text-xl tracking-tight">O</span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="font-bold text-lg text-slate-100 tracking-tight leading-none">
                    ONYXMA ENERGY
                  </h1>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}>
                    {report.status}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
                  <span>Central Station Forecourt</span>
                  <span>•</span>
                  <span>PMS 1-4 • AGO 1-6 • KERO 1-2</span>
                  {isAutoSaving && (
                    <span className="inline-flex items-center text-amber-400 text-[11px] gap-1 animate-pulse ml-1">
                      <Save className="w-3 h-3" /> Saving...
                    </span>
                  )}
                </p>
              </div>
            </div>

            {/* Mobile History / Actions trigger */}
            <div className="flex lg:hidden items-center gap-1.5">
              <button
                id="btn-mobile-history"
                onClick={onOpenHistory}
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs flex items-center gap-1"
                title="Report History"
              >
                <History className="w-4 h-4 text-slate-300" />
              </button>
              <button
                id="btn-mobile-review"
                onClick={onOpenReview}
                className="px-3 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1 shadow-md shadow-amber-500/20"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Review</span>
              </button>
            </div>
          </div>

          {/* Date Selector & Carry-forward Status */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center bg-slate-800/90 rounded-lg border border-slate-700/80 px-2.5 py-1.5 shadow-inner">
              <Calendar className="w-4 h-4 text-amber-400 mr-2 shrink-0" />
              <input
                id="input-reporting-date"
                type="date"
                value={report.date}
                onChange={(e) => e.target.value && onDateChange(e.target.value)}
                className="bg-transparent text-sm text-slate-200 font-mono-numbers focus:outline-none cursor-pointer"
              />
            </div>

            {/* Carry-Forward Indicator */}
            {previousDayFound ? (
              <div 
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-950/60 border border-emerald-800/60 text-emerald-300 text-xs font-medium"
                title={`Yesterday's closing readings loaded as opening meters from ${previousDateStr}`}
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Opening Meters Carried Forward</span>
              </div>
            ) : (
              <div 
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-950/50 border border-amber-800/60 text-amber-300 text-xs font-medium cursor-help"
                title="No previous day report found. Opening meters marked as missing until manually entered or loaded from test data."
              >
                <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>No Prior Report Found</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="hidden lg:flex items-center gap-2">
              <button
                id="btn-sample-data"
                onClick={onLoadSampleData}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-medium flex items-center gap-1.5 transition-colors"
                title="Populate test readings matching PRD Appendix A"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Load Sample Data</span>
              </button>

              <button
                id="btn-report-history"
                onClick={onOpenHistory}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-medium flex items-center gap-1.5 transition-colors"
              >
                <History className="w-3.5 h-3.5 text-slate-400" />
                <span>History</span>
              </button>

              <button
                id="btn-bulk-upload-top"
                onClick={onOpenBulkUpload}
                className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-blue-600/20 transition-all"
              >
                <span>Bulk Meter Photos & OCR</span>
              </button>

              <button
                id="btn-review-top"
                onClick={onOpenReview}
                className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 shadow-md shadow-amber-500/20 transition-all"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Review & Send</span>
              </button>
            </div>
          </div>
        </div>

        {/* Live Metrics Bar */}
        <div className="mt-3 pt-3 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
          <div className="bg-slate-800/50 rounded-lg p-2 border border-slate-800 flex flex-col">
            <span className="text-slate-400 text-[11px] uppercase tracking-wider font-semibold">Total Day Sales</span>
            <span className="font-mono-numbers text-base font-bold text-amber-400">
              {totalSales.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-xs font-normal text-slate-400">L</span>
            </span>
          </div>

          <div className="bg-slate-800/50 rounded-lg p-2 border border-slate-800 flex flex-col">
            <span className="text-slate-400 text-[11px] uppercase tracking-wider font-semibold">Meters Completed</span>
            <div className="flex items-center gap-1.5">
              <span className="font-mono-numbers text-base font-bold text-slate-100">
                {12 - missingClosingCount} / 12
              </span>
              {missingClosingCount > 0 ? (
                <span className="text-[10px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                  {missingClosingCount} pending
                </span>
              ) : (
                <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                  All done
                </span>
              )}
            </div>
          </div>

          <div className="bg-slate-800/50 rounded-lg p-2 border border-slate-800 flex flex-col">
            <span className="text-slate-400 text-[11px] uppercase tracking-wider font-semibold">Opening Records</span>
            <div className="flex items-center gap-1.5">
              <span className="font-mono-numbers text-base font-bold text-slate-100">
                {12 - missingOpeningCount} / 12
              </span>
              {missingOpeningCount > 0 ? (
                <span className="text-[10px] text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded border border-red-500/20">
                  {missingOpeningCount} missing
                </span>
              ) : (
                <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                  Carried fwd
                </span>
              )}
            </div>
          </div>

          <div className="bg-slate-800/50 rounded-lg p-2 border border-slate-800 flex flex-col">
            <span className="text-slate-400 text-[11px] uppercase tracking-wider font-semibold">Total Expenses</span>
            <span className="font-mono-numbers text-base font-bold text-slate-100">
              GHS {totalExpenses.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>

      </div>
    </header>
  );
};
