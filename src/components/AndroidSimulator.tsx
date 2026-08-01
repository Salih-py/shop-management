/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from "react";
import { 
  ShoppingBag, 
  Package, 
  BookOpen, 
  BarChart3, 
  Settings, 
  Wifi, 
  Battery, 
  Search, 
  Plus, 
  Minus, 
  Trash2, 
  ArrowRight, 
  QrCode, 
  CheckCircle2, 
  AlertTriangle, 
  UserPlus, 
  CreditCard, 
  Coins, 
  TrendingUp, 
  Activity, 
  HelpCircle,
  X,
  Sparkles,
  Receipt,
  FileCheck,
  Check,
  User,
  ArrowDownLeft,
  ArrowUpRight,
  Tag,
  Upload,
  Download
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Product, 
  Customer, 
  CartItem, 
  Bill, 
  BillItem, 
  KhataDue, 
  KhataPayment, 
  KhataCredit, 
  ShopSettings,
  INITIAL_PRODUCTS,
  INITIAL_CUSTOMERS,
  INITIAL_BILLS,
  INITIAL_BILL_ITEMS,
  INITIAL_KHATA_DUES,
  INITIAL_KHATA_PAYMENTS,
  INITIAL_KHATA_CREDITS,
  INITIAL_SETTINGS
} from "../types";

interface AndroidSimulatorProps {
  settings: ShopSettings;
  setSettings: React.Dispatch<React.SetStateAction<ShopSettings>>;
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  customers: Customer[];
  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
  bills: Bill[];
  setBills: React.Dispatch<React.SetStateAction<Bill[]>>;
  billItems: BillItem[];
  setBillItems: React.Dispatch<React.SetStateAction<BillItem[]>>;
  khataDues: KhataDue[];
  setKhataDues: React.Dispatch<React.SetStateAction<KhataDue[]>>;
  khataPayments: KhataPayment[];
  setKhataPayments: React.Dispatch<React.SetStateAction<KhataPayment[]>>;
  khataCredits: KhataCredit[];
  setKhataCredits: React.Dispatch<React.SetStateAction<KhataCredit[]>>;
}

