import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./components/ui/card";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Label } from "./components/ui/label";
import { Trash2, Calculator, Plus, Users, DollarSign, UserPlus, UserMinus, Download, Upload, Save, Edit2, X, Settings } from "lucide-react";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import { generatePDF } from './utils/pdfGenerator';
// QRCode removed per user request

const PARTICIPANT_COLORS = [
  '#8B5CF6', '#3B82F6', '#10B981', '#F59E0B', '#EF4444',
  '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1',
];
const getColor = (index) => PARTICIPANT_COLORS[Math.abs(index) % PARTICIPANT_COLORS.length];

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
  const [editPaymentMode, setEditPaymentMode] = useState("single");
  const [editMultiplePayers, setEditMultiplePayers] = useState([{ person: "", amount: "" }]);
  const [pdfLanguage, setPdfLanguage] = useState("en"); // 'en' or 'ur'
  const [urduNameMap, setUrduNameMap] = useState({}); // { [englishName]: urduName }
  const [paymentMode, setPaymentMode] = useState("single"); // "single" or "multiple"
  const [multiplePayers, setMultiplePayers] = useState([{ person: "", amount: "" }]);

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

  const addMultiplePayerRow = () => {
    setMultiplePayers(prev => [...prev, { person: "", amount: "" }]);
  };

  const removeMultiplePayerRow = (index) => {
    setMultiplePayers(prev => prev.filter((_, i) => i !== index));
  };

  const updateMultiplePayerRow = (index, field, value) => {
    setMultiplePayers(prev => prev.map((mp, i) => i === index ? { ...mp, [field]: value } : mp));
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
    if (!amount || !description.trim()) {
      showCustomModal({
        type: 'warning',
        title: 'Missing Information',
        message: 'Please fill in all required fields (amount, and description).',
        confirmText: 'OK'
      });
      return;
    }

    if (paymentMode === "single" && !payer) {
      showCustomModal({
        type: 'warning',
        title: 'Missing Information',
        message: 'Please select who paid.',
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

    // Multiple payers validation
    let validatedPayers = null;
    if (paymentMode === "multiple") {
      const validPayers = multiplePayers.filter(mp => mp.person && parseFloat(mp.amount) > 0);
      if (validPayers.length === 0) {
        showCustomModal({
          type: 'warning',
          title: 'No Payers Added',
          message: 'Please add at least one payer with a valid amount.',
          confirmText: 'OK'
        });
        return;
      }

      const payerNames = validPayers.map(mp => mp.person);
      if (new Set(payerNames).size !== payerNames.length) {
        showCustomModal({
          type: 'warning',
          title: 'Duplicate Payer',
          message: 'Each person can only appear once in the payers list.',
          confirmText: 'OK'
        });
        return;
      }

      const totalPaid = validPayers.reduce((sum, mp) => sum + parseFloat(mp.amount), 0);
      if (Math.abs(totalPaid - expenseAmount) > 0.01) {
        showCustomModal({
          type: 'error',
          title: 'Payment Amount Mismatch',
          message: `Total paid by all payers (${formatCurrency(totalPaid)}) must equal the expense amount (${formatCurrency(expenseAmount)}).`,
          confirmText: 'OK'
        });
        return;
      }

      validatedPayers = validPayers.map(mp => ({ name: mp.person, amount: parseFloat(mp.amount) }));
    }

    let expenseData;

    if (splitMode === "equal") {
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
        paymentMode,
        payer: paymentMode === "single" ? payer : null,
        payers: paymentMode === "multiple" ? validatedPayers : null,
        amount: expenseAmount,
        description: description.trim(),
        participants: selectedParticipants,
        splits,
        splitMode: "equal",
        date: new Date().toLocaleDateString()
      };
    } else {
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
        paymentMode,
        payer: paymentMode === "single" ? payer : null,
        payers: paymentMode === "multiple" ? validatedPayers : null,
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
    setMultiplePayers([{ person: "", amount: "" }]);
    const resetSplits = {};
    participants.forEach(participant => {
      resetSplits[participant] = { selected: true, amount: "" };
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

  // Auto-compute amount from payer totals in multiple mode
  useEffect(() => {
    if (paymentMode === "multiple") {
      const total = multiplePayers.reduce((sum, mp) => sum + (parseFloat(mp.amount) || 0), 0);
      setAmount(total > 0 ? total.toString() : "");
    }
  }, [multiplePayers, paymentMode]);

  const deleteExpense = (id) => {
    setExpenses(expenses.filter(expense => expense.id !== id));
    setResult(null); // Clear results when expenses change
  };

  const startEditExpense = (expense) => {
    setEditingExpense(expense);
    setEditDescription(expense.description);
    setEditSplitMode(expense.splitMode);

    const mode = expense.paymentMode === "multiple" ? "multiple" : "single";
    setEditPaymentMode(mode);

    if (mode === "multiple" && expense.payers) {
      setEditPayer("");
      setEditMultiplePayers(expense.payers.map(p => ({ person: p.name, amount: p.amount.toString() })));
      setEditAmount(expense.amount.toString());
    } else {
      setEditPayer(expense.payer || "");
      setEditMultiplePayers([{ person: "", amount: "" }]);
      setEditAmount(expense.amount.toString());
    }

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
    setEditPaymentMode("single");
    setEditMultiplePayers([{ person: "", amount: "" }]);
  };

  const saveEditExpense = () => {
    if (!editDescription.trim()) {
      showCustomModal({
        type: 'warning',
        title: 'Missing Information',
        message: 'Please fill in the description.',
        confirmText: 'OK'
      });
      return;
    }

    if (editPaymentMode === "single" && !editPayer) {
      showCustomModal({
        type: 'warning',
        title: 'Missing Information',
        message: 'Please select who paid.',
        confirmText: 'OK'
      });
      return;
    }

    // Multiple payers validation
    let editValidatedPayers = null;
    if (editPaymentMode === "multiple") {
      const validPayers = editMultiplePayers.filter(mp => mp.person && parseFloat(mp.amount) > 0);
      if (validPayers.length === 0) {
        showCustomModal({ type: 'warning', title: 'No Payers Added', message: 'Please add at least one payer with a valid amount.', confirmText: 'OK' });
        return;
      }
      const payerNames = validPayers.map(mp => mp.person);
      if (new Set(payerNames).size !== payerNames.length) {
        showCustomModal({ type: 'warning', title: 'Duplicate Payer', message: 'Each person can only appear once in the payers list.', confirmText: 'OK' });
        return;
      }
      editValidatedPayers = validPayers.map(mp => ({ name: mp.person, amount: parseFloat(mp.amount) }));
    }

    const expenseAmount = editPaymentMode === "multiple"
      ? editMultiplePayers.reduce((sum, mp) => sum + (parseFloat(mp.amount) || 0), 0)
      : parseFloat(editAmount);
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
        paymentMode: editPaymentMode,
        payer: editPaymentMode === "single" ? editPayer : null,
        payers: editPaymentMode === "multiple" ? editValidatedPayers : null,
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
        paymentMode: editPaymentMode,
        payer: editPaymentMode === "single" ? editPayer : null,
        payers: editPaymentMode === "multiple" ? editValidatedPayers : null,
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
    expenses.forEach((expense) => {
      const { splits } = expense;

      if (expense.paymentMode === "multiple" && expense.payers) {
        // Distribute each participant's share proportionally among payers
        const totalPaid = expense.payers.reduce((sum, p) => sum + p.amount, 0);
        expense.payers.forEach(({ name: payerName, amount: payerAmount }) => {
          const proportion = totalPaid > 0 ? payerAmount / totalPaid : 0;
          Object.entries(splits).forEach(([participant, share]) => {
            const proportionalShare = share * proportion;
            if (participant !== payerName && proportionalShare > 0.01) {
              const debtKey = `${participant}->${payerName}`;
              if (!debtMap[debtKey]) {
                debtMap[debtKey] = { from: participant, to: payerName, amount: 0 };
              }
              debtMap[debtKey].amount += proportionalShare;
            }
          });
        });
      } else {
        const payer = expense.payer;
        Object.entries(splits).forEach(([participant, amountOwed]) => {
          if (participant !== payer && amountOwed > 0) {
            const debtKey = `${participant}->${payer}`;
            if (!debtMap[debtKey]) {
              debtMap[debtKey] = { from: participant, to: payer, amount: 0 };
            }
            debtMap[debtKey].amount += amountOwed;
          }
        });
      }
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
    expenses.forEach((expense) => {
      const { splits } = expense;

      // Debit each participant their share
      Object.entries(splits).forEach(([participant, share]) => {
        if (balances[participant] !== undefined) {
          balances[participant] -= share;
        }
      });

      // Credit payers for what they actually paid
      if (expense.paymentMode === "multiple" && expense.payers) {
        expense.payers.forEach(({ name, amount }) => {
          if (balances[name] !== undefined) {
            balances[name] += amount;
          }
        });
      } else {
        const payer = expense.payer;
        if (payer && balances[payer] !== undefined) {
          balances[payer] += expense.amount;
        }
      }
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

  const getSettlementSummaryBullets = (lang) => {
    if (!result) {
      return [
        lang === "ur"
          ? "Hisab kitab dekhne ke liye \"Calculate Settlement\" par click karein."
          : "Click \"Calculate Settlement\" to see who needs to pay whom."
      ];
    }

    if (!result.transactions || result.transactions.length === 0) {
      return [
        lang === "ur"
          ? "Sab hisab barabar hai, kisi par kisi ka qarz nahi hai."
          : "All expenses are settled. No one owes anything to anyone."
      ];
    }

    const bullets = [];
    const isUrdu = lang === "ur";

    result.transactions.forEach((settlement) => {
      const fromName = displayNameForLanguage(settlement.from, lang);
      const toName = displayNameForLanguage(settlement.to, lang);
      const amount = settlement.amount.toFixed(2);

      if (isUrdu) {
        // Roman Urdu
        bullets.push(`${fromName} ne ${toName} ko Rs ${amount} dene hain`);
      } else {
        bullets.push(`${fromName} pays ${toName} Rs ${amount}`);
      }
    });

    if (bullets.length === 0) {
      bullets.push(isUrdu ? "Koi len den baqi nahi hai." : "No settlements required.");
    }

    return bullets;
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
  const downloadPDF = () => {
    try {
      console.log('Starting PDF generation...');

      const summaryBullets = getSettlementSummaryBullets(pdfLanguage);

      generatePDF({
        tripName,
        participants,
        expenses,
        totalExpense,
        result,
        pdfLanguage,
        urduNameMap,
        displayNameForLanguage: (name, lang) => displayNameForLanguage(name, lang),
        summaryBullets
      });

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
        message: 'Failed to generate PDF: ' + error.message,
        confirmText: 'OK'
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50" >
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-2">
        <div className="max-w-7xl mx-auto flex justify-between items-center gap-2">
          {/* Left: app name + auto-saved */}
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-bold text-gray-800 text-sm sm:text-base whitespace-nowrap">Smart Expense Splitter</span>
            {lastSaved && (
              <span className="hidden sm:flex items-center gap-1 text-xs text-gray-400">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                Saved
              </span>
            )}
          </div>

          {/* Right: actions */}
          <div className="flex items-center gap-1 shrink-0">
            <select
              className="text-xs border border-gray-300 rounded px-1.5 py-1 bg-white text-black focus:outline-none focus:ring-2 focus:ring-blue-400"
              value={pdfLanguage}
              onChange={(e) => setPdfLanguage(e.target.value)}
              title="PDF Language"
            >
              <option value="en">PDF: EN</option>
              <option value="ur">PDF: UR</option>
            </select>

            <Button onClick={exportData} variant="ghost" size="sm" className="text-gray-600 hover:text-gray-800 px-2 py-1 h-8" title="Export Data">
              <Save size={14} className="sm:mr-1" />
              <span className="hidden sm:inline text-xs">Export</span>
            </Button>

            <div className="relative">
              <input type="file" accept=".json" onChange={importData} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" id="import-file" />
              <Button variant="ghost" size="sm" className="text-gray-600 hover:text-gray-800 px-2 py-1 h-8" title="Import Data">
                <Upload size={14} className="sm:mr-1" />
                <span className="hidden sm:inline text-xs">Import</span>
              </Button>
            </div>

            <Button onClick={clearAllData} variant="ghost" size="sm" className="text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-1 h-8 text-xs whitespace-nowrap" title="Reset all data">
              Clear all
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      < main className="max-w-7xl mx-auto px-4 py-6" >
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
                              backgroundColor: getColor(index)
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
                      Rs {result ? (Object.values(result.balances).reduce((sum, balance) => sum + Math.abs(balance), 0) / 2).toFixed(2) : '0.00'}
                    </p>
                    <p className="text-xs text-white/80">not yet settled</p>
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
                <div className="flex bg-gray-100 p-1 rounded-lg mb-3">
                  <div
                    className={`flex-1 px-3 py-2 rounded-md font-medium text-sm transition-all cursor-pointer text-center ${paymentMode === "single" ? "bg-white text-blue-600 shadow-sm" : "text-black hover:text-gray-700"}`}
                    onClick={() => setPaymentMode("single")}
                  >
                    Single Payer
                  </div>
                  <div
                    className={`flex-1 px-3 py-2 rounded-md font-medium text-sm transition-all cursor-pointer text-center ${paymentMode === "multiple" ? "bg-white text-blue-600 shadow-sm" : "text-black hover:text-gray-700"}`}
                    onClick={() => setPaymentMode("multiple")}
                  >
                    Multiple Payers
                  </div>
                </div>

                {paymentMode === "single" ? (
                  <select
                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all text-black"
                    value={payer}
                    onChange={e => setPayer(e.target.value)}
                  >
                    {participants.map(participant => (
                      <option key={participant} value={participant}>{participant}</option>
                    ))}
                  </select>
                ) : (
                  <div className="space-y-2">
                    {multiplePayers.map((mp, idx) => (
                      <div key={idx} className="flex gap-2 items-center">
                        <select
                          className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 text-black text-sm"
                          value={mp.person}
                          onChange={e => updateMultiplePayerRow(idx, "person", e.target.value)}
                        >
                          <option value="">Select person...</option>
                          {participants.map(participant => (
                            <option key={participant} value={participant}>{participant}</option>
                          ))}
                        </select>
                        <input
                          type="number"
                          placeholder="Amount"
                          value={mp.amount}
                          onChange={e => updateMultiplePayerRow(idx, "amount", e.target.value)}
                          className="w-28 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 text-black text-sm"
                        />
                        {multiplePayers.length > 1 && (
                          <button
                            onClick={() => removeMultiplePayerRow(idx)}
                            className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                            type="button"
                          >
                            <X size={16} />
                          </button>
                        )}
                      </div>
                    ))}
                    <div className="flex items-center justify-between text-xs text-gray-500 px-1 pt-1">
                      <span>
                        Pool total: {formatCurrency(multiplePayers.reduce((sum, mp) => sum + (parseFloat(mp.amount) || 0), 0))}
                      </span>
                      {amount && (
                        <span className={
                          Math.abs(multiplePayers.reduce((sum, mp) => sum + (parseFloat(mp.amount) || 0), 0) - parseFloat(amount)) < 0.01
                            ? "text-green-600 font-medium"
                            : "text-orange-500"
                        }>
                          {Math.abs(multiplePayers.reduce((sum, mp) => sum + (parseFloat(mp.amount) || 0), 0) - parseFloat(amount)) < 0.01
                            ? "Matches total"
                            : `Rs ${(parseFloat(amount) - multiplePayers.reduce((sum, mp) => sum + (parseFloat(mp.amount) || 0), 0)).toFixed(2)} remaining`}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={addMultiplePayerRow}
                      type="button"
                      className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-colors flex items-center justify-center gap-1"
                    >
                      <Plus size={14} />
                      Add Payer
                    </button>
                  </div>
                )}
              </div>

              {/* Amount */}
              {paymentMode === "single" && (
                <div>
                  <Label className="text-sm font-semibold text-black mb-2 block">Amount (Rs)</Label>
                  <Input
                    type="number"
                    placeholder="e.g. 1500"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all text-black"
                  />
                </div>
              )}

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
                    className={`flex-1 px-4 py-2 rounded-md font-medium text-sm transition-all cursor-pointer text-center ${splitMode === "equal"
                      ? "bg-white text-blue-600 shadow-sm"
                      : "text-black hover:text-gray-700"
                      }`}
                    onClick={() => setSplitMode("equal")}
                  >
                    Equal
                  </div>
                  <div
                    className={`flex-1 px-4 py-2 rounded-md font-medium text-sm transition-all cursor-pointer text-center ${splitMode === "custom"
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
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-sm font-semibold text-black">Who shares this expense?</Label>
                  <button
                    type="button"
                    onClick={() => {
                      const allSelected = participants.every(p => customSplits[p]?.selected);
                      const next = {};
                      participants.forEach(p => { next[p] = { ...customSplits[p], selected: !allSelected }; });
                      setCustomSplits(next);
                    }}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                  >
                    {participants.every(p => customSplits[p]?.selected) ? 'Deselect All' : 'Select All'}
                  </button>
                </div>
                <div className="flex flex-wrap gap-4 justify-center">
                  {participants.map((participant, index) => (
                    <div key={participant} className="flex flex-col items-center">
                      <label className="flex flex-col items-center cursor-pointer">
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
                          className={`w-12 h-12 rounded-full flex items-center justify-center text-white text-lg font-semibold mb-2 transition-all ${customSplits[participant]?.selected ? 'ring-4 ring-blue-300' : ''
                            }`}
                          style={{
                            backgroundColor: getColor(index)
                          }}
                        >
                          {participant.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium text-black text-sm text-center">{participant}</span>
                      </label>
                      {splitMode === "custom" && customSplits[participant]?.selected && (
                        <input
                          type="number"
                          placeholder="0"
                          value={customSplits[participant]?.amount || ""}
                          onChange={(e) => setCustomSplits({
                            ...customSplits,
                            [participant]: {
                              ...customSplits[participant],
                              amount: e.target.value
                            }
                          })}
                          className="mt-2 w-24 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400 text-black placeholder-gray-400"
                        />
                      )}
                    </div>
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
        {
          expenses.length > 0 && (
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
                          {expense.paymentMode === "multiple" && expense.payers ? (
                            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold text-sm bg-purple-500">
                              $
                            </div>
                          ) : (
                            <div
                              className="w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold text-sm"
                              style={{
                                backgroundColor: getColor(participants.indexOf(expense.payer))
                              }}
                            >
                              {expense.payer?.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div>
                            {expense.paymentMode === "multiple" && expense.payers ? (
                              <div className="mb-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-bold text-green-600 text-lg">{formatCurrency(expense.amount)}</span>
                                  <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full font-medium">pooled</span>
                                </div>
                                <div className="flex flex-wrap gap-1">
                                  {expense.payers.map(p => (
                                    <span key={p.name} className="text-xs bg-purple-50 border border-purple-200 text-purple-700 rounded-full px-2 py-0.5">
                                      {p.name}: {formatCurrency(p.amount)}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-semibold text-black">{expense.payer}</span>
                                <span className="text-gray-500 text-sm">paid</span>
                                <span className="font-bold text-green-600 text-lg">{formatCurrency(expense.amount)}</span>
                              </div>
                            )}
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
                        <div className="flex gap-2 shrink-0">
                          <Button
                            onClick={() => startEditExpense(expense)}
                            variant="ghost"
                            size="sm"
                            className="h-9 px-3 text-blue-500 hover:text-blue-700 hover:bg-blue-50 flex items-center gap-1"
                            title="Edit expense"
                          >
                            <Edit2 size={15} />
                            <span className="text-xs font-medium">Edit</span>
                          </Button>
                          <Button
                            onClick={() => deleteExpense(expense.id)}
                            variant="ghost"
                            size="sm"
                            className="h-9 px-3 text-red-500 hover:text-red-700 hover:bg-red-50 flex items-center gap-1"
                            title="Delete expense"
                          >
                            <Trash2 size={15} />
                            <span className="text-xs font-medium">Delete</span>
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
                                  backgroundColor: getColor(participants.indexOf(participant))
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
          )
        }

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

        {/* Results */}
        {
          result && (
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
                    <div className="flex gap-2">
                      <Button
                        onClick={() => {
                          const lines = result.transactions.length === 0
                            ? ['All settled! No one owes anything.']
                            : result.transactions.map(t => `${t.from} pays ${t.to}: ${formatCurrency(t.amount)}`);
                          const text = (tripName ? `${tripName}\n` : '') + lines.join('\n');
                          navigator.clipboard.writeText(text).then(() => {
                            showCustomModal({ type: 'success', title: 'Copied!', message: 'Settlement results copied to clipboard. Paste it anywhere — WhatsApp, SMS, notes.', confirmText: 'OK' });
                          });
                        }}
                        variant="ghost"
                        size="sm"
                        className="text-gray-600 hover:text-gray-800"
                        title="Copy settlement to clipboard"
                      >
                        <Download size={16} className="mr-1 rotate-180" />
                        Copy
                      </Button>
                      <Button
                        onClick={downloadPDF}
                        variant="ghost"
                        size="sm"
                        className="text-gray-600 hover:text-gray-800"
                        title="Download PDF Report"
                      >
                        <Download size={16} className="mr-1" />
                        PDF
                      </Button>
                    </div>
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
                    {/* Settlement Plan */}
                    <div>
                      <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                        <span className="text-blue-600">Who pays whom</span>
                        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm font-semibold">
                          {result.transactions.length} payment{result.transactions.length !== 1 ? 's' : ''}
                        </span>
                      </h3>
                      <p className="text-sm text-gray-500 mb-3">Minimum transactions needed to settle everything:</p>
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
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold text-sm ${balance > 0 ? 'bg-green-600' : 'bg-red-600'
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
          )
        }

        {/* Edit Expense Form */}
        {
          editingExpense && (
            <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget) cancelEditExpense(); }}>
            <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-white rounded-xl shadow-xl border border-gray-200">
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
              <CardContent className="space-y-4 pb-6">
                {/* Who Paid */}
                <div>
                  <Label className="text-sm font-semibold text-black mb-2 block">Who Paid?</Label>
                  <div className="flex bg-gray-100 p-1 rounded-lg mb-3">
                    <div
                      className={`flex-1 px-3 py-2 rounded-md font-medium text-sm transition-all cursor-pointer text-center ${editPaymentMode === "single" ? "bg-white text-blue-600 shadow-sm" : "text-black hover:text-gray-700"}`}
                      onClick={() => setEditPaymentMode("single")}
                    >
                      Single Payer
                    </div>
                    <div
                      className={`flex-1 px-3 py-2 rounded-md font-medium text-sm transition-all cursor-pointer text-center ${editPaymentMode === "multiple" ? "bg-white text-blue-600 shadow-sm" : "text-black hover:text-gray-700"}`}
                      onClick={() => setEditPaymentMode("multiple")}
                    >
                      Multiple Payers
                    </div>
                  </div>
                  {editPaymentMode === "single" ? (
                    <select
                      className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 text-black"
                      value={editPayer}
                      onChange={e => setEditPayer(e.target.value)}
                    >
                      <option value="">Select payer...</option>
                      {participants.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  ) : (
                    <div className="space-y-2">
                      {editMultiplePayers.map((mp, idx) => (
                        <div key={idx} className="flex gap-2 items-center">
                          <select
                            className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 text-black text-sm"
                            value={mp.person}
                            onChange={e => setEditMultiplePayers(prev => prev.map((p, i) => i === idx ? { ...p, person: e.target.value } : p))}
                          >
                            <option value="">Select person...</option>
                            {participants.map(p => <option key={p} value={p}>{p}</option>)}
                          </select>
                          <input
                            type="number"
                            placeholder="Amount"
                            value={mp.amount}
                            onChange={e => setEditMultiplePayers(prev => prev.map((p, i) => i === idx ? { ...p, amount: e.target.value } : p))}
                            className="w-28 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 text-black text-sm"
                          />
                          {editMultiplePayers.length > 1 && (
                            <button onClick={() => setEditMultiplePayers(prev => prev.filter((_, i) => i !== idx))} className="p-2 text-red-500 hover:bg-red-50 rounded-lg" type="button">
                              <X size={16} />
                            </button>
                          )}
                        </div>
                      ))}
                      <div className="text-xs text-gray-500 px-1">
                        Pool total: {formatCurrency(editMultiplePayers.reduce((s, mp) => s + (parseFloat(mp.amount) || 0), 0))}
                      </div>
                      <button
                        onClick={() => setEditMultiplePayers(prev => [...prev, { person: "", amount: "" }])}
                        type="button"
                        className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-colors flex items-center justify-center gap-1"
                      >
                        <Plus size={14} /> Add Payer
                      </button>
                    </div>
                  )}
                </div>

                {/* Amount (single payer only) */}
                {editPaymentMode === "single" && (
                  <div>
                    <Label className="text-sm font-semibold text-black mb-2 block">Amount</Label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={editAmount}
                      onChange={e => setEditAmount(e.target.value)}
                      className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 text-black"
                    />
                  </div>
                )}

                {/* Description */}
                <div>
                  <Label className="text-sm font-semibold text-black mb-2 block">Description</Label>
                  <Input
                    type="text"
                    placeholder="e.g. Dinner, Gas, Hotel"
                    value={editDescription}
                    onChange={e => setEditDescription(e.target.value)}
                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 text-black"
                  />
                </div>

                {/* Split Mode */}
                <div>
                  <Label className="text-sm font-semibold text-black mb-3 block">Split Mode</Label>
                  <div className="flex bg-gray-100 p-1 rounded-lg">
                    <div
                      className={`flex-1 px-4 py-2 rounded-md font-medium text-sm transition-all cursor-pointer text-center ${editSplitMode === "equal" ? "bg-white text-blue-600 shadow-sm" : "text-black hover:text-gray-700"}`}
                      onClick={() => setEditSplitMode("equal")}
                    >Equal</div>
                    <div
                      className={`flex-1 px-4 py-2 rounded-md font-medium text-sm transition-all cursor-pointer text-center ${editSplitMode === "custom" ? "bg-white text-blue-600 shadow-sm" : "text-black hover:text-gray-700"}`}
                      onClick={() => setEditSplitMode("custom")}
                    >Custom</div>
                  </div>
                </div>

                {/* Participants */}
                <div>
                  <Label className="text-sm font-semibold text-black mb-3 block">Participants</Label>
                  <div className="flex flex-wrap gap-4 justify-center">
                    {participants.map((participant, index) => (
                      <div key={participant} className="flex flex-col items-center">
                        <label className="flex flex-col items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={editCustomSplits[participant]?.selected || false}
                            onChange={() => setEditCustomSplits(prev => ({
                              ...prev,
                              [participant]: { ...prev[participant], selected: !prev[participant]?.selected }
                            }))}
                            className="sr-only"
                          />
                          <div
                            className={`w-12 h-12 rounded-full flex items-center justify-center text-white text-lg font-semibold mb-2 transition-all ${editCustomSplits[participant]?.selected ? 'ring-4 ring-blue-300' : 'opacity-50'}`}
                            style={{ backgroundColor: getColor(index) }}
                          >
                            {participant.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-medium text-black text-sm text-center">{participant}</span>
                        </label>
                        {editSplitMode === "custom" && editCustomSplits[participant]?.selected && (
                          <input
                            type="number"
                            placeholder="0"
                            value={editCustomSplits[participant]?.amount || ""}
                            onChange={e => setEditCustomSplits(prev => ({ ...prev, [participant]: { ...prev[participant], amount: e.target.value } }))}
                            className="mt-2 w-24 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400 text-black"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>

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
            </div>
          )
        }

        {/* Rename Participant Modal */}
        {
          renamingParticipant && (
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
          )
        }
      </main >

      {/* Custom Modal */}
      {
        showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${modalConfig.type === 'success' ? 'bg-green-100' :
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
                    <h3 className={`font-semibold text-lg ${modalConfig.type === 'success' ? 'text-green-800' :
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
                    className={`px-4 py-2 ${modalConfig.type === 'success' ? 'bg-green-600 hover:bg-green-700' :
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
        )
      }
    </div >
  );
} 