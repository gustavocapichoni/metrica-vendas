export interface Item {
  id: string;
  name: string;
  price: number;
  category: string;
  currentStock?: number;
  minStock?: number;
  salePrice: number;
  unitsPerPackage?: number;
}

export interface DailyItemSale {
  id: string;
  itemId: string;          // References Item.id
  itemName: string;        // Cache the product name
  price: number;           // Unit price at the time of sale (cost price/package cost)
  loadedQuantity: number;   // Quantity taken to sell (Carga)
  leftoverQuantity: number; // Quantity left over (Sobra)
  busesBoarded: number;     // Number of buses entered to sell this item
  pilotCost: number;       // Pilot sweet cost for this item
  expenses: number;        // Specific expense for this item
  busSales?: number[];     // Array of quantities sold on each bus boarded
  salePrice?: number;      // Unit selling price at the time of sale
  unitsPerPackage?: number; // Units per package at the time of sale
  reinvestedValue?: number; // Reinvestment value for this specific item
}

export interface RestockItem {
  id: string;
  itemId: string;
  itemName: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
}

export interface DailyLog {
  id: string;
  date: string;
  quantityToSell: number;
  soldValue: number;
  pilotCost: number;
  reinvestedValue: number;
  expenses: number;
  notes?: string;
  itemSales?: DailyItemSale[]; // Detailed sales per item/bus
  restocks?: RestockItem[];    // Items purchased/restocked with reinvested funds
}

export interface DashboardStats {
  totalItems: number;
  totalSoldQuantity: number;
  totalRevenue: number;
  averagePrice: number;
}

export function getItemUnitValue(itemName: string): number {
  const name = itemName.toLowerCase();
  if (
    name.includes("paçoca") ||
    name.includes("paçoquita") ||
    name.includes("mentos") ||
    name.includes("fregells") ||
    name.includes("freegels") ||
    name.includes("doce de amendoim") ||
    name.includes("doce de amenedoim") ||
    name.includes("bananada")
  ) {
    return 2.0;
  }
  return 1.0;
}

export function getPilotSweetUnitCost(itemName: string): number {
  return getItemUnitValue(itemName);
}

