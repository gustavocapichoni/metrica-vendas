import { motion, AnimatePresence } from "motion/react";
import { 
  Plus, 
  Minus, 
  X, 
  Bus, 
  TrendingUp, 
  Sparkles, 
  ShoppingBag, 
  ArrowUpDown, 
  RefreshCw, 
  AlertCircle, 
  Trash2,
  DollarSign,
  FileText,
  Printer,
  Copy,
  Check,
  Calendar,
  Download
} from "lucide-react";
import { DailyLog, DailyItemSale, Item, getPilotSweetUnitCost } from "../types";
import { useState } from "react";

interface DailyItemSalesTableProps {
  log: DailyLog | null;
  items: Item[];
  onUpdateSale: (itemId: string, updatedFields: Partial<DailyItemSale>) => void;
  onClearSale: (itemId: string) => void;
  isReportModalOpenExternally?: boolean;
  onCloseReportModalExternally?: () => void;
}

type SortField = "itemName" | "loadedQuantity" | "leftoverQuantity" | "soldQuantity" | "soldValue" | "busesBoarded" | "netProfit";
type SortOrder = "asc" | "desc";

export default function DailyItemSalesTable({ 
  log, 
  items, 
  onUpdateSale, 
  onClearSale,
  isReportModalOpenExternally,
  onCloseReportModalExternally
}: DailyItemSalesTableProps) {
  const [sortField, setSortField] = useState<SortField>("itemName");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
  const [customValueInput, setCustomValueInput] = useState<{ [itemId: string]: string }>({});
  const [reinvestedInput, setReinvestedInput] = useState<{ [itemId: string]: string }>({});
  const [expensesInput, setExpensesInput] = useState<{ [itemId: string]: string }>({});
  const [isReportModalOpenLocally, setIsReportModalOpenLocally] = useState(false);
  const [copied, setCopied] = useState(false);

  const isReportModalOpen = isReportModalOpenExternally !== undefined ? isReportModalOpenExternally : isReportModalOpenLocally;
  
  const setReportModalOpen = (open: boolean) => {
    if (isReportModalOpenExternally !== undefined && onCloseReportModalExternally) {
      if (!open) onCloseReportModalExternally();
    } else {
      setIsReportModalOpenLocally(open);
    }
  };

  if (!log) {
    return (
      <div id="no-log-selected-container" className="bg-slate-900/40 border border-white/5 rounded-2xl p-10 text-center flex flex-col items-center justify-center space-y-4">
        <div className="p-4 bg-white/5 rounded-full text-indigo-400">
          <Bus size={32} />
        </div>
        <div>
          <h3 className="text-white font-bold text-lg font-sans">Sem Dia Selecionado</h3>
          <p className="text-sm text-white/45 max-w-md mt-1 mx-auto">
            Selecione uma data no Controle de Caixa Diário abaixo para ver e gerenciar os lançamentos detalhados de vendas por ônibus de cada item.
          </p>
        </div>
      </div>
    );
  }

  const formatCurrency = (value: number) => {
    return value.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  };

  // Merge registered catalog items with active itemSales list
  const sales = log.itemSales || [];
  const mergedSales = items.map(item => {
    const existingSale = sales.find(s => s.itemId === item.id);
    
    const busSales = existingSale?.busSales || [];
    const loadedQuantity = existingSale ? existingSale.loadedQuantity : 0;
    const busesBoarded = busSales.length;
    const totalSoldQty = busSales.reduce((sum, v) => sum + v, 0);
    
    const unitSalePrice = existingSale?.salePrice ?? item.salePrice ?? 1.0;
    const unitsPerPackage = existingSale?.unitsPerPackage ?? item.unitsPerPackage ?? 1;
    
    // Unit cost for reference (package price ÷ units per package)
    const unitCost = item.price / unitsPerPackage;
    // Pilot sweet is valued at SALE price (the revenue lost by giving it away)
    const unitPilotCost = unitSalePrice;

    // Default pilot sweets in units = busesBoarded, unless pilotCost exists and implies a different quantity
    const pilotSweetsQty = existingSale?.pilotCost !== undefined 
      ? Math.round(existingSale.pilotCost / unitPilotCost) 
      : busesBoarded;

    const leftoverQuantity = Math.max(0, loadedQuantity - totalSoldQty - pilotSweetsQty);
    const pilotCost = existingSale?.pilotCost !== undefined ? existingSale.pilotCost : (pilotSweetsQty * unitPilotCost);
    const expenses = existingSale?.expenses || 0;

    const soldValue = totalSoldQty * unitSalePrice;
    const costOfProducts = (totalSoldQty + pilotSweetsQty) * unitCost;
    // Net profit = revenue - cost of products (sold + pilot) - extra expenses
    const netProfit = soldValue - costOfProducts - expenses;

    return {
      itemId: item.id,
      itemName: item.name,
      price: item.price,
      unitsPerPackage,
      salePrice: unitSalePrice,
      unitCost,
      unitPilotCost,
      loadedQuantity,
      leftoverQuantity,
      busesBoarded,
      pilotCost,
      expenses,
      busSales,
      pilotSweetsQty,
      soldQuantity: totalSoldQty,
      soldValue,
      netProfit,
      isTouched: !!existingSale,
      currentStock: item.currentStock || 0
    };
  });

  // Filter out products for statistics that have actual loaded Carga or sales
  const activeSalesForStats = mergedSales.filter(s => s.loadedQuantity > 0 || s.busSales.length > 0);

  // Sorting
  const sortedSales = [...mergedSales].sort((a, b) => {
    let valueA: string | number = 0;
    let valueB: string | number = 0;

    if (sortField === "itemName") {
      valueA = a.itemName.toLowerCase();
      valueB = b.itemName.toLowerCase();
    } else {
      valueA = a[sortField] ?? 0;
      valueB = b[sortField] ?? 0;
    }

    if (valueA < valueB) return sortOrder === "asc" ? -1 : 1;
    if (valueA > valueB) return sortOrder === "asc" ? 1 : -1;
    return 0;
  });

  // Calculate high-level performance insights over active sales
  const totalBuses = activeSalesForStats.reduce((sum, item) => sum + item.busesBoarded, 0);
  const totalQtySold = activeSalesForStats.reduce((sum, item) => sum + item.soldQuantity, 0);
  const totalRevenue = activeSalesForStats.reduce((sum, item) => sum + item.soldValue, 0);
  const totalExpenses = activeSalesForStats.reduce((sum, item) => sum + item.expenses, 0);
  const totalReinvestedItem = activeSalesForStats.reduce((sum, item) => sum + (item.reinvestedValue || 0), 0);
  const totalPilotCost = activeSalesForStats.reduce((sum, item) => sum + item.pilotCost, 0);
  const netProfitTotal = activeSalesForStats.reduce((sum, item) => sum + item.netProfit, 0);

  // Best product by qty
  let bestProductQty = "Nenhum";
  let maxQty = -1;
  activeSalesForStats.forEach((s) => {
    if (s.soldQuantity > maxQty) {
      maxQty = s.soldQuantity;
      bestProductQty = s.itemName;
    }
  });

  // Best efficiency (qty per bus)
  let bestEfficiencyProduct = "Nenhum";
  let maxEfficiency = -1;
  activeSalesForStats.forEach((s) => {
    const eff = s.busesBoarded > 0 ? s.soldQuantity / s.busesBoarded : 0;
    if (eff > maxEfficiency && s.soldQuantity > 0) {
      maxEfficiency = eff;
      bestEfficiencyProduct = s.itemName;
    }
  });

  // Highest sell-through rate
  let bestSellThroughProduct = "Nenhum";
  let bestRate = -1;
  activeSalesForStats.forEach((s) => {
    if (s.loadedQuantity > 0) {
      const rate = (s.soldQuantity / s.loadedQuantity) * 100;
      if (rate > bestRate) {
        bestRate = rate;
        bestSellThroughProduct = s.itemName;
      }
    }
  });

  // Date format pt-BR
  const formattedDate = new Date(log.date + "T00:00:00").toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric"
  });

  // Action Helpers
  const changeCarga = (itemId: string, currentVal: number, delta: number) => {
    const newVal = Math.max(0, currentVal + delta);
    onUpdateSale(itemId, { loadedQuantity: newVal });
  };

  const handleCargaInput = (itemId: string, value: string) => {
    const parsed = parseInt(value, 10);
    if (!isNaN(parsed) && parsed >= 0) {
      onUpdateSale(itemId, { loadedQuantity: parsed });
    } else if (value === "") {
      onUpdateSale(itemId, { loadedQuantity: 0 });
    }
  };

  const addBusSale = (itemId: string, currentSales: number[], qty: number) => {
    const sale = mergedSales.find(s => s.itemId === itemId);
    if (!sale) return;
    if (qty > sale.leftoverQuantity) {
      return;
    }
    const updatedBusSales = [...currentSales, qty];
    onUpdateSale(itemId, { busSales: updatedBusSales });
  };

  const removeBusSaleAtIndex = (itemId: string, currentSales: number[], index: number) => {
    const updatedBusSales = currentSales.filter((_, i) => i !== index);
    onUpdateSale(itemId, { busSales: updatedBusSales });
  };

  const changePilotSweets = (itemId: string, currentSweetsQty: number, delta: number, unitCost: number) => {
    const sale = mergedSales.find(s => s.itemId === itemId);
    if (!sale) return;
    
    // Prevent adding pilot sweets beyond available leftover quantity
    if (delta > 0 && delta > sale.leftoverQuantity) {
      return;
    }

    const newQty = Math.max(0, currentSweetsQty + delta);
    onUpdateSale(itemId, { pilotCost: newQty * unitCost });
  };

  const handleExpensesInput = (itemId: string, value: string) => {
    setExpensesInput(prev => ({ ...prev, [itemId]: value }));
    const cleaned = value.replace(",", ".");
    const parsed = parseFloat(cleaned);
    if (!isNaN(parsed) && parsed >= 0) {
      onUpdateSale(itemId, { expenses: parsed });
    } else if (value === "") {
      onUpdateSale(itemId, { expenses: 0 });
    }
  };

  const handleReinvestedInput = (itemId: string, value: string) => {
    setReinvestedInput(prev => ({ ...prev, [itemId]: value }));
    const cleaned = value.replace(",", ".");
    const parsed = parseFloat(cleaned);
    if (!isNaN(parsed) && parsed >= 0) {
      onUpdateSale(itemId, { reinvestedValue: parsed });
    } else if (value === "") {
      onUpdateSale(itemId, { reinvestedValue: 0 });
    }
  };

  const generateTextReport = () => {
    if (!log) return "";

    let report = `=================================\n`;
    report += `📊 RELATÓRIO DIÁRIO DE VENDAS\n`;
    report += `=================================\n`;
    report += `📅 Data: ${formattedDate}\n`;
    report += `---------------------------------\n\n`;

    report += `💰 RESUMO FINANCEIRO DIÁRIO:\n`;
    report += `• Faturamento Total:   ${formatCurrency(totalRevenue)}\n`;
    report += `• Custos Doce Piloto: -${formatCurrency(totalPilotCost)}\n`;
    report += `• Reinvestimento:     -${formatCurrency(log.reinvestedValue ?? 0)}\n`;
    report += `• Despesas Gerais:    -${formatCurrency(totalExpenses)}\n`;
    report += `---------------------------------\n`;
    report += `🏆 LUCRO LÍQUIDO DIA:  ${formatCurrency(netProfitTotal)}\n`;
    report += `=================================\n\n`;

    report += `📦 DETALHAMENTO DE PRODUTOS:\n`;
    report += `---------------------------------\n`;
    mergedSales.forEach((sale) => {
      if (sale.loadedQuantity > 0) {
        report += `🔹 ${sale.itemName}\n`;
        report += `  Carga Levada:    ${sale.loadedQuantity} un\n`;
        report += `  Qtd Vendida:     ${sale.soldQuantity} un\n`;
        report += `  Ônibus Subidos:  ${sale.busesBoarded} ônibus\n`;
        report += `  Doce Piloto:     ${sale.pilotSweetsQty} un (-${formatCurrency(sale.pilotCost)})\n`;
        report += `  Despesa Item:    -${formatCurrency(sale.expenses)}\n`;
        report += `  Sobra de Carga:  ${sale.leftoverQuantity} un\n`;
        report += `  Saída Estoque:   ${sale.loadedQuantity - sale.leftoverQuantity} un\n`;
        report += `  Estoque Total:   ${sale.currentStock} un\n`;
        report += `  Faturamento:     ${formatCurrency(sale.soldValue)}\n`;
        report += `---------------------------------\n`;
      }
    });

    report += `\n🎯 INSIGHTS DE DESEMPENHO:\n`;
    report += `• Campeão de Vendas: ${bestProductQty} (${maxQty} un)\n`;
    report += `• Melhor Média/Ônibus: ${bestEfficiencyProduct} (${maxEfficiency.toFixed(1)} un)\n`;
    report += `• Giro mais Rápido: ${bestSellThroughProduct} (${bestRate > -1 ? `${bestRate.toFixed(1)}%` : "0%"})\n`;

    report += `\n📦 STATUS DO ESTOQUE ATUAL:\n`;
    report += `---------------------------------\n`;
    items.forEach(item => {
      const stock = item.currentStock ?? 0;
      const min = item.minStock ?? 0;
      const status = stock === 0 ? "ESGOTADO" : stock <= min ? "BAIXO" : "EM DIA";
      report += `• ${item.name}: ${stock} un (${status})\n`;
    });

    report += `=================================\n`;
    report += `Gerado automaticamente via Controle de Caixa Diário`;
    
    return report;
  };

  const downloadHtmlReport = () => {
    if (!log) return;
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Relatorio_${log.date}</title>
        <meta charset="utf-8">
        <style>
          body {
            font-family: 'Courier New', Courier, monospace;
            background-color: #f8fafc;
            color: #0f172a;
            padding: 40px 20px;
            display: flex;
            justify-content: center;
          }
          .receipt {
            background: white;
            border: 1px solid #e2e8f0;
            padding: 30px;
            width: 100%;
            max-width: 500px;
            box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
            border-radius: 8px;
          }
          h1, h2, h3 {
            text-align: center;
            margin: 0 0 10px 0;
          }
          .line {
            border-top: 1px dashed #cbd5e1;
            margin: 15px 0;
          }
          .flex-row {
            display: flex;
            justify-content: space-between;
            margin: 6px 0;
          }
          .bold {
            font-weight: bold;
          }
          .success {
            color: #16a34a;
            font-weight: bold;
          }
          .danger {
            color: #dc2626;
          }
          .product-card {
            background: #f1f5f9;
            padding: 10px;
            border-radius: 6px;
            margin-bottom: 10px;
          }
          @media print {
            body {
              background: white;
              padding: 0;
            }
            .receipt {
              border: none;
              box-shadow: none;
              max-width: 100%;
            }
            .no-print {
              display: none;
            }
          }
          .btn-print {
            display: block;
            width: 100%;
            padding: 12px;
            background: #6366f1;
            color: white;
            border: none;
            border-radius: 6px;
            font-weight: bold;
            font-size: 16px;
            cursor: pointer;
            text-align: center;
            margin-top: 20px;
          }
        </style>
      </head>
      <body>
        <div class="receipt">
          <h2>📊 RELATÓRIO DIÁRIO</h2>
          <div style="text-align: center; color: #64748b; font-size: 14px;">Controle de Caixa Diário</div>
          <div class="line"></div>
          <div class="flex-row"><span>Data:</span><span class="bold">${formattedDate}</span></div>
          <div class="line"></div>
          <h3 style="margin-top: 20px;">💰 RESUMO FINANCEIRO</h3>
          <div class="flex-row"><span>Faturamento Total:</span><span class="success">${formatCurrency(totalRevenue)}</span></div>
          <div class="flex-row"><span>Doce Piloto:</span><span class="danger">-${formatCurrency(totalPilotCost)}</span></div>
          <div class="flex-row"><span>Reinvestimento:</span><span class="danger">-${formatCurrency(log.reinvestedValue ?? 0)}</span></div>
          <div class="flex-row"><span>Despesas Gerais:</span><span class="danger">-${formatCurrency(totalExpenses)}</span></div>
          <div class="line"></div>
          <div class="flex-row" style="font-size: 18px;">
            <span class="bold">LUCRO LÍQUIDO:</span>
            <span class="${netProfitTotal >= 0 ? "success" : "danger"} bold">${formatCurrency(netProfitTotal)}</span>
          </div>
          <div class="line"></div>
          <h3 style="margin-top: 20px;">📦 DETALHAMENTO PRODUTOS</h3>
          ${mergedSales.map(sale => sale.loadedQuantity > 0 ? `
            <div class="product-card">
              <div class="bold" style="font-size: 15px; margin-bottom: 6px;">${sale.itemName}</div>
              <div class="flex-row"><span>Preço Venda (Unitário):</span><span>${formatCurrency(sale.salePrice)}</span></div>
              <div class="flex-row"><span>Preço Custo (Pacote):</span><span>${formatCurrency(sale.price)} (${sale.unitsPerPackage} un)</span></div>
              <div class="flex-row"><span>Carga Levada:</span><span>${sale.loadedQuantity} un</span></div>
              <div class="flex-row"><span>Qtd Vendida:</span><span>${sale.soldQuantity} un</span></div>
              <div class="flex-row"><span>Doce Piloto:</span><span>${sale.pilotSweetsQty} un (-${formatCurrency(sale.pilotCost)})</span></div>
              <div class="flex-row"><span>Despesa Item:</span><span>-${formatCurrency(sale.expenses)}</span></div>
              <div class="flex-row"><span>Sobra Carga:</span><span>${sale.leftoverQuantity} un</span></div>
              <div class="flex-row" style="color: #64748b; font-size: 13px;"><span>Saída Estoque (Baixa):</span><span>${sale.loadedQuantity - sale.leftoverQuantity} un</span></div>
              <div class="flex-row" style="color: #64748b; font-size: 13px;"><span>Estoque Total:</span><span>${sale.currentStock} un</span></div>
              <div class="flex-row" style="margin-top: 4px; border-top: 1px dotted #cbd5e1; padding-top: 4px;">
                <span class="bold">Subtotal Faturamento:</span>
                <span class="bold">${formatCurrency(sale.soldValue)}</span>
              </div>
            </div>
          ` : "").join("")}
          <div class="line"></div>
          <h3>🎯 INSIGHTS</h3>
          <div class="flex-row"><span>Mais Vendido:</span><span>${bestProductQty} (${maxQty} un)</span></div>
          <div class="flex-row"><span>Melhor Média:</span><span>${bestEfficiencyProduct} (${maxEfficiency.toFixed(1)} un/onibus)</span></div>
          <div class="flex-row"><span>Giro mais Rápido:</span><span>${bestSellThroughProduct} (${bestRate > -1 ? `${bestRate.toFixed(1)}%` : "0%"})</span></div>
          <div class="line"></div>
          <h3>📦 STATUS DO ESTOQUE</h3>
          ${items.map(item => {
            const stock = item.currentStock ?? 0;
            const min = item.minStock ?? 0;
            const isLow = stock <= min && stock > 0;
            const isOut = stock === 0;
            const colorStyle = isOut ? "color: #dc2626;" : isLow ? "color: #d97706;" : "color: #16a34a;";
            const status = isOut ? "ESGOTADO" : isLow ? "BAIXO" : "EM DIA";
            return `<div class="flex-row"><span>${item.name}:</span><span style="font-weight: bold; ${colorStyle}">${stock} un (${status})</span></div>`;
          }).join("")}
          <button class="btn-print no-print" onclick="window.print()">Imprimir / Salvar PDF</button>
        </div>
      </body>
      </html>
    `;
    const blob = new Blob([htmlContent], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `relatorio_${log.date}.html`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const downloadCsvReport = () => {
    if (!log) return;

    let csvContent = "\uFEFF"; // UTF-8 BOM
    csvContent += "Produto,Preco Custo (Pacote),Unidades/Pacote,Preco Venda (Unidade),Carga Levada,Qtd Vendida,Qtd Sobra,Onibus Subidos,Custo Piloto,Despesa Item,Faturamento\n";

    mergedSales.forEach((sale) => {
      if (sale.loadedQuantity > 0) {
        const nameEscaped = `"${sale.itemName.replace(/"/g, '""')}"`;
        csvContent += `${nameEscaped},${sale.price.toFixed(2)},${sale.unitsPerPackage},${sale.salePrice.toFixed(2)},${sale.loadedQuantity},${sale.soldQuantity},${sale.leftoverQuantity},${sale.busesBoarded},${sale.pilotCost.toFixed(2)},${sale.expenses.toFixed(2)},${sale.soldValue.toFixed(2)}\n`;
      }
    });

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `relatorio_vendas_${log.date}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div id="daily-item-sales-section" className="space-y-6">
      {/* Selected Day Banner */}
      <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 text-indigo-400">
          <Calendar size={18} />
          <span className="text-sm font-semibold">
            Gerenciando vendas do dia: <strong className="text-white">{formattedDate}</strong>
          </span>
        </div>
      </div>

      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold text-indigo-400 bg-indigo-500/10 uppercase tracking-wider mb-2">
            <Sparkles size={11} /> Detalhamento de Carga & Ônibus
          </span>
          <h2 className="text-xl md:text-2xl font-bold text-white font-sans tracking-tight capitalize">
            Vendas de {formattedDate}
          </h2>
          <p className="text-xs text-white/50 mt-1">
            Defina a carga inicial do dia para cada produto e adicione as vendas conforme sai de cada ônibus. As sobras e métricas de lucro são atualizadas automaticamente.
          </p>
        </div>
      </div>

      {/* Insights Bento Grid */}
      {activeSalesForStats.length > 0 && (
        <div id="insights-bento-grid" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Mais Vendido */}
          <div className="bg-white/[0.02] border border-white/5 p-4 rounded-2xl flex items-center gap-4 hover:border-indigo-500/20 transition-all">
            <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400 shrink-0">
              <ShoppingBag size={20} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-white/40 font-mono uppercase tracking-wider">O que mais vendeu</p>
              <h4 className="text-white font-semibold text-sm truncate mt-0.5" title={bestProductQty}>
                {bestProductQty}
              </h4>
              <p className="text-xs text-emerald-400 font-bold font-mono mt-1">
                {maxQty} unidades vendidas
              </p>
            </div>
          </div>

          {/* Card 2: Melhor Média / Ônibus */}
          <div className="bg-white/[0.02] border border-white/5 p-4 rounded-2xl flex items-center gap-4 hover:border-indigo-500/20 transition-all">
            <div className="p-3 bg-indigo-500/10 rounded-xl text-indigo-400 shrink-0">
              <TrendingUp size={20} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-white/40 font-mono uppercase tracking-wider">Maior Média p/ Ônibus</p>
              <h4 className="text-white font-semibold text-sm truncate mt-0.5" title={bestEfficiencyProduct}>
                {bestEfficiencyProduct}
              </h4>
              <p className="text-xs text-indigo-400 font-bold font-mono mt-1">
                {maxEfficiency.toFixed(2)} un. / ônibus
              </p>
            </div>
          </div>

          {/* Card 3: Taxa de Saída */}
          <div className="bg-white/[0.02] border border-white/5 p-4 rounded-2xl flex items-center gap-4 hover:border-indigo-500/20 transition-all">
            <div className="p-3 bg-amber-500/10 rounded-xl text-amber-400 shrink-0">
              <RefreshCw size={20} className="animate-spin-slow" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-white/40 font-mono uppercase tracking-wider">Maior Giro de Carga</p>
              <h4 className="text-white font-semibold text-sm truncate mt-0.5" title={bestSellThroughProduct}>
                {bestSellThroughProduct}
              </h4>
              <p className="text-xs text-amber-400 font-bold font-mono mt-1">
                {bestRate > -1 ? `${bestRate.toFixed(1)}% vendido` : "0% vendido"}
              </p>
            </div>
          </div>

          {/* Card 4: Média Geral R$ / Ônibus */}
          <div className="bg-white/[0.02] border border-white/5 p-4 rounded-2xl flex items-center gap-4 hover:border-indigo-500/20 transition-all">
            <div className="p-3 bg-cyan-500/10 rounded-xl text-cyan-400 shrink-0">
              <Bus size={20} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-white/40 font-mono uppercase tracking-wider">Média de Faturamento</p>
              <h4 className="text-white font-bold text-sm truncate mt-0.5">
                {totalBuses > 0 ? formatCurrency(totalRevenue / totalBuses) : "R$ 0,00"}
              </h4>
              <p className="text-xs text-cyan-400 font-medium mt-1">
                de faturamento por ônibus
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Table Container: Desktop Table vs Mobile Cards */}
      <div>
        {/* DESKTOP TABLE (Hidden on small screens) */}
        <div className="hidden lg:block bg-white/[0.02] border border-white/10 rounded-2xl shadow-xl overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 bg-white/[0.01]">
                <th
                  onClick={() => handleSort("itemName")}
                  className="px-6 py-4 text-xs font-bold text-white/40 uppercase tracking-wider cursor-pointer hover:bg-white/5 transition-colors group select-none"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Item / Produto</span>
                    <ArrowUpDown size={12} className="text-white/30 group-hover:text-white/80 transition-colors" />
                  </div>
                </th>
                <th className="px-4 py-4 text-xs font-bold text-white/40 uppercase tracking-wider text-center select-none w-36">
                  Carga (Inicia)
                </th>
                <th className="px-4 py-4 text-xs font-bold text-white/40 uppercase tracking-wider select-none">
                  Vendas por Ônibus (Durante o dia)
                </th>
                <th className="px-4 py-4 text-xs font-bold text-white/40 uppercase tracking-wider text-center select-none w-24">
                  Sobra (Auto)
                </th>
                <th className="px-4 py-4 text-xs font-bold text-white/40 uppercase tracking-wider text-center select-none w-36">
                  Doce Piloto
                </th>
                <th className="px-4 py-4 text-xs font-bold text-white/40 uppercase tracking-wider text-center select-none w-28">
                  Reinvestimento (R$)
                </th>
                <th className="px-4 py-4 text-xs font-bold text-white/40 uppercase tracking-wider text-center select-none w-28">
                  Gastos (R$)
                </th>
                <th className="px-4 py-4 text-xs font-bold text-white/40 uppercase tracking-wider text-right select-none w-32">
                  Total Vendido
                </th>
                <th className="px-6 py-4 text-xs font-bold text-white/40 uppercase tracking-wider text-right select-none w-20">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {sortedSales.map((sale) => {
                const totalSoldInRow = sale.busSales.reduce((acc, v) => acc + v, 0);
                const customVal = customValueInput[sale.itemId] || "";

                return (
                  <tr
                    key={sale.itemId}
                    className="hover:bg-white/[0.01] transition-colors group"
                  >
                    {/* Item Name & unit price */}
                    <td className="px-6 py-4">
                      <div className="font-semibold text-white text-sm">{sale.itemName}</div>
                      <div className="text-[10px] text-white/40 font-mono mt-0.5">
                        Venda: {formatCurrency(sale.salePrice)} | Custo: {formatCurrency(sale.price)} ({sale.unitsPerPackage} un)
                      </div>
                    </td>

                    {/* Carga (Input inline) */}
                    <td className="px-4 py-4 text-center">
                      <div className="inline-flex items-center bg-white/5 border border-white/10 rounded-xl p-1 gap-1">
                        <button
                          onClick={() => changeCarga(sale.itemId, sale.loadedQuantity, -1)}
                          className="w-7 h-7 flex items-center justify-center rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
                        >
                          <Minus size={12} />
                        </button>
                        <input
                          type="number"
                          value={sale.loadedQuantity === 0 ? "" : sale.loadedQuantity}
                          placeholder="0"
                          onChange={(e) => handleCargaInput(sale.itemId, e.target.value)}
                          className="w-12 bg-transparent text-center text-sm font-semibold text-white focus:outline-none border-none font-mono"
                        />
                        <button
                          onClick={() => changeCarga(sale.itemId, sale.loadedQuantity, 1)}
                          className="w-7 h-7 flex items-center justify-center rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
                        >
                          <Plus size={12} />
                        </button>
                      </div>
                    </td>

                    {/* Vendas por Ônibus (List of badges + Fast tap adders) */}
                    <td className="px-4 py-4">
                      <div className="flex flex-col gap-2.5">
                        {/* Bus sales badges */}
                        {sale.busSales.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5 max-w-xl">
                            {sale.busSales.map((qty, index) => (
                              <span
                                key={index}
                                className="inline-flex items-center gap-1 pl-2.5 pr-1.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 font-mono"
                                title={`Ônibus #${index + 1}: Vendidos ${qty}`}
                              >
                                <span>🚍 {qty}</span>
                                <button
                                  onClick={() => removeBusSaleAtIndex(sale.itemId, sale.busSales, index)}
                                  className="w-4 h-4 rounded-full flex items-center justify-center text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-all cursor-pointer"
                                >
                                  <X size={10} />
                                </button>
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-white/30 italic">Nenhum ônibus subido ainda hoje</span>
                        )}

                        {/* Quick-add bus sale buttons */}
                        <div className="flex flex-wrap items-center gap-1">
                          {[1, 2, 3, 4, 5].map((qty) => (
                            <button
                              key={qty}
                              disabled={qty > sale.leftoverQuantity}
                              onClick={() => addBusSale(sale.itemId, sale.busSales, qty)}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all ${
                                qty > sale.leftoverQuantity
                                  ? "text-white/20 bg-white/2 border-white/2 cursor-not-allowed"
                                  : "text-white bg-white/5 hover:bg-white/10 hover:text-indigo-400 border-white/5 hover:border-indigo-500/25 cursor-pointer"
                              }`}
                            >
                              +{qty}
                            </button>
                          ))}
                          
                          {/* Custom input */}
                          <div className={`flex items-center border rounded-lg pl-2 pr-1 py-0.5 transition-all max-w-[110px] ${
                            sale.leftoverQuantity === 0
                              ? "bg-white/2 border-white/2 opacity-40 cursor-not-allowed"
                              : "bg-white/5 border-white/5 focus-within:border-indigo-500/25"
                          }`}>
                            <input
                              type="number"
                              placeholder="Outro"
                              disabled={sale.leftoverQuantity === 0}
                              value={customVal}
                              onChange={(e) => setCustomValueInput({ ...customValueInput, [sale.itemId]: e.target.value })}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && customVal) {
                                  const val = parseInt(customVal, 10);
                                  if (!isNaN(val) && val > 0 && val <= sale.leftoverQuantity) {
                                    addBusSale(sale.itemId, sale.busSales, val);
                                    setCustomValueInput({ ...customValueInput, [sale.itemId]: "" });
                                  }
                                }
                              }}
                              className={`w-12 bg-transparent text-xs text-white focus:outline-none border-none font-mono ${
                                sale.leftoverQuantity === 0 ? "cursor-not-allowed" : ""
                              }`}
                            />
                            <button
                              disabled={sale.leftoverQuantity === 0 || !customVal || parseInt(customVal, 10) > sale.leftoverQuantity || parseInt(customVal, 10) <= 0}
                              onClick={() => {
                                if (customVal) {
                                  const val = parseInt(customVal, 10);
                                  if (!isNaN(val) && val > 0 && val <= sale.leftoverQuantity) {
                                    addBusSale(sale.itemId, sale.busSales, val);
                                    setCustomValueInput({ ...customValueInput, [sale.itemId]: "" });
                                  }
                                }
                              }}
                              className={`p-1 rounded transition-all ${
                                sale.leftoverQuantity === 0 || !customVal || parseInt(customVal, 10) > sale.leftoverQuantity || parseInt(customVal, 10) <= 0
                                  ? "bg-white/2 text-white/20 cursor-not-allowed"
                                  : "bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500 hover:text-white cursor-pointer"
                              }`}
                            >
                              <Plus size={10} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Sobra (Auto) */}
                    <td className="px-4 py-4 text-center font-mono text-sm font-bold">
                      <span className={sale.leftoverQuantity > 0 ? "text-amber-400" : "text-white/40"}>
                        {sale.leftoverQuantity} un
                      </span>
                    </td>

                    {/* Doce Piloto (Editable units) */}
                    <td className="px-4 py-4 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <div className="inline-flex items-center bg-white/5 border border-white/10 rounded-xl p-1 gap-1">
                          <button
                            onClick={() => changePilotSweets(sale.itemId, sale.pilotSweetsQty, -1, sale.unitPilotCost)}
                            className="w-6 h-6 flex items-center justify-center rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
                          >
                            <Minus size={10} />
                          </button>
                          <span className="w-8 text-center text-xs font-semibold text-white font-mono">
                            {sale.pilotSweetsQty}
                          </span>
                          <button
                            disabled={sale.leftoverQuantity === 0}
                            onClick={() => changePilotSweets(sale.itemId, sale.pilotSweetsQty, 1, sale.unitPilotCost)}
                            className={`w-6 h-6 flex items-center justify-center rounded-lg transition-all ${
                              sale.leftoverQuantity === 0 
                                ? "text-white/20 bg-transparent cursor-not-allowed" 
                                : "text-white/60 hover:text-white hover:bg-white/10 cursor-pointer"
                            }`}
                          >
                            <Plus size={10} />
                          </button>
                        </div>
                        <span className="text-[10px] text-white/40 font-mono">
                          {formatCurrency(sale.pilotCost)}
                        </span>
                      </div>
                    </td>

                    {/* Reinvestimento (Input R$) */}
                    <td className="px-4 py-4 text-center">
                      <div className="flex items-center bg-white/5 border border-white/10 rounded-xl px-2 py-1 max-w-[80px] mx-auto font-mono text-xs">
                        <span className="text-white/35 mr-1">R$</span>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={reinvestedInput[sale.itemId] !== undefined ? reinvestedInput[sale.itemId] : (sale.reinvestedValue === 0 || !sale.reinvestedValue ? "" : String(sale.reinvestedValue))}
                          placeholder="0,00"
                          onChange={(e) => handleReinvestedInput(sale.itemId, e.target.value)}
                          onBlur={(e) => {
                            setReinvestedInput(prev => { const n = { ...prev }; delete n[sale.itemId]; return n; });
                          }}
                          className="w-full bg-transparent text-white focus:outline-none border-none font-semibold"
                        />
                      </div>
                    </td>

                    {/* Gasto (Input R$) */}
                    <td className="px-4 py-4 text-center">
                      <div className="flex items-center bg-white/5 border border-white/10 rounded-xl px-2 py-1 max-w-[80px] mx-auto font-mono text-xs">
                        <span className="text-white/35 mr-1">R$</span>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={expensesInput[sale.itemId] !== undefined ? expensesInput[sale.itemId] : (sale.expenses === 0 ? "" : String(sale.expenses))}
                          placeholder="0,00"
                          onChange={(e) => handleExpensesInput(sale.itemId, e.target.value)}
                          onBlur={() => setExpensesInput(prev => { const n = { ...prev }; delete n[sale.itemId]; return n; })}
                          className="w-full bg-transparent text-white focus:outline-none border-none font-semibold"
                        />
                      </div>
                    </td>

                    {/* Total Vendido */}
                    <td className="px-4 py-4 text-right font-mono text-sm text-emerald-400 font-bold">
                      {formatCurrency(sale.soldValue)}
                    </td>

                    {/* Clear Row Button */}
                    <td className="px-6 py-4 text-right">
                      {sale.isTouched && (
                        <button
                          onClick={() => onClearSale(sale.itemId)}
                          className="p-1.5 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-all cursor-pointer"
                          title="Zerar lançamentos deste produto"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* MOBILE CARDS LAYOUT (Shown on small screens) */}
        <div className="lg:hidden space-y-4">
          {sortedSales.map((sale) => {
            const customVal = customValueInput[sale.itemId] || "";

            return (
              <div 
                key={sale.itemId}
                className="bg-white/[0.02] border border-white/10 rounded-2xl p-4 space-y-4 shadow-md"
              >
                {/* Header: Title and Pricing */}
                <div className="flex items-start justify-between border-b border-white/5 pb-2.5">
                  <div>
                    <h3 className="font-bold text-white text-base leading-tight">{sale.itemName}</h3>
                    <p className="text-[10px] text-white/40 font-mono mt-0.5">
                      Venda: <span className="text-emerald-400 font-bold">{formatCurrency(sale.salePrice)}</span> | Custo: <span className="text-white/60">{formatCurrency(sale.price)} ({sale.unitsPerPackage} un)</span>
                    </p>
                  </div>
                  {sale.isTouched && (
                    <button
                      onClick={() => onClearSale(sale.itemId)}
                      className="p-1.5 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      title="Zerar este produto"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>

                {/* Primary Data Rows: Carga & Sobra side by side */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Carga Input */}
                  <div className="bg-white/[0.01] border border-white/5 p-2.5 rounded-xl flex flex-col items-center justify-center">
                    <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider mb-2">Carga</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => changeCarga(sale.itemId, sale.loadedQuantity, -1)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 text-white/70 active:scale-95"
                      >
                        <Minus size={12} />
                      </button>
                      <input
                        type="number"
                        value={sale.loadedQuantity === 0 ? "" : sale.loadedQuantity}
                        placeholder="0"
                        onChange={(e) => handleCargaInput(sale.itemId, e.target.value)}
                        className="w-10 bg-transparent text-center text-sm font-bold text-white focus:outline-none font-mono"
                      />
                      <button
                        onClick={() => changeCarga(sale.itemId, sale.loadedQuantity, 1)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 text-white/70 active:scale-95"
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                  </div>

                  {/* Sobra Indicator (Auto calculated) */}
                  <div className="bg-white/[0.01] border border-white/5 p-2.5 rounded-xl flex flex-col items-center justify-center">
                    <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider mb-2">Sobra</span>
                    <span className={`text-base font-bold font-mono ${sale.leftoverQuantity > 0 ? "text-amber-400" : "text-white/40"}`}>
                      {sale.leftoverQuantity} un
                    </span>
                    <span className="text-[8px] text-white/30 font-mono mt-0.5">Automático</span>
                  </div>
                </div>

                {/* Bus sales entries & Fast Taps */}
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Vendas por Ônibus</span>
                  
                  {/* Badges Container */}
                  {sale.busSales.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5 overflow-x-auto pb-1 max-h-24">
                      {sale.busSales.map((qty, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center gap-1 pl-2.5 pr-1.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 font-mono"
                        >
                          <span>🚍 {qty}</span>
                          <button
                            onClick={() => removeBusSaleAtIndex(sale.itemId, sale.busSales, index)}
                            className="w-4 h-4 rounded-full flex items-center justify-center text-white/40"
                          >
                            <X size={10} />
                          </button>
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-white/30 italic">Nenhum ônibus subido hoje</p>
                  )}

                  {/* Fast Tap Adders for mobile */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    {[1, 2, 3, 4, 5].map((qty) => (
                      <button
                        key={qty}
                        disabled={qty > sale.leftoverQuantity}
                        onClick={() => addBusSale(sale.itemId, sale.busSales, qty)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                          qty > sale.leftoverQuantity
                            ? "text-white/20 bg-white/2 border-white/2 cursor-not-allowed"
                            : "text-white bg-white/5 hover:bg-white/10 active:scale-95 border-white/5 cursor-pointer"
                        }`}
                      >
                        +{qty}
                      </button>
                    ))}
                    
                    {/* Custom Value input inside badges */}
                    <div className={`flex items-center border rounded-xl pl-2 pr-1 py-1 transition-all max-w-[95px] ${
                      sale.leftoverQuantity === 0
                        ? "bg-white/2 border-white/2 opacity-40 cursor-not-allowed"
                        : "bg-white/5 border-white/5 focus-within:border-indigo-500/20"
                    }`}>
                      <input
                        type="number"
                        placeholder="Outro"
                        disabled={sale.leftoverQuantity === 0}
                        value={customVal}
                        onChange={(e) => setCustomValueInput({ ...customValueInput, [sale.itemId]: e.target.value })}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && customVal) {
                            const val = parseInt(customVal, 10);
                            if (!isNaN(val) && val > 0 && val <= sale.leftoverQuantity) {
                              addBusSale(sale.itemId, sale.busSales, val);
                              setCustomValueInput({ ...customValueInput, [sale.itemId]: "" });
                            }
                          }
                        }}
                        className={`w-9 bg-transparent text-xs text-white focus:outline-none border-none font-mono ${
                          sale.leftoverQuantity === 0 ? "cursor-not-allowed" : ""
                        }`}
                      />
                      <button
                        disabled={sale.leftoverQuantity === 0 || !customVal || parseInt(customVal, 10) > sale.leftoverQuantity || parseInt(customVal, 10) <= 0}
                        onClick={() => {
                          if (customVal) {
                            const val = parseInt(customVal, 10);
                            if (!isNaN(val) && val > 0 && val <= sale.leftoverQuantity) {
                              addBusSale(sale.itemId, sale.busSales, val);
                              setCustomValueInput({ ...customValueInput, [sale.itemId]: "" });
                            }
                          }
                        }}
                        className={`p-1 rounded-lg transition-all ${
                          sale.leftoverQuantity === 0 || !customVal || parseInt(customVal, 10) > sale.leftoverQuantity || parseInt(customVal, 10) <= 0
                            ? "bg-white/2 text-white/20 cursor-not-allowed"
                            : "bg-indigo-500/20 text-indigo-400 cursor-pointer"
                        }`}
                      >
                        <Plus size={10} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Sub-inputs: Doce Piloto, Reinvestimento, Gasto inline */}
                <div className="grid grid-cols-3 gap-2 border-t border-white/5 pt-3">
                  {/* Doce Piloto */}
                  <div className="flex flex-col items-center justify-center text-center">
                    <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider mb-1.5">Doce Piloto</span>
                    <div className="flex items-center gap-1 bg-white/5 border border-white/5 rounded-xl p-0.5">
                      <button
                        onClick={() => changePilotSweets(sale.itemId, sale.pilotSweetsQty, -1, sale.unitPilotCost)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-white/60 hover:text-white"
                      >
                        <Minus size={10} />
                      </button>
                      <span className="w-6 text-center text-xs font-semibold text-white font-mono">
                        {sale.pilotSweetsQty}
                      </span>
                      <button
                        onClick={() => changePilotSweets(sale.itemId, sale.pilotSweetsQty, 1, sale.unitPilotCost)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-white/60 hover:text-white"
                      >
                        <Plus size={10} />
                      </button>
                    </div>
                    <span className="text-[9px] text-white/35 font-mono mt-1">
                      {formatCurrency(sale.pilotCost)}
                    </span>
                  </div>

                  {/* Reinvestimento extra */}
                  <div className="flex flex-col items-center justify-center text-center">
                    <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider mb-1.5">Reinvestimento</span>
                    <div className="flex items-center bg-white/5 border border-white/5 rounded-xl px-2 py-1 max-w-[85px] font-mono text-xs">
                      <span className="text-white/35 mr-0.5">R$</span>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={reinvestedInput[sale.itemId] !== undefined ? reinvestedInput[sale.itemId] : (sale.reinvestedValue === 0 || !sale.reinvestedValue ? "" : String(sale.reinvestedValue))}
                        placeholder="0,00"
                        onChange={(e) => handleReinvestedInput(sale.itemId, e.target.value)}
                        onBlur={() => setReinvestedInput(prev => { const n = { ...prev }; delete n[sale.itemId]; return n; })}
                        className="w-full bg-transparent text-center text-white focus:outline-none border-none font-semibold font-mono"
                      />
                    </div>
                  </div>

                  {/* Gasto extra */}
                  <div className="flex flex-col items-center justify-center text-center">
                    <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider mb-1.5">Gasto Extra</span>
                    <div className="flex items-center bg-white/5 border border-white/5 rounded-xl px-2 py-1 max-w-[85px] font-mono text-xs">
                      <span className="text-white/35 mr-0.5">R$</span>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={expensesInput[sale.itemId] !== undefined ? expensesInput[sale.itemId] : (sale.expenses === 0 ? "" : String(sale.expenses))}
                        placeholder="0,00"
                        onChange={(e) => handleExpensesInput(sale.itemId, e.target.value)}
                        onBlur={() => setExpensesInput(prev => { const n = { ...prev }; delete n[sale.itemId]; return n; })}
                        className="w-full bg-transparent text-center text-white focus:outline-none border-none font-semibold font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* Card Footer: Financial Results */}
                <div className="bg-white/5 rounded-xl p-3 flex justify-between items-center text-xs border border-white/5 font-mono">
                  <div>
                    <span className="text-white/40 block text-[9px] uppercase tracking-wider">Faturamento</span>
                    <span className="font-bold text-emerald-400 text-sm">{formatCurrency(sale.soldValue)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer Summary Bar */}
      {activeSalesForStats.length > 0 && (
        <div className="px-6 py-5 bg-white/[0.02] border border-white/10 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-lg">
          <div>
            <p className="text-xs text-white/45 font-mono">
              Totais consolidados deste dia ({activeSalesForStats.length} produtos ativos)
            </p>
            <p className="text-[10px] text-white/35 font-mono mt-0.5">
              Fórmulas: Lucro = Faturamento - Custo dos Produtos (vendidos + piloto) - Gastos | Disponível = Lucro - Reinvestido
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs font-mono text-white/70">
            <p>
              Total Vendido: <span className="font-bold text-emerald-400 text-sm">{formatCurrency(totalRevenue)}</span>
            </p>
            <span className="text-white/10 hidden sm:inline">|</span>
            <p>
              Doce Piloto: <span className="font-bold text-red-400 text-sm">{formatCurrency(totalPilotCost)}</span>
            </p>
            <span className="text-white/10 hidden sm:inline">|</span>
            <p>
              Reinvestido: <span className="font-bold text-amber-400 text-sm">{formatCurrency(totalReinvestedItem)}</span>
            </p>
            <span className="text-white/10 hidden sm:inline">|</span>
            <p>
              Gasto Extra: <span className="font-bold text-red-400 text-sm">{formatCurrency(totalExpenses)}</span>
            </p>
            <span className="text-white/10 hidden sm:inline">|</span>
            <p>
              Lucro Líquido: <span className="font-bold text-indigo-400 text-sm">{formatCurrency(netProfitTotal)}</span>
            </p>
            <span className="text-white/10 hidden sm:inline">|</span>
            <p>
              Disponível: <span className="font-bold text-emerald-300 text-sm">{formatCurrency(netProfitTotal - totalReinvestedItem)}</span>
            </p>
          </div>
        </div>
      )}

      {/* Report Modal */}
      <AnimatePresence>
        {isReportModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setReportModalOpen(false)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-2xl bg-slate-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] z-10"
            >
              {/* Header */}
              <div className="px-6 py-5 border-b border-white/5 flex items-center justify-between bg-slate-950/40">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-indigo-500/10 rounded-xl text-indigo-400">
                    <FileText size={20} />
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-lg font-sans">Relatório de Fechamento Diário</h3>
                    <p className="text-xs text-white/50">{formattedDate}</p>
                  </div>
                </div>
                <button
                  onClick={() => setReportModalOpen(false)}
                  className="p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Content body */}
              <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-slate-950/20">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Left Column: Visual Receipt Preview */}
                  <div className="bg-white text-slate-900 p-6 rounded-2xl shadow-inner font-mono text-[10px] leading-relaxed border border-slate-200/50 flex flex-col justify-between min-h-[400px]">
                    <div>
                      <div className="text-center space-y-1 mb-4">
                        <span className="text-base font-bold block tracking-tight">🍬 RECIBO DE VENDAS 🍬</span>
                        <span className="text-[9px] text-slate-500 block uppercase font-bold">Controle de Caixa Diário</span>
                      </div>
                      
                      <div className="border-t border-dashed border-slate-300 my-3" />
                      
                      <div className="flex justify-between">
                        <span>DATA:</span>
                        <span className="font-bold uppercase">{formattedDate}</span>
                      </div>
                      
                      <div className="border-t border-dashed border-slate-300 my-3" />
                      
                      <div className="space-y-2">
                        <span className="font-bold block text-slate-600 mb-1">💰 RESUMO FINANCEIRO:</span>
                        <div className="flex justify-between">
                          <span>(+) TOTAL VENDIDO:</span>
                          <span className="font-bold text-emerald-600">{formatCurrency(totalRevenue)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>(-) DOCE PILOTO:</span>
                          <span className="font-bold text-red-600">-{formatCurrency(totalPilotCost)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>(-) REINVESTIDO:</span>
                          <span className="font-bold text-amber-600">-{formatCurrency(log.reinvestedValue ?? 0)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>(-) GASTOS DO DIA:</span>
                          <span className="font-bold text-red-600">-{formatCurrency(totalExpenses)}</span>
                        </div>
                      </div>

                      <div className="border-t border-dashed border-slate-300 my-3" />
                      
                      <div className="flex justify-between text-xs">
                        <span className="font-bold">LUCRO LÍQUIDO DO DIA:</span>
                        <span className={`font-bold ${netProfitTotal >= 0 ? "text-indigo-600" : "text-red-600"}`}>
                          {formatCurrency(netProfitTotal)}
                        </span>
                      </div>

                      <div className="border-t border-dashed border-slate-300 my-3" />
                      
                      <div className="space-y-2">
                        <span className="font-bold block text-slate-600">📦 PRODUTOS ENVIADOS:</span>
                        {mergedSales.map((sale) => {
                          if (sale.loadedQuantity === 0) return null;
                          return (
                            <div key={sale.itemId} className="bg-slate-50 p-2 rounded-lg border border-slate-100 text-[10px] space-y-1">
                              <div className="flex justify-between font-bold text-slate-800">
                                <span>{sale.itemName}</span>
                                <span>{formatCurrency(sale.soldValue)}</span>
                              </div>
                              <div className="flex justify-between text-slate-500 text-[9px]">
                                <span>Venda: {formatCurrency(sale.salePrice)} | Custo: {formatCurrency(sale.price)} ({sale.unitsPerPackage} un)</span>
                              </div>
                              <div className="flex justify-between text-slate-500 text-[9px]">
                                <span>Carga: {sale.loadedQuantity} un | Vendido: {sale.soldQuantity} un</span>
                                <span>Estoque: {sale.currentStock} un</span>
                              </div>
                              <div className="flex justify-between text-slate-500 text-[9px]">
                                <span>Piloto: {sale.pilotSweetsQty} un | Gastos: -{formatCurrency(sale.expenses)}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="mt-6 text-center space-y-1">
                      <div className="border-t border-dashed border-slate-300 my-3" />
                      <span className="text-[9px] text-slate-400 block italic">Gerado via Controle de Doces</span>
                    </div>
                  </div>

                  {/* Right Column: Interactive Actions */}
                  <div className="flex flex-col justify-between space-y-6">
                    <div className="space-y-4">
                      <h4 className="text-white font-semibold text-sm">Ações de Compartilhamento</h4>
                      <p className="text-xs text-white/60 leading-relaxed">
                        Selecione a melhor forma de salvar ou compartilhar o relatório de hoje com seus sócios ou equipe.
                      </p>

                      <div className="space-y-2.5">
                        {/* WhatsApp Copy button */}
                        <button
                          onClick={() => {
                            const text = generateTextReport();
                            navigator.clipboard.writeText(text);
                            setCopied(true);
                            setTimeout(() => setCopied(false), 2000);
                          }}
                          className="w-full inline-flex items-center justify-between p-3.5 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 text-white transition-all cursor-pointer group"
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl group-hover:bg-emerald-500/20 transition-all">
                              {copied ? <Check size={16} /> : <Copy size={16} />}
                            </div>
                            <div className="text-left">
                              <span className="block font-bold text-xs text-white">Copiar para WhatsApp</span>
                              <span className="block text-[10px] text-white/40">Copia o resumo formatado com emojis</span>
                            </div>
                          </div>
                          {copied ? (
                            <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded-md font-mono font-bold">Copiado!</span>
                          ) : (
                            <span className="text-[10px] bg-white/5 text-white/40 px-2 py-1 rounded-md font-mono group-hover:text-white transition-all">Copiar</span>
                          )}
                        </button>

                        {/* TXT File Download button */}
                        <button
                          onClick={() => {
                            const text = generateTextReport();
                            const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
                            const url = URL.createObjectURL(blob);
                            const link = document.createElement("a");
                            link.href = url;
                            link.download = `Relatorio_Vendas_${log.date}.txt`;
                            link.click();
                            URL.revokeObjectURL(url);
                          }}
                          className="w-full inline-flex items-center justify-between p-3.5 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 text-white transition-all cursor-pointer group"
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl group-hover:bg-indigo-500/20 transition-all">
                              <Download size={16} />
                            </div>
                            <div className="text-left">
                              <span className="block font-bold text-xs text-white">Baixar Recibo (.TXT)</span>
                              <span className="block text-[10px] text-white/40">Arquivo de texto compacto para salvar</span>
                            </div>
                          </div>
                          <span className="text-[10px] bg-white/5 text-white/40 px-2 py-1 rounded-md font-mono group-hover:text-white transition-all">Download</span>
                        </button>

                        {/* HTML/PDF Download Button */}
                        <button
                          onClick={downloadHtmlReport}
                          className="w-full inline-flex items-center justify-between p-3.5 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 text-white transition-all cursor-pointer group"
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl group-hover:bg-amber-500/20 transition-all">
                              <Printer size={16} />
                            </div>
                            <div className="text-left">
                              <span className="block font-bold text-xs text-white">Imprimir / Salvar PDF</span>
                              <span className="block text-[10px] text-white/40">Layout de folha elegante com botão de impressão</span>
                            </div>
                          </div>
                          <span className="text-[10px] bg-white/5 text-white/40 px-2 py-1 rounded-md font-mono group-hover:text-white transition-all">Abrir PDF</span>
                        </button>

                        {/* CSV Export Button */}
                        <button
                          onClick={downloadCsvReport}
                          className="w-full inline-flex items-center justify-between p-3.5 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 text-white transition-all cursor-pointer group"
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl group-hover:bg-emerald-500/20 transition-all">
                              <Download size={16} />
                            </div>
                            <div className="text-left">
                              <span className="block font-bold text-xs text-white">Exportar Tabela (.CSV)</span>
                              <span className="block text-[10px] text-white/40">Planilha estruturada com dados das vendas do dia</span>
                            </div>
                          </div>
                          <span className="text-[10px] bg-white/5 text-white/40 px-2 py-1 rounded-md font-mono group-hover:text-white transition-all">Download</span>
                        </button>
                      </div>
                    </div>

                    {/* Closing Advice */}
                    <div className="p-4 bg-indigo-500/5 border border-indigo-500/10 rounded-2xl text-[11px] text-indigo-300 leading-relaxed flex items-start gap-3">
                      <Sparkles size={16} className="shrink-0 mt-0.5" />
                      <span>
                        Dica: O relatório HTML/PDF é ideal para arquivamento ou envio por e-mail, enquanto a cópia para WhatsApp é perfeita para comunicação instantânea.
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
