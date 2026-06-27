import { Item, DailyLog } from "./types";

export const INITIAL_ITEMS: Item[] = [
  {
    id: "1",
    name: "Pacote: Amendoim Verde",
    price: 6.50,
    totalSold: 273.00,
    category: "Amendoins",
    currentStock: 50,
    minStock: 10,
    salePrice: 10.00,
    unitsPerPackage: 1
  },
  {
    id: "2",
    name: "Pacote: Amendoim Dourado",
    price: 6.50,
    totalSold: 227.50,
    category: "Amendoins",
    currentStock: 50,
    minStock: 10,
    salePrice: 10.00,
    unitsPerPackage: 1
  },
  {
    id: "3",
    name: "Bala Gengibre com Mel",
    price: 3.50,
    totalSold: 273.00,
    category: "Balas",
    currentStock: 50,
    minStock: 10,
    salePrice: 1.00,
    unitsPerPackage: 30
  },
  {
    id: "4",
    name: "Bala de Café",
    price: 3.00,
    totalSold: 336.00,
    category: "Balas",
    currentStock: 50,
    minStock: 10,
    salePrice: 1.00,
    unitsPerPackage: 30
  },
  {
    id: "5",
    name: "Bala de Hortelã",
    price: 3.00,
    totalSold: 435.00,
    category: "Balas",
    currentStock: 50,
    minStock: 10,
    salePrice: 1.00,
    unitsPerPackage: 30
  },
  {
    id: "6",
    name: "Bala de Tamarindo",
    price: 3.20,
    totalSold: 172.80,
    category: "Balas",
    currentStock: 50,
    minStock: 10,
    salePrice: 1.00,
    unitsPerPackage: 30
  },
  {
    id: "7",
    name: "Bala Maçã Verde",
    price: 3.00,
    totalSold: 294.00,
    category: "Balas",
    currentStock: 50,
    minStock: 10,
    salePrice: 1.00,
    unitsPerPackage: 30
  },
  {
    id: "8",
    name: "Bala Framboesa",
    price: 3.00,
    totalSold: 372.00,
    category: "Balas",
    currentStock: 50,
    minStock: 10,
    salePrice: 1.00,
    unitsPerPackage: 30
  },
  {
    id: "9",
    name: "Bala Paçoquita",
    price: 4.00,
    totalSold: 352.00,
    category: "Balas",
    currentStock: 50,
    minStock: 10,
    salePrice: 1.00,
    unitsPerPackage: 30
  },
  {
    id: "10",
    name: "Trybala de Uva",
    price: 3.50,
    totalSold: 217.00,
    category: "Balas",
    currentStock: 50,
    minStock: 10,
    salePrice: 1.00,
    unitsPerPackage: 30
  },
  {
    id: "11",
    name: "Trybala de Morango",
    price: 3.50,
    totalSold: 255.50,
    category: "Balas",
    currentStock: 50,
    minStock: 10,
    salePrice: 1.00,
    unitsPerPackage: 30
  },
  {
    id: "12",
    name: "Bala Toffee de Maracujá",
    price: 4.50,
    totalSold: 220.50,
    category: "Balas",
    currentStock: 50,
    minStock: 10,
    salePrice: 1.00,
    unitsPerPackage: 30
  },
  {
    id: "13",
    name: "Bala Toffee de Chocolate",
    price: 4.50,
    totalSold: 274.50,
    category: "Balas",
    currentStock: 50,
    minStock: 10,
    salePrice: 1.00,
    unitsPerPackage: 30
  },
  {
    id: "14",
    name: "Bala de Iogurte",
    price: 3.00,
    totalSold: 468.00,
    category: "Balas",
    currentStock: 50,
    minStock: 10,
    salePrice: 1.00,
    unitsPerPackage: 30
  },
  {
    id: "15",
    name: "Caixa de Paçoca",
    price: 18.90,
    totalSold: 415.80,
    category: "Doces",
    currentStock: 50,
    minStock: 10,
    salePrice: 2.00,
    unitsPerPackage: 50
  },
  {
    id: "16",
    name: "Doce de Amendoim",
    price: 2.00,
    totalSold: 230.00,
    category: "Doces",
    currentStock: 50,
    minStock: 10,
    salePrice: 2.00,
    unitsPerPackage: 1
  },
  {
    id: "17",
    name: "Bananada",
    price: 1.50,
    totalSold: 141.00,
    category: "Doces",
    currentStock: 50,
    minStock: 10,
    salePrice: 2.00,
    unitsPerPackage: 1
  },
  {
    id: "18",
    name: "Fregells Cereja",
    price: 2.20,
    totalSold: 396.00,
    category: "Fregells & Mentos",
    currentStock: 50,
    minStock: 10,
    salePrice: 2.00,
    unitsPerPackage: 1
  },
  {
    id: "19",
    name: "Fregells Menta",
    price: 2.20,
    totalSold: 312.40,
    category: "Fregells & Mentos",
    currentStock: 50,
    minStock: 10,
    salePrice: 2.00,
    unitsPerPackage: 1
  },
  {
    id: "20",
    name: "Fregells Extraforte",
    price: 2.20,
    totalSold: 462.00,
    category: "Fregells & Mentos",
    currentStock: 50,
    minStock: 10,
    salePrice: 2.00,
    unitsPerPackage: 1
  },
  {
    id: "21",
    name: "Mentos Uva",
    price: 3.00,
    totalSold: 285.00,
    category: "Fregells & Mentos",
    currentStock: 50,
    minStock: 10,
    salePrice: 2.00,
    unitsPerPackage: 1
  },
  {
    id: "22",
    name: "Mentos Menta",
    price: 3.00,
    totalSold: 261.00,
    category: "Fregells & Mentos",
    currentStock: 50,
    minStock: 10,
    salePrice: 2.00,
    unitsPerPackage: 1
  },
  {
    id: "23",
    name: "Mentos Frutas",
    price: 3.00,
    totalSold: 354.00,
    category: "Fregells & Mentos",
    currentStock: 50,
    minStock: 10,
    salePrice: 2.00,
    unitsPerPackage: 1
  },
  {
    id: "24",
    name: "Bala Eucalipto",
    price: 2.50,
    totalSold: 257.50,
    category: "Balas",
    currentStock: 50,
    minStock: 10,
    salePrice: 1.00,
    unitsPerPackage: 30
  }
];

