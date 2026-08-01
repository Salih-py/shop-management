/**
 * @license
 * SPDX-License-Identifier: Apache-2.5
 */

import React, { useState } from "react";
import { 
  Compass, 
  Smartphone, 
  Laptop, 
  BookOpen, 
  Cpu, 
  Info, 
  FileCode, 
  Sparkles,
  Award,
  AlertCircle
} from "lucide-react";
import { 
  Product, 
  Customer, 
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
} from "./types";
import AndroidSimulator from "./components/AndroidSimulator";
import KotlinWorkbench from "./components/KotlinWorkbench";
import UsbInstaller from "./components/UsbInstaller";

export default function App() {
  const [layoutMode, setLayoutMode] = useState<'split' | 'phone' | 'usb'>('split');

  // Central Application States synchronized with the Android phone previewer
  const [settings, setSettings] = useState<ShopSettings>(INITIAL_SETTINGS);
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [customers, setCustomers] = useState<Customer[]>(INITIAL_CUSTOMERS);
  const [bills, setBills] = useState<Bill[]>(INITIAL_BILLS);
  const [billItems, setBillItems] = useState<BillItem[]>(INITIAL_BILL_ITEMS);
  const [khataDues, setKhataDues] = useState<KhataDue[]>(INITIAL_KHATA_DUES);
  const [khataPayments, setKhataPayments] = useState<KhataPayment[]>(INITIAL_KHATA_PAYMENTS);
  const [khataCredits, setKhataCredits] = useState<KhataCredit[]>(INITIAL_KHATA_CREDITS);

  return (
    <div className="min-h-screen bg-[#0c0c0c] text-stone-100 p-4 sm:p-6 lg:p-8 flex flex-col gap-6 selection:bg-amber-500/25">
      
      {/* 1. Header Banner styled to Editorial Technical theme */}
      <header className="max-w-7xl mx-auto w-full flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-stone-800 pb-5 shrink-0">
        <div>
          <div className="flex items-center gap-2 mb-1.5 shrink-0 select-none">
            <span className="text-[10px] bg-amber-500/15 border border-amber-500/30 text-amber-400 font-extrabold tracking-widest px-2.5 py-1 rounded">
              MSCSC02C11 PROJECT WORKBENCH
            </span>
            <span className="text-[10px] bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 font-extrabold tracking-wider px-2 py-1 rounded">
              SEMESTER-II
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
            Shop Digitizer Kotlin Migration Suite
          </h1>
          <p className="text-xs text-stone-400 max-w-xl mt-1 leading-relaxed">
            MSc Computer Science Project Conversion workspace. Real-time Android Material 3 Design prototype and Jetpack Compose / Room SQLite DB architecture compiler mapper.
          </p>
        </div>

        {/* Viewport View selector controls */}
        <div className="flex bg-[#141414] p-1 rounded-xl border border-[#2d2d2d] text-xs">
          <button
            onClick={() => setLayoutMode('split')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg font-bold transition ${layoutMode === 'split' ? 'bg-amber-500 text-stone-950 font-black' : 'text-stone-400 hover:text-stone-200'}`}
          >
            <Laptop size={14} />
            <span>Developer Split View</span>
          </button>
          
          <button
            onClick={() => setLayoutMode('phone')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg font-bold transition ${layoutMode === 'phone' ? 'bg-amber-500 text-stone-950 font-black' : 'text-stone-400 hover:text-stone-200'}`}
          >
            <Smartphone size={14} />
            <span>Interactive Phone View</span>
          </button>

          <button
            onClick={() => setLayoutMode('usb')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg font-bold transition ${layoutMode === 'usb' ? 'bg-amber-500 text-stone-950 font-black' : 'text-stone-400 hover:text-stone-200'}`}
          >
            <Cpu size={14} />
            <span>Install on Device (USB)</span>
          </button>
        </div>
      </header>

      {/* 2. Primary layout board viewport */}
      <main className="max-w-7xl mx-auto w-full flex-1 flex flex-col lg:flex-row items-center lg:items-stretch justify-center gap-6 min-h-0 select-none">
        
        {/* Left widget column: High-Fidelity Android Pixel Phone Frame */}
        <div className="shrink-0 flex items-center justify-center p-2 rounded-[56px] border border-[#2a2a2a] bg-[#111] shadow-[inset_0_2px_12px_rgba(255,255,255,0.03)] select-none">
          <AndroidSimulator 
            settings={settings}
            setSettings={setSettings}
            products={products}
            setProducts={setProducts}
            customers={customers}
            setCustomers={setCustomers}
            bills={bills}
            setBills={setBills}
            billItems={billItems}
            setBillItems={setBillItems}
            khataDues={khataDues}
            setKhataDues={setKhataDues}
            khataPayments={khataPayments}
            setKhataPayments={setKhataPayments}
            khataCredits={khataCredits}
            setKhataCredits={setKhataCredits}
          />
        </div>

        {/* Right widget column: Kotlin Workbench file manager or USB Installer */}
        {layoutMode === 'split' && (
          <div className="flex-1 w-full lg:w-0 flex flex-col h-[780px]">
            <KotlinWorkbench />
          </div>
        )}

        {layoutMode === 'usb' && (
          <div className="flex-1 w-full lg:w-0 flex flex-col h-[780px]">
            <UsbInstaller />
          </div>
        )}

      </main>

      {/* 3. Global Information warning strip banner */}
      <footer className="max-w-7xl mx-auto w-full mt-2 bg-[#121212] border border-[#242424] p-4 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-3 text-xs text-stone-400 select-none">
        <div className="flex items-center gap-2">
          <AlertCircle size={15} className="text-amber-500 animate-pulse" />
          <span>
            <strong>SettleEngine Active:</strong> Try settling dues in "Khata" tab. It loops oldest bills first, processes partial sums, and tracks advance excess credit!
          </span>
        </div>
        <div className="flex items-center gap-2 text-stone-500 shrink-0">
          <span>Unified Room SQLite & Jetpack Compose Framework</span>
        </div>
      </footer>

    </div>
  );
}
