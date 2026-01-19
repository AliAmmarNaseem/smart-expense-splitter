package com.example.smartsplitter.domain

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.example.smartsplitter.data.AppDatabase
import com.example.smartsplitter.data.Expense
import com.example.smartsplitter.data.Participant
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

class ExpenseViewModel(application: Application) : AndroidViewModel(application) {

    private val db = AppDatabase.getDatabase(application)
    private val expenseDao = db.expenseDao()
    private val participantDao = db.participantDao()

    val expenses = expenseDao.getAllExpenses()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val participants = participantDao.getAllParticipants()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    private val _calculationResult = MutableStateFlow<CalculationResult?>(null)
    val calculationResult: StateFlow<CalculationResult?> = _calculationResult

    fun addParticipant(name: String) {
        viewModelScope.launch {
            participantDao.insertParticipant(Participant(name))
        }
    }

    fun removeParticipant(name: String) {
        viewModelScope.launch {
            participantDao.deleteParticipant(Participant(name))
            // Also remove from expenses logic if needed, but for now just basic removal
        }
    }

    fun addExpense(expense: Expense) {
        viewModelScope.launch {
            expenseDao.insertExpense(expense)
            _calculationResult.value = null // Reset calculation
        }
    }

    fun deleteExpense(expense: Expense) {
        viewModelScope.launch {
            expenseDao.deleteExpense(expense)
            _calculationResult.value = null
        }
    }

    fun calculateDebts() {
        val currentExpenses = expenses.value
        val currentParticipants = participants.value.map { it.name }
        
        if (currentExpenses.isNotEmpty() && currentParticipants.isNotEmpty()) {
            val result = CalculationUtils.calculate(currentExpenses, currentParticipants)
            _calculationResult.value = result
        }
    }
    
    fun clearAll() {
        viewModelScope.launch {
            expenseDao.deleteAllExpenses()
            participantDao.deleteAllParticipants()
            _calculationResult.value = null
        }
    }
}
