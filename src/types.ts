/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Product {
  pid: number;
  name: string;
  category: string;
  cost_price: number;
  price: number;
  stock: number;
  reorder_level: number;
}

export interface Customer {
  cid: number;
  name: string;
  phone: string;
  total_spent: number;
  visit_count: number;
}

export interface CartItem {
  product: Product;
  quantity: number;
  priceAtSale: number;
  costAtSale: number;
}

export interface Bill {
  billNo: number;
  customerId: number | null;
  customerName?: string;
  total: number;
  discount: number;
  paymentMethod: 'CASH' | 'UPI' | 'KHATA';
  date: string;
  time: string;
}

export interface BillItem {
  id: number;
  billNo: number;
  productId: number;
  productName: string;
  quantity: number;
  price: number;
  amount: number;
  costPrice: number;
  profit: number;
}

export interface KhataDue {
  khataId: number;
  customerId: number;
  billNo: number;
  amountDue: number;
  amountPaid: number;
  dateAdded: string;
  status: 'pending' | 'partial' | 'cleared';
}

export interface KhataPayment {
  paymentId: number;
  customerId: number;
  amountPaid: number;
  paymentDate: string;
  note: string;
}

export interface KhataCredit {
  customerId: number;
  creditAmount: number;
  lastUpdated: string;
}

export interface ShopSettings {
  shopName: string;
  shopAddress: string;
  upiId: string;
  gstRate: number;
  currency: string;
}

export const INITIAL_PRODUCTS: Product[] = [
  { pid: 1, name: "Basmati Rice (Supreme)", category: "Groceries", cost_price: 65, price: 90, stock: 120, reorder_level: 20 },
  { pid: 2, name: "Aashirvaad Atta 5kg", category: "Groceries", cost_price: 210, price: 260, stock: 45, reorder_level: 10 },
  { pid: 3, name: "Fortune Mustard Oil 1L", category: "Oils", cost_price: 135, price: 165, stock: 8, reorder_level: 15 }, // low stock
  { pid: 4, name: "Amul Butter 500g", category: "Diary", cost_price: 220, price: 255, stock: 30, reorder_level: 8 },
  { pid: 5, name: "Tata Salt 1kg", category: "Groceries", cost_price: 20, price: 28, stock: 200, reorder_level: 25 },
  { pid: 6, name: "Surf Excel Easy Wash 1kg", category: "Household", cost_price: 110, price: 140, stock: 50, reorder_level: 12 },
  { pid: 7, name: "Dano Milk Powder 1kg", category: "Diary", cost_price: 490, price: 580, stock: 3, reorder_level: 5 }, // low stock
  { pid: 8, name: "Red Label Tea 500g", category: "Beverages", cost_price: 180, price: 220, stock: 35, reorder_level: 10 }
];

export const INITIAL_CUSTOMERS: Customer[] = [
  { cid: 101, name: "Arjun Sharma", phone: "9876543210", total_spent: 4200, visit_count: 8 },
  { cid: 102, name: "Priya Varma", phone: "9812345678", total_spent: 7250, visit_count: 14 }, // VIP
  { cid: 103, name: "Rajesh Kumar", phone: "9945678123", total_spent: 1200, visit_count: 3 },
  { cid: 104, name: "Ananya Sen", phone: "8877665544", total_spent: 0, visit_count: 0 }, // New customer with pending khata setup
  { cid: 105, name: "Suresh Pillai", phone: "7766554433", total_spent: 3100, visit_count: 5 }
];

export const INITIAL_BILLS: Bill[] = [
  { billNo: 10001, customerId: 101, total: 685, discount: 15, paymentMethod: "CASH", date: "2026-05-28", time: "11:20 AM" },
  { billNo: 10002, customerId: 102, total: 1150, discount: 50, paymentMethod: "UPI", date: "2026-05-29", time: "03:45 PM" },
  { billNo: 10003, customerId: 103, total: 350, discount: 0, paymentMethod: "KHATA", date: "2026-05-30", time: "08:15 PM" },
  { billNo: 10004, customerId: 105, total: 820, discount: 20, paymentMethod: "CASH", date: "2026-05-31", time: "10:05 AM" }
];

export const INITIAL_BILL_ITEMS: BillItem[] = [
  { id: 1, billNo: 10001, productId: 1, productName: "Basmati Rice (Supreme)", quantity: 5, price: 90, amount: 450, costPrice: 65, profit: 125 },
  { id: 2, billNo: 10001, productId: 3, productName: "Fortune Mustard Oil 1L", quantity: 1, price: 165, amount: 165, costPrice: 135, profit: 30 },
  { id: 3, billNo: 10001, productId: 8, productName: "Red Label Tea 500g", quantity: 0.5, price: 220, amount: 110, costPrice: 180, profit: 20 },
  { id: 4, billNo: 10002, productId: 2, productName: "Aashirvaad Atta 5kg", quantity: 2, price: 260, amount: 520, costPrice: 210, profit: 100 },
  { id: 5, billNo: 10002, productId: 4, productName: "Amul Butter 500g", quantity: 2, price: 255, amount: 510, costPrice: 220, profit: 70 },
  { id: 6, billNo: 10002, productId: 5, productName: "Tata Salt 1kg", quantity: 6, price: 28, amount: 168, costPrice: 20, profit: 48 },
  { id: 7, billNo: 10003, productId: 6, productName: "Surf Excel Easy Wash 1kg", quantity: 2, price: 140, amount: 280, costPrice: 110, profit: 60 },
  { id: 8, billNo: 10003, productId: 8, productName: "Red Label Tea 500g", quantity: 0.32, price: 220, amount: 70, costPrice: 180, profit: 12.8 },
  { id: 9, billNo: 10004, productId: 7, productName: "Dano Milk Powder 1kg", quantity: 1, price: 580, amount: 580, costPrice: 490, profit: 90 },
  { id: 10, billNo: 10004, productId: 2, productName: "Aashirvaad Atta 5kg", quantity: 1, price: 260, amount: 260, costPrice: 210, profit: 50 }
];

export const INITIAL_KHATA_DUES: KhataDue[] = [
  { khataId: 1, customerId: 103, billNo: 10003, amountDue: 350, amountPaid: 0, dateAdded: "2026-05-30", status: "pending" },
  { khataId: 2, customerId: 101, billNo: 9999, amountDue: 900, amountPaid: 400, dateAdded: "2026-05-15", status: "partial" } // older bill
];

export const INITIAL_KHATA_PAYMENTS: KhataPayment[] = [
  { paymentId: 1, customerId: 101, amountPaid: 400, paymentDate: "2026-05-20", note: "Paid partial cash dues for outstanding bills" }
];

export const INITIAL_KHATA_CREDITS: KhataCredit[] = [
  { customerId: 102, creditAmount: 180, lastUpdated: "2026-05-29" } //riya has 180 store credit
];

export const INITIAL_SETTINGS: ShopSettings = {
  shopName: "Ganesh Stores",
  shopAddress: "123 Main Street, Bangalore, Karnataka",
  upiId: "ganeshstores@upi",
  gstRate: 5,
  currency: "₹"
};
