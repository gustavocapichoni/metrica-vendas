import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Plus, Save, Undo } from "lucide-react";
import { Item } from "../types";
import { CATEGORIES } from "../data";

interface ItemFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (item: Omit<Item, "id"> & { id?: string }) => void;
  editingItem: Item | null;
}

export default function ItemForm({ isOpen, onClose, onSubmit, editingItem }: ItemFormProps) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState<number | "">("");
  const [category, setCategory] = useState("Balas");
  const [currentStock, setCurrentStock] = useState<number | "">("");
  const [minStock, setMinStock] = useState<number | "">("");
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Reset form or populate when editingItem changes
  useEffect(() => {
    if (editingItem) {
      setName(editingItem.name);
      setPrice(editingItem.price);
      setCategory(editingItem.category || "Balas");
      setCurrentStock(editingItem.currentStock ?? 0);
      setMinStock(editingItem.minStock ?? 0);
      setErrors({});
    } else {
      setName("");
      setPrice("");
      setCategory("Balas");
      setCurrentStock("");
      setMinStock("");
      setErrors({});
    }
  }, [editingItem, isOpen]);

  const validate = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (!name.trim()) {
      newErrors.name = "O nome do item é obrigatório.";
    }

    if (price === "" || isNaN(Number(price)) || Number(price) < 0) {
      newErrors.price = "Insira um preço válido (maior ou igual a zero).";
    }

    if (currentStock === "" || isNaN(Number(currentStock)) || Number(currentStock) < 0) {
      newErrors.currentStock = "Insira um estoque atual válido (maior ou igual a zero).";
    }

    if (minStock === "" || isNaN(Number(minStock)) || Number(minStock) < 0) {
      newErrors.minStock = "Insira um estoque mínimo válido (maior ou igual a zero).";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    onSubmit({
      id: editingItem?.id,
      name: name.trim(),
      price: Number(price),
      category,
      currentStock: Number(currentStock),
      minStock: Number(minStock)
    });

    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            id="form-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.6 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-950/70 z-40 backdrop-blur-xs"
          />

          {/* Modal Container */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              id="form-modal"
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", duration: 0.4 }}
              className="bg-slate-950/80 border border-white/10 backdrop-blur-md w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col"
            >
              {/* Header */}
              <div className="px-6 py-4 border-b border-white/10 flex justify-between items-center bg-transparent">
                <div>
                  <h3 className="font-bold text-white text-lg">
                    {editingItem ? "Editar Item" : "Novo Item"}
                  </h3>
                  <p className="text-xs text-white/50 mt-0.5">
                    {editingItem ? "Atualize as informações do produto" : "Preencha os dados para cadastrar o item"}
                  </p>
                </div>
                <button
                  id="close-form-btn"
                  onClick={onClose}
                  className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Form Body */}
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                {/* Product Name */}
                <div>
                  <label htmlFor="input-name" className="block text-xs font-bold text-white/60 uppercase tracking-wider mb-1">
                    Nome do Item *
                  </label>
                  <input
                    id="input-name"
                    type="text"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (errors.name) setErrors(prev => ({ ...prev, name: "" }));
                    }}
                    placeholder="Ex: Teclado Sem Fio"
                    className={`w-full px-4 py-2.5 rounded-xl text-sm transition-all focus:outline-none focus:ring-2 ${
                      errors.name
                        ? "border-red-500/50 focus:ring-red-500/20 focus:border-red-500/80 bg-red-500/5 text-white placeholder:text-white/30"
                        : "bg-white/5 border border-white/10 text-white placeholder:text-white/20 focus:ring-white/20 focus:border-white/30"
                    }`}
                  />
                  {errors.name && (
                    <p className="text-xs text-red-400 mt-1 font-medium">{errors.name}</p>
                  )}
                </div>

                {/* Price */}
                <div>
                  <label htmlFor="input-price" className="block text-xs font-bold text-white/60 uppercase tracking-wider mb-1">
                    Preço Unitário *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40 text-sm font-semibold">R$</span>
                    <input
                      id="input-price"
                      type="number"
                      step="0.01"
                      min="0"
                      value={price}
                      onChange={(e) => {
                        const val = e.target.value;
                        setPrice(val === "" ? "" : Number(val));
                        if (errors.price) setErrors(prev => ({ ...prev, price: "" }));
                      }}
                      placeholder="0,00"
                      className={`w-full pl-9 pr-4 py-2.5 rounded-xl text-sm transition-all focus:outline-none focus:ring-2 ${
                        errors.price
                          ? "border-red-500/50 focus:ring-red-500/20 focus:border-red-500/80 bg-red-500/5 text-white placeholder:text-white/30"
                          : "bg-white/5 border border-white/10 text-white placeholder:text-white/20 focus:ring-white/20 focus:border-white/30"
                      }`}
                    />
                  </div>
                  {errors.price && (
                    <p className="text-xs text-red-400 mt-1 font-medium">{errors.price}</p>
                  )}
                </div>

                {/* Category */}
                <div>
                  <label htmlFor="input-category" className="block text-xs font-bold text-white/60 uppercase tracking-wider mb-1">
                    Categoria
                  </label>
                  <select
                    id="input-category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl text-sm transition-all focus:outline-none focus:ring-2 bg-white/5 border border-white/10 text-white/80 focus:ring-white/20 focus:border-white/30 cursor-pointer"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat} className="bg-slate-900 text-white font-medium">
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Grid for Stock */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Current Stock */}
                  <div>
                    <label htmlFor="input-current-stock" className="block text-xs font-bold text-white/60 uppercase tracking-wider mb-1">
                      Estoque Atual *
                    </label>
                    <input
                      id="input-current-stock"
                      type="number"
                      min="0"
                      value={currentStock}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCurrentStock(val === "" ? "" : Number(val));
                        if (errors.currentStock) setErrors(prev => ({ ...prev, currentStock: "" }));
                      }}
                      placeholder="Ex: 50"
                      className={`w-full px-4 py-2.5 rounded-xl text-sm transition-all focus:outline-none focus:ring-2 ${
                        errors.currentStock
                          ? "border-red-500/50 focus:ring-red-500/20 focus:border-red-500/80 bg-red-500/5 text-white placeholder:text-white/30"
                          : "bg-white/5 border border-white/10 text-white placeholder:text-white/20 focus:ring-white/20 focus:border-white/30"
                      }`}
                    />
                    {errors.currentStock && (
                      <p className="text-xs text-red-400 mt-1 font-medium">{errors.currentStock}</p>
                    )}
                  </div>

                  {/* Min Stock */}
                  <div>
                    <label htmlFor="input-min-stock" className="block text-xs font-bold text-white/60 uppercase tracking-wider mb-1">
                      Estoque Mín. *
                    </label>
                    <input
                      id="input-min-stock"
                      type="number"
                      min="0"
                      value={minStock}
                      onChange={(e) => {
                        const val = e.target.value;
                        setMinStock(val === "" ? "" : Number(val));
                        if (errors.minStock) setErrors(prev => ({ ...prev, minStock: "" }));
                      }}
                      placeholder="Ex: 10"
                      className={`w-full px-4 py-2.5 rounded-xl text-sm transition-all focus:outline-none focus:ring-2 ${
                        errors.minStock
                          ? "border-red-500/50 focus:ring-red-500/20 focus:border-red-500/80 bg-red-500/5 text-white placeholder:text-white/30"
                          : "bg-white/5 border border-white/10 text-white placeholder:text-white/20 focus:ring-white/20 focus:border-white/30"
                      }`}
                    />
                    {errors.minStock && (
                      <p className="text-xs text-red-400 mt-1 font-medium">{errors.minStock}</p>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="pt-4 flex items-center justify-end gap-3 border-t border-white/10 mt-6">
                  <button
                    id="cancel-form-btn"
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white/60 hover:text-white hover:bg-white/10 transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Undo size={16} />
                    <span>Cancelar</span>
                  </button>
                  <button
                    id="submit-form-btn"
                    type="submit"
                    className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-white/15 hover:bg-white/25 border border-white/15 transition-all flex items-center gap-1.5 shadow-md active:scale-98 cursor-pointer"
                  >
                    {editingItem ? <Save size={16} /> : <Plus size={16} />}
                    <span>{editingItem ? "Salvar Alterações" : "Adicionar Item"}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
