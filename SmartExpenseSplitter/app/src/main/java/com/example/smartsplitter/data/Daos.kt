package com.example.smartsplitter.data

import androidx.room.*
import kotlinx.coroutines.flow.Flow

@Dao
interface ExpenseDao {
    @Query("SELECT * FROM expenses ORDER BY date DESC")
    fun getAllExpenses(): Flow<List<Expense>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertExpense(expense: Expense)

    @Delete
    suspend fun deleteExpense(expense: Expense)

    @Query("DELETE FROM expenses")
    suspend fun deleteAllExpenses()
}

@Dao
interface ParticipantDao {
    @Query("SELECT * FROM participants ORDER BY name ASC")
    fun getAllParticipants(): Flow<List<Participant>>

    @Insert(onConflict = OnConflictStrategy.IGNORE)
    suspend fun insertParticipant(participant: Participant)

    @Delete
    suspend fun deleteParticipant(participant: Participant)

    @Query("DELETE FROM participants")
    suspend fun deleteAllParticipants()
    
    @Query("UPDATE participants SET name = :newName WHERE name = :oldName")
    suspend fun updateParticipantName(oldName: String, newName: String)
}
