import sqlite3
import datetime
from datetime import datetime as dt
import tkinter as tk
from tkinter import ttk, messagebox

# =====================================================================
# 1. DATABASE INITS & SCHEMAS
# =====================================================================
def init_db():
    conn = sqlite3.connect("shop_index.db")
    cur = conn.cursor()
    
    # Products table (using M3 standard specification)
    cur.execute("""
        CREATE TABLE IF NOT EXISTS products (
            pid INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL,
            category TEXT NOT NULL,
            cost_price REAL NOT NULL,
            price REAL NOT NULL,
            stock REAL NOT NULL,
            reorder_level REAL NOT NULL DEFAULT 10.0
        )
    """)
    
    # Customers (Khata) table
    cur.execute("""
        CREATE TABLE IF NOT EXISTS customers (
            cid INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            phone TEXT UNIQUE NOT NULL,
            total_spent REAL DEFAULT 0.0,
            visit_count INTEGER DEFAULT 0
        )
    """)
    
    # Bills Master
    cur.execute("""
        CREATE TABLE IF NOT EXISTS bills (
            bill_no INTEGER PRIMARY KEY AUTOINCREMENT,
            customer_id INTEGER,
            total REAL NOT NULL,
            discount REAL DEFAULT 0.0,
            payment_method TEXT NOT NULL,
            date TEXT NOT NULL,
            time TEXT NOT NULL,
            FOREIGN KEY(customer_id) REFERENCES customers(cid)
        )
    """)
    
    # Bill Items
    cur.execute("""
        CREATE TABLE IF NOT EXISTS bill_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            bill_no INTEGER NOT NULL,
            product_id INTEGER NOT NULL,
            product_name TEXT NOT NULL,
            quantity REAL NOT NULL,
            price REAL NOT NULL,
            amount REAL NOT NULL,
            cost_price REAL NOT NULL,
            profit REAL NOT NULL,
            FOREIGN KEY(bill_no) REFERENCES bills(bill_no),
            FOREIGN KEY(product_id) REFERENCES products(pid)
        )
    """)

    # Prepopulate default catalog if database is empty
    cur.execute("SELECT COUNT(*) FROM products")
    if cur.fetchone()[0] == 0:
        default_items = [
            ("Amul Fresh Milk 1L", "Diary", 58.00, 64.00, 45.0, 10.0),
            ("Fortune Sunflower Oil 1L", "Oils", 112.00, 135.00, 32.0, 8.0),
            ("Aashirvaad Atta 5kg", "Groceries", 215.00, 245.00, 18.0, 5.0),
            ("Tata Salt Premium", "Groceries", 22.00, 28.00, 50.0, 12.0),
            ("Cadbury Dairy Milk 100g", "Snacks", 75.00, 90.00, 60.0, 15.0),
            ("Coca-Cola Can 330ml", "Beverages", 32.00, 40.00, 80.0, 20.0),
            ("Surf Excel Liquid 1L", "Household", 190.00, 220.00, 12.0, 4.0),
        ]
        cur.executemany("INSERT INTO products (name, category, cost_price, price, stock, reorder_level) VALUES (?, ?, ?, ?, ?, ?)", default_items)

    # Prepopulate default customers if empty
    cur.execute("SELECT COUNT(*) FROM customers")
    if cur.fetchone()[0] == 0:
        default_custs = [
            ("Mhd Salih", "9876543210", 840.00, 3),
            ("Asha Nair", "8465920192", 210.00, 1),
            ("Justin Paul", "7012948291", 0.00, 0),
        ]
        cur.executemany("INSERT INTO customers (name, phone, total_spent, visit_count) VALUES (?, ?, ?, ?)", default_custs)
        
    conn.commit()
    conn.close()

