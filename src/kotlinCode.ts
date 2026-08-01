/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Native Android Kotlin specifications and source structures.
 */

export const ANDROID_GRADLE_DEPENDS = `// =========================================================================
// App level dependency specifications and configurations inside settings.gradle.kts
// =========================================================================
pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}
dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
    }
}

// =========================================================================
// App level dependency parameters inside app/build.gradle.kts (Kotlin + Room + Jetpack Compose)
// =========================================================================
plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    id("kotlin-kapt") // Required for Room Database Annotation Compile-time Processor
}

dependencies {
    // Core Jetpack Compose Bom UI Kit & Material 3 components
    val composeBom = platform("androidx.compose:compose-bom:2024.11.00")
    implementation(composeBom)
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-graphics")
    implementation("androidx.compose.ui:ui-tooling-preview")
    implementation("androidx.compose.material3:material3") // Material Design 3
    implementation("androidx.activity:activity-compose:1.9.3")
    implementation("androidx.navigation:navigation-compose:2.8.4")

    // SQLite Room ORM Persistence Engine 
    val roomVersion = "2.6.1"
    implementation("androidx.room:room-runtime:$roomVersion")
    implementation("androidx.room:room-ktx:$roomVersion")
    kapt("androidx.room:room-compiler:$roomVersion")

    // Kotlin Coroutines for lightweight background workers and non-blocking IO threads
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.9.0")
    
    // Core zxing qr generator API (for billing receipt UPI integrations)
    implementation("com.google.zxing:core:3.5.3")
}
`;

export const ROOM_ENTITIES_CODE = `package com.msc.shopmgmt.data

import androidx.room.*

// =========================================================================
// 1. DATA MODELS AND SCHEMA DEFINITIONS (SQLite Table Schema Mapping)
// =========================================================================

@Entity(tableName = "products")
data class ProductEntity(
    @PrimaryKey(autoGenerate = true) val pid: Long = 0,
    @ColumnInfo(name = "name") val name: String,
    @ColumnInfo(name = "category") val category: String,
    @ColumnInfo(name = "cost_price") val costPrice: Double,
    @ColumnInfo(name = "price") val price: Double,
    @ColumnInfo(name = "stock") val stock: Double,
    @ColumnInfo(name = "reorder_level") val reorderLevel: Double = 10.0
)

@Entity(tableName = "customers")
data class CustomerEntity(
    @PrimaryKey(autoGenerate = true) val cid: Long = 0,
    @ColumnInfo(name = "name") val name: String,
    @ColumnInfo(name = "phone") val phone: String,
    @ColumnInfo(name = "total_spent") val totalSpent: Double = 0.0,
    @ColumnInfo(name = "visit_count") val visitCount: Int = 0
)

@Entity(tableName = "bills")
data class BillEntity(
    @PrimaryKey(autoGenerate = true) val billNo: Long = 0,
    @ColumnInfo(name = "customer_id") val customerId: Long?, // Nullable for normal walk-in clients 
    @ColumnInfo(name = "total") val total: Double,
    @ColumnInfo(name = "discount") val discount: Double = 0.0,
    @ColumnInfo(name = "payment_method") val paymentMethod: String, // CASH, UPI, KHATA
    @ColumnInfo(name = "date") val date: String, // format: YYYY-MM-DD
    @ColumnInfo(name = "time") val time: String  // format: HH:MM AM/PM
)

@Entity(tableName = "bill_items")
data class BillItemEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    @ColumnInfo(name = "bill_no") val billNo: Long,
    @ColumnInfo(name = "product_id") val productId: Long,
    @ColumnInfo(name = "product_name") val productName: String, // Denormalized for records safety
    @ColumnInfo(name = "quantity") val quantity: Double,
    @ColumnInfo(name = "price") val price: Double, // Locked price representation at the checkout point
    @ColumnInfo(name = "amount") val amount: Double,
    @ColumnInfo(name = "cost_price") val costPrice: Double, // Locked wholesale cost price to check profit accurately 
    @ColumnInfo(name = "profit") val profit: Double // Pre-calculated profit element
)

@Entity(tableName = "khata")
data class KhataDueEntity(
    @PrimaryKey(autoGenerate = true) val khataId: Long = 0,
    @ColumnInfo(name = "customer_id") val customerId: Long,
    @ColumnInfo(name = "bill_no") val billNo: Long,
    @ColumnInfo(name = "amount_due") val amountDue: Double,
    @ColumnInfo(name = "amount_paid") val amountPaid: Double = 0.0,
    @ColumnInfo(name = "date_added") val dateAdded: String,
    @ColumnInfo(name = "status") val status: String = "pending" // pending, partial, cleared
)

@Entity(tableName = "khata_payments")
data class KhataPaymentEntity(
    @PrimaryKey(autoGenerate = true) val paymentId: Long = 0,
    @ColumnInfo(name = "customer_id") val customerId: Long,
    @ColumnInfo(name = "amount_paid") val amountPaid: Double,
    @ColumnInfo(name = "payment_date") val paymentDate: String,
    @ColumnInfo(name = "note") val note: String
)

@Entity(tableName = "khata_credit")
data class KhataCreditEntity(
    @PrimaryKey val customerId: Long,
    @ColumnInfo(name = "credit_amount") val creditAmount: Double = 0.0,
    @ColumnInfo(name = "last_updated") val lastUpdated: String
)
`;

