package com.example.smartsplitter.domain

import com.example.smartsplitter.data.Expense
import kotlin.math.abs
import kotlin.math.min
import kotlin.math.round

data class Transaction(
    val from: String,
    val to: String,
    val amount: Double
)

data class Debt(
    val from: String,
    val to: String,
    val amount: Double
)

data class CalculationResult(
    val transactions: List<Transaction>,
    val balances: Map<String, Double>,
    val originalDebts: List<Debt>
)

object CalculationUtils {

    fun calculate(expenses: List<Expense>, participants: List<String>): CalculationResult {
        if (expenses.isEmpty()) {
            return CalculationResult(emptyList(), emptyMap(), emptyList())
        }

        // 1. Calculate Original Debts
        val originalDebts = calculateOriginalDebts(expenses)

        // 2. Calculate Balances
        val balances = mutableMapOf<String, Double>()
        participants.forEach { balances[it] = 0.0 }

        expenses.forEach { expense ->
            val totalPaid = expense.splits.values.sum()
            
            // Payer receives money (positive balance)
            balances[expense.payer] = (balances[expense.payer] ?: 0.0) + totalPaid

            // Participants owe money (negative balance)
            expense.splits.forEach { (participant, amountOwed) ->
                if (participant != expense.payer) {
                    balances[participant] = (balances[participant] ?: 0.0) - amountOwed
                    // Note: We already added the totalPaid to payer above, which includes their own share if any.
                    // Wait, let's double check the logic from the JS version.
                    // JS: 
                    // balances[participant] -= amountOwed;
                    // balances[payer] += amountOwed;
                    
                    // Correcting logic to match JS exactly:
                    // The payer "paid" for everyone. So for each split:
                    // If A paid 100 for B: A gets +100, B gets -100.
                }
            }
        }
        
        // Re-verifying the balance logic from JS:
        /*
        expenses.forEach(({ payer, splits }) => {
            Object.entries(splits).forEach(([participant, amountOwed]) => {
                if (participant !== payer) {
                    balances[participant] -= amountOwed;
                    balances[payer] += amountOwed;
                }
            });
        });
        */
        // My Kotlin implementation above was slightly different (summing first). Let's stick to the JS logic exactly for safety.
        val finalBalances = mutableMapOf<String, Double>()
        participants.forEach { finalBalances[it] = 0.0 }
        
        expenses.forEach { expense ->
            expense.splits.forEach { (participant, amountOwed) ->
                if (participant != expense.payer) {
                    finalBalances[participant] = (finalBalances[participant] ?: 0.0) - amountOwed
                    finalBalances[expense.payer] = (finalBalances[expense.payer] ?: 0.0) + amountOwed
                }
            }
        }

        // 3. Simplify Debts (Minimize Transactions)
        val transactions = mutableListOf<Transaction>()
        val people = finalBalances.entries
            .filter { abs(it.value) > 0.01 }
            .sortedBy { it.value } // Ascending: Debtors (negative) first, Creditors (positive) last
            .map { MutablePair(it.key, it.value) }
            .toMutableList()

        var i = 0
        var j = people.size - 1

        while (i < j) {
            val debtor = people[i]
            val creditor = people[j]

            // debtor.value is negative, creditor.value is positive
            val amount = min(abs(debtor.value), creditor.value)

            if (amount > 0.01) {
                transactions.add(Transaction(debtor.key, creditor.key, round(amount * 100) / 100.0))
                debtor.value += amount
                creditor.value -= amount
            }

            if (abs(debtor.value) < 0.01) i++
            if (abs(creditor.value) < 0.01) j--
        }

        return CalculationResult(transactions, finalBalances, originalDebts)
    }

    private fun calculateOriginalDebts(expenses: List<Expense>): List<Debt> {
        val debtMap = mutableMapOf<String, Debt>()

        expenses.forEach { expense ->
            expense.splits.forEach { (participant, amountOwed) ->
                if (participant != expense.payer && amountOwed > 0) {
                    val key = "$participant->${expense.payer}"
                    val existing = debtMap[key]
                    if (existing != null) {
                        debtMap[key] = existing.copy(amount = existing.amount + amountOwed)
                    } else {
                        debtMap[key] = Debt(participant, expense.payer, amountOwed)
                    }
                }
            }
        }

        // Net out mutual debts
        val nettedDebts = mutableListOf<Debt>()
        val processedPairs = mutableSetOf<String>()

        debtMap.values.forEach { debt ->
            val pairKey1 = "${debt.from}-${debt.to}"
            val pairKey2 = "${debt.to}-${debt.from}"

            if (!processedPairs.contains(pairKey1) && !processedPairs.contains(pairKey2)) {
                val reverseKey = "${debt.to}->${debt.from}"
                val reverseDebt = debtMap[reverseKey]

                if (reverseDebt != null) {
                    val netAmount = abs(debt.amount - reverseDebt.amount)
                    if (netAmount > 0.01) {
                        if (debt.amount > reverseDebt.amount) {
                            nettedDebts.add(Debt(debt.from, debt.to, round(netAmount * 100) / 100.0))
                        } else {
                            nettedDebts.add(Debt(debt.to, debt.from, round(netAmount * 100) / 100.0))
                        }
                    }
                    processedPairs.add(pairKey1)
                    processedPairs.add(pairKey2)
                } else {
                    nettedDebts.add(debt.copy(amount = round(debt.amount * 100) / 100.0))
                    processedPairs.add(pairKey1)
                }
            }
        }

        return nettedDebts
    }
    
    // Helper class for mutable double values in the list
    private data class MutablePair(val key: String, var value: Double)
}
