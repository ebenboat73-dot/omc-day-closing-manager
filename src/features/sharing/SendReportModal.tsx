import React, { useState } from 'react';
import { DailyReport, ReportStatus, PUMP_SEQUENCE, PRODUCT_CONFIG } from '../../types/report';
import { generateStandardReportText, getShareUrls } from './reportFormatter';
import {
  X,
  Send,
  Copy,
  Check,
  AlertTriangle,
  CheckCircle2,
  Share2,
  MessageSquare,
  FileText,
  Download,
  Printer,
  Sparkles,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface SendReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: DailyReport;
  onUpdateStatus: (status: ReportStatus, sentVia?: any) => void;
}

interface ValidationCheck {
  id: string;
  label: string;
  passed: boolean;
  severity: 'error' | 'warning';
  message: string;
}

export const SendReportModal: React.FC<SendReportModalProps> = ({
  isOpen,
  onClose,
  report,
  onUpdateStatus,
}) => {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'review' | 'preview'>('review');

  if (!isOpen) return null;

  // Perform PRD Section 17 completion checks
  const checks: ValidationCheck[] = [];

  // 1. Missing opening meters
  const missingOpenings = PUMP_SEQUENCE.filter((p) => report.pumps[p.id]?.openingMeter === null);
  checks.push({
    id: 'opening-meters',
    label: 'Opening Meter Carryforward',
    passed: missingOpenings.length === 0,
    severity: 'warning',
    message:
      missingOpenings.length === 0
        ? 'All 12 pumps have verified opening readings.'
        : `${missingOpenings.length} pump(s) missing opening readings: ${missingOpenings.map((p) => p.id).join(', ')}`,
  });

  // 2. Missing closing meters
  const missingClosings = PUMP_SEQUENCE.filter((p) => report.pumps[p.id]?.closingMeter === null);
  checks.push({
    id: 'closing-meters',
    label: 'Closing Meter Completion',
    passed: missingClosings.length === 0,
    severity: 'error',
    message:
      missingClosings.length === 0
        ? 'All 12 pumps have recorded closing meter readings.'
        : `${missingClosings.length} pump(s) still pending closing meter readings: ${missingClosings.map((p) => p.id).join(', ')}`,
  });

  // 3. Suspicious meter movements (closing < opening without rollover)
  const suspiciousPumps = PUMP_SEQUENCE.filter((p) => {
    const r = report.pumps[p.id];
    return r?.openingMeter !== null && r?.closingMeter !== null && r.closingMeter < r.openingMeter && !r.isRollover;
  });
  checks.push({
    id: 'suspicious-meters',
    label: 'Meter Movement Verification',
    passed: suspiciousPumps.length === 0,
    severity: 'error',
    message:
      suspiciousPumps.length === 0
        ? 'All meter progressions are positive and verified.'
        : `Suspicious negative reading on ${suspiciousPumps.map((p) => p.id).join(', ')}. Check for typos or enable rollover.`,
  });

  // 4. Missing physical stock readings
  const missingStocks = (['PMS', 'AGO', 'KERO'] as const).filter(
    (prod) => report.stocks[prod]?.physicalClosingStock === null
  );
  checks.push({
    id: 'stock-dipping',
    label: 'Tank Dipping & Physical Stock',
    passed: missingStocks.length === 0,
    severity: 'warning',
    message:
      missingStocks.length === 0
        ? 'Physical stock readings recorded for PMS, AGO, and KERO.'
        : `Physical dip reading missing for: ${missingStocks.join(', ')}`,
  });

  // 5. Significant variance alert
  const highVarianceProds = (['PMS', 'AGO', 'KERO'] as const).filter((prod) => {
    const v = report.stocks[prod]?.variance;
    return v !== null && Math.abs(v) > 100;
  });
  if (highVarianceProds.length > 0) {
    checks.push({
      id: 'high-variance',
      label: 'Elevated Tank Variance',
      passed: false,
      severity: 'warning',
      message: `Tank variance exceeds ±100L on ${highVarianceProds.join(', ')}. Please double check dip stick readings.`,
    });
  }

  const allPassed = checks.every((c) => c.passed || c.severity === 'warning');
  const hasErrors = checks.some((c) => !c.passed && c.severity === 'error');

  const formattedReport = generateStandardReportText(report);
  const shareUrls = getShareUrls(formattedReport);

  const handleCopyClipboard = async () => {
    try {
      await navigator.clipboard.writeText(formattedReport);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
      onUpdateStatus('Ready to Send', 'Clipboard');
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  const handleSendPlatform = (platform: 'WhatsApp' | 'Telegram' | 'SMS') => {
    let url = shareUrls.whatsapp;
    if (platform === 'Telegram') url = shareUrls.telegram;
    if (platform === 'SMS') url = shareUrls.sms;

    try {
      confetti({ particleCount: 40, spread: 60, origin: { y: 0.6 } });
    } catch {}

    onUpdateStatus('Sent', platform);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleDownloadTxt = () => {
    const blob = new Blob([formattedReport], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Onyxma_Daily_Report_${report.date}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    onUpdateStatus('Sent', 'Export');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-sm overflow-y-auto no-print">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-800/50">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-100">
                Review & Send Daily Report
              </h2>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                {report.date}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Verify completion checks, inspect standardized format, and share via WhatsApp, Telegram, or SMS.
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

        {/* Tab switcher: Completion Checks vs Final Report Text */}
        <div className="px-5 pt-3 border-b border-slate-800 flex gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('review')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'review'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Completion Checks ({checks.filter((c) => c.passed).length}/{checks.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('preview')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'preview'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Standard Report Preview (Appendix A)</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">

          {activeTab === 'review' ? (
            <div className="space-y-3.5">
              <div className="text-xs text-slate-400">
                Section 17 Data Integrity checks safeguard against omitted pumps, calculation errors, or accidental negatives before transmission.
              </div>

              {checks.map((check) => (
                <div
                  key={check.id}
                  className={`p-3.5 rounded-xl border flex items-start gap-3 transition-colors ${
                    check.passed
                      ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-200'
                      : check.severity === 'error'
                      ? 'bg-red-950/30 border-red-800/50 text-red-200'
                      : 'bg-amber-950/30 border-amber-800/50 text-amber-200'
                  }`}
                >
                  <div className="mt-0.5 shrink-0">
                    {check.passed ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    ) : (
                      <AlertTriangle
                        className={`w-5 h-5 ${
                          check.severity === 'error' ? 'text-red-400' : 'text-amber-400'
                        }`}
                      />
                    )}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs">{check.label}</span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                          check.passed
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : check.severity === 'error'
                            ? 'bg-red-500/20 text-red-400'
                            : 'bg-amber-500/20 text-amber-400'
                        }`}
                      >
                        {check.passed ? 'Passed' : check.severity === 'error' ? 'Required Action' : 'Notice'}
                      </span>
                    </div>
                    <p className="text-xs mt-1 opacity-90 leading-relaxed">
                      {check.message}
                    </p>
                  </div>
                </div>
              ))}

              {/* Status summary pill */}
              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-400 font-medium">Ready to dispatch?</span>
                <span className="text-slate-300 font-medium">
                  {hasErrors ? (
                    <span className="text-red-400 font-bold">Fix required error(s) before sending</span>
                  ) : (
                    <span className="text-emerald-400 font-bold">All operational checks verified</span>
                  )}
                </span>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">
                  Exact standard format for WhatsApp / SMS broadcast
                </span>
                <button
                  type="button"
                  onClick={handleCopyClipboard}
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 font-semibold flex items-center gap-1 border border-slate-700 transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied to Clipboard!' : 'Copy Text'}</span>
                </button>
              </div>

              {/* Standard Text Box */}
              <div className="bg-slate-950 rounded-xl p-4 border border-slate-800 font-mono-numbers text-xs text-slate-200 leading-relaxed whitespace-pre-wrap select-all shadow-inner max-h-[380px] overflow-y-auto">
                {formattedReport}
              </div>
            </div>
          )}

        </div>

        {/* Footer Sharing Actions */}
        <div className="px-5 py-4 border-t border-slate-800 bg-slate-800/40 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleCopyClipboard}
              className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition-colors"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadTxt}
              className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition-colors"
              title="Download text file"
            >
              <Download className="w-4 h-4" />
              <span>Download .txt</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition-colors"
              title="Print receipt or save as PDF"
            >
              <Printer className="w-4 h-4" />
              <span>Print</span>
            </button>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              id="btn-share-whatsapp"
              onClick={() => handleSendPlatform('WhatsApp')}
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all"
            >
              <Share2 className="w-4 h-4" />
              <span>Send via WhatsApp</span>
            </button>

            <button
              type="button"
              id="btn-share-telegram"
              onClick={() => handleSendPlatform('Telegram')}
              className="px-3.5 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-sky-600/20 transition-all"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Telegram</span>
            </button>

            <button
              type="button"
              id="btn-share-sms"
              onClick={() => handleSendPlatform('SMS')}
              className="px-3 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-all"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>SMS</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