export const ROOM_DAO_CODE = `package com.msc.shopmgmt.data

import androidx.room.*
import kotlinx.coroutines.flow.Flow
import java.text.SimpleDateFormat
import java.util.*

// =========================================================================
// 2. SQLITE DATA ACCESS OBJECT INTERFACES (DAOs) WITH COROUTINES
// =========================================================================

@Dao
interface ShopDao {
    @Query("SELECT * FROM products ORDER BY name ASC")
    fun getAllProducts(): Flow<List<ProductEntity>>

    @Query("SELECT * FROM products WHERE stock <= reorder_level")
    fun getLowStockProducts(): Flow<List<ProductEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertProduct(product: ProductEntity): Long

    @Update
    suspend fun updateProduct(product: ProductEntity)

    @Query("UPDATE products SET stock = stock - :qty WHERE pid = :pid")
    suspend fun deductStock(pid: Long, qty: Double)

    @Query("SELECT * FROM customers")
    fun getAllCustomers(): Flow<List<CustomerEntity>>

    @Query("UPDATE customers SET total_spent = total_spent + :amount, visit_count = visit_count + 1 WHERE cid = :cid")
    suspend fun updateCustomerLoyalty(cid: Long, amount: Double)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertCustomer(customer: CustomerEntity): Long

    @Insert
    suspend fun insertBill(bill: BillEntity): Long

    @Insert
    suspend fun insertBillItems(items: List<BillItemEntity>)

    @Query("SELECT * FROM bills ORDER BY date DESC, time DESC")
    fun getAllBills(): Flow<List<BillEntity>>

    @Query("SELECT * FROM bill_items")
    fun getAllBillItems(): Flow<List<BillItemEntity>>

    @Query("SELECT * FROM khata")
    fun getAllKhataDues(): Flow<List<KhataDueEntity>>

    @Query("SELECT * FROM khata_payments ORDER BY payment_date DESC")
    fun getAllKhataPayments(): Flow<List<KhataPaymentEntity>>

    @Query("SELECT * FROM khata_credit")
    fun getAllKhataCredits(): Flow<List<KhataCreditEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertKhataDue(due: KhataDueEntity): Long

    @Query("DELETE FROM products WHERE pid = :pid")
    suspend fun deleteProduct(pid: Long)

    @Query("DELETE FROM customers WHERE cid = :cid")
    suspend fun deleteCustomer(cid: Long)
}

@Dao
interface KhataSettlementDao {

    @Query("SELECT COALESCE(credit_amount, 0.0) FROM khata_credit WHERE customerId = :cid")
    suspend fun getCustomerCredit(cid: Long): Double

    @Query("SELECT * FROM khata WHERE customer_id = :cid AND status != 'cleared' ORDER BY date_added ASC")
    suspend fun getUnclearedDues(cid: Long): List<KhataDueEntity>

    @Update
    suspend fun updateKhataDue(due: KhataDueEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun saveCredit(credit: KhataCreditEntity)

    @Insert
    suspend fun insertPaymentRecord(record: KhataPaymentEntity): Long

    // =========================================================================
    // CORE ALGORITHMIC TRANSLATION: FIFOS/OLDEST-FIRST TRANSACTION SETTLEMENT
    // =========================================================================
    @Transaction
    suspend fun settleKhataTransaction(customerId: Long, cashReceived: Double, note: String): SettleResult {
        val today = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(Date())
        
        // 1. Recover unspent credit cash on profile balance
        val existingCredit = getCustomerCredit(customerId)
        
        // 2. Pool incoming funds
        var remainingFunds = cashReceived + existingCredit
        val originalFunds = remainingFunds
        
        // 3. Scan uncleared debts strictly indexed oldest-first (FIFO)
        val dueBills = getUnclearedDues(customerId)
        var billsCleared = 0
        var billsPartiallyCleared = 0
        
        for (bill in dueBills) {
            val netDue = bill.amountDue - bill.amountPaid
            if (remainingFunds <= 0.0) break
            
            if (remainingFunds >= netDue) {
                // Total Settle
                val updatedBill = bill.copy(
                    amountPaid = bill.amountDue,
                    status = "cleared"
                )
                updateKhataDue(updatedBill)
                remainingFunds -= netDue
                billsCleared++
            } else {
                // Slice Settle
                val updatedBill = bill.copy(
                    amountPaid = bill.amountPaid + remainingFunds,
                    status = "partial"
                )
                updateKhataDue(updatedBill)
                remainingFunds = 0.0
                billsPartiallyCleared++
            }
        }
        
        // 4. If any balance remains left over, save as surplus credit advance
        val finalCredit = if (remainingFunds > 0.0) remainingFunds else 0.0
        saveCredit(KhataCreditEntity(customerId, finalCredit, today))
        
        // 5. Build payment transaction audit log row
        if (cashReceived > 0.0) {
            insertPaymentRecord(
                KhataPaymentEntity(
                    customerId = customerId,
                    amountPaid = cashReceived,
                    paymentDate = today,
                    note = note.ifBlank { "Khata manual repayment of ₹$cashReceived" }
                )
            )
        }
        
        return SettleResult(
            cashRepaid = cashReceived,
            billsCleared = billsCleared,
            billsPartiallyCleared = billsPartiallyCleared,
            remainingDue = dueBills.sumOf { it.amountDue - it.amountPaid } - (originalFunds - remainingFunds),
            leftoverStoreCredit = finalCredit
        )
    }
}

data class SettleResult(
    val cashRepaid: Double,
    val billsCleared: Int,
    val billsPartiallyCleared: Int,
    val remainingDue: Double,
    val leftoverStoreCredit: Double
)
`;

