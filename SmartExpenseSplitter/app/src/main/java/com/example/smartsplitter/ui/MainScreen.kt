package com.example.smartsplitter.ui

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Calculate
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.PersonAdd
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.example.smartsplitter.data.Expense
import com.example.smartsplitter.domain.ExpenseViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MainScreen(
    viewModel: ExpenseViewModel = viewModel()
) {
    val expenses by viewModel.expenses.collectAsState()
    val participants by viewModel.participants.collectAsState()
    val calculationResult by viewModel.calculationResult.collectAsState()

    var showAddParticipantDialog by remember { mutableStateOf(false) }
    var showAddExpenseDialog by remember { mutableStateOf(false) }
    var showResultsDialog by remember { mutableStateOf(false) }

    // Effect to show results when calculation is ready
    LaunchedEffect(calculationResult) {
        if (calculationResult != null) {
            showResultsDialog = true
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Smart Splitter") },
                actions = {
                    IconButton(onClick = { viewModel.clearAll() }) {
                        Icon(Icons.Default.Delete, contentDescription = "Clear All")
                    }
                }
            )
        },
        floatingActionButton = {
            Column(
                horizontalAlignment = Alignment.End,
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                FloatingActionButton(
                    onClick = { showAddParticipantDialog = true },
                    containerColor = MaterialTheme.colorScheme.secondaryContainer
                ) {
                    Icon(Icons.Default.PersonAdd, contentDescription = "Add Person")
                }
                
                FloatingActionButton(
                    onClick = { showAddExpenseDialog = true },
                    containerColor = MaterialTheme.colorScheme.primaryContainer
                ) {
                    Icon(Icons.Default.Add, contentDescription = "Add Expense")
                }

                ExtendedFloatingActionButton(
                    onClick = { viewModel.calculateDebts() },
                    icon = { Icon(Icons.Default.Calculate, "Calculate") },
                    text = { Text("Calculate") }
                )
            }
        }
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .padding(paddingValues)
                .padding(16.dp)
                .fillMaxSize()
        ) {
            // Participants Section
            Text(
                text = "Participants (${participants.size})",
                style = MaterialTheme.typography.titleLarge,
                modifier = Modifier.padding(bottom = 8.dp)
            )
            
            LazyColumn(
                modifier = Modifier
                    .weight(0.3f)
                    .fillMaxWidth()
            ) {
                items(participants) { participant ->
                    AssistChip(
                        onClick = { },
                        label = { Text(participant.name) },
                        trailingIcon = {
                            IconButton(
                                onClick = { viewModel.removeParticipant(participant.name) },
                                modifier = Modifier.size(16.dp)
                            ) {
                                Icon(Icons.Default.Delete, "Remove")
                            }
                        },
                        modifier = Modifier.padding(end = 8.dp)
                    )
                }
            }

            Divider(modifier = Modifier.padding(vertical = 16.dp))

            // Expenses Section
            Text(
                text = "Expenses",
                style = MaterialTheme.typography.titleLarge,
                modifier = Modifier.padding(bottom = 8.dp)
            )

            LazyColumn(
                modifier = Modifier
                    .weight(0.7f)
                    .fillMaxWidth()
            ) {
                items(expenses) { expense ->
                    ExpenseCard(
                        expense = expense,
                        onDelete = { viewModel.deleteExpense(expense) }
                    )
                }
            }
        }
    }

    if (showAddParticipantDialog) {
        AddParticipantDialog(
            onDismiss = { showAddParticipantDialog = false },
            onConfirm = { name ->
                viewModel.addParticipant(name)
                showAddParticipantDialog = false
            }
        )
    }

    if (showAddExpenseDialog) {
        AddExpenseDialog(
            participants = participants.map { it.name },
            onDismiss = { showAddExpenseDialog = false },
            onConfirm = { expense ->
                viewModel.addExpense(expense)
                showAddExpenseDialog = false
            }
        )
    }

    if (showResultsDialog && calculationResult != null) {
        ResultsDialog(
            result = calculationResult!!,
            onDismiss = { showResultsDialog = false }
        )
    }
}
