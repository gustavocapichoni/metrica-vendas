import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Edit2, Trash2, Search, Filter, ArrowUpDown, ChevronDown, PlusCircle, Download } from "lucide-react";
import { Item, DailyLog } from "../types";
import { CATEGORIES } from "../data";

interface ItemTableProps {
  items: Item[];
  logs: DailyLog[];
  onEdit: (item: Item) => void;
  onDelete: (id: string) => void;
  onAddNew: () => void;
}

type SortField = "name" | "price" | "totalSold" | "profit" | "currentStock";
type SortOrder = "asc" | "desc";

export default function ItemTable({ items, logs, onEdit, onDelete, onAddNew }: ItemTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Todas");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");

  const itemsWithSales = useMemo(() => {
    const salesMap: Record<string, { qty: number; rev: number }> = {};
    items.forEach(i => { salesMap[i.id] = { qty: 0, rev: 0 }; });
    logs.forEach(log => {
      if (log.itemSales) {
        log.itemSales.forEach(s => {
          if (salesMap[s.itemId]) {
            const soldQty = s.busSales ? s.busSales.reduce((acc, v) => acc + v, 0) : (s.loadedQuantity - s.leftoverQuantity);
            const qty = Math.max(0, soldQty);
            salesMap[s.itemId].qty += qty;
            salesMap[s.itemId].rev += qty * s.price;
          }
        });
      }
    });

    return items.map(item => ({
      ...item,
      totalSold: salesMap[item.id]?.rev || 0,
      totalSoldQty: salesMap[item.id]?.qty || 0
    }));
  }, [items, logs]);

  const exportToCSV = () => {
    if (filteredItems.length === 0) return;

    let csvContent = "\uFEFF"; // UTF-8 BOM
    csvContent += "Nome do Produto,Categoria,Preco Unitario,Estoque Atual,Estoque Minimo,Total Vendido,Lucro Estimado\n";

    filteredItems.forEach(item => {
      const profit = item.totalSold - item.price;
      const nameEscaped = `"${item.name.replace(/"/g, '""')}"`;
      csvContent += `${nameEscaped},${item.category || "Outros"},${item.price.toFixed(2)},${item.currentStock ?? 0},${item.minStock ?? 0},${item.totalSold.toFixed(2)},${profit.toFixed(2)}\n`;
    });

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `produtos_${selectedCategory.toLowerCase()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Format Helpers
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL"
    }).format(value);
  };

  // Handle Header Sorting
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc"); // Default to desc for prices/sales, asc for names
    }
  };

  // Filter Items
  const filteredItems = itemsWithSales.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          item.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "Todas" || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Sort Items
  const sortedItems = [...filteredItems].sort((a, b) => {
    let valueA: string | number;
    let valueB: string | number;

    if (sortField === "profit") {
      valueA = a.totalSold - a.price;
      valueB = b.totalSold - b.price;
    } else {
      valueA = a[sortField];
      valueB = b[sortField];
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

  return (
    <div id="table-container-card" className="glass-panel rounded-2xl overflow-hidden">
      {/* Table Header / Filters */}
      <div className="p-5 border-b border-white/10 flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 bg-transparent">
        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold text-emerald-400 bg-emerald-500/10 uppercase tracking-wider">
            📦 Cadastro de Produtos
          </span>
        </div>

        {/* Filters Group */}
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
          {/* Search Input */}
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" size={16} />
            <input
              id="search-input"
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar item..."
              className="w-full pl-10 pr-4 py-2 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-white/20 transition-all bg-white/5 border border-white/10 text-white placeholder:text-white/30"
            />
          </div>

          {/* Category Filter */}
          <div className="relative">
            <Filter className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" size={14} />
            <select
              id="category-filter"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="appearance-none pl-9 pr-8 py-2 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-white/20 transition-all bg-white/5 border border-white/10 text-white/80 font-semibold cursor-pointer"
            >
              <option value="Todas" className="bg-slate-900 text-white">Todas Categorias</option>
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat} className="bg-slate-900 text-white">
                  {cat}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" size={14} />
          </div>

           {/* Export CSV Button */}
          <button
            onClick={exportToCSV}
            title="Exportar produtos para CSV"
            className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white/60 hover:text-white transition-all cursor-pointer flex items-center justify-center shrink-0 h-[38px]"
          >
            <Download size={15} />
          </button>

          {/* Quick Add Button */}
          <button
            id="add-new-floating-btn"
            onClick={onAddNew}
            className="flex items-center justify-center gap-1.5 px-4 py-2 bg-white/15 hover:bg-white/25 border border-white/15 text-white font-bold text-sm rounded-xl transition-all shadow-sm active:scale-98 cursor-pointer"
          >
            <PlusCircle size={16} />
            <span>Adicionar</span>
          </button>
        </div>
      </div>

      {/* Main Table Content */}
      <div className="overflow-x-auto">
        {sortedItems.length === 0 ? (
          <div id="empty-state" className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center text-white/40 border border-white/10 mb-4">
              <Search size={28} className="stroke-1.5" />
            </div>
            <h4 className="font-bold text-white text-base">Nenhum item encontrado</h4>
            <p className="text-sm text-white/50 mt-1 max-w-sm">
              {items.length === 0 
                ? "Nenhum produto cadastrado no momento. Comece cadastrando o primeiro item!"
                : "Não encontramos itens correspondentes à sua busca ou filtro. Tente reajustar os filtros."}
            </p>
            {items.length === 0 && (
              <button
                id="empty-state-add-btn"
                onClick={onAddNew}
                className="mt-5 px-5 py-2.5 bg-white/15 hover:bg-white/25 text-white font-bold text-sm rounded-xl transition-all border border-white/15 flex items-center gap-2 shadow-sm cursor-pointer"
              >
                <PlusCircle size={16} />
                <span>Adicionar Primeiro Item</span>
              </button>
            )}
          </div>
        ) : (
          <table className="w-full text-left border-collapse" id="items-table">
            <thead>
              <tr className="bg-white/5 border-b border-white/10">
                <th 
                  id="th-name"
                  onClick={() => handleSort("name")}
                  className="px-6 py-4 text-xs font-bold text-white/40 uppercase tracking-wider cursor-pointer hover:bg-white/5 transition-colors group select-none"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Nome do Item</span>
                    <ArrowUpDown size={12} className="text-white/30 group-hover:text-white/80 transition-colors" />
                  </div>
                </th>
                <th className="px-6 py-4 text-xs font-bold text-white/40 uppercase tracking-wider select-none">
                  Categoria
                </th>
                <th 
                  id="th-price"
                  onClick={() => handleSort("price")}
                  className="px-6 py-4 text-xs font-bold text-white/40 uppercase tracking-wider cursor-pointer hover:bg-white/5 transition-colors group text-right select-none"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Preço Unitário</span>
                    <ArrowUpDown size={12} className="text-white/30 group-hover:text-white/80 transition-colors" />
                  </div>
                </th>
                <th 
                  id="th-currentstock"
                  onClick={() => handleSort("currentStock")}
                  className="px-6 py-4 text-xs font-bold text-white/40 uppercase tracking-wider cursor-pointer hover:bg-white/5 transition-colors group text-center select-none"
                >
                  <div className="flex items-center justify-center gap-1.5">
                    <span>Estoque</span>
                    <ArrowUpDown size={12} className="text-white/30 group-hover:text-white/80 transition-colors" />
                  </div>
                </th>
                <th 
                  id="th-totalsold"
                  onClick={() => handleSort("totalSold")}
                  className="px-6 py-4 text-xs font-bold text-white/40 uppercase tracking-wider cursor-pointer hover:bg-white/5 transition-colors group text-right select-none"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Total Vendido</span>
                    <ArrowUpDown size={12} className="text-white/30 group-hover:text-white/80 transition-colors" />
                  </div>
                </th>
                <th 
                  id="th-profit"
                  onClick={() => handleSort("profit")}
                  className="px-6 py-4 text-xs font-bold text-white/40 uppercase tracking-wider cursor-pointer hover:bg-white/5 transition-colors group text-right select-none"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Faturamento (Lucro)</span>
                    <ArrowUpDown size={12} className="text-white/30 group-hover:text-white/80 transition-colors" />
                  </div>
                </th>
                <th className="px-6 py-4 text-xs font-bold text-white/40 uppercase tracking-wider text-center select-none">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              <AnimatePresence initial={false}>
                {sortedItems.map((item) => {
                  const profit = item.totalSold - item.price;
                  return (
                    <motion.tr
                      id={`row-${item.id}`}
                      key={item.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0, height: 0 }}
                      className="hover:bg-white/5 transition-colors group/row"
                    >
                      {/* Name */}
                      <td className="px-6 py-4">
                        <div className="font-semibold text-white text-sm max-w-xs truncate" title={item.name}>
                          {item.name}
                        </div>
                      </td>

                      {/* Category Badge */}
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-white/5 border border-white/10 text-white/70">
                          {item.category || "Outros"}
                        </span>
                      </td>

                      {/* Price */}
                      <td className="px-6 py-4 text-right font-mono text-sm text-slate-300 font-medium">
                        {formatCurrency(item.price)}
                      </td>

                      {/* Stock */}
                      <td className="px-6 py-4 text-center">
                        {(() => {
                           const stock = item.currentStock ?? 0;
                           const min = item.minStock ?? 0;
                           let badgeClass = "bg-white/5 text-white/70 border-white/10";
                           
                           if (stock === 0) badgeClass = "bg-red-500/10 text-red-400 border-red-500/35 shadow-lg shadow-red-500/5 animate-pulse font-extrabold";
                           else if (stock <= min) badgeClass = "bg-amber-500/10 text-amber-400 border-amber-500/35 shadow-lg shadow-amber-500/5 animate-pulse font-extrabold";
                           else badgeClass = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
                           
                           return (
                             <div className="flex flex-col items-center gap-1.5">
                               <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold border ${badgeClass}`}>
                                 {stock} un
                               </span>
                               {stock <= min && stock > 0 && (
                                 <span className="text-[9px] text-amber-500/80 font-bold uppercase tracking-wider animate-pulse">Baixo</span>
                               )}
                               {stock === 0 && (
                                 <span className="text-[9px] text-red-500/80 font-bold uppercase tracking-wider animate-pulse">Esgotado</span>
                               )}
                             </div>
                           );
                        })()}
                      </td>

                      {/* Total Sold */}
                      <td className="px-6 py-4 text-right font-mono text-sm text-emerald-400 font-semibold">
                        {formatCurrency(item.totalSold)}
                      </td>

                      {/* Profit (Subtraction) */}
                      <td className={`px-6 py-4 text-right font-mono text-sm font-bold ${profit >= 0 ? "text-indigo-400" : "text-red-400"}`}>
                        {formatCurrency(profit)}
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            id={`edit-btn-${item.id}`}
                            onClick={() => onEdit(item)}
                            title="Editar item"
                            className="p-1.5 rounded-lg text-white/50 hover:text-blue-400 hover:bg-blue-500/10 hover:border-blue-500/20 transition-all border border-transparent cursor-pointer"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            id={`delete-btn-${item.id}`}
                            onClick={() => onDelete(item.id)}
                            title="Excluir item"
                            className="p-1.5 rounded-lg text-white/50 hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/20 transition-all border border-transparent cursor-pointer"
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

      {/* Table Footer with Summary Row */}
      {sortedItems.length > 0 && (
        <div className="bg-slate-950/25 border-t border-white/10 px-6 py-3.5 flex flex-col sm:flex-row justify-between items-center gap-3">
          <p className="text-xs font-semibold text-white/40">
            Mostrando <span className="text-white font-bold">{sortedItems.length}</span> de <span className="text-white/60 font-medium">{items.length}</span> itens
          </p>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 sm:gap-6 text-xs text-white/50 font-mono">
            <p>
              Soma Preço Unitário: <span className="font-bold text-slate-300 font-sans text-sm">{formatCurrency(sortedItems.reduce((sum, item) => sum + item.price, 0))}</span>
            </p>
            <span className="hidden sm:inline text-white/10">|</span>
            <p>
              Total Vendido: <span className="font-bold text-white font-sans text-sm">{formatCurrency(sortedItems.reduce((sum, item) => sum + item.totalSold, 0))}</span>
            </p>
            <span className="hidden sm:inline text-white/10">|</span>
            <p>
              Lucro Total: <span className="font-bold text-indigo-400 font-sans text-sm">{formatCurrency(sortedItems.reduce((sum, item) => sum + (item.totalSold - item.price), 0))}</span>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