# =====================================================================
# 2. MAIN APPLICATION DESKTOP INTERFACE
# =====================================================================
class ShopManagementApp(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("Shop Management System (Python Desktop Suite)")
        self.geometry("1000x680")
        self.configure(bg="#141414")
        
        # Style controls
        style = ttk.Style()
        style.theme_use("clam")
        
        # Color mapping overrides
        style.configure(".", background="#141414", foreground="#ffffff", fieldbackground="#1d1d1d")
        style.configure("TLabel", background="#141414", foreground="#ffffff", font=("Inter", 10))
        style.configure("Header.TLabel", background="#141414", foreground="#ffb300", font=("Inter", 13, "bold"))
        style.configure("TButton", background="#333", foreground="#fff", borderwidth=0, font=("Inter", 10, "bold"), padding=6)
        style.map("TButton", background=[("active", "#ffb300"), ("pressed", "#e09e00")], foreground=[("active", "#000")])
        
        self.cart = [] # Active cart storage
        self.active_customer_id = None
        
        self.init_ui()
        self.refresh_products_list()
        self.refresh_reports()

    def init_ui(self):
        # Header banner layout
        hdr_frame = tk.Frame(self, bg="#1a1a1a", height=60)
        hdr_frame.pack(fill=tk.X, side=tk.TOP)
        
        lbl_head = tk.Label(hdr_frame, text="SHOP DIGITIZER EXPERT DESKTOP MIGRATION SUITE", bg="#1a1a1a", fg="#ffb300", font=("JetBrains Mono", 12, "bold"))
        lbl_head.pack(pady=10, side=tk.LEFT, padx=15)
        
        lbl_info = tk.Label(hdr_frame, text="Python 3 / Sqlite3 Dual Engine Desktop Pro", bg="#1a1a1a", fg="#888", font=("Inter", 9))
        lbl_info.pack(pady=10, side=tk.RIGHT, padx=15)

        # Tab navigation container
        self.notebook = ttk.Notebook(self)
        self.notebook.pack(fill=tk.BOTH, expand=True, padx=10, pady=10)
        
        # Tab definitions
        self.tab_billing = tk.Frame(self.notebook, bg="#141414")
        self.tab_inventory = tk.Frame(self.notebook, bg="#141414")
        self.tab_khata = tk.Frame(self.notebook, bg="#141414")
        self.tab_reports = tk.Frame(self.notebook, bg="#141414")
        
        self.notebook.add(self.tab_billing, text="   1. Instant Billing Cashier   ")
        self.notebook.add(self.tab_inventory, text="   2. Stock & Catalog Control   ")
        self.notebook.add(self.tab_khata, text="   3. Khata Customer Book   ")
        self.notebook.add(self.tab_reports, text="   4. Sales analytics & Reports   ")
        
        self.build_billing_tab()
        self.build_inventory_tab()
        self.build_khata_tab()
        self.build_reports_tab()

    # =====================================================================
    # TAB 1: BILLING MODULE with interactive cart setup
    # =====================================================================
    def build_billing_tab(self):
        # Grid partitions
        self.tab_billing.columnconfigure(0, weight=1)
        self.tab_billing.columnconfigure(1, weight=1)
        
        # LEFT: Catalog Search and Selection
        left_p = tk.Frame(self.tab_billing, bg="#181818", bd=1, relief=tk.SOLID)
        left_p.grid(row=0, column=0, sticky="nsew", padx=5, pady=5)
        
        tk.Label(left_p, text="PRODUCT SELECTION & QUICK SEARCH", font=("Inter", 11, "bold"), fg="#ffb300", bg="#181818").pack(anchor="w", px=10, py=10)
        
        search_f = tk.Frame(left_p, bg="#181818")
        search_f.pack(fill=tk.X, padx=10, pady=2)
        tk.Label(search_f, text="Search Item Name:", bg="#181818", font=("Inter", 9)).pack(side=tk.LEFT)
        
        self.billing_search_var = tk.StringVar()
        self.billing_search_var.trace("w", lambda *args: self.filter_billing_products())
        search_ent = tk.Entry(search_f, textvariable=self.billing_search_var, bg="#2e2e2e", fg="#fff", insertbackground="white", font=("Inter", 10))
        search_ent.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=5)

        # Products catalog select Treeview
        columns = ("pid", "name", "category", "stock", "price")
        self.bill_prod_tree = ttk.Treeview(left_p, columns=columns, show="headings", height=12)
        self.bill_prod_tree.heading("pid", text="ID")
        self.bill_prod_tree.heading("name", text="Product Description")
        self.bill_prod_tree.heading("category", text="Category")
        self.bill_prod_tree.heading("stock", text="Stock")
        self.bill_prod_tree.heading("price", text="Retail Price")
        
        self.bill_prod_tree.column("pid", width=40, anchor="center")
        self.bill_prod_tree.column("name", width=180, anchor="w")
        self.bill_prod_tree.column("category", width=80, anchor="center")
        self.bill_prod_tree.column("stock", width=60, anchor="center")
        self.bill_prod_tree.column("price", width=70, anchor="e")
        self.bill_prod_tree.pack(fill=tk.BOTH, expand=True, padx=10, pady=5)

        add_f = tk.Frame(left_p, bg="#181818")
        add_f.pack(fill=tk.X, padx=10, pady=10)
        tk.Label(add_f, text="Purchase Quantity:", bg="#181818").pack(side=tk.LEFT)
        self.qty_ent = tk.Entry(add_f, width=8, bg="#2e2e2e", fg="#fff", insertbackground="white", justify="center")
        self.qty_ent.insert(0, "1")
        self.qty_ent.pack(side=tk.LEFT, padx=5)
        
        btn_add = ttk.Button(add_f, text="ADD TO SHOPPING CART", command=self.add_to_cart)
        btn_add.pack(side=tk.RIGHT, fill=tk.X, expand=True, padx=5)

        # RIGHT: Shopping Cart counter & checkouts
        right_p = tk.Frame(self.tab_billing, bg="#181818", bd=1, relief=tk.SOLID)
        right_p.grid(row=0, column=1, sticky="nsew", padx=5, pady=5)
        
        tk.Label(right_p, text="CUSTOMER BILLING INVOICE", font=("Inter", 11, "bold"), fg="#11b300", bg="#181818").pack(anchor="w", px=10, py=10)
        
        # Customer selector bar
        cust_f = tk.Frame(right_p, bg="#181818")
        cust_f.pack(fill=tk.X, padx=10, pady=5)
        tk.Label(cust_f, text="Select Customer Profile:", bg="#181818").pack(side=tk.LEFT)
        self.cust_combo = ttk.Combobox(cust_f, state="readonly", width=25)
        self.cust_combo.pack(side=tk.LEFT, padx=5, fill=tk.X, expand=True)
        self.refresh_customer_combos()
        
        # Active Cart content view list
        cart_cols = ("pid", "name", "qty", "price", "amount")
        self.cart_tree = ttk.Treeview(right_p, columns=cart_cols, show="headings", height=8)
        self.cart_tree.heading("pid", text="ID")
        self.cart_tree.heading("name", text="Product")
        self.cart_tree.heading("qty", text="Qty")
        self.cart_tree.heading("price", text="Price")
        self.cart_tree.heading("amount", text="Total")
        
        self.cart_tree.column("pid", width=45, anchor="center")
        self.cart_tree.column("name", width=160, anchor="w")
        self.cart_tree.column("qty", width=50, anchor="center")
        self.cart_tree.column("price", width=65, anchor="e")
        self.cart_tree.column("amount", width=70, anchor="e")
        self.cart_tree.pack(fill=tk.BOTH, expand=True, padx=10, pady=5)
        
        btn_rm = ttk.Button(right_p, text="Remove Selected Item", command=self.remove_cart_item)
        btn_rm.pack(anchor="e", padx=10, pady=5)

        # Totals calculation layout
        tot_f = tk.Frame(right_p, bg="#212121", p=10)
        tot_f.pack(fill=tk.X, padx=10, pady=5)
        
        calc_r1 = tk.Frame(tot_f, bg="#212121")
        calc_r1.pack(fill=tk.X, pady=2)
        tk.Label(calc_r1, text="Total Items Discount Amt (INR):", bg="#212121").pack(side=tk.LEFT)
        self.disc_ent = tk.Entry(calc_r1, width=10, bg="#333", fg="#fff", insertbackground="white")
        self.disc_ent.insert(0, "0")
        self.disc_ent.pack(side=tk.RIGHT)
        self.disc_ent.bind("<KeyRelease>", lambda e: self.update_bill_totals())

        calc_r2 = tk.Frame(tot_f, bg="#212121")
        calc_r2.pack(fill=tk.X, pady=4)
        self.lbl_subtot = tk.Label(calc_r2, text="Subtotal: ₹0.00", bg="#212121", font=("Inter", 9))
        self.lbl_subtot.pack(side=tk.LEFT)
        self.lbl_grandtot = tk.Label(calc_r2, text="Grand Total: ₹0.00", bg="#212121", fg="#ffb300", font=("Inter", 12, "bold"))
        self.lbl_grandtot.pack(side=tk.RIGHT)

        # Payment options & Checkout CTA 
        pay_f = tk.Frame(right_p, bg="#181818")
        pay_f.pack(fill=tk.X, padx=10, pady=10)
        tk.Label(pay_f, text="Payment Mode:", bg="#181818").pack(side=tk.LEFT)
        self.pay_mode = tk.StringVar(value="CASH")
        ttk.Radiobutton(pay_f, text="Cash", variable=self.pay_mode, value="CASH").pack(side=tk.LEFT, padx=10)
        ttk.Radiobutton(pay_f, text="UPI / QR", variable=self.pay_mode, value="UPI").pack(side=tk.LEFT, padx=10)
        ttk.Radiobutton(pay_f, text="Khata Balance", variable=self.pay_mode, value="KHATA").pack(side=tk.LEFT, padx=10)

        btn_checkout = tk.Button(right_p, text="PROCESS TRANSACTION CHECKOUT", bg="#ffb300", fg="#000", font=("Inter", 11, "bold"), bd=0, py=7, command=self.checkout)
        btn_checkout.pack(fill=tk.X, padx=10, pady=5)

    # =====================================================================
    # TAB 2: STOCK CONTROL (With Product Search & Smart Existing item Check merge)
    # =====================================================================
    def build_inventory_tab(self):
        # Main partition layouts
        self.tab_inventory.columnconfigure(0, weight=1)
        self.tab_inventory.columnconfigure(1, weight=2)
        
        # Form insert fields
        form_p = tk.Frame(self.tab_inventory, bg="#181818", bd=1, relief=tk.SOLID)
        form_p.grid(row=0, column=0, sticky="nsew", padx=5, pady=5)
        
        tk.Label(form_p, text="PRODUCT REGISTRY FORM", font=("Inter", 11, "bold"), fg="#ffb300", bg="#181818").pack(anchor="w", px=10, py=10)
        
        fields = [
            ("Item Name:", "name"),
            ("Category Segment:", "category"),
            ("Buying Price (INR):", "cost_price"),
            ("Selling Retail Price (INR):", "price"),
            ("Import Quantity Stock:", "stock"),
            ("Low Alert Limit:", "reorder_level")
        ]
        
        self.form_entries = {}
        for text, varname in fields:
            tk.Label(form_p, text=text, bg="#181818").pack(anchor="w", padx=10, pady=2)
            if varname == "category":
                ent = ttk.Combobox(form_p, values=["Groceries", "Household", "Oils", "Diary", "Beverages", "Spices", "Snacks"], state="normal")
            else:
                ent = tk.Entry(form_p, bg="#2e2e2e", fg="#fff", insertbackground="white")
            ent.pack(fill=tk.X, padx=10, pady=2)
            self.form_entries[varname] = ent
            
        self.form_entries["reorder_level"].insert(0, "10")

        # Visual info explaining update mandate
        note_p = tk.Frame(form_p, bg="#1e140a", bd=1, relief=tk.SOLID)
        note_p.pack(fill=tk.X, padx=10, pady=12)
        tk.Label(note_p, text="SMART SAVE PROTOCOL CHECK ACTIVE", font=("Inter", 9, "bold"), fg="#ffb300", bg="#1e140a").pack(anchor="w", px=5, py=2)
        tk.Label(note_p, text="Mandate Rule: If you add an existing product,\nthe application merges catalog entries by adding the\nimport quantity and replacing buying/retail rates.", fg="#ddd", bg="#1e140a", justify="left", font=("Inter", 8)).pack(anchor="w", px=5, py=2)

        btn_save = tk.Button(form_p, text="COMMIT CATALOG SAVE", bg="#ffb300", fg="#141414", font=("Inter", 10, "bold"), bd=0, py=6, command=self.save_product)
        btn_save.pack(fill=tk.X, padx=10, pady=10)

        # RIGHT: Global Stock inventory catalog list with search filter
        list_p = tk.Frame(self.tab_inventory, bg="#181818", bd=1, relief=tk.SOLID)
        list_p.grid(row=0, column=1, sticky="nsew", padx=5, pady=5)
        
        tk.Label(list_p, text="ACTIVE STOCK SHEET OPERATIONS", font=("Inter", 11, "bold"), fg="#ffb300", bg="#181818").pack(anchor="w", px=10, py=10)
        
        # Searching widget bar
        search_f = tk.Frame(list_p, bg="#181818")
        search_f.pack(fill=tk.X, padx=10, pady=2)
        tk.Label(search_f, text="Search Stock database:", fg="#ccc", bg="#181818").pack(side=tk.LEFT)
        
        self.inventory_search_var = tk.StringVar()
        self.inventory_search_var.trace("w", lambda *args: self.refresh_products_list())
        search_ent = tk.Entry(search_f, textvariable=self.inventory_search_var, bg="#2e2e2e", fg="#fff", insertbackground="white", font=("Inter", 10))
        search_ent.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=8)

        # Catalog tables Treeview
        cols = ("pid", "name", "category", "cost", "price", "stock", "reorder")
        self.prod_tree = ttk.Treeview(list_p, columns=cols, show="headings", height=15)
        self.prod_tree.heading("pid", text="ID")
        self.prod_tree.heading("name", text="Description")
        self.prod_tree.heading("category", text="Category")
        self.prod_tree.heading("cost", text="Cost")
        self.prod_tree.heading("price", text="Price")
        self.prod_tree.heading("stock", text="Stock")
        self.prod_tree.heading("reorder", text="Alert")
        
        self.prod_tree.column("pid", width=40, anchor="center")
        self.prod_tree.column("name", width=140, anchor="w")
        self.prod_tree.column("category", width=80, anchor="center")
        self.prod_tree.column("cost", width=55, anchor="e")
        self.prod_tree.column("price", width=55, anchor="e")
        self.prod_tree.column("stock", width=55, anchor="center")
        self.prod_tree.column("reorder", width=55, anchor="center")
        self.prod_tree.pack(fill=tk.BOTH, expand=True, padx=10, pady=5)
        
        btn_del = ttk.Button(list_p, text="Delete Selected Product Catalog Entry", command=self.delete_product)
        btn_del.pack(anchor="e", padx=10, pady=5)

    # =====================================================================
    # TAB 3: KHATA MANAGEMENT (Digitized Ledger with Strict Indian Mobile format)
    # =====================================================================
    def build_khata_tab(self):
        self.tab_khata.columnconfigure(0, weight=1)
        self.tab_khata.columnconfigure(1, weight=1)
        
        # LEFT: Cust addition & Info
        left_pf = tk.Frame(self.tab_khata, bg="#181818", bd=1, relief=tk.SOLID)
        left_pf.grid(row=0, column=0, sticky="nsew", padx=5, pady=5)
        
        tk.Label(left_pf, text="OPEN NEW KHATA LEDGER ACCOUNT", font=("Inter", 11, "bold"), fg="#ffb300", bg="#181818").pack(anchor="w", px=10, py=10)
        
        tk.Label(left_pf, text="Full Customer Name:", bg="#181818").pack(anchor="w", padx=10, pady=2)
        self.cust_name_ent = tk.Entry(left_pf, bg="#2e2e2e", fg="#fff", insertbackground="white")
        self.cust_name_ent.pack(fill=tk.X, padx=10, pady=2)
        
        tk.Label(left_pf, text="Indian Phone Number (10 Digits):", bg="#181818").pack(anchor="w", padx=10, pady=2)
        self.cust_phone_ent = tk.Entry(left_pf, bg="#2e2e2e", fg="#fff", insertbackground="white")
        self.cust_phone_ent.pack(fill=tk.X, padx=10, pady=2)
        
        # Security validation notification
        lbl_vld = tk.Label(left_pf, text="* Strict Validation: Phone number must contain precisely 10 numerical digits.\nStarting with standard Indian cellular ranges [6-9]. No letters allowed.", fg="#ff8a80", bg="#181818", justify="left")
        lbl_vld.pack(anchor="w", px=10, py=8)
        
        btn_add_c = ttk.Button(left_pf, text="CREATE KHATA REGISTRY", command=self.add_customer)
        btn_add_c.pack(fill=tk.X, padx=10, pady=8)

        # RIGHT: Customer accounts spreadsheet
        right_pf = tk.Frame(self.tab_khata, bg="#181818", bd=1, relief=tk.SOLID)
        right_pf.grid(row=0, column=1, sticky="nsew", padx=5, pady=5)
        
        tk.Label(right_pf, text="REGISTERED KHATA PASSBOOK HOLDERS", font=("Inter", 11, "bold"), fg="#ffb300", bg="#181818").pack(anchor="w", px=10, py=10)
        
        cols = ("cid", "name", "phone", "spent", "visits")
        self.cust_tree = ttk.Treeview(right_pf, columns=cols, show="headings", height=12)
        self.cust_tree.heading("cid", text="Profile ID")
        self.cust_tree.heading("name", text="User Name")
        self.cust_tree.heading("phone", text="Phone Number")
        self.cust_tree.heading("spent", text="Total spent")
        self.cust_tree.heading("visits", text="Visits")
        
        self.cust_tree.column("cid", width=60, anchor="center")
        self.cust_tree.column("name", width=140, anchor="w")
        self.cust_tree.column("phone", width=100, anchor="center")
        self.cust_tree.column("spent", width=80, anchor="e")
        self.cust_tree.column("visits", width=50, anchor="center")
        self.cust_tree.pack(fill=tk.BOTH, expand=True, padx=10, pady=5)

    # =====================================================================
    # TAB 4: ADVANCED SALES ANALYTICS & REPORTS 
    # =====================================================================
    def build_reports_tab(self):
        # Layout splits
        self.tab_reports.columnconfigure(0, weight=1)
        self.tab_reports.columnconfigure(1, weight=1)
        
        # Left Panel: Top Selling and Most Profitable lists
        left_rep = tk.Frame(self.tab_reports, bg="#181818", bd=1, relief=tk.SOLID)
        left_rep.grid(row=0, column=0, sticky="nsew", padx=5, pady=5)
        
        tk.Label(left_rep, text="PRODUCT LEADERBOARD & GAIN INDEX", font=("Inter", 11, "bold"), fg="#ffb300", bg="#181818").pack(anchor="w", px=10, py=10)
        
        # Tree high-seller
        tk.Label(left_rep, text="Most Selling Products (Sales Quantity):", font=("Inter", 9, "bold"), fg="#ffca28", bg="#181818").pack(anchor="w", px=10, py=2)
        self.tree_best_sell = ttk.Treeview(left_rep, columns=("name", "qty", "revenue"), show="headings", height=5)
        self.tree_best_sell.heading("name", text="Product Name")
        self.tree_best_sell.heading("qty", text="Quantity Sold")
        self.tree_best_sell.heading("revenue", text="Total Income")
        self.tree_best_sell.column("name", width=160)
        self.tree_best_sell.column("qty", width=80, anchor="center")
        self.tree_best_sell.column("revenue", width=80, anchor="e")
        self.tree_best_sell.pack(fill=tk.X, padx=10, pady=5)

        # Tree high-profit
        tk.Label(left_rep, text="Highest Profitable Products (Pre-Calculated Profit):", font=("Inter", 9, "bold"), fg="#00e676", bg="#181818").pack(anchor="w", px=10, py=8)
        self.tree_profitable = ttk.Treeview(left_rep, columns=("name", "qty", "profit"), show="headings", height=5)
        self.tree_profitable.heading("name", text="Product Name")
        self.tree_profitable.heading("qty", text="Quantity Sold")
        self.tree_profitable.heading("profit", text="Total Profit")
        self.tree_profitable.column("name", width=160)
        self.tree_profitable.column("qty", width=80, anchor="center")
        self.tree_profitable.column("profit", width=80, anchor="e")
        self.tree_profitable.pack(fill=tk.X, padx=10, pady=5)

        # Right Panel: Velocity and Seasonal analytics
        right_rep = tk.Frame(self.tab_reports, bg="#181818", bd=1, relief=tk.SOLID)
        right_rep.grid(row=0, column=1, sticky="nsew", padx=5, pady=5)
        
        tk.Label(right_rep, text="FAST MOVING CATEGORIES & SEASONAL DEMANDS", font=("Inter", 11, "bold"), fg="#ffb300", bg="#181818").pack(anchor="w", px=10, py=10)
        
        # Category Velocity view
        tk.Label(right_rep, text="Category Movement Velocity:", font=("Inter", 9, "bold"), fg="#33b5e5", bg="#181818").pack(anchor="w", px=10, py=2)
        self.tree_cat_vel = ttk.Treeview(right_rep, columns=("cat", "qty", "percent"), show="headings", height=5)
        self.tree_cat_vel.heading("cat", text="Category")
        self.tree_cat_vel.heading("qty", text="Quantity Sold")
        self.tree_cat_vel.heading("percent", text="Movement Velocity")
        self.tree_cat_vel.column("cat", width=130)
        self.tree_cat_vel.column("qty", width=90, anchor="center")
        self.tree_cat_vel.column("percent", width=100, anchor="center")
        self.tree_cat_vel.pack(fill=tk.X, padx=10, pady=5)

        # Seasonal Recommendation banner box
        lbl_seas_sec = tk.Label(right_rep, text="REAL-TIME SEASONAL ANALYSER PREDICTION", font=("Inter", 9, "bold"), fg="#ff9100", bg="#181818")
        lbl_seas_sec.pack(anchor="w", px=10, py=8)
        
        self.lbl_curr_month_tag = tk.Label(right_rep, text="Current Month Period:", font=("Inter", 10, "bold"), fg="#fff", bg="#2a1b10", anchor="w", justify="left")
        self.lbl_curr_month_tag.pack(fill=tk.X, padx=10, pady=2, ipady=4)
        
        self.lbl_curr_rec_info = tk.Label(right_rep, text="Calculating...", fg="#ddd", bg="#121212", font=("Inter", 9), justify="left", wraplength=400, anchor="nw")
        self.lbl_curr_rec_info.pack(fill=tk.BOTH, expand=True, padx=10, pady=5, ipady=6)

        btn_refresh_rep = ttk.Button(right_rep, text="REFRESH STATISTICAL REPORTS", command=self.refresh_reports)
        btn_refresh_rep.pack(fill=tk.X, padx=10, pady=10)

    # =====================================================================
    # DATA LAYER SYNCHRONIZATION RUNNERS
    # =====================================================================
    def filter_billing_products(self):
        q = self.billing_search_var.get().strip().lower()
        self.bill_prod_tree.delete(*self.bill_prod_tree.get_children())
        
        conn = sqlite3.connect("shop_index.db")
        cur = conn.cursor()
        if q:
            cur.execute("SELECT pid, name, category, stock, price FROM products WHERE name LIKE ? OR category LIKE ? ORDER BY name ASC", (f"%{q}%", f"%{q}%"))
        else:
            cur.execute("SELECT pid, name, category, stock, price FROM products ORDER BY name ASC")
        
        rows = cur.fetchall()
        for idx, row in enumerate(rows):
            is_low = row[3] <= 10.0
            tag = "lowstock" if is_low else "normal"
            self.bill_prod_tree.insert("", tk.END, values=row, tags=(tag,))
        self.bill_prod_tree.tag_configure("lowstock", foreground="#ff8a80")
        conn.close()

    def refresh_customer_combos(self):
        conn = sqlite3.connect("shop_index.db")
        cur = conn.cursor()
        cur.execute("SELECT cid, name FROM customers")
        rows = cur.fetchall()
        values = ["Walk-in Guest"] + [f"{row[0]} - {row[1]}" for row in rows]
        self.cust_combo["values"] = values
        self.cust_combo.current(0)
        conn.close()

    def refresh_products_list(self):
        q = self.inventory_search_var.get().strip().lower()
        self.prod_tree.delete(*self.prod_tree.get_children())
        
        conn = sqlite3.connect("shop_index.db")
        cur = conn.cursor()
        if q:
            cur.execute("SELECT pid, name, category, cost_price, price, stock, reorder_level FROM products WHERE name LIKE ? OR category LIKE ? OR pid = ?", (f"%{q}%", f"%{q}%", q))
        else:
            cur.execute("SELECT pid, name, category, cost_price, price, stock, reorder_level FROM products")
        
        for row in cur.fetchall():
            is_low = row[5] <= row[6]
            tag = "lowstock" if is_low else "normal"
            self.prod_tree.insert("", tk.END, values=row, tags=(tag,))
        self.prod_tree.tag_configure("lowstock", background="#3e1b1b", foreground="#ffb3b3")
        conn.close()
        self.filter_billing_products()

    def refresh_reports(self):
        conn = sqlite3.connect("shop_index.db")
        cur = conn.cursor()
        
        # 1. High seller
        cur.execute("""
            SELECT product_name, SUM(quantity) as qty, SUM(amount) as revenue 
            FROM bill_items 
            GROUP BY product_id 
            ORDER BY qty DESC LIMIT 5
        """)
        self.tree_best_sell.delete(*self.tree_best_sell.get_children())
        for row in cur.fetchall():
            self.tree_best_sell.insert("", tk.END, values=row)
            
        # 2. High Profitable
        cur.execute("""
            SELECT product_name, SUM(quantity) as qty, SUM(profit) as total_profit 
            FROM bill_items 
            GROUP BY product_id 
            ORDER BY total_profit DESC LIMIT 5
        """)
        self.tree_profitable.delete(*self.tree_profitable.get_children())
        for row in cur.fetchall():
            self.tree_profitable.insert("", tk.END, values=row)

        # 3. Category Velocity
        cur.execute("""
            SELECT p.category, SUM(i.quantity) as q, 0 
            FROM bill_items i 
            JOIN products p ON i.product_id = p.pid
            GROUP BY p.category
            ORDER BY q DESC
        """)
        cat_rows = cur.fetchall()
        total_q = sum(row[1] for row in cat_rows) or 1
        
        self.tree_cat_vel.delete(*self.tree_cat_vel.get_children())
        for row in cat_rows:
            percentage = f"{round((row[1]/total_q) * 100)} %"
            self.tree_cat_vel.insert("", tk.END, values=(row[0], row[1], percentage))

        # 4. Seasonal dynamic analyzer
        now_month = datetime.datetime.now().month
        recs = {
            "Summer Peak Period (Mar - Jun)": "Hydration surge predicted. Highly stock Beverages, instant juices & Dairy products (Ice creams, butter milk) which show over 2x buy loops in summer.",
            "Monsoon Period (Jul - Sep)": "Wet atmosphere locks dry flour bins. Fast moving Household needs, dry pulses and premium spices. Warm beverages like Masala Teas trending upward.",
            "Festive Peak Surge (Oct - Nov)": "Elevated shopping for Diwali & Dussehra holidays. Cooking Oils and raw spices are fast-moving segments. Reorder stock levels should be hiked by 30%.",
            "Winter Cozy Season (Dec - Feb)": "High calorific fat requirements. Snacking chips, dry tea masalas, and warm diary ghee blocks show 1.5x speed multiplier."
        }
        
        # Determine Period name
        if now_month in [3, 4, 5, 6]:
            curr_tag = "☀️ Summer Peak Period (Mar - Jun)"
            curr_rec = recs["Summer Peak Period (Mar - Jun)"]
        elif now_month in [7, 8, 9]:
            curr_tag = "🌧️ Monsoon Period (Jul - Sep)"
            curr_rec = recs["Monsoon Period (Jul - Sep)"]
        elif now_month in [10, 11]:
            curr_tag = "🪔 Festive Peak Surge (Oct - Nov)"
            curr_rec = recs["Festive Peak Surge (Oct - Nov)"]
        else:
            curr_tag = "❄️ Winter Cozy Season (Dec - Feb)"
            curr_rec = recs["Winter Cozy Season (Dec - Feb)"]
            
        self.lbl_curr_month_tag.config(text=f" ACTIVE PERIOD: {curr_tag}")
        self.lbl_curr_rec_info.config(text=curr_rec)
        
        # Refresh Customer Ledger tree
        cur.execute("SELECT cid, name, phone, total_spent, visit_count FROM customers")
        self.cust_tree.delete(*self.cust_tree.get_children())
        for row in cur.fetchall():
            self.cust_tree.insert("", tk.END, values=row)

        conn.close()

    # =====================================================================
    # ACTION EVENT HANDLERS
    # =====================================================================
    def add_to_cart(self):
        sel = self.bill_prod_tree.selection()
        if not sel:
            messagebox.showwarning("Form Selection", "Please click/select a product from the Catalog List.")
            return
            
        pid, name, cat, stock, price = self.bill_prod_tree.item(sel[0], "values")
        try:
            qty = float(self.qty_ent.get().strip())
        except ValueError:
            messagebox.showerror("Format Error", "Quantity must be a valid numeric value.")
            return
            
        if qty <= 0:
            messagebox.showerror("Error", "Quantity must be larger than zero!")
            return
            
        stock = float(stock)
        price = float(price)
        pid = int(pid)
        
        if qty > stock:
            messagebox.showwarning("Out of Stock", f"Only {stock} units are left in active catalog reservoir. Cannot add {qty}.")
            return
            
        self.cart.append({"pid": pid, "name": name, "qty": qty, "price": price})
        self.update_cart_tree()

    def remove_cart_item(self):
        sel = self.cart_tree.selection()
        if not sel:
            return
        idx = self.cart_tree.index(sel[0])
        del self.cart[idx]
        self.update_cart_tree()

    def update_cart_tree(self):
        self.cart_tree.delete(*self.cart_tree.get_children())
        for i in self.cart:
            amt = i["qty"] * i["price"]
            self.cart_tree.insert("", tk.END, values=(i["pid"], i["name"], i["qty"], i["price"], amt))
        self.update_bill_totals()

    def update_bill_totals(self):
        sub = sum(item["qty"] * item["price"] for item in self.cart)
        try:
            disc = float(self.disc_ent.get().strip() or "0")
        except ValueError:
            disc = 0.0
            
        grand = max(0.0, sub - disc)
        self.lbl_subtot.config(text=f"Subtotal: ₹{sub:.2f}")
        self.lbl_grandtot.config(text=f"Grand Total: ₹{grand:.2f}")

    def checkout(self):
        if not self.cart:
            messagebox.showwarning("Empty Invoice", "Bill checkout canceled because Shopping Cart is empty.")
            return
            
        # Extract Customer Details
        cust_str = self.cust_combo.get()
        cid = None
        customer_name = "Walk-in Guest"
        
        if cust_str != "Walk-in Guest":
            cid = int(cust_str.split(" - ")[0])
            customer_name = cust_str.split(" - ")[1]
            
        pm = self.pay_mode.get()
        sub = sum(item["qty"] * item["price"] for item in self.cart)
        
        try:
            disc = float(self.disc_ent.get().strip() or "0")
        except ValueError:
            disc = 0.0
            
        grand = max(0.0, sub - disc)
        
        conn = sqlite3.connect("shop_index.db")
        cur = conn.cursor()
        
        today_d = dt.now().strftime("%Y-%m-%d")
        today_t = dt.now().strftime("%I:%M %p")
        
        # Save invoice Master
        cur.execute("INSERT INTO bills (customer_id, total, discount, payment_method, date, time) VALUES (?, ?, ?, ?, ?, ?)",
                    (cid, grand, disc, pm, today_d, today_t))
        bill_no = cur.lastrowid
        
        # Process individual cart products, compute profits and deduct active stocks
        for item in self.cart:
            cur.execute("SELECT cost_price, price, stock FROM products WHERE pid = ?", (item["pid"],))
            cost, sl_price, curr_stock = cur.fetchone()
            
            item_total = item["qty"] * sl_price
            item_cost_sub = item["qty"] * cost
            item_profit = item_total - item_cost_sub
            
            # Save Bill list item
            cur.execute("""
                INSERT INTO bill_items (bill_no, product_id, product_name, quantity, price, amount, cost_price, profit)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (bill_no, item["pid"], item["name"], item["qty"], sl_price, item_total, cost, item_profit))
            
            # Stock deduction
            new_stock = curr_stock - item["qty"]
            cur.execute("UPDATE products SET stock = ? WHERE pid = ?", (new_stock, item["pid"]))
            
        # If registered Khata customer, increase metrics
        if cid:
            cur.execute("UPDATE customers SET total_spent = total_spent + ?, visit_count = visit_count + 1 WHERE cid = ?", (grand, cid))
            
        conn.commit()
        conn.close()
        
        self.cart = []
        self.update_cart_tree()
        self.disc_ent.delete(0, tk.END)
        self.disc_ent.insert(0, "0")
        
        messagebox.showinfo("Receipt Printed", f"Invoice #{bill_no} cleared successfully.\nMethod: {pm}\nAmount: ₹{grand:.2f}\nCustomer: {customer_name}")
        self.refresh_products_list()
        self.refresh_reports()

    def save_product(self):
        name = self.form_entries["name"].get().strip()
        cat = self.form_entries["category"].get().strip()
        
        if not name or not cat:
            messagebox.showwarning("Required Data", "Product Name and Category segments are strictly mandatory!")
            return
            
        try:
            cost = float(self.form_entries["cost_price"].get().strip())
            price = float(self.form_entries["price"].get().strip())
            add_stock = float(self.form_entries["stock"].get().strip())
            reorder = float(self.form_entries["reorder_level"].get().strip() or "10")
        except ValueError:
            messagebox.showerror("Data Format Error", "Price, Stock level and Reorder parameters must be numeric float types.")
            return

        conn = sqlite3.connect("shop_index.db")
        cur = conn.cursor()
        
        # Check duplicate item names to update existing products according to user instructions
        cur.execute("SELECT pid, stock FROM products WHERE LOWER(name) = ?", (name.lower(),))
        dup = cur.fetchone()
        
        if dup:
            pid, curr_stock = dup
            new_stock = curr_stock + add_stock
            cur.execute("""
                UPDATE products 
                SET category = ?, cost_price = ?, price = ?, stock = ?, reorder_level = ? 
                WHERE pid = ?
            """, (cat, cost, price, new_stock, reorder, pid))
            messagebox.showinfo("Catalog Merged", f"Product '{name}' already exists!\nDetails merged safely under ID: #{pid}.\nAdded +{add_stock} units to existing stock (New Stock: {new_stock} Units).")
        else:
            cur.execute("""
                INSERT INTO products (name, category, cost_price, price, stock, reorder_level)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (name, cat, cost, price, add_stock, reorder))
            messagebox.showinfo("Saved", f"Product '{name}' saved successfully as a new catalog listing.")
            
        conn.commit()
        conn.close()
        
        # Reset form fields
        self.form_entries["name"].delete(0, tk.END)
        self.form_entries["cost_price"].delete(0, tk.END)
        self.form_entries["price"].delete(0, tk.END)
        self.form_entries["stock"].delete(0, tk.END)
        
        self.refresh_products_list()

    def delete_product(self):
        sel = self.prod_tree.selection()
        if not sel:
            return
        pid, name = self.prod_tree.item(sel[0], "values")[:2]
        
        if messagebox.askyesno("Confirm Delete", f"Are you absolutely sure you want to delete Product '{name}' from catalog and billing memory?"):
            conn = sqlite3.connect("shop_index.db")
            cur = conn.cursor()
            cur.execute("DELETE FROM products WHERE pid = ?", (pid,))
            conn.commit()
            conn.close()
            self.refresh_products_list()

    def add_customer(self):
        name = self.cust_name_ent.get().strip()
        phone = self.cust_phone_ent.get().strip().replace(" ", "")
        
        if not name or not phone:
            messagebox.showwarning("Form alert", "Customer Name and Phone Number are mandatory parameter details.")
            return
            
        # Strictly Indian Mobile format (10 digit, starts 6-9)
        import re
        if not re.match(r"^[6-9]\d{9}$", phone):
            messagebox.showerror("Indian Phone Validator Error", "Invalid cellular phone format!\nPlease input a valid Indian 10-digit number starting with [6-9] without secondary text or prefixes.")
            return
            
        conn = sqlite3.connect("shop_index.db")
        cur = conn.cursor()
        try:
            cur.execute("INSERT INTO customers (name, phone) VALUES (?, ?)", (name, phone))
            conn.commit()
            messagebox.showinfo("Khata Account Opened", f"Account created successfully for {name}.\nMobile Phone linked: {phone}")
            self.cust_name_ent.delete(0, tk.END)
            self.cust_phone_ent.delete(0, tk.END)
            self.refresh_customer_combos()
            self.refresh_reports()
        except sqlite3.IntegrityError:
            messagebox.showerror("Error", "A Customer profile linked to this phone number already exists!")
        finally:
            conn.close()

# Start application loop on run
if __name__ == "__main__":
    init_db()
    app = ShopManagementApp()
    app.mainloop()
