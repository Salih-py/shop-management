package com.msc.shopmgmt

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import com.msc.shopmgmt.data.*
import com.msc.shopmgmt.ui.screens.*
import kotlinx.coroutines.launch

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        val db = ShopDatabase.getDatabase(this)
        val shopDao = db.shopDao()
        val settlementDao = db.khataSettlementDao()

        setContent {
            var activeTab by remember { mutableStateOf("billing") }
            var shopName by remember { mutableStateOf("MSC Digitized Shop") }
            var currencySymbol by remember { mutableStateOf("₹") }
            
            val coroutineScope = rememberCoroutineScope()

            // Observe Flow flows from SQLite database
            val products by shopDao.getAllProducts().collectAsState(initial = emptyList())
            val customers by shopDao.getAllCustomers().collectAsState(initial = emptyList())
            val bills by shopDao.getAllBills().collectAsState(initial = emptyList())
            val billItems by shopDao.getAllBillItems().collectAsState(initial = emptyList())
            val khataDues by shopDao.getAllKhataDues().collectAsState(initial = emptyList())
            val khataPayments by shopDao.getAllKhataPayments().collectAsState(initial = emptyList())
            val khataCredits by shopDao.getAllKhataCredits().collectAsState(initial = emptyList())

            // Pre-seed baseline data on launch if database is empty
            LaunchedEffect(products.isEmpty()) {
                if (products.isEmpty()) {
                    coroutineScope.launch {
                        // Insert products
                        shopDao.insertProduct(ProductEntity(name = "Basmati Rice Premium 5kg", category = "Groceries", costPrice = 320.0, price = 410.0, stock = 42.0, reorderLevel = 10.0))
                        shopDao.insertProduct(ProductEntity(name = " टाटा Active Iodine Salt 1kg", category = "Groceries", costPrice = 20.0, price = 28.0, stock = 125.0, reorderLevel = 15.0))
                        shopDao.insertProduct(ProductEntity(name = "Gold Winner Sunflower Oil 1L", category = "Oils", costPrice = 115.0, price = 145.0, stock = 8.0, reorderLevel = 12.0)) // low stock
                        shopDao.insertProduct(ProductEntity(name = "Amul Butter Blocks 100g", category = "Dairy", costPrice = 42.0, price = 54.0, stock = 6.0, reorderLevel = 10.0)) // low stock
                        shopDao.insertProduct(ProductEntity(name = "Brooke Bond Red Label Tea 250g", category = "Beverages", costPrice = 90.0, price = 120.0, stock = 30.0, reorderLevel = 5.0))
                        
                        // Insert customer accounts
                        shopDao.insertCustomer(CustomerEntity(name = "Dinesh Kumar", phone = "9876543210", totalSpent = 840.0, visitCount = 4))
                        shopDao.insertCustomer(CustomerEntity(name = "Ananya Sen", phone = "9123456780", totalSpent = 1250.0, visitCount = 6))
                        shopDao.insertCustomer(CustomerEntity(name = "Mohammad Tariq", phone = "8877665544", totalSpent = 0.0, visitCount = 0))
                    }
                }
            }

            Surface(
                modifier = Modifier.fillMaxSize(),
                color = MaterialTheme.colorScheme.background
            ) {
                Scaffold(
                    bottomBar = {
                        NavigationBar {
                            NavigationBarItem(
                                selected = activeTab == "billing",
                                onClick = { activeTab = "billing" },
                                icon = { Icon(Icons.Default.ShoppingCart, contentDescription = "POS Billing") },
                                label = { Text("Billing", fontWeight = FontWeight.Bold) }
                            )
                            NavigationBarItem(
                                selected = activeTab == "inventory",
                                onClick = { activeTab = "inventory" },
                                icon = { Icon(Icons.Default.List, contentDescription = "Inventory catalog") },
                                label = { Text("Inventory", fontWeight = FontWeight.Bold) }
                            )
                            NavigationBarItem(
                                selected = activeTab == "khata",
                                onClick = { activeTab = "khata" },
                                icon = { Icon(Icons.Default.AccountBox, contentDescription = "Khata ledger") },
                                label = { Text("Khata", fontWeight = FontWeight.Bold) }
                            )
                            NavigationBarItem(
                                selected = activeTab == "reports",
                                onClick = { activeTab = "reports" },
                                icon = { Icon(Icons.Default.Star, contentDescription = "Reports") },
                                label = { Text("Reports", fontWeight = FontWeight.Bold) }
                            )
                            NavigationBarItem(
                                selected = activeTab == "settings",
                                onClick = { activeTab = "settings" },
                                icon = { Icon(Icons.Default.Settings, contentDescription = "App Settings") },
                                label = { Text("Settings", fontWeight = FontWeight.Bold) }
                            )
                        }
                    }
                ) { innerPadding ->
                    Box(modifier = Modifier.padding(innerPadding)) {
                        when (activeTab) {
                            "billing" -> {
                                JetpackBillingScreen(
                                    products = products,
                                    customers = customers,
                                    currencySymbol = currencySymbol,
                                    onCheckoutSubmitted = { total, discount, customerId, paymentMethod, items ->
                                        coroutineScope.launch {
                                            // 1. Insert primary Bill entry
                                            val billNo = shopDao.insertBill(
                                                BillEntity(
                                                    customerId = customerId,
                                                    total = total,
                                                    discount = discount,
                                                    paymentMethod = paymentMethod,
                                                    date = java.text.SimpleDateFormat("yyyy-MM-dd", java.util.Locale.getDefault()).format(java.util.Date()),
                                                    time = java.text.SimpleDateFormat("hh:mm a", java.util.Locale.getDefault()).format(java.util.Date())
                                                )
                                            )

                                            // 2. Map basket into BillItems
                                            val savedBillItems = items.map { item ->
                                                BillItemEntity(
                                                    billNo = billNo,
                                                    productId = item.productId,
                                                    productName = item.productName,
                                                    quantity = item.qty,
                                                    price = item.priceAtSale,
                                                    amount = item.qty * item.priceAtSale,
                                                    costPrice = item.costAtSale,
                                                    profit = (item.qty * item.priceAtSale) - (item.qty * item.costAtSale)
                                                )
                                            }
                                            shopDao.insertBillItems(savedBillItems)

                                            // 3. Subtract stock counts
                                            items.forEach { item ->
                                                shopDao.deductStock(item.productId, item.qty)
                                            }

                                            // 4. In case of customer linked - upgrade visits
                                            if (customerId != null) {
                                                shopDao.updateCustomerLoyalty(customerId, total)

                                                // If Khata credit checkout selected
                                                if (paymentMethod == "KHATA") {
                                                    shopDao.insertKhataDue(
                                                        KhataDueEntity(
                                                            customerId = customerId,
                                                            billNo = billNo,
                                                            amountDue = total,
                                                            amountPaid = 0.0,
                                                            dateAdded = java.text.SimpleDateFormat("yyyy-MM-dd", java.util.Locale.getDefault()).format(java.util.Date()),
                                                            status = "pending"
                                                        )
                                                    )
                                                }
                                            }
                                        }
                                    },
                                    onAddNewCustomer = { name, phone ->
                                        coroutineScope.launch {
                                            shopDao.insertCustomer(CustomerEntity(name = name, phone = phone))
                                        }
                                    }
                                )
                            }
                            "inventory" -> {
                                JetpackInventoryScreen(
                                    products = products,
                                    currencySymbol = currencySymbol,
                                    onProductSaved = { product ->
                                        coroutineScope.launch {
                                            shopDao.insertProduct(product)
                                        }
                                    },
                                    onProductDeleted = { pid ->
                                        coroutineScope.launch {
                                            shopDao.deleteProduct(pid)
                                        }
                                    }
                                )
                            }
                            "khata" -> {
                                SimpleKhataScreen(
                                    customers = customers,
                                    dues = khataDues,
                                    payments = khataPayments,
                                    credits = khataCredits,
                                    currencySymbol = currencySymbol,
                                    onRepaymentSubmit = { customerId, amount, note ->
                                        coroutineScope.launch {
                                            // Execute oldest first transaction settle algorithm in DB thread
                                            settlementDao.settleKhataTransaction(customerId, amount, note)
                                        }
                                    },
                                    onAddNewCustomer = { name, phone ->
                                        coroutineScope.launch {
                                            shopDao.insertCustomer(CustomerEntity(name = name, phone = phone))
                                        }
                                    }
                                )
                            }
                            "reports" -> {
                                JetpackReportsScreen(
                                    bills = bills,
                                    billItems = billItems,
                                    products = products,
                                    currencySymbol = currencySymbol
                                )
                            }
                            "settings" -> {
                                JetpackSettingsScreen(
                                    currentShopName = shopName,
                                    currentCurrency = currencySymbol,
                                    onSettingsChanged = { name, symbol ->
                                        shopName = name
                                        currencySymbol = symbol
                                    },
                                    onResetDatabase = {
                                        coroutineScope.launch {
                                            db.clearAllTables()
                                            
                                            // Re-inject sample catalog
                                            shopDao.insertProduct(ProductEntity(name = "Basmati Rice Premium 5kg", category = "Groceries", costPrice = 320.0, price = 410.0, stock = 42.0, reorderLevel = 10.0))
                                            shopDao.insertProduct(ProductEntity(name = " टाटा Active Iodine Salt 1kg", category = "Groceries", costPrice = 20.0, price = 28.0, stock = 125.0, reorderLevel = 15.0))
                                            shopDao.insertProduct(ProductEntity(name = "Gold Winner Sunflower Oil 1L", category = "Oils", costPrice = 115.0, price = 145.0, stock = 8.0, reorderLevel = 12.0))
                                            shopDao.insertProduct(ProductEntity(name = "Amul Butter Blocks 100g", category = "Dairy", costPrice = 42.0, price = 54.0, stock = 6.0, reorderLevel = 10.0))
                                            shopDao.insertProduct(ProductEntity(name = "Brooke Bond Red Label Tea 250g", category = "Beverages", costPrice = 90.0, price = 120.0, stock = 30.0, reorderLevel = 5.0))
                                            
                                            shopDao.insertCustomer(CustomerEntity(name = "Dinesh Kumar", phone = "9876543210", totalSpent = 840.0, visitCount = 4))
                                            shopDao.insertCustomer(CustomerEntity(name = "Ananya Sen", phone = "9123456780", totalSpent = 1250.0, visitCount = 6))
                                            shopDao.insertCustomer(CustomerEntity(name = "Mohammad Tariq", phone = "8877665544", totalSpent = 0.0, visitCount = 0))
                                        }
                                    }
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}
