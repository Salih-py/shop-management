package com.msc.shopmgmt.ui.screens

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
    
    // Add Client Overlay
    var showAddCustomerDialog by remember { mutableStateOf(false) }
    var newCustName by remember { mutableStateOf("") }
    var newCustPhone by remember { mutableStateOf("") }
    
    // Receipt invoice modal
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
                    text = { Text("Checkout ($currencySymbol${String.format("%.2f", total)})") },
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
            // Product Catalog Scanner Search Input
            OutlinedTextField(
                value = searchQuery,
                onValueChange = { searchQuery = it },
                label = { Text("Scan or Search Products...") },
                placeholder = { Text("e.g. Rice, Oats, Oil") },
                leadingIcon = { Icon(Icons.Default.Search, contentDescription = "Scan") },
                trailingIcon = {
                    if (searchQuery.isNotEmpty()) {
                        IconButton(onClick = { searchQuery = "" }) {
                            Icon(Icons.Default.Clear, contentDescription = "Clear")
                        }
                    }
                },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true
            )

            // Autocomplete Live Catalog Dropdown Listing
            AnimatedVisibility(visible = filteredProducts.isNotEmpty()) {
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 4.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
                ) {
                    LazyColumn(
                        modifier = Modifier.heightIn(max = 200.dp)
                    ) {
                        items(filteredProducts) { product ->
                            ListItem(
                                headlineContent = { Text(product.name, fontWeight = FontWeight.SemiBold) },
                                supportingContent = { Text("${product.category} • Stock: ${product.stock} Units") },
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
                                            searchQuery = "" // reset search
                                        },
                                        colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary)
                                    ) {
                                        Text("+$currencySymbol${product.price}")
                                    }
                                },
                                modifier = Modifier.clickable { }
                            )
                            HorizontalDivider()
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            // Attached Client Selection Card
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.secondaryContainer.copy(alpha = 0.2f))
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text("Bill To Customer:", style = MaterialTheme.typography.bodySmall, color = Color.Gray, fontWeight = FontWeight.Bold)
                        Text(
                            text = selectedCustomer?.name ?: "Walk-in Guest Client",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.primary
                        )
                        selectedCustomer?.let {
                            Text("Cell: ${it.phone} • spent: $currencySymbol${String.format("%.2f", it.totalSpent)}", style = MaterialTheme.typography.bodySmall)
                        }
                    }

                    Row {
                        IconButton(onClick = { showAddCustomerDialog = true }) {
                            Icon(Icons.Default.AddCircle, contentDescription = "Add Customer", tint = MaterialTheme.colorScheme.primary)
                        }

                        // Select Option
                        Box {
                            var dropdownExpanded by remember { mutableStateOf(false) }
                            IconButton(onClick = { dropdownExpanded = true }) {
                                Icon(Icons.Default.Person, contentDescription = "Select Client")
                            }
                            DropdownMenu(
                                expanded = dropdownExpanded,
                                onDismissRequest = { dropdownExpanded = false }
                            ) {
                                DropdownMenuItem(
                                    text = { Text("Walk-in Guest Client") },
                                    onClick = {
                                        selectedCustomerId = null
                                        dropdownExpanded = false
                                    }
                                )
                                customers.forEach { cust ->
                                    DropdownMenuItem(
                                        text = { Text(cust.name) },
                                        onClick = {
                                            selectedCustomerId = cust.cid
                                            dropdownExpanded = false
                                        }
                                    )
                                }
                            }
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            Text("Selected Shopping Basket", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
            Spacer(modifier = Modifier.height(8.dp))

            // Main Cart lazy loop
            LazyColumn(
                modifier = Modifier
                    .weight(1f)
                    .fillMaxWidth(),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                if (cartItems.isEmpty()) {
                    item {
                        Column(
                            modifier = Modifier
                                .fillParentMaxHeight(0.5f)
                                .fillMaxWidth(),
                            verticalArrangement = Arrangement.Center,
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Icon(Icons.Default.ShoppingCart, contentDescription = "Basket", modifier = Modifier.size(48.dp), tint = Color.LightGray)
                            Spacer(Modifier.height(8.dp))
                            Text("Shopping cart is empty", color = Color.Gray, style = MaterialTheme.typography.bodyMedium)
                            Text("Use search above to list products", color = Color.Gray, style = MaterialTheme.typography.bodySmall)
                        }
                    }
                } else {
                    items(cartItems) { item ->
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
                        ) {
                            Row(
                                modifier = Modifier
                                    .padding(12.dp)
                                    .fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Column {
                                    Text(item.productName, fontWeight = FontWeight.Bold)
                                    Text("$currencySymbol${item.priceAtSale} each", style = MaterialTheme.typography.bodySmall, color = Color.Gray)
                                }

                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    IconButton(
                                        onClick = {
                                            if (item.qty > 1) {
                                                cartItems = cartItems.map {
                                                    if (it.productId == item.productId) it.copy(qty = it.qty - 1) else it
                                                }
                                            } else {
                                                cartItems = cartItems.filter { it.productId != item.productId }
                                            }
                                        }
                                    ) {
                                        Icon(Icons.Default.KeyboardArrowLeft, contentDescription = "Minus")
                                    }

                                    Text(
                                        text = item.qty.toInt().toString(),
                                        fontWeight = FontWeight.Bold,
                                        modifier = Modifier.padding(horizontal = 8.dp)
                                    )

                                    IconButton(
                                        onClick = {
                                            // safety check available products
                                            val stockLimit = products.find { it.pid == item.productId }?.stock ?: 99.0
                                            if (item.qty + 1 <= stockLimit) {
                                                cartItems = cartItems.map {
                                                    if (it.productId == item.productId) it.copy(qty = it.qty + 1) else it
                                                }
                                            }
                                        }
                                    ) {
                                        Icon(Icons.Default.KeyboardArrowRight, contentDescription = "Plus")
                                    }

                                    Spacer(modifier = Modifier.width(8.dp))

                                    Text(
                                        text = "$currencySymbol${String.format("%.2f", item.qty * item.priceAtSale)}",
                                        fontWeight = FontWeight.Bold,
                                        color = MaterialTheme.colorScheme.primary
                                    )
                                }
                            }
                        }
                    }
                }
            }

            // Calculation and checkout section details
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 8.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text("Subtotal", style = MaterialTheme.typography.bodyMedium)
                        Text("$currencySymbol${String.format("%.2f", subtotal)}", style = MaterialTheme.typography.bodyMedium)
                    }
                    Spacer(modifier = Modifier.height(8.dp))
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text("Discount Amount ($currencySymbol)", style = MaterialTheme.typography.bodyMedium, modifier = Modifier.weight(1f))
                        OutlinedTextField(
                            value = discountInput,
                            onValueChange = { discountInput = it },
                            modifier = Modifier.width(100.dp),
                            singleLine = true,
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                            textStyle = MaterialTheme.typography.bodyMedium
                        )
                    }
                    HorizontalDivider(modifier = Modifier.padding(vertical = 12.dp))
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text("Grand Total", fontWeight = FontWeight.Bold, style = MaterialTheme.typography.titleLarge)
                        Text("$currencySymbol${String.format("%.2f", total)}", fontWeight = FontWeight.Bold, style = MaterialTheme.typography.titleLarge, color = MaterialTheme.colorScheme.primary)
                    }
                }
            }
        }
    }

    // A. Dialog to Register New Clients
    if (showAddCustomerDialog) {
        AlertDialog(
            onDismissRequest = { showAddCustomerDialog = false },
            title = { Text("Register Khata Customer") },
            text = {
                Column {
                    OutlinedTextField(
                        value = newCustName,
                        onValueChange = { newCustName = it },
                        label = { Text("Customer Full Name") },
                        modifier = Modifier.fillMaxWidth()
                    )
                    Spacer(modifier = Modifier.height(12.dp))
                    OutlinedTextField(
                        value = newCustPhone,
                        onValueChange = { newCustPhone = it },
                        label = { Text("Mobile Phone Numbers (10 Digits)") },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        if (newCustName.isNotBlank() && newCustPhone.isNotBlank()) {
                            onAddNewCustomer(newCustName, newCustPhone)
                            showAddCustomerDialog = false
                            newCustName = ""
                            newCustPhone = ""
                        }
                    }
                ) {
                    Text("Register & Save")
                }
            },
            dismissButton = {
                TextButton(onClick = { showAddCustomerDialog = false }) {
                    Text("Cancel")
                }
            }
        )
    }

    // B. Main checkout modal option to choose payment mode
    if (isCheckingOut) {
        Dialog(onDismissRequest = { isCheckingOut = false }) {
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp)
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text("Process Settle Flow", fontWeight = FontWeight.Bold, style = MaterialTheme.typography.titleLarge)
                    Spacer(modifier = Modifier.height(12.dp))
                    Text("Choose Business Payment Mode:")
                    Spacer(modifier = Modifier.height(8.dp))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Button(
                            onClick = { paymentMethod = "CASH" },
                            modifier = Modifier.weight(1f),
                            colors = ButtonDefaults.buttonColors(
                                containerColor = if (paymentMethod == "CASH") MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.surfaceVariant,
                                contentColor = if (paymentMethod == "CASH") MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        ) {
                            Text("Cash")
                        }
                        Button(
                            onClick = { paymentMethod = "UPI" },
                            modifier = Modifier.weight(1f),
                            colors = ButtonDefaults.buttonColors(
                                containerColor = if (paymentMethod == "UPI") MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.surfaceVariant,
                                contentColor = if (paymentMethod == "UPI") MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        ) {
                            Text("UPI QR")
                        }
                        Button(
                            onClick = { paymentMethod = "KHATA" },
                            modifier = Modifier.weight(1f),
                            colors = ButtonDefaults.buttonColors(
                                containerColor = if (paymentMethod == "KHATA") MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.surfaceVariant,
                                contentColor = if (paymentMethod == "KHATA") MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        ) {
                            Text("Khata")
                        }
                    }

                    if (paymentMethod == "KHATA" && selectedCustomerId == null) {
                        Spacer(modifier = Modifier.height(12.dp))
                        Card(
                            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.errorContainer)
                        ) {
                            Text(
                                "Error: Khata credit ledger entries require a registered customer link. Close this dialog and map a customer.",
                                modifier = Modifier.padding(12.dp),
                                color = MaterialTheme.colorScheme.onErrorContainer,
                                style = MaterialTheme.typography.bodySmall
                            )
                        }
                    }

                    if (paymentMethod == "UPI") {
                        Spacer(modifier = Modifier.height(12.dp))
                        Column(
                            horizontalAlignment = Alignment.CenterHorizontally,
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Icon(Icons.Default.ThumbUp, contentDescription = "QR Code Scanner Mock", modifier = Modifier.size(80.dp), tint = MaterialTheme.colorScheme.primary)
                            Spacer(modifier = Modifier.height(8.dp))
                            Text("UPI Dynamic Settlement Bridge active", style = MaterialTheme.typography.bodySmall, fontWeight = FontWeight.Bold)
                        }
                    }

                    Spacer(modifier = Modifier.height(20.dp))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        TextButton(onClick = { isCheckingOut = false }) {
                            Text("Back")
                        }

                        Button(
                            enabled = paymentMethod != "KHATA" || selectedCustomerId != null,
                            onClick = {
                                isCheckingOut = false
                                onCheckoutSubmitted(total, discount, selectedCustomerId, paymentMethod, cartItems)
                                lastCheckoutReceipt = ReceiptSummary(
                                    items = cartItems,
                                    subtotal = subtotal,
                                    discount = discount,
                                    total = total,
                                    customerName = selectedCustomer?.name ?: "Walk-in Guest",
                                    paymentMethod = paymentMethod
                                )
                                cartItems = emptyList() // clear
                                showReceiptDialog = true
                            }
                        ) {
                            Text("Issue Receipt")
                        }
                    }
                }
            }
        }
    }

    // C. POS Printed Digital Receipt Dialog
    if (showReceiptDialog && lastCheckoutReceipt != null) {
        val receipt = lastCheckoutReceipt!!
        Dialog(onDismissRequest = { showReceiptDialog = false }) {
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp)
            ) {
                Column(
                    modifier = Modifier.padding(16.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Icon(Icons.Default.CheckCircle, contentDescription = "Success", modifier = Modifier.size(48.dp), tint = Color(0xFF4CAF50))
                    Spacer(Modifier.height(12.dp))
                    Text("Payment Recorded!", fontWeight = FontWeight.Bold, style = MaterialTheme.typography.titleLarge)
                    Text("Invoice fully synced to Room SQLite", style = MaterialTheme.typography.bodySmall)

                    HorizontalDivider(Modifier.padding(vertical = 12.dp))

                    Text("CUSTOMER: ${receipt.customerName.uppercase()}", fontWeight = FontWeight.SemiBold)
                    Text("METHOD: [${receipt.paymentMethod}]", style = MaterialTheme.typography.bodyMedium)

                    Spacer(modifier = Modifier.height(12.dp))

                    LazyColumn(modifier = Modifier.heightIn(max = 120.dp)) {
                        items(receipt.items) { item ->
                            Row(
                                modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Text("${item.productName} (x${item.qty.toInt()})", style = MaterialTheme.typography.bodySmall)
                                Text("$currencySymbol${String.format("%.2f", item.qty * item.priceAtSale)}", style = MaterialTheme.typography.bodySmall)
                            }
                        }
                    }

                    HorizontalDivider(Modifier.padding(vertical = 12.dp))

                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text("Subtotal:")
                        Text("$currencySymbol${String.format("%.2f", receipt.subtotal)}")
                    }
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text("Discount:")
                        Text("-$currencySymbol${String.format("%.2f", receipt.discount)}")
                    }
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text("Grand Total:", fontWeight = FontWeight.Bold, style = MaterialTheme.typography.titleLarge)
                        Text("$currencySymbol${String.format("%.2f", receipt.total)}", fontWeight = FontWeight.Bold, style = MaterialTheme.typography.titleLarge, color = MaterialTheme.colorScheme.primary)
                    }

                    Spacer(modifier = Modifier.height(20.dp))

                    Button(
                        onClick = { showReceiptDialog = false },
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text("Proceed to Next Sale")
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
