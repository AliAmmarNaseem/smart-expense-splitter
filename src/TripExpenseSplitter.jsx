import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./components/ui/card";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Label } from "./components/ui/label";
import { Trash2, Calculator, Plus, Users, DollarSign, UserPlus, UserMinus, Download, Upload, Save, Edit2, X, Settings } from "lucide-react";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
// QRCode removed per user request

export default function TripExpenseSplitter() {
  const [participants, setParticipants] = useState([]);
  const [newParticipantName, setNewParticipantName] = useState("");
  const [tripName, setTripName] = useState("");
  const [expenses, setExpenses] = useState([]);
  const [payer, setPayer] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [customSplits, setCustomSplits] = useState({});
  const [splitMode, setSplitMode] = useState("equal"); // "equal" or "custom"
  const [result, setResult] = useState(null);
  const [totalExpense, setTotalExpense] = useState(0);
  const [lastSaved, setLastSaved] = useState(null);
  const [editingExpense, setEditingExpense] = useState(null);
  const [editPayer, setEditPayer] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editSplitMode, setEditSplitMode] = useState("equal");
  const [editCustomSplits, setEditCustomSplits] = useState({});
  const [pdfLanguage, setPdfLanguage] = useState("en"); // 'en' or 'ur'
  const [urduNameMap, setUrduNameMap] = useState({}); // { [englishName]: urduName }
  
  // Rename participant states
  const [renamingParticipant, setRenamingParticipant] = useState(null);
  const [newParticipantNameForRename, setNewParticipantNameForRename] = useState("");
  const [newParticipantUrduNameForRename, setNewParticipantUrduNameForRename] = useState("");
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [modalConfig, setModalConfig] = useState({
    type: 'info', // 'info', 'success', 'warning', 'error', 'confirm'
    title: '',
    message: '',
    onConfirm: null,
    confirmText: 'OK',
    cancelText: 'Cancel',
    showCancel: false
  });

  // Helper function to show modal
  const showCustomModal = (config) => {
    setModalConfig(config);
    setShowModal(true);
  };

  const hideModal = () => {
    setShowModal(false);
    setModalConfig({
      type: 'info',
      title: '',
      message: '',
      onConfirm: null,
      confirmText: 'OK',
      cancelText: 'Cancel',
      showCancel: false
    });
  };

  // Load data from localStorage on component mount
  useEffect(() => {
    const savedData = localStorage.getItem("tripExpensesData");
    if (savedData) {
      try {
        const {
          expenses: savedExpenses,
          participants: savedParticipants,
          lastSaved: savedLastSaved,
          tripName: savedTripName,
          pdfLanguage: savedPdfLanguage,
          urduNameMap: savedUrduNameMap
        } = JSON.parse(savedData);
        
        // Only load saved data if it has actual content
        if (savedExpenses && savedExpenses.length > 0) {
          setExpenses(savedExpenses);
          calculateTotal(savedExpenses);
        }
        
        if (savedParticipants && savedParticipants.length > 0) {
          setParticipants(savedParticipants);
          setPayer(savedParticipants[0]);
        }
        
        if (savedLastSaved) {
          setLastSaved(savedLastSaved);
        }
        
        if (savedTripName) {
          setTripName(savedTripName);
        }

        if (savedPdfLanguage === "en" || savedPdfLanguage === "ur") {
          setPdfLanguage(savedPdfLanguage);
        }

        if (savedUrduNameMap && typeof savedUrduNameMap === "object") {
          setUrduNameMap(savedUrduNameMap);
        }
      } catch (error) {
        console.error('Error loading saved data:', error);
        // Clear corrupted data
        localStorage.removeItem("tripExpensesData");
      }
    }
    // For new users, participants array is already empty from useState([])
  }, []);

  // Set initial payer when participants change
  useEffect(() => {
    if (participants.length > 0 && !payer) {
      setPayer(participants[0]);
    }
  }, [participants, payer]);

  // Save to localStorage whenever expenses or participants change
  useEffect(() => {
    // Only save if there's meaningful data or if we're clearing data
    if (expenses.length > 0 || participants.length > 0 || tripName.trim()) {
      const dataToSave = {
        expenses,
        participants,
        tripName,
        pdfLanguage,
        urduNameMap,
        lastSaved: new Date().toISOString()
      };
      localStorage.setItem("tripExpensesData", JSON.stringify(dataToSave));
      setLastSaved(new Date().toISOString());
    } else {
      // If everything is empty, clear localStorage
      localStorage.removeItem("tripExpensesData");
      setLastSaved(null);
    }
    calculateTotal(expenses);
  }, [expenses, participants, tripName, pdfLanguage, urduNameMap]);

  const calculateTotal = (expenseList) => {
    const total = expenseList.reduce((sum, expense) => sum + expense.amount, 0);
    setTotalExpense(total);
  };

  // Participant management functions
  const addParticipant = () => {
    const trimmedName = newParticipantName.trim();
    if (trimmedName && !participants.includes(trimmedName)) {
      setParticipants([...participants, trimmedName]);
      setNewParticipantName("");
      // Set as payer if it's the first participant
      if (participants.length === 0) {
        setPayer(trimmedName);
      }
    } else if (participants.includes(trimmedName)) {
      showCustomModal({
        type: 'warning',
        title: 'Participant Already Exists',
        message: 'This participant is already in the list. Please enter a different name.',
        confirmText: 'OK'
      });
    }
  };

  const startRenameParticipant = (participant) => {
    setRenamingParticipant(participant);
    setNewParticipantNameForRename(participant);
    setNewParticipantUrduNameForRename(urduNameMap?.[participant] || "");
  };

  const cancelRename = () => {
    setRenamingParticipant(null);
    setNewParticipantNameForRename("");
    setNewParticipantUrduNameForRename("");
  };

  const saveRename = () => {
    const trimmedName = newParticipantNameForRename.trim();
    const trimmedUrduName = newParticipantUrduNameForRename.trim();
    
    if (!trimmedName) {
      showCustomModal({
        type: 'warning',
        title: 'Invalid Name',
        message: 'Participant name cannot be empty.',
        confirmText: 'OK'
      });
      return;
    }

    const isNameChanged = trimmedName !== renamingParticipant;

    if (isNameChanged && participants.includes(trimmedName)) {
      showCustomModal({
        type: 'warning',
        title: 'Name Already Exists',
        message: 'A participant with this name already exists.',
        confirmText: 'OK'
      });
      return;
    }

    if (isNameChanged) {
      // Update participants list
      const updatedParticipants = participants.map(p => 
        p === renamingParticipant ? trimmedName : p
      );
      setParticipants(updatedParticipants);

      // Update expenses to reflect the name change
      const updatedExpenses = expenses.map(expense => ({
        ...expense,
        payer: expense.payer === renamingParticipant ? trimmedName : expense.payer,
        participants: expense.participants.map(p => p === renamingParticipant ? trimmedName : p),
        splits: Object.fromEntries(
          Object.entries(expense.splits).map(([participant, amount]) => [
            participant === renamingParticipant ? trimmedName : participant,
            amount
          ])
        )
      }));
      setExpenses(updatedExpenses);

      // Update payer if it was the renamed participant
      if (payer === renamingParticipant) {
        setPayer(trimmedName);
      }
    }

    // Update Urdu display name mapping (keep internal English keys stable)
    setUrduNameMap((prev) => {
      const next = { ...(prev || {}) };

      // If the English name key changed, move mapping to the new key
      if (isNameChanged) {
        if (Object.prototype.hasOwnProperty.call(next, renamingParticipant)) {
          next[trimmedName] = next[renamingParticipant];
          delete next[renamingParticipant];
        }
      }

      // Apply the new Urdu name (or remove if cleared)
      if (trimmedUrduName) {
        next[trimmedName] = trimmedUrduName;
      } else {
        delete next[trimmedName];
      }

      return next;
    });

    // Clear results as they need to be recalculated
    setResult(null);
    
    cancelRename();
    
    showCustomModal({
      type: 'success',
      title: 'Participant Renamed',
      message: isNameChanged
        ? `Successfully renamed "${renamingParticipant}" to "${trimmedName}".`
        : `Updated Urdu name for "${trimmedName}".`,
      confirmText: 'OK'
    });
  };

  const removeParticipant = (participantToRemove) => {
    if (participants.length <= 2) {
      showCustomModal({
        type: 'warning',
        title: 'Cannot Remove Participant',
        message: 'You need at least 2 participants to split expenses.',
        confirmText: 'OK'
      });
      return;
    }
    
    // Check if participant has any expenses
    const hasExpenses = expenses.some(expense => 
      expense.payer === participantToRemove || 
      (expense.participants && expense.participants.includes(participantToRemove))
    );
    
    if (hasExpenses) {
      showCustomModal({
        type: 'warning',
        title: 'Remove Participant',
        message: `${participantToRemove} has expenses recorded. Removing them will delete their expense history. Are you sure you want to continue?`,
        showCancel: true,
        confirmText: 'Remove',
        cancelText: 'Cancel',
        onConfirm: () => {
          // Remove expenses involving this participant
          const filteredExpenses = expenses.filter(expense => 
            expense.payer !== participantToRemove && 
            (!expense.participants || !expense.participants.includes(participantToRemove))
          );
          setExpenses(filteredExpenses);
          setResult(null);
          
          const newParticipants = participants.filter(p => p !== participantToRemove);
          setParticipants(newParticipants);
          
          // Update payer if the removed participant was the current payer
          if (payer === participantToRemove && newParticipants.length > 0) {
            setPayer(newParticipants[0]);
          }
          hideModal();
        }
      });
      return;
    }
    
    // If no expenses, proceed with removal
    const newParticipants = participants.filter(p => p !== participantToRemove);
    setParticipants(newParticipants);

    setUrduNameMap((prev) => {
      if (!prev) return prev;
      const next = { ...prev };
      delete next[participantToRemove];
      return next;
    });
    
    // Update payer if the removed participant was the current payer
    if (payer === participantToRemove && newParticipants.length > 0) {
      setPayer(newParticipants[0]);
    }
  };

  const addExpense = () => {
    if (!payer || !amount || !description.trim()) {
      showCustomModal({
        type: 'warning',
        title: 'Missing Information',
        message: 'Please fill in all required fields (payer, amount, and description).',
        confirmText: 'OK'
      });
      return;
    }

    const expenseAmount = parseFloat(amount);
    if (isNaN(expenseAmount) || expenseAmount <= 0) {
      showCustomModal({
        type: 'error',
        title: 'Invalid Amount',
        message: 'Please enter a valid amount greater than 0.',
        confirmText: 'OK'
      });
      return;
    }

    let expenseData;
    
    if (splitMode === "equal") {
      // Equal split - get participants who are selected
      const selectedParticipants = participants.filter(participant => customSplits[participant]?.selected);
      if (selectedParticipants.length === 0) {
        showCustomModal({
          type: 'warning',
          title: 'No Participants Selected',
          message: 'Please select at least one participant to split the expense with.',
          confirmText: 'OK'
        });
        return;
      }
      
      const sharePerPerson = expenseAmount / selectedParticipants.length;
      const splits = {};
      selectedParticipants.forEach(participant => {
        splits[participant] = sharePerPerson;
      });
      
      expenseData = {
        id: Date.now(),
        payer,
        amount: expenseAmount,
        description: description.trim(),
        participants: selectedParticipants,
        splits,
        splitMode: "equal",
        date: new Date().toLocaleDateString()
      };
    } else {
      // Custom split - validate amounts
      const participantsWithAmounts = participants.filter(participant => 
        customSplits[participant]?.amount && parseFloat(customSplits[participant].amount) > 0
      );
      
      if (participantsWithAmounts.length === 0) {
        showCustomModal({
          type: 'warning',
          title: 'No Amounts Entered',
          message: 'Please enter amounts for at least one participant.',
          confirmText: 'OK'
        });
        return;
      }
      
      const totalSplitAmount = participantsWithAmounts.reduce((sum, participant) => {
        return sum + parseFloat(customSplits[participant].amount);
      }, 0);
      
      if (Math.abs(totalSplitAmount - expenseAmount) > 0.01) {
        showCustomModal({
          type: 'error',
          title: 'Split Amount Mismatch',
          message: `Split amounts (${formatCurrency(totalSplitAmount)}) must equal the total expense amount (${formatCurrency(expenseAmount)}).`,
          confirmText: 'OK'
        });
        return;
      }
      
      const splits = {};
      participantsWithAmounts.forEach(participant => {
        splits[participant] = parseFloat(customSplits[participant].amount);
      });
      
      expenseData = {
        id: Date.now(),
        payer,
        amount: expenseAmount,
        description: description.trim(),
        participants: participantsWithAmounts,
        splits,
        splitMode: "custom",
        date: new Date().toLocaleDateString()
      };
    }
    
    setExpenses([...expenses, expenseData]);
    setAmount("");
    setDescription("");
    // Reset custom splits
    const resetSplits = {};
    participants.forEach(participant => {
      resetSplits[participant] = { selected: false, amount: "" };
    });
    setCustomSplits(resetSplits);
    setResult(null);
  };

  // Initialize custom splits when participants change
  useEffect(() => {
    const newSplits = {};
    participants.forEach(participant => {
      newSplits[participant] = customSplits[participant] || { selected: true, amount: "" };
    });
    setCustomSplits(newSplits);
  }, [participants]);

  const deleteExpense = (id) => {
    setExpenses(expenses.filter(expense => expense.id !== id));
    setResult(null); // Clear results when expenses change
  };

  const startEditExpense = (expense) => {
    setEditingExpense(expense);
    setEditPayer(expense.payer);
    setEditAmount(expense.amount.toString());
    setEditDescription(expense.description);
    setEditSplitMode(expense.splitMode);
    
    // Initialize edit custom splits
    const initialSplits = {};
    participants.forEach(participant => {
      initialSplits[participant] = {
        selected: expense.participants.includes(participant),
        amount: expense.splits[participant]?.toString() || ""
      };
    });
    setEditCustomSplits(initialSplits);
  };

  const cancelEditExpense = () => {
    setEditingExpense(null);
    setEditPayer("");
    setEditAmount("");
    setEditDescription("");
    setEditSplitMode("equal");
    setEditCustomSplits({});
  };

  const saveEditExpense = () => {
    if (!editPayer || !editAmount || !editDescription.trim()) {
      showCustomModal({
        type: 'warning',
        title: 'Missing Information',
        message: 'Please fill in all required fields (payer, amount, and description).',
        confirmText: 'OK'
      });
      return;
    }

    const expenseAmount = parseFloat(editAmount);
    if (isNaN(expenseAmount) || expenseAmount <= 0) {
      showCustomModal({
        type: 'error',
        title: 'Invalid Amount',
        message: 'Please enter a valid amount greater than 0.',
        confirmText: 'OK'
      });
      return;
    }

    let expenseData;
    
    if (editSplitMode === "equal") {
      // Equal split - get participants who are selected
      const selectedParticipants = participants.filter(participant => editCustomSplits[participant]?.selected);
      if (selectedParticipants.length === 0) {
        showCustomModal({
          type: 'warning',
          title: 'No Participants Selected',
          message: 'Please select at least one participant to split the expense with.',
          confirmText: 'OK'
        });
        return;
      }
      
      const sharePerPerson = expenseAmount / selectedParticipants.length;
      const splits = {};
      selectedParticipants.forEach(participant => {
        splits[participant] = sharePerPerson;
      });
      
      expenseData = {
        ...editingExpense,
        payer: editPayer,
        amount: expenseAmount,
        description: editDescription.trim(),
        participants: selectedParticipants,
        splits,
        splitMode: "equal"
      };
    } else {
      // Custom split - validate amounts
      const participantsWithAmounts = participants.filter(participant => 
        editCustomSplits[participant]?.amount && parseFloat(editCustomSplits[participant].amount) > 0
      );
      
      if (participantsWithAmounts.length === 0) {
        showCustomModal({
          type: 'warning',
          title: 'No Amounts Entered',
          message: 'Please enter amounts for at least one participant.',
          confirmText: 'OK'
        });
        return;
      }
      
      const totalSplitAmount = participantsWithAmounts.reduce((sum, participant) => {
        return sum + parseFloat(editCustomSplits[participant].amount);
      }, 0);
      
      if (Math.abs(totalSplitAmount - expenseAmount) > 0.01) {
        showCustomModal({
          type: 'error',
          title: 'Split Amount Mismatch',
          message: `Split amounts (${formatCurrency(totalSplitAmount)}) must equal the total expense amount (${formatCurrency(expenseAmount)}).`,
          confirmText: 'OK'
        });
        return;
      }
      
      const splits = {};
      participantsWithAmounts.forEach(participant => {
        splits[participant] = parseFloat(editCustomSplits[participant].amount);
      });
      
      expenseData = {
        ...editingExpense,
        payer: editPayer,
        amount: expenseAmount,
        description: editDescription.trim(),
        participants: participantsWithAmounts,
        splits,
        splitMode: "custom"
      };
    }
    
    setExpenses(expenses.map(expense => 
      expense.id === editingExpense.id ? expenseData : expense
    ));
    setResult(null); // Clear results when expenses change
    cancelEditExpense();
  };

  const clearAllExpenses = () => {
    showCustomModal({
      type: 'warning',
      title: 'Clear All Expenses',
      message: 'Are you sure you want to clear all expenses? This action cannot be undone.',
      showCancel: true,
      confirmText: 'Clear All',
      cancelText: 'Cancel',
      onConfirm: () => {
        setExpenses([]);
        setResult(null);
        hideModal();
      }
    });
  };

  const clearAllData = () => {
    showCustomModal({
      type: 'warning',
      title: 'Clear All Data',
      message: 'Are you sure you want to clear all data including participants and expenses? This will reset everything to default and cannot be undone.',
      showCancel: true,
      confirmText: 'Clear All',
      cancelText: 'Cancel',
      onConfirm: () => {
        setExpenses([]);
        setParticipants([]);
        setPayer("");
        setTripName("");
        setResult(null);
        setCustomSplits({});
        localStorage.removeItem("tripExpensesData");
        hideModal();
      }
    });
  };

  // Helper function to calculate original debt relationships
  const calculateOriginalDebts = () => {
    const debtMap = {};
    
    // Accumulate all debts between person pairs
    expenses.forEach(({ payer, splits }) => {
      Object.entries(splits).forEach(([participant, amountOwed]) => {
        if (participant !== payer && amountOwed > 0) {
          const debtKey = `${participant}->${payer}`;
          if (!debtMap[debtKey]) {
            debtMap[debtKey] = {
              from: participant,
              to: payer,
              amount: 0
            };
          }
          debtMap[debtKey].amount += amountOwed;
        }
      });
    });
    
    // Net out mutual debts between person pairs
    const processedPairs = new Set();
    const nettedDebts = [];
    
    Object.values(debtMap).forEach(debt => {
      const pairKey1 = `${debt.from}-${debt.to}`;
      const pairKey2 = `${debt.to}-${debt.from}`;
      
      // Skip if we've already processed this pair
      if (processedPairs.has(pairKey1) || processedPairs.has(pairKey2)) {
        return;
      }
      
      // Look for reverse debt
      const reverseDebtKey = `${debt.to}->${debt.from}`;
      const reverseDebt = debtMap[reverseDebtKey];
      
      if (reverseDebt) {
        // Both people owe each other - net them out
        const netAmount = Math.abs(debt.amount - reverseDebt.amount);
        
        if (netAmount > 0.01) { // Only include if significant amount after netting
          if (debt.amount > reverseDebt.amount) {
            nettedDebts.push({
              from: debt.from,
              to: debt.to,
              amount: Math.round(netAmount * 100) / 100
            });
          } else {
            nettedDebts.push({
              from: debt.to,
              to: debt.from,
              amount: Math.round(netAmount * 100) / 100
            });
          }
        }
        
        // Mark both directions as processed
        processedPairs.add(pairKey1);
        processedPairs.add(pairKey2);
      } else {
        // Only one-way debt exists
        nettedDebts.push({
          from: debt.from,
          to: debt.to,
          amount: Math.round(debt.amount * 100) / 100
        });
        
        processedPairs.add(pairKey1);
      }
    });
    
    return nettedDebts;
  };

  const calculate = () => {
    if (expenses.length === 0) {
      showCustomModal({
        type: 'info',
        title: 'No Expenses to Calculate',
        message: 'Please add some expenses first before calculating settlements.',
        confirmText: 'OK'
      });
      return;
    }

    // Calculate original debt relationships
    const originalDebts = calculateOriginalDebts();

    // Initialize balances for all participants
    const balances = {};
    participants.forEach(participant => {
      balances[participant] = 0;
    });
    
    // Calculate balances based on expenses
    expenses.forEach(({ payer, splits }) => {
      // Add total amount paid to payer's balance
      const totalPaid = Object.values(splits).reduce((sum, amount) => sum + amount, 0);
      
      // For each participant in the split
      Object.entries(splits).forEach(([participant, amountOwed]) => {
        if (participant !== payer) {
          // Participant owes money (negative balance)
          balances[participant] -= amountOwed;
          // Payer should receive money (positive balance)
          balances[payer] += amountOwed;
        }
        // If participant === payer, they don't owe themselves
      });
    });

    // Calculate minimum transactions needed (optimized settlements)
    const transactions = [];
    const people = Object.entries(balances)
      .filter(([, balance]) => Math.abs(balance) > 0.01) // Filter out zero balances
      .sort((a, b) => a[1] - b[1]); // Sort by balance (debtors first, creditors last)
    
    let i = 0, j = people.length - 1;
    
    while (i < j) {
      const [debtor, debtAmt] = people[i];
      const [creditor, creditAmt] = people[j];
      const settledAmt = Math.min(-debtAmt, creditAmt);
      
      if (settledAmt > 0.01) { // Avoid tiny amounts due to floating point precision
        transactions.push({
          from: debtor,
          to: creditor,
          amount: settledAmt
        });
        people[i][1] += settledAmt;
        people[j][1] -= settledAmt;
      }
      
      if (Math.abs(people[i][1]) < 0.01) i++;
      if (Math.abs(people[j][1]) < 0.01) j--;
    }
    
    setResult({ transactions, balances, originalDebts });
  };

  const formatCurrency = (amount) => `Rs ${amount.toFixed(2)}`;

  const displayNameForLanguage = (name, language = "en") => {
    if (language !== "ur") return name;
    const mapped = urduNameMap?.[name];
    return mapped && mapped.trim() ? mapped.trim() : name;
  };

  const getSettlementSummaryBullets = (language = "en") => {
    if (!result) {
      return [
        language === "ur"
          ? "حساب کتاب دیکھنے کے لیے \"Calculate Settlement\" پر کلک کریں۔"
          : "Click \"Calculate Settlement\" to see who needs to pay whom."
      ];
    }

    if (!result.transactions || result.transactions.length === 0) {
      return [
        language === "ur"
          ? "سب حساب برابر ہے، کسی پر کسی کا قرض نہیں ہے۔"
          : "All expenses are settled. No one owes anything to anyone."
      ];
    }

    return result.transactions.map((t) => {
      const amountText = formatCurrency(t.amount);
      const fromName = displayNameForLanguage(t.from, language);
      const toName = displayNameForLanguage(t.to, language);
      if (language === "ur") {
        return `${fromName} نے ${toName} کو ${amountText} دینا ہے`;
      }
      return `${fromName} pays ${toName} ${amountText}`;
    });
  };

  const createUrduPdfReportElement = () => {
    const bullets = getSettlementSummaryBullets("ur");

    const dateRange = expenses.length > 0 
      ? expenses.length === 1 
        ? expenses[0].date
        : `${expenses[0].date} - ${expenses[expenses.length - 1].date}`
      : '—';

    const settlementStatus = !result
      ? 'حساب نہیں کیا گیا'
      : (result.transactions.length === 0 ? 'سب حساب برابر' : `${result.transactions.length} ادائیگیاں درکار ہیں`);

    const wrapper = document.createElement('div');
    wrapper.setAttribute('dir', 'rtl');
    wrapper.style.width = '794px'; // ~A4 at 96dpi
    wrapper.style.padding = '0';
    wrapper.style.margin = '0';
    wrapper.style.fontFamily = '"Noto Nastaliq Urdu", "Jameel Noori Nastaleeq", Nafees, "Urdu Typesetting", "Arabic Typesetting", "Traditional Arabic", Arial, sans-serif';
    wrapper.style.color = '#111827';
    wrapper.style.background = '#ffffff';

    // Header
    const header = document.createElement('div');
    header.style.background = '#3B82F6';
    header.style.padding = '24px 28px';
    header.style.display = 'flex';
    header.style.alignItems = 'center';
    header.style.gap = '16px';

    const badge = document.createElement('div');
    badge.style.width = '44px';
    badge.style.height = '44px';
    badge.style.borderRadius = '9999px';
    badge.style.background = '#ffffff';
    badge.style.display = 'flex';
    badge.style.alignItems = 'center';
    badge.style.justifyContent = 'center';
    badge.style.color = '#3B82F6';
    badge.style.fontWeight = '700';
    badge.textContent = '$';

    const headerText = document.createElement('div');
    const h1 = document.createElement('div');
    h1.style.fontSize = '22px';
    h1.style.fontWeight = '800';
    h1.style.color = '#ffffff';
    h1.textContent = 'اخراجات تصفیہ رپورٹ';
    const h2 = document.createElement('div');
    h2.style.fontSize = '13px';
    h2.style.fontWeight = '600';
    h2.style.color = 'rgba(255,255,255,0.9)';
    h2.textContent = tripName || 'مشترکہ اخراجات';
    headerText.appendChild(h1);
    headerText.appendChild(h2);

    header.appendChild(badge);
    header.appendChild(headerText);
    wrapper.appendChild(header);

    const content = document.createElement('div');
    content.style.padding = '26px 28px';

    // Executive Summary Section
    const title = document.createElement('div');
    title.style.fontSize = '16px';
    title.style.fontWeight = '800';
    title.style.marginBottom = '10px';
    title.textContent = 'خلاصہ';
    content.appendChild(title);

    const ul = document.createElement('ul');
    ul.style.margin = '0 0 16px 0';
    ul.style.paddingRight = '18px';
    ul.style.paddingLeft = '0';
    ul.style.fontSize = '13px';
    ul.style.lineHeight = '1.7';
    bullets.forEach((b) => {
      const li = document.createElement('li');
      li.textContent = b;
      ul.appendChild(li);
    });
    content.appendChild(ul);

    // Metrics Table
    const metricsTitle = document.createElement('div');
    metricsTitle.style.fontSize = '14px';
    metricsTitle.style.fontWeight = '800';
    metricsTitle.style.margin = '16px 0 10px';
    metricsTitle.textContent = 'میٹرکس';
    content.appendChild(metricsTitle);

    const table = document.createElement('table');
    table.style.width = '100%';
    table.style.borderCollapse = 'collapse';
    table.style.fontSize = '12px';
    table.style.marginBottom = '20px';

    const rows = [
      ['کل رقم', formatCurrency(totalExpense)],
      ['شرکاء', `${participants.length} افراد`],
      ['اخراجات', `${expenses.length} لین دین`],
      ['تاریخ کی مدت', dateRange],
      ['تصفیہ کی حالت', settlementStatus],
    ];

    rows.forEach(([k, v], idx) => {
      const tr = document.createElement('tr');
      const td1 = document.createElement('td');
      const td2 = document.createElement('td');
      td1.textContent = k;
      td2.textContent = v;
      td1.style.border = '1px solid #e5e7eb';
      td2.style.border = '1px solid #e5e7eb';
      td1.style.padding = '8px 10px';
      td2.style.padding = '8px 10px';
      td1.style.fontWeight = '700';
      td2.style.textAlign = 'left';
      if (idx % 2 === 0) {
        td1.style.background = '#f9fafb';
        td2.style.background = '#f9fafb';
      }
      tr.appendChild(td1);
      tr.appendChild(td2);
      table.appendChild(tr);
    });
    content.appendChild(table);

    // Participants Section
    if (participants.length > 0) {
      const participantsTitle = document.createElement('div');
      participantsTitle.style.fontSize = '16px';
      participantsTitle.style.fontWeight = '800';
      participantsTitle.style.marginTop = '20px';
      participantsTitle.style.marginBottom = '10px';
      participantsTitle.textContent = 'شرکاء';
      content.appendChild(participantsTitle);

      const participantsTable = document.createElement('table');
      participantsTable.style.width = '100%';
      participantsTable.style.borderCollapse = 'collapse';
      participantsTable.style.fontSize = '11px';
      participantsTable.style.marginBottom = '20px';

      // Table header
      const thead = document.createElement('thead');
      const headerRow = document.createElement('tr');
      ['نام', 'کل ادائیگی', 'کل حصہ', 'خالص بیلنس'].forEach((headerText) => {
        const th = document.createElement('th');
        th.textContent = headerText;
        th.style.background = '#10b981';
        th.style.color = '#ffffff';
        th.style.padding = '8px';
        th.style.border = '1px solid #059669';
        th.style.fontWeight = '700';
        headerRow.appendChild(th);
      });
      thead.appendChild(headerRow);
      participantsTable.appendChild(thead);

      // Table body
      const tbody = document.createElement('tbody');
      participants.forEach((participant, idx) => {
        const totalPaid = expenses
          .filter(expense => expense.payer === participant)
          .reduce((sum, expense) => sum + expense.amount, 0);
        
        const totalOwed = expenses
          .filter(expense => expense.participants.includes(participant))
          .reduce((sum, expense) => sum + (expense.splits[participant] || 0), 0);
        
        const displayName = urduNameMap[participant] || participant;
        
        const tr = document.createElement('tr');
        if (idx % 2 === 0) {
          tr.style.background = '#f3f4f6';
        }
        
        [displayName, formatCurrency(totalPaid), formatCurrency(totalOwed), formatCurrency(totalPaid - totalOwed)].forEach((cellText, cellIdx) => {
          const td = document.createElement('td');
          td.textContent = cellText;
          td.style.padding = '6px 8px';
          td.style.border = '1px solid #e5e7eb';
          if (cellIdx === 0) {
            td.style.fontWeight = '700';
          } else {
            td.style.textAlign = 'left';
          }
          if (cellIdx === 3) {
            td.style.fontWeight = '700';
          }
          tr.appendChild(td);
        });
        tbody.appendChild(tr);
      });
      participantsTable.appendChild(tbody);
      content.appendChild(participantsTable);
    }

    // Detailed Expenses Section
    if (expenses.length > 0) {
      const expensesTitle = document.createElement('div');
      expensesTitle.style.fontSize = '16px';
      expensesTitle.style.fontWeight = '800';
      expensesTitle.style.marginTop = '20px';
      expensesTitle.style.marginBottom = '10px';
      expensesTitle.textContent = 'تفصیلی اخراجات';
      content.appendChild(expensesTitle);

      const expensesTable = document.createElement('table');
      expensesTable.style.width = '100%';
      expensesTable.style.borderCollapse = 'collapse';
      expensesTable.style.fontSize = '10px';
      expensesTable.style.marginBottom = '20px';

      // Table header
      const expHead = document.createElement('thead');
      const expHeaderRow = document.createElement('tr');
      ['#', 'تاریخ', 'تفصیل', 'کس نے ادا کیا', 'رقم', 'شرکاء'].forEach((headerText) => {
        const th = document.createElement('th');
        th.textContent = headerText;
        th.style.background = '#f59e0b';
        th.style.color = '#ffffff';
        th.style.padding = '6px 4px';
        th.style.border = '1px solid #d97706';
        th.style.fontWeight = '700';
        expHeaderRow.appendChild(th);
      });
      expHead.appendChild(expHeaderRow);
      expensesTable.appendChild(expHead);

      // Table body
      const expBody = document.createElement('tbody');
      expenses.forEach((expense, idx) => {
        const tr = document.createElement('tr');
        if (idx % 2 === 0) {
          tr.style.background = '#fffbeb';
        }
        
        const payerName = urduNameMap[expense.payer] || expense.payer;
        const participantNames = expense.participants.map(p => urduNameMap[p] || p).join('، ');
        
        [(idx + 1).toString(), expense.date, expense.description, payerName, formatCurrency(expense.amount), participantNames].forEach((cellText, cellIdx) => {
          const td = document.createElement('td');
          td.textContent = cellText;
          td.style.padding = '4px';
          td.style.border = '1px solid #fde68a';
          if (cellIdx === 0) {
            td.style.textAlign = 'center';
            td.style.fontWeight = '700';
          }
          if (cellIdx === 4) {
            td.style.textAlign = 'left';
            td.style.fontWeight = '700';
          }
          tr.appendChild(td);
        });
        expBody.appendChild(tr);
      });
      expensesTable.appendChild(expBody);
      content.appendChild(expensesTable);
    }

    // Settlement Instructions Section
    if (result) {
      const settlementTitle = document.createElement('div');
      settlementTitle.style.fontSize = '16px';
      settlementTitle.style.fontWeight = '800';
      settlementTitle.style.marginTop = '20px';
      settlementTitle.style.marginBottom = '10px';
      settlementTitle.textContent = 'ادائیگی کی ہدایات';
      content.appendChild(settlementTitle);

      if (result.transactions.length === 0) {
        const congratsBox = document.createElement('div');
        congratsBox.style.background = '#dcfce7';
        congratsBox.style.padding = '15px';
        congratsBox.style.borderRadius = '8px';
        congratsBox.style.textAlign = 'center';
        congratsBox.style.marginBottom = '20px';
        
        const congratsText = document.createElement('div');
        congratsText.style.fontSize = '14px';
        congratsText.style.fontWeight = '700';
        congratsText.style.color = '#16a34a';
        congratsText.textContent = 'مبارک ہو! تمام اخراجات کا حساب برابر ہو چکا ہے۔';
        congratsBox.appendChild(congratsText);
        content.appendChild(congratsBox);
      } else {
        // Original Debts
        if (result.originalDebts && result.originalDebts.length > 0) {
          const origDebtsTitle = document.createElement('div');
          origDebtsTitle.style.fontSize = '14px';
          origDebtsTitle.style.fontWeight = '700';
          origDebtsTitle.style.marginTop = '10px';
          origDebtsTitle.style.marginBottom = '8px';
          origDebtsTitle.textContent = 'اصل قرض کے تعلقات';
          content.appendChild(origDebtsTitle);

          result.originalDebts.forEach((debt, idx) => {
            const debtBox = document.createElement('div');
            debtBox.style.background = '#fff7ed';
            debtBox.style.padding = '8px 12px';
            debtBox.style.borderRadius = '6px';
            debtBox.style.marginBottom = '6px';
            debtBox.style.border = '1px solid #fed7aa';
            debtBox.style.display = 'flex';
            debtBox.style.justifyContent = 'space-between';
            debtBox.style.alignItems = 'center';
            
            const debtText = document.createElement('span');
            debtText.style.fontSize = '11px';
            const fromName = urduNameMap[debt.from] || debt.from;
            const toName = urduNameMap[debt.to] || debt.to;
            debtText.textContent = `${fromName} نے ${toName} کو دینا ہے`;
            
            const debtAmount = document.createElement('span');
            debtAmount.style.fontSize = '12px';
            debtAmount.style.fontWeight = '700';
            debtAmount.style.color = '#ea580c';
            debtAmount.textContent = formatCurrency(debt.amount);
            
            debtBox.appendChild(debtText);
            debtBox.appendChild(debtAmount);
            content.appendChild(debtBox);
          });
        }

        // Optimized Settlement
        const optSettlementTitle = document.createElement('div');
        optSettlementTitle.style.fontSize = '14px';
        optSettlementTitle.style.fontWeight = '700';
        optSettlementTitle.style.marginTop = '15px';
        optSettlementTitle.style.marginBottom = '8px';
        optSettlementTitle.textContent = 'بہترین ادائیگی پلان (تجویز کردہ)';
        content.appendChild(optSettlementTitle);

        result.transactions.forEach((transaction, idx) => {
          const transBox = document.createElement('div');
          transBox.style.background = '#dcfce7';
          transBox.style.padding = '8px 12px';
          transBox.style.borderRadius = '6px';
          transBox.style.marginBottom = '6px';
          transBox.style.border = '1px solid #86efac';
          transBox.style.display = 'flex';
          transBox.style.justifyContent = 'space-between';
          transBox.style.alignItems = 'center';
          
          const transText = document.createElement('span');
          transText.style.fontSize = '11px';
          const fromName = urduNameMap[transaction.from] || transaction.from;
          const toName = urduNameMap[transaction.to] || transaction.to;
          transText.textContent = `مرحلہ ${idx + 1}: ${fromName} نے ${toName} کو ادائیگی کرنی ہے`;
          
          const transAmount = document.createElement('span');
          transAmount.style.fontSize = '12px';
          transAmount.style.fontWeight = '700';
          transAmount.style.color = '#16a34a';
          transAmount.textContent = formatCurrency(transaction.amount);
          
          transBox.appendChild(transText);
          transBox.appendChild(transAmount);
          content.appendChild(transBox);
        });
      }
    }

    const footer = document.createElement('div');
    footer.style.marginTop = '20px';
    footer.style.paddingTop = '15px';
    footer.style.borderTop = '1px solid #e5e7eb';
    footer.style.fontSize = '10px';
    footer.style.color = '#6b7280';
    footer.style.textAlign = 'center';
    footer.textContent = `تیار کردہ: ${new Date().toLocaleDateString('ur-PK')} ${new Date().toLocaleTimeString('ur-PK')} | سمارٹ اخراجات اسپلٹر`;
    content.appendChild(footer);

    wrapper.appendChild(content);
    return wrapper;
  };

  // Data Export Function
  const exportData = () => {
    const dataToExport = {
      participants,
      expenses,
      tripName,
      totalExpense,
      lastUpdated: new Date().toISOString(),
      version: "1.0"
    };
    
    const dataStr = JSON.stringify(dataToExport, null, 2);
    console.log('Exporting data:', dataToExport);
    
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `expense-splitter-data-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    showCustomModal({
      type: 'success',
      title: 'Export Successful',
      message: 'Data exported successfully! Check your downloads folder.',
      confirmText: 'OK'
    });
  };

  // Data Import Function
  const importData = (event) => {
    const file = event.target.files[0];
    if (!file) {
      console.log('No file selected');
      return;
    }

    console.log('File selected:', file.name, file.size, 'bytes');

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        console.log('File content length:', e.target.result.length);
        const importedData = JSON.parse(e.target.result);
        console.log('Parsed data:', importedData);
        
        // Validate the imported data
        if (!importedData.participants || !Array.isArray(importedData.participants)) {
          showCustomModal({
            type: 'error',
            title: 'Invalid File Format',
            message: 'Invalid data format: missing or invalid participants array. Please select a valid expense splitter backup file.',
            confirmText: 'OK'
          });
          return;
        }

        if (!importedData.expenses || !Array.isArray(importedData.expenses)) {
          showCustomModal({
            type: 'error',
            title: 'Invalid File Format',
            message: 'Invalid data format: missing or invalid expenses array. Please select a valid expense splitter backup file.',
            confirmText: 'OK'
          });
          return;
        }

        // Confirm import
        const tripInfo = importedData.tripName ? `\n- Trip: ${importedData.tripName}` : '';
        showCustomModal({
          type: 'warning',
          title: 'Import Data',
          message: `This will replace all current data with:\n- ${importedData.participants.length} participants\n- ${importedData.expenses.length} expenses${tripInfo}\n\nAre you sure you want to import?`,
          showCancel: true,
          confirmText: 'Import',
          cancelText: 'Cancel',
          onConfirm: () => {
            setParticipants(importedData.participants);
            setExpenses(importedData.expenses);
            setTripName(importedData.tripName || '');
            setResult(null); // Clear any existing results
            setPayer(importedData.participants[0] || ''); // Set first participant as payer
            hideModal();
            showCustomModal({
              type: 'success',
              title: 'Import Successful',
              message: 'Data imported successfully!',
              confirmText: 'OK'
            });
          }
        });
      } catch (error) {
        console.error('Import error:', error);
        showCustomModal({
          type: 'error',
          title: 'Import Error',
          message: 'Error reading file. Please make sure it\'s a valid JSON backup file.',
          confirmText: 'OK'
        });
      }
    };

    reader.onerror = (error) => {
      console.error('FileReader error:', error);
      showCustomModal({
        type: 'error',
        title: 'File Read Error',
        message: 'Error reading the file. Please try again.',
        confirmText: 'OK'
      });
    };

    reader.readAsText(file);
    
    // Reset the input so the same file can be selected again
    event.target.value = '';
  };
  const downloadUrduPDF = async () => {
    try {
      console.log('Starting Urdu PDF generation with HTML-to-canvas...');
      
      // Create the Urdu report element
      const reportElement = createUrduPdfReportElement();
      
      // Temporarily add to document for rendering
      reportElement.style.position = 'absolute';
      reportElement.style.left = '-9999px';
      reportElement.style.top = '0';
      document.body.appendChild(reportElement);
      
      // Wait for fonts to load
      await document.fonts.ready;
      
      // Use html2canvas to convert the HTML to canvas
      const canvas = await html2canvas(reportElement, {
        scale: 2, // Higher quality
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });
      
      // Remove the temporary element
      document.body.removeChild(reportElement);
      
      // Create PDF from canvas
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: 'a4'
      });
      
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pageWidth / imgWidth, pageHeight / imgHeight);
      const imgX = (pageWidth - imgWidth * ratio) / 2;
      const imgY = 0;
      
      pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth * ratio, imgHeight * ratio);
      
      // Save the PDF
      const filename = tripName 
        ? `${tripName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_settlement_${new Date().toISOString().split('T')[0]}.pdf`
        : `expense_settlement_${new Date().toISOString().split('T')[0]}.pdf`;
      
      pdf.save(filename);
      
      console.log('Urdu PDF generated successfully');
      showCustomModal({
        type: 'success',
        title: 'PDF Generated',
        message: 'Urdu PDF report downloaded successfully!',
        confirmText: 'OK'
      });
      
    } catch (error) {
      console.error('Urdu PDF generation error:', error);
      showCustomModal({
        type: 'error',
        title: 'PDF Generation Failed',
        message: `Failed to generate Urdu PDF: ${error.message}. Make sure html2canvas library is installed.`,
        confirmText: 'OK'
      });
    }
  };

  const downloadPDF = async () => {
    try {
      console.log('Starting enhanced PDF generation...');
      
      if (typeof jsPDF === 'undefined') {
        throw new Error('jsPDF is not available');
      }

      const isUrdu = pdfLanguage === "ur";

      // For Urdu PDFs, use HTML-to-canvas approach for better font rendering
      if (isUrdu) {
        await downloadUrduPDF();
        return;
      }

      // English PDF generation (original code)
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.width;
      const pageHeight = doc.internal.pageSize.height;
      const margin = 20;
      
      // Calculate date range
      const dateRange = expenses.length > 0 
        ? expenses.length === 1 
          ? expenses[0].date
          : `${expenses[0].date} - ${expenses[expenses.length - 1].date}`
        : 'No expenses recorded';
      
      // HEADER SECTION
      // Background header
      doc.setFillColor(59, 130, 246);
      doc.rect(0, 0, pageWidth, 35, 'F');
      
      // Logo/Icon placeholder (circle)
      doc.setFillColor(255, 255, 255);
      doc.circle(30, 17.5, 8, 'F');
      doc.setTextColor(59, 130, 246);
      doc.setFontSize(14);
      doc.text('$', 30, 21, { align: 'center' });
      
      // Main title
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      const mainTitle = isUrdu ? 'اخراجات تصفیہ رپورٹ' : 'EXPENSE SETTLEMENT REPORT';
      doc.text(mainTitle, 50, 18);

      // Trip name or default
      doc.setFontSize(12);
      doc.text(tripName || (isUrdu ? 'مشترکہ اخراجات' : 'Shared Expenses'), 50, 28);

      let yPos = 55;

      // EXECUTIVE SUMMARY SECTION
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(16);
      const summaryTitle = isUrdu ? 'خلاصہ' : 'EXECUTIVE SUMMARY';
      doc.text(summaryTitle, margin, yPos);
      yPos += 10;

      // Summary bullets (who pays whom)
      const bullets = getSettlementSummaryBullets(pdfLanguage);
      doc.setFontSize(12);
      const bulletMaxWidth = pageWidth - 2 * margin;
      bullets.forEach((b) => {
        const lines = doc.splitTextToSize(`${isUrdu ? '• ' : '- '}${b}`, bulletMaxWidth);
        doc.text(lines, isUrdu ? pageWidth - margin : margin, yPos, { align: isUrdu ? 'right' : 'left' });
        yPos += (lines.length * 6) + 2;
      });
      yPos += 6;

      // Summary cards
      const summaryData = [
        [
          isUrdu ? 'کل رقم' : 'Total Amount',
          formatCurrency(totalExpense)
        ],
        [
          isUrdu ? 'شرکاء' : 'Participants',
          isUrdu ? `${participants.length} افراد` : `${participants.length} people`
        ],
        [
          isUrdu ? 'اخراجات' : 'Expenses',
          isUrdu ? `${expenses.length} لین دین` : `${expenses.length} transactions`
        ],
        [
          isUrdu ? 'تاریخ کی مدت' : 'Date Range',
          dateRange
        ],
        [
          isUrdu ? 'تصفیہ کی حالت' : 'Settlement Status',
          result
            ? result.transactions.length === 0
              ? isUrdu ? 'سب حساب برابر' : 'All Settled'
              : isUrdu
                ? `${result.transactions.length} ادائیگیاں درکار ہیں`
                : `${result.transactions.length} payments needed`
            : isUrdu ? 'حساب نہیں کیا گیا' : 'Not calculated'
        ]
      ];
      
      // Create summary table
      autoTable(doc, {
        startY: yPos,
        head: [[isUrdu ? 'میٹرک' : 'Metric', isUrdu ? 'قدر' : 'Value']],
        body: summaryData,
        theme: 'grid',
        headStyles: { fillColor: [59, 130, 246], textColor: 255 },
        styles: { fontSize: 11, cellPadding: 4 },
        columnStyles: { 0: { fontStyle: 'bold' }, 1: { halign: 'right' } },
        margin: { left: margin, right: margin }
      });
      
      yPos = (doc.lastAutoTable && doc.lastAutoTable.finalY) ? doc.lastAutoTable.finalY + 20 : yPos + 60;
      
      // PARTICIPANTS SECTION
      if (yPos > pageHeight - 60) {
        doc.addPage();
        yPos = 30;
      }
      
      doc.setFontSize(16);
      doc.text(isUrdu ? 'شرکاء' : 'PARTICIPANTS', margin, yPos);
      yPos += 15;
      
      const participantSummary = participants.map(participant => {
        const totalPaid = expenses
          .filter(expense => expense.payer === participant)
          .reduce((sum, expense) => sum + expense.amount, 0);
        
        const totalOwed = expenses
          .filter(expense => expense.participants.includes(participant))
          .reduce((sum, expense) => sum + (expense.splits[participant] || 0), 0);
        
        const displayName = isUrdu ? (urduNameMap[participant] || participant) : participant;
        
        return [
          displayName,
          formatCurrency(totalPaid),
          formatCurrency(totalOwed),
          formatCurrency(totalPaid - totalOwed)
        ];
      });
      
      autoTable(doc, {
        startY: yPos,
        head: [[
          isUrdu ? 'نام' : 'Name',
          isUrdu ? 'کل ادائیگی' : 'Total Paid',
          isUrdu ? 'کل حصہ' : 'Total Share',
          isUrdu ? 'خالص بیلنس' : 'Net Balance'
        ]],
        body: participantSummary,
        theme: 'striped',
        headStyles: { fillColor: [16, 185, 129], textColor: 255 },
        styles: { fontSize: 10, cellPadding: 3 },
        columnStyles: { 
          0: { fontStyle: 'bold' },
          1: { halign: 'right' },
          2: { halign: 'right' },
          3: { halign: 'right', fontStyle: 'bold' }
        },
        margin: { left: margin, right: margin }
      });
      
      yPos = (doc.lastAutoTable && doc.lastAutoTable.finalY) ? doc.lastAutoTable.finalY + 20 : yPos + 60;
      
      // DETAILED EXPENSES SECTION
      if (expenses.length > 0) {
        if (yPos > pageHeight - 60) {
          doc.addPage();
          yPos = 30;
        }
        
        doc.setFontSize(16);
        doc.text(isUrdu ? 'تفصیلی اخراجات' : 'EXPENSE BREAKDOWN', margin, yPos);
        yPos += 15;
        
        const expenseData = expenses.map((expense, index) => {
          const payerName = isUrdu ? (urduNameMap[expense.payer] || expense.payer) : expense.payer;
          const participantNames = expense.participants.map(p => 
            isUrdu ? (urduNameMap[p] || p) : p
          ).join(', ');
          
          return [
            (index + 1).toString(),
            expense.date,
            expense.description,
            payerName,
            formatCurrency(expense.amount),
            expense.splitMode,
            participantNames
          ];
        });
        
        autoTable(doc, {
          startY: yPos,
          head: [[
            '#',
            isUrdu ? 'تاریخ' : 'Date',
            isUrdu ? 'تفصیل' : 'Description',
            isUrdu ? 'کس نے ادا کیا' : 'Paid By',
            isUrdu ? 'رقم' : 'Amount',
            isUrdu ? 'طریقہ تقسیم' : 'Split',
            isUrdu ? 'شرکاء' : 'Participants'
          ]],
          body: expenseData,
          theme: 'striped',
          headStyles: { fillColor: [245, 158, 11], textColor: 255 },
          styles: { fontSize: 9, cellPadding: 2 },
          columnStyles: {
            0: { halign: 'center', cellWidth: 15 },
            1: { cellWidth: 25 },
            2: { cellWidth: 40 },
            3: { cellWidth: 25 },
            4: { halign: 'right', cellWidth: 25 },
            5: { halign: 'center', cellWidth: 20 },
            6: { fontSize: 8, cellWidth: 35 }
          },
          margin: { left: margin, right: margin }
        });
        
        yPos = (doc.lastAutoTable && doc.lastAutoTable.finalY) ? doc.lastAutoTable.finalY + 20 : yPos + 60;
      }
      
      // SETTLEMENT INSTRUCTIONS SECTION
      if (result) {
        if (yPos > pageHeight - 60) {
          doc.addPage();
          yPos = 30;
        }
        
        doc.setFontSize(16);
        doc.text(isUrdu ? 'ادائیگی کی ہدایات' : 'SETTLEMENT INSTRUCTIONS', margin, yPos);
        yPos += 15;
        
        if (result.transactions.length === 0) {
          // All settled
          doc.setFillColor(220, 252, 231);
          doc.rect(margin, yPos, pageWidth - 2 * margin, 30, 'F');
          
          doc.setFontSize(14);
          doc.setTextColor(22, 163, 74);
          doc.text(
            isUrdu ? 'مبارک ہو!' : 'CONGRATULATIONS!',
            pageWidth / 2,
            yPos + 15,
            { align: 'center' }
          );
          doc.setFontSize(12);
          doc.text(
            isUrdu
              ? 'تمام اخراجات کا حساب برابر ہو چکا ہے، کوئی ادائیگی باقی نہیں۔'
              : 'All expenses are settled. No payments needed!',
            pageWidth / 2,
            yPos + 25,
            { align: 'center' }
          );
          
          yPos += 40;
        } else {
          // Original Debt Relationships Section
          if (result.originalDebts && result.originalDebts.length > 0) {
            doc.setFontSize(14);
            doc.setTextColor(0, 0, 0);
            doc.text(
              isUrdu ? 'اصل قرض کے تعلقات' : 'Original Debt Relationships',
              margin,
              yPos
            );
            yPos += 10;
            
            const originalDebtData = result.originalDebts.map((debt, index) => {
              const fromName = isUrdu ? (urduNameMap[debt.from] || debt.from) : debt.from;
              const toName = isUrdu ? (urduNameMap[debt.to] || debt.to) : debt.to;
              const relationText = isUrdu
                ? `${fromName} نے ${toName} کو دینا ہے`
                : `${fromName} owes ${toName}`;
              const typeText = isUrdu ? 'خالص رقم' : 'Net Amount';
              return [
                `${index + 1}`,
                relationText,
                formatCurrency(debt.amount),
                typeText
              ];
            });
            
            autoTable(doc, {
              startY: yPos,
              head: [[
                '#',
                isUrdu ? 'قرض کا تعلق' : 'Debt Relationship',
                isUrdu ? 'رقم' : 'Amount',
                isUrdu ? 'قسم' : 'Type'
              ]],
              body: originalDebtData,
              theme: 'striped',
              headStyles: { fillColor: [251, 146, 60], textColor: 255 },
              styles: { fontSize: 10, cellPadding: 3 },
              columnStyles: {
                0: { halign: 'center', cellWidth: 15 },
                1: { cellWidth: 90 },
                2: { halign: 'right', cellWidth: 30, fontStyle: 'bold' },
                3: { halign: 'center', cellWidth: 30, fontSize: 9 }
              },
              margin: { left: margin, right: margin }
            });
            
            yPos = (doc.lastAutoTable && doc.lastAutoTable.finalY) ? doc.lastAutoTable.finalY + 15 : yPos + 60;
          }
          
          // Check if we need a new page
          if (yPos > pageHeight - 80) {
            doc.addPage();
            yPos = 30;
          }
          
          // Optimized Settlement Plan Section
          doc.setFontSize(14);
          doc.setTextColor(0, 0, 0);
          doc.text(
            isUrdu ? 'بہترین ادائیگی پلان (تجویز کردہ)' : 'Optimized Settlement Plan (Recommended)',
            margin,
            yPos
          );
          yPos += 10;
          
          const settlementData = result.transactions.map((transaction, index) => {
            const fromName = isUrdu ? (urduNameMap[transaction.from] || transaction.from) : transaction.from;
            const toName = isUrdu ? (urduNameMap[transaction.to] || transaction.to) : transaction.to;
            const stepLabel = isUrdu ? `مرحلہ ${index + 1}` : `Step ${index + 1}`;
            const transText = isUrdu
              ? `${fromName} نے ${toName} کو ادائیگی کرنی ہے`
              : `${fromName} pays ${toName}`;
            const statusText = isUrdu ? 'زیر التواء' : 'Pending';
            return [
              stepLabel,
              transText,
              formatCurrency(transaction.amount),
              statusText
            ];
          });
          
          autoTable(doc, {
            startY: yPos,
            head: [[
              isUrdu ? 'مرحلہ' : 'Step',
              isUrdu ? 'ٹرانزیکشن' : 'Transaction',
              isUrdu ? 'رقم' : 'Amount',
              isUrdu ? 'حالت' : 'Status'
            ]],
            body: settlementData,
            theme: 'grid',
            headStyles: { fillColor: [34, 197, 94], textColor: 255 },
            styles: { fontSize: 11, cellPadding: 4 },
            columnStyles: {
              0: { halign: 'center', cellWidth: 25 },
              1: { cellWidth: 80 },
              2: { halign: 'right', cellWidth: 30, fontStyle: 'bold' },
              3: { halign: 'center', cellWidth: 30 }
            },
            margin: { left: margin, right: margin }
          });
          
          yPos = (doc.lastAutoTable && doc.lastAutoTable.finalY) ? doc.lastAutoTable.finalY + 20 : yPos + 60;
        }
      }
      
      // VERIFICATION SECTION
      if (yPos > pageHeight - 80) {
        doc.addPage();
        yPos = 30;
      }
      
      doc.setFontSize(16);
      doc.text(isUrdu ? 'تصدیق' : 'VERIFICATION', margin, yPos);
      yPos += 15;
      
      const totalPaid = expenses.reduce((sum, expense) => sum + expense.amount, 0);
      const totalSplit = expenses.reduce((sum, expense) => 
        sum + Object.values(expense.splits).reduce((splitSum, amount) => splitSum + amount, 0), 0
      );
      const isBalanced = Math.abs(totalPaid - totalSplit) < 0.01;
      
      const verificationData = [
        [
          isUrdu ? 'کل ادا شدہ رقم' : 'Total Amount Paid',
          formatCurrency(totalPaid)
        ],
        [
          isUrdu ? 'کل تقسیم شدہ رقم' : 'Total Amount Split',
          formatCurrency(totalSplit)
        ],
        [
          isUrdu ? 'فرق' : 'Difference',
          formatCurrency(Math.abs(totalPaid - totalSplit))
        ],
        [
          isUrdu ? 'کیا حساب برابر ہے؟' : 'Balanced',
          isBalanced ? (isUrdu ? 'ہاں' : 'Yes') : (isUrdu ? 'نہیں' : 'No')
        ]
      ];
      
      autoTable(doc, {
        startY: yPos,
        head: [[isUrdu ? 'چیک' : 'Check', isUrdu ? 'قدر' : 'Value']],
        body: verificationData,
        theme: 'grid',
        headStyles: { fillColor: [139, 92, 246], textColor: 255 },
        styles: { fontSize: 11, cellPadding: 4 },
        columnStyles: { 
          0: { fontStyle: 'bold' }, 
          1: { halign: 'right', fontStyle: 'bold' } 
        },
        margin: { left: margin, right: margin }
      });
      
      yPos = (doc.lastAutoTable && doc.lastAutoTable.finalY) ? doc.lastAutoTable.finalY + 30 : yPos + 60;
      
      // SIGNATURE SECTION
      if (yPos > pageHeight - 60) {
        doc.addPage();
        yPos = 30;
      }
      
      doc.setFontSize(14);
      doc.text(isUrdu ? 'شرکاء کے دستخط' : 'PARTICIPANT SIGNATURES', margin, yPos);
      yPos += 15;
      
      const signatureHeight = 30;
      const signatureWidth = (pageWidth - 3 * margin) / 2;
      
      participants.forEach((participant, index) => {
        const xPos = margin + (index % 2) * (signatureWidth + margin);
        const yPosSignature = yPos + Math.floor(index / 2) * (signatureHeight + 15);
        
        if (yPosSignature > pageHeight - 50) {
          doc.addPage();
          yPos = 30;
          const newYPos = yPos + Math.floor(index / 2) * (signatureHeight + 15);
          doc.rect(xPos, newYPos, signatureWidth, signatureHeight);
          doc.setFontSize(10);
          const signatureLabel = isUrdu
            ? `${participant} - تاریخ: _________`
            : `${participant} - Date: _________`;
          doc.text(signatureLabel, xPos + 5, newYPos + signatureHeight + 10);
        } else {
          doc.rect(xPos, yPosSignature, signatureWidth, signatureHeight);
          doc.setFontSize(10);
          const signatureLabel = isUrdu
            ? `${participant} - تاریخ: _________`
            : `${participant} - Date: _________`;
          doc.text(signatureLabel, xPos + 5, yPosSignature + signatureHeight + 10);
        }
      });
      
      // FOOTER ON ALL PAGES
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        
        // Footer background
        doc.setFillColor(249, 250, 251);
        doc.rect(0, pageHeight - 20, pageWidth, 20, 'F');
        
        // Footer content
        doc.setFontSize(8);
        doc.setTextColor(107, 114, 128);
        const generatedText = isUrdu
          ? `تیار کردہ: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`
          : `Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`;
        const pageText = isUrdu
          ? `صفحہ ${i} از ${pageCount}`
          : `Page ${i} of ${pageCount}`;
        const footerBrand = isUrdu ? 'سمارٹ اخراجات اسپلٹر 2024' : 'Smart Expense Splitter 2024';
        doc.text(generatedText, margin, pageHeight - 12);
        doc.text(pageText, pageWidth - margin, pageHeight - 12, { align: 'right' });
        doc.text(footerBrand, pageWidth / 2, pageHeight - 5, { align: 'center' });
      }
      
      // Save the PDF
      const filename = tripName 
        ? `${tripName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_settlement_${new Date().toISOString().split('T')[0]}.pdf`
        : `expense_settlement_${new Date().toISOString().split('T')[0]}.pdf`;
      
      doc.save(filename);
      
      console.log('Enhanced PDF generated successfully');
      showCustomModal({
        type: 'success',
        title: 'PDF Generated',
        message: 'Enhanced PDF report downloaded successfully!',
        confirmText: 'OK'
      });
      
    } catch (error) {
      console.error('PDF generation error:', error);
      showCustomModal({
        type: 'error',
        title: 'PDF Generation Failed',
        message: `PDF generation failed: ${error.message}. Please check the console for details.`,
        confirmText: 'OK'
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Simple Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            {lastSaved && (
              <>
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Auto-saved</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-3">
            {/* PDF Language Settings */}
            <div className="flex items-center gap-2">
              <Settings size={16} className="text-gray-500" />
              <select
                className="text-sm border border-gray-300 rounded-md px-2 py-1 bg-white text-black focus:outline-none focus:ring-2 focus:ring-blue-400"
                value={pdfLanguage}
                onChange={(e) => setPdfLanguage(e.target.value)}
                title="PDF Language"
              >
                <option value="en">PDF: English</option>
                <option value="ur">PDF: اردو</option>
              </select>
            </div>

            <Button 
              onClick={exportData} 
              variant="ghost"
              size="sm"
              className="text-black hover:text-gray-700 font-medium"
              title="Export Data"
            >
              <Save size={16} className="mr-1" />
              Export
            </Button>
            <div className="relative">
              <input
                type="file"
                accept=".json"
                onChange={importData}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                id="import-file"
              />
              <Button 
                variant="ghost"
                size="sm"
                className="text-black hover:text-gray-700 font-medium"
                title="Import Data"
              >
                <Upload size={16} className="mr-1" />
                Import
              </Button>
            </div>
            <Button 
              onClick={clearAllData} 
              variant="ghost"
              size="sm"
              className="text-black hover:text-gray-700 font-medium"
              title="Reset All Data (including saved data)"
            >
              Clear all
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Participants */}
          <Card className="bg-white rounded-xl shadow-sm border border-gray-200">
            <CardHeader className="pb-4">
                              <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                    <Users className="text-white" size={16} />
                  </div>
                  <div>
                    <CardTitle className="text-lg font-bold text-black">Smart Expense Splitter</CardTitle>
                  </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Trip Name Input */}
              <div>
                <Label className="text-sm font-semibold text-black mb-2 block">Trip/Group Name (Optional)</Label>
                <Input
                  placeholder="e.g. Weekend Trip to Goa, Office Lunch..."
                  value={tripName}
                  onChange={(e) => setTripName(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all text-black"
                />
              </div>
              
              <div>
                  <h3 className="text-lg font-bold text-black mb-4">Participants</h3>
                  
                  {/* Add Participant Input */}
                  <div className="mb-4">
                    <Input
                      placeholder="Enter participant name..."
                      value={newParticipantName}
                      onChange={(e) => setNewParticipantName(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addParticipant()}
                      className="w-full px-4 py-3 bg-white border border-gray-300 rounded-full focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all text-black"
                    />
                  </div>
                  
                                    {/* Participants List */}
                  <div className="flex flex-wrap gap-4 justify-center mb-4 min-h-[80px]">
                    {participants.length === 0 ? (
                      <div className="text-center py-4 text-gray-500">
                        <Users className="mx-auto mb-2" size={24} />
                        <p className="text-sm">Add participants to get started</p>
                      </div>
                    ) : (
                      participants.map((participant, index) => (
                      <div key={participant} className="flex flex-col items-center group">
                        <div className="relative">
                          <div 
                            className="w-12 h-12 rounded-full flex items-center justify-center text-white text-lg font-semibold mb-2 cursor-pointer"
                            style={{
                              backgroundColor: index === 0 ? '#8B5CF6' : index === 1 ? '#3B82F6' : '#10B981'
                            }}
                            onClick={() => startRenameParticipant(participant)}
                            title={`Click to rename ${participant}`}
                          >
                            {participant.charAt(0).toUpperCase()}
                          </div>
                          <div className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                removeParticipant(participant);
                              }}
                              className="h-6 w-6 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-md flex items-center justify-center transition-colors"
                              title={`Remove ${participant}`}
                              type="button"
                            >
                              <X size={12} strokeWidth={2} className="text-white" />
                            </button>
                          </div>
                        </div>
                        <span 
                          className="font-medium text-black text-sm text-center cursor-pointer hover:text-blue-600"
                          onClick={() => startRenameParticipant(participant)}
                          title={`Click to rename ${participant}`}
                        >
                          {participant}
                        </span>
                      </div>
                    )))}
                  </div>

                {/* Add Participant */}
                <Button 
                  onClick={addParticipant} 
                  className="w-full bg-green-400 hover:bg-green-500 text-black font-semibold py-3 rounded-lg shadow-sm"
                  disabled={!newParticipantName.trim()}
                >
                  <UserPlus size={16} className="mr-2" />
                  Add person
                </Button>
              </div>

              {/* Summary Cards */}
              <div className="mt-6 grid grid-cols-2 gap-3">
                {/* Total Summary Card */}
                <Card className="bg-indigo-600 rounded-lg shadow-md">
                  <CardContent className="p-3 text-center">
                    <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-2">
                      <DollarSign className="text-white" size={16} />
                    </div>
                    <h3 className="text-sm font-bold text-white mb-1">Total Expenses</h3>
                    <p className="text-lg font-bold text-white mb-1">{formatCurrency(totalExpense)}</p>
                    <p className="text-xs text-white/80">{expenses.length} shared expenses</p>
                  </CardContent>
                </Card>

                {/* Balance Card */}
                <Card className="bg-teal-600 rounded-lg shadow-md">
                  <CardContent className="p-3 text-center">
                    <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-2">
                      <Calculator className="text-white" size={16} />
                    </div>
                    <h3 className="text-sm font-bold text-white mb-1">Pending Settlements</h3>
                    <p className="text-lg font-bold text-white mb-1">
                      {result ? (Object.values(result.balances).reduce((sum, balance) => sum + Math.abs(balance), 0) / 2).toFixed(2) : '0.00'}
                    </p>
                    <p className="text-xs text-white/80">in outstanding payments</p>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>

          {/* Right Column - Add Expense */}
          <Card className="bg-white rounded-xl shadow-sm border border-gray-200">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-bold text-black">Add Expense</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                             {/* Who Paid */}
               <div>
                 <Label className="text-sm font-semibold text-black mb-2 block">Who Paid?</Label>
                 <select
                   className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all text-black"
                   value={payer}
                   onChange={e => setPayer(e.target.value)}
                 >
                  {participants.map(participant => (
                    <option key={participant} value={participant}>{participant}</option>
                  ))}
                </select>
              </div>

                             {/* Amount */}
               <div>
                 <Label className="text-sm font-semibold text-black mb-2 block">Amount</Label>
                 <Input
                   type="number"
                   placeholder="0"
                   value={amount}
                   onChange={e => setAmount(e.target.value)}
                   className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all text-black"
                 />
               </div>

               {/* Description */}
               <div>
                 <Label className="text-sm font-semibold text-black mb-2 block">Description</Label>
                 <Input
                   type="text"
                   placeholder="e.g. Dinner, Gas, Hotel"
                   value={description}
                   onChange={e => setDescription(e.target.value)}
                   className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all text-black"
                 />
               </div>

                             {/* Split Mode */}
               <div>
                 <Label className="text-sm font-semibold text-black mb-3 block">Split Mode</Label>
                 <div className="flex bg-gray-100 p-1 rounded-lg justify-center">
                   <div 
                     className={`flex-1 px-4 py-2 rounded-md font-medium text-sm transition-all cursor-pointer text-center ${
                       splitMode === "equal" 
                         ? "bg-white text-blue-600 shadow-sm" 
                         : "text-black hover:text-gray-700"
                     }`}
                     onClick={() => setSplitMode("equal")}
                   >
                     Equal
                   </div>
                   <div 
                     className={`flex-1 px-4 py-2 rounded-md font-medium text-sm transition-all cursor-pointer text-center ${
                       splitMode === "custom" 
                         ? "bg-white text-blue-600 shadow-sm" 
                         : "text-black hover:text-gray-700"
                     }`}
                     onClick={() => setSplitMode("custom")}
                   >
                     Custom
                   </div>
                 </div>
               </div>

                             {/* Participants Selection */}
               <div>
                 <Label className="text-sm font-semibold text-black mb-3 block">Participants</Label>
                 <div className="flex flex-wrap gap-4 justify-center">
                   {participants.map((participant, index) => (
                     <label key={participant} className="flex flex-col items-center cursor-pointer">
                       <input
                         type="checkbox"
                         checked={customSplits[participant]?.selected || false}
                         onChange={() => setCustomSplits({
                           ...customSplits,
                           [participant]: {
                             ...customSplits[participant],
                             selected: !customSplits[participant]?.selected
                           }
                         })}
                         className="sr-only"
                       />
                       <div 
                         className={`w-12 h-12 rounded-full flex items-center justify-center text-white text-lg font-semibold mb-2 transition-all ${
                           customSplits[participant]?.selected ? 'ring-4 ring-blue-300' : ''
                         }`}
                         style={{
                           backgroundColor: index === 0 ? '#8B5CF6' : index === 1 ? '#3B82F6' : '#10B981'
                         }}
                       >
                         {participant.charAt(0).toUpperCase()}
                       </div>
                       <span className="font-medium text-black text-sm text-center">{participant}</span>
                     </label>
                   ))}
                 </div>
               </div>

                             {/* Add Expense Button */}
               <Button 
                 onClick={addExpense} 
                 className="w-full bg-gradient-to-r from-teal-500 to-green-600 hover:from-teal-600 hover:to-green-700 text-white font-semibold py-3 rounded-lg shadow-lg"
                 disabled={participants.length === 0}
               >
                 <Plus size={16} className="mr-2" />
                 Add Expense
               </Button>
            </CardContent>
          </Card>
        </div>

                 {/* Added Expenses List */}
         {expenses.length > 0 && (
           <Card className="mt-6 bg-white rounded-xl shadow-sm border border-gray-200">
             <CardHeader className="pb-4">
               <div className="flex items-center justify-between">
                 <div className="flex items-center gap-3">
                   <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-red-600 rounded-lg flex items-center justify-center">
                     <DollarSign className="text-white" size={16} />
                   </div>
                   <div>
                     <CardTitle className="text-lg font-semibold text-black">Added Expenses</CardTitle>
                     <p className="text-sm text-gray-500">{expenses.length} expenses recorded</p>
                   </div>
                 </div>
                 <Button 
                   onClick={clearAllExpenses} 
                   variant="destructive" 
                   size="sm"
                   className="text-red-600 hover:text-red-700 hover:bg-red-50"
                   title="Clear all expenses"
                 >
                   <Trash2 size={14} className="mr-1" />
                   Clear All
                 </Button>
               </div>
             </CardHeader>
             <CardContent>
               <div className="space-y-3 max-h-64 overflow-y-auto">
                 {expenses.map((expense) => (
                   <div 
                     key={expense.id} 
                     className="group p-3 bg-gray-50 rounded-lg border border-gray-200 hover:border-gray-300 transition-all"
                   >
                     <div className="flex items-start justify-between mb-3">
                       <div className="flex items-center gap-3">
                         <div 
                           className="w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold text-sm"
                           style={{
                             backgroundColor: participants.indexOf(expense.payer) === 0 ? '#8B5CF6' : 
                                           participants.indexOf(expense.payer) === 1 ? '#3B82F6' : '#10B981'
                           }}
                         >
                           {expense.payer.charAt(0).toUpperCase()}
                         </div>
                         <div>
                           <div className="flex items-center gap-2 mb-1">
                             <span className="font-semibold text-black">{expense.payer}</span>
                             <span className="text-gray-500 text-sm">paid</span>
                             <span className="font-bold text-green-600 text-lg">{formatCurrency(expense.amount)}</span>
                           </div>
                           <div className="flex items-center gap-2">
                             <span className="text-sm font-medium text-gray-700">{expense.description}</span>
                             <span className="text-gray-400">•</span>
                             <span className="text-sm text-gray-500">{expense.date}</span>
                             <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full font-medium">
                               {expense.splitMode}
                             </span>
                           </div>
                         </div>
                       </div>
                       <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                         <Button
                           onClick={() => startEditExpense(expense)}
                           variant="ghost"
                           size="sm"
                           className="h-8 w-8 p-0 text-blue-500 hover:text-blue-700 hover:bg-blue-50"
                           title="Edit expense"
                         >
                           <Edit2 size={14} />
                         </Button>
                         <Button
                           onClick={() => deleteExpense(expense.id)}
                           variant="ghost"
                           size="sm"
                           className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                           title="Delete expense"
                         >
                           <Trash2 size={14} />
                         </Button>
                       </div>
                     </div>
                     
                     <div className="space-y-2">
                       <p className="text-xs font-medium text-gray-600">Split Details:</p>
                       <div className="flex flex-wrap gap-2">
                         {Object.entries(expense.splits).map(([participant, amount]) => (
                           <div 
                             key={participant}
                             className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg"
                           >
                             <div 
                               className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-semibold"
                               style={{
                                 backgroundColor: participants.indexOf(participant) === 0 ? '#8B5CF6' : 
                                               participants.indexOf(participant) === 1 ? '#3B82F6' : '#10B981'
                               }}
                             >
                               {participant.charAt(0).toUpperCase()}
                             </div>
                             <span className="text-sm font-medium text-gray-700">{participant}</span>
                             <span className="text-sm font-bold text-green-600">{formatCurrency(amount)}</span>
                           </div>
                         ))}
                       </div>
                     </div>
                   </div>
                 ))}
               </div>
             </CardContent>
           </Card>
         )}

                 {/* Calculate Button */}
         <div className="mt-8 text-center">
           <Button 
             onClick={calculate} 
             className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold px-8 py-4 text-lg rounded-lg shadow-lg"
             disabled={expenses.length === 0 || participants.length < 2}
           >
             <Calculator size={20} className="mr-3" />
             Calculate Settlement
           </Button>
         </div>

        {/* Settlement Summary (below Calculate Settlement) */}
        <Card className="mt-4 bg-white rounded-xl shadow-sm border border-gray-200">
          <CardContent className="py-4">
            <h2 className="text-base font-semibold text-gray-900 mb-2">
              {pdfLanguage === "ur" ? "تصفیہ کا خلاصہ" : "Settlement Summary"}
            </h2>
            <ul
              className={`text-sm text-gray-700 list-disc ${
                pdfLanguage === "ur" ? "text-right pr-6" : "pl-6"
              }`}
              dir={pdfLanguage === "ur" ? "rtl" : "ltr"}
            >
              {getSettlementSummaryBullets(pdfLanguage).map((line, idx) => (
                <li key={`${idx}-${line}`}>{line}</li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Results */}
        {result && (
          <Card className="mt-6 bg-white rounded-xl shadow-sm border border-gray-200">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
                    <DollarSign className="text-white" size={16} />
                  </div>
                  <div>
                    <CardTitle className="text-lg font-semibold text-gray-900">Settlement Results</CardTitle>
                    <p className="text-sm text-gray-500">Final calculations and transactions</p>
                  </div>
                </div>
                {(expenses.length > 0 || (result.transactions && result.transactions.length > 0)) && (
                  <Button
                    onClick={downloadPDF}
                    variant="ghost"
                    size="sm"
                    className="text-gray-600 hover:text-gray-800"
                    title="Download PDF Report"
                  >
                    <Download size={16} className="mr-2" />
                    PDF
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {result.transactions.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl">🎉</span>
                  </div>
                  <h3 className="text-lg font-bold text-green-600 mb-2">All Settled Up!</h3>
                  <p className="text-gray-600">No one owes anyone money. Everyone is square!</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Original Debt Relationships Section */}
                  {result.originalDebts && result.originalDebts.length > 0 && (
                    <div>
                      <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                        <span className="text-orange-600">Original Debt Relationships</span>
                        <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded-full text-sm font-semibold">
                          {result.originalDebts.length}
                        </span>
                      </h3>
                      <p className="text-sm text-gray-600 mb-3">These are the net amounts each person owes after offsetting mutual debts:</p>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {result.originalDebts.map((debt, index) => (
                          <div 
                            key={`${debt.from}-${debt.to}-${debt.amount}-${index}`} 
                            className="p-3 bg-orange-50 rounded-lg border border-orange-200"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-orange-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                                  {debt.from.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-gray-800">{debt.from}</span>
                                  <span className="text-gray-500">→</span>
                                  <span className="font-semibold text-gray-800">{debt.to}</span>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="font-bold text-orange-600 text-lg">{formatCurrency(debt.amount)}</p>
                                <p className="text-xs text-gray-500">Net Amount</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Optimized Settlements Section */}
                  <div>
                    <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                      <span className="text-blue-600">Optimized Settlement Plan</span>
                      <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm font-semibold">
                        {result.transactions.length}
                      </span>
                    </h3>
                    <p className="text-sm text-gray-600 mb-3">These are the minimum transactions needed to settle all debts:</p>
                    <div className="space-y-3">
                      {result.transactions.map((transaction) => (
                        <div 
                          key={transaction.from + transaction.to + transaction.amount} 
                          className="p-3 bg-green-50 rounded-lg border border-green-200"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                                {transaction.from.charAt(0).toUpperCase()}
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-gray-800">{transaction.from}</span>
                                <span className="text-gray-500">→</span>
                                <span className="font-semibold text-gray-800">{transaction.to}</span>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-green-600 text-lg">{formatCurrency(transaction.amount)}</p>
                              <p className="text-xs text-gray-500">Optimized Payment</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="border-t border-gray-200 pt-6">
                    <h4 className="font-bold text-lg mb-4 flex items-center gap-2">
                      <span className="text-purple-600">Individual Balances</span>
                    </h4>
                    <div className="space-y-3">
                      {Object.entries(result.balances)
                        .filter(([, balance]) => Math.abs(balance) > 0.01)
                        .map(([person, balance]) => (
                        <div key={person} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold text-sm ${
                              balance > 0 ? 'bg-green-600' : 'bg-red-600'
                            }`}>
                              {person.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-semibold text-gray-800">{person}</p>
                              <p className="text-xs text-gray-500">
                                {balance > 0 ? 'Should receive' : 'Should pay'}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={`font-bold text-lg ${balance > 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {balance > 0 ? '+' : ''}{formatCurrency(balance)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    {/* Show settled participants */}
                    {Object.entries(result.balances).filter(([, balance]) => Math.abs(balance) <= 0.01).length > 0 && (
                      <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
                        <h5 className="font-semibold text-green-700 mb-2 flex items-center gap-2">
                          <span>✅</span>
                          <span>Settled Participants</span>
                        </h5>
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(result.balances)
                            .filter(([, balance]) => Math.abs(balance) <= 0.01)
                            .map(([person]) => (
                            <div key={person} className="flex items-center gap-2 px-2 py-1 bg-green-100 border border-green-300 rounded-full">
                              <div className="w-5 h-5 bg-green-600 rounded-full flex items-center justify-center text-white text-xs font-semibold">
                                {person.charAt(0).toUpperCase()}
                              </div>
                              <span className="text-sm font-medium text-green-800">{person}</span>
                              <span className="text-green-600">✓</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Edit Expense Form */}
        {editingExpense && (
          <Card className="fixed inset-4 z-50 overflow-y-auto bg-white rounded-xl shadow-xl border border-gray-200">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Edit2 className="text-blue-600" size={18} />
                  Edit Expense
                </CardTitle>
                <Button
                  onClick={cancelEditExpense}
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-gray-500 hover:text-gray-700"
                >
                  <X size={16} />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Edit form content would go here - simplified for now */}
              <div className="flex gap-3 pt-2">
                <Button 
                  onClick={saveEditExpense} 
                  className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold flex-1 py-3 rounded-lg"
                >
                  <Save size={18} className="mr-2" />
                  Save Changes
                </Button>
                <Button 
                  onClick={cancelEditExpense} 
                  variant="outline"
                  className="flex-1 py-3 rounded-lg"
                >
                  <X size={18} className="mr-2" />
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Rename Participant Modal */}
        {renamingParticipant && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <Edit2 className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg text-blue-800">Rename Participant</h3>
                  </div>
                </div>
                
                <p className="text-gray-700 mb-4">
                  Enter a new name for "{renamingParticipant}":
                </p>
                
                <Input
                  value={newParticipantNameForRename}
                  onChange={(e) => setNewParticipantNameForRename(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') saveRename();
                    if (e.key === 'Escape') cancelRename();
                  }}
                  placeholder="Enter new name..."
                  className="w-full px-4 py-3 mb-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all text-black"
                  autoFocus
                />

                <div className="mb-6">
                  <Label className="text-sm font-semibold text-black mb-2 block">
                    Urdu display name (optional)
                  </Label>
                  <Input
                    value={newParticipantUrduNameForRename}
                    onChange={(e) => setNewParticipantUrduNameForRename(e.target.value)}
                    placeholder="مثال: حمزہ"
                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all text-black"
                    dir="rtl"
                  />
                </div>
                
                <div className="flex gap-3 justify-end">
                  <Button
                    onClick={cancelRename}
                    variant="outline"
                    className="px-4 py-2"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={saveRename}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white"
                    disabled={!newParticipantNameForRename.trim()}
                  >
                    Rename
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Custom Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  modalConfig.type === 'success' ? 'bg-green-100' :
                  modalConfig.type === 'error' ? 'bg-red-100' :
                  modalConfig.type === 'warning' ? 'bg-yellow-100' :
                  'bg-blue-100'
                }`}>
                  {modalConfig.type === 'success' && (
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                  )}
                  {modalConfig.type === 'error' && (
                    <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                  )}
                  {modalConfig.type === 'warning' && (
                    <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.268 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
                    </svg>
                  )}
                  {modalConfig.type === 'info' && (
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                  )}
                </div>
                <div>
                  <h3 className={`font-semibold text-lg ${
                    modalConfig.type === 'success' ? 'text-green-800' :
                    modalConfig.type === 'error' ? 'text-red-800' :
                    modalConfig.type === 'warning' ? 'text-yellow-800' :
                    'text-blue-800'
                  }`}>
                    {modalConfig.title}
                  </h3>
                </div>
              </div>
              
              <p className="text-gray-700 mb-6 whitespace-pre-line">
                {modalConfig.message}
              </p>
              
              <div className="flex gap-3 justify-end">
                {modalConfig.showCancel && (
                  <Button
                    onClick={hideModal}
                    variant="outline"
                    className="px-4 py-2"
                  >
                    {modalConfig.cancelText}
                  </Button>
                )}
                <Button
                  onClick={() => {
                    if (modalConfig.onConfirm) {
                      modalConfig.onConfirm();
                    } else {
                      hideModal();
                    }
                  }}
                  className={`px-4 py-2 ${
                    modalConfig.type === 'success' ? 'bg-green-600 hover:bg-green-700' :
                    modalConfig.type === 'error' ? 'bg-red-600 hover:bg-red-700' :
                    modalConfig.type === 'warning' ? 'bg-yellow-600 hover:bg-yellow-700' :
                    'bg-blue-600 hover:bg-blue-700'
                  } text-white`}
                >
                  {modalConfig.confirmText}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 