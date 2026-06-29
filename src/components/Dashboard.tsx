import { useMemo, useState } from "react";
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Package, 
  AlertTriangle, 
  ShoppingBag, 
  Calendar,
  Sparkles,
  ArrowRight,
  Plus,
  Clock,
  CheckCircle2
} from "lucide-react";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
} from "recharts";
import { DailyLog, Item, DailyItemSale } from "../types";

interface DashboardProps {
  logs: DailyLog[];
  items: Item[];
  onGoToVendas: () => void;
  onGoToEstoque: () => void;
  onSelectLog: (id: string) => void;
  onUpdateStock: (itemId: string, newStock: number) => void;
}

export default function Dashboard({ logs, items, onGoToVendas, onGoToEstoque, onSelectLog, onUpdateStock }: DashboardProps) {
  const [restockInputs, setRestockInputs] = useState<{ [itemId: string]: number | "" }>({});
  const [restockSuccess, setRestockSuccess] = useState<{ [itemId: string]: boolean }>({});

  // Date format pt-BR helper
  const formatDate = (dateStr: string) => {
    if (!dateStr) return "-";
    const [year, month, day] = dateStr.split("-");
    return `${day}/${month}`;
  };

  // Financial summaries
  const stats = useMemo(() => {
    let totalRevenue = 0;
    let totalExpenses = 0;
    let totalPilot = 0;
    let totalReinvested = 0;
    let totalSoldQty = 0;

    logs.forEach(log => {
      totalRevenue += log.soldValue || 0;
      totalExpenses += log.expenses || 0;
      totalPilot += log.pilotCost || 0;
      totalReinvested += log.reinvestedValue || 0;
      totalSoldQty += log.quantityToSell || 0; // approximate sold qty or total logs qty
    });

    // Also calculate actual sold quantities and cost of goods sold from detailed itemSales
    let actualSoldUnits = 0;
    let totalCostOfGoodsSold = 0;
    logs.forEach(log => {
      if (log.itemSales) {
        log.itemSales.forEach(s => {
          const sold = s.busSales ? s.busSales.reduce((sum, v) => sum + v, 0) : (s.loadedQuantity - s.leftoverQuantity);
          const qty = Math.max(0, sold);
          actualSoldUnits += qty;
          
          const unitSalePrice = s.salePrice ?? 1.0;
          const unitCost = s.price / (s.unitsPerPackage || 1);
          
          let pilotQty = s.busesBoarded;
          if (s.pilotCost !== undefined) {
            if (unitCost > 0 && s.pilotCost % unitCost === 0) {
              pilotQty = Math.round(s.pilotCost / unitCost);
            } else if (unitSalePrice > 0 && s.pilotCost % unitSalePrice === 0) {
              pilotQty = Math.round(s.pilotCost / unitSalePrice);
            } else {
              pilotQty = unitCost > 0 ? Math.round(s.pilotCost / unitCost) : 0;
            }
          }
          totalCostOfGoodsSold += (qty + pilotQty) * unitCost;
        });
      }
    });

    const netProfit = totalRevenue - totalCostOfGoodsSold - totalExpenses;

    return {
      totalRevenue,
      totalExpenses,
      totalPilot,
      totalReinvested,
      actualSoldUnits,
      netProfit
    };
  }, [logs]);

  // Chart 1: Performance over time (last 10 daily logs sorted chronologically)
  const chronologicalLogs = useMemo(() => {
    return [...logs]
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-10) // last 10 days
      .map(log => {
        let costOfGoodsSold = 0;
        if (log.itemSales) {
          log.itemSales.forEach(s => {
            const sold = s.busSales ? s.busSales.reduce((sum, v) => sum + v, 0) : (s.loadedQuantity - s.leftoverQuantity);
            const qty = Math.max(0, sold);
            
            const unitSalePrice = s.salePrice ?? 1.0;
            const unitCost = s.price / (s.unitsPerPackage || 1);
            
            let pilotQty = s.busesBoarded;
            if (s.pilotCost !== undefined) {
              if (unitCost > 0 && s.pilotCost % unitCost === 0) {
                pilotQty = Math.round(s.pilotCost / unitCost);
              } else if (unitSalePrice > 0 && s.pilotCost % unitSalePrice === 0) {
                pilotQty = Math.round(s.pilotCost / unitSalePrice);
              } else {
                pilotQty = unitCost > 0 ? Math.round(s.pilotCost / unitCost) : 0;
              }
            }
            costOfGoodsSold += (qty + pilotQty) * unitCost;
          });
        }

        const profit = (log.soldValue ?? 0) - costOfGoodsSold - (log.expenses ?? 0);
        return {
          name: formatDate(log.date),
          dateFull: log.date,
          id: log.id,
          Faturamento: log.soldValue || 0,
          Lucro: profit
        };
      });
  }, [logs]);

  // Chart 2: Top Products by quantity sold across all logs
  const topProducts = useMemo(() => {
    const productSalesMap: { [itemName: string]: { quantity: number; revenue: number } } = {};
    
    logs.forEach(log => {
      if (log.itemSales) {
        log.itemSales.forEach(s => {
          const sold = s.busSales ? s.busSales.reduce((sum, v) => sum + v, 0) : (s.loadedQuantity - s.leftoverQuantity);
          const soldQty = Math.max(0, sold);
          if (!productSalesMap[s.itemName]) {
            productSalesMap[s.itemName] = { quantity: 0, revenue: 0 };
          }
          productSalesMap[s.itemName].quantity += soldQty;
          
          const unitSalePrice = s.salePrice ?? 1.0;
          productSalesMap[s.itemName].revenue += soldQty * unitSalePrice;
        });
      }
    });

    return Object.entries(productSalesMap)
      .map(([name, data]) => ({
        name,
        Quantidade: data.quantity,
        Faturamento: data.revenue
      }))
      .sort((a, b) => b.Quantidade - a.Quantidade)
      .slice(0, 5); // top 5
  }, [logs]);

  // Low stock alert list
  const lowStockItems = useMemo(() => {
    return items.filter(item => {
      const stock = item.currentStock ?? 0;
      const min = item.minStock ?? 0;
      return stock <= min;
    });
  }, [items]);

  const todayStr = useMemo(() => {
    const today = new Date();
    const offset = today.getTimezoneOffset();
    const localToday = new Date(today.getTime() - (offset * 60 * 1000));
    return localToday.toISOString().split("T")[0];
  }, []);

  const daysSinceLastLog = useMemo(() => {
    if (logs.length === 0) return null;
    const sortedLogs = [...logs].sort((a, b) => b.date.localeCompare(a.date));
    const lastDateStr = sortedLogs[0].date;
    const lastDate = new Date(lastDateStr + "T00:00:00");
    const today = new Date(todayStr + "T00:00:00");
    const diffTime = today.getTime() - lastDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  }, [logs, todayStr]);

  const todayLogExists = useMemo(() => {
    return logs.some(log => log.date === todayStr);
  }, [logs, todayStr]);



  const handleRestockSubmit = (itemId: string) => {
    const inputVal = restockInputs[itemId];
    if (inputVal === undefined || inputVal === "" || isNaN(Number(inputVal)) || Number(inputVal) <= 0) return;
    
    const item = items.find(i => i.id === itemId);
    if (!item) return;

    const current = item.currentStock ?? 0;
    const addedPackages = Number(inputVal);
    const addedUnits = addedPackages * (item.unitsPerPackage ?? 1);
    onUpdateStock(itemId, current + addedUnits);
    
    // Clear input
    setRestockInputs(prev => ({ ...prev, [itemId]: "" }));
    
    setRestockSuccess(prev => ({ ...prev, [itemId]: true }));
    setTimeout(() => {
      setRestockSuccess(prev => ({ ...prev, [itemId]: false }));
    }, 2000);
  };

  // Color palette for recharts bars
  const colors = ["#6366f1", "#10b981", "#f59e0b", "#3b82f6", "#ec4899"];

  return (
    <div className="space-y-8 mt-4" id="dashboard-tab-panel">
      {/* Welcome Banner */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border border-white/10 bg-white/[0.02]">
        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold text-indigo-400 bg-indigo-500/10 uppercase tracking-wider mb-2">
            <Sparkles size={11} /> Visão Consolidada
          </span>
          <h2 className="text-xl md:text-2xl font-extrabold text-white tracking-tight">
            Dashboard Financeiro e Vendas
          </h2>
          <p className="text-xs text-white/50 mt-1 font-medium max-w-xl">
            Acompanhe o desempenho do caixa, lucro acumulado, campeões de faturamento e reabasteça produtos de forma centralizada.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <button
            onClick={onGoToEstoque}
            className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl text-xs font-bold text-white transition-all shadow-lg bg-indigo-500 hover:bg-indigo-600 border border-indigo-500/20 shadow-indigo-500/10 active:scale-95 cursor-pointer"
          >
            <Package size={15} />
            <span>Criar Estoque</span>
          </button>

          <button
            onClick={onGoToVendas}
            className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl text-xs font-bold text-white transition-all shadow-lg bg-emerald-500 hover:bg-emerald-600 border border-emerald-500/20 shadow-emerald-500/10 active:scale-95 cursor-pointer"
          >
            <ShoppingBag size={15} />
            <span>Ir para Área de Vendas</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Net Profit */}
        <div className="glass-panel p-5 rounded-2xl border border-white/10 relative overflow-hidden bg-white/[0.01]">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] text-white/40 font-mono uppercase tracking-wider">Lucro Líquido Acumulado</p>
              <h3 className="text-lg md:text-xl font-bold text-indigo-400 font-mono mt-1.5">
                {stats.netProfit.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </h3>
            </div>
            <div className={`p-2.5 rounded-xl shrink-0 ${stats.netProfit >= 0 ? "bg-indigo-500/10 text-indigo-400" : "bg-red-500/10 text-red-400"}`}>
              {stats.netProfit >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
            </div>
          </div>
        </div>

        {/* Total Revenue */}
        <div className="glass-panel p-5 rounded-2xl border border-white/10 relative overflow-hidden bg-white/[0.01]">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] text-white/40 font-mono uppercase tracking-wider">Faturamento Bruto</p>
              <h3 className="text-lg md:text-xl font-bold text-emerald-400 font-mono mt-1.5">
                {stats.totalRevenue.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </h3>
            </div>
            <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl shrink-0">
              <DollarSign size={16} />
            </div>
          </div>
        </div>

        {/* Total Reinvested */}
        <div className="glass-panel p-5 rounded-2xl border border-white/10 relative overflow-hidden bg-white/[0.01]">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] text-white/40 font-mono uppercase tracking-wider">Total Reinvestido</p>
              <h3 className="text-lg md:text-xl font-bold text-amber-400 font-mono mt-1.5">
                {stats.totalReinvested.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </h3>
            </div>
            <div className="p-2.5 bg-amber-500/10 text-amber-400 rounded-xl shrink-0">
              <Package size={16} />
            </div>
          </div>
        </div>

        {/* Total Expenses */}
        <div className="glass-panel p-5 rounded-2xl border border-white/10 relative overflow-hidden bg-white/[0.01]">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] text-white/40 font-mono uppercase tracking-wider">Despesas Gerais</p>
              <h3 className="text-lg md:text-xl font-bold text-red-400 font-mono mt-1.5">
                {stats.totalExpenses.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </h3>
            </div>
            <div className="p-2.5 bg-red-500/10 text-red-400 rounded-xl shrink-0">
              <TrendingDown size={16} />
            </div>
          </div>
        </div>

        {/* Units Sold */}
        <div className="glass-panel p-5 rounded-2xl border border-white/10 relative overflow-hidden bg-white/[0.01]">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] text-white/40 font-mono uppercase tracking-wider">Itens Vendidos (un)</p>
              <h3 className="text-lg md:text-xl font-bold text-white font-mono mt-1.5">
                {stats.actualSoldUnits.toLocaleString("pt-BR")} un
              </h3>
            </div>
            <div className="p-2.5 bg-white/5 text-white/80 rounded-xl shrink-0">
              <ShoppingBag size={16} />
            </div>
          </div>
        </div>

        {/* Days Without Logs */}
        <div className={`glass-panel p-5 rounded-2xl border relative overflow-hidden ${
            daysSinceLastLog !== null && daysSinceLastLog > 2 
            ? "border-red-500/20 bg-red-500/5" 
            : "border-white/10 bg-white/[0.01]"
        }`}>
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] text-white/40 font-mono uppercase tracking-wider">Dias s/ Registro</p>
              <h3 className={`text-lg md:text-xl font-bold font-mono mt-1.5 ${
                daysSinceLastLog !== null && daysSinceLastLog > 2 ? "text-red-400" : "text-white"
              }`}>
                {daysSinceLastLog === null ? "N/A" : `${daysSinceLastLog} dia(s)`}
              </h3>
            </div>
            <div className={`p-2.5 rounded-xl shrink-0 ${
              daysSinceLastLog !== null && daysSinceLastLog > 2 ? "bg-red-500/10 text-red-400" : "bg-white/5 text-white/80"
            }`}>
              <Clock size={16} />
            </div>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Weekly Performance Chart */}
        <div className="glass-panel p-5 sm:p-6 rounded-3xl border border-white/10 bg-white/[0.01] lg:col-span-8 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-white tracking-wide">Desempenho de Vendas Recentes</h3>
            <p className="text-[10px] text-white/40 mt-0.5">Evolução diária de Faturamento e Lucro nos últimos caixas</p>
          </div>
          <div className="h-72 w-full">
            {chronologicalLogs.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-white/20 italic">
                Sem registros suficientes para exibir o gráfico.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chronologicalLogs} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="name" stroke="rgba(255,255,255,0.3)" fontSize={10} tickLine={false} />
                  <YAxis stroke="rgba(255,255,255,0.3)" fontSize={10} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "#090d1a", 
                      borderColor: "rgba(255,255,255,0.1)", 
                      borderRadius: "12px", 
                      fontSize: "11px",
                      color: "#fff"
                    }}
                    cursor={{ stroke: "rgba(255,255,255,0.1)", strokeWidth: 1 }}
                  />
                  <Area type="monotone" dataKey="Faturamento" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorRevenue)" />
                  <Area type="monotone" dataKey="Lucro" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorProfit)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Top Products Chart */}
        <div className="glass-panel p-5 sm:p-6 rounded-3xl border border-white/10 bg-white/[0.01] lg:col-span-4 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-white tracking-wide">Top 5 Produtos mais Vendidos</h3>
            <p className="text-[10px] text-white/40 mt-0.5">Ranking de produtos com maior volume vendido</p>
          </div>
          <div className="h-72 w-full flex items-center justify-center">
            {topProducts.length === 0 ? (
              <div className="text-xs text-white/20 italic">
                Nenhum produto vendido registrado nos caixas.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topProducts} layout="vertical" margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} vertical={false} />
                  <XAxis type="number" stroke="rgba(255,255,255,0.3)" fontSize={9} hide />
                  <YAxis dataKey="name" type="category" stroke="rgba(255,255,255,0.5)" fontSize={10} width={80} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "#090d1a", 
                      borderColor: "rgba(255,255,255,0.1)", 
                      borderRadius: "12px", 
                      fontSize: "11px",
                      color: "#fff"
                    }}
                  />
                  <Bar dataKey="Quantidade" fill="#6366f1" radius={[0, 6, 6, 0]} barSize={12}>
                    {topProducts.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Stock Alerts Widget */}
      <div className="glass-panel p-6 rounded-3xl border border-white/10 bg-white/[0.01] space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl">
              <AlertTriangle size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-wide">Alertas de Estoque Crítico</h3>
              <p className="text-[10px] text-white/40 mt-0.5">Produtos esgotados ou abaixo do estoque mínimo definido</p>
            </div>
          </div>
          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-white/60">
            {lowStockItems.length} alertas pendentes
          </span>
        </div>

        {/* Warning Alert Banner */}
        {lowStockItems.length > 0 && (
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold flex items-center gap-2.5 animate-pulse">
            <AlertTriangle size={15} />
            <span>Atenção: Há produtos esgotados ou muito baixos no estoque que exigem reabastecimento imediato!</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {lowStockItems.length === 0 ? (
            <div className="col-span-full py-8 text-center text-xs text-white/30 italic">
              🎉 Excelente! Todos os produtos estão com níveis saudáveis de estoque.
            </div>
          ) : (
            lowStockItems.map((item) => {
              const stock = item.currentStock ?? 0;
              const isOut = stock === 0;
              const inputVal = restockInputs[item.id] ?? "";
              
              return (
                <div 
                  key={item.id} 
                  className={`p-4 rounded-2xl border flex flex-col justify-between gap-4 transition-all ${
                    isOut 
                      ? "bg-red-500/5 border-red-500/20 hover:border-red-500/40" 
                      : "bg-amber-500/5 border-amber-500/20 hover:border-amber-500/40"
                  }`}
                >
                  <div className="flex justify-between items-start gap-2">
                    <div className="min-w-0">
                      <span className="font-bold text-white text-xs block truncate" title={item.name}>
                        {item.name}
                      </span>
                      <span className="text-[10px] text-white/40 block mt-0.5">{item.category}</span>
                    </div>
                    <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-extrabold border shrink-0 uppercase tracking-wider ${
                      isOut 
                        ? "bg-red-500/15 text-red-400 border-red-500/30" 
                        : "bg-amber-500/15 text-amber-400 border-amber-500/30"
                    }`}>
                      {isOut ? "Esgotado" : "Baixo"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between border-t border-white/5 pt-3">
                    <div className="text-left font-mono">
                      <span className="text-[10px] text-white/40 block">Estoque Atual</span>
                      <span className={`text-sm font-bold block ${isOut ? "text-red-400" : "text-amber-400"}`}>
                        {stock} un <span className="text-[10px] text-white/30 font-normal">/ min {item.minStock}</span>
                      </span>
                    </div>

                    {/* Inline Quick Restock Input */}
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min="1"
                        placeholder="+ Pac"
                        value={inputVal}
                        onChange={(e) => {
                          const val = e.target.value;
                          setRestockInputs(prev => ({ 
                            ...prev, 
                            [item.id]: val === "" ? "" : Math.max(1, Number(val)) 
                          }));
                        }}
                        className="w-16 px-2 py-1.5 text-xs text-center rounded-lg bg-slate-950 border border-white/10 text-white font-mono placeholder:text-white/20 focus:outline-none focus:ring-1 focus:ring-white/20"
                      />
                      <button
                        onClick={() => handleRestockSubmit(item.id)}
                        className={`p-1.5 rounded-lg border cursor-pointer flex items-center justify-center shrink-0 transition-all ${
                          restockSuccess[item.id] 
                            ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                            : "bg-white/10 hover:bg-white/20 text-white border-white/10"
                        }`}
                        title="Reabastecer"
                      >
                        {restockSuccess[item.id] ? <CheckCircle2 size={14} /> : <Plus size={14} />}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
