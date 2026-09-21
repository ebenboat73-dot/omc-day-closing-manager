import React from 'react';
import { ExpenseItem } from '../../types/report';
import { Receipt, Plus, Trash2, DollarSign } from 'lucide-react';
import { formatNumberWithCommas } from '../sharing/reportFormatter';

interface ExpensesSectionProps {
  expenses: ExpenseItem[];
  onUpdateExpenses: (expenses: ExpenseItem[]) => void;
}

export const ExpensesSection: React.FC<ExpensesSectionProps> = ({
  expenses,
  onUpdateExpenses,
}) => {
  const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);

  const handleAddExpense = () => {
    const newItem: ExpenseItem = {
      id: `exp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      category: 'Other',
      description: '',
      amount: 0,
    };
    onUpdateExpenses([...expenses, newItem]);
  };

  const handleRemoveExpense = (id: string) => {
    onUpdateExpenses(expenses.filter((e) => e.id !== id));
  };

  const handleChangeExpense = (id: string, field: keyof ExpenseItem, value: any) => {
    onUpdateExpenses(
      expenses.map((e) => {
        if (e.id === id) {
          return { ...e, [field]: value };
        }
        return e;
      })
    );
  };

  const categories: ExpenseItem['category'][] = [
    'Transport',
    'Maintenance',
    'Staff/Meals',
    'Utilities',
    'Security',
    'Other',
  ];

  return (
    <section className="bg-slate-900/60 rounded-2xl border border-slate-800 p-4 sm:p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <Receipt className="w-5 h-5 text-amber-400" />
            <span>Station Daily Expenses</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Record authorized operational disbursements before sending report (Currency: GHS)
          </p>
        </div>

        {/* Total Expenses Badge */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-[11px] text-slate-400 block font-medium">Total Expenses</span>
            <span className="font-mono-numbers text-base font-bold text-amber-400">
              GHS {formatNumberWithCommas(totalExpenses, 2)}
            </span>
          </div>

          <button
            type="button"
            id="btn-add-expense"
            onClick={handleAddExpense}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition-colors"
          >
            <Plus className="w-4 h-4 text-amber-400" />
            <span>Add Expense</span>
          </button>
        </div>
      </div>

      {/* Expenses Table / List */}
      {expenses.length === 0 ? (
        <div className="py-8 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl">
          No expenses recorded for today. Click "Add Expense" if disbursements occurred.
        </div>
      ) : (
        <div className="space-y-2.5">
          {expenses.map((expense, idx) => (
            <div
              key={expense.id}
              className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80 hover:border-slate-700 transition-all text-xs"
            >
              {/* Category Selector */}
              <div className="w-full sm:w-44 shrink-0">
                <select
                  value={expense.category}
                  onChange={(e) => {
                    const cat = e.target.value as ExpenseItem['category'];
                    handleChangeExpense(expense.id, 'category', cat);
                    if (!expense.description) {
                      handleChangeExpense(expense.id, 'description', cat);
                    }
                  }}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-medium focus:outline-none focus:border-amber-400"
                >
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              {/* Description Input */}
              <div className="flex-1">
                <input
                  type="text"
                  value={expense.description}
                  onChange={(e) => handleChangeExpense(expense.id, 'description', e.target.value)}
                  placeholder="e.g. Transport, Generator diesel, Pump maintenance..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400"
                />
              </div>

              {/* Amount Input (GHS) */}
              <div className="flex items-center gap-1.5 w-full sm:w-40 shrink-0">
                <span className="text-slate-500 font-mono-numbers text-xs">GHS</span>
                <input
                  type="number"
                  step="0.01"
                  value={expense.amount || ''}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    handleChangeExpense(expense.id, 'amount', !isNaN(val) ? val : 0);
                  }}
                  placeholder="0.00"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-right font-mono-numbers text-slate-100 focus:outline-none focus:border-amber-400"
                />
              </div>

              {/* Delete Button */}
              <button
                type="button"
                onClick={() => handleRemoveExpense(expense.id)}
                className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-slate-900 transition-colors shrink-0 self-end sm:self-center"
                title="Remove item"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Suggested Quick Expenses */}
      <div className="flex flex-wrap items-center gap-2 pt-2 text-[11px] text-slate-500">
        <span>Quick Add:</span>
        <button
          type="button"
          onClick={() => {
            onUpdateExpenses([
              ...expenses,
              { id: `exp_${Date.now()}`, category: 'Transport', description: 'Transport', amount: 50 },
            ]);
          }}
          className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
        >
          + Transport (GHS 50)
        </button>
        <button
          type="button"
          onClick={() => {
            onUpdateExpenses([
              ...expenses,
              { id: `exp_${Date.now()}`, category: 'Maintenance', description: 'Maintenance', amount: 120 },
            ]);
          }}
          className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
        >
          + Maintenance (GHS 120)
        </button>
        <button
          type="button"
          onClick={() => {
            onUpdateExpenses([
              ...expenses,
              { id: `exp_${Date.now()}`, category: 'Other', description: 'Other', amount: 30 },
            ]);
          }}
          className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
        >
          + Other (GHS 30)
        </button>
      </div>
    </section>
  );
};
