package com.msc.shopmgmt.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Star
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp

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

    LaunchedEffect(currentShopName, currentCurrency) {
        shopNameInput = currentShopName
        currencyInput = currentCurrency
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("App Preferences", fontWeight = FontWeight.Bold) }
            )
        }
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Text("General configuration", fontWeight = FontWeight.Bold, style = MaterialTheme.typography.titleMedium)

            OutlinedTextField(
                value = shopNameInput,
                onValueChange = { 
                    shopNameInput = it
                    onSettingsChanged(it, currencyInput)
                },
                label = { Text("Shop Business Name") },
                modifier = Modifier.fillMaxWidth()
            )

            OutlinedTextField(
                value = currencyInput,
                onValueChange = { 
                    currencyInput = it
                    onSettingsChanged(shopNameInput, it)
                },
                label = { Text("Default Currency Symbol") },
                modifier = Modifier.fillMaxWidth()
            )

            Spacer(modifier = Modifier.height(8.dp))

            Text("System Utilities", fontWeight = FontWeight.Bold, style = MaterialTheme.typography.titleMedium)

            Card(
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.errorContainer.copy(alpha = 0.2f))
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text("Database Administration Tools", fontWeight = FontWeight.SemiBold, style = MaterialTheme.typography.titleSmall)
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        "Click the action below to instantly wipe the local Room database and re-inject standard sample datasets.",
                        style = MaterialTheme.typography.bodySmall,
                        color = Color.Gray
                    )
                    Spacer(modifier = Modifier.height(12.dp))
                    
                    Button(
                        onClick = onResetDatabase,
                        colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.error)
                    ) {
                        Icon(Icons.Default.Refresh, contentDescription = "Flash Data")
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Reset & Flash Sample Data")
                    }
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            Card(
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
            ) {
                Row(
                    modifier = Modifier.padding(16.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(Icons.Default.Star, contentDescription = "Engine Specs", tint = MaterialTheme.colorScheme.secondary)
                    Spacer(modifier = Modifier.width(16.dp))
                    Column {
                        Text("M3 Native Engine Specs", fontWeight = FontWeight.Bold)
                        Text(
                            "Framework: Jetpack Compose\nDatabase: SQLite (Room ORM)\nLanguage: Kotlin 2.0.21\nDesign: Material 3 UI",
                            style = MaterialTheme.typography.bodySmall,
                            color = Color.Gray
                        )
                    }
                }
            }
        }
    }
}
