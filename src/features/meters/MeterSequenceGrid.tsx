import React from 'react';
import { DailyReport, ProductType, PumpId, PRODUCT_CONFIG, PumpReading } from '../../types/report';
import { PumpMeterCard } from './PumpMeterCard';
import { Fuel, UploadCloud, Sparkles, CheckCircle2 } from 'lucide-react';

interface MeterSequenceGridProps {
  report: DailyReport;
  onUpdatePump: (pumpId: PumpId, updated: Partial<PumpReading>) => void;
  onOpenBulkUpload: () => void;
  onPreviewPhoto?: (url: string, title: string) => void;
}

export const MeterSequenceGrid: React.FC<MeterSequenceGridProps> = ({
  report,
  onUpdatePump,
  onOpenBulkUpload,
  onPreviewPhoto,
}) => {
  const products: ProductType[] = ['PMS', 'AGO', 'KERO'];

  return (
    <div className="space-y-6">
      {/* Top Section Header with Bulk Upload CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
        <div>
          <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <Fuel className="w-5 h-5 text-amber-400" />
            <span>Pump Meter Readings & Sales</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Physical reading order: PMS1 → PMS4 • AGO1 → AGO6 • KERO1 → KERO2 (12 pumps total)
          </p>
        </div>

        <button
          id="btn-trigger-bulk-modal"
          onClick={onOpenBulkUpload}
          className="px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-md shadow-blue-500/20 transition-all shrink-0"
        >
          <UploadCloud className="w-4 h-4" />
          <span>Bulk Upload 12 Meter Photos</span>
        </button>
      </div>

      {/* Render Product Sections in strict order: PMS -> AGO -> KERO */}
      {products.map((product) => {
        const meta = PRODUCT_CONFIG[product];
        const pumpIds = meta.pumps;

        // Subtotals
        const totalSales = pumpIds.reduce((sum, pid) => sum + (report.pumps[pid]?.daySales || 0), 0);
        const completedCount = pumpIds.filter((pid) => report.pumps[pid]?.closingMeter !== null).length;
        const missingOpening = pumpIds.filter((pid) => report.pumps[pid]?.openingMeter === null).length;

        return (
          <section
            key={product}
            id={`product-section-${product}`}
            className="bg-slate-900/40 rounded-2xl border border-slate-800/90 p-4 sm:p-5 space-y-4"
          >
            {/* Product Section Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <span className={`w-3.5 h-3.5 rounded-full ${meta.badgeBg} ring-2 ${meta.borderCol}`} />
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-base text-slate-100 tracking-tight">
                      {product}
                    </h3>
                    <span className="text-xs text-slate-400 font-medium">
                      ({meta.fullName})
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500">
                    {pumpIds.length} Dispenser Pumps ({pumpIds[0]} - {pumpIds[pumpIds.length - 1]})
                  </span>
                </div>
              </div>

              {/* Product Sales Subtotal Badge */}
              <div className="flex items-center gap-3 self-end sm:self-center">
                <div className="text-right">
                  <span className="text-[11px] text-slate-400 block font-medium">
                    Total {product} Sales
                  </span>
                  <span className="font-mono-numbers text-base font-bold text-slate-100">
                    {totalSales.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-xs font-normal text-slate-400">L</span>
                  </span>
                </div>

                <div className="pl-3 border-l border-slate-800 flex flex-col items-end">
                  <span className="text-[11px] text-slate-400 block font-medium">Progress</span>
                  <span className="text-xs font-semibold text-slate-300">
                    {completedCount}/{pumpIds.length} Recorded
                  </span>
                </div>
              </div>
            </div>

            {/* Warning if any opening meter is missing */}
            {missingOpening > 0 && (
              <div className="p-2.5 rounded-lg bg-amber-950/30 border border-amber-800/40 text-xs text-amber-300 flex items-center justify-between">
                <span>⚠️ {missingOpening} pump(s) missing opening meter readings. Please enter manually.</span>
              </div>
            )}

            {/* Grid of Pumps for this Product */}
            <div className={`grid grid-cols-1 sm:grid-cols-2 ${product === 'AGO' ? 'lg:grid-cols-3' : 'lg:grid-cols-2'} gap-3.5`}>
              {pumpIds.map((pid, idx) => {
                const reading = report.pumps[pid];
                // Global sequence position
                const globalPos = product === 'PMS' ? idx + 1 : product === 'AGO' ? 4 + idx + 1 : 10 + idx + 1;

                return (
                  <PumpMeterCard
                    key={pid}
                    reading={reading}
                    positionNumber={globalPos}
                    onUpdate={(updated) => onUpdatePump(pid, updated)}
                    onPreviewPhoto={onPreviewPhoto}
                  />
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
};
