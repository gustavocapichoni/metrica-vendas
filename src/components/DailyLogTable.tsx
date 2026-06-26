import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  ArrowUpDown, 
  PlusCircle, 
  Trash2, 
  Edit3, 
  AlertCircle, 
  Calendar,
  MessageSquare,
  Download,
  Filter
} from "lucide-react";
import { DailyLog } from "../types";

interface DailyLogTableProps {
  logs: DailyLog[];
  onEdit: (log: DailyLog) => void;
  onDelete: (id: string) => void;
  onAddNew: () => void;
  selectedLogId?: string | null;
  onSelectLog?: (id: string) => void;
}

type SortField = "date" | "quantityToSell" | "soldValue" | "pilotCost" | "reinvestedValue" | "expenses" | "netProfit";
type SortOrder = "asc" | "desc";

export default function DailyLogTable({ logs, onEdit, onDelete, onAddNew, selectedLogId, onSelectLog }: DailyLogTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [periodFilter, setPeriodFilter] = useState("Todos");

  const formatCurrency = (value: number | undefined | null) => {
    const safeValue = value ?? 0;
    return safeValue.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "-";
    const [year, month, day] = dateStr.split("-");
    return `${day}/${month}/${year}`;
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  };

  // Filter by period (Semana, Mes, Ano, Todos)
  const filteredByPeriod = useMemo(() => {
    if (periodFilter === "Todos") return logs;
    
    const now = new Date();
    now.setHours(23, 59, 59, 999);
    
    let limitDate = new Date();
    if (periodFilter === "Semana") {
      limitDate.setDate(now.getDate() - 7);
    } else if (periodFilter === "Mes") {
      limitDate.setDate(now.getDate() - 30);
    } else if (periodFilter === "Ano") {
      limitDate.setDate(now.getDate() - 365);
    }
    
    return logs.filter(log => {
      const logDate = new Date(log.date + "T00:00:00");
      return logDate >= limitDate;
    });
  }, [logs, periodFilter]);

  // Filter logs by search term (notes or date)
  const filteredLogs = useMemo(() => {
    return filteredByPeriod.filter((log) => {
      const formattedDate = formatDate(log.date);
      const notesMatch = log.notes?.toLowerCase().includes(searchTerm.toLowerCase()) || false;
      const dateMatch = log.date.includes(searchTerm) || formattedDate.includes(searchTerm);
      return notesMatch || dateMatch;
    });
  }, [filteredByPeriod, searchTerm]);

  // Sort logs
  const sortedLogs = useMemo(() => {
    return [...filteredLogs].sort((a, b) => {
      let valueA: string | number;
      let valueB: string | number;

      if (sortField === "netProfit") {
        valueA = (a.soldValue ?? 0) - (a.pilotCost ?? 0) - (a.reinvestedValue ?? 0) - (a.expenses ?? 0);
        valueB = (b.soldValue ?? 0) - (b.pilotCost ?? 0) - (b.reinvestedValue ?? 0) - (b.expenses ?? 0);
      } else {
        valueA = a[sortField] ?? 0;
        valueB = b[sortField] ?? 0;
      }

      if (typeof valueA === "string" && typeof valueB === "string") {
        return sortOrder === "asc"
          ? valueA.localeCompare(valueB)
          : valueB.localeCompare(valueA);
      } else {
        return sortOrder === "asc"
          ? (valueA as number) - (valueB as number)
          : (valueB as number) - (valueA as number);
      }
    });
  }, [filteredLogs, sortField, sortOrder]);

  const exportToCSV = () => {
    if (filteredLogs.length === 0) return;

    let csvContent = "\uFEFF"; // UTF-8 BOM
    csvContent += "Data,Quantidade Venda,Valor Vendido,Custo Piloto,Reinvestido,Gasto Dia,Lucro Liquido,Observacoes\n";

    filteredLogs.forEach(log => {
      const profit = (log.soldValue ?? 0) - (log.pilotCost ?? 0) - (log.reinvestedValue ?? 0) - (log.expenses ?? 0);
      const notesEscaped = log.notes ? `"${log.notes.replace(/"/g, '""')}"` : "";
      csvContent += `${formatDate(log.date)},${log.quantityToSell || 0},${(log.soldValue || 0).toFixed(2)},${(log.pilotCost || 0).toFixed(2)},${(log.reinvestedValue || 0).toFixed(2)},${(log.expenses || 0).toFixed(2)},${profit.toFixed(2)},${notesEscaped}\n`;
    });

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `controle_caixa_${periodFilter.toLowerCase()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div id="daily-log-section" className="glass-panel shadow-2xl rounded-3xl overflow-hidden border border-white/10 mt-12 mb-12">
      {/* Header Controls */}
      <div className="p-6 sm:p-8 border-b border-white/10 flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white/[0.02]">
        <div>
          <h2 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <Calendar size={20} className="text-indigo-400" />
            <span>Controle de Caixa Diário</span>
          </h2>
          <p className="text-xs text-white/50 mt-1 font-medium">
            Gerencie as vendas diárias, custos operacionais de pilotos, reinvestimentos e lucro líquido
          </p>
        </div>

        {/* Search & Actions */}
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
          {/* Period Filter Dropdown */}
          <div className="relative">
            <select
              value={periodFilter}
              onChange={(e) => setPeriodFilter(e.target.value)}
              className="appearance-none pl-4 pr-8 py-2 rounded-xl text-xs bg-white/5 border border-white/10 text-white/80 font-semibold focus:outline-none focus:ring-2 focus:ring-white/20 cursor-pointer h-[34px]"
            >
              <option value="Todos" className="bg-slate-900 text-white">Todos Períodos</option>
              <option value="Semana" className="bg-slate-900 text-white">Esta Semana</option>
              <option value="Mes" className="bg-slate-900 text-white">Este Mês</option>
              <option value="Ano" className="bg-slate-900 text-white">Este Ano</option>
            </select>
            <Filter className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" size={12} />
          </div>

          {/* Search Input */}
          <div className="relative flex-1 sm:w-48">
            <input
              id="search-log-input"
              type="text"
              placeholder="Buscar registros..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-4 pr-10 py-2 rounded-xl text-xs bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-white/20 transition-all font-medium h-[34px]"
            />
          </div>

          {/* Export to CSV Button */}
          <button
            onClick={exportToCSV}
            title="Exportar registros filtrados para CSV"
            className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white/60 hover:text-white transition-all cursor-pointer flex items-center justify-center shrink-0 h-[34px]"
          >
            <Download size={15} />
          </button>

          <button
            id="add-log-btn"
            onClick={onAddNew}
            className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-500/20 hover:bg-indigo-500/35 border border-indigo-500/30 flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md active:scale-95 h-[34px]"
          >
            <PlusCircle size={15} />
            <span>Novo Registro</span>
          </button>
        </div>
      </div>

      {/* Table Area */}
      <div className="overflow-x-auto w-full">
        {sortedLogs.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center">
            <AlertCircle size={36} className="text-white/20 mb-3" />
            <h4 className="text-sm font-semibold text-white/60">Nenhum registro encontrado</h4>
            <p className="text-xs text-white/40 mt-1 max-w-xs leading-relaxed">
              Adicione um novo registro diário ou ajuste os filtros de pesquisa.
            </p>
          </div>
        ) : (
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.01]">
                <th 
                  id="th-log-date"
                  onClick={() => handleSort("date")}
                  className="px-6 py-4 text-xs font-bold text-white/40 uppercase tracking-wider cursor-pointer hover:bg-white/5 transition-colors group select-none"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Data</span>
                    <ArrowUpDown size={12} className="text-white/30 group-hover:text-white/80 transition-colors" />
                  </div>
                </th>
                <th 
                  id="th-log-qty"
                  onClick={() => handleSort("quantityToSell")}
                  className="px-6 py-4 text-xs font-bold text-white/40 uppercase tracking-wider cursor-pointer hover:bg-white/5 transition-colors group text-right select-none"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Qtd. Venda</span>
                    <ArrowUpDown size={12} className="text-white/30 group-hover:text-white/80 transition-colors" />
                  </div>
                </th>
                <th 
                  id="th-log-sold"
                  onClick={() => handleSort("soldValue")}
                  className="px-6 py-4 text-xs font-bold text-white/40 uppercase tracking-wider cursor-pointer hover:bg-white/5 transition-colors group text-right select-none"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Valor Vendido</span>
                    <ArrowUpDown size={12} className="text-white/30 group-hover:text-white/80 transition-colors" />
                  </div>
                </th>
                <th 
                  id="th-log-pilot"
                  onClick={() => handleSort("pilotCost")}
                  className="px-6 py-4 text-xs font-bold text-white/40 uppercase tracking-wider cursor-pointer hover:bg-white/5 transition-colors group text-right select-none"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Doce Pilotos (Custo)</span>
                    <ArrowUpDown size={12} className="text-white/30 group-hover:text-white/80 transition-colors" />
                  </div>
                </th>
                <th 
                  id="th-log-reinvest"
                  onClick={() => handleSort("reinvestedValue")}
                  className="px-6 py-4 text-xs font-bold text-white/40 uppercase tracking-wider cursor-pointer hover:bg-white/5 transition-colors group text-right select-none"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Reinvestido</span>
                    <ArrowUpDown size={12} className="text-white/30 group-hover:text-white/80 transition-colors" />
                  </div>
                </th>
                <th 
                  id="th-log-expenses"
                  onClick={() => handleSort("expenses")}
                  className="px-6 py-4 text-xs font-bold text-white/40 uppercase tracking-wider cursor-pointer hover:bg-white/5 transition-colors group text-right select-none"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Gasto Dia</span>
                    <ArrowUpDown size={12} className="text-white/30 group-hover:text-white/80 transition-colors" />
                  </div>
                </th>
                <th 
                  id="th-log-profit"
                  onClick={() => handleSort("netProfit")}
                  className="px-6 py-4 text-xs font-bold text-white/40 uppercase tracking-wider cursor-pointer hover:bg-white/5 transition-colors group text-right select-none"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Lucro do Dia</span>
                    <ArrowUpDown size={12} className="text-white/30 group-hover:text-white/80 transition-colors" />
                  </div>
                </th>
                <th className="px-6 py-4 text-xs font-bold text-white/40 uppercase tracking-wider">
                  Observações
                </th>
                <th className="px-6 py-4 text-xs font-bold text-white/40 uppercase tracking-wider text-right w-24">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              <AnimatePresence initial={false}>
                {sortedLogs.map((log) => {
                  const profit = (log.soldValue ?? 0) - (log.pilotCost ?? 0) - (log.reinvestedValue ?? 0) - (log.expenses ?? 0);
                  return (
                    <motion.tr
                      id={`log-row-${log.id}`}
                      key={log.id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.2 }}
                      className={`transition-all cursor-pointer border-l-4 ${
                        selectedLogId === log.id 
                          ? "bg-white/[0.07] border-indigo-500 shadow-inner hover:bg-white/[0.09]" 
                          : "hover:bg-white/[0.02] border-transparent"
                      }`}
                      onClick={() => onSelectLog?.(log.id)}
                    >
                      {/* Date */}
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-white font-semibold">
                        {formatDate(log.date)}
                      </td>

                      {/* Quantity To Sell */}
                      <td className="px-6 py-4 text-right font-mono text-sm text-white/90">
                        {(log.quantityToSell ?? 0).toLocaleString("pt-BR")}
                      </td>

                      {/* Sold Value */}
                      <td className="px-6 py-4 text-right font-mono text-sm text-emerald-400 font-semibold">
                        {formatCurrency(log.soldValue)}
                      </td>

                      {/* Pilot Cost */}
                      <td className="px-6 py-4 text-right font-mono text-sm text-red-400 font-medium">
                        {log.pilotCost && log.pilotCost > 0 ? `-${formatCurrency(log.pilotCost)}` : formatCurrency(0)}
                      </td>

                      {/* Reinvested Value */}
                      <td className="px-6 py-4 text-right font-mono text-sm text-amber-400 font-medium">
                        {formatCurrency(log.reinvestedValue)}
                      </td>

                      {/* Daily Expenses */}
                      <td className="px-6 py-4 text-right font-mono text-sm text-red-400 font-medium">
                        {log.expenses && log.expenses > 0 ? `-${formatCurrency(log.expenses)}` : formatCurrency(0)}
                      </td>

                      {/* Net Profit */}
                      <td className={`px-6 py-4 text-right font-mono text-sm font-bold ${profit >= 0 ? "text-indigo-400" : "text-red-500"}`}>
                        {formatCurrency(profit)}
                      </td>

                      {/* Notes */}
                      <td className="px-6 py-4 text-xs text-white/60 max-w-xs truncate" title={log.notes}>
                        {log.notes ? (
                          <div className="flex items-center gap-1">
                            <MessageSquare size={12} className="text-white/30 shrink-0" />
                            <span>{log.notes}</span>
                          </div>
                        ) : (
                          <span className="text-white/20 italic">Sem notas</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            id={`edit-log-${log.id}`}
                            onClick={(e) => { e.stopPropagation(); onEdit(log); }}
                            className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                            title="Editar registro"
                          >
                            <Edit3 size={14} />
                          </button>
                          <button
                            id={`delete-log-${log.id}`}
                            onClick={(e) => { e.stopPropagation(); onDelete(log.id); }}
                            className="p-1.5 rounded-lg text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                            title="Excluir registro"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </AnimatePresence>
            </tbody>
          </table>
        )}
      </div>

      {/* Footer statistics summary card */}
      {sortedLogs.length > 0 && (
        <div className="px-6 py-5 bg-white/[0.02] border-t border-white/10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <p className="text-xs font-semibold text-white/40">
            Mostrando <span className="text-white font-bold">{sortedLogs.length}</span> registros de caixa
          </p>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 sm:gap-6 text-xs text-white/50 font-mono w-full md:w-auto">
            <div className="flex flex-wrap gap-4 sm:gap-6">
              <p>
                Total Vendido: <span className="font-bold text-emerald-400 font-sans text-sm">{formatCurrency(sortedLogs.reduce((sum, item) => sum + (item.soldValue ?? 0), 0))}</span>
              </p>
              <span className="hidden sm:inline text-white/10">|</span>
              <p>
                Doce Piloto: <span className="font-bold text-red-400 font-sans text-sm">
                  {(() => {
                    const total = sortedLogs.reduce((sum, item) => sum + (item.pilotCost ?? 0), 0);
                    return total > 0 ? `-${formatCurrency(total)}` : formatCurrency(0);
                  })()}
                </span>
              </p>
              <span className="hidden sm:inline text-white/10">|</span>
              <p>
                Reinvestido: <span className="font-bold text-amber-400 font-sans text-sm">{formatCurrency(sortedLogs.reduce((sum, item) => sum + (item.reinvestedValue ?? 0), 0))}</span>
              </p>
              <span className="hidden sm:inline text-white/10">|</span>
              <p>
                Gasto Dia: <span className="font-bold text-red-400 font-sans text-sm">
                  {(() => {
                    const total = sortedLogs.reduce((sum, item) => sum + (item.expenses ?? 0), 0);
                    return total > 0 ? `-${formatCurrency(total)}` : formatCurrency(0);
                  })()}
                </span>
              </p>
              <span className="hidden sm:inline text-white/10">|</span>
              <p>
                Lucro Acumulado: <span className="font-bold text-indigo-400 font-sans text-sm">{formatCurrency(sortedLogs.reduce((sum, item) => sum + ((item.soldValue ?? 0) - (item.pilotCost ?? 0) - (item.reinvestedValue ?? 0) - (item.expenses ?? 0)), 0))}</span>
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
