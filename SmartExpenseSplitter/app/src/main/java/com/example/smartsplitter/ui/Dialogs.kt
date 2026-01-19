package com.example.smartsplitter.ui

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import com.example.smartsplitter.data.Expense
import com.example.smartsplitter.domain.CalculationResult

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AddExpenseDialog(
    participants: List<String>,
    onDismiss: () -> Unit,
    onConfirm: (Expense) -> Unit
) {
    var description by remember { mutableStateOf("") }
    var amount by remember { mutableStateOf("") }
    var payer by remember { mutableStateOf(participants.firstOrNull() ?: "") }
    var splitMode by remember { mutableStateOf("equal") } // "equal" only for MVP

    // Multi-select for equal split
    val selectedParticipants = remember { mutableStateMapOf<String, Boolean>().apply {
        participants.forEach { put(it, true) }
    }}

    if (participants.isEmpty()) {
        AlertDialog(
            onDismissRequest = onDismiss,
            title = { Text("No Participants") },
            text = { Text("Please add participants first.") },
            confirmButton = { TextButton(onClick = onDismiss) { Text("OK") } }
        )
        return
    }

    Dialog(onDismissRequest = onDismiss, properties = DialogProperties(usePlatformDefaultWidth = false)) {
        Surface(
            modifier = Modifier.fillMaxSize().padding(16.dp),
            shape = MaterialTheme.shapes.large
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Text("Add Expense", style = MaterialTheme.typography.headlineSmall)
                Spacer(modifier = Modifier.height(16.dp))

                OutlinedTextField(
                    value = description,
                    onValueChange = { description = it },
                    label = { Text("Description") },
                    modifier = Modifier.fillMaxWidth()
                )
                
                OutlinedTextField(
                    value = amount,
                    onValueChange = { amount = it },
                    label = { Text("Amount") },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    modifier = Modifier.fillMaxWidth()
                )

                Spacer(modifier = Modifier.height(8.dp))
                Text("Paid By:")
                // Simple dropdown alternative: Scrollable Row of chips
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    participants.forEach { p ->
                        FilterChip(
                            selected = payer == p,
                            onClick = { payer = p },
                            label = { Text(p) }
                        )
                    }
                }

                Spacer(modifier = Modifier.height(8.dp))
                Text("Split With:")
                LazyColumn(modifier = Modifier.weight(1f)) {
                    items(participants) { p ->
                        Row(verticalAlignment = androidx.compose.ui.Alignment.CenterVertically) {
                            Checkbox(
                                checked = selectedParticipants[p] == true,
                                onCheckedChange = { selectedParticipants[p] = it }
                            )
                            Text(p)
                        }
                    }
                }

                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.End) {
                    TextButton(onClick = onDismiss) { Text("Cancel") }
                    Button(onClick = {
                        val amountDouble = amount.toDoubleOrNull()
                        if (amountDouble != null && description.isNotBlank()) {
                            val involved = participants.filter { selectedParticipants[it] == true }
                            if (involved.isNotEmpty()) {
                                val share = amountDouble / involved.size
                                val splits = involved.associateWith { share }
                                
                                onConfirm(
                                    Expense(
                                        payer = payer,
                                        amount = amountDouble,
                                        description = description,
                                        participants = involved,
                                        splits = splits,
                                        splitMode = "equal"
                                    )
                                )
                            }
                        }
                    }) {
                        Text("Save")
                    }
                }
            }
        }
    }
}

@Composable
fun ResultsDialog(
    result: CalculationResult,
    onDismiss: () -> Unit
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Settlement Plan") },
        text = {
            LazyColumn {
                if (result.transactions.isEmpty()) {
                    item { Text("No debts to settle!") }
                } else {
                    items(result.transactions) { transaction ->
                        Card(
                            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer),
                            modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp)
                        ) {
                            Column(modifier = Modifier.padding(8.dp)) {
                                Text(
                                    text = "${transaction.from} pays ${transaction.to}",
                                    style = MaterialTheme.typography.titleMedium
                                )
                                Text(
                                    text = "Rs ${transaction.amount}",
                                    style = MaterialTheme.typography.bodyLarge
                                )
                            }
                        }
                    }
                }
            }
        },
        confirmButton = {
            TextButton(onClick = onDismiss) { Text("Close") }
        }
    )
}
