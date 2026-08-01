# Keep Room entities and DAOs
-keep class com.msc.shopmgmt.data.** { *; }
-keepclassmembers class * extends androidx.room.RoomDatabase {
    <init>();
}

# Keep Kotlin Serialization / Reflection rules if needed
-keepclassmembers class * {
    @androidx.room.* <methods>;
}

# Keep Compose rules
-keepclassmembers class * extends androidx.compose.ui.node.Owner { *; }
