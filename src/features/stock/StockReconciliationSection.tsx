import React from 'react';
import { DailyReport, ProductType, StockReading, PRODUCT_CONFIG } from '../../types/report';
import { Layers, HelpCircle, ArrowRight, TrendingUp, TrendingDown, CheckCircle, AlertTriangle } from 'lucide-react';
import { formatNumberWithCommas, formatVariance } from '../sharing/reportFormatter';

interface StockReconciliationProps {
  report: DailyReport;
  onUpdateStock: (product: ProductType, updated: Partial<StockReading>) => void;
}

export const StockReconciliationSection: React.FC<StockReconciliationProps> = ({
  report,
  onUpdateStock,
}) => {
  const products: ProductType[] = ['PMS', 'AGO', 'KERO'];

  const handleOpeningChange = (prod: ProductType, valStr: string) => {
    const val = parseFloat(valStr) || 0;
    const current = report.stocks[prod];
    const theoretical = val + current.receipts - current.daySales;
    const variance = current.physicalClosingStock !== null ? current.physicalClosingStock - theoretical : null;
    onUpdateStock(prod, {
      openingStock: val,
      theoreticalClosingStock: theoretical,
      variance,
    });
  };

  const handleReceiptsChange = (prod: ProductType, valStr: string) => {
    const val = parseFloat(valStr) || 0;
    const current = report.stocks[prod];
    const theoretical = current.openingStock + val - current.daySales;
    const variance = current.physicalClosingStock !== null ? current.physicalClosingStock - theoretical : null;
    onUpdateStock(prod, {
      receipts: val,
      theoreticalClosingStock: theoretical,
      variance,
    });
  };

  const handlePhysicalChange = (prod: ProductType, valStr: string) => {
    const current = report.stocks[prod];
    if (valStr.trim() === '') {
      onUpdateStock(prod, {
        physicalClosingStock: null,
        variance: null,
      });
      return;
    }
    const val = parseFloat(valStr);
    if (!isNaN(val)) {
      const variance = val - current.theoreticalClosingStock;
      onUpdateStock(prod, {
        physicalClosingStock: val,
        variance: Math.round(variance * 10) / 10,
      });
    }
  };

  const handleDipMmChange = (prod: ProductType, valStr: string) => {
    const val = parseFloat(valStr);
    onUpdateStock(prod, {
      dipReadingMm: !isNaN(val) ? val : undefined,
    });
  };

  return (
    <section className="bg-slate-900/60 rounded-2xl border border-slate-800 p-4 sm:p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <Layers className="w-5 h-5 text-amber-400" />
            <span>Stock / Dipping Reconciliation</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Formula: Theoretical Closing = Opening + Receipts − Day Sales • Variance = Physical − Theoretical
          </p>
        </div>

        <div className="text-xs text-slate-400 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700/80 self-start sm:self-auto font-medium">
          PMS → AGO → KERO Order
        </div>
      </div>

      {/* Product Stock Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {products.map((product) => {
          const meta = PRODUCT_CONFIG[product];
          const stock = report.stocks[product];

          const isNegativeVariance = stock.variance !== null && stock.variance < -30;
          const isBalanced = stock.variance !== null && Math.abs(stock.variance) <= 30;
          const isPositive = stock.variance !== null && stock.variance > 30;

          return (
            <div
              key={product}
              id={`stock-card-${product}`}
              className="bg-slate-950/70 rounded-xl border border-slate-800 p-4 space-y-4 hover:border-slate-700 transition-all flex flex-col justify-between"
            >
              {/* Product Header */}
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
                  <div className="flex items-center gap-2">
                    <span className={`w-3 h-3 rounded-full ${meta.badgeBg} ring-2 ${meta.borderCol}`} />
                    <h3 className="font-bold text-base text-slate-100 font-mono-numbers">
                      {product}
                    </h3>
                    <span className="text-[11px] text-slate-400 font-medium">
                      Tank Stock
                    </span>
                  </div>

                  {/* Variance pill */}
                  {stock.physicalClosingStock !== null ? (
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-bold font-mono-numbers flex items-center gap-1 ${
                        isNegativeVariance
                          ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                          : isBalanced
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                      }`}
                    >
                      {isNegativeVariance ? (
                        <TrendingDown className="w-3.5 h-3.5" />
                      ) : (
                        <TrendingUp className="w-3.5 h-3.5" />
                      )}
                      <span>Var: {formatVariance(stock.variance)}</span>
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-500 bg-slate-800 px-2 py-0.5 rounded">
                      Dipping Pending
                    </span>
                  )}
                </div>

                {/* Input Fields Grid */}
                <div className="mt-3.5 space-y-2.5 text-xs">
                  {/* Opening Stock */}
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Opening Stock</span>
                    <div className="w-32 text-right">
                      <input
                        type="number"
                        value={stock.openingStock || ''}
                        onChange={(e) => handleOpeningChange(product, e.target.value)}
                        placeholder="0"
                        className="w-full bg-slate-900 border border-slate-800 focus:border-slate-600 rounded px-2 py-1 text-right text-slate-200 font-mono-numbers text-xs"
                      />
                    </div>
                  </div>

                  {/* Receipts / Delivery */}
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">+ Tanker Receipts</span>
                    <div className="w-32 text-right">
                      <input
                        type="number"
                        value={stock.receipts || ''}
                        onChange={(e) => handleReceiptsChange(product, e.target.value)}
                        placeholder="0"
                        className="w-full bg-slate-900 border border-slate-800 focus:border-slate-600 rounded px-2 py-1 text-right text-slate-200 font-mono-numbers text-xs"
                      />
                    </div>
                  </div>

                  {/* Day Sales (Calculated from pumps) */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 text-slate-400">
                      <span>− Day Sales</span>
                      <span className="text-[10px] text-amber-400 bg-amber-500/10 px-1 py-0.2 rounded">
                        Pumps
                      </span>
                    </div>
                    <div className="font-mono-numbers font-bold text-slate-200 text-right pr-2">
                      {stock.daySales.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} L
                    </div>
                  </div>

                  {/* Theoretical Closing Stock */}
                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between">
                    <span className="text-slate-300 font-semibold text-xs">
                      Theoretical Closing
                    </span>
                    <span className="font-mono-numbers font-bold text-slate-100 text-sm">
                      {Math.round(stock.theoreticalClosingStock).toLocaleString('en-US')} L
                    </span>
                  </div>

                  {/* Physical Closing Stock (From Dipping) */}
                  <div className="pt-2 border-t border-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label htmlFor={`physical-stock-${product}`} className="text-slate-200 font-semibold">
                        Physical Closing Stock
                      </label>
                      <span className="text-[11px] text-slate-500">Dip Chart Litres</span>
                    </div>

                    <div className="relative">
                      <input
                        id={`physical-stock-${product}`}
                        type="number"
                        value={stock.physicalClosingStock !== null ? stock.physicalClosingStock : ''}
                        onChange={(e) => handlePhysicalChange(product, e.target.value)}
                        placeholder="e.g. 16420"
                        className="w-full bg-slate-900 border border-slate-700 focus:border-amber-400 rounded-lg px-3 py-2 text-sm font-mono-numbers text-slate-100 focus:outline-none"
                      />
                      <span className="absolute right-3 top-2.5 text-xs text-slate-500 font-mono-numbers">
                        L
                      </span>
                    </div>
                  </div>

                  {/* Optional Dip Reading (mm) */}
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-slate-500">Dip Stick Height (mm)</span>
                    <input
                      type="number"
                      value={stock.dipReadingMm || ''}
                      onChange={(e) => handleDipMmChange(product, e.target.value)}
                      placeholder="e.g. 1820"
                      className="w-24 bg-slate-900/60 border border-slate-800 rounded px-2 py-0.5 text-right text-slate-400 font-mono-numbers text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Calculated Variance Output Card */}
              <div
                className={`p-3 rounded-lg border text-xs flex items-center justify-between ${
                  stock.physicalClosingStock === null
                    ? 'bg-slate-900/40 border-slate-800 text-slate-500'
                    : isNegativeVariance
                    ? 'bg-red-950/30 border-red-800/40 text-red-300'
                    : isBalanced
                    ? 'bg-emerald-950/30 border-emerald-800/40 text-emerald-300'
                    : 'bg-blue-950/30 border-blue-800/40 text-blue-300'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  {stock.physicalClosingStock === null ? (
                    <HelpCircle className="w-4 h-4 text-slate-500" />
                  ) : isNegativeVariance ? (
                    <AlertTriangle className="w-4 h-4 text-red-400" />
                  ) : (
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                  )}
                  <span className="font-semibold">Stock Variance</span>
                </div>

                <span className="font-mono-numbers text-sm font-bold">
                  {formatVariance(stock.variance)}
                </span>
              </div>

            </div>
          );
        })}
      </div>
    </section>
  );
};
