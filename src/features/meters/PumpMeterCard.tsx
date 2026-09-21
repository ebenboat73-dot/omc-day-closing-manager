import React, { useState } from 'react';
import { PumpReading, PRODUCT_CONFIG, OcrStatus } from '../../types/report';
import { Camera, Check, AlertTriangle, RefreshCw, Eye, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { preprocessMeterImage } from '../ocr/imagePreprocessing';
import { recognizeMeterImage } from '../ocr/ocrService';

interface PumpMeterCardProps {
  reading: PumpReading;
  positionNumber: number;
  onUpdate: (updated: Partial<PumpReading>) => void;
  onPreviewPhoto?: (url: string, title: string) => void;
}

export const PumpMeterCard: React.FC<PumpMeterCardProps> = ({
  reading,
  positionNumber,
  onUpdate,
  onPreviewPhoto,
}) => {
  const [isProcessingOcr, setIsProcessingOcr] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const productMeta = PRODUCT_CONFIG[reading.product];

  // Calculate sales considering rollover
  const computeSales = (opening: number | null, closing: number | null, isRoll: boolean, cap = 100000): number => {
    if (opening === null || closing === null) return 0;
    if (isRoll && closing < opening) {
      return Math.max(0, (cap - opening) + closing);
    }
    return Math.max(0, closing - opening);
  };

  const handleClosingChange = (valStr: string) => {
    if (valStr.trim() === '') {
      onUpdate({
        closingMeter: null,
        daySales: 0,
      });
      return;
    }
    const val = parseFloat(valStr);
    if (!isNaN(val)) {
      const sales = computeSales(reading.openingMeter, val, reading.isRollover, reading.rolloverCapacity || 100000);
      onUpdate({
        closingMeter: val,
        daySales: Math.round(sales * 100) / 100,
        ocrStatus: reading.ocrStatus === 'candidate' ? 'confirmed' : reading.ocrStatus,
      });
    }
  };

  const handleOpeningChange = (valStr: string) => {
    if (valStr.trim() === '') {
      onUpdate({
        openingMeter: null,
        daySales: 0,
      });
      return;
    }
    const val = parseFloat(valStr);
    if (!isNaN(val)) {
      const sales = computeSales(val, reading.closingMeter, reading.isRollover, reading.rolloverCapacity || 100000);
      onUpdate({
        openingMeter: val,
        daySales: Math.round(sales * 100) / 100,
      });
    }
  };

  const handleToggleRollover = (enabled: boolean) => {
    const sales = computeSales(reading.openingMeter, reading.closingMeter, enabled, reading.rolloverCapacity || 100000);
    onUpdate({
      isRollover: enabled,
      daySales: Math.round(sales * 100) / 100,
    });
  };

  const handleSinglePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsProcessingOcr(true);
      setOcrProgress(10);

      // Preprocess image
      const { originalThumbnail, processedDataUrl } = await preprocessMeterImage(file);
      setOcrProgress(30);

      onUpdate({
        photoThumbnail: originalThumbnail,
        photoDataUrl: originalThumbnail,
        photoName: file.name,
        ocrStatus: 'processing',
      });

      // Run OCR
      const ocrResult = await recognizeMeterImage(
        processedDataUrl,
        reading.openingMeter,
        (progress) => setOcrProgress(30 + Math.round(progress * 0.6))
      );

      setIsProcessingOcr(false);

      if (ocrResult.candidate !== null) {
        const sales = computeSales(reading.openingMeter, ocrResult.candidate, reading.isRollover, reading.rolloverCapacity);
        onUpdate({
          candidateOcrReading: ocrResult.candidate,
          closingMeter: ocrResult.candidate, // Auto-propose candidate
          daySales: Math.round(sales * 100) / 100,
          ocrConfidence: ocrResult.confidence,
          ocrStatus: 'candidate',
        });
      } else {
        onUpdate({
          ocrStatus: 'failed',
          ocrError: 'Could not clearly recognize digits. Please enter manually.',
        });
      }
    } catch (err: any) {
      setIsProcessingOcr(false);
      onUpdate({
        ocrStatus: 'failed',
        ocrError: err?.message || 'OCR processing failed',
      });
    }
  };

  const isSuspicious =
    reading.openingMeter !== null &&
    reading.closingMeter !== null &&
    reading.closingMeter < reading.openingMeter &&
    !reading.isRollover;

  return (
    <div
      id={`pump-card-${reading.pumpId}`}
      className={`bg-slate-900/80 rounded-xl border transition-all duration-200 overflow-hidden shadow-sm hover:shadow-md ${
        isSuspicious
          ? 'border-red-500/60 ring-1 ring-red-500/30'
          : reading.closingMeter !== null
          ? 'border-slate-700/80'
          : 'border-slate-800'
      }`}
    >
      {/* Pump Header Bar */}
      <div className="px-3.5 py-2.5 bg-slate-800/60 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-slate-800 border border-slate-700 text-slate-400 text-[11px] font-mono-numbers font-bold flex items-center justify-center">
            {positionNumber}
          </span>
          <span className="font-bold text-sm text-slate-100 font-mono-numbers">
            {reading.pumpId}
          </span>
          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${productMeta.badgeBg} ${productMeta.badgeText}`}>
            {reading.product}
          </span>
        </div>

        {/* Thumbnail or Photo status */}
        <div className="flex items-center gap-2">
          {reading.photoThumbnail ? (
            <button
              type="button"
              onClick={() => onPreviewPhoto && onPreviewPhoto(reading.photoThumbnail!, `${reading.pumpId} Meter Photo`)}
              className="group relative w-7 h-7 rounded border border-slate-600 overflow-hidden hover:border-amber-400 transition-colors"
              title="Click to inspect uploaded photo"
            >
              <img src={reading.photoThumbnail} alt="Pump meter" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                <Eye className="w-3.5 h-3.5 text-white" />
              </div>
            </button>
          ) : (
            <label
              htmlFor={`file-upload-${reading.pumpId}`}
              className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 cursor-pointer border border-slate-700 transition-colors"
              title="Snap/Upload meter photograph"
            >
              <Camera className="w-3.5 h-3.5" />
              <input
                id={`file-upload-${reading.pumpId}`}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleSinglePhotoUpload}
                className="hidden"
              />
            </label>
          )}

          {/* OCR Status Chip */}
          {reading.ocrStatus === 'processing' || isProcessingOcr ? (
            <span className="inline-flex items-center gap-1 text-[10px] text-blue-400 font-semibold bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
              <RefreshCw className="w-3 h-3 animate-spin" />
              <span>OCR {ocrProgress}%</span>
            </span>
          ) : reading.ocrStatus === 'candidate' ? (
            <span className="inline-flex items-center gap-1 text-[10px] text-amber-400 font-semibold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
              <Sparkles className="w-3 h-3" />
              <span>Candidate</span>
            </span>
          ) : reading.ocrStatus === 'confirmed' ? (
            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              <Check className="w-3 h-3" />
              <span>Verified</span>
            </span>
          ) : null}
        </div>
      </div>

      {/* Main Card Body */}
      <div className="p-3.5 space-y-3">
        {/* Opening Meter */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">Opening Meter</span>
            {reading.openingMeter === null && (
              <span className="text-[10px] font-bold text-red-400 bg-red-500/10 px-1.5 py-0.2 rounded border border-red-500/20">
                MISSING
              </span>
            )}
          </div>
          <div className="w-36 text-right">
            {reading.openingMeter !== null ? (
              <span className="font-mono-numbers font-medium text-slate-300">
                {reading.openingMeter.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} L
              </span>
            ) : (
              <input
                type="number"
                step="0.01"
                placeholder="Enter opening"
                onChange={(e) => handleOpeningChange(e.target.value)}
                className="w-full bg-slate-800 text-right px-2 py-1 rounded text-xs text-red-300 border border-red-500/40 focus:border-amber-400 focus:outline-none font-mono-numbers"
              />
            )}
          </div>
        </div>

        {/* Closing Meter Input */}
        <div>
          <div className="flex items-center justify-between text-xs mb-1">
            <label htmlFor={`closing-meter-${reading.pumpId}`} className="text-slate-300 font-semibold flex items-center gap-1.5">
              <span>Closing Meter</span>
              {reading.candidateOcrReading !== null && reading.ocrStatus === 'candidate' && (
                <button
                  type="button"
                  onClick={() => {
                    if (reading.candidateOcrReading !== null) {
                      handleClosingChange(reading.candidateOcrReading.toString());
                    }
                  }}
                  className="text-[10px] font-mono-numbers font-medium text-amber-400 hover:text-amber-300 underline"
                  title="Accept OCR candidate reading"
                >
                  Accept OCR ({reading.candidateOcrReading})
                </button>
              )}
            </label>
            <span className="text-slate-500 text-[11px]">Litres</span>
          </div>

          <div className="relative">
            <input
              id={`closing-meter-${reading.pumpId}`}
              type="number"
              step="0.01"
              value={reading.closingMeter !== null ? reading.closingMeter : ''}
              onChange={(e) => handleClosingChange(e.target.value)}
              placeholder="e.g. 30945.20"
              className={`w-full bg-slate-950/70 border rounded-lg px-3 py-2 text-sm font-mono-numbers text-slate-100 placeholder-slate-600 focus:outline-none transition-colors ${
                isSuspicious
                  ? 'border-red-500/70 focus:border-red-400 bg-red-950/20'
                  : 'border-slate-700 focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30'
              }`}
            />
            {reading.closingMeter !== null && (
              <span className="absolute right-3 top-2.5 text-xs text-slate-500 font-mono-numbers">
                L
              </span>
            )}
          </div>
        </div>

        {/* Suspicious Movement / Rollover Alert */}
        {isSuspicious && (
          <div className="p-2.5 rounded-lg bg-red-950/40 border border-red-800/60 text-xs text-red-300 space-y-1.5">
            <div className="flex items-start gap-1.5">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold">Closing reading is lower than Opening!</span>
                <p className="text-[11px] text-red-300/80 mt-0.5">
                  Verify meter digits or enable rollover calculation if the mechanical counter turned over 99,999.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={() => handleToggleRollover(true)}
                className="px-2 py-1 rounded bg-red-900/60 hover:bg-red-800 text-red-200 text-[11px] font-medium border border-red-700/60 transition-colors"
              >
                Enable Rollover ({reading.rolloverCapacity || 100000}L)
              </button>
            </div>
          </div>
        )}

        {/* Rollover Active Banner */}
        {reading.isRollover && (
          <div className="p-2 rounded bg-amber-950/30 border border-amber-800/40 text-[11px] text-amber-300 flex items-center justify-between">
            <span>Rollover Mode Active (Cap: {reading.rolloverCapacity || 100000}L)</span>
            <button
              type="button"
              onClick={() => handleToggleRollover(false)}
              className="text-amber-400 hover:text-amber-300 underline font-medium"
            >
              Disable
            </button>
          </div>
        )}

        {/* Calculated Day Sales Output */}
        <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
          <span className="text-xs text-slate-400 font-medium">Day Sales</span>
          <div className="text-right">
            <span
              id={`day-sales-${reading.pumpId}`}
              className="font-mono-numbers text-sm font-bold text-amber-400"
            >
              {reading.daySales.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-xs text-slate-400 ml-1">L</span>
          </div>
        </div>

        {/* Advanced manual options toggle */}
        <div className="pt-1">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-[11px] text-slate-500 hover:text-slate-400 flex items-center gap-1 transition-colors"
          >
            {showAdvanced ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            <span>Edit Opening / Notes</span>
          </button>

          {showAdvanced && (
            <div className="mt-2 p-2 bg-slate-950/40 rounded border border-slate-800 space-y-2 text-xs">
              <div>
                <label className="text-slate-400 text-[11px] block mb-0.5">Override Opening Meter</label>
                <input
                  type="number"
                  step="0.01"
                  value={reading.openingMeter !== null ? reading.openingMeter : ''}
                  onChange={(e) => handleOpeningChange(e.target.value)}
                  placeholder="Manual opening"
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 text-xs font-mono-numbers"
                />
              </div>
              <div>
                <label className="text-slate-400 text-[11px] block mb-0.5">Pump Notes</label>
                <input
                  type="text"
                  value={reading.manualNotes || ''}
                  onChange={(e) => onUpdate({ manualNotes: e.target.value })}
                  placeholder="e.g. nozzle test - 20L"
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 text-xs"
                />
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
