package com.msc.shopmgmt.ui.screens

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.clickable
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
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
import com.msc.shopmgmt.data.ProductEntity

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
    
    // Add/Edit Product State Dialog
    var showFormDialog by remember { mutableStateOf(false) }
    var editingProduct by remember { mutableStateOf<ProductEntity?>(null) }
    
    var formName by remember { mutableStateOf("") }
    var formCategory by remember { mutableStateOf("Groceries") }
    var formCostPrice by remember { mutableStateOf("") }
    var formRetailPrice by remember { mutableStateOf("") }
    var formStock by remember { mutableStateOf("") }
    var formReorderLevel by remember { mutableStateOf("10.0") }

    val categories = listOf("All", "Groceries", "Household", "Oils", "Dairy", "Beverages", "Spices", "Snacks")
    val formCategories = categories.filter { it != "All" }

    val filteredProducts = products.filter {
        val matchesSearch = it.name.contains(searchQuery, ignoreCase = true) || it.category.contains(searchQuery, ignoreCase = true)
        val matchesCategory = selectedCategoryFilter == "All" || it.category == selectedCategoryFilter
        matchesSearch && matchesCategory
    }

    LaunchedEffect(editingProduct) {
        if (editingProduct != null) {
            formName = editingProduct!!.name
            formCategory = editingProduct!!.category
            formCostPrice = editingProduct!!.costPrice.toString()
            formRetailPrice = editingProduct!!.price.toString()
            formStock = editingProduct!!.stock.toString()
            formReorderLevel = editingProduct!!.reorderLevel.toString()
        } else {
            formName = ""
            formCategory = "Groceries"
            formCostPrice = ""
            formRetailPrice = ""
            formStock = ""
            formReorderLevel = "10.0"
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Inventory Catalog", fontWeight = FontWeight.Bold) },
                actions = {
                    IconButton(
                        onClick = {
                            editingProduct = null
                            showFormDialog = true
                        }
                    ) {
                        Icon(Icons.Default.Add, contentDescription = "Add Product", tint = MaterialTheme.colorScheme.primary)
                    }
                }
            )
        }
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .padding(16.dp)
        ) {
            // Category Filter Rail
            ScrollableTabRow(
                selectedTabIndex = categories.indexOf(selectedCategoryFilter).coerceAtLeast(0),
                edgePadding = 0.dp,
                modifier = Modifier.fillMaxWidth()
            ) {
                categories.forEach { cat ->
                    Tab(
                        selected = selectedCategoryFilter == cat,
                        onClick = { selectedCategoryFilter = cat },
                        text = { Text(cat) }
                    )
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            // Search input field
            OutlinedTextField(
                value = searchQuery,
                onValueChange = { searchQuery = it },
                label = { Text("Search parameters...") },
                leadingIcon = { Icon(Icons.Default.Search, contentDescription = "Search") },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true
            )

            Spacer(modifier = Modifier.height(16.dp))

            // Products Catalog Table List
            LazyColumn(
                modifier = Modifier.weight(1f),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                if (filteredProducts.isEmpty()) {
                    item {
                        Column(
                            horizontalAlignment = Alignment.CenterHorizontally,
                            verticalArrangement = Arrangement.Center,
                            modifier = Modifier
                                .fillParentMaxHeight(0.6f)
                                .fillMaxWidth()
                        ) {
                            Icon(Icons.Default.Warning, contentDescription = "Warning", modifier = Modifier.size(48.dp), tint = Color.Gray)
                            Spacer(modifier = Modifier.height(8.dp))
                            Text("No products in directory match conditions", color = Color.Gray)
                        }
                    }
                } else {
                    items(filteredProducts) { item ->
                        val isLowStock = item.stock <= item.reorderLevel
                        
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            colors = CardDefaults.cardColors(
                                containerColor = if (isLowStock) MaterialTheme.colorScheme.errorContainer.copy(alpha = 0.2f)
                                else MaterialTheme.colorScheme.surface
                            ),
                            border = androidx.compose.foundation.BorderStroke(
                                width = 1.dp,
                                color = if (isLowStock) MaterialTheme.colorScheme.error.copy(alpha = 0.5f)
                                else MaterialTheme.colorScheme.outlineVariant
                            )
                        ) {
                            Column(modifier = Modifier.padding(12.dp)) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Column {
                                        Text(item.name, fontWeight = FontWeight.Bold, style = MaterialTheme.typography.titleMedium)
                                        Text(
                                            text = "${item.category} • Cost: $currencySymbol${item.costPrice}",
                                            style = MaterialTheme.typography.bodySmall,
                                            color = Color.Gray
                                        )
                                    }

                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        Text(
                                            text = "$currencySymbol${item.price}",
                                            style = MaterialTheme.typography.titleMedium,
                                            fontWeight = FontWeight.Bold,
                                            color = MaterialTheme.colorScheme.primary
                                        )

                                        Spacer(modifier = Modifier.width(8.dp))

                                        IconButton(
                                            onClick = {
                                                editingProduct = item
                                                showFormDialog = true
                                            }
                                        ) {
                                            Icon(Icons.Default.Edit, contentDescription = "Edit", tint = MaterialTheme.colorScheme.secondary)
                                        }

                                        IconButton(onClick = { onProductDeleted(item.pid) }) {
                                            Icon(Icons.Default.Delete, contentDescription = "Delete", tint = MaterialTheme.colorScheme.error)
                                        }
                                    }
                                }

                                Spacer(modifier = Modifier.height(6.dp))

                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Text(
                                        text = "Stock: ${item.stock.toInt()} Units",
                                        fontWeight = FontWeight.SemiBold,
                                        color = if (isLowStock) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.onSurface
                                    )

                                    if (isLowStock) {
                                        Text(
                                            text = "LOW STOCK (Min: ${item.reorderLevel.toInt()})",
                                            color = MaterialTheme.colorScheme.error,
                                            style = MaterialTheme.typography.labelSmall,
                                            fontWeight = FontWeight.Bold
                                        )
                                    } else {
                                        Text(
                                            text = "Satisfactory Level",
                                            color = Color(0xFF4CAF50),
                                            style = MaterialTheme.typography.labelSmall
                                        )
                                    }
                                }
                            }
                        }
                    }
                }
            }

            // M3 Export Trigger Mock
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 8.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
            ) {
                Row(
                    modifier = Modifier
                        .clickable { }
                        .padding(12.dp)
                        .fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.Share, contentDescription = "Export")
                        Spacer(modifier = Modifier.width(12.dp))
                        Column {
                            Text("Inventory spreadsheet tools", fontWeight = FontWeight.SemiBold, style = MaterialTheme.typography.bodyMedium)
                            Text("Mock import/export catalog sheets instantly", style = MaterialTheme.typography.bodySmall, color = Color.Gray)
                        }
                    }
                    Icon(Icons.Default.KeyboardArrowRight, contentDescription = "Spreadsheet Tools Open")
                }
            }
        }
    }

    // Product Editor AlertDialog Forms
    if (showFormDialog) {
        AlertDialog(
            onDismissRequest = { showFormDialog = false },
            title = { Text(if (editingProduct != null) "Update Product Specs" else "Register New Stock SKU") },
            text = {
                Column(modifier = Modifier.verticalScroll(rememberScrollState()).fillMaxWidth()) {
                    OutlinedTextField(
                        value = formName,
                        onValueChange = { formName = it },
                        label = { Text("Product/Item Name") },
                        modifier = Modifier.fillMaxWidth()
                    )
                    Spacer(modifier = Modifier.height(8.dp))

                    Text("Category:", style = MaterialTheme.typography.bodySmall, fontWeight = FontWeight.Bold)
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        var expandedDropDown by remember { mutableStateOf(false) }
                        Button(
                            onClick = { expandedDropDown = true },
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Text(formCategory)
                            Icon(Icons.Default.ArrowDropDown, contentDescription = "Expand")
                        }
                        DropdownMenu(
                            expanded = expandedDropDown,
                            onDismissRequest = { expandedDropDown = false }
                        ) {
                            formCategories.forEach { cat ->
                                DropdownMenuItem(
                                    text = { Text(cat) },
                                    onClick = {
                                        formCategory = cat
                                        expandedDropDown = false
                                    }
                                )
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(12.dp))

                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        OutlinedTextField(
                            value = formCostPrice,
                            onValueChange = { formCostPrice = it },
                            label = { Text("Cost Price ($currencySymbol)") },
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                            modifier = Modifier.weight(1f)
                        )
                        OutlinedTextField(
                            value = formRetailPrice,
                            onValueChange = { formRetailPrice = it },
                            label = { Text("Retail Price ($currencySymbol)") },
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                            modifier = Modifier.weight(1f)
                        )
                    }

                    Spacer(modifier = Modifier.height(8.dp))

                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        OutlinedTextField(
                            value = formStock,
                            onValueChange = { formStock = it },
                            label = { Text("Current Stock") },
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                            modifier = Modifier.weight(1f)
                        )
                        OutlinedTextField(
                            value = formReorderLevel,
                            onValueChange = { formReorderLevel = it },
                            label = { Text("Min Margin Level") },
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                            modifier = Modifier.weight(1f)
                        )
                    }

                    // Profit Margin feedback indicator
                    val cost = formCostPrice.toDoubleOrNull() ?: 0.0
                    val retail = formRetailPrice.toDoubleOrNull() ?: 0.0
                    if (retail > 0.0) {
                        val margin = ((retail - cost) / retail) * 100
                        val color = if (margin > 30) Color(0xFF4CAF50) else if (margin > 10) Color(0xFFFF9800) else Color.Red
                        Spacer(modifier = Modifier.height(12.dp))
                        Text(
                            text = "Estimated Gross Profit Margin: ${String.format("%.1f", margin)}%",
                            color = color,
                            fontWeight = FontWeight.Bold,
                            style = MaterialTheme.typography.bodySmall
                        )
                    }
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        val c = formCostPrice.toDoubleOrNull() ?: 0.0
                        val r = formRetailPrice.toDoubleOrNull() ?: 0.0
                        val s = formStock.toDoubleOrNull() ?: 0.0
                        val re = formReorderLevel.toDoubleOrNull() ?: 10.0

                        if (formName.isNotBlank() && r > 0.0) {
                            val targetPid = editingProduct?.pid ?: 0L
                            onProductSaved(
                                ProductEntity(
                                    pid = targetPid,
                                    name = formName,
                                    category = formCategory,
                                    costPrice = c,
                                    price = r,
                                    stock = s,
                                    reorderLevel = re
                                )
                            )
                            showFormDialog = false
                            editingProduct = null
                        }
                    }
                ) {
                    Text("Save / Commit Specs")
                }
            },
            dismissButton = {
                TextButton(
                    onClick = {
                        showFormDialog = false
                        editingProduct = null
                    }
                ) {
                    Text("Cancel")
                }
            }
        )
    }
}