export const ROOM_DATABASE_CODE = `package com.msc.shopmgmt.data

import android.content.Context
import androidx.room.*

// =========================================================================
// 3. SQLITE PERSISTENT COMPILER DATABASE WRAPPER SINGLETON
// =========================================================================

@Database(
    entities = [
        ProductEntity::class,
        CustomerEntity::class,
        BillEntity::class,
        BillItemEntity::class,
        KhataDueEntity::class,
        KhataPaymentEntity::class,
        KhataCreditEntity::class
    ],
    version = 1,
    exportSchema = false
)
abstract class ShopDatabase : RoomDatabase() {
    abstract fun shopDao(): ShopDao
    abstract fun khataSettlementDao(): KhataSettlementDao

    companion object {
        @Volatile
        private var INSTANCE: ShopDatabase? = null

        fun getDatabase(context: Context): ShopDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    ShopDatabase::class.java,
                    "shop_database"
                )
                .fallbackToDestructiveMigration() // Automatic debug schema re-creation
                .build()
                INSTANCE = instance
                instance
            }
        }
    }
}
`;

export const NATIVE_BILLING_SCREEN = `package com.msc.shopmgmt.ui.screens

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import com.msc.shopmgmt.data.ProductEntity
import com.msc.shopmgmt.data.CustomerEntity

// =========================================================================
// MODULE 1: MODERN JETPACK COMPOSE POS TERMINAL & BILLING UI
// =========================================================================

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun JetpackBillingScreen(
    products: List<ProductEntity>,
    customers: List<CustomerEntity>,
    currencySymbol: String = "₹",
    onCheckoutSubmitted: (
        total: Double,
        discount: Double,
        customerId: Long?,
        paymentMethod: String,
        items: List<CartItem>
    ) -> Unit,
    onAddNewCustomer: (name: String, phone: String) -> Unit
) {
    var cartItems by remember { mutableStateOf(listOf<CartItem>()) }
    var searchQuery by remember { mutableStateOf("") }
    var discountInput by remember { mutableStateOf("0") }
    
    var selectedCustomerId by remember { mutableStateOf<Long?>(null) }
    var paymentMethod by remember { mutableStateOf("CASH") }
    var isCheckingOut by remember { mutableStateOf(false) }
    
    var showAddCustomerDialog by remember { mutableStateOf(false) }
    var newCustName by remember { mutableStateOf("") }
    var newCustPhone by remember { mutableStateOf("") }
    
    var showReceiptDialog by remember { mutableStateOf(false) }
    var lastCheckoutReceipt by remember { mutableStateOf<ReceiptSummary?>(null) }

    val filteredProducts = remember(searchQuery, products) {
        if (searchQuery.isBlank()) emptyList()
        else products.filter {
            it.name.contains(searchQuery, ignoreCase = true) ||
            it.category.contains(searchQuery, ignoreCase = true)
        }
    }

    val selectedCustomer = remember(selectedCustomerId, customers) {
        customers.find { it.cid == selectedCustomerId }
    }

    val subtotal = cartItems.sumOf { it.priceAtSale * it.qty }
    val discount = discountInput.toDoubleOrNull() ?: 0.0
    val total = if (subtotal - discount < 0.0) 0.0 else subtotal - discount

    Scaffold(
        topBar = {
            TopAppBar(
                title = { 
                    Column {
                        Text("POS Terminal", fontWeight = FontWeight.Bold)
                        Text("Mode: Active Store Desk", style = MaterialTheme.typography.bodySmall, color = Color.Gray)
                    }
                }
            )
        },
        floatingActionButton = {
            if (cartItems.isNotEmpty()) {
                ExtendedFloatingActionButton(
                    onClick = { isCheckingOut = true },
                    icon = { Icon(Icons.Default.ShoppingCart, contentDescription = "Checkout") },
                    text = { Text("Checkout ($currencySymbol\${String.format("%.2f", total)})") },
                    containerColor = MaterialTheme.colorScheme.primaryContainer,
                    contentColor = MaterialTheme.colorScheme.onPrimaryContainer
                )
            }
        }
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .padding(16.dp)
        ) {
            OutlinedTextField(
                value = searchQuery,
                onValueChange = { searchQuery = it },
                label = { Text("Scan or Search Products...") },
                placeholder = { Text("e.g. Rice, Oats, Oil") },
                leadingIcon = { Icon(Icons.Default.Search, contentDescription = "Scan") },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true
            )

            AnimatedVisibility(visible = filteredProducts.isNotEmpty()) {
                Card(
                    modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
                ) {
                    LazyColumn(modifier = Modifier.heightIn(max = 180.dp)) {
                        items(filteredProducts) { product ->
                            ListItem(
                                headlineContent = { Text(product.name, fontWeight = FontWeight.SemiBold) },
                                supportingContent = { Text("Qty SKU • Stock: \${product.stock}") },
                                trailingContent = { 
                                    Button(
                                        onClick = {
                                            val existing = cartItems.find { it.productId == product.pid }
                                            if (existing != null) {
                                                if (existing.qty + 1 <= product.stock) {
                                                    cartItems = cartItems.map {
                                                        if (it.productId == product.pid) it.copy(qty = it.qty + 1) else it
                                                    }
                                                }
                                            } else {
                                                if (product.stock >= 1) {
                                                    cartItems = cartItems + CartItem(
                                                        productId = product.pid,
                                                        productName = product.name,
                                                        qty = 1.0,
                                                        priceAtSale = product.price,
                                                        costAtSale = product.costPrice
                                                    )
                                                }
                                            }
                                            searchQuery = ""
                                        }
                                    ) {
                                        Text("+$currencySymbol\${product.price}")
                                    }
                                }
                            )
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.secondaryContainer.copy(alpha = 0.2f))
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth().padding(12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text("Bill To Customer:", style = MaterialTheme.typography.bodySmall, color = Color.Gray)
                        Text(selectedCustomer?.name ?: "Walk-in Guest Client", fontWeight = FontWeight.Bold)
                    }
                    Row {
                        IconButton(onClick = { showAddCustomerDialog = true }) {
                            Icon(Icons.Default.AddCircle, contentDescription = "Add", tint = MaterialTheme.colorScheme.primary)
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            LazyColumn(modifier = Modifier.weight(1f)) {
                items(cartItems) { item ->
                    Card(modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp)) {
                        Row(modifier = Modifier.padding(12.dp).fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            Column {
                                Text(item.productName, fontWeight = FontWeight.Bold)
                                Text("\${item.qty.toInt()} units x $currencySymbol\${item.priceAtSale}")
                            }
                            IconButton(onClick = { cartItems = cartItems.filter { it.productId != item.productId } }) {
                                Icon(Icons.Default.Delete, contentDescription = "Remove", tint = Color.Red)
                            }
                        }
                    }
                }
            }
        }
    }
}

data class CartItem(
    val productId: Long,
    val productName: String,
    val qty: Double,
    val priceAtSale: Double,
    val costAtSale: Double
)

data class ReceiptSummary(
    val items: List<CartItem>,
    val subtotal: Double,
    val discount: Double,
    val total: Double,
    val customerName: String,
    val paymentMethod: String
)
`;

