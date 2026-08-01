package com.msc.shopmgmt.data

import android.content.Context
import androidx.room.*

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
                .fallbackToDestructiveMigration()
                .build()
                INSTANCE = instance
                instance
            }
        }
    }
}
