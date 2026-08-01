package com.msc.shopmgmt.data

import androidx.room.*

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
    @ColumnInfo(name = "customer_id") val customerId: Long?,
    @ColumnInfo(name = "total") val total: Double,
    @ColumnInfo(name = "discount") val discount: Double = 0.0,
    @ColumnInfo(name = "payment_method") val paymentMethod: String, // CASH, UPI, KHATA
    @ColumnInfo(name = "date") val date: String,
    @ColumnInfo(name = "time") val time: String
)

@Entity(tableName = "bill_items")
data class BillItemEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    @ColumnInfo(name = "bill_no") val billNo: Long,
    @ColumnInfo(name = "product_id") val productId: Long,
    @ColumnInfo(name = "product_name") val productName: String,
    @ColumnInfo(name = "quantity") val quantity: Double,
    @ColumnInfo(name = "price") val price: Double,
    @ColumnInfo(name = "amount") val amount: Double,
    @ColumnInfo(name = "cost_price") val costPrice: Double,
    @ColumnInfo(name = "profit") val profit: Double
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