export const NATIVE_INVENTORY_SCREEN = `package com.msc.shopmgmt.ui.screens

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.msc.shopmgmt.data.ProductEntity

// =========================================================================
// MODULE 2: SQLITE ROOM PERSISTED INVENTORY CATALOG COMPONENT
// =========================================================================

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun JetpackInventoryScreen(
    products: List<ProductEntity>,
    currencySymbol: String = "₹",
    onProductSaved: (ProductEntity) -> Unit,
    onProductDeleted: (Long) -> Unit
) {
    var searchQuery by remember { mutableStateOf("") }
    var selectedCategoryFilter by remember { mutableStateOf("All") }
    var showFormDialog by remember { mutableStateOf(false) }
    var editingProduct by remember { mutableStateOf<ProductEntity?>(null) }

    val filteredProducts = products.filter {
        val matchesSearch = it.name.contains(searchQuery, ignoreCase = true)
        val matchesCategory = selectedCategoryFilter == "All" || it.category == selectedCategoryFilter
        matchesSearch && matchesCategory
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Inventory Catalog", fontWeight = FontWeight.Bold) },
                actions = {
                    IconButton(onClick = { showFormDialog = true }) {
                        Icon(Icons.Default.Add, contentDescription = "Add SKU")
                    }
                }
            )
        }
    ) { innerPadding ->
        Column(modifier = Modifier.fillMaxSize().padding(innerPadding).padding(16.dp)) {
            OutlinedTextField(
                value = searchQuery,
                onValueChange = { searchQuery = it },
                label = { Text("Search catalog products...") },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true
            )

            Spacer(modifier = Modifier.height(16.dp))

            LazyColumn(modifier = Modifier.weight(1f)) {
                items(filteredProducts) { item ->
                    val isLowStock = item.stock <= item.reorderLevel
                    Card(
                        modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
                        colors = CardDefaults.cardColors(
                            containerColor = if (isLowStock) MaterialTheme.colorScheme.errorContainer.copy(alpha = 0.2f) else MaterialTheme.colorScheme.surface
                        )
                    ) {
                        Column(modifier = Modifier.padding(12.dp)) {
                            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                                Column {
                                    Text(item.name, fontWeight = FontWeight.Bold)
                                    Text("\${item.category} • Cost: $currencySymbol\${item.costPrice}", style = MaterialTheme.typography.bodySmall, color = Color.Gray)
                                }
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Text("$currencySymbol\${item.price}", color = MaterialTheme.colorScheme.primary, fontWeight = FontWeight.Bold)
                                    Spacer(modifier = Modifier.width(8.dp))
                                    IconButton(onClick = {
                                        editingProduct = item
                                        showFormDialog = true
                                    }) {
                                        Icon(Icons.Default.Edit, contentDescription = "Edit", tint = MaterialTheme.colorScheme.secondary)
                                    }
                                    IconButton(onClick = { onProductDeleted(item.pid) }) {
                                        Icon(Icons.Default.Delete, contentDescription = "Delete", tint = MaterialTheme.colorScheme.error)
                                    }
                                }
                            }
                            Spacer(modifier = Modifier.height(4.dp))
                            Text("Current Stock: \${item.stock.toInt()} units", color = if (isLowStock) Color.Red else Color.Gray)
                        }
                    }
                }
            }
        }
    }
}
`;

