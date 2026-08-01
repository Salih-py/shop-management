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
import com.msc.shopmgmt.data.CustomerEntity
import com.msc.shopmgmt.data.KhataDueEntity
import com.msc.shopmgmt.data.KhataPaymentEntity
import com.msc.shopmgmt.data.KhataCreditEntity

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
    var showOnlyOutstanding by remember { mutableStateOf(false) }
    
    // Settle dialog overlays
    var selectedCustomer by remember { mutableStateOf<CustomerEntity?>(null) }
    var showRepayDialog by remember { mutableStateOf(false) }
    var repayAmountInput by remember { mutableStateOf("") }
    var repayNoteInput by remember { mutableStateOf("") }
    
    // Add Client Overlay
    var showAddCustomerDialog by remember { mutableStateOf(false) }
    var newCustName by remember { mutableStateOf("") }
    var newCustPhone by remember { mutableStateOf("") }

    val filteredCustomers = customers.filter {
        val matchesSearch = it.name.contains(searchQuery, ignoreCase = true) || it.phone.contains(searchQuery)
        val customerDues = dues.filter { d -> d.customerId == it.cid && d.status != "cleared" }
        val totalOutstanding = customerDues.sumOf { d -> d.amountDue - d.amountPaid }
        val matchesOutstanding = !showOnlyOutstanding || (totalOutstanding > 0.0)
        matchesSearch && matchesOutstanding
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Khata Credit Ledger", fontWeight = FontWeight.Bold) },
                actions = {
                    IconButton(onClick = { showAddCustomerDialog = true }) {
                        Icon(Icons.Default.Add, contentDescription = "Open Account", tint = MaterialTheme.colorScheme.primary)
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
            // Stats summary card
            Card(
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer),
                modifier = Modifier.fillMaxWidth()
            ) {
                val totalLedgerOutstanding = dues.filter { it.status != "cleared" }.sumOf { it.amountDue - it.amountPaid }
                val totalStoreCredits = credits.sumOf { it.creditAmount }
                
                Row(
                    modifier = Modifier
                        .padding(16.dp)
                        .fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text("Active Outstanding Ledger", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onPrimaryContainer)
                        Text(
                            text = "$currencySymbol${String.format("%.2f", totalLedgerOutstanding)}",
                            style = MaterialTheme.typography.headlineMedium,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onPrimaryContainer
                        )
                    }

                    Column(horizontalAlignment = Alignment.End) {
                        Text("Total Surplus Store Credits", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onPrimaryContainer)
                        Text(
                            text = "$currencySymbol${String.format("%.2f", totalStoreCredits)}",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold,
                            color = Color(0xFF4CAF50)
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            // Search and filters
            OutlinedTextField(
                value = searchQuery,
                onValueChange = { searchQuery = it },
                label = { Text("Search by name/phone...") },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true
            )

            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Checkbox(
                    checked = showOnlyOutstanding,
                    onCheckedChange = { showOnlyOutstanding = it }
                )
                Text(
                    "Show outstanding balances only",
                    style = MaterialTheme.typography.bodySmall,
                    modifier = Modifier.clickable { showOnlyOutstanding = !showOnlyOutstanding }
                )
            }

            Spacer(modifier = Modifier.height(8.dp))

            Text("Registered Shop Customers", style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Bold)
            Spacer(modifier = Modifier.height(4.dp))

            // Client loop
            LazyColumn(modifier = Modifier.weight(1f)) {
                items(filteredCustomers) { customer ->
                    val customerDues = dues.filter { it.customerId == customer.cid && it.status != "cleared" }
                    val totalOutstanding = customerDues.sumOf { it.amountDue - it.amountPaid }
                    val customerSurplusCredit = credits.find { it.customerId == customer.cid }?.creditAmount ?: 0.0

                    Card(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 4.dp),
                        onClick = {
                            selectedCustomer = customer
                            showRepayDialog = true
                        }
                    ) {
                        ListItem(
                            headlineContent = { Text(customer.name, fontWeight = FontWeight.Bold) },
                            supportingContent = { 
                                Column {
                                    Text("Phone: ${customer.phone}")
                                    if (customerSurplusCredit > 0.0) {
                                        Text(
                                            "Surplus Advance: $currencySymbol${String.format("%.2f", customerSurplusCredit)}",
                                            color = Color(0xFF4CAF50),
                                            style = MaterialTheme.typography.bodySmall,
                                            fontWeight = FontWeight.Bold
                                        )
                                    }
                                }
                            },
                            trailingContent = {
                                Text(
                                    text = "$currencySymbol${String.format("%.2f", totalOutstanding)}",
                                    style = MaterialTheme.typography.titleMedium,
                                    fontWeight = FontWeight.Bold,
                                    color = if (totalOutstanding > 0.0) MaterialTheme.colorScheme.error else Color.Gray
                                )
                            }
                        )
                    }
                }
            }
        }

        // Repay Dialogue
        if (showRepayDialog && selectedCustomer != null) {
            val customer = selectedCustomer!!
            val customerDues = dues.filter { it.customerId == customer.cid && it.status != "cleared" }
            val totalOutstanding = customerDues.sumOf { it.amountDue - it.amountPaid }
            val historyPayments = payments.filter { it.customerId == customer.cid }

            AlertDialog(
                onDismissRequest = { showRepayDialog = false },
                title = { Text("Repay Account Ledger") },
                text = {
                    Column(modifier = Modifier.verticalScroll(rememberScrollState()).fillMaxWidth()) {
                        Text("Customer: ${customer.name}", fontWeight = FontWeight.Bold)
                        Text("Cell phone: ${customer.phone}", style = MaterialTheme.typography.bodySmall)

                        Spacer(modifier = Modifier.height(8.dp))

                        Card(
                            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
                        ) {
                            Column(modifier = Modifier.padding(12.dp)) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween
                                ) {
                                    Text("Total Dues:")
                                    Text(
                                        text = "$currencySymbol${String.format("%.2f", totalOutstanding)}",
                                        fontWeight = FontWeight.Bold,
                                        color = if (totalOutstanding > 0.0) MaterialTheme.colorScheme.error else Color.Gray
                                    )
                                }
                            }
                        }

                        Spacer(modifier = Modifier.height(12.dp))

                        OutlinedTextField(
                            value = repayAmountInput,
                            onValueChange = { repayAmountInput = it },
                            label = { Text("Repayment Amount ($currencySymbol)") },
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                            modifier = Modifier.fillMaxWidth()
                        )

                        Spacer(modifier = Modifier.height(8.dp))

                        OutlinedTextField(
                            value = repayNoteInput,
                            onValueChange = { repayNoteInput = it },
                            label = { Text("Transaction Reference/Note") },
                            placeholder = { Text("e.g. Cash, GPay, Handover") },
                            modifier = Modifier.fillMaxWidth()
                        )

                        // Settle payment historical log
                        if (historyPayments.isNotEmpty()) {
                            Spacer(modifier = Modifier.height(16.dp))
                            Text("Recent payments logged:", style = MaterialTheme.typography.bodySmall, fontWeight = FontWeight.Bold)
                            Column(modifier = Modifier.heightIn(max = 80.dp)) {
                                historyPayments.forEach { pay ->
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.SpaceBetween
                                    ) {
                                        Text("${pay.paymentDate}: ${pay.note}", style = MaterialTheme.typography.bodySmall)
                                        Text("+$currencySymbol${pay.amountPaid}", color = Color(0xFF4CAF50), style = MaterialTheme.typography.bodySmall)
                                    }
                                }
                            }
                        }
                    }
                },
                confirmButton = {
                    Button(
                        onClick = {
                            val amt = repayAmountInput.toDoubleOrNull() ?: 0.0
                            if (amt > 0) {
                                onRepaymentSubmit(customer.cid, amt, repayNoteInput)
                                showRepayDialog = false
                                repayAmountInput = ""
                                repayNoteInput = ""
                            }
                        }
                    ) {
                        Text("Process SettleEngine")
                    }
                },
                dismissButton = {
                    TextButton(onClick = { showRepayDialog = false }) {
                        Text("Cancel")
                    }
                }
            )
        }

        // Register Customer modal inside Khata Screen
        if (showAddCustomerDialog) {
            AlertDialog(
                onDismissRequest = { showAddCustomerDialog = false },
                title = { Text("Open Khata Account") },
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
                            label = { Text("Mobile Phone Address (10 Digits)") },
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
                        Text("Open Ledger")
                    }
                },
                dismissButton = {
                    TextButton(onClick = { showAddCustomerDialog = false }) {
                        Text("Cancel")
                    }
                }
            )
        }
    }
}