export default function AndroidSimulator({
  settings,
  setSettings,
  products,
  setProducts,
  customers,
  setCustomers,
  bills,
  setBills,
  billItems,
  setBillItems,
  khataDues,
  setKhataDues,
  khataPayments,
  setKhataPayments,
  khataCredits,
  setKhataCredits
}: AndroidSimulatorProps) {
  // Navigation State
  // View options: 'billing' | 'inventory' | 'khata' | 'reports' | 'settings'
  const [activeTab, setActiveTab] = useState<'billing' | 'inventory' | 'khata' | 'reports' | 'settings'>('billing');

  // Time for Phone Status Bar
  const [phoneTime, setPhoneTime] = useState("");
  useEffect(() => {
    const updateTime = () => {
      const date = new Date();
      let hours = date.getHours();
      const minutes = date.getMinutes();
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12; // first hour
      const minutesStr = minutes < 10 ? '0' + minutes : minutes;
      setPhoneTime(`${hours}:${minutesStr} ${ampm}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 10000);
    return () => clearInterval(interval);
  }, []);

  // --- 1. BILLING SCREEN STATE & LOGIC ---
  const [cart, setCart] = useState<CartItem[]>([]);
  const [billingSearch, setBillingSearch] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [qtyInput, setQtyInput] = useState<number>(1);
  const [discountInput, setDiscountInput] = useState<string>("0");
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  
  // Checkout Dialog Flow
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'UPI' | 'KHATA'>('CASH');
  
  // Repayment state for Cash
  const [cashReceived, setCashReceived] = useState<string>("");
  
  // Completed Receipt Dialog
  const [currentReceipt, setCurrentReceipt] = useState<{
    bill: Bill;
    items: BillItem[];
    changeDue?: number;
  } | null>(null);

  const billingFilteredProducts = useMemo(() => {
    if (!billingSearch.trim()) return [];
    return products.filter(p => p.name.toLowerCase().includes(billingSearch.toLowerCase()) || p.category.toLowerCase().includes(billingSearch.toLowerCase()));
  }, [products, billingSearch]);

  const cartSubtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + (item.priceAtSale * item.quantity), 0);
  }, [cart]);

  const discountValue = useMemo(() => {
    const val = parseFloat(discountInput);
    return isNaN(val) ? 0 : val;
  }, [discountInput]);

  const cartGrandTotal = useMemo(() => {
    return Math.max(0, cartSubtotal - discountValue);
  }, [cartSubtotal, discountValue]);

  const handleAddProductToCart = () => {
    if (!selectedProduct) return;
    if (qtyInput <= 0) return;
    
    // Check stock
    if (qtyInput > selectedProduct.stock) {
      alert(`Insufficient stock! Only ${selectedProduct.stock} units available.`);
      return;
    }

    const existingIndex = cart.findIndex(item => item.product.pid === selectedProduct.pid);
    if (existingIndex >= 0) {
      const newQty = cart[existingIndex].quantity + qtyInput;
      if (newQty > selectedProduct.stock) {
        alert(`Cannot add more! Combined cart quantity (${newQty}) exceeds available stock (${selectedProduct.stock}).`);
        return;
      }
      const updatedCart = [...cart];
      updatedCart[existingIndex].quantity = newQty;
      setCart(updatedCart);
    } else {
      setCart([...cart, {
        product: selectedProduct,
        quantity: qtyInput,
        priceAtSale: selectedProduct.price,
        costAtSale: selectedProduct.cost_price
      }]);
    }
    
    // Reset and close selector
    setQtyInput(1);
    setSelectedProduct(null);
    setBillingSearch("");
  };

  const selectedCustomerObj = useMemo(() => {
    if (!selectedCustomerId) return null;
    return customers.find(c => c.cid === selectedCustomerId) || null;
  }, [selectedCustomerId, customers]);

  const handleCheckoutSubmit = () => {
    if (cart.length === 0) return;

    // Validate checkout fields based on payment method
    if (paymentMethod === "KHATA" && !selectedCustomerId) {
      alert("You must select a Registered Customer for Credit/Khata transactions!");
      return;
    }

    let change = 0;
    if (paymentMethod === "CASH") {
      const cash = parseFloat(cashReceived);
      if (isNaN(cash) || cash < cartGrandTotal) {
        alert("Please enter a valid cash amount equal to or greater than the grand total!");
        return;
      }
      change = cash - cartGrandTotal;
    }

    const newBillNo = bills.length > 0 ? Math.max(...bills.map(b => b.billNo)) + 1 : 10001;
    const formattedDate = new Date().toISOString().split('T')[0];
    const formattedTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Create the Bill record
    const newBill: Bill = {
      billNo: newBillNo,
      customerId: selectedCustomerId,
      customerName: selectedCustomerObj?.name || undefined,
      total: cartGrandTotal,
      discount: discountValue,
      paymentMethod: paymentMethod,
      date: formattedDate,
      time: formattedTime
    };

    // Create BillItems & Compute Profits
    const newBillItems: BillItem[] = cart.map((item, index) => {
      const itemAmount = item.priceAtSale * item.quantity;
      const totalCost = item.costAtSale * item.quantity;
      return {
        id: (billItems.length > 0 ? Math.max(...billItems.map(bi => bi.id)) : 0) + index + 1,
        billNo: newBillNo,
        productId: item.product.pid,
        productName: item.product.name,
        quantity: item.quantity,
        price: item.priceAtSale,
        amount: itemAmount,
        costPrice: item.costAtSale,
        profit: itemAmount - totalCost
      };
    });

    // Update Product Catalog Stock levels
    setProducts(prevProducts => prevProducts.map(p => {
      const cartMatched = cart.find(item => item.product.pid === p.pid);
      if (cartMatched) {
        return { ...p, stock: Math.max(0, p.stock - cartMatched.quantity) };
      }
      return p;
    }));

    // Update Customer loyalty totals if customer is linked
    if (selectedCustomerId) {
      setCustomers(prevCust => prevCust.map(c => {
        if (c.cid === selectedCustomerId) {
          return {
            ...c,
            total_spent: c.total_spent + cartGrandTotal,
            visit_count: c.visit_count + 1
          };
        }
        return c;
      }));
    }

    // Process KHATA Credit Ledger if Payment is credit-based
    if (paymentMethod === "KHATA" && selectedCustomerId) {
      // Create new Khata due record
      const newKhataId = khataDues.length > 0 ? Math.max(...khataDues.map(k => k.khataId)) + 1 : 1;
      
      const newDue: KhataDue = {
        khataId: newKhataId,
        customerId: selectedCustomerId,
        billNo: newBillNo,
        amountDue: cartGrandTotal,
        amountPaid: 0,
        dateAdded: formattedDate,
        status: "pending"
      };

      // Check if customer has any stored excess credit in khata_credits
      const creditObj = khataCredits.find(kc => kc.customerId === selectedCustomerId);
      let availableCredit = creditObj ? creditObj.creditAmount : 0;

      if (availableCredit > 0) {
        if (availableCredit >= cartGrandTotal) {
          // Store credit completely pays the bill
          newDue.amountPaid = cartGrandTotal;
          newDue.status = "cleared";
          availableCredit -= cartGrandTotal;
        } else {
          // Store credit partially pays the bill
          newDue.amountPaid = availableCredit;
          newDue.status = "partial";
          availableCredit = 0;
        }

        // Save adjusted credits
        setKhataCredits(prevCredits => {
          const index = prevCredits.findIndex(c => c.customerId === selectedCustomerId);
          const todayStr = new Date().toISOString().split('T')[0];
          if (index >= 0) {
            const copy = [...prevCredits];
            copy[index] = { ...copy[index], creditAmount: availableCredit, lastUpdated: todayStr };
            return copy;
          }
          return [...prevCredits, { customerId: selectedCustomerId, creditAmount: availableCredit, lastUpdated: todayStr }];
        });
      }

      setKhataDues(prevDues => [...prevDues, newDue]);
    }

    // Persist Bill records
    setBills(prevBills => [newBill, ...prevBills]);
    setBillItems(prevItems => [...prevItems, ...newBillItems]);

    // Setup Receipt View
    setCurrentReceipt({
      bill: newBill,
      items: newBillItems,
      changeDue: paymentMethod === 'CASH' ? change : undefined
    });

    // Clear checkout form state and cart
    setCart([]);
    setDiscountInput("0");
    setSelectedCustomerId(null);
    setCashReceived("");
    setIsCheckoutOpen(false);
  };


  // --- 2. INVENTORY SCREEN STATE & LOGIC ---
  const [editingPid, setEditingPid] = useState<number | null>(null);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [inventorySearch, setInventorySearch] = useState("");
  const [inventoryForm, setInventoryForm] = useState({
    name: "",
    category: "Groceries",
    cost_price: "",
    price: "",
    stock: "",
    reorder_level: "10"
  });

  const [categories, setCategories] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("shop_categories_list");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.error(e);
    }
    return ["Groceries", "Household", "Oils", "Diary", "Beverages", "Spices", "Snacks"];
  });

  useEffect(() => {
    localStorage.setItem("shop_categories_list", JSON.stringify(categories));
  }, [categories]);

  const [newCategoryInput, setNewCategoryInput] = useState("");

  const handleAddCategory = () => {
    const trimmed = newCategoryInput.trim();
    if (!trimmed) return;
    const formatted = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
    if (categories.some(c => c.toLowerCase() === formatted.toLowerCase())) {
      alert(`Category "${formatted}" already exists!`);
      return;
    }
    setCategories(prev => [...prev, formatted]);
    setNewCategoryInput("");
  };

  const handleRemoveCategory = (cat: string) => {
    const inUse = products.some(p => p.category.toLowerCase() === cat.toLowerCase());
    if (inUse) {
      alert(`Cannot delete "${cat}" because it is currently assigned to some products in your inventory.`);
      return;
    }
    setCategories(prev => prev.filter(c => c !== cat));
  };

  const downloadCsv = (filename: string, csvContent: string) => {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadStockCsv = () => {
    if (products.length === 0) {
      alert("No products in catalog to download.");
      return;
    }
    let csv = "Product ID,Product Name,Category,Cost Price,Retail Price,Stock,Reorder Level\n";
    products.forEach(p => {
      const nameEscaped = p.name.includes(",") || p.name.includes('"') ? `"${p.name.replace(/"/g, '""')}"` : p.name;
      const catEscaped = p.category.includes(",") || p.category.includes('"') ? `"${p.category.replace(/"/g, '""')}"` : p.category;
      csv += `${p.pid},${nameEscaped},${catEscaped},${p.cost_price},${p.price},${p.stock},${p.reorder_level}\n`;
    });
    downloadCsv("shop_inventory_stock.csv", csv);
  };

  const handleDownloadSalesCsv = () => {
    if (bills.length === 0) {
      alert("No sales data available to download.");
      return;
    }
    let csv = "Bill No,Date,Time,Customer Name,Payment Method,Product Name,Quantity,Retail Price,Item Total Amount,Cost Price,Item Profit Amount,Bill Total,Bill Discount\n";
    bills.forEach(bill => {
      const items = billItems.filter(item => item.billNo === bill.billNo);
      const customerName = bill.customerName || "Walk-in Guest";
      const customerEscaped = customerName.includes(",") || customerName.includes('"') 
        ? `"${customerName.replace(/"/g, '""')}"` 
        : customerName;

      if (items.length === 0) {
        csv += `${bill.billNo},${bill.date},${bill.time},${customerEscaped},${bill.paymentMethod},N/A,0,0,0,0,0,${bill.total},${bill.discount}\n`;
      } else {
        items.forEach((item, idx) => {
          const prodNameEscaped = item.productName.includes(",") || item.productName.includes('"')
            ? `"${item.productName.replace(/"/g, '""')}"`
            : item.productName;
          const docBillTotal = idx === 0 ? bill.total : "";
          const docBillDiscount = idx === 0 ? bill.discount : "";
          csv += `${bill.billNo},${bill.date},${bill.time},${customerEscaped},${bill.paymentMethod},${prodNameEscaped},${item.quantity},${item.price},${item.amount},${item.costPrice},${item.profit},${docBillTotal},${docBillDiscount}\n`;
        });
      }
    });
    downloadCsv("shop_sales_ledger.csv", csv);
  };

  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      const lines = text.split(/\r?\n/);
      if (lines.length < 1) {
        alert("The uploaded CSV file is empty.");
        return;
      }

      let parsedCount = 0;
      let skippedCount = 0;
      let updatedCount = 0;
      const newProducts: Product[] = [...products];
      const newlyAddedCats = new Set<string>();
      const currentCats = [...categories];

      lines.forEach((line, i) => {
        if (!line.trim()) return;

        let columns: string[] = [];
        let inQuotes = false;
        let currentValue = "";

        for (let charIndex = 0; charIndex < line.length; charIndex++) {
          const char = line[charIndex];
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            columns.push(currentValue.trim());
            currentValue = "";
          } else {
            currentValue += char;
          }
        }
        columns.push(currentValue.trim());

        if (columns.length < 2) return;

        let [name, category, costStr, priceStr, stockStr, reorderStr] = columns;

        name = name.replace(/^"|"$/g, '').trim();
        category = category ? category.replace(/^"|"$/g, '').trim() : "Groceries";
        costStr = costStr ? costStr.replace(/^"|"$/g, '').trim() : "0";
        priceStr = priceStr ? priceStr.replace(/^"|"$/g, '').trim() : "0";
        stockStr = stockStr ? stockStr.replace(/^"|"$/g, '').trim() : "0";
        reorderStr = reorderStr ? reorderStr.replace(/^"|"$/g, '').trim() : "10";

        const lowerName = name.toLowerCase();
        if (i === 0 && (lowerName.includes("product") || lowerName.includes("item") || lowerName.includes("name") || lowerName.includes("title"))) {
          return;
        }

        if (!name) {
          skippedCount++;
          return;
        }

        const costVal = parseFloat(costStr) || 0;
        const priceVal = parseFloat(priceStr) || 0;
        const stockVal = parseFloat(stockStr) || 0;
        const reorderVal = parseFloat(reorderStr) || 0;

        if (priceVal <= 0) {
          skippedCount++;
          return;
        }

        const formattedCategory = category ? category.trim() : "Groceries";
        if (formattedCategory && !currentCats.includes(formattedCategory) && !newlyAddedCats.has(formattedCategory)) {
          newlyAddedCats.add(formattedCategory);
        }

        const dupIdx = newProducts.findIndex(p => p.name.toLowerCase() === name.toLowerCase());
        if (dupIdx >= 0) {
          newProducts[dupIdx] = {
            ...newProducts[dupIdx],
            category: formattedCategory,
            cost_price: costVal,
            price: priceVal,
            stock: stockVal,
            reorder_level: reorderVal
          };
          updatedCount++;
        } else {
          const nextPid = newProducts.length > 0 ? Math.max(...newProducts.map(p => p.pid)) + 1 : 1;
          newProducts.push({
            pid: nextPid,
            name,
            category: formattedCategory,
            cost_price: costVal,
            price: priceVal,
            stock: stockVal,
            reorder_level: reorderVal
          });
          parsedCount++;
        }
      });

      if (newlyAddedCats.size > 0) {
        setCategories(prev => {
          const merged = [...prev];
          newlyAddedCats.forEach(cat => {
            if (!merged.includes(cat)) {
              merged.push(cat);
            }
          });
          return merged;
        });
      }

      setProducts(newProducts);
      alert(`Import complete!\nImported: ${parsedCount} new products\nUpdated: ${updatedCount} duplicate products\nSkipped: ${skippedCount} invalid items`);
      e.target.value = "";
    };

    reader.onerror = () => {
      alert("Failed to read the file.");
    };

    reader.readAsText(file);
  };

  // Real-time margin calculator
  const formMarginPercent = useMemo(() => {
    const cost = parseFloat(inventoryForm.cost_price);
    const sell = parseFloat(inventoryForm.price);
    if (isNaN(cost) || isNaN(sell) || sell === 0) return 0;
    return Math.round(((sell - cost) / sell) * 100);
  }, [inventoryForm.cost_price, inventoryForm.price]);

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    const { name, category, cost_price, price, stock, reorder_level } = inventoryForm;

    if (!name.trim() || !category || !price || !stock) {
      alert("Product Name, Category, Retail Price, and Stock level are mandatory!");
      return;
    }

    const costNum = parseFloat(cost_price) || 0;
    const priceNum = parseFloat(price);
    const stockNum = parseFloat(stock);
    const reorderNum = parseFloat(reorder_level) || 0;

    if (isNaN(priceNum) || priceNum <= 0 || isNaN(stockNum) || stockNum < 0) {
      alert("Retail Price and Stock must be positive numbers!");
      return;
    }

    if (costNum > priceNum) {
      // Cost price higher than retail price warning note
    }

    if (editingPid !== null) {
      // Edit mode
      setProducts(prev => prev.map(p => {
        if (p.pid === editingPid) {
          return {
            ...p,
            name: name.trim(),
            category,
            cost_price: costNum,
            price: priceNum,
            stock: stockNum,
            reorder_level: reorderNum
          };
        }
        return p;
      }));
      setEditingPid(null);
    } else {
      // Add mode - duplicate check
      const duplicate = products.find(p => p.name.toLowerCase() === name.trim().toLowerCase());
      if (duplicate) {
        // Automatically update the price and stock details of that already existing product
        setProducts(prev => prev.map(p => {
          if (p.pid === duplicate.pid) {
            return {
              ...p,
              category, // update category if selected
              cost_price: costNum,
              price: priceNum,
              stock: p.stock + stockNum, // add new stock to existing stock
              reorder_level: reorderNum
            };
          }
          return p;
        }));
        alert(`Product "${duplicate.name}" already exists.\nSuccessfully updated price details & added +${stockNum} units to existing stock (New stock: ${duplicate.stock + stockNum} Units).`);
      } else {
        const newPid = products.length > 0 ? Math.max(...products.map(p => p.pid)) + 1 : 1;
        const newProduct: Product = {
          pid: newPid,
          name: name.trim(),
          category,
          cost_price: costNum,
          price: priceNum,
          stock: stockNum,
          reorder_level: reorderNum
        };
        setProducts(prev => [...prev, newProduct]);
      }
    }

    // Reset Form
    setInventoryForm({
      name: "",
      category: "Groceries",
      cost_price: "",
      price: "",
      stock: "",
      reorder_level: "10"
    });
  };

  const handleEditProductClick = (p: Product) => {
    setEditingPid(p.pid);
    setInventoryForm({
      name: p.name,
      category: p.category,
      cost_price: p.cost_price.toString(),
      price: p.price.toString(),
      stock: p.stock.toString(),
      reorder_level: p.reorder_level.toString()
    });
  };

  const handleDeleteProduct = (p: Product) => {
    setProductToDelete(p);
  };

  const confirmDeleteProduct = () => {
    if (!productToDelete) return;
    const pid = productToDelete.pid;
    setProducts(prev => prev.filter(item => item.pid !== pid));
    if (editingPid === pid) {
      setEditingPid(null);
      setInventoryForm({
        name: "",
        category: "Groceries",
        cost_price: "",
        price: "",
        stock: "",
        reorder_level: "10"
      });
    }
    setProductToDelete(null);
  };


  // --- 3. CUSTOMER & KHATA LEDGER LOGIC ---
  const [customerSearch, setCustomerSearch] = useState("");
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [custFormName, setCustFormName] = useState("");
  const [custFormPhone, setCustFormPhone] = useState("");
  
  // Specific Customer Ledger view
  const [activeKhataCustomer, setActiveKhataCustomer] = useState<Customer | null>(null);
  
  // Repayment overlay inside Khata screen
  const [isRepayOpen, setIsRepayOpen] = useState(false);
  const [repayCashInput, setRepayCashInput] = useState("");
  const [repayNote, setRepayNote] = useState("");
  
  // Settle engine summary output
  const [settlementSummary, setSettlementSummary] = useState<{
    cashPaid: number;
    billsCleared: number;
    billsPartially: number;
    remaining: number;
    refundedCredit: number;
  } | null>(null);

  const filteredCustomers = useMemo(() => {
    return customers.filter(c => 
      c.name.toLowerCase().includes(customerSearch.toLowerCase()) || 
      c.phone.includes(customerSearch)
    );
  }, [customers, customerSearch]);

  const handleAddCustomerSubmit = () => {
    if (!custFormName.trim()) {
      alert("Customer Name is mandatory!");
      return;
    }
    const cleanPhone = custFormPhone.trim().replace(/\s+/g, "");
    if (!cleanPhone) {
      alert("Phone number is mandatory to open a Khata account!");
      return;
    }
    // Must be exactly 10 digits and typical Indian mobile series (starts with 6, 7, 8, 9)
    const isIndianPhone = /^[6-9]\d{9}$/.test(cleanPhone);
    if (!isIndianPhone) {
      alert("Invalid Phone Number! Please enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9 (e.g. 9876543210).");
      return;
    }
    const newCid = customers.length > 0 ? Math.max(...customers.map(c => c.cid)) + 1 : 101;
    const newCustomer: Customer = {
      cid: newCid,
      name: custFormName.trim(),
      phone: cleanPhone,
      total_spent: 0,
      visit_count: 0
    };
    setCustomers(prev => [...prev, newCustomer]);
    setCustFormName("");
    setCustFormPhone("");
    setIsAddCustomerOpen(false);
    
    // Select automatically if we are currently in billing
    if (activeTab === 'billing') {
      setSelectedCustomerId(newCid);
    }
  };

  // Get specific customer credit and outstanding dues
  const customerDuesList = useMemo(() => {
    if (!activeKhataCustomer) return [];
    return khataDues.filter(k => k.customerId === activeKhataCustomer.cid).sort((a,b) => a.dateAdded.localeCompare(b.dateAdded));
  }, [activeKhataCustomer, khataDues]);

  const customerTotalDue = useMemo(() => {
    return customerDuesList.reduce((sum, item) => {
      if (item.status !== "cleared") {
        return sum + (item.amountDue - item.amountPaid);
      }
      return sum;
    }, 0);
  }, [customerDuesList]);

  const customerCreditAmount = useMemo(() => {
    if (!activeKhataCustomer) return 0;
    const creditObj = khataCredits.find(kc => kc.customerId === activeKhataCustomer.cid);
    return creditObj ? creditObj.creditAmount : 0;
  }, [activeKhataCustomer, khataCredits]);

  // Kotlin Settlement Engine simulation logic
  const handleProcessRepayment = () => {
    if (!activeKhataCustomer) return;
    const cash = parseFloat(repayCashInput);
    if (isNaN(cash) || cash <= 0) {
      alert("Please enter a valid repayment cash amount greater than zero!");
      return;
    }

    const cid = activeKhataCustomer.cid;
    const initialCredit = customerCreditAmount;
    let remainingRepay = cash + initialCredit;
    const originalAvailable = remainingRepay;

    let billsClearedCount = 0;
    let billsPartiallyCount = 0;

    // Settle due bills, OLDEST dates first (which we sorted in customerDuesList)
    const updatedDues = khataDues.map(due => {
      if (due.customerId === cid && due.status !== "cleared") {
        const netDue = due.amountDue - due.amountPaid;
        if (remainingRepay <= 0) return due;

        if (remainingRepay >= netDue) {
          // Fully cleared!
          billsClearedCount++;
          remainingRepay -= netDue;
          return {
            ...due,
            amountPaid: due.amountDue,
            status: "cleared" as const
          };
        } else {
          // Partially paid
          billsPartiallyCount++;
          const paidCopy = due.amountPaid + remainingRepay;
          remainingRepay = 0;
          return {
            ...due,
            amountPaid: paidCopy,
            status: "partial" as const
          };
        }
      }
      return due;
    });

    // Save Adjusted khata dues list state
    setKhataDues(updatedDues);

    // If leftover money -> convert to and save as store credit
    const resultingCredit = remainingRepay;
    setKhataCredits(prevCredits => {
      const idx = prevCredits.findIndex(kc => kc.customerId === cid);
      const today = new Date().toISOString().split('T')[0];
      if (idx >= 0) {
        const copy = [...prevCredits];
        copy[idx] = { ...copy[idx], creditAmount: resultingCredit, lastUpdated: today };
        return copy;
      }
      return [...prevCredits, { customerId: cid, creditAmount: resultingCredit, lastUpdated: today }];
    });

    // Save payment log
    const repaymentLogId = khataPayments.length > 0 ? Math.max(...khataPayments.map(kp => kp.paymentId)) + 1 : 1;
    const todayStr = new Date().toISOString().split('T')[0];
    const newPaymentLog: KhataPayment = {
      paymentId: repaymentLogId,
      customerId: cid,
      amountPaid: cash,
      paymentDate: todayStr,
      note: repayNote.trim() || `Khata manual cash repayment`
    };
    setKhataPayments(prev => [...prev, newPaymentLog]);

    // Show summary layout dialog parameters
    setSettlementSummary({
      cashPaid: cash,
      billsCleared: billsClearedCount,
      billsPartially: billsPartiallyCount,
      remaining: Math.max(0, customerTotalDue - (originalAvailable - remainingRepay)),
      refundedCredit: resultingCredit
    });

    // Reset inputs
    setRepayCashInput("");
    setRepayNote("");
    setIsRepayOpen(false);
  };


  // --- 4. ANALYTICS & REPORTS STATE & LOGIC ---
  const summaryCounters = useMemo(() => {
    const totalSalesRevenue = bills.reduce((sum, b) => sum + b.total, 0);
    const lowStockCount = products.filter(p => p.stock <= p.reorder_level).length;
    // Calculate total layout profit
    const totalProfit = billItems.reduce((sum, item) => sum + item.profit, 0);
    // Unique categories active
    const categoriesCount = new Set(products.map(p => p.category)).size;

    return {
      totalSalesRevenue,
      lowStockCount,
      totalProfit,
      categoriesCount
    };
  }, [bills, products, billItems]);

  // Daily Sales Trend Chart Data
  const dailySalesData = useMemo(() => {
    // Collect last 5 sales dates or dates where sales happened
    const dates = Array.from(new Set(bills.map(b => b.date))).sort();
    return dates.map(dt => {
      const dayBills = bills.filter(b => b.date === dt);
      const sales = dayBills.reduce((sum, b) => sum + b.total, 0);
      const costOfSales = billItems
        .filter(item => {
          const matchBill = dayBills.find(b => b.billNo === item.billNo);
          return !!matchBill;
        })
        .reduce((sum, item) => sum + (item.costPrice * item.quantity), 0);

      const profitVal = sales - costOfSales;
      return {
        date: dt.substring(5), // MM-DD format short
        revenue: sales,
        profit: profitVal
      };
    }).slice(-6); // Last 6 days of activities
  }, [bills, billItems]);

  // Most Selling Products by units sold
  const mostSellingProducts = useMemo(() => {
    const qtyMap: Record<string, { pid: number; name: string; qty: number; revenue: number; profit: number }> = {};
    billItems.forEach(item => {
      const key = item.productId || item.productName;
      if (!qtyMap[key]) {
        qtyMap[key] = { pid: item.productId, name: item.productName, qty: 0, revenue: 0, profit: 0 };
      }
      qtyMap[key].qty += item.quantity;
      qtyMap[key].revenue += item.amount;
      qtyMap[key].profit += item.profit;
    });
    return Object.values(qtyMap).sort((a, b) => b.qty - a.qty).slice(0, 5);
  }, [billItems]);

  // Most Profitable Products
  const mostProfitableProducts = useMemo(() => {
    const profitMap: Record<string, { pid: number; name: string; qty: number; revenue: number; profit: number }> = {};
    billItems.forEach(item => {
      const key = item.productId || item.productName;
      if (!profitMap[key]) {
        profitMap[key] = { pid: item.productId, name: item.productName, qty: 0, revenue: 0, profit: 0 };
      }
      profitMap[key].qty += item.quantity;
      profitMap[key].revenue += item.amount;
      profitMap[key].profit += item.profit;
    });
    return Object.values(profitMap).sort((a, b) => b.profit - a.profit).slice(0, 5);
  }, [billItems]);

  // Category velocity metrics
  const categoryVelocity = useMemo(() => {
    const catMap: Record<string, { category: string; qty: number; revenue: number; profit: number }> = {};
    billItems.forEach(item => {
      const prod = products.find(p => p.pid === item.productId);
      const cat = prod ? prod.category : "Groceries";
      if (!catMap[cat]) {
        catMap[cat] = { category: cat, qty: 0, revenue: 0, profit: 0 };
      }
      catMap[cat].qty += item.quantity;
      catMap[cat].revenue += item.amount;
      catMap[cat].profit += item.profit;
    });
    const totalQty = Object.values(catMap).reduce((sum, item) => sum + item.qty, 0) || 1;
    return Object.values(catMap)
      .map(item => ({
        ...item,
        percentage: Math.round((item.qty / totalQty) * 100)
      }))
      .sort((a, b) => b.qty - a.qty);
  }, [billItems, products]);

  // Dynamic Seasonal Analysis & Recommendations
  const seasonalAnalysis = useMemo(() => {
    const dateObj = new Date();
    const month = dateObj.getMonth(); // 0-11
    let seasonName = "";
    let seasonDescription = "";
    let typicalMovingCategories: string[] = [];
    let stockAlertRecommendation = "";

    if (month >= 2 && month <= 5) {
      seasonName = "Summer Peak Period (Mar - Jun)";
      seasonDescription = "High temperature triggers premium demand for instant cooling & hydration products.";
      typicalMovingCategories = ["Beverages", "Diary", "Snacks"];
      stockAlertRecommendation = "Beverage counters and dairy cold storages are experiencing heavy traction. Top-up shelves by 25% today.";
    } else if (month >= 6 && month <= 8) {
      seasonName = "Monsoon Season (Jul - Sep)";
      seasonDescription = "Wet climate shifts consumer buying trends towards warm meals, health remedies and dry grains.";
      typicalMovingCategories = ["Household", "Oils", "Spices"];
      stockAlertRecommendation = "Damp proof storage advice active. Stack premium spices and dry flour on raised racks. Instant soups and masala powders show upward momentum.";
    } else if (month >= 9 && month <= 10) {
      seasonName = "Festive peak Period (Oct - Nov)";
      seasonDescription = "Diwali, Dussehra and local harvest seasons drive massive cooking and sweet staples consumption.";
      typicalMovingCategories = ["Oils", "Spices", "Snacks", "Diary"];
      stockAlertRecommendation = "Festive buying surge predicted. Keep clear carton backup buffers for high-grade Cooking Oils and fine Spices.";
    } else {
      seasonName = "Winter Cozy Season (Dec - Feb)";
      seasonDescription = "Colder atmospheric conditions trigger elevated demand for fat products, rich snacks, and health drinks.";
      typicalMovingCategories = ["Oils", "Spices", "Diary", "Beverages"];
      stockAlertRecommendation = "Hot beverages (Teas & Instant mix coffees) and butter blocks can expect a 2x velocity hike.";
    }

    return {
      seasonName,
      seasonDescription,
      typicalMovingCategories,
      stockAlertRecommendation
    };
  }, []);


  return (
    <div className="relative w-[380px] h-[780px] bg-[#1a1a1a] rounded-[52px] border-[10px] border-[#313131] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col font-sans select-none" id="android-device">
      
      {/* 1. Android Status Bar (Ambient Gray-Matte background) */}
      <div className="h-10 bg-[#0f0f0f] border-b border-[#242424] px-6 py-2 flex items-center justify-between text-xs text-stone-300 font-medium z-30">
        <div>{phoneTime || "12:00 PM"}</div>
        
        {/* Android Punch-hole Camera Cutout */}
        <div className="absolute left-1/2 -translate-x-1/2 w-4 h-4 bg-black rounded-full top-[9px] z-50 shadow-[inset_0_1px_3px_rgba(255,255,255,0.2)]"></div>
        
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] tracking-wide text-amber-500 font-bold bg-amber-500/10 px-1 rounded border border-amber-500/20">5G</span>
          <Wifi size={13} className="text-stone-300" />
          <div className="flex items-center gap-0.5">
            <span className="text-[10px] font-mono">92%</span>
            <Battery size={14} className="text-emerald-500 rotate-90 scale-x-110 ml-0.5" />
          </div>
        </div>
      </div>

      {/* 2. Main High-Fidelity App Shell Frame */}
      <div className="flex-1 bg-[#121212] overflow-y-auto flex flex-col style-scroll" id="android-app-container">
        
        {/* Dynamic Screens Router Switcher */}
        <div className="flex-1 overflow-y-auto flex flex-col pb-16">
          
          {/* A. BILLING COMPONENT SCREEN */}
          {activeTab === "billing" && (
            <div className="flex-1 flex flex-col p-4 gap-4 animate-fadeIn">
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="text-xl font-bold text-white leading-tight">Digital Billing</h1>
                  <p className="text-xs text-stone-400">Terminal ID: M3-0098</p>
                </div>
                <div className="flex items-center gap-1 text-[11px] bg-emerald-500/10 text-emerald-400 px-2.5 py-1 rounded-full border border-emerald-500/20 font-bold font-mono">
                  <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></div>
                  ONLINE
                </div>
              </div>

              {/* Dynamic product interactive search bar */}
              <div className="relative">
                <Search className="absolute left-3 top-3 text-stone-500" size={17} />
                <input
                  type="text"
                  placeholder="Scan or enter details..."
                  className="w-full bg-[#1e1e1e] border border-[#2d2d2d] focus:border-stone-500 outline-none text-white text-sm rounded-xl pl-10 pr-4 py-2.5 transition"
                  value={billingSearch}
                  onChange={(e) => setBillingSearch(e.target.value)}
                />
                
                {/* Search Quick Dropdown */}
                {billingSearch.trim() && (
                  <div className="absolute left-0 right-0 mt-1 max-h-48 bg-[#1e1e1e] border border-[#2d2d2d] rounded-xl overflow-y-auto z-40 shadow-xl scrollbar-none">
                    {billingFilteredProducts.length === 0 ? (
                      <div className="p-3 text-xs text-stone-500 text-center">No matching product found</div>
                    ) : (
                      billingFilteredProducts.map(p => (
                        <div 
                          key={p.pid}
                          onClick={() => {
                            setSelectedProduct(p);
                            setBillingSearch("");
                          }}
                          className="p-3 border-b border-[#2d2d2d] hover:bg-stone-800 transition flex justify-between items-center cursor-pointer"
                        >
                          <div>
                            <p className="text-sm font-semibold text-white">{p.name}</p>
                            <p className="text-xs text-stone-400">{p.category} • stock: {p.stock} Units</p>
                          </div>
                          <div className="text-right">
                            <span className="text-sm font-bold text-emerald-400">{settings.currency}{p.price}</span>
                            {p.stock <= p.reorder_level && (
                              <span className="block text-[9px] text-red-400 font-bold">LOW STOCK</span>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Customer Selector M3 Styling */}
              <div className="bg-[#1a1a1a] rounded-xl p-3 border border-[#282828] flex justify-between items-center">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-stone-800 flex items-center justify-center text-white font-bold text-xs border border-stone-700">
                    {selectedCustomerObj ? selectedCustomerObj.name.substring(0,1) : <User size={15} />}
                  </div>
                  <div>
                    <p className="text-xs text-stone-400">Bill To Customer</p>
                    <p className="text-sm font-semibold text-white">
                      {selectedCustomerObj ? selectedCustomerObj.name : "Walk-in Guest"}
                    </p>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <select
                    className="bg-transparent text-xs text-amber-400 outline-none cursor-pointer border border-[#2e2e2e] py-1 px-2 rounded-lg bg-[#222]"
                    value={selectedCustomerId || ""}
                    onChange={(e) => setSelectedCustomerId(e.target.value ? parseInt(e.target.value) : null)}
                  >
                    <option value="" className="bg-stone-900 text-white">Guest Client</option>
                    {customers.map(c => (
                      <option key={c.cid} value={c.cid} className="bg-stone-900 text-white">{c.name}</option>
                    ))}
                  </select>
                  <button 
                    onClick={() => setIsAddCustomerOpen(true)}
                    className="p-1 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 rounded-lg border border-amber-500/30 transition"
                  >
                    <UserPlus size={15} />
                  </button>
                </div>
              </div>

              {/* Shopping Cart List Box */}
              <div className="flex-1 flex flex-col min-h-0 bg-[#161616] border border-[#242424] rounded-2xl p-3 gap-2.5 overflow-hidden">
                <div className="flex justify-between items-center px-1">
                  <span className="text-xs text-stone-400 font-bold select-none flex items-center gap-1.5">
                    <ShoppingBag size={14} className="text-amber-500" />
                    BASKET ({cart.length} ITEMS)
                  </span>
                  {cart.length > 0 && (
                    <button 
                      onClick={() => setCart([])}
                      className="text-xs text-red-400 hover:text-red-300 transition flex items-center gap-0.5"
                    >
                      <Trash2 size={12} /> Empty
                    </button>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto pr-1 gap-2 flex flex-col style-scroll">
                  {cart.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center gap-2 text-stone-500 py-12 select-none">
                      <ShoppingBag size={34} className="text-stone-700 stroke-[1.5]" />
                      <p className="text-xs">No active items inside checkout cart</p>
                      <p className="text-[10px] text-stone-600 max-w-[200px] text-center">Search for catalog items above to add quantities here</p>
                    </div>
                  ) : (
                    cart.map((item, index) => (
                      <div 
                        key={index}
                        className="bg-[#1f1f1f] rounded-xl p-3 border border-[#2d2d2d] flex flex-col gap-2.5 transition hover:border-[#333]"
                      >
                        <div className="flex justify-between items-start">
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-stone-100 truncate">{item.product.name}</p>
                            <p className="text-[10px] text-stone-400 mt-0.5">
                              {settings.currency}{item.priceAtSale} / Unit • Stock: {item.product.stock}
                            </p>
                          </div>
                          
                          <button 
                            onClick={() => {
                              const updated = [...cart];
                              updated.splice(index, 1);
                              setCart(updated);
                            }}
                            className="text-stone-500 hover:text-red-400 p-1 rounded-lg hover:bg-red-500/10 transition shrink-0"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                        
                        <div className="flex justify-between items-center pt-1.5 border-t border-[#2a2a2a]/40 font-mono">
                          {/* Interactive Inline Quantity Modifier Controls */}
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                const updated = [...cart];
                                if (item.quantity > 1) {
                                  updated[index] = { ...item, quantity: item.quantity - 1 };
                                  setCart(updated);
                                } else {
                                  updated.splice(index, 1);
                                  setCart(updated);
                                }
                              }}
                              className="w-6 h-6 rounded bg-[#2a2a2a] hover:bg-[#333] text-stone-300 font-bold flex items-center justify-center border border-[#3c3c3c] transition text-sm cursor-pointer"
                            >
                              -
                            </button>
                            <span className="text-xs font-mono text-stone-200 font-extrabold w-6 text-center select-all">{item.quantity}</span>
                            <button
                              onClick={() => {
                                if (item.quantity >= item.product.stock) {
                                  alert(`Maximum stock reached! Only ${item.product.stock} Units of ${item.product.name} are available.`);
                                  return;
                                }
                                const updated = [...cart];
                                updated[index] = { ...item, quantity: item.quantity + 1 };
                                setCart(updated);
                              }}
                              className="w-6 h-6 rounded bg-[#2a2a2a] hover:bg-[#333] text-stone-300 font-bold flex items-center justify-center border border-[#3c3c3c] transition text-sm cursor-pointer"
                            >
                              +
                            </button>
                          </div>
                          
                          <span className="text-xs font-black text-amber-400">
                            {settings.currency}{(item.priceAtSale * item.quantity)}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Subtotals & Taxes calculation widgets */}
                {cart.length > 0 && (
                  <div className="border-t border-[#242424] pt-2.5 flex flex-col gap-1.5 text-xs text-stone-400 px-1 font-mono">
                    <div className="flex justify-between">
                      <span>Basket Subtotal</span>
                      <span className="text-white">{settings.currency}{cartSubtotal}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Discount (Rupees)</span>
                      <input 
                        type="text"
                        className="bg-[#242424] text-amber-400 font-bold text-right outline-none w-16 px-1 py-0.5 rounded border border-[#363636] block" 
                        value={discountInput}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === "" || !isNaN(Number(val))) {
                            setDiscountInput(val);
                          }
                        }}
                      />
                    </div>
                    <div className="flex justify-between text-sm font-bold pt-1.5 border-t border-dashed border-[#242424] text-stone-100">
                      <span>Grand Total</span>
                      <span className="text-emerald-400 font-black text-base">{settings.currency}{cartGrandTotal}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Dynamic Action Trigger FAB */}
              {cart.length > 0 && (
                <button
                  onClick={() => {
                    setPaymentMethod('CASH');
                    setIsCheckoutOpen(true);
                  }}
                  className="w-full bg-amber-500 hover:bg-amber-600 text-stone-900 py-3 px-6 rounded-2xl flex items-center justify-center gap-2 font-black tracking-wide text-sm shadow-lg shadow-amber-500/20 active:scale-95 transition"
                >
                  PROCESS CHECKOUT
                  <ArrowRight size={16} />
                </button>
              )}
            </div>
          )}

          {/* B. INVENTORY SCREEN */}
          {activeTab === "inventory" && (
            <div className="flex-1 flex flex-col p-4 gap-4 animate-fadeIn">
              <div className="flex justify-between items-center bg-[#0d0d0d] pb-1 border-b border-[#242424]">
                <h1 className="text-lg font-black text-white uppercase tracking-tight">Stock Control</h1>
                <label className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-stone-950 font-black text-[10px] py-1.5 px-3 rounded-xl cursor-pointer transition select-none shadow shadow-amber-500/10">
                  <Upload size={13} />
                  <span>BULK CSV</span>
                  <input 
                    type="file" 
                    accept=".csv" 
                    className="hidden" 
                    onChange={handleCsvUpload} 
                  />
                </label>
              </div>

              {/* Informative CSV format helper */}
              <div className="bg-[#1e140a]/25 border border-amber-500/15 rounded-xl px-3 py-2.5 text-[10px] text-stone-300 leading-relaxed flex flex-col gap-1 shadow-sm">
                <span className="font-extrabold text-amber-500 text-[10px] tracking-wide uppercase flex items-center gap-1">
                  <Sparkles size={11} className="text-amber-500" />
                  BULK CSV IMPORT SPECIFICATION
                </span>
                <p className="text-stone-300 font-medium">To upload bulk products, provide a valid CSV with headers or rows in this structure:</p>
                <div className="bg-black/40 rounded-lg p-2 font-mono text-amber-400 text-[9px] border border-[#2d2d2d] my-0.5 select-all overflow-x-auto">
                  Product Name, Category, Buying Price, Retail Price, Stock, Alert Level
                </div>
                <p className="text-[9.5px] text-stone-500 italic mt-0.5">Note: Automatically registers new categories and adjusts stock of duplicate items.</p>
              </div>

              {/* Add / Edit Floating Card Form in M3 */}
              <form onSubmit={handleSaveProduct} className="bg-[#1a1a1a] rounded-2xl p-4 border border-[#2d2d2d] flex flex-col gap-3">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs text-stone-300 font-bold flex items-center gap-1">
                    {editingPid !== null ? (
                      <>
                        <Sparkles size={13} className="text-cyan-400" />
                        <span className="text-cyan-400">EDITING MODE</span>
                      </>
                    ) : (
                      <>
                        <Plus size={13} className="text-emerald-400" />
                        <span className="text-emerald-400">ADD NEW CATALOG ITEM</span>
                      </>
                    )}
                  </span>
                  {editingPid !== null && (
                    <button 
                      type="button" 
                      onClick={() => {
                        setEditingPid(null);
                        setInventoryForm({
                          name: "", category: "Groceries", cost_price: "", price: "", stock: "", reorder_level: "10"
                        });
                      }}
                      className="text-[10px] text-stone-400 bg-stone-800 hover:bg-stone-700 px-2 py-0.5 rounded-lg transition"
                    >
                      Clear
                    </button>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  <input
                    type="text"
                    placeholder="Product Name"
                    className="bg-[#242424] border border-[#333] rounded-xl px-3 py-2 text-stone-100 text-xs focus:outline-none focus:border-stone-500"
                    value={inventoryForm.name}
                    onChange={(e) => setInventoryForm({...inventoryForm, name: e.target.value})}
                  />
                  
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      className="bg-[#242424] border border-[#333] rounded-xl px-2 py-2 text-stone-300 text-xs focus:outline-none"
                      value={inventoryForm.category}
                      onChange={(e) => setInventoryForm({...inventoryForm, category: e.target.value})}
                    >
                      {categories.map(c => (
                        <option key={c} value={c} className="bg-stone-900">{c}</option>
                      ))}
                    </select>
                    
                    <input
                      type="text"
                      placeholder="Stock quantity"
                      className="bg-[#242424] border border-[#333] rounded-xl px-3 py-2 text-stone-100 text-xs focus:outline-none focus:border-stone-500"
                      value={inventoryForm.stock}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === "" || !isNaN(Number(val))) setInventoryForm({...inventoryForm, stock: val});
                      }}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <input
                      type="text"
                      placeholder="Buying Price"
                      className="bg-[#242424] border border-[#333] rounded-xl px-3 py-2 text-stone-100 text-xs focus:outline-none focus:border-stone-500"
                      value={inventoryForm.cost_price}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === "" || !isNaN(Number(val))) setInventoryForm({...inventoryForm, cost_price: val});
                      }}
                    />
                    
                    <input
                      type="text"
                      placeholder="Retail Price"
                      className="bg-[#242424] border border-[#333] rounded-xl px-3 py-2 text-stone-100 text-xs focus:outline-none focus:border-stone-500"
                      value={inventoryForm.price}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === "" || !isNaN(Number(val))) setInventoryForm({...inventoryForm, price: val});
                      }}
                    />

                    <input
                      type="text"
                      placeholder="Alert level"
                      className="bg-[#242424] border border-[#333] rounded-xl px-3 py-2 text-stone-100 text-xs focus:outline-none focus:border-stone-500"
                      value={inventoryForm.reorder_level}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === "" || !isNaN(Number(val))) setInventoryForm({...inventoryForm, reorder_level: val});
                      }}
                    />
                  </div>
                </div>

                {/* Sub-form Info display with margins */}
                <div className="flex justify-between items-center text-[11px] bg-stone-900/50 p-2.5 rounded-xl border border-stone-800/60 font-mono">
                  <span className="text-stone-400">Margin Calculation</span>
                  <span className={`font-bold ${formMarginPercent > 10 ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {formMarginPercent}% Profit Margin
                  </span>
                </div>

                <button
                  type="submit"
                  className={`w-full ${editingPid !== null ? 'bg-cyan-500 hover:bg-cyan-600 text-stone-900' : 'bg-emerald-500 hover:bg-emerald-600 text-stone-900'} py-2.5 rounded-xl text-xs font-black transition tracking-wider`}
                >
                  {editingPid !== null ? "SAVE EDIT DETAILS" : "CREATE PRODUCT"}
                </button>
              </form>

              {/* Product catalog List Display */}
              <div className="flex flex-col gap-2">
                <div className="relative mb-1">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-stone-500 pointer-events-none">
                    <Search size={14} className="text-stone-400" />
                  </span>
                  <input
                    type="text"
                    placeholder="Search product name or category..."
                    className="w-full bg-[#1e1e1e] border border-[#2d2d2d] rounded-xl pl-9 pr-8 py-2 text-xs text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-500 transition-colors"
                    value={inventorySearch}
                    onChange={(e) => setInventorySearch(e.target.value)}
                  />
                  {inventorySearch && (
                    <button
                      type="button"
                      onClick={() => setInventorySearch("")}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-stone-500 hover:text-stone-350 transition-colors"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>

                <div className="flex justify-between items-center mb-1 text-[11px] text-stone-400 px-1 font-bold">
                  <span>
                    CATALOG ITEMS ({products.filter(p => {
                      const q = inventorySearch.toLowerCase().trim();
                      if (!q) return true;
                      return p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q) || p.pid.toString() === q;
                    }).length} / {products.length})
                  </span>
                  <span className="text-red-400 flex items-center gap-1">
                    <AlertTriangle size={12} />
                    {products.filter(p => p.stock <= p.reorder_level).length} LOW STOCK
                  </span>
                </div>

                <div className="flex flex-col gap-2 max-h-72 overflow-y-auto style-scroll rounded-2xl pr-1">
                  {products
                    .filter(p => {
                      const q = inventorySearch.toLowerCase().trim();
                      if (!q) return true;
                      return p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q) || p.pid.toString() === q;
                    })
                    .map(p => {
                    const isLowStock = p.stock <= p.reorder_level;
                    const margin = p.cost_price > 0 
                      ? Math.round(((p.price - p.cost_price) / p.price) * 100) 
                      : 0;
                    
                    return (
                      <div 
                        key={p.pid}
                        onClick={() => handleEditProductClick(p)}
                        className={`p-3 rounded-xl border ${isLowStock ? 'bg-red-500/5 border-red-500/25 hover:bg-red-500/10' : 'bg-[#1a1a1a] border-[#292929] hover:bg-stone-800'} flex justify-between items-center transition duration-200 cursor-pointer`}
                      >
                        <div className="flex-1 min-w-0 pr-2">
                          <div className="flex items-center gap-1.5">
                            <h3 className="text-sm font-bold text-stone-100 truncate">{p.name}</h3>
                            {isLowStock && (
                              <span className="bg-red-500/20 text-red-400 text-[9px] px-1.5 py-0.5 rounded font-black select-none">
                                ALERT
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-stone-400 mt-0.5 mt-1 sm:mt-0 font-mono">
                            {p.category} • Cost: {settings.currency}{p.cost_price} • Price: {settings.currency}{p.price}
                          </p>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <span className="block text-sm font-black text-white font-mono">
                              {p.stock} Units
                            </span>
                            <span className={`text-[10px] uppercase font-bold font-mono ${margin >= 10 ? 'text-emerald-400' : 'text-amber-500'}`}>
                              {margin}% margin
                            </span>
                          </div>
                          
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteProduct(p);
                            }}
                            className="p-1.5 text-stone-500 hover:text-red-400 rounded-lg hover:bg-red-500/15 transition cursor-pointer"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* C. KHATA MANAGER SCREEN LAYOUT */}
          {activeTab === "khata" && (
            <div className="flex-1 flex flex-col p-4 gap-4 animate-fadeIn">
              
              {!activeKhataCustomer ? (
                // VIEW 1: Main Customer list with searching
                <>
                  <div className="flex justify-between items-center">
                    <h1 className="text-xl font-bold text-white">Khata Ledger</h1>
                    <button 
                      onClick={() => setIsAddCustomerOpen(true)}
                      className="bg-amber-500 hover:bg-green-600 font-bold text-stone-900 rounded-xl text-xs py-1.5 px-3 flex items-center gap-1 transition"
                    >
                      <Plus size={13} /> Guest Client
                    </button>
                  </div>

                  <div className="relative">
                    <Search className="absolute left-3 top-3 text-stone-500" size={17} />
                    <input
                      type="text"
                      placeholder="Search name or tel phone..."
                      className="w-full bg-[#1e1e1e] border border-[#2d2d2d] focus:border-stone-500 outline-none text-white text-sm rounded-xl pl-10 pr-4 py-2.5 transition"
                      value={customerSearch}
                      onChange={(e) => setCustomerSearch(e.target.value)}
                    />
                  </div>

                  <div className="flex flex-col gap-2 max-h-[460px] overflow-y-auto style-scroll pr-1">
                    {filteredCustomers.length === 0 ? (
                      <div className="text-center py-24 text-stone-500 text-xs">No registered customer found</div>
                    ) : (
                      filteredCustomers.map(c => {
                        // calculate credit/khata values
                        const clientDues = khataDues.filter(k => k.customerId === c.cid && k.status !== 'cleared');
                        const totalOutstanding = clientDues.reduce((sum, d) => sum + (d.amountDue - d.amountPaid), 0);
                        const creditObj = khataCredits.find(kc => kc.customerId === c.cid);
                        const creditBalance = creditObj ? creditObj.creditAmount : 0;
                        
                        // VIP Regular tag mapping
                        let loyaltyTag = "New";
                        let loyaltyColor = "bg-stone-800 text-stone-400";
                        if (c.total_spent >= 5000) {
                          loyaltyTag = "VIP";
                          loyaltyColor = "bg-purple-500/10 text-purple-400 border border-purple-500/20";
                        } else if (c.total_spent >= 2000) {
                          loyaltyTag = "Regular";
                          loyaltyColor = "bg-amber-500/10 text-amber-400 border border-amber-500/20";
                        }

                        return (
                          <div 
                            key={c.cid}
                            onClick={() => setActiveKhataCustomer(c)}
                            className="bg-[#1a1a1a] rounded-xl p-3 border border-[#262626] hover:bg-stone-800/80 hover:border-stone-700 transition cursor-pointer flex justify-between items-center"
                          >
                            <div className="min-w-0 pr-2">
                              <div className="flex items-center gap-2">
                                <h3 className="text-sm font-bold text-white truncate">{c.name}</h3>
                                <span className={`text-[9px] uppercase font-black px-1.5 py-0.5 rounded ${loyaltyColor}`}>
                                  {loyaltyTag}
                                </span>
                              </div>
                              <p className="text-xs text-stone-400 mt-1">Tel: {c.phone}</p>
                            </div>

                            <div className="text-right">
                              {totalOutstanding > 0 ? (
                                <span className="block text-sm font-black text-amber-400 font-mono">
                                  Due: {settings.currency}{totalOutstanding}
                                </span>
                              ) : creditBalance > 0 ? (
                                <span className="block text-sm font-black text-emerald-400 font-mono">
                                  Adv: {settings.currency}{creditBalance}
                                </span>
                              ) : (
                                <span className="block text-xs font-bold text-stone-500 font-mono">
                                  Cleared
                                </span>
                              )}
                              <span className="text-[10px] font-semibold text-stone-500">
                                {c.visit_count} visits
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </>
              ) : (
                // VIEW 2: Sub-customer settlement view
                <div className="flex-1 flex flex-col gap-4 animate-fadeIn">
                  <div className="flex items-center gap-2 border-b border-[#2d2d2d] pb-3">
                    <button 
                      onClick={() => {
                        setActiveKhataCustomer(null);
                        setSettlementSummary(null);
                      }}
                      className="text-stone-400 hover:text-white px-2 py-1 bg-stone-800 rounded-lg text-xs"
                    >
                      ← Back
                    </button>
                    <div>
                      <h2 className="text-sm font-black text-white">{activeKhataCustomer.name}</h2>
                      <p className="text-xs text-stone-400">Tel: {activeKhataCustomer.phone}</p>
                    </div>
                  </div>

                  {/* Summary card ledger */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-[#1a1a1a] p-3 rounded-xl border border-[#2d2d2d] text-center">
                      <p className="text-[10px] text-stone-400">TOTAL UNCLEARED DEBT</p>
                      <p className="text-base font-black text-amber-400 mt-1 font-mono">{settings.currency}{customerTotalDue}</p>
                    </div>
                    <div className="bg-[#1a1a1a] p-3 rounded-xl border border-[#2d2d2d] text-center">
                      <p className="text-[10px] text-stone-400 font-bold text-emerald-400">STORE CREDIT HELD</p>
                      <p className="text-base font-black text-emerald-400 mt-1 font-mono">{settings.currency}{customerCreditAmount}</p>
                    </div>
                  </div>

                  {/* Pending Invoices List ledger */}
                  <div className="flex-1 flex flex-col bg-[#161616] border border-[#252525] rounded-2xl p-3 gap-2 overflow-hidden max-h-56">
                    <span className="text-[11px] font-bold text-stone-400 select-none">DUES LIST FOR REAL-TIME SETTLEMENT</span>
                    
                    <div className="flex-1 overflow-y-auto pr-1 gap-2 flex flex-col style-scroll">
                      {customerDuesList.length === 0 ? (
                        <div className="flex-1 flex items-center justify-center py-6 text-stone-500 text-xs">
                          No pending debit dues for this client!
                        </div>
                      ) : (
                        customerDuesList.map(item => {
                          const netPending = item.amountDue - item.amountPaid;
                          return (
                            <div 
                              key={item.khataId}
                              className="bg-[#1f1f1f] rounded-xl p-3 border border-[#2d2d2d] flex justify-between items-center"
                            >
                              <div>
                                <p className="text-xs font-bold text-stone-200">Bill #{item.billNo}</p>
                                <p className="text-[10px] text-stone-500">{item.dateAdded}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="text-right">
                                  <span className="block text-xs font-bold text-amber-400 font-mono">
                                    {settings.currency}{netPending} remain
                                  </span>
                                  <span className="text-[9px] text-stone-400">
                                    out of {settings.currency}{item.amountDue}
                                  </span>
                                </div>
                                <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${item.status === 'pending' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}`}>
                                  {item.status}
                                </span>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Settle repayment FAB action buttons */}
                  {customerTotalDue > 0 && (
                    <button
                      onClick={() => setIsRepayOpen(true)}
                      className="w-full bg-emerald-500 hover:bg-emerald-600 text-stone-900 py-3 rounded-xl font-bold text-xs tracking-wider uppercase transition shadow-lg shadow-emerald-500/10"
                    >
                      COLLECT REPAYMENT VALUE
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* D. REPORTS & CHARTS CONTAINER */}
          {activeTab === "reports" && (
            <div className="flex-1 flex flex-col p-4 gap-4 animate-fadeIn overflow-y-auto style-scroll">
              <h1 className="text-xl font-bold text-white">Business Intelligence</h1>

              {/* KPI Scorecard Panels in grid */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-[#1a1a1a] rounded-xl px-3 py-3.5 border border-[#2d2d2d] flex items-center gap-2.5">
                  <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
                    <TrendingUp size={16} />
                  </div>
                  <div>
                    <p className="text-[10px] text-stone-500 font-bold uppercase">Cash Sales</p>
                    <p className="text-sm font-black text-stone-100 font-mono">
                      {settings.currency}{summaryCounters.totalSalesRevenue}
                    </p>
                  </div>
                </div>

                <div className="bg-[#1a1a1a] rounded-xl px-3 py-3.5 border border-[#2d2d2d] flex items-center gap-2.5">
                  <div className="p-2 bg-purple-500/10 text-purple-400 rounded-lg">
                    <Activity size={16} />
                  </div>
                  <div>
                    <p className="text-[10px] text-stone-500 font-bold uppercase font-mono">Profit Margin</p>
                    <p className="text-sm font-black text-stone-100 font-mono">
                      {settings.currency}{summaryCounters.totalProfit}
                    </p>
                  </div>
                </div>
              </div>

              {/* Chart 1: Visual SVG Sales Bar Representation */}
              <div className="bg-[#1a1a1a] rounded-2xl p-4 border border-[#2d2d2d] flex flex-col gap-3.5">
                <div>
                  <h3 className="text-xs font-black text-stone-300 uppercase tracking-wider">Revenue Trend Analytics</h3>
                  <p className="text-[10px] text-stone-500 mt-0.5">Historical sales log values mapped day-by-day</p>
                </div>

                {dailySalesData.length === 0 ? (
                  <div className="py-8 text-center text-stone-500 text-xs font-mono">Complete sales checkout to load visual statistics</div>
                ) : (
                  <div className="h-32 flex items-end justify-between gap-2.5 pt-4 border-b border-[#2d2d2d] font-mono select-none">
                    {dailySalesData.map((d, idx) => {
                      const maxVal = Math.max(...dailySalesData.map(item => item.revenue)) || 1;
                      const barPercentage = (d.revenue / maxVal) * 90; // scale limit
                      return (
                        <div key={idx} className="flex-1 flex flex-col items-center gap-1 group relative">
                          <div className="absolute bottom-full mb-1 bg-stone-900 border border-stone-800 text-[9px] text-white py-0.5 px-1 rounded opacity-0 group-hover:opacity-100 transition whitespace-nowrap z-50">
                            Rev: {settings.currency}{d.revenue}
                          </div>
                          
                          <div 
                            style={{ height: `${Math.max(12, barPercentage)}%` }}
                            className="w-full bg-amber-500 rounded-t-lg relative transition duration-300 hover:bg-amber-400 flex items-end justify-center"
                          >
                            <div className="w-1.5 h-[80%] bg-white/25 rounded-t-full mb-1"></div>
                          </div>
                          <span className="text-[9px] text-stone-400 mt-1 select-none">{d.date}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Chart 2: Product Popularity Pie distribution wrapper */}
              <div className="bg-[#1a1a1a] rounded-2xl p-4 border border-[#2d2d2d] flex flex-col gap-3.5">
                <div>
                  <h3 className="text-xs font-black text-stone-300 uppercase tracking-widest">Digital Payment Split</h3>
                  <p className="text-[10px] text-stone-500 mt-0.5">Transactions classified through settlement channels</p>
                </div>

                {bills.length === 0 ? (
                  <div className="py-6 text-center text-stone-500 text-xs font-mono">No payment transactions found</div>
                ) : (
                  <div className="flex flex-col gap-3 select-none">
                    {['CASH', 'UPI', 'KHATA'].map(method => {
                      const methodBills = bills.filter(b => b.paymentMethod === method);
                      const totalMethodSum = methodBills.reduce((sum, b) => sum + b.total, 0);
                      const grossSum = bills.reduce((sum, b) => sum + b.total, 0) || 1;
                      const percentage = Math.round((totalMethodSum / grossSum) * 100);
                      
                      let color = "bg-amber-500";
                      if (method === "UPI") color = "bg-emerald-500";
                      if (method === "KHATA") color = "bg-purple-500";

                      return (
                        <div key={method} className="flex flex-col gap-1.5 font-mono">
                          <div className="flex justify-between items-center text-xs text-stone-300 font-bold">
                            <span className="flex items-center gap-1.5">
                              <span className={`w-2.5 h-2.5 rounded-full ${color}`}></span>
                              {method} ({methodBills.length} BILLS)
                            </span>
                            <span>{percentage}% • {settings.currency}{totalMethodSum}</span>
                          </div>
                          <div className="w-full h-2 bg-stone-800 rounded-full overflow-hidden">
                            <div style={{ width: `${percentage}%` }} className={`h-full ${color}`}></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* PRODUCT LEADERBOARD: MOST SELLING AND MOST PROFITABLE */}
              <div className="bg-[#1a1a1a] rounded-2xl p-4 border border-[#2d2d2d] flex flex-col gap-3.5">
                <div>
                  <h3 className="text-xs font-black text-stone-300 uppercase tracking-widest">Product Leaderboard</h3>
                  <p className="text-[10px] text-stone-500 mt-0.5">Top performing products by sales volume & profits</p>
                </div>

                {billItems.length === 0 ? (
                  <div className="py-6 text-center text-stone-500 text-xs font-mono">No data collected yet</div>
                ) : (
                  <div className="flex flex-col gap-4">
                    {/* MOST SELLING PRODUCTS */}
                    <div>
                      <span className="text-[9px] font-black text-amber-505 uppercase tracking-wide bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded-md border border-amber-500/10">
                        Most Selling (Fast Quantity)
                      </span>
                      <div className="flex flex-col gap-2 mt-2">
                        {mostSellingProducts.map((p, idx) => (
                          <div 
                            key={p.pid || idx} 
                            className="bg-[#212121] rounded-xl p-2.5 border border-[#2c2c2c] flex justify-between items-center text-xs"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-[10px] text-stone-500 font-bold font-mono">#{idx + 1}</span>
                              <p className="text-stone-200 font-bold truncate max-w-[130px]">{p.name}</p>
                            </div>
                            <div className="text-right font-mono text-[11px] shrink-0">
                              <span className="text-amber-400 font-black">{p.qty} Units</span>
                              <span className="block text-[9px] text-stone-500">Rev: {settings.currency}{p.revenue}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* MOST PROFITABLE PRODUCTS */}
                    <div>
                      <span className="text-[9px] font-black text-emerald-505 uppercase tracking-wide bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-md border border-emerald-500/10">
                        Highest Profitable (Pre-calculated Gain)
                      </span>
                      <div className="flex flex-col gap-2 mt-2">
                        {mostProfitableProducts.map((p, idx) => (
                          <div 
                            key={p.pid || idx} 
                            className="bg-[#212121] rounded-xl p-2.5 border border-[#2c2c2c] flex justify-between items-center text-xs"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-[10px] text-stone-500 font-bold font-mono">#{idx + 1}</span>
                              <p className="text-stone-200 font-bold truncate max-w-[130px]">{p.name}</p>
                            </div>
                            <div className="text-right font-mono text-[11px] shrink-0">
                              <span className="text-emerald-400 font-black">+{settings.currency}{p.profit}</span>
                              <span className="block text-[9px] text-stone-500">{p.qty} Units Sold</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* CATEGORY VELOCITY: MOVING FAST CATEGORIES */}
              <div className="bg-[#1a1a1a] rounded-2xl p-4 border border-[#2d2d2d] flex flex-col gap-3.5">
                <div>
                  <h3 className="text-xs font-black text-stone-300 uppercase tracking-widest">Fast Moving Categories</h3>
                  <p className="text-[10px] text-stone-500 mt-0.5">Velocity calculated by quantity sold per category segment</p>
                </div>

                {categoryVelocity.length === 0 ? (
                  <div className="py-6 text-center text-stone-500 text-xs font-mono">No category sales recorded</div>
                ) : (
                  <div className="flex flex-col gap-3 select-none">
                    {categoryVelocity.map((item, idx) => {
                      let color = "bg-sky-500";
                      if (idx === 0) color = "bg-amber-400";
                      if (idx === 1) color = "bg-orange-400";
                      if (idx === 2) color = "bg-yellow-400";

                      return (
                        <div key={item.category} className="flex flex-col gap-1.5 font-mono">
                          <div className="flex justify-between items-center text-xs text-stone-300 font-bold">
                            <span className="flex items-center gap-1.5 capitalize">
                              <span className="text-stone-500 font-bold">#{idx + 1}</span>
                              {item.category}
                            </span>
                            <span className="text-[11px] text-stone-400">
                              {item.qty} units • <span className="text-stone-200 font-medium">{item.percentage}% velocity</span>
                            </span>
                          </div>
                          <div className="w-full h-2 bg-stone-850 rounded-full overflow-hidden border border-[#262626]">
                            <div style={{ width: `${item.percentage}%` }} className={`h-full ${color}`}></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* SEASONAL ANALYTICS & SMART RECOMMENDATION MODULE */}
              <div className="bg-[#1e1710] rounded-2xl p-4 border border-amber-500/15 flex flex-col gap-3">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Seasonal Insights</span>
                    <h4 className="text-xs font-black text-stone-200 mt-0.5">{seasonalAnalysis.seasonName}</h4>
                  </div>
                  <div className="p-1 px-2.5 bg-amber-500/10 text-amber-400 rounded-lg text-[9px] font-extrabold uppercase select-none tracking-wider border border-amber-500/10 animate-pulse">
                    Live Analyzer
                  </div>
                </div>

                <p className="text-[10px] text-stone-300 leading-relaxed font-sans mt-0.5">
                  {seasonalAnalysis.seasonDescription}
                </p>

                <div className="bg-black/25 rounded-xl p-2.5 border border-[#372d24] mt-1 flex flex-col gap-1">
                  <span className="text-[9px] text-[#cca571] uppercase font-bold tracking-wider font-mono">Peak Moving Categories</span>
                  <div className="flex gap-1.5 flex-wrap mt-0.5">
                    {seasonalAnalysis.typicalMovingCategories.map(cat => (
                      <span key={cat} className="text-[9px] bg-[#cca571]/10 text-[#d3b48b] px-2 py-0.5 rounded font-black border border-[#cca571]/20">
                        {cat}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="text-[9.5px] text-stone-400 bg-black/40 p-2.5 rounded-xl leading-relaxed mt-1 flex gap-2 items-start font-mono border border-stone-800">
                  <Sparkles size={13} className="text-amber-500 shrink-0 mt-0.5 animate-pulse" />
                  <div>
                    <span className="font-bold text-stone-300 uppercase block mb-0.5">Stock recommendations</span>
                    {seasonalAnalysis.stockAlertRecommendation}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* E. TERMINAL CONFIGURATION & SETTINGS */}
          {activeTab === "settings" && (
            <div className="flex-1 flex flex-col p-4 gap-4 animate-fadeIn">
              <h1 className="text-xl font-bold text-white">System Settings</h1>

              {/* Form editing variables */}
              <div className="bg-[#1a1a1a] rounded-2xl p-4 border border-[#2d2d2d] flex flex-col gap-3.5">
                <span className="text-xs text-stone-400 font-bold flex items-center gap-1">
                  <Settings size={13} className="text-stone-400" />
                  M3 BUSINESS STATIONS CONFIG
                </span>

                <div className="flex flex-col gap-2">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] uppercase text-stone-500 font-bold pl-1">Store / Shop Name</label>
                    <input
                      type="text"
                      className="bg-[#242424] border border-[#333] rounded-xl px-3 py-2 text-stone-100 text-xs focus:outline-none focus:border-stone-500"
                      value={settings.shopName}
                      onChange={(e) => setSettings({...settings, shopName: e.target.value})}
                    />
                  </div>
                  
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] uppercase text-stone-500 font-bold pl-1">Address Location</label>
                    <input
                      type="text"
                      className="bg-[#242424] border border-[#333] rounded-xl px-3 py-2 text-stone-200 text-xs focus:outline-none"
                      value={settings.shopAddress}
                      onChange={(e) => setSettings({...settings, shopAddress: e.target.value})}
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] uppercase text-stone-500 font-bold pl-1">UPI Address string</label>
                    <input
                      type="text"
                      className="bg-[#242424] border border-[#333] rounded-xl px-3 py-2 text-stone-200 text-xs focus:outline-none"
                      value={settings.upiId}
                      onChange={(e) => setSettings({...settings, upiId: e.target.value})}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] uppercase text-stone-500 font-bold pl-1">GST Tax Rate (%)</label>
                      <input
                        type="text"
                        className="bg-[#242424] border border-[#333] rounded-xl px-3 py-2 text-stone-200 text-xs focus:outline-none"
                        value={settings.gstRate}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === "" || !isNaN(Number(val))) setSettings({...settings, gstRate: parseFloat(val) || 0});
                        }}
                      />
                    </div>
                    
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] uppercase text-stone-500 font-bold pl-1">Currency Symbol</label>
                      <input
                        type="text"
                        className="bg-[#242424] border border-[#333] rounded-xl px-3 py-2 text-stone-200 text-xs focus:outline-none"
                        value={settings.currency}
                        onChange={(e) => setSettings({...settings, currency: e.target.value})}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Category Management Block */}
              <div className="bg-[#1a1a1a] rounded-2xl p-4 border border-[#2d2d2d] flex flex-col gap-3.5">
                <span className="text-xs text-stone-300 font-bold flex items-center gap-1.5 uppercase tracking-wide">
                  <Tag size={13} className="text-amber-500" />
                  Product Categories
                </span>
                
                <div className="flex flex-col gap-2.5">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Enter new category name..."
                      className="flex-1 bg-[#242424] border border-[#333] rounded-xl px-3 py-2 text-stone-100 text-xs focus:outline-none focus:border-stone-500 placeholder-stone-600"
                      value={newCategoryInput}
                      onChange={(e) => setNewCategoryInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handleAddCategory();
                        }
                      }}
                    />
                    <button
                      onClick={handleAddCategory}
                      className="bg-amber-500 hover:bg-amber-600 text-stone-900 px-3.5 rounded-xl text-xs font-black transition flex items-center gap-1 cursor-pointer active:scale-95 shadow"
                    >
                      <Plus size={13} />
                      <span>Add</span>
                    </button>
                  </div>

                  {/* List of categories with easy deletion */}
                  <div className="flex flex-wrap gap-1.5 mt-1 max-h-32 overflow-y-auto pr-1 style-scroll">
                    {categories.map(cat => (
                      <div 
                        key={cat} 
                        className="flex items-center gap-2 bg-[#232323] border border-[#2d2d2d] rounded-xl pl-3 py-1 pr-1.5 text-xs text-stone-300 hover:border-stone-500 transition"
                      >
                        <span className="font-medium select-none">{cat}</span>
                        <button
                          onClick={() => handleRemoveCategory(cat)}
                          className="text-stone-500 hover:text-red-400 p-0.5 rounded-lg hover:bg-stone-800 transition cursor-pointer"
                          title={`Delete ${cat}`}
                        >
                          <X size={11} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Offline Backups and Snapshots Block */}
              <div className="bg-[#1a1a1a] rounded-2xl p-4 border border-[#2d2d2d] flex flex-col gap-3.5">
                <span className="text-xs text-stone-300 font-bold flex items-center gap-1.5 uppercase tracking-wide">
                  <Download size={13} className="text-emerald-400" />
                  Sync & Data Snapshots
                </span>
                <p className="text-[10px] text-stone-500 leading-relaxed -mt-1.5">
                  Download offline spreadsheets of your terminal's business state anytime.
                </p>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={handleDownloadStockCsv}
                    className="bg-[#242424] hover:bg-stone-800 border border-[#333] hover:border-amber-500/30 text-stone-200 py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 shadow-sm"
                  >
                    <Package size={13} className="text-amber-500" />
                    <span>Download Stock</span>
                  </button>
                  
                  <button
                    onClick={handleDownloadSalesCsv}
                    className="bg-[#242424] hover:bg-stone-800 border border-[#333] hover:border-emerald-500/30 text-stone-200 py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 shadow-sm"
                  >
                    <Receipt size={13} className="text-emerald-500" />
                    <span>Download Sales</span>
                  </button>
                </div>
              </div>

              {/* Developer Environment parameters list */}
              <div className="bg-[#1a1a1a]/40 border border-[#242424] rounded-2xl p-3.5 flex flex-col gap-1.5 font-mono text-[10px] text-stone-500 mt-2">
                <span className="text-stone-400 font-black tracking-widest text-[9px] uppercase">Local Environment</span>
                <div>• Platform: SQLite (Android Room Database mapping Ready)</div>
                <div>• Coroutines state framework: Flow architecture enabled</div>
                <div>• Jetpack Compose Material 3 components used and logged</div>
              </div>
            </div>
          )}

        </div>

        {/* 3. High-Fidelity Jetpack Compose Styled Bottom Navbar */}
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-[#0f0f0f] border-t border-[#232323] px-3 py-2 flex items-center justify-between z-30">
          {[
            { id: 'billing', icon: ShoppingBag, label: "Billing" },
            { id: 'inventory', icon: Package, label: "Stock" },
            { id: 'khata', icon: BookOpen, label: "Khata" },
            { id: 'reports', icon: BarChart3, label: "Charts" },
            { id: 'settings', icon: Settings, label: "Settings" }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as any);
                  setActiveKhataCustomer(null);
                  setSettlementSummary(null);
                }}
                className="flex-1 flex flex-col items-center justify-center p-1.5 gap-1 focus:outline-none group relative cursor-pointer"
              >
                {/* Active M3 Material Pill Overlay */}
                <div className={`absolute inset-x-2 py-3.5 rounded-full -z-10 transition duration-300 ${isActive ? 'bg-amber-500/10' : 'bg-transparent'}`}></div>
                
                <Icon 
                  size={18} 
                  className={`transition duration-200 ${isActive ? 'text-amber-400 scale-110' : 'text-stone-400 group-hover:text-stone-200'}`} 
                />
                <span className={`text-[9px] transition font-bold ${isActive ? 'text-amber-400 font-extrabold' : 'text-stone-500 group-hover:text-stone-300'}`}>
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>

      </div>

      {/* ========================================== */}
      {/* 4. DIALOG MODAL LAYOUTS INTERACTIVE FLOWS */}
      {/* ========================================== */}
      
      {/* DIALOG A: CHECKOUT CONTROLLER SHEETS OVERLAY */}
      <AnimatePresence>
        {isCheckoutOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/80 flex items-end justify-center z-50 p-4"
          >
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="bg-[#161616] border border-[#2d2d2d] rounded-t-3xl w-full p-4 flex flex-col gap-4 max-h-[580px] overflow-y-auto"
            >
              <div className="flex justify-between items-center border-b border-[#2d2d2d] pb-2.5">
                <span className="text-xs text-stone-300 font-bold uppercase select-none">BILL SECURE GATEWAY</span>
                <button 
                  onClick={() => setIsCheckoutOpen(false)}
                  className="text-stone-400 p-1 hover:bg-stone-800 rounded-lg"
                >
                  <X size={15} />
                </button>
              </div>

              {/* Total display segment */}
              <div className="text-center bg-[#202020] p-4 rounded-2xl border border-[#2e2e2e]">
                <p className="text-xs text-stone-500">PAYABLE AMOUNT (GRAND TOTAL)</p>
                <p className="text-3xl font-black text-amber-400 tracking-wide font-mono mt-1 select-all">{settings.currency}{cartGrandTotal}</p>
                <p className="text-[10px] text-stone-400 mt-1 select-none">Including GST Tax calculation parameters</p>
              </div>

              {/* Method choice Tabs */}
              <div className="flex bg-[#232323] p-1.5 rounded-xl border border-[#2e2e2e] text-xs">
                {[
                  { id: 'CASH', label: 'Cash Payment', color: 'text-amber-400' },
                  { id: 'UPI', label: 'UPI QR Codes', color: 'text-emerald-400' },
                  { id: 'KHATA', label: 'Khata Credit', color: 'text-purple-400' }
                ].map(m => (
                  <button
                    key={m.id}
                    onClick={() => {
                      setPaymentMethod(m.id as any);
                      if (m.id === 'KHATA' && !selectedCustomerId && customers.length > 0) {
                        setSelectedCustomerId(customers[0].cid);
                      }
                    }}
                    className={`flex-1 py-1.5 text-center font-bold rounded-lg transition ${paymentMethod === m.id ? 'bg-[#181818] text-white ' + m.color : 'text-stone-400'}`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>

              {/* Dynamic subfields per method */}
              <div className="flex-1">
                {paymentMethod === 'CASH' && (
                  <div className="flex flex-col gap-2.5 animate-fadeIn">
                    <label className="text-[10px] text-stone-500 uppercase tracking-widest pl-1 font-bold">Input Cash Paid Amount</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Received bill value"
                        className="flex-1 bg-[#222] border border-[#2e2e2e] focus:border-stone-500 outline-none text-amber-400 font-extrabold text-base rounded-xl px-3 py-2"
                        value={cashReceived}
                        onChange={(e) => setCashReceived(e.target.value)}
                      />
                      <button 
                        onClick={() => setCashReceived(cartGrandTotal.toString())}
                        className="text-xs bg-[#2a2a2a] hover:bg-[#333] px-3.5 rounded-xl text-stone-300 font-bold border border-[#2e2e2e]"
                      >
                        Exact
                      </button>
                    </div>

                    {/* Quick values keys */}
                    <div className="grid grid-cols-3 gap-2">
                      {[100, 200, 500].map(val => (
                        <button
                          key={val}
                          onClick={() => {
                            const prev = parseFloat(cashReceived) || 0;
                            setCashReceived((prev + val).toString());
                          }}
                          className="bg-[#1f1f1f] hover:bg-stone-800 text-xs text-stone-300 py-2 rounded-xl transition border border-[#2d2d2d] font-mono"
                        >
                          +{val}
                        </button>
                      ))}
                    </div>

                    {/* Retaining changes computation */}
                    {parseFloat(cashReceived) >= cartGrandTotal && (
                      <div className="flex justify-between items-center text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl px-3.5 py-3 font-mono mt-1">
                        <span>Balance Refund Due</span>
                        <span className="font-extrabold text-base">
                          {settings.currency}{(parseFloat(cashReceived) - cartGrandTotal)}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {paymentMethod === 'UPI' && (
                  <div className="flex flex-col items-center gap-3.5 text-center p-3 animate-fadeIn">
                    {/* Generates high fidelity mockup vector drawing of a UPI dynamic payment QR */}
                    <div className="p-3.5 bg-white rounded-3xl shadow-xl flex flex-col items-center border border-white">
                      <QrCode size={135} className="text-stone-900" />
                      <span className="text-[9px] text-[#097969] uppercase font-black tracking-widest mt-2 font-mono">Dynamic BHIM UPI QR</span>
                    </div>
                    <div>
                      <p className="text-xs text-stone-300 font-black">Scan using GPay, PhonePe, Paytm</p>
                      <p className="text-[10px] text-stone-500 font-mono mt-0.5 mt-1 sm:mt-0">{settings.upiId}</p>
                    </div>
                  </div>
                )}

                {paymentMethod === 'KHATA' && (
                  <div className="flex flex-col gap-3 animate-fadeIn">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] text-stone-500 uppercase tracking-widest pl-1 font-bold">Select Repaying Creditor Client</label>
                      <select
                        className="bg-[#222] text-xs text-stone-300 outline-none border border-[#2d2d2d] py-2 px-3 rounded-xl w-full"
                        value={selectedCustomerId || ""}
                        onChange={(e) => setSelectedCustomerId(parseInt(e.target.value))}
                      >
                        {customers.map(c => (
                          <option key={c.cid} value={c.cid}>{c.name} (Outstanding Due)</option>
                        ))}
                      </select>
                    </div>

                    <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 p-3.5 rounded-xl text-[11px] flex items-start gap-2 select-all leading-relaxed">
                      <AlertTriangle size={15} className="shrink-0 mt-0.5" />
                      <div>
                        This transaction value of <strong className="font-bold">{settings.currency}{cartGrandTotal}</strong> will be added as outstanding debt on the customer ledger profile.
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom confirmation submit */}
              <button
                onClick={handleCheckoutSubmit}
                className="w-full bg-amber-500 hover:bg-amber-600 text-stone-900 py-3 rounded-2xl text-xs font-black tracking-widest uppercase transition tracking-wider text-center"
              >
                COMPLETE TRANSACTION & SAVE
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* DIALOG B: OUTSTANDING SAVED THERMAL RECEIPTS VIEW SHEETS OVERLAY */}
      <AnimatePresence>
        {currentReceipt && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white text-stone-900 rounded-3xl w-full max-w-[320px] p-5 flex flex-col gap-4 font-mono select-all shadow-2xl relative"
            >
              {/* Radial receipt design effects */}
              <div className="absolute -left-3 top-1/2 w-6 h-6 rounded-full bg-stone-950"></div>
              <div className="absolute -right-3 top-1/2 w-6 h-6 rounded-full bg-stone-950"></div>

              <div className="text-center pb-2 border-b border-dashed border-stone-300">
                <Receipt className="mx-auto text-amber-500 mb-1" size={24} />
                <h3 className="font-black text-sm uppercase">{settings.shopName}</h3>
                <p className="text-[10px] text-stone-500 mt-1 uppercase max-w-[200px] mx-auto leading-relaxed">{settings.shopAddress}</p>
                <p className="text-[10px] text-stone-400 mt-2">BILL: #{currentReceipt.bill.billNo}</p>
              </div>

              <div className="flex flex-col gap-2.5 text-xs border-b border-dashed border-stone-300 pb-3">
                <div className="flex justify-between items-center text-[10px] text-stone-500">
                  <span>DATE: {currentReceipt.bill.date}</span>
                  <span>{currentReceipt.bill.time}</span>
                </div>
                <div className="flex justify-between items-center text-[10px] text-stone-500">
                  <span>CLIENT: {currentReceipt.bill.customerName || "Walk-in Guest"}</span>
                  <span className="font-black text-stone-900 uppercase">{currentReceipt.bill.paymentMethod}</span>
                </div>

                <div className="flex flex-col gap-1.5 mt-1 border-t border-dashed border-stone-200 pt-2 font-black select-none">
                  {currentReceipt.items.map(bi => (
                    <div key={bi.id} className="flex justify-between text-[11px] text-stone-800">
                      <span>{bi.productName.substring(0,18)} x{bi.quantity}</span>
                      <span>{settings.currency}{bi.amount}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-1 text-xs text-right pr-1">
                {currentReceipt.bill.discount > 0 && (
                  <div className="flex justify-between text-stone-500 text-[10px]">
                    <span>Discount Deducted</span>
                    <span>-{settings.currency}{currentReceipt.bill.discount}</span>
                  </div>
                )}
                <div className="flex justify-between text-stone-900 font-extrabold text-sm pt-1 uppercase">
                  <span>Payable Clean Total</span>
                  <span>{settings.currency}{currentReceipt.bill.total}</span>
                </div>
                
                {currentReceipt.changeDue !== undefined && (
                  <div className="flex justify-between text-emerald-600 text-[10px] font-bold border-t border-dashed border-stone-200 mt-15 pt-1.5">
                    <span>Balance Refund Cash</span>
                    <span>{settings.currency}{currentReceipt.changeDue}</span>
                  </div>
                )}
              </div>

              <div className="text-center pt-2.5 border-t border-dashed border-stone-300">
                <p className="text-[10px] text-stone-400 uppercase font-bold tracking-widest leading-relaxed">Thank you • Visit again</p>
                <p className="text-[8px] text-stone-400 mt-1 font-mono">Digital Invoice processed by Antigravity Android Framework</p>
              </div>

              <button
                onClick={() => setCurrentReceipt(null)}
                className="w-full bg-stone-900 hover:bg-stone-800 text-white font-bold py-2.5 rounded-xl text-xs transition uppercase select-none mt-1"
              >
                Close Receipt
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* DIALOG NEW: SELECT QUANTITY FOR CART */}
      <AnimatePresence>
        {selectedProduct && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#181818] border border-[#2d2d2d] rounded-3xl w-full max-w-[310px] p-5 flex flex-col gap-4 font-sans select-none"
            >
              <div className="flex justify-between items-center border-b border-[#2d2d2d] pb-2">
                <span className="text-xs text-stone-300 font-bold uppercase select-none flex items-center gap-1.5 truncate pr-1">
                  <ShoppingBag size={14} className="text-amber-500 shrink-0" />
                  ADD TO BASKET
                </span>
                <button 
                  onClick={() => {
                    setSelectedProduct(null);
                    setQtyInput(1);
                  }}
                  className="text-stone-400 p-1 hover:bg-stone-800 rounded-lg shrink-0"
                >
                  <X size={15} />
                </button>
              </div>

              <div>
                <h3 className="text-sm font-black text-stone-100">{selectedProduct.name}</h3>
                <p className="text-[11px] text-stone-400 mt-1 capitalize">
                  Category: {selectedProduct.category} • {settings.currency}{selectedProduct.price} per Unit
                </p>
                <div className="mt-2 text-[10px] text-stone-500 font-mono">
                  Available Stock: {selectedProduct.stock} Units
                </div>
              </div>

              <div className="flex flex-col gap-2 bg-[#202020] p-3 rounded-2xl border border-[#2d2d2d]">
                <label className="text-[9px] uppercase font-bold text-stone-500 text-center block">Enter Quantity</label>
                <div className="flex items-center justify-center gap-3">
                  <button
                    onClick={() => setQtyInput(prev => Math.max(1, prev - 1))}
                    className="w-9 h-9 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 font-bold text-lg flex items-center justify-center border border-[#333] transition"
                  >
                    <Minus size={15} />
                  </button>
                  <input
                    type="text"
                    className="w-16 bg-[#1a1a1a] text-amber-400 font-extrabold text-base text-center border border-[#333] py-1.5 rounded-xl focus:outline-none"
                    value={qtyInput}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === "") {
                        setQtyInput(0);
                      } else {
                        const parsed = parseInt(val);
                        if (!isNaN(parsed)) {
                          setQtyInput(Math.min(selectedProduct.stock, Math.max(0, parsed)));
                        }
                      }
                    }}
                  />
                  <button
                    onClick={() => setQtyInput(prev => Math.min(selectedProduct.stock, prev + 1))}
                    className="w-9 h-9 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 font-bold text-lg flex items-center justify-center border border-[#333] transition"
                  >
                    <Plus size={15} />
                  </button>
                </div>
                {qtyInput > selectedProduct.stock && (
                  <p className="text-[9px] text-red-400 text-center font-bold">Limit: Only {selectedProduct.stock} units available</p>
                )}
              </div>

              <div className="flex justify-between items-center text-xs bg-[#1e1e1e] p-2.5 rounded-xl border border-[#2d2d2d] font-mono mt-1">
                <span className="text-stone-400">Calculated Subtotal:</span>
                <span className="text-emerald-400 font-extrabold text-sm">
                  {settings.currency}{(selectedProduct.price * qtyInput)}
                </span>
              </div>

              <button
                disabled={qtyInput <= 0 || qtyInput > selectedProduct.stock}
                onClick={handleAddProductToCart}
                className="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-40 disabled:hover:bg-amber-500 text-stone-900 py-2.5 rounded-xl text-xs font-black transition tracking-wider select-none uppercase mt-1 cursor-pointer"
              >
                Add To Basket
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* DIALOG C: ADD / REGISTER NEW CLIENT GUEST */}
      <AnimatePresence>
        {isAddCustomerOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#181818] border border-[#2d2d2d] rounded-3xl w-full max-w-[310px] p-5 flex flex-col gap-4 font-sans select-none"
            >
              <div className="flex justify-between items-center border-b border-[#2d2d2d] pb-2">
                <span className="text-xs text-stone-300 font-bold uppercase select-none flex items-center gap-1.5">
                  <UserPlus size={14} className="text-amber-500" />
                  REGISTER CLIENT
                </span>
                <button 
                  onClick={() => setIsAddCustomerOpen(false)}
                  className="text-stone-400 p-1 hover:bg-stone-800 rounded-lg"
                >
                  <X size={15} />
                </button>
              </div>

              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] uppercase font-bold text-stone-500">FullName Name</label>
                  <input
                    type="text"
                    className="bg-[#242424] border border-[#333] rounded-xl px-3 py-2 text-stone-100 text-xs focus:outline-none focus:border-stone-500"
                    placeholder="Enter Name"
                    value={custFormName}
                    onChange={(e) => setCustFormName(e.target.value)}
                  />
                </div>
                
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] uppercase font-bold text-stone-500">Phone / Telephone</label>
                  <input
                    type="text"
                    className="bg-[#242424] border border-[#333] rounded-xl px-3 py-2 text-stone-100 text-xs focus:outline-none focus:border-stone-500"
                    placeholder="Enter Mobile string"
                    value={custFormPhone}
                    onChange={(e) => setCustFormPhone(e.target.value)}
                  />
                </div>
              </div>

              <button
                onClick={handleAddCustomerSubmit}
                className="w-full bg-amber-500 hover:bg-amber-600 text-stone-900 py-2.5 rounded-xl text-xs font-black transition tracking-wider select-none uppercase mt-1"
              >
                Register Record
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* DIALOG D: SPECIFIC CUSTOMER KHATA REPAYMENTS */}
      <AnimatePresence>
        {isRepayOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#181818] border border-[#2d2d2d] rounded-3xl w-full max-w-[310px] p-5 flex flex-col gap-4 font-sans select-none"
            >
              <div className="flex justify-between items-center border-b border-[#2d2d2d] pb-2">
                <span className="text-xs text-stone-300 font-bold uppercase select-none flex items-center gap-1.5">
                  <Coins size={14} className="text-emerald-500" />
                  REPAYMENT LEDGER
                </span>
                <button 
                  onClick={() => setIsRepayOpen(false)}
                  className="text-stone-400 p-1 hover:bg-stone-800 rounded-lg"
                >
                  <X size={15} />
                </button>
              </div>

              <div className="text-center bg-[#202020] p-3.5 rounded-2xl border border-[#2e2e2e]">
                <p className="text-[10px] text-stone-500">TOTAL REMAINING DEBTIOR DEBT</p>
                <p className="text-2xl font-black text-amber-400 font-mono mt-1">{settings.currency}{customerTotalDue}</p>
              </div>

              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] uppercase font-bold text-stone-500">Cash Received Repaid amount</label>
                  <input
                    type="text"
                    className="bg-[#242424] border border-[#333] rounded-xl px-3 py-2 text-emerald-400 font-bold text-sm focus:outline-none"
                    placeholder="Enter value"
                    value={repayCashInput}
                    onChange={(e) => setRepayCashInput(e.target.value)}
                  />
                </div>
                
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] uppercase font-bold text-stone-500">Accounting Note (optional)</label>
                  <input
                    type="text"
                    className="bg-[#242424] border border-[#333] rounded-xl px-3 py-2 text-stone-100 text-xs focus:outline-none"
                    placeholder="e.g. Paid cash at shop checkout counters"
                    value={repayNote}
                    onChange={(e) => setRepayNote(e.target.value)}
                  />
                </div>
              </div>

              <button
                onClick={handleProcessRepayment}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-stone-900 py-2.5 rounded-xl text-xs font-black transition tracking-wider uppercase select-none"
              >
                PROSESS SETTLEMENT STATS
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* DIALOG E: KOTLIN SETTLEMENT ENGINE SIMULATOR SUMMARY LOG REPORT */}
      <AnimatePresence>
        {settlementSummary && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#1c1c1c] border border-[#2e2e2e] rounded-3xl w-full max-w-[310px] p-5 flex flex-col gap-4 font-mono select-none shadow-2xl"
            >
              <div className="text-center pb-2 border-b border-[#2d2d2d]">
                <CheckCircle2 className="mx-auto text-emerald-400 mb-2" size={32} />
                <h3 className="font-extrabold text-xs text-emerald-400 uppercase tracking-widest">TRANSACTION RESULTS</h3>
                <p className="text-[9px] text-stone-500 mt-1">SettleEngine Kotlin/Room Thread Safe Log</p>
              </div>

              <div className="flex flex-col gap-2.5 text-xs text-stone-300 font-bold select-all leading-relaxed">
                <div className="flex justify-between border-b border-[#2a2a2a] pb-1.5">
                  <span className="text-stone-500 font-bold">Repaid Deposited:</span>
                  <span className="text-stone-100">{settings.currency}{settlementSummary.cashPaid}</span>
                </div>
                <div className="flex justify-between border-b border-[#2a2a2a] pb-1.5">
                  <span className="text-stone-500 font-bold">Fully Cleared:</span>
                  <span className="text-stone-100">{settlementSummary.billsCleared} Bills</span>
                </div>
                <div className="flex justify-between border-b border-[#2a2a2a] pb-1.5">
                  <span className="text-stone-500 font-bold">Partially Cleared:</span>
                  <span className="text-stone-100">{settlementSummary.billsPartially} Bills</span>
                </div>
                <div className="flex justify-between border-b border-[#2a2a2a] pb-1.5">
                  <span className="text-stone-400 font-semibold font-sans">Remaining Due Debt:</span>
                  <span className="text-amber-400">{settings.currency}{settlementSummary.remaining}</span>
                </div>
                <div className="flex justify-between items-center bg-[#292929]/50 border border-emerald-500/10 rounded-xl px-2.5 py-1.5 mt-0.5 font-sans justify-between">
                  <span className="text-[10px] text-emerald-400 font-extrabold font-mono select-none">LEFT OVER ADVANCE</span>
                  <span className="text-[#097969] text-xs font-black font-mono">{settings.currency}{settlementSummary.refundedCredit}</span>
                </div>
              </div>

              <button
                onClick={() => setSettlementSummary(null)}
                className="w-full bg-stone-800 hover:bg-stone-700 text-white font-extrabold py-2 rounded-xl text-xs uppercase select-none mt-1"
              >
                Accept Ledger Logs
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* DIALOG F: DELETE PRODUCT CONFIRMATION MODAL */}
      <AnimatePresence>
        {productToDelete && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#181818] border border-[#2d2d2d] rounded-3xl w-full max-w-[310px] p-5 flex flex-col gap-4 font-sans select-none shadow-2xl"
            >
              <div className="flex justify-between items-center border-b border-[#2d2d2d] pb-2">
                <span className="text-xs text-red-400 font-bold uppercase select-none flex items-center gap-1.5">
                  <Trash2 size={14} className="text-red-400" />
                  DELETE PRODUCT
                </span>
                <button 
                  onClick={() => setProductToDelete(null)}
                  className="text-stone-400 p-1 hover:bg-stone-800 rounded-lg cursor-pointer"
                >
                  <X size={15} />
                </button>
              </div>

              <div className="flex flex-col gap-2">
                <p className="text-xs text-stone-200">
                  Are you sure you want to delete <span className="font-bold text-white">"{productToDelete.name}"</span>?
                </p>
                <p className="text-[10px] text-stone-400 leading-relaxed">
                  This action will remove the item from active stock catalog. Historical sales log entries will be preserved.
                </p>
              </div>

              <div className="flex gap-2 mt-1">
                <button
                  onClick={() => setProductToDelete(null)}
                  className="flex-1 bg-stone-800 hover:bg-stone-700 text-stone-300 py-2 rounded-xl text-xs font-bold transition select-none cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteProduct}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded-xl text-xs font-black transition select-none uppercase cursor-pointer"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