export const NATIVE_KHATA_SCREEN = `package com.msc.shopmgmt.ui.screens

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.msc.shopmgmt.data.CustomerEntity
import com.msc.shopmgmt.data.KhataDueEntity
import com.msc.shopmgmt.data.KhataPaymentEntity
import com.msc.shopmgmt.data.KhataCreditEntity

// =========================================================================
// MODULE 3: CREDIT KHATA INTEGRATED LEDGER WITH TRANSACTION ENGINE
// =========================================================================

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SimpleKhataScreen(
    customers: List<CustomerEntity>,
    dues: List<KhataDueEntity>,
    payments: List<KhataPaymentEntity>,
    credits: List<KhataCreditEntity>,
    currencySymbol: String = "₹",
    onRepaymentSubmit: (customerId: Long, amount: Double, note: String) -> Unit,
    onAddNewCustomer: (name: String, phone: String) -> Unit
) {
    var searchQuery by remember { mutableStateOf("") }
    var selectedCustomer by remember { mutableStateOf<CustomerEntity?>(null) }
    var showRepayDialog by remember { mutableStateOf(false) }
    var repayAmountInput by remember { mutableStateOf("") }
    var repayNoteInput by remember { mutableStateOf("") }

    Scaffold(
        topBar = {
            TopAppBar(title = { Text("Khata Digital Ledger", fontWeight = FontWeight.Bold) })
        }
    ) { innerPadding ->
        Column(modifier = Modifier.fillMaxSize().padding(innerPadding).padding(16.dp)) {
            Card(
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer),
                modifier = Modifier.fillMaxWidth().padding(bottom = 12.dp)
            ) {
                val outstandingAmt = dues.filter { it.status != "cleared" }.sumOf { it.amountDue - it.amountPaid }
                Text(
                    text = "Outstanding Credit: $currencySymbol\${String.format("%.2f", outstandingAmt)}",
                    modifier = Modifier.padding(16.dp),
                    fontWeight = FontWeight.Bold
                )
            }

            LazyColumn(modifier = Modifier.weight(1f)) {
                items(customers) { customer ->
                    val totalOutstanding = dues.filter { it.customerId == customer.cid && it.status != "cleared" }.sumOf { it.amountDue - it.amountPaid }
                    ListItem(
                        headlineContent = { Text(customer.name, fontWeight = FontWeight.Bold) },
                        supportingContent = { Text(customer.phone) },
                        trailingContent = { Text("$currencySymbol\${totalOutstanding}", color = Color.Red) },
                        modifier = Modifier.clickable {
                            selectedCustomer = customer
                            showRepayDialog = true
                        }
                    )
                }
            }
        }
    }
}
`;