export const CATEGORIES = [
  "Balas",
  "Amendoins",
  "Doces",
  "Fregells & Mentos"
];

export const INITIAL_DAILY_LOGS: DailyLog[] = [
  {
    id: "dl-1",
    date: "2026-06-25",
    quantityToSell: 130,
    soldValue: 450.50,
    pilotCost: 50.00,
    reinvestedValue: 120.00,
    expenses: 15.00,
    notes: "Movimento excelente! Vendemos a maior parte das balas de café e amendoins.",
    itemSales: [
      {
        id: "dis-1",
        itemId: "4",
        itemName: "Bala de Café",
        price: 3.00,
        loadedQuantity: 80,
        leftoverQuantity: 10,
        busesBoarded: 14,
        pilotCost: 25.00,
        expenses: 7.50,
        salePrice: 1.00,
        unitsPerPackage: 30
      },
      {
        id: "dis-2",
        itemId: "2",
        itemName: "Pacote: Amendoim Dourado",
        price: 6.50,
        loadedQuantity: 50,
        leftoverQuantity: 13,
        busesBoarded: 14,
        pilotCost: 25.00,
        expenses: 7.50,
        salePrice: 10.00,
        unitsPerPackage: 1
      }
    ]
  },
  {
    id: "dl-2",
    date: "2026-06-24",
    quantityToSell: 120,
    soldValue: 310.50,
    pilotCost: 45.00,
    reinvestedValue: 80.00,
    expenses: 12.50,
    notes: "Tarde com chuva fraca, mas o amendoim dourado saiu bastante.",
    itemSales: [
      {
        id: "dis-3",
        itemId: "2",
        itemName: "Pacote: Amendoim Dourado",
        price: 6.50,
        loadedQuantity: 60,
        leftoverQuantity: 20,
        busesBoarded: 10,
        pilotCost: 22.50,
        expenses: 6.25,
        salePrice: 10.00,
        unitsPerPackage: 1
      },
      {
        id: "dis-4",
        itemId: "3",
        itemName: "Bala Gengibre com Mel",
        price: 3.50,
        loadedQuantity: 60,
        leftoverQuantity: 45,
        busesBoarded: 10,
        pilotCost: 22.50,
        expenses: 6.25,
        salePrice: 1.00,
        unitsPerPackage: 30
      }
    ]
  }
];
