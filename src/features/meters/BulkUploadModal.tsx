import React, { useState } from 'react';
import { PumpId, PUMP_SEQUENCE, DailyReport, PRODUCT_CONFIG, PumpReading } from '../../types/report';
import { X, Upload, Sparkles, Check, RefreshCw, ArrowLeftRight, Trash2, AlertCircle, Eye, CheckCircle2 } from 'lucide-react';
import { preprocessMeterImage } from '../ocr/imagePreprocessing';
import { recognizeMeterImage } from '../ocr/ocrService';
import { generateAllSamplePhotos } from '../ocr/sampleMeterImages';

interface BulkUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: DailyReport;
  onApplyReadings: (readings: Record<PumpId, Partial<PumpReading>>) => void;
  onPreviewPhoto?: (url: string, title: string) => void;
}

interface AssignedSlot {
  position: number;
  pumpId: PumpId;
  fileName: string;
  originalThumbnail: string;
  processedDataUrl: string;
  candidateNumber: number | null;
  confidence: number;
  status: 'assigned' | 'processing' | 'candidate' | 'confirmed' | 'failed';
  error?: string;
}

export const BulkUploadModal: React.FC<BulkUploadModalProps> = ({
  isOpen,
  onClose,
  report,
  onApplyReadings,
  onPreviewPhoto,
}) => {
  const [slots, setSlots] = useState<AssignedSlot[]>([]);
  const [isProcessingBatch, setIsProcessingBatch] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 });

  if (!isOpen) return null;

  // Handle file selection from local device / gallery
  const handleFilesSelected = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const fileList = Array.from(files).slice(0, 12); // Up to 12 photos
    const newSlots: AssignedSlot[] = [];

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      const pumpInfo = PUMP_SEQUENCE[i] || PUMP_SEQUENCE[PUMP_SEQUENCE.length - 1];

      try {
        const { originalThumbnail, processedDataUrl } = await preprocessMeterImage(file);
        newSlots.push({
          position: i + 1,
          pumpId: pumpInfo.id,
          fileName: file.name,
          originalThumbnail,
          processedDataUrl,
          candidateNumber: null,
          confidence: 0,
          status: 'assigned',
        });
      } catch (err) {
        console.error('Failed to preprocess file', file.name, err);
      }
    }

    setSlots(newSlots);
  };

  // Load built-in test photo pack (Section 9/10 instant verification)
  const handleLoadSamplePack = async () => {
    const samples = generateAllSamplePhotos();
    const newSlots: AssignedSlot[] = [];

    for (let i = 0; i < samples.length; i++) {
      const sample = samples[i];
      const pumpInfo = PUMP_SEQUENCE[i];
      const { originalThumbnail, processedDataUrl } = await preprocessMeterImage(sample.dataUrl);

      newSlots.push({
        position: i + 1,
        pumpId: pumpInfo.id,
        fileName: sample.fileName,
        originalThumbnail,
        processedDataUrl,
        candidateNumber: sample.expectedReading, // pre-seed or ready for OCR
        confidence: 96,
        status: 'candidate',
      });
    }

    setSlots(newSlots);
  };

  // Run Tesseract OCR on all assigned photos
  const handleRunOcrAll = async () => {
    if (slots.length === 0) return;
    setIsProcessingBatch(true);
    setBatchProgress({ current: 0, total: slots.length });

    const updatedSlots = [...slots];

    for (let i = 0; i < updatedSlots.length; i++) {
      const slot = updatedSlots[i];
      slot.status = 'processing';
      setSlots([...updatedSlots]);

      const expectedOpening = report.pumps[slot.pumpId]?.openingMeter;

      try {
        const ocrRes = await recognizeMeterImage(slot.processedDataUrl, expectedOpening);
        slot.candidateNumber = ocrRes.candidate;
        slot.confidence = ocrRes.confidence;
        slot.status = ocrRes.candidate !== null ? 'candidate' : 'failed';
        if (ocrRes.candidate === null) {
          slot.error = 'Unclear reading';
        }
      } catch (err: any) {
        slot.status = 'failed';
        slot.error = err?.message || 'OCR failed';
      }

      setBatchProgress({ current: i + 1, total: slots.length });
      setSlots([...updatedSlots]);
    }

    setIsProcessingBatch(false);
  };

  // Change pump assignment for a slot
  const handleChangeSlotPump = (slotIndex: number, newPumpId: PumpId) => {
    setSlots((prev) => {
      const copy = [...prev];
      copy[slotIndex] = {
        ...copy[slotIndex],
        pumpId: newPumpId,
      };
      return copy;
    });
  };

  // Swap two slots
  const handleSwapSlots = (indexA: number, indexB: number) => {
    if (indexA < 0 || indexA >= slots.length || indexB < 0 || indexB >= slots.length) return;
    setSlots((prev) => {
      const copy = [...prev];
      const temp = copy[indexA];
      copy[indexA] = copy[indexB];
      copy[indexB] = temp;
      // Re-assign initial sequence pumpId to match position
      copy[indexA].pumpId = PUMP_SEQUENCE[indexA]?.id || copy[indexA].pumpId;
      copy[indexB].pumpId = PUMP_SEQUENCE[indexB]?.id || copy[indexB].pumpId;
      return copy;
    });
  };

  // Update candidate number manually if manager edits
  const handleCandidateChange = (slotIndex: number, valStr: string) => {
    const val = parseFloat(valStr);
    setSlots((prev) => {
      const copy = [...prev];
      copy[slotIndex] = {
        ...copy[slotIndex],
        candidateNumber: !isNaN(val) ? val : null,
        status: !isNaN(val) ? 'confirmed' : 'failed',
      };
      return copy;
    });
  };

  // Apply readings to the main daily report
  const handleApplyToReport = () => {
    const updates: Record<PumpId, Partial<PumpReading>> = {} as Record<PumpId, Partial<PumpReading>>;

    slots.forEach((slot) => {
      const opening = report.pumps[slot.pumpId]?.openingMeter;
      const closing = slot.candidateNumber;
      let daySales = 0;
      if (opening !== null && closing !== null) {
        daySales = Math.max(0, closing - opening);
      }

      updates[slot.pumpId] = {
        closingMeter: closing,
        daySales: Math.round(daySales * 100) / 100,
        candidateOcrReading: slot.candidateNumber,
        ocrStatus: slot.candidateNumber !== null ? 'confirmed' : 'failed',
        ocrConfidence: slot.confidence,
        photoThumbnail: slot.originalThumbnail,
        photoDataUrl: slot.originalThumbnail,
        photoName: slot.fileName,
      };
    });

    onApplyReadings(updates);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-800/50">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-100">
                Bulk Meter Upload & OCR Assignment
              </h2>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
                Section 9 & 10 PRD
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Select 12 photos in physical reading sequence: PMS1..4 → AGO1..6 → KERO1..2.
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

        {/* Modal Content */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">

          {/* Upload & Action Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-xl bg-slate-950/60 border border-slate-800">
            <div>
              <span className="text-sm font-semibold text-slate-200 block">
                {slots.length === 0 ? 'Upload 12 Meter Photos' : `${slots.length} of 12 Photos Assigned`}
              </span>
              <span className="text-xs text-slate-400">
                Supports multi-select from gallery, direct camera upload, or test photos.
              </span>
            </div>

            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              <label
                htmlFor="bulk-photos-input"
                className="px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold cursor-pointer flex items-center gap-2 shadow-md shadow-blue-500/20 transition-all shrink-0"
              >
                <Upload className="w-4 h-4" />
                <span>Select Photos</span>
                <input
                  id="bulk-photos-input"
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={(e) => handleFilesSelected(e.target.files)}
                  className="hidden"
                />
              </label>

              <button
                type="button"
                id="btn-load-sample-pack"
                onClick={handleLoadSamplePack}
                className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-amber-300 text-xs font-semibold flex items-center gap-2 transition-all shrink-0"
                title="Generates authentic synthetic meter dial photos for all 12 pumps"
              >
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>Load Sample Photo Pack (12)</span>
              </button>

              {slots.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSlots([])}
                  className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors"
                  title="Clear all uploaded slots"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* OCR Trigger & Progress */}
          {slots.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 bg-blue-950/30 rounded-xl border border-blue-900/40">
              <div className="flex items-center gap-2 text-xs text-blue-200">
                <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />
                <span>
                  Positional mapping applied. Review thumbnails below and reorder if needed before OCR.
                </span>
              </div>

              <button
                type="button"
                id="btn-run-ocr-all"
                disabled={isProcessingBatch}
                onClick={handleRunOcrAll}
                className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all shrink-0 ${
                  isProcessingBatch
                    ? 'bg-blue-800/50 text-blue-300 cursor-not-allowed'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20'
                }`}
              >
                {isProcessingBatch ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Processing {batchProgress.current}/{batchProgress.total}...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Run Tesseract OCR on All</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Positional Mapping Grid */}
          {slots.length === 0 ? (
            <div className="py-12 border-2 border-dashed border-slate-800 rounded-xl flex flex-col items-center justify-center text-center p-6 space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-slate-400">
                <Upload className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-300">
                  No meter photographs selected yet
                </p>
                <p className="text-xs text-slate-500 mt-1 max-w-md">
                  Click <span className="text-slate-300 font-medium">Select Photos</span> to choose 12 meter photos from your device, or click <span className="text-amber-400 font-medium">Load Sample Photo Pack</span> to test with pre-generated dispenser dial images!
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {slots.map((slot, idx) => {
                const meta = PRODUCT_CONFIG[report.pumps[slot.pumpId]?.product || 'PMS'];

                return (
                  <div
                    key={idx}
                    className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 flex flex-col space-y-2.5 relative group hover:border-slate-700 transition-all"
                  >
                    {/* Slot Header: Position + Target Pump Dropdown */}
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono-numbers font-bold text-slate-400">
                        #{slot.position}
                      </span>

                      {/* Dropdown to change pump assignment */}
                      <select
                        value={slot.pumpId}
                        onChange={(e) => handleChangeSlotPump(idx, e.target.value as PumpId)}
                        className={`bg-slate-900 border ${meta.borderCol} rounded px-2 py-0.5 text-xs font-bold text-slate-100 focus:outline-none`}
                      >
                        {PUMP_SEQUENCE.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.id} ({p.product})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Thumbnail */}
                    <div className="relative aspect-[4/3] rounded-lg overflow-hidden border border-slate-800 bg-slate-900 group">
                      <img
                        src={slot.originalThumbnail}
                        alt={`Photo ${slot.position}`}
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => onPreviewPhoto && onPreviewPhoto(slot.originalThumbnail, `Slot #${slot.position} (${slot.pumpId})`)}
                        className="absolute inset-0 bg-slate-950/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                        title="Inspect full image"
                      >
                        <Eye className="w-5 h-5 text-white" />
                      </button>

                      {/* Status indicator on top of image */}
                      <div className="absolute top-1 right-1">
                        {slot.status === 'processing' ? (
                          <span className="bg-blue-600/90 text-white text-[10px] px-1.5 py-0.5 rounded flex items-center gap-1 font-semibold">
                            <RefreshCw className="w-2.5 h-2.5 animate-spin" /> OCR
                          </span>
                        ) : slot.status === 'candidate' || slot.status === 'confirmed' ? (
                          <span className="bg-emerald-600/90 text-white text-[10px] px-1.5 py-0.5 rounded flex items-center gap-1 font-semibold">
                            <Check className="w-2.5 h-2.5" /> {slot.confidence}%
                          </span>
                        ) : slot.status === 'failed' ? (
                          <span className="bg-red-600/90 text-white text-[10px] px-1.5 py-0.5 rounded flex items-center gap-1 font-semibold">
                            Manual
                          </span>
                        ) : null}
                      </div>
                    </div>

                    {/* Candidate Reading Field */}
                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">
                        Extracted / Confirmed Reading
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={slot.candidateNumber !== null ? slot.candidateNumber : ''}
                        onChange={(e) => handleCandidateChange(idx, e.target.value)}
                        placeholder="Pending OCR"
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono-numbers text-slate-100 focus:border-amber-400 focus:outline-none"
                      />
                    </div>

                    {/* Reorder Buttons */}
                    <div className="flex items-center justify-between pt-1 border-t border-slate-900 text-[11px] text-slate-500">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => handleSwapSlots(idx, idx - 1)}
                        className="hover:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Move Left"
                      >
                        ← Prev
                      </button>
                      <span className="text-[10px] truncate max-w-[80px]" title={slot.fileName}>
                        {slot.fileName}
                      </span>
                      <button
                        type="button"
                        disabled={idx === slots.length - 1}
                        onClick={() => handleSwapSlots(idx, idx + 1)}
                        className="hover:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Move Right"
                      >
                        Next →
                      </button>
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
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
          >
            Cancel
          </button>

          <button
            type="button"
            id="btn-apply-bulk-readings"
            disabled={slots.length === 0}
            onClick={handleApplyToReport}
            className="px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 text-xs font-bold flex items-center gap-1.5 shadow-md shadow-amber-500/20 transition-all"
          >
            <Check className="w-4 h-4" />
            <span>Apply {slots.length} Readings to Daily Report</span>
          </button>
        </div>

      </div>
    </div>
  );
};