export const NATIVE_REPORTS_SCREEN = `package com.msc.shopmgmt.ui.screens

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.msc.shopmgmt.data.BillEntity
import com.msc.shopmgmt.data.BillItemEntity
import com.msc.shopmgmt.data.ProductEntity

// =========================================================================
// MODULE 4: CANVAS COMPOSABLE CHARTS & OFFLINE METRICS REPORTS SCREEN
// =========================================================================

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun JetpackReportsScreen(
    bills: List<BillEntity>,
    billItems: List<BillItemEntity>,
    products: List<ProductEntity>,
    currencySymbol: String = "₹"
) {
    val totalRevenue = remember(bills) { bills.sumOf { it.total } }
    val totalProfit = remember(billItems) { billItems.sumOf { it.profit } }

    Scaffold(
        topBar = {
            TopAppBar(title = { Text("Performance Reports", fontWeight = FontWeight.Bold) })
        }
    ) { innerPadding ->
        Column(modifier = Modifier.fillMaxSize().padding(innerPadding).padding(16.dp)) {
            Card(modifier = Modifier.fillMaxWidth().padding(bottom = 16.dp)) {
                Column(Modifier.padding(16.dp)) {
                    Text("Total Revenue Earned: $currencySymbol\${totalRevenue}", fontWeight = FontWeight.Bold)
                    Text("Calculated Margin Profits: $currencySymbol\${totalProfit}", color = Color(0xFF4CAF50))
                }
            }

            Text("Daily Performance Canvas Vectors", fontWeight = FontWeight.Bold)
            Spacer(modifier = Modifier.height(8.dp))

            Canvas(modifier = Modifier.fillMaxWidth().height(180.dp)) {
                // Vector base lines drawing inside Android graphics coordinates safely
                drawLine(
                    color = Color.LightGray,
                    start = Offset(0f, size.height),
                    end = Offset(size.width, size.height),
                    strokeWidth = 4f
                )
                
                // Draw vector grids mock representation
                drawRect(
                    color = Color(0xFFAA80FF),
                    topLeft = Offset(40f, 40f),
                    size = Size(100f, size.height - 40f)
                )
            }
        }
    }
}
`;

