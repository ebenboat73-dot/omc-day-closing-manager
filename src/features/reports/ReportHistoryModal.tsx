import React from 'react';
import { ReportIndexEntry } from '../../types/report';
import { getReportsIndex } from './storage';
import { X, Calendar, ArrowRight, CheckCircle2, Clock, Trash2, PlusCircle, Sparkles } from 'lucide-react';
import { formatReportDate } from '../sharing/reportFormatter';

interface ReportHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentDate: string;
  onSelectDate: (date: string) => void;
  onNewReport: (date: string) => void;
  onSeedSample: () => void;
}

export const ReportHistoryModal: React.FC<ReportHistoryModalProps> = ({
  isOpen,
  onClose,
  currentDate,
  onSelectDate,
  onNewReport,
  onSeedSample,
}) => {
  if (!isOpen) return null;

  const reports = getReportsIndex();

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden my-auto">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-800/50">
          <div>
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-amber-400" />
              <span>Report History & Archival</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Access past daily shift logs. Historical closing meters automatically feed the next day's opening meters.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* List of Reports */}
        <div className="p-5 overflow-y-auto space-y-3 flex-1">
          {reports.length === 0 ? (
            <div className="py-12 text-center space-y-3 border border-dashed border-slate-800 rounded-xl p-6">
              <Clock className="w-10 h-10 text-slate-500 mx-auto" />
              <p className="text-sm text-slate-300 font-semibold">No saved station reports found</p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Reports are saved to local storage with keys like <code className="text-slate-400">onyx_report_2026-09-21</code>.
              </p>
              <button
                type="button"
                onClick={onSeedSample}
                className="mt-2 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold inline-flex items-center gap-1.5 transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Seed Sample History (Yesterday's Shift)</span>
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {reports.map((item) => {
                const isSelected = item.date === currentDate;

                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      onSelectDate(item.date);
                      onClose();
                    }}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between group ${
                      isSelected
                        ? 'bg-amber-500/10 border-amber-500/40 ring-1 ring-amber-500/30'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs font-mono-numbers shrink-0 ${
                          isSelected ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {item.date.split('-')[2]}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-slate-100">
                            {formatReportDate(item.date)}
                          </span>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                              item.status === 'Sent'
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {item.status}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 text-xs text-slate-400 mt-1 font-mono-numbers">
                          <span>Sales: <strong className="text-slate-200">{item.totalSalesLitres.toLocaleString()}L</strong></span>
                          <span>•</span>
                          <span>Expenses: <strong className="text-slate-200">GHS {item.totalExpensesGhs.toLocaleString()}</strong></span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {isSelected ? (
                        <span className="text-xs text-amber-400 font-semibold px-2 py-1 rounded bg-amber-500/10">
                          Active
                        </span>
                      ) : (
                        <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-slate-200 group-hover:translate-x-0.5 transition-all" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 border-t border-slate-800 bg-slate-800/40 flex items-center justify-between">
          <button
            type="button"
            onClick={onSeedSample}
            className="text-xs text-slate-400 hover:text-amber-300 flex items-center gap-1.5 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Reset Sample Data</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onNewReport(todayStr);
              onClose();
            }}
            className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            <span>New Report for Today</span>
          </button>
        </div>

      </div>
    </div>
  );
};
