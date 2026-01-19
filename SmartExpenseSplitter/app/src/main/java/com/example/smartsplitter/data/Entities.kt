package com.example.smartsplitter.data

import androidx.room.Entity
import androidx.room.PrimaryKey
import androidx.room.TypeConverters
import java.util.Date

@Entity(tableName = "expenses")
@TypeConverters(Converters::class)
data class Expense(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val payer: String,
    val amount: Double,
    val description: String,
    val participants: List<String>, // List of people involved
    val splits: Map<String, Double>, // Map of person -> amount owed
    val splitMode: String, // "equal" or "custom"
    val date: Date = Date()
)

@Entity(tableName = "participants")
data class Participant(
    @PrimaryKey val name: String
)
