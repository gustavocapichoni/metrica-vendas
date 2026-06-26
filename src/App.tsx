import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  TrendingUp,
  PlusCircle,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  FileText,
  Package,
  ShoppingBag,
  Download,
  Upload,
  LogOut,
  Loader2,
  Wifi,
  WifiOff
} from "lucide-react";

import { onAuthStateChanged, signOut, User } from "firebase/auth";
import {
  doc,
  setDoc,
  collection,
  onSnapshot,
  writeBatch
} from "firebase/firestore";
import { auth, db } from "./lib/firebase";
import Login from "./components/Login";

import { Item, DailyLog, DailyItemSale, RestockItem, getPilotSweetUnitCost, getItemUnitValue } from "./types";
import { INITIAL_ITEMS, INITIAL_DAILY_LOGS } from "./data";
import ItemTable from "./components/ItemTable";
import ItemForm from "./components/ItemForm";
import DailyLogTable from "./components/DailyLogTable";
import DailyLogForm from "./components/DailyLogForm";
import DailyItemSalesTable from "./components/DailyItemSalesTable";
import Dashboard from "./components/Dashboard";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [items, setItems] = useState<Item[]>([]);
  const [dailyLogs, setDailyLogs] = useState<DailyLog[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isLogFormOpen, setIsLogFormOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'estoque' | 'vendas'>('dashboard');
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [editingLog, setEditingLog] = useState<DailyLog | null>(null);
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    message: string;
    confirmText: string;
    cancelText: string;
    onConfirm: () => void;
  } | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const today = new Date();
  const offset = today.getTimezoneOffset();
  const localToday = new Date(today.getTime() - (offset * 60 * 1000));
  const todayStr = localToday.toISOString().split("T")[0];

  // --- Firebase Auth listener ---
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setAuthLoading(false);
    });
    return unsub;
  }, []);

  // --- Firestore: Load items for logged-in user ---
  useEffect(() => {
    if (!user) return;
    const col = collection(db, "users", user.uid, "items");
    const unsub = onSnapshot(col, (snapshot) => {
      if (snapshot.empty) {
        // First-time user: seed with initial items
        const batch = writeBatch(db);
        INITIAL_ITEMS.forEach(item => {
          const ref = doc(col, item.id);
          batch.set(ref, item);
        });
        batch.commit();
        setItems(INITIAL_ITEMS);
      } else {
        const loaded: Item[] = snapshot.docs.map(d => ({
          ...d.data(),
          id: d.id,
          currentStock: d.data().currentStock ?? 50,
          minStock: d.data().minStock ?? 10
        } as Item));
        setItems(loaded);
      }
    });
    return unsub;
  }, [user]);

  // --- Firestore: Load daily logs for logged-in user ---
  useEffect(() => {
    if (!user) return;
    const col = collection(db, "users", user.uid, "dailyLogs");
    const unsub = onSnapshot(col, (snapshot) => {
      if (snapshot.empty) {
        // First-time user: seed with initial logs
        const batch = writeBatch(db);
        INITIAL_DAILY_LOGS.forEach(log => {
          const ref = doc(col, log.id);
          batch.set(ref, log);
        });
        batch.commit();
        setDailyLogs(INITIAL_DAILY_LOGS);
      } else {
        const loaded: DailyLog[] = snapshot.docs.map(d => ({
          ...d.data(),
          id: d.id
        } as DailyLog));
        const sorted = [...loaded].sort((a, b) => b.date.localeCompare(a.date));
        setDailyLogs(sorted);
      }
    });
    return unsub;
  }, [user]);

  // Set initial selected daily log selection
  useEffect(() => {
    if (dailyLogs.length > 0 && !selectedLogId) {
      setSelectedLogId(dailyLogs[0].id);
    }
  }, [dailyLogs, selectedLogId]);

  // --- Save items to Firestore ---
  const saveItems = async (newItems: Item[]) => {
    setItems(newItems);
    if (!user) return;
    const batch = writeBatch(db);
    const col = collection(db, "users", user.uid, "items");
    // Upsert all items
    newItems.forEach(item => {
      batch.set(doc(col, item.id), item);
    });
    // Delete items that were removed (by comparing ids)
    const currentIds = new Set(newItems.map(i => i.id));
    items.forEach(item => {
      if (!currentIds.has(item.id)) {
        batch.delete(doc(col, item.id));
      }
    });
    await batch.commit();
  };

  // --- Save daily logs to Firestore ---
  const saveDailyLogs = async (newLogs: DailyLog[]) => {
    setDailyLogs(newLogs);
    if (!user) return;
    const batch = writeBatch(db);
    const col = collection(db, "users", user.uid, "dailyLogs");
    newLogs.forEach(log => {
      batch.set(doc(col, log.id), log);
    });
    const currentIds = new Set(newLogs.map(l => l.id));
    dailyLogs.forEach(log => {
      if (!currentIds.has(log.id)) {
        batch.delete(doc(col, log.id));
      }
    });
    await batch.commit();
  };

  // Trigger temporary notification toast
  const showToast = (message: string, type: "success" | "error" | "info" = "success") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  // --- Network Status listener ---
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      showToast("Conexão restabelecida! Sincronizando dados com o servidor...", "success");
    };
    const handleOffline = () => {
      setIsOnline(false);
      showToast("Modo offline ativado. Suas alterações serão salvas localmente e sincronizadas ao reconectar.", "info");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Handle Create / Update Item
  const handleSubmitItem = (formData: Omit<Item, "id"> & { id?: string }) => {
    if (formData.id) {
      // Edit Mode
      const updated = items.map((item) =>
        item.id === formData.id
          ? { ...item, ...formData }
          : item
      );
      saveItems(updated);
      showToast(`O item "${formData.name}" foi atualizado com sucesso!`, "success");
    } else {
      // Create Mode
      const newItem: Item = {
        id: Date.now().toString(),
        name: formData.name,
        price: formData.price,
        category: formData.category,
        currentStock: formData.currentStock ?? 0,
        minStock: formData.minStock ?? 0
      };
      saveItems([newItem, ...items]);
      showToast(`O item "${formData.name}" foi cadastrado com sucesso!`, "success");
    }
    setEditingItem(null);
  };

  // Handle Delete Item
  const handleDeleteItem = (id: string) => {
    const itemToDelete = items.find(item => item.id === id);
    if (!itemToDelete) return;

    setConfirmDialog({
      title: "Excluir Item",
      message: `Tem certeza que deseja excluir o item "${itemToDelete.name}"? Esta ação não pode ser desfeita.`,
      confirmText: "Excluir",
      cancelText: "Cancelar",
      onConfirm: () => {
        const updated = items.filter((item) => item.id !== id);
        saveItems(updated);
        showToast(`O item "${itemToDelete.name}" foi removido.`, "info");
        setConfirmDialog(null);
      }
    });
  };

  // Handle Open Form for Edit
  const handleEditSelect = (item: Item) => {
    setEditingItem(item);
    setIsFormOpen(true);
  };

  // Handle Reset to Defaults
  const handleResetToDefaults = () => {
    setConfirmDialog({
      title: "Restaurar Padrões",
      message: "Deseja redefinir os produtos e os registros de caixa diários para os padrões de fábrica? Isso substituirá todas as suas alterações atuais.",
      confirmText: "Restaurar",
      cancelText: "Cancelar",
      onConfirm: () => {
        saveItems(INITIAL_ITEMS);
        saveDailyLogs(INITIAL_DAILY_LOGS);
        showToast("Produtos e controle diário restaurados.", "info");
        setConfirmDialog(null);
      }
    });
  };

  // Helper to sync stock when restocked items are updated/reverted
  const syncRestockStock = (oldRestocks: RestockItem[] = [], newRestocks: RestockItem[] = []) => {
    const prevMap: { [itemId: string]: number } = {};
    oldRestocks.forEach(r => {
      prevMap[r.itemId] = (prevMap[r.itemId] || 0) + r.quantity;
    });

    const newMap: { [itemId: string]: number } = {};
    newRestocks.forEach(r => {
      newMap[r.itemId] = (newMap[r.itemId] || 0) + r.quantity;
    });

    const allItemIds = new Set([...Object.keys(prevMap), ...Object.keys(newMap)]);
    let itemsChanged = false;
    const updatedItems = items.map(item => {
      if (allItemIds.has(item.id)) {
        const prevQty = prevMap[item.id] || 0;
        const newQty = newMap[item.id] || 0;
        const delta = newQty - prevQty;
        if (delta !== 0) {
          itemsChanged = true;
          return {
            ...item,
            currentStock: Math.max(0, (item.currentStock ?? 0) + delta)
          };
        }
      }
      return item;
    });

    if (itemsChanged) {
      saveItems(updatedItems);
    }
  };

  // Handle Create / Update Daily Log
  const handleSubmitDailyLog = (formData: Omit<DailyLog, "id"> & { id?: string }) => {
    // Validate duplicate date
    const dateExists = dailyLogs.some(log => log.date === formData.date && log.id !== formData.id);
    if (dateExists) {
      showToast(`Já existe um registro para o dia ${formData.date.split("-").reverse().join("/")}!`, "error");
      return;
    }

    if (formData.id) {
      // Edit Mode
      const oldLog = dailyLogs.find(l => l.id === formData.id);
      syncRestockStock(oldLog?.restocks || [], formData.restocks || []);

      const updated = dailyLogs.map((log) =>
        log.id === formData.id
          ? { ...log, ...formData }
          : log
      );
      saveDailyLogs(updated);
      showToast("Registro diário atualizado com sucesso!", "success");
    } else {
      // Create Mode
      syncRestockStock([], formData.restocks || []);

      const newLog: DailyLog = {
        id: "dl-" + Date.now().toString(),
        date: formData.date,
        quantityToSell: formData.quantityToSell,
        soldValue: formData.soldValue,
        pilotCost: formData.pilotCost,
        reinvestedValue: formData.reinvestedValue,
        expenses: formData.expenses,
        notes: formData.notes,
        restocks: formData.restocks || [],
        itemSales: []
      };
      saveDailyLogs([newLog, ...dailyLogs]);
      setSelectedLogId(newLog.id);
      setActiveTab('vendas');
      showToast("Novo registro de caixa diário adicionado!", "success");
    }
    setEditingLog(null);
  };

  const handleCreateDirectDailyLog = () => {
    // Check duplicate
    const existingLog = dailyLogs.find(log => log.date === todayStr);
    if (existingLog) {
      setSelectedLogId(existingLog.id);
      setActiveTab('vendas');
      showToast(`O registro do dia ${todayStr.split("-").reverse().join("/")} já existe! Exibindo o dia.`, "info");
      return;
    }

    const newLog: DailyLog = {
      id: "dl-" + Date.now().toString(),
      date: todayStr,
      quantityToSell: 0,
      soldValue: 0,
      pilotCost: 0,
      reinvestedValue: 0,
      expenses: 0,
      notes: "",
      restocks: [],
      itemSales: []
    };
    saveDailyLogs([newLog, ...dailyLogs]);
    setSelectedLogId(newLog.id);
    setActiveTab('vendas');
    showToast("Novo registro de caixa diário adicionado!", "success");
  };

  // Handle Delete Daily Log
  const handleDeleteDailyLog = (id: string) => {
    const logToDelete = dailyLogs.find(log => log.id === id);
    if (!logToDelete) return;

    setConfirmDialog({
      title: "Excluir Registro Diário",
      message: `Tem certeza que deseja excluir o registro do dia ${logToDelete.date.split("-").reverse().join("/")}? Esta ação não pode ser desfeita e irá reverter o estoque das vendas e reabastecimentos deste dia.`,
      confirmText: "Excluir",
      cancelText: "Cancelar",
      onConfirm: () => {
        // Refund sold items and revert restocked items to sync stock perfectly
        const salesToRefund = logToDelete.itemSales || [];
        const restocksToRevert = logToDelete.restocks || [];

        const refundMap: { [itemId: string]: number } = {};
        salesToRefund.forEach(s => {
          const qty = s.loadedQuantity - s.leftoverQuantity;
          refundMap[s.itemId] = (refundMap[s.itemId] || 0) + qty;
        });

        const revertRestockMap: { [itemId: string]: number } = {};
        restocksToRevert.forEach(r => {
          revertRestockMap[r.itemId] = (revertRestockMap[r.itemId] || 0) + r.quantity;
        });

        const allAffected = new Set([...Object.keys(refundMap), ...Object.keys(revertRestockMap)]);

        let stockChanged = false;
        const updatedItems = items.map(item => {
          if (allAffected.has(item.id)) {
            const refundQty = refundMap[item.id] || 0;
            const revertQty = revertRestockMap[item.id] || 0;
            const delta = refundQty - revertQty;
            if (delta !== 0) {
              stockChanged = true;
              return {
                ...item,
                currentStock: Math.max(0, (item.currentStock ?? 0) + delta)
              };
            }
          }
          return item;
        });

        if (stockChanged) {
          saveItems(updatedItems);
        }

        const updated = dailyLogs.filter((log) => log.id !== id);
        saveDailyLogs(updated);
        showToast("O registro diário foi removido.", "info");
        setConfirmDialog(null);
      }
    });
  };

  // Handle Open Form for Edit Daily Log
  const handleEditDailyLogSelect = (log: DailyLog) => {
    setEditingLog(log);
    setIsLogFormOpen(true);
  };

  // Handle Create / Update / Delete Item Sale (Detailed breakdown per item/bus, integrated inline)
  const handleUpdateItemSale = (itemId: string, updatedFields: Partial<DailyItemSale>) => {
    if (!selectedLogId) {
      showToast("Nenhum dia selecionado.", "error");
      return;
    }

    const targetLog = dailyLogs.find(log => log.id === selectedLogId);
    if (!targetLog) return;

    const currentSales = targetLog.itemSales || [];
    const existingIndex = currentSales.findIndex(s => s.itemId === itemId);
    const itemDetails = items.find(i => i.id === itemId);
    if (!itemDetails) return;

    let updatedSales = [...currentSales];

    if (existingIndex !== -1) {
      // Update existing record
      const existing = currentSales[existingIndex];
      const mergedFields = { ...existing, ...updatedFields };

      const busSales = mergedFields.busSales || [];
      const busesBoarded = busSales.length;
      const totalSoldQty = busSales.reduce((sum, v) => sum + v, 0);

      // Auto-compute pilot gift units as busesBoarded, unless pilotCost was manually updated
      const unitPilotCost = getPilotSweetUnitCost(itemDetails.name);
      const pilotSweetsQty = updatedFields.pilotCost !== undefined
        ? Math.round(updatedFields.pilotCost / unitPilotCost)
        : (existing.pilotCost !== undefined ? Math.round(existing.pilotCost / unitPilotCost) : busesBoarded);

      const loadedQuantity = mergedFields.loadedQuantity;
      const leftoverQuantity = Math.max(0, loadedQuantity - totalSoldQty - pilotSweetsQty);
      const pilotCost = updatedFields.pilotCost !== undefined ? updatedFields.pilotCost : (pilotSweetsQty * unitPilotCost);
      const expenses = mergedFields.expenses;

      updatedSales[existingIndex] = {
        ...mergedFields,
        loadedQuantity,
        leftoverQuantity,
        busesBoarded,
        pilotCost,
        expenses,
        busSales
      };
    } else {
      // Create a brand new record for this product
      const busSales = updatedFields.busSales || [];
      const busesBoarded = busSales.length;
      const totalSoldQty = busSales.reduce((sum, v) => sum + v, 0);
      const loadedQuantity = updatedFields.loadedQuantity ?? 0;

      const unitPilotCost = getPilotSweetUnitCost(itemDetails.name);
      const pilotSweetsQty = busesBoarded;
      const leftoverQuantity = Math.max(0, loadedQuantity - totalSoldQty - pilotSweetsQty);
      const pilotCost = pilotSweetsQty * unitPilotCost;

      const newSale: DailyItemSale = {
        id: "dis-" + Date.now().toString() + "-" + itemId,
        itemId: itemId,
        itemName: itemDetails.name,
        price: itemDetails.price,
        loadedQuantity,
        leftoverQuantity,
        busesBoarded,
        pilotCost,
        expenses: updatedFields.expenses ?? 0,
        busSales
      };
      updatedSales.push(newSale);
    }

    // Recalculate parent log aggregates automatically
    const totalLoaded = updatedSales.reduce((sum, s) => sum + s.loadedQuantity, 0);
    const totalSoldVal = updatedSales.reduce((sum, s) => {
      const soldQty = s.busSales ? s.busSales.reduce((acc, v) => acc + v, 0) : (s.loadedQuantity - s.leftoverQuantity);
      return sum + (soldQty * getItemUnitValue(s.itemName));
    }, 0);
    const totalPilot = updatedSales.reduce((sum, s) => sum + s.pilotCost, 0);
    const totalExp = updatedSales.reduce((sum, s) => sum + s.expenses, 0);

    const updatedLogs = dailyLogs.map(log =>
      log.id === selectedLogId
        ? {
          ...log,
          itemSales: updatedSales,
          quantityToSell: totalLoaded,
          soldValue: totalSoldVal,
          pilotCost: totalPilot,
          expenses: totalExp
        }
        : log
    );

    // Stock Sync: Deduct the difference between what was historically removed and the new removed amount
    const existingSaleForStock = currentSales.find(s => s.itemId === itemId);
    const prevDeducted = existingSaleForStock ? (existingSaleForStock.loadedQuantity - existingSaleForStock.leftoverQuantity) : 0;

    const updatedSaleForStock = updatedSales.find(s => s.itemId === itemId)!;
    const newDeducted = updatedSaleForStock.loadedQuantity - updatedSaleForStock.leftoverQuantity;

    const stockDelta = prevDeducted - newDeducted;

    if (stockDelta !== 0) {
      const newItemsList = items.map(i =>
        i.id === itemId
          ? { ...i, currentStock: Math.max(0, (i.currentStock ?? 0) + stockDelta) }
          : i
      );
      saveItems(newItemsList);
    }

    saveDailyLogs(updatedLogs);
  };

  // Reset or clear item sale values
  const handleClearItemSale = (itemId: string) => {
    if (!selectedLogId) return;

    const targetLog = dailyLogs.find(log => log.id === selectedLogId);
    if (!targetLog) return;

    setConfirmDialog({
      title: "Limpar Lançamentos",
      message: "Deseja redefinir a carga e zerar todas as vendas e gastos deste produto para este dia?",
      confirmText: "Zerar",
      cancelText: "Cancelar",
      onConfirm: () => {
        const currentSales = targetLog.itemSales || [];

        // Stock Sync: Refund stock if this sale is cleared
        const existingSaleForStock = currentSales.find(s => s.itemId === itemId);
        const prevDeducted = existingSaleForStock ? (existingSaleForStock.loadedQuantity - existingSaleForStock.leftoverQuantity) : 0;
        if (prevDeducted > 0) {
          const newItemsList = items.map(i =>
            i.id === itemId
              ? { ...i, currentStock: (i.currentStock ?? 0) + prevDeducted }
              : i
          );
          saveItems(newItemsList);
        }

        const updatedSales = currentSales.filter(s => s.itemId !== itemId);

        // Recalculate parent log aggregates automatically
        const totalLoaded = updatedSales.reduce((sum, s) => sum + s.loadedQuantity, 0);
        const totalSoldVal = updatedSales.reduce((sum, s) => {
          const soldQty = s.busSales ? s.busSales.reduce((acc, v) => acc + v, 0) : (s.loadedQuantity - s.leftoverQuantity);
          return sum + (soldQty * getItemUnitValue(s.itemName));
        }, 0);
        const totalPilot = updatedSales.reduce((sum, s) => sum + s.pilotCost, 0);
        const totalExp = updatedSales.reduce((sum, s) => sum + s.expenses, 0);

        const updatedLogs = dailyLogs.map(log =>
          log.id === selectedLogId
            ? {
              ...log,
              itemSales: updatedSales,
              quantityToSell: totalLoaded,
              soldValue: totalSoldVal,
              pilotCost: totalPilot,
              expenses: totalExp
            }
            : log
        );

        saveDailyLogs(updatedLogs);
        showToast("Lançamentos do produto zerados.", "info");
        setConfirmDialog(null);
      }
    });
  };

  const selectedLog = dailyLogs.find(log => log.id === selectedLogId) || null;

  // Backup Functions
  const handleExportBackup = () => {
    const backupData = {
      items,
      dailyLogs
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `metricavendas_backup_${todayStr}.json`;
    link.click();
    URL.revokeObjectURL(url);
    showToast("Backup exportado com sucesso!", "success");
  };

  const handleImportBackup = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const parsed = JSON.parse(content);
        if (parsed.items && parsed.dailyLogs) {
          setConfirmDialog({
            title: "Importar Backup",
            message: "Atenção: A importação irá sobrescrever todos os dados atuais. Deseja continuar?",
            confirmText: "Importar",
            cancelText: "Cancelar",
            onConfirm: () => {
              saveItems(parsed.items);
              saveDailyLogs(parsed.dailyLogs);
              showToast("Backup importado com sucesso!", "success");
              setConfirmDialog(null);
            }
          });
        } else {
          showToast("Arquivo de backup inválido.", "error");
        }
      } catch (err) {
        showToast("Erro ao ler o arquivo de backup.", "error");
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  // --- Auth Guard ---
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <Loader2 size={32} className="animate-spin text-indigo-400" />
      </div>
    );
  }

  if (!user) {
    return <Login onError={(msg) => showToast(msg, "error")} />;
  }

  return (
    <div id="app-root" className="min-h-screen pb-12 antialiased selection:bg-white selection:text-slate-900">
      {/* Top Banner / Navbar */}
      <header id="app-header" className="sticky top-0 bg-slate-950/40 backdrop-blur-md border-b border-white/10 z-30 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center text-white shadow-sm">
              <TrendingUp size={20} className="stroke-[2.5]" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-white tracking-tight leading-tight">MétricaVendas</h1>
              <p className="text-[10px] text-white/50 font-medium">Controle de Itens e Vendas</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Elegant Tab Switcher in Navbar */}
            <div className="flex items-center bg-slate-900/60 border border-white/10 p-1 rounded-xl shadow-lg">
              <button
                id="tab-dashboard-btn"
                onClick={() => setActiveTab('dashboard')}
                className={`flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${activeTab === 'dashboard'
                    ? "bg-white/10 text-white shadow-sm border border-white/5"
                    : "text-white/50 hover:text-white hover:bg-white/5 border border-transparent"
                  }`}
              >
                <TrendingUp size={13} />
                <span className="hidden sm:inline">Dashboard</span>
                <span className="sm:hidden">Painel</span>
              </button>
              <button
                id="tab-vendas-btn"
                onClick={() => setActiveTab('vendas')}
                className={`flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${activeTab === 'vendas'
                    ? "bg-white/10 text-white shadow-sm border border-white/5"
                    : "text-white/50 hover:text-white hover:bg-white/5 border border-transparent"
                  }`}
              >
                <ShoppingBag size={13} />
                <span className="hidden sm:inline">Área de Vendas</span>
                <span className="sm:hidden">Vendas</span>
              </button>
              <button
                id="tab-estoque-btn"
                onClick={() => setActiveTab('estoque')}
                className={`relative flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${activeTab === 'estoque'
                    ? "bg-white/10 text-white shadow-sm border border-white/5"
                    : "text-white/50 hover:text-white hover:bg-white/5 border border-transparent"
                  }`}
              >
                <Package size={13} />
                <span className="hidden sm:inline">Itens no Estoque</span>
                <span className="sm:hidden">Estoque</span>
                {items.some(item => (item.currentStock ?? 0) <= (item.minStock ?? 0)) && (
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping absolute -top-0.5 -right-0.5" />
                )}
              </button>
            </div>

            <div className="h-4 w-px bg-white/10 hidden sm:block" />

            {activeTab === 'vendas' && (
              <button
                id="header-report-btn"
                disabled={!selectedLog}
                onClick={() => setIsReportOpen(true)}
                className={`flex items-center justify-center gap-1.5 px-3.5 py-1.5 font-bold text-xs rounded-xl transition-all border shadow-sm cursor-pointer ${selectedLog
                    ? "bg-indigo-500 hover:bg-indigo-600 border-indigo-500/30 text-white hover:shadow-lg hover:shadow-indigo-500/10 active:scale-95"
                    : "bg-white/5 text-white/30 border-white/5 cursor-not-allowed"
                  }`}
                title={selectedLog ? "Finalizar o dia e gerar relatório de vendas" : "Selecione uma data no Controle de Caixa abaixo para gerar o relatório"}
              >
                <FileText size={14} />
                <span>Finalizar &amp; Gerar Relatório</span>
              </button>
            )}

            <div className="h-4 w-px bg-white/10 hidden sm:block" />

            {/* User Avatar + Logout */}
            <div className="flex items-center gap-2.5">
              {isOnline ? (
                <div 
                  id="connection-status-online"
                  className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-[10px] font-bold shadow-sm"
                  title="Conectado à Internet"
                >
                  <Wifi size={11} className="stroke-[2.5]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="hidden md:inline">Online</span>
                </div>
              ) : (
                <div 
                  id="connection-status-offline"
                  className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl text-[10px] font-bold shadow-sm"
                  title="Sem Internet - Modo Offline Ativado"
                >
                  <WifiOff size={11} className="stroke-[2.5]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                  <span>Offline</span>
                </div>
              )}

              {user.photoURL && (
                <img
                  src={user.photoURL}
                  alt={user.displayName || "User"}
                  className="w-7 h-7 rounded-full border border-white/20"
                  title={user.displayName || user.email || ""}
                />
              )}
              <button
                id="logout-btn"
                onClick={() => signOut(auth)}
                title="Sair da conta"
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-white/40 hover:text-red-400 hover:bg-red-500/10 border border-white/10 rounded-xl transition-all cursor-pointer text-xs font-semibold"
              >
                <LogOut size={13} />
                <span className="hidden sm:inline">Sair</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-12">
        {/* Tabela de Itens e Vendas with Tabs */}
        <div id="items-sales-tabs-section" className="space-y-6 mt-4">
          {/* Header */}
          <div className="border-b border-white/5 pb-5">
            <h2 className="font-bold text-white text-xl md:text-2xl tracking-tight">
              {activeTab === 'dashboard' ? '📊 Painel Geral' : activeTab === 'estoque' ? '📦 Itens no Estoque' : '🛍️ Área de Vendas'}
            </h2>
            <p className="text-xs text-white/50 mt-1">
              {activeTab === 'dashboard'
                ? 'Indicadores gerais de faturamento, lucro e gráficos de desempenho.'
                : activeTab === 'estoque'
                  ? 'Cadastre, edite, exclua e monitore seus produtos no estoque.'
                  : 'Gerencie e registre as vendas diárias, sobras, custos de pilotos e lucro de cada item.'}
            </p>
          </div>

          {/* Conditional Rendering with Motion */}
          <div className="relative">
            <AnimatePresence mode="wait">
              {activeTab === 'dashboard' ? (
                <motion.div
                  key="dashboard-tab"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  <Dashboard
                    logs={dailyLogs}
                    items={items}
                    onStartToday={(preloadedSales) => {
                      const todayLog: DailyLog = {
                        id: "dl-" + Date.now().toString(),
                        date: todayStr,
                        quantityToSell: preloadedSales.reduce((sum, s) => sum + s.loadedQuantity, 0),
                        soldValue: 0,
                        pilotCost: 0,
                        reinvestedValue: 0,
                        expenses: 0,
                        notes: "Dia iniciado com sobras de ontem pré-carregadas.",
                        restocks: [],
                        itemSales: preloadedSales.map((s, idx) => ({
                          ...s,
                          id: "dis-" + Date.now().toString() + "-" + idx + "-" + s.itemId
                        }))
                      };
                      saveDailyLogs([todayLog, ...dailyLogs]);
                      setSelectedLogId(todayLog.id);
                      setActiveTab('vendas');
                      showToast("Novo dia de vendas iniciado! Sobras de ontem foram pré-carregadas.", "success");
                    }}
                    onSelectLog={(id) => {
                      setSelectedLogId(id);
                      setActiveTab('vendas');
                    }}
                    onUpdateStock={(itemId, newStock) => {
                      const updated = items.map(item =>
                        item.id === itemId
                          ? { ...item, currentStock: newStock }
                          : item
                      );
                      saveItems(updated);
                      showToast("Estoque atualizado com sucesso!", "success");
                    }}
                  />
                </motion.div>
              ) : activeTab === 'estoque' ? (
                <motion.div
                  key="estoque-tab"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  <ItemTable
                    items={items}
                    logs={dailyLogs}
                    onEdit={handleEditSelect}
                    onDelete={handleDeleteItem}
                    onAddNew={() => {
                      setEditingItem(null);
                      setIsFormOpen(true);
                    }}
                  />
                </motion.div>
              ) : (
                <motion.div
                  key="vendas-tab"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-8"
                >
                  <DailyLogTable
                    logs={dailyLogs}
                    onEdit={handleEditDailyLogSelect}
                    onDelete={handleDeleteDailyLog}
                    onAddNew={handleCreateDirectDailyLog}
                    selectedLogId={selectedLogId}
                    onSelectLog={setSelectedLogId}
                  />
                  <DailyItemSalesTable
                    log={selectedLog}
                    items={items}
                    onUpdateSale={handleUpdateItemSale}
                    onClearSale={handleClearItemSale}
                    isReportModalOpenExternally={isReportOpen}
                    onCloseReportModalExternally={() => setIsReportOpen(false)}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>

      {/* Footer containing reset defaults button */}
      <footer className="w-full max-w-7xl mx-auto px-4 md:px-8 py-8 mt-12 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-white/30">
        <div>
          <span>© {new Date().getFullYear()} MétricaVendas • Gestão de Doces e Caixas</span>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleExportBackup}
            title="Baixar cópia de segurança"
            className="flex items-center gap-1.5 px-3 py-1.5 text-white/40 hover:text-white/80 hover:bg-white/5 border border-white/10 rounded-xl transition-all cursor-pointer text-xs font-semibold"
          >
            <Download size={12} />
            <span>Exportar Backup</span>
          </button>
          
          <label
            title="Restaurar de cópia de segurança"
            className="flex items-center gap-1.5 px-3 py-1.5 text-white/40 hover:text-white/80 hover:bg-white/5 border border-white/10 rounded-xl transition-all cursor-pointer text-xs font-semibold"
          >
            <Upload size={12} />
            <span>Importar Backup</span>
            <input type="file" className="hidden" accept=".json" onChange={handleImportBackup} />
          </label>

          <button
            id="reset-defaults-btn"
            onClick={handleResetToDefaults}
            title="Restaurar dados padrão"
            className="flex items-center gap-1.5 px-3 py-1.5 text-red-400/60 hover:text-red-400 hover:bg-red-500/10 border border-white/10 rounded-xl transition-all cursor-pointer text-xs font-semibold ml-2"
          >
            <RotateCcw size={12} />
            <span>Restaurar Padrão</span>
          </button>
        </div>
      </footer>

      {/* Add / Edit Side-Over Modal */}
      <ItemForm
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingItem(null);
        }}
        onSubmit={handleSubmitItem}
        editingItem={editingItem}
      />

      {/* Daily Log Add / Edit Modal */}
      <DailyLogForm
        isOpen={isLogFormOpen}
        onClose={() => {
          setIsLogFormOpen(false);
          setEditingLog(null);
        }}
        onSubmit={handleSubmitDailyLog}
        editingLog={editingLog}
        items={items}
      />

      {/* Floating Success / Feedback Toast Alert */}
      <AnimatePresence>
        {toast && (
          <motion.div
            id="toast-notification"
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-5 right-5 z-50 flex items-center gap-3 px-4 py-3 bg-slate-950/80 backdrop-blur-md border border-white/10 text-white rounded-2xl shadow-2xl max-w-sm"
          >
            {toast.type === "success" ? (
              <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle size={18} className="text-amber-400 shrink-0" />
            )}
            <p className="text-xs font-semibold leading-relaxed">{toast.message}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Custom Confirmation Modal */}
      <AnimatePresence>
        {confirmDialog && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              onClick={() => setConfirmDialog(null)}
              className="fixed inset-0 bg-slate-950/70 z-40 backdrop-blur-xs"
            />
            {/* Dialog Card */}
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="bg-slate-950/95 border border-white/10 backdrop-blur-md w-full max-w-sm rounded-2xl shadow-2xl p-6 pointer-events-auto"
              >
                <h3 className="text-base font-bold text-white mb-2">{confirmDialog.title}</h3>
                <p className="text-xs text-white/60 mb-6 leading-relaxed">{confirmDialog.message}</p>
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setConfirmDialog(null)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-white/60 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  >
                    {confirmDialog.cancelText}
                  </button>
                  <button
                    onClick={confirmDialog.onConfirm}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-red-500/20 hover:bg-red-500/35 border border-red-500/25 transition-colors cursor-pointer"
                  >
                    {confirmDialog.confirmText}
                  </button>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
