import { useState, useEffect, FormEvent } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Save, Undo, Plus, Trash2 } from "lucide-react";
import { DailyLog, Item, RestockItem } from "../types";

interface DailyLogFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Omit<DailyLog, "id"> & { id?: string }) => void;
  editingLog: DailyLog | null;
  items: Item[];
}

export default function DailyLogForm({ isOpen, onClose, onSubmit, editingLog, items }: DailyLogFormProps) {
  const [date, setDate] = useState("");
  const [quantityToSell, setQuantityToSell] = useState<number | "">("");
  const [soldValue, setSoldValue] = useState<number | "">("");
  const [pilotCost, setPilotCost] = useState<number | "">("");
  const [reinvestedValue, setReinvestedValue] = useState<number | "">("");
  const [expenses, setExpenses] = useState<number | "">("");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Restock states
  const [restocks, setRestocks] = useState<RestockItem[]>([]);
  const [selectedItemId, setSelectedItemId] = useState("");
  const [restockQty, setRestockQty] = useState<number | "">("");
  const [restockUnitCost, setRestockUnitCost] = useState<number | "">("");

  // Reset form or populate when editingLog changes
  useEffect(() => {
    if (editingLog) {
      setDate(editingLog.date);
      setQuantityToSell(editingLog.quantityToSell);
      setSoldValue(editingLog.soldValue);
      setPilotCost(editingLog.pilotCost);
      setReinvestedValue(editingLog.reinvestedValue);
      setExpenses(editingLog.expenses);
      setNotes(editingLog.notes || "");
      setRestocks(editingLog.restocks || []);
      setErrors({});
    } else {
      // Default to today's date in local time (YYYY-MM-DD)
      const today = new Date();
      const offset = today.getTimezoneOffset();
      const localToday = new Date(today.getTime() - (offset * 60 * 1000));
      setDate(localToday.toISOString().split("T")[0]);
      
      setQuantityToSell(0);
      setSoldValue(0);
      setPilotCost(0);
      setReinvestedValue(0);
      setExpenses(0);
      setNotes("");
      setRestocks([]);
      setErrors({});
    }
  }, [editingLog, isOpen]);

  const validate = () => {
    const newErrors: { [key: string]: string } = {};

    if (!date) {
      newErrors.date = "Por favor, selecione uma data.";
    }

    if (quantityToSell === "" || isNaN(Number(quantityToSell)) || Number(quantityToSell) < 0) {
      newErrors.quantityToSell = "Insira uma quantidade válida (maior ou igual a zero).";
    }

    if (soldValue === "" || isNaN(Number(soldValue)) || Number(soldValue) < 0) {
      newErrors.soldValue = "Insira o valor vendido (maior ou igual a zero).";
    }

    if (pilotCost === "" || isNaN(Number(pilotCost)) || Number(pilotCost) < 0) {
      newErrors.pilotCost = "Insira o custo do doce piloto (maior ou igual a zero).";
    }

    if (reinvestedValue === "" || isNaN(Number(reinvestedValue)) || Number(reinvestedValue) < 0) {
      newErrors.reinvestedValue = "Insira o valor de reinvestimento (maior ou igual a zero).";
    }

    if (expenses === "" || isNaN(Number(expenses)) || Number(expenses) < 0) {
      newErrors.expenses = "Insira o gasto do dia (maior ou igual a zero).";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleItemSelect = (itemId: string) => {
    setSelectedItemId(itemId);
    const item = items.find(i => i.id === itemId);
    if (item) {
      setRestockUnitCost(item.price);
    } else {
      setRestockUnitCost("");
    }
  };

  const handleAddRestock = () => {
    if (!selectedItemId || !restockQty || Number(restockQty) <= 0 || !restockUnitCost || Number(restockUnitCost) < 0) {
      return;
    }
    const item = items.find(i => i.id === selectedItemId);
    if (!item) return;

    const qty = Number(restockQty);
    const cost = Number(restockUnitCost);
    const newRestockItem: RestockItem = {
      id: "rst-" + Date.now().toString(),
      itemId: item.id,
      itemName: item.name,
      quantity: qty,
      unitCost: cost,
      totalCost: qty * cost
    };

    const updated = [...restocks, newRestockItem];
    setRestocks(updated);

    const total = updated.reduce((sum, r) => sum + r.totalCost, 0);
    setReinvestedValue(total);

    setSelectedItemId("");
    setRestockQty("");
    setRestockUnitCost("");
  };

  const handleRemoveRestock = (id: string) => {
    const updated = restocks.filter(r => r.id !== id);
    setRestocks(updated);

    const total = updated.reduce((sum, r) => sum + r.totalCost, 0);
    setReinvestedValue(total);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    onSubmit({
      id: editingLog?.id,
      date,
      quantityToSell: Number(quantityToSell),
      soldValue: Number(soldValue),
      pilotCost: Number(pilotCost),
      reinvestedValue: Number(reinvestedValue),
      expenses: Number(expenses),
      notes: notes.trim(),
      restocks
    });

    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            id="log-form-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.6 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-950/70 z-40 backdrop-blur-xs"
          />

          {/* Modal Container */}
          <motion.div
            id="log-form-modal"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", duration: 0.4 }}
            className="bg-slate-950/80 border border-white/10 backdrop-blur-md w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col z-50"
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-white/10 flex justify-between items-center bg-transparent">
              <div>
                <h3 className="font-bold text-white text-lg">
                  {editingLog ? "Editar Registro Diário" : "Novo Registro Diário"}
                </h3>
                <p className="text-xs text-white/50 mt-0.5">
                  Preencha os dados do caixa diário
                </p>
              </div>
              <button
                id="close-log-form-btn"
                onClick={onClose}
                className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* Date */}
              <div>
                <label htmlFor="log-date" className="block text-xs font-bold text-white/60 uppercase tracking-wider mb-1">
                  Data *
                </label>
                <input
                  id="log-date"
                  type="date"
                  value={date}
                  onChange={(e) => {
                    setDate(e.target.value);
                    if (errors.date) setErrors(prev => ({ ...prev, date: "" }));
                  }}
                  className={`w-full px-4 py-2.5 rounded-xl text-sm transition-all focus:outline-none focus:ring-2 ${
                    errors.date
                      ? "border-red-500/50 focus:ring-red-500/20 focus:border-red-500/80 bg-red-500/5 text-white"
                      : "bg-white/5 border border-white/10 text-white focus:ring-white/20 focus:border-white/30"
                  }`}
                />
                {errors.date && (
                  <p className="text-xs text-red-400 mt-1 font-medium">{errors.date}</p>
                )}
              </div>

              {/* Grid 1: Qtd. Hoje & Valor Vendido */}
              <div className="grid grid-cols-2 gap-4">
                {/* Quantity to sell */}
                <div>
                  <label htmlFor="log-qty" className="block text-xs font-bold text-white/60 uppercase tracking-wider mb-1" title="Quantidade para venda de hoje">
                    Qtd. p/ Hoje *
                  </label>
                  <input
                    id="log-qty"
                    type="number"
                    min="0"
                    value={quantityToSell}
                    readOnly
                    className="w-full px-4 py-2.5 rounded-xl text-sm transition-all focus:outline-none bg-white/5 border border-white/10 text-white/50 cursor-not-allowed"
                  />
                  <p className="text-[10px] text-white/30 mt-1">Calculado automaticamente nas vendas</p>
                </div>

                {/* Sold Value */}
                <div>
                  <label htmlFor="log-sold-val" className="block text-xs font-bold text-white/60 uppercase tracking-wider mb-1">
                    Valor Vendido *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40 text-sm font-semibold">R$</span>
                    <input
                      id="log-sold-val"
                      type="number"
                      min="0"
                      step="0.01"
                      value={soldValue}
                      readOnly
                      className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm transition-all focus:outline-none bg-white/5 border border-white/10 text-white/50 cursor-not-allowed"
                    />
                  </div>
                  <p className="text-[10px] text-white/30 mt-1">Calculado automaticamente nas vendas</p>
                </div>
              </div>

              {/* Grid 2: Doce Pilotos, Reinvestido & Gastos do Dia */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Pilot Cost */}
                <div>
                  <label htmlFor="log-pilot" className="block text-xs font-bold text-white/60 uppercase tracking-wider mb-1" title="Doce pilotos (custo)">
                    Doce Piloto *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40 text-sm font-semibold">R$</span>
                    <input
                      id="log-pilot"
                      type="number"
                      min="0"
                      step="0.01"
                      value={pilotCost}
                      onChange={(e) => {
                        const val = e.target.value;
                        setPilotCost(val === "" ? "" : Number(val));
                        if (errors.pilotCost) setErrors(prev => ({ ...prev, pilotCost: "" }));
                      }}
                      placeholder="0,00"
                      className={`w-full pl-9 pr-4 py-2.5 rounded-xl text-sm transition-all focus:outline-none focus:ring-2 ${
                        errors.pilotCost
                          ? "border-red-500/50 focus:ring-red-500/20 focus:border-red-500/80 bg-red-500/5 text-white placeholder:text-white/30"
                          : "bg-white/5 border border-white/10 text-white placeholder:text-white/20 focus:ring-white/20 focus:border-white/30"
                      }`}
                    />
                  </div>
                  {errors.pilotCost && (
                    <p className="text-xs text-red-400 mt-1 font-medium">{errors.pilotCost}</p>
                  )}
                </div>

                {/* Reinvested Value */}
                <div>
                  <label htmlFor="log-reinvest" className="block text-xs font-bold text-white/60 uppercase tracking-wider mb-1">
                    Reinvestido *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40 text-sm font-semibold">R$</span>
                    <input
                      id="log-reinvest"
                      type="number"
                      min="0"
                      step="0.01"
                      value={reinvestedValue}
                      onChange={(e) => {
                        const val = e.target.value;
                        setReinvestedValue(val === "" ? "" : Number(val));
                        if (errors.reinvestedValue) setErrors(prev => ({ ...prev, reinvestedValue: "" }));
                      }}
                      placeholder="0,00"
                      className={`w-full pl-9 pr-4 py-2.5 rounded-xl text-sm transition-all focus:outline-none focus:ring-2 ${
                        errors.reinvestedValue
                          ? "border-red-500/50 focus:ring-red-500/20 focus:border-red-500/80 bg-red-500/5 text-white placeholder:text-white/30"
                          : "bg-white/5 border border-white/10 text-white placeholder:text-white/20 focus:ring-white/20 focus:border-white/30"
                      }`}
                    />
                  </div>
                  {errors.reinvestedValue && (
                    <p className="text-xs text-red-400 mt-1 font-medium">{errors.reinvestedValue}</p>
                  )}
                </div>

                {/* Daily Expenses (Gasto do dia) */}
                <div>
                  <label htmlFor="log-expenses" className="block text-xs font-bold text-white/60 uppercase tracking-wider mb-1" title="Gasto do dia">
                    Gasto Dia *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40 text-sm font-semibold">R$</span>
                    <input
                      id="log-expenses"
                      type="number"
                      min="0"
                      step="0.01"
                      value={expenses}
                      onChange={(e) => {
                        const val = e.target.value;
                        setExpenses(val === "" ? "" : Number(val));
                        if (errors.expenses) setErrors(prev => ({ ...prev, expenses: "" }));
                      }}
                      placeholder="0,00"
                      className={`w-full pl-9 pr-4 py-2.5 rounded-xl text-sm transition-all focus:outline-none focus:ring-2 ${
                        errors.expenses
                          ? "border-red-500/50 focus:ring-red-500/20 focus:border-red-500/80 bg-red-500/5 text-white placeholder:text-white/30"
                          : "bg-white/5 border border-white/10 text-white placeholder:text-white/20 focus:ring-white/20 focus:border-white/30"
                      }`}
                    />
                  </div>
                  {errors.expenses && (
                    <p className="text-xs text-red-400 mt-1 font-medium">{errors.expenses}</p>
                  )}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label htmlFor="log-notes" className="block text-xs font-bold text-white/60 uppercase tracking-wider mb-1">
                  Observações (Opcional)
                </label>
                <textarea
                  id="log-notes"
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ex: Tarde com boa saída, chuva fina no final."
                  className="w-full px-4 py-2.5 rounded-xl text-sm transition-all focus:outline-none focus:ring-2 bg-white/5 border border-white/10 text-white placeholder:text-white/20 focus:ring-white/20 focus:border-white/30 resize-none"
                />
              </div>

              {/* Restock Section (Reinvestment link) */}
              <div className="border-t border-white/10 pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-white/80 uppercase tracking-wider">
                    📦 Reabastecimento de Estoque (Reinvestimento)
                  </h4>
                  {restocks.length > 0 && (
                    <span className="text-[10px] bg-indigo-500/25 border border-indigo-500/35 px-2 py-0.5 rounded-full text-indigo-300 font-mono font-bold">
                      Total: R$ {restocks.reduce((sum, r) => sum + r.totalCost, 0).toFixed(2)}
                    </span>
                  )}
                </div>

                {/* Add Restock Item Form Row */}
                <div className="grid grid-cols-12 gap-2 bg-white/[0.02] border border-white/5 p-3 rounded-2xl">
                  {/* Select Item */}
                  <div className="col-span-6">
                    <label className="block text-[10px] font-bold text-white/40 mb-1">Produto</label>
                    <select
                      value={selectedItemId}
                      onChange={(e) => handleItemSelect(e.target.value)}
                      className="w-full px-2 py-1.5 rounded-lg text-xs bg-slate-900 border border-white/10 text-white/80 focus:ring-1 focus:ring-white/20 cursor-pointer"
                    >
                      <option value="">Selecionar...</option>
                      {items.map(item => (
                        <option key={item.id} value={item.id}>
                          {item.name} (R$ {item.price.toFixed(2)})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Quantity */}
                  <div className="col-span-3">
                    <label className="block text-[10px] font-bold text-white/40 mb-1">Qtd</label>
                    <input
                      type="number"
                      min="1"
                      value={restockQty}
                      onChange={(e) => setRestockQty(e.target.value === "" ? "" : Number(e.target.value))}
                      placeholder="Qtd"
                      className="w-full px-2 py-1.5 rounded-lg text-xs bg-slate-900 border border-white/10 text-white placeholder:text-white/25 focus:ring-1 focus:ring-white/20"
                    />
                  </div>

                  {/* Unit Cost */}
                  <div className="col-span-3 flex items-end gap-1">
                    <div className="flex-1">
                      <label className="block text-[10px] font-bold text-white/40 mb-1">Custo Un</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={restockUnitCost}
                        onChange={(e) => setRestockUnitCost(e.target.value === "" ? "" : Number(e.target.value))}
                        placeholder="R$"
                        className="w-full px-2 py-1.5 rounded-lg text-xs bg-slate-900 border border-white/10 text-white placeholder:text-white/25 focus:ring-1 focus:ring-white/20"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleAddRestock}
                      className="p-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors border border-white/10 flex items-center justify-center shrink-0 h-[28px] cursor-pointer"
                      title="Adicionar item reabastecido"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>

                {/* Restocks List */}
                <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                  {restocks.length === 0 ? (
                    <p className="text-[10px] text-white/30 italic text-center py-2 bg-white/[0.01] rounded-xl border border-dashed border-white/5">
                      Nenhum reabastecimento registrado para este dia.
                    </p>
                  ) : (
                    restocks.map((r) => (
                      <div
                        key={r.id}
                        className="flex items-center justify-between p-2 rounded-xl bg-white/5 border border-white/10 text-xs hover:bg-white/[0.07] transition-all"
                      >
                        <div className="min-w-0 flex-1">
                          <span className="font-semibold text-white truncate block">{r.itemName}</span>
                          <span className="text-[10px] text-white/50">
                            {r.quantity} un × R$ {r.unitCost.toFixed(2)}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="font-bold text-amber-400 font-mono">
                            R$ {r.totalCost.toFixed(2)}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveRestock(r.id)}
                            className="p-1 text-white/40 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors cursor-pointer"
                            title="Remover reabastecimento"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 flex items-center justify-end gap-3 border-t border-white/10 mt-6">
                <button
                  id="cancel-log-btn"
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white/60 hover:text-white hover:bg-white/10 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Undo size={16} />
                  <span>Cancelar</span>
                </button>
                <button
                  id="submit-log-btn"
                  type="submit"
                  className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-white/15 hover:bg-white/25 border border-white/15 transition-all flex items-center gap-1.5 shadow-md active:scale-98 cursor-pointer"
                >
                  {editingLog ? <Save size={16} /> : <Plus size={16} />}
                  <span>{editingLog ? "Salvar Registro" : "Adicionar Registro"}</span>
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
