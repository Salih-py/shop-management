package com.msc.shopmgmt.ui.screens

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.msc.shopmgmt.data.BillEntity
import com.msc.shopmgmt.data.BillItemEntity
import com.msc.shopmgmt.data.ProductEntity

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
    val lowStockItems = remember(products) { products.filter { it.stock <= it.reorderLevel } }

    val profitMargin = if (totalRevenue > 0) (totalProfit / totalRevenue) * 100 else 0.0

    // Grouping sales by date for the Chart
    val dailyTrend = remember(bills) {
        bills.groupBy { it.date }
            .mapValues { entry -> entry.value.sumOf { it.total } }
            .toList()
            .sortedBy { it.first }
            .takeLast(5)
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Performance Reports", fontWeight = FontWeight.Bold) }
            )
        }
    ) { innerPadding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // A. Top Stats Grid
            item {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Card(
                        modifier = Modifier.weight(1f),
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
                    ) {
                        Column(modifier = Modifier.padding(12.dp)) {
                            Text("Total Revenue", style = MaterialTheme.typography.bodySmall, color = Color.Gray)
                            Text(
                                "$currencySymbol${String.format("%.1f", totalRevenue)}",
                                fontWeight = FontWeight.Bold,
                                style = MaterialTheme.typography.titleLarge,
                                color = MaterialTheme.colorScheme.primary
                            )
                        }
                    }

                    Card(
                        modifier = Modifier.weight(1f),
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
                    ) {
                        Column(modifier = Modifier.padding(12.dp)) {
                            Text("Net Profit", style = MaterialTheme.typography.bodySmall, color = Color.Gray)
                            Text(
                                "$currencySymbol${String.format("%.1f", totalProfit)}",
                                fontWeight = FontWeight.Bold,
                                style = MaterialTheme.typography.titleLarge,
                                color = Color(0xFF4CAF50)
                            )
                        }
                    }
                }
            }

            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.secondaryContainer.copy(alpha = 0.3f))
                ) {
                    Row(
                        modifier = Modifier
                            .padding(16.dp)
                            .fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Text("Overall Profit Yield Ratio", style = MaterialTheme.typography.bodySmall)
                            Text("${String.format("%.1f", profitMargin)}% Margin", fontWeight = FontWeight.Bold, style = MaterialTheme.typography.titleLarge)
                        }
                        
                        CircularProgressIndicator(
                            progress = { (profitMargin / 100f).coerceIn(0f, 1f).toFloat() },
                            modifier = Modifier.size(40.dp),
                            color = Color(0xFF4CAF50),
                            strokeWidth = 6.dp
                        )
                    }
                }
            }

            // B. Draw Interactive bar chart inside Canvas safely
            item {
                Text("Daily Sales Velocity Trend", fontWeight = FontWeight.Bold, style = MaterialTheme.typography.titleMedium)
                Spacer(modifier = Modifier.height(8.dp))
                
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(200.dp)
                ) {
                    if (dailyTrend.isEmpty()) {
                        Box(
                            modifier = Modifier.fillMaxSize(),
                            contentAlignment = Alignment.Center
                        ) {
                            Text("Insufficient checkouts to chart", color = Color.Gray, style = MaterialTheme.typography.bodySmall)
                        }
                    } else {
                        val maxSales = dailyTrend.maxOfOrNull { it.second } ?: 1.0

                        Canvas(
                            modifier = Modifier
                                .fillMaxSize()
                                .padding(24.dp)
                        ) {
                            val canvasWidth = size.width
                            val canvasHeight = size.height
                            val barWidth = 40.dp.toPx()
                            val numBars = dailyTrend.size
                            val spacing = (canvasWidth - (barWidth * numBars)) / (numBars + 1)

                            // Base vertical coordinates line
                            drawLine(
                                color = Color.LightGray,
                                start = Offset(0f, canvasHeight),
                                end = Offset(canvasWidth, canvasHeight),
                                strokeWidth = 2f
                            )

                            dailyTrend.forEachIndexed { idx, pair ->
                                val xPos = spacing + idx * (barWidth + spacing)
                                val scaledHeight = (pair.second / maxSales) * canvasHeight
                                val yPos = canvasHeight - scaledHeight

                                // Draw rect bar
                                drawRect(
                                    color = Color(0xFF4CAF50),
                                    topLeft = Offset(xPos, yPos.toFloat()),
                                    size = Size(barWidth, scaledHeight.toFloat())
                                )
                            }
                        }
                    }
                }
            }

            // C. Stock inventory safety alerts
            item {
                Text("Critical Reorder Warnings", fontWeight = FontWeight.Bold, style = MaterialTheme.typography.titleMedium)
            }

            if (lowStockItems.isEmpty()) {
                item {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(Icons.Default.Info, contentDescription = "Safe", tint = Color(0xFF4CAF50))
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("All items currently satisfy stock thresholds", style = MaterialTheme.typography.bodySmall)
                    }
                }
            } else {
                items(lowStockItems) { item ->
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.errorContainer.copy(alpha = 0.15f))
                    ) {
                        Row(
                            modifier = Modifier
                                .padding(12.dp)
                                .fillMaxWidth(),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(Icons.Default.Warning, contentDescription = "Reorder Warning", tint = MaterialTheme.colorScheme.error)
                            Spacer(modifier = Modifier.width(12.dp))
                            Column {
                                Text(item.name, fontWeight = FontWeight.Bold, style = MaterialTheme.typography.bodyMedium)
                                Text("Remaining stock: ${item.stock.toInt()} (Safety level: ${item.reorderLevel.toInt()})", style = MaterialTheme.typography.bodySmall, color = Color.Gray)
                            }
                        }
                    }
                }
            }
        }
    }
}