export const NATIVE_SETTINGS_SCREEN = `package com.msc.shopmgmt.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp

// =========================================================================
// MODULE 5: LOCAL SYSTEM SETUP & DATABASE ADMINISTRATION UTILITY 
// =========================================================================

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun JetpackSettingsScreen(
    currentShopName: String,
    currentCurrency: String,
    onSettingsChanged: (shopName: String, currency: String) -> Unit,
    onResetDatabase: () -> Unit
) {
    var shopNameInput by remember { mutableStateOf(currentShopName) }
    var currencyInput by remember { mutableStateOf(currentCurrency) }

    Scaffold(
        topBar = {
            TopAppBar(title = { Text("Shop Preferences", fontWeight = FontWeight.Bold) })
        }
    ) { innerPadding ->
        Column(modifier = Modifier.fillMaxSize().padding(innerPadding).padding(16.dp)) {
            OutlinedTextField(
                value = shopNameInput,
                onValueChange = {
                    shopNameInput = it
                    onSettingsChanged(it, currencyInput)
                },
                label = { Text("Shop Business Name") },
                modifier = Modifier.fillMaxWidth()
            )

            Spacer(Modifier.height(16.dp))

            OutlinedTextField(
                value = currencyInput,
                onValueChange = {
                    currencyInput = it
                    onSettingsChanged(shopNameInput, it)
                },
                label = { Text("Admin Currency Symbol") },
                modifier = Modifier.fillMaxWidth()
            )

            Spacer(Modifier.height(30.dp))

            Button(
                onClick = onResetDatabase,
                colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.error)
            ) {
                Text("Reset & Flash Sample Room Database")
            }
        }
    }
}
`;

