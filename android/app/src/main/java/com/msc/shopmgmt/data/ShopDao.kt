package com.msc.shopmgmt.data

import androidx.room.*
import kotlinx.coroutines.flow.Flow
import java.text.SimpleDateFormat
import java.util.*

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

    @Query("SELECT credit_amount FROM khata_credit WHERE customerId = :cid")
    suspend fun getCustomerCredit(cid: Long): Double?

    @Query("SELECT * FROM khata WHERE customer_id = :cid AND status != 'cleared' ORDER BY date_added ASC")
    suspend fun getUnclearedDues(cid: Long): List<KhataDueEntity>

    @Update
    suspend fun updateKhataDue(due: KhataDueEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun saveCredit(credit: KhataCreditEntity)

    @Insert
    suspend fun insertPaymentRecord(record: KhataPaymentEntity): Long

    // Core oldest-first settlement engine
    @Transaction
    suspend fun settleKhataTransaction(customerId: Long, cashReceived: Double, note: String): SettleResult {
        val today = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(Date())
        val existingCredit = getCustomerCredit(customerId) ?: 0.0
        
        var remainingFunds = cashReceived + existingCredit
        val originalFunds = remainingFunds
        
        val dueBills = getUnclearedDues(customerId)
        var billsCleared = 0
        var billsPartiallyCleared = 0
        
        for (bill in dueBills) {
            val netDue = bill.amountDue - bill.amountPaid
            if (remainingFunds <= 0.0) break
            
            if (remainingFunds >= netDue) {
                val updatedBill = bill.copy(
                    amountPaid = bill.amountDue,
                    status = "cleared"
                )
                updateKhataDue(updatedBill)
                remainingFunds -= netDue
                billsCleared++
            } else {
                val updatedBill = bill.copy(
                    amountPaid = bill.amountPaid + remainingFunds,
                    status = "partial"
                )
                updateKhataDue(updatedBill)
                remainingFunds = 0.0
                billsPartiallyCleared++
            }
        }
        
        val finalCredit = if (remainingFunds > 0.0) remainingFunds else 0.0
        saveCredit(KhataCreditEntity(customerId, finalCredit, today))
        
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