export const MAIN_ACTIVITY_CODE = `package com.msc.shopmgmt

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

// =========================================================================
// MAIN ENTRY ACTIVITY POINT orchestrates Room and navigation channels
// =========================================================================

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

            // Safe database streams bindings
            val products by shopDao.getAllProducts().collectAsState(initial = emptyList())
            val customers by shopDao.getAllCustomers().collectAsState(initial = emptyList())
            val bills by shopDao.getAllBills().collectAsState(initial = emptyList())
            val billItems by shopDao.getAllBillItems().collectAsState(initial = emptyList())
            val khataDues by shopDao.getAllKhataDues().collectAsState(initial = emptyList())
            val khataPayments by shopDao.getAllKhataPayments().collectAsState(initial = emptyList())
            val khataCredits by shopDao.getAllKhataCredits().collectAsState(initial = emptyList())

            LaunchedEffect(products.isEmpty()) {
                if (products.isEmpty()) {
                    coroutineScope.launch {
                        shopDao.insertProduct(ProductEntity(name = "Basmati Rice Premium 5kg", category = "Groceries", costPrice = 320.0, price = 410.0, stock = 42.0))
                        shopDao.insertProduct(ProductEntity(name = "टाटा Active Iodine Salt 1kg", category = "Groceries", costPrice = 20.0, price = 28.0, stock = 125.0))
                        shopDao.insertCustomer(CustomerEntity(name = "Dinesh Kumar", phone = "9876543210"))
                    }
                }
            }

            Surface(modifier = Modifier.fillMaxSize(), color = MaterialTheme.colorScheme.background) {
                Scaffold(
                    bottomBar = {
                        NavigationBar {
                            NavigationBarItem(
                                selected = activeTab == "billing",
                                onClick = { activeTab = "billing" },
                                icon = { Icon(Icons.Default.ShoppingCart, contentDescription = "POS") },
                                label = { Text("Billing") }
                            )
                            NavigationBarItem(
                                selected = activeTab == "inventory",
                                onClick = { activeTab = "inventory" },
                                icon = { Icon(Icons.Default.List, contentDescription = "Stock") },
                                label = { Text("Inventory") }
                            )
                            NavigationBarItem(
                                selected = activeTab == "khata",
                                onClick = { activeTab = "khata" },
                                icon = { Icon(Icons.Default.AccountBox, contentDescription = "Khata") },
                                label = { Text("Khata") }
                            )
                        }
                    }
                ) { innerPadding ->
                    Box(modifier = Modifier.padding(innerPadding)) {
                        when (activeTab) {
                            "billing" -> JetpackBillingScreen(
                                products = products,
                                customers = customers,
                                currencySymbol = currencySymbol,
                                onCheckoutSubmitted = { total, discount, customerId, paymentMethod, items ->
                                    coroutineScope.launch {
                                        val bId = shopDao.insertBill(
                                            BillEntity(customerId = customerId, total = total, discount = discount, paymentMethod = paymentMethod, date = "2026-06-01", time = "12:00 PM")
                                        )
                                    }
                                },
                                onAddNewCustomer = { name, phone ->
                                    coroutineScope.launch { shopDao.insertCustomer(CustomerEntity(name = name, phone = phone)) }
                                }
                            )
                            "inventory" -> JetpackInventoryScreen(
                                products = products,
                                currencySymbol = currencySymbol,
                                onProductSaved = { coroutineScope.launch { shopDao.insertProduct(it) } },
                                onProductDeleted = { coroutineScope.launch { shopDao.deleteProduct(it) } }
                            )
                            "khata" -> SimpleKhataScreen(
                                customers = customers,
                                dues = khataDues,
                                payments = khataPayments,
                                credits = khataCredits,
                                currencySymbol = currencySymbol,
                                onRepaymentSubmit = { cid, amt, note ->
                                    coroutineScope.launch { settlementDao.settleKhataTransaction(cid, amt, note) }
                                },
                                onAddNewCustomer = { name, phone ->
                                    coroutineScope.launch { shopDao.insertCustomer(CustomerEntity(name = name, phone = phone)) }
                                }
                            )
                        }
                    }
                }
            }
        }
    }
}
`;

export const CHEAT_SHEET_MAPPING = [
  { concept: "Room Persistence", kotlin: 'Room.databaseBuilder(context, ShopDatabase::class.java, "shop_database").build()', comment: "Provides clean SQLite integration utilizing robust Room wrappers, type safety, compile-time query verification, and structured migrations." },
  { concept: "Flow & Coroutines", kotlin: "fun getAllProducts(): Flow<List<ProductEntity>>", comment: "Collects database changes in response streams asynchronously with background Coroutine worker threads to ensure fluid 60FPS UI rendering." },
  { concept: "Declarative UI", kotlin: "Modifier.fillMaxSize().padding(innerPadding)", comment: "Uses modern Jetpack Compose layouts allowing fast reactive visual adjustments based on real-time device size changes and state bindings safely." }
];
