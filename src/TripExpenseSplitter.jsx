import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./components/ui/card";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Label } from "./components/ui/label";
import {
  Trash2, Calculator, Plus, Users, DollarSign, UserPlus,
  Download, Upload, Save, Edit2, X, Moon, Sun, Share2,
  Clock, RotateCcw, Bookmark, Link, Check, MessageCircle
} from "lucide-react";
import { generatePDF } from './utils/pdfGenerator';

const CURRENCIES = {
  PKR: { symbol: 'Rs', name: 'PKR' },
  USD: { symbol: '$', name: 'USD' },
  AED: { symbol: 'AED', name: 'AED' },
  GBP: { symbol: '£', name: 'GBP' },
  SAR: { symbol: 'SAR', name: 'SAR' },
};

const PARTICIPANT_COLORS = [
  '#8B5CF6', '#3B82F6', '#10B981', '#F59E0B', '#EF4444',
  '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1',
];
const getColor = (i) => PARTICIPANT_COLORS[Math.abs(i) % PARTICIPANT_COLORS.length];
const genId = () => `${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

const encodeShare = (data) => {
  try { return btoa(encodeURIComponent(JSON.stringify(data)).replace(/%([0-9A-F]{2})/g, (_, p1) => String.fromCharCode(parseInt(p1, 16)))); }
  catch { return ''; }
};
const decodeShare = (str) => {
  try { return JSON.parse(decodeURIComponent(atob(str).split('').map(c => '%' + c.charCodeAt(0).toString(16).padStart(2, '0')).join(''))); }
  catch { return null; }
};

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    try {
      return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch { return dateStr; }
  }
  return dateStr;
};

export default function TripExpenseSplitter() {
  // ── Settings ──
  const [darkMode, setDarkMode] = useState(false);
  const [currency, setCurrency] = useState('PKR');

  // ── Trip Management ──
  const [currentTripId, setCurrentTripId] = useState(null);
  const [showTripSwitcher, setShowTripSwitcher] = useState(false);

  // ── Core Trip Data ──
  const [participants, setParticipants] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [tripName, setTripName] = useState('');
  const [urduNameMap, setUrduNameMap] = useState({});
  const [pdfLanguage, setPdfLanguage] = useState('en');

  // ── Add Expense Form ──
  const [payer, setPayer] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [expenseDate, setExpenseDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [splitMode, setSplitMode] = useState('equal');
  const [splitInputMode, setSplitInputMode] = useState('amount');
  const [paymentMode, setPaymentMode] = useState('single');
  const [multiplePayers, setMultiplePayers] = useState([{ person: '', amount: '' }]);
  const [customSplits, setCustomSplits] = useState({});

  // ── Edit Form ──
  const [editingExpense, setEditingExpense] = useState(null);
  const [editPayer, setEditPayer] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editSplitMode, setEditSplitMode] = useState('equal');
  const [editCustomSplits, setEditCustomSplits] = useState({});
  const [editPaymentMode, setEditPaymentMode] = useState('single');
  const [editMultiplePayers, setEditMultiplePayers] = useState([{ person: '', amount: '' }]);

  // ── Participant Management ──
  const [newParticipantName, setNewParticipantName] = useState('');
  const [renamingParticipant, setRenamingParticipant] = useState(null);
  const [newParticipantNameForRename, setNewParticipantNameForRename] = useState('');
  const [newParticipantUrduNameForRename, setNewParticipantUrduNameForRename] = useState('');

  // ── Saved Groups ──
  const [savedGroups, setSavedGroups] = useState([]);
  const [showGroupManager, setShowGroupManager] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');

  // ── Undo Delete ──
  const [undoState, setUndoState] = useState(null);

  // ── Results ──
  const [result, setResult] = useState(null);
  const [totalExpense, setTotalExpense] = useState(0);
  const [lastSaved, setLastSaved] = useState(null);

  // ── Share & PDF ──
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [shareCopied, setShareCopied] = useState(false);
  const [showPdfDialog, setShowPdfDialog] = useState(false);
  const [pdfCompact, setPdfCompact] = useState(false);
  const [sharedView, setSharedView] = useState(null);

  // ── Modal ──
  const [showModal, setShowModal] = useState(false);
  const [modalConfig, setModalConfig] = useState({
    type: 'info', title: '', message: '',
    onConfirm: null, confirmText: 'OK', cancelText: 'Cancel', showCancel: false
  });

  const showCustomModal = (config) => { setModalConfig(config); setShowModal(true); };
  const hideModal = () => {
    setShowModal(false);
    setModalConfig({ type: 'info', title: '', message: '', onConfirm: null, confirmText: 'OK', cancelText: 'Cancel', showCancel: false });
  };

  const formatCurrency = (amt) => `${CURRENCIES[currency]?.symbol || 'Rs'} ${Math.abs(amt).toFixed(2)}`;

  // Multiple payers helpers
  const addMultiplePayerRow = () => setMultiplePayers(p => [...p, { person: '', amount: '' }]);
  const removeMultiplePayerRow = (i) => setMultiplePayers(p => p.filter((_, idx) => idx !== i));
  const updateMultiplePayerRow = (i, field, val) => setMultiplePayers(p => p.map((mp, idx) => idx === i ? { ...mp, [field]: val } : mp));

  // ── Load on mount ──
  useEffect(() => {
    // Settings
    try {
      if (localStorage.getItem('ses_dark') === '1') setDarkMode(true);
      const sc = localStorage.getItem('ses_currency');
      if (sc && CURRENCIES[sc]) setCurrency(sc);
      const sg = localStorage.getItem('ses_groups');
      if (sg) setSavedGroups(JSON.parse(sg));
    } catch {}

    // Check for shared view URL
    try {
      const params = new URLSearchParams(window.location.search);
      const sp = params.get('share');
      if (sp) {
        const decoded = decodeShare(sp);
        if (decoded) { setSharedView(decoded); return; }
      }
    } catch {}

    // Load current trip
    try {
      const cid = localStorage.getItem('ses_current_id');
      const raw = localStorage.getItem('ses_trips');
      const trips = raw ? JSON.parse(raw) : [];

      if (cid && trips.some(t => t.id === cid)) {
        const trip = trips.find(t => t.id === cid);
        setCurrentTripId(trip.id);
        setTripName(trip.name || '');
        setParticipants(trip.participants || []);
        setExpenses(trip.expenses || []);
        setUrduNameMap(trip.urduNameMap || {});
        setPdfLanguage(trip.pdfLanguage || 'en');
        if (trip.participants?.length > 0) setPayer(trip.participants[0]);
        setLastSaved(trip.updatedAt);
      } else {
        // Migrate old format
        const old = localStorage.getItem('tripExpensesData');
        if (old) {
          const parsed = JSON.parse(old);
          const nid = genId();
          const newTrip = {
            id: nid, name: parsed.tripName || '',
            participants: parsed.participants || [], expenses: parsed.expenses || [],
            urduNameMap: parsed.urduNameMap || {}, pdfLanguage: parsed.pdfLanguage || 'en',
            createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
          };
          localStorage.setItem('ses_trips', JSON.stringify([...trips, newTrip]));
          localStorage.setItem('ses_current_id', nid);
          localStorage.removeItem('tripExpensesData');
          setCurrentTripId(nid);
          setTripName(newTrip.name); setParticipants(newTrip.participants);
          setExpenses(newTrip.expenses); setUrduNameMap(newTrip.urduNameMap);
          setPdfLanguage(newTrip.pdfLanguage);
          if (newTrip.participants.length > 0) setPayer(newTrip.participants[0]);
        } else {
          const nid = genId();
          setCurrentTripId(nid);
          localStorage.setItem('ses_current_id', nid);
        }
      }
    } catch { const nid = genId(); setCurrentTripId(nid); }

    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  }, []);

  // ── Auto-save current trip ──
  useEffect(() => {
    if (!currentTripId) return;
    try {
      const raw = localStorage.getItem('ses_trips');
      const trips = raw ? JSON.parse(raw) : [];
      const now = new Date().toISOString();
      const updated = {
        id: currentTripId, name: tripName, participants, expenses,
        urduNameMap, pdfLanguage, updatedAt: now,
        createdAt: trips.find(t => t.id === currentTripId)?.createdAt || now,
      };
      const newTrips = trips.some(t => t.id === currentTripId)
        ? trips.map(t => t.id === currentTripId ? updated : t)
        : [...trips, updated];
      localStorage.setItem('ses_trips', JSON.stringify(newTrips));
      setLastSaved(now);
    } catch {}
    setTotalExpense(expenses.reduce((s, e) => s + e.amount, 0));
  }, [currentTripId, participants, expenses, tripName, urduNameMap, pdfLanguage]);

  // Settings persistence
  useEffect(() => { try { localStorage.setItem('ses_dark', darkMode ? '1' : '0'); } catch {} }, [darkMode]);
  useEffect(() => { try { localStorage.setItem('ses_currency', currency); } catch {} }, [currency]);
  useEffect(() => { try { localStorage.setItem('ses_groups', JSON.stringify(savedGroups)); } catch {} }, [savedGroups]);

  useEffect(() => {
    if (participants.length > 0 && !payer) setPayer(participants[0]);
  }, [participants, payer]);

  useEffect(() => {
    setCustomSplits(prev => {
      const next = {};
      participants.forEach(p => { next[p] = prev[p] || { selected: true, amount: '', percent: '' }; });
      return next;
    });
  }, [participants]);

  useEffect(() => {
    if (paymentMode === 'multiple') {
      const total = multiplePayers.reduce((s, mp) => s + (parseFloat(mp.amount) || 0), 0);
      setAmount(total > 0 ? total.toString() : '');
    }
  }, [multiplePayers, paymentMode]);

  // Clean up undo timer
  useEffect(() => () => { if (undoState?.timer) clearTimeout(undoState.timer); }, [undoState]);

  // ── Trip Management ──
  const getStoredTrips = () => {
    try { const r = localStorage.getItem('ses_trips'); return r ? JSON.parse(r) : []; }
    catch { return []; }
  };

  const resetForm = () => {
    setAmount(''); setDescription(''); setNotes('');
    setExpenseDate(new Date().toISOString().split('T')[0]);
    setMultiplePayers([{ person: '', amount: '' }]);
    setPaymentMode('single'); setSplitMode('equal'); setSplitInputMode('amount');
  };

  const createNewTrip = () => {
    const nid = genId();
    setCurrentTripId(nid); setTripName(''); setParticipants([]);
    setExpenses([]); setUrduNameMap({}); setPdfLanguage('en');
    setPayer(''); setResult(null); setCustomSplits({});
    resetForm();
    localStorage.setItem('ses_current_id', nid);
    setShowTripSwitcher(false);
  };

  const switchToTrip = (tripId) => {
    try {
      const trip = getStoredTrips().find(t => t.id === tripId);
      if (!trip) return;
      setCurrentTripId(trip.id); setTripName(trip.name || '');
      setParticipants(trip.participants || []); setExpenses(trip.expenses || []);
      setUrduNameMap(trip.urduNameMap || {}); setPdfLanguage(trip.pdfLanguage || 'en');
      setPayer(trip.participants?.[0] || ''); setResult(null); setCustomSplits({});
      resetForm();
      localStorage.setItem('ses_current_id', trip.id);
      setShowTripSwitcher(false);
    } catch {}
  };

  const deleteTrip = (tripId) => {
    try {
      const trips = getStoredTrips().filter(t => t.id !== tripId);
      localStorage.setItem('ses_trips', JSON.stringify(trips));
      if (tripId === currentTripId) createNewTrip();
    } catch {}
  };

  // ── Participant Management ──
  const addParticipant = () => {
    const name = newParticipantName.trim();
    if (!name) return;
    if (participants.includes(name)) {
      showCustomModal({ type: 'warning', title: 'Already Exists', message: 'A participant with this name already exists.', confirmText: 'OK' });
      return;
    }
    const next = [...participants, name];
    setParticipants(next);
    setNewParticipantName('');
    if (participants.length === 0) setPayer(name);
  };

  const startRenameParticipant = (participant) => {
    setRenamingParticipant(participant);
    setNewParticipantNameForRename(participant);
    setNewParticipantUrduNameForRename(urduNameMap?.[participant] || '');
  };
  const cancelRename = () => { setRenamingParticipant(null); setNewParticipantNameForRename(''); setNewParticipantUrduNameForRename(''); };

  const saveRename = () => {
    const trimmed = newParticipantNameForRename.trim();
    const urdu = newParticipantUrduNameForRename.trim();
    if (!trimmed) { showCustomModal({ type: 'warning', title: 'Invalid Name', message: 'Name cannot be empty.', confirmText: 'OK' }); return; }
    const changed = trimmed !== renamingParticipant;
    if (changed && participants.includes(trimmed)) { showCustomModal({ type: 'warning', title: 'Name Exists', message: 'A participant with this name already exists.', confirmText: 'OK' }); return; }
    if (changed) {
      setParticipants(participants.map(p => p === renamingParticipant ? trimmed : p));
      setExpenses(expenses.map(exp => ({
        ...exp,
        payer: exp.payer === renamingParticipant ? trimmed : exp.payer,
        participants: exp.participants.map(p => p === renamingParticipant ? trimmed : p),
        splits: Object.fromEntries(Object.entries(exp.splits).map(([p, a]) => [p === renamingParticipant ? trimmed : p, a]))
      })));
      if (payer === renamingParticipant) setPayer(trimmed);
    }
    setUrduNameMap(prev => {
      const next = { ...(prev || {}) };
      if (changed && Object.prototype.hasOwnProperty.call(next, renamingParticipant)) { next[trimmed] = next[renamingParticipant]; delete next[renamingParticipant]; }
      if (urdu) next[trimmed] = urdu; else delete next[trimmed];
      return next;
    });
    setResult(null);
    cancelRename();
    showCustomModal({ type: 'success', title: 'Renamed', message: changed ? `Renamed to "${trimmed}".` : `Updated Urdu name for "${trimmed}".`, confirmText: 'OK' });
  };

  const removeParticipant = (participantToRemove) => {
    if (participants.length <= 2) {
      showCustomModal({ type: 'warning', title: 'Cannot Remove', message: 'Need at least 2 participants.', confirmText: 'OK' });
      return;
    }
    const hasExpenses = expenses.some(e => e.payer === participantToRemove || (e.participants && e.participants.includes(participantToRemove)));
    const doRemove = () => {
      const newP = participants.filter(p => p !== participantToRemove);
      setParticipants(newP);
      setExpenses(expenses.filter(e => e.payer !== participantToRemove && (!e.participants || !e.participants.includes(participantToRemove))));
      if (payer === participantToRemove && newP.length > 0) setPayer(newP[0]);
      setResult(null);
    };
    if (hasExpenses) {
      showCustomModal({ type: 'warning', title: 'Remove Participant', message: `${participantToRemove} has expenses. Removing will delete their expense history. Continue?`, showCancel: true, confirmText: 'Remove', cancelText: 'Cancel', onConfirm: () => { doRemove(); hideModal(); } });
    } else {
      doRemove();
    }
  };

  // ── Expense Management ──
  const addExpense = () => {
    if (!amount || !description.trim()) {
      showCustomModal({ type: 'warning', title: 'Missing Info', message: 'Please fill in amount and description.', confirmText: 'OK' });
      return;
    }
    if (paymentMode === 'single' && !payer) {
      showCustomModal({ type: 'warning', title: 'Missing Payer', message: 'Please select who paid.', confirmText: 'OK' });
      return;
    }
    const expAmt = parseFloat(amount);
    if (isNaN(expAmt) || expAmt <= 0) {
      showCustomModal({ type: 'error', title: 'Invalid Amount', message: 'Please enter a valid amount greater than 0.', confirmText: 'OK' });
      return;
    }

    let validatedPayers = null;
    if (paymentMode === 'multiple') {
      const vp = multiplePayers.filter(mp => mp.person && parseFloat(mp.amount) > 0);
      if (vp.length === 0) { showCustomModal({ type: 'warning', title: 'No Payers', message: 'Add at least one payer with a valid amount.', confirmText: 'OK' }); return; }
      if (new Set(vp.map(mp => mp.person)).size !== vp.length) { showCustomModal({ type: 'warning', title: 'Duplicate Payer', message: 'Each person can only appear once.', confirmText: 'OK' }); return; }
      const totalPaid = vp.reduce((s, mp) => s + parseFloat(mp.amount), 0);
      if (Math.abs(totalPaid - expAmt) > 0.01) { showCustomModal({ type: 'error', title: 'Amount Mismatch', message: `Payers total (${formatCurrency(totalPaid)}) must equal expense (${formatCurrency(expAmt)}).`, confirmText: 'OK' }); return; }
      validatedPayers = vp.map(mp => ({ name: mp.person, amount: parseFloat(mp.amount) }));
    }

    let expenseData;
    const baseFields = {
      id: Date.now(), paymentMode,
      payer: paymentMode === 'single' ? payer : null,
      payers: paymentMode === 'multiple' ? validatedPayers : null,
      amount: expAmt, description: description.trim(),
      notes: notes.trim(), date: expenseDate,
    };

    if (splitMode === 'equal') {
      const sel = participants.filter(p => customSplits[p]?.selected);
      if (sel.length === 0) { showCustomModal({ type: 'warning', title: 'No Participants', message: 'Select at least one participant.', confirmText: 'OK' }); return; }
      const share = expAmt / sel.length;
      const splits = {};
      sel.forEach(p => { splits[p] = share; });
      expenseData = { ...baseFields, participants: sel, splits, splitMode: 'equal' };
    } else {
      if (splitInputMode === 'percent') {
        const withPct = participants.filter(p => customSplits[p]?.selected && customSplits[p]?.percent && parseFloat(customSplits[p].percent) > 0);
        if (withPct.length === 0) { showCustomModal({ type: 'warning', title: 'No Percentages', message: 'Enter percentages for at least one participant.', confirmText: 'OK' }); return; }
        const totalPct = withPct.reduce((s, p) => s + parseFloat(customSplits[p].percent), 0);
        if (Math.abs(totalPct - 100) > 0.5) { showCustomModal({ type: 'error', title: 'Percentage Total', message: `Percentages sum to ${totalPct.toFixed(1)}%. Must add up to 100%.`, confirmText: 'OK' }); return; }
        const splits = {};
        withPct.forEach(p => { splits[p] = expAmt * parseFloat(customSplits[p].percent) / 100; });
        expenseData = { ...baseFields, participants: withPct, splits, splitMode: 'custom' };
      } else {
        const withAmt = participants.filter(p => customSplits[p]?.amount && parseFloat(customSplits[p].amount) > 0);
        if (withAmt.length === 0) { showCustomModal({ type: 'warning', title: 'No Amounts', message: 'Enter amounts for at least one participant.', confirmText: 'OK' }); return; }
        const totalSplit = withAmt.reduce((s, p) => s + parseFloat(customSplits[p].amount), 0);
        if (Math.abs(totalSplit - expAmt) > 0.01) { showCustomModal({ type: 'error', title: 'Split Mismatch', message: `Split amounts (${formatCurrency(totalSplit)}) must equal total (${formatCurrency(expAmt)}).`, confirmText: 'OK' }); return; }
        const splits = {};
        withAmt.forEach(p => { splits[p] = parseFloat(customSplits[p].amount); });
        expenseData = { ...baseFields, participants: withAmt, splits, splitMode: 'custom' };
      }
    }

    setExpenses([...expenses, expenseData]);
    resetForm();
    const resetSplits = {};
    participants.forEach(p => { resetSplits[p] = { selected: true, amount: '', percent: '' }; });
    setCustomSplits(resetSplits);
    setResult(null);
  };

  const deleteExpense = (id) => {
    const expense = expenses.find(e => e.id === id);
    const index = expenses.findIndex(e => e.id === id);
    if (!expense) return;
    if (undoState?.timer) clearTimeout(undoState.timer);
    const timer = setTimeout(() => setUndoState(null), 5000);
    setUndoState({ expense, index, timer });
    setExpenses(prev => prev.filter(e => e.id !== id));
    setResult(null);
  };

  const undoDelete = () => {
    if (!undoState) return;
    clearTimeout(undoState.timer);
    const { expense, index } = undoState;
    setExpenses(prev => { const next = [...prev]; next.splice(index, 0, expense); return next; });
    setUndoState(null);
    setResult(null);
  };

  const startEditExpense = (expense) => {
    setEditingExpense(expense);
    setEditDescription(expense.description);
    setEditNotes(expense.notes || '');
    setEditDate(/^\d{4}-\d{2}-\d{2}$/.test(expense.date || '') ? expense.date : new Date().toISOString().split('T')[0]);
    setEditSplitMode(expense.splitMode);
    const mode = expense.paymentMode === 'multiple' ? 'multiple' : 'single';
    setEditPaymentMode(mode);
    if (mode === 'multiple' && expense.payers) {
      setEditPayer('');
      setEditMultiplePayers(expense.payers.map(p => ({ person: p.name, amount: p.amount.toString() })));
      setEditAmount(expense.amount.toString());
    } else {
      setEditPayer(expense.payer || '');
      setEditMultiplePayers([{ person: '', amount: '' }]);
      setEditAmount(expense.amount.toString());
    }
    const initSplits = {};
    participants.forEach(p => {
      initSplits[p] = { selected: expense.participants.includes(p), amount: expense.splits[p]?.toString() || '', percent: '' };
    });
    setEditCustomSplits(initSplits);
  };

  const cancelEditExpense = () => {
    setEditingExpense(null); setEditPayer(''); setEditAmount(''); setEditDescription('');
    setEditNotes(''); setEditDate(''); setEditSplitMode('equal'); setEditCustomSplits({});
    setEditPaymentMode('single'); setEditMultiplePayers([{ person: '', amount: '' }]);
  };

  const saveEditExpense = () => {
    if (!editDescription.trim()) { showCustomModal({ type: 'warning', title: 'Missing Info', message: 'Please fill in the description.', confirmText: 'OK' }); return; }
    if (editPaymentMode === 'single' && !editPayer) { showCustomModal({ type: 'warning', title: 'Missing Payer', message: 'Please select who paid.', confirmText: 'OK' }); return; }

    let editValidatedPayers = null;
    if (editPaymentMode === 'multiple') {
      const vp = editMultiplePayers.filter(mp => mp.person && parseFloat(mp.amount) > 0);
      if (vp.length === 0) { showCustomModal({ type: 'warning', title: 'No Payers', message: 'Add at least one payer.', confirmText: 'OK' }); return; }
      if (new Set(vp.map(mp => mp.person)).size !== vp.length) { showCustomModal({ type: 'warning', title: 'Duplicate Payer', message: 'Each person can only appear once.', confirmText: 'OK' }); return; }
      editValidatedPayers = vp.map(mp => ({ name: mp.person, amount: parseFloat(mp.amount) }));
    }

    const expAmt = editPaymentMode === 'multiple'
      ? editMultiplePayers.reduce((s, mp) => s + (parseFloat(mp.amount) || 0), 0)
      : parseFloat(editAmount);
    if (isNaN(expAmt) || expAmt <= 0) { showCustomModal({ type: 'error', title: 'Invalid Amount', message: 'Please enter a valid amount.', confirmText: 'OK' }); return; }

    const baseFields = {
      ...editingExpense,
      paymentMode: editPaymentMode,
      payer: editPaymentMode === 'single' ? editPayer : null,
      payers: editPaymentMode === 'multiple' ? editValidatedPayers : null,
      amount: expAmt, description: editDescription.trim(),
      notes: editNotes.trim(), date: editDate,
    };

    let expenseData;
    if (editSplitMode === 'equal') {
      const sel = participants.filter(p => editCustomSplits[p]?.selected);
      if (sel.length === 0) { showCustomModal({ type: 'warning', title: 'No Participants', message: 'Select at least one participant.', confirmText: 'OK' }); return; }
      const splits = {};
      sel.forEach(p => { splits[p] = expAmt / sel.length; });
      expenseData = { ...baseFields, participants: sel, splits, splitMode: 'equal' };
    } else {
      const withAmt = participants.filter(p => editCustomSplits[p]?.amount && parseFloat(editCustomSplits[p].amount) > 0);
      if (withAmt.length === 0) { showCustomModal({ type: 'warning', title: 'No Amounts', message: 'Enter amounts for at least one participant.', confirmText: 'OK' }); return; }
      const totalSplit = withAmt.reduce((s, p) => s + parseFloat(editCustomSplits[p].amount), 0);
      if (Math.abs(totalSplit - expAmt) > 0.01) { showCustomModal({ type: 'error', title: 'Split Mismatch', message: `Split amounts (${formatCurrency(totalSplit)}) must equal total (${formatCurrency(expAmt)}).`, confirmText: 'OK' }); return; }
      const splits = {};
      withAmt.forEach(p => { splits[p] = parseFloat(editCustomSplits[p].amount); });
      expenseData = { ...baseFields, participants: withAmt, splits, splitMode: 'custom' };
    }

    setExpenses(expenses.map(e => e.id === editingExpense.id ? expenseData : e));
    setResult(null);
    cancelEditExpense();
  };

  const clearAllExpenses = () => {
    showCustomModal({ type: 'warning', title: 'Clear All Expenses', message: 'Are you sure? This cannot be undone.', showCancel: true, confirmText: 'Clear All', cancelText: 'Cancel', onConfirm: () => { setExpenses([]); setResult(null); hideModal(); } });
  };

  const clearAllData = () => {
    showCustomModal({ type: 'warning', title: 'Clear All Data', message: 'Reset everything? This cannot be undone.', showCancel: true, confirmText: 'Clear All', cancelText: 'Cancel', onConfirm: () => { setExpenses([]); setParticipants([]); setPayer(''); setTripName(''); setResult(null); setCustomSplits({}); hideModal(); } });
  };

  // ── Saved Groups ──
  const saveCurrentAsGroup = () => {
    if (!newGroupName.trim()) { showCustomModal({ type: 'warning', title: 'Name Required', message: 'Enter a name for this group.', confirmText: 'OK' }); return; }
    if (participants.length === 0) { showCustomModal({ type: 'warning', title: 'No Participants', message: 'Add participants first.', confirmText: 'OK' }); return; }
    const group = { id: genId(), name: newGroupName.trim(), members: [...participants] };
    setSavedGroups(prev => [...prev, group]);
    setNewGroupName('');
    showCustomModal({ type: 'success', title: 'Group Saved', message: `"${group.name}" saved with ${group.members.length} members.`, confirmText: 'OK' });
  };

  const loadGroup = (group) => {
    const doLoad = () => { setParticipants(group.members); setPayer(group.members[0] || ''); setResult(null); setShowGroupManager(false); };
    if (expenses.length > 0) {
      showCustomModal({ type: 'warning', title: 'Load Group', message: `Load "${group.name}"? Current participants will be replaced (expenses kept).`, showCancel: true, confirmText: 'Load', cancelText: 'Cancel', onConfirm: () => { doLoad(); hideModal(); } });
    } else { doLoad(); }
  };

  // ── Share ──
  const generateShareLink = () => {
    if (!result) { showCustomModal({ type: 'info', title: 'Calculate First', message: 'Calculate settlements before sharing.', confirmText: 'OK' }); return; }
    const data = { tripName, participants, expenses, result, currency };
    const encoded = encodeShare(data);
    const url = `${window.location.origin}${window.location.pathname}?share=${encoded}`;
    setShareUrl(url); setShareCopied(false); setShowShareModal(true);
  };

  const copyShareLink = () => {
    navigator.clipboard.writeText(shareUrl).then(() => { setShareCopied(true); setTimeout(() => setShareCopied(false), 2000); });
  };

  const shareWhatsApp = () => {
    if (!result) return;
    const sym = CURRENCIES[currency]?.symbol || 'Rs';
    const lines = result.transactions.length === 0
      ? ['All settled! ✅']
      : result.transactions.map(t => `• ${t.from} → ${t.to}: ${sym} ${t.amount.toFixed(2)}`);
    const text = `*${tripName || 'Expense Split'}*\n\n${lines.join('\n')}\n\n_Total: ${sym} ${totalExpense.toFixed(2)}_`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  // ── Calculation ──
  const calculateOriginalDebts = () => {
    const debtMap = {};
    expenses.forEach((expense) => {
      const { splits } = expense;
      if (expense.paymentMode === 'multiple' && expense.payers) {
        const totalPaid = expense.payers.reduce((s, p) => s + p.amount, 0);
        expense.payers.forEach(({ name: payerName, amount: payerAmt }) => {
          const prop = totalPaid > 0 ? payerAmt / totalPaid : 0;
          Object.entries(splits).forEach(([participant, share]) => {
            const ps = share * prop;
            if (participant !== payerName && ps > 0.01) {
              const key = `${participant}->${payerName}`;
              if (!debtMap[key]) debtMap[key] = { from: participant, to: payerName, amount: 0 };
              debtMap[key].amount += ps;
            }
          });
        });
      } else {
        const p = expense.payer;
        Object.entries(splits).forEach(([participant, amt]) => {
          if (participant !== p && amt > 0) {
            const key = `${participant}->${p}`;
            if (!debtMap[key]) debtMap[key] = { from: participant, to: p, amount: 0 };
            debtMap[key].amount += amt;
          }
        });
      }
    });
    const processed = new Set();
    const netted = [];
    Object.values(debtMap).forEach(debt => {
      const k1 = `${debt.from}-${debt.to}`, k2 = `${debt.to}-${debt.from}`;
      if (processed.has(k1) || processed.has(k2)) return;
      const rev = debtMap[`${debt.to}->${debt.from}`];
      if (rev) {
        const net = Math.abs(debt.amount - rev.amount);
        if (net > 0.01) netted.push({ from: debt.amount > rev.amount ? debt.from : debt.to, to: debt.amount > rev.amount ? debt.to : debt.from, amount: Math.round(net * 100) / 100 });
        processed.add(k1); processed.add(k2);
      } else {
        netted.push({ from: debt.from, to: debt.to, amount: Math.round(debt.amount * 100) / 100 });
        processed.add(k1);
      }
    });
    return netted;
  };

  const calculate = () => {
    if (expenses.length === 0) { showCustomModal({ type: 'info', title: 'No Expenses', message: 'Add some expenses first.', confirmText: 'OK' }); return; }
    const originalDebts = calculateOriginalDebts();
    const balances = {};
    participants.forEach(p => { balances[p] = 0; });
    expenses.forEach((expense) => {
      Object.entries(expense.splits).forEach(([p, share]) => { if (balances[p] !== undefined) balances[p] -= share; });
      if (expense.paymentMode === 'multiple' && expense.payers) {
        expense.payers.forEach(({ name, amount: amt }) => { if (balances[name] !== undefined) balances[name] += amt; });
      } else {
        if (expense.payer && balances[expense.payer] !== undefined) balances[expense.payer] += expense.amount;
      }
    });
    const transactions = [];
    const people = Object.entries(balances).filter(([, b]) => Math.abs(b) > 0.01).sort((a, b) => a[1] - b[1]);
    let i = 0, j = people.length - 1;
    while (i < j) {
      const [debtor, debtAmt] = people[i];
      const [creditor, creditAmt] = people[j];
      const settled = Math.min(-debtAmt, creditAmt);
      if (settled > 0.01) { transactions.push({ from: debtor, to: creditor, amount: settled }); people[i][1] += settled; people[j][1] -= settled; }
      if (Math.abs(people[i][1]) < 0.01) i++;
      if (Math.abs(people[j][1]) < 0.01) j--;
    }
    setResult({ transactions, balances, originalDebts });
  };

  const displayNameForLanguage = (name, lang = 'en') => {
    if (lang !== 'ur') return name;
    const mapped = urduNameMap?.[name];
    return mapped && mapped.trim() ? mapped.trim() : name;
  };

  const getSettlementSummaryBullets = (lang) => {
    if (!result) return [lang === 'ur' ? 'Calculate Settlement par click karein.' : 'Click "Calculate Settlement" to see results.'];
    if (!result.transactions?.length) return [lang === 'ur' ? 'Sab hisab barabar hai.' : 'All settled. No one owes anything.'];
    return result.transactions.map(t => {
      const from = displayNameForLanguage(t.from, lang);
      const to = displayNameForLanguage(t.to, lang);
      return lang === 'ur' ? `${from} ne ${to} ko ${CURRENCIES[currency]?.symbol || 'Rs'} ${t.amount.toFixed(2)} dene hain` : `${from} pays ${to} ${CURRENCIES[currency]?.symbol || 'Rs'} ${t.amount.toFixed(2)}`;
    });
  };

  // ── Export / Import / PDF ──
  const exportData = () => {
    const data = { participants, expenses, tripName, totalExpense, lastUpdated: new Date().toISOString(), version: '2.0' };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `expense-splitter-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
    showCustomModal({ type: 'success', title: 'Export Done', message: 'Data exported to downloads.', confirmText: 'OK' });
  };

  const importData = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imp = JSON.parse(e.target.result);
        if (!imp.participants || !Array.isArray(imp.participants) || !imp.expenses || !Array.isArray(imp.expenses)) {
          showCustomModal({ type: 'error', title: 'Invalid File', message: 'Not a valid backup file.', confirmText: 'OK' }); return;
        }
        showCustomModal({
          type: 'warning', title: 'Import Data',
          message: `Replace current data with ${imp.participants.length} participants and ${imp.expenses.length} expenses?`,
          showCancel: true, confirmText: 'Import', cancelText: 'Cancel',
          onConfirm: () => {
            setParticipants(imp.participants); setExpenses(imp.expenses);
            setTripName(imp.tripName || ''); setResult(null);
            setPayer(imp.participants[0] || '');
            hideModal(); showCustomModal({ type: 'success', title: 'Imported', message: 'Data imported successfully!', confirmText: 'OK' });
          }
        });
      } catch { showCustomModal({ type: 'error', title: 'Import Error', message: 'Error reading file.', confirmText: 'OK' }); }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const downloadPDF = () => {
    try {
      generatePDF({
        tripName, participants, expenses, totalExpense, result,
        pdfLanguage, urduNameMap, displayNameForLanguage,
        summaryBullets: getSettlementSummaryBullets(pdfLanguage),
        currency,
        compact: pdfCompact,
      });
    } catch (err) {
      showCustomModal({ type: 'error', title: 'PDF Failed', message: err.message, confirmText: 'OK' });
    }
  };

  // ── Shared View ──
  if (sharedView) {
    const sv = sharedView;
    const svSym = CURRENCIES[sv.currency]?.symbol || 'Rs';
    return (
      <div className={`min-h-screen ${darkMode ? 'dark' : ''} bg-gray-50 dark:bg-gray-900`}>
        <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
          <div className="max-w-2xl mx-auto flex items-center justify-between">
            <span className="font-bold text-lg text-gray-900 dark:text-white">Smart Expense Splitter</span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 bg-gray-100 dark:bg-gray-700 dark:text-gray-400 px-2 py-1 rounded-full">Read-only</span>
              <Button onClick={() => setDarkMode(!darkMode)} variant="ghost" size="sm" className="p-1.5 h-7 w-7">
                {darkMode ? <Sun size={14} className="text-yellow-400" /> : <Moon size={14} className="text-gray-500" />}
              </Button>
            </div>
          </div>
        </header>
        <main className="max-w-2xl mx-auto px-4 py-6 space-y-4">
          {sv.tripName && <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{sv.tripName}</h2>}
          <div className="flex flex-wrap gap-2">
            {(sv.participants || []).map((p, i) => (
              <div key={p} className="flex items-center gap-2 px-3 py-1.5 rounded-full text-white text-sm font-medium" style={{ backgroundColor: getColor(i) }}>
                <span>{p.charAt(0).toUpperCase()}</span><span>{p}</span>
              </div>
            ))}
          </div>
          <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-gray-900 dark:text-white flex items-center gap-2">
                Who pays whom
                <span className="text-sm bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full">
                  {sv.result?.transactions?.length || 0} payments
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {!sv.result?.transactions?.length ? (
                <p className="text-center text-green-600 font-semibold py-4">All settled! No one owes anything.</p>
              ) : sv.result.transactions.map(t => (
                <div key={`${t.from}-${t.to}`} className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800 flex items-center justify-between">
                  <span className="font-semibold text-gray-800 dark:text-white">{t.from} → {t.to}</span>
                  <span className="font-bold text-green-600">{svSym} {t.amount.toFixed(2)}</span>
                </div>
              ))}
            </CardContent>
          </Card>
          <p className="text-center text-sm text-gray-400">
            Total: {svSym} {(sv.expenses || []).reduce((s, e) => s + e.amount, 0).toFixed(2)} across {(sv.expenses || []).length} expenses
          </p>
          <div className="text-center">
            <a href={window.location.origin + window.location.pathname} className="text-blue-600 hover:underline text-sm">Open the full app →</a>
          </div>
        </main>
      </div>
    );
  }

  // ── Main App ──
  return (
    <div className={`min-h-screen ${darkMode ? 'dark' : ''} bg-gray-50 dark:bg-gray-900`}>

      {/* Undo Toast */}
      {undoState && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-gray-900 text-white px-4 py-3 rounded-full shadow-xl animate-pulse-once">
          <Trash2 size={14} className="text-red-400 shrink-0" />
          <span className="text-sm whitespace-nowrap">Expense deleted</span>
          <button onClick={undoDelete} className="flex items-center gap-1 bg-white text-gray-900 hover:bg-gray-100 px-3 py-1 rounded-full text-xs font-semibold">
            <RotateCcw size={11} /> Undo
          </button>
        </div>
      )}

      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-3 py-2">
        <div className="max-w-7xl mx-auto flex justify-between items-center gap-1.5">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-bold text-gray-800 dark:text-white text-sm sm:text-base whitespace-nowrap">Smart Expense Splitter</span>
            {lastSaved && (
              <span className="hidden sm:flex items-center gap-1 text-xs text-gray-400">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />Saved
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0 flex-wrap justify-end">
            {/* Trip Switcher */}
            <Button onClick={() => setShowTripSwitcher(true)} variant="ghost" size="sm" className="text-gray-600 dark:text-gray-300 px-1.5 py-1 h-7 sm:h-8" title="Trip History">
              <Clock size={13} className="sm:mr-1" />
              <span className="hidden sm:inline text-xs">Trips</span>
            </Button>
            {/* Currency */}
            <select
              className="text-xs border border-gray-300 dark:border-gray-600 rounded px-1 py-1 bg-white dark:bg-gray-700 text-black dark:text-white focus:outline-none h-7 sm:h-8"
              value={currency} onChange={e => setCurrency(e.target.value)} title="Currency"
            >
              {Object.entries(CURRENCIES).map(([code]) => (
                <option key={code} value={code}>{code}</option>
              ))}
            </select>
            {/* Dark Mode */}
            <Button onClick={() => setDarkMode(!darkMode)} variant="ghost" size="sm" className="px-1.5 py-1 h-7 sm:h-8" title="Toggle dark mode">
              {darkMode ? <Sun size={13} className="text-yellow-400" /> : <Moon size={13} className="text-gray-600" />}
            </Button>
            {/* Export */}
            <Button onClick={exportData} variant="ghost" size="sm" className="text-gray-600 dark:text-gray-300 px-1.5 py-1 h-7 sm:h-8" title="Export">
              <Save size={13} className="sm:mr-1" />
              <span className="hidden sm:inline text-xs">Export</span>
            </Button>
            {/* Import */}
            <div className="relative h-7 sm:h-8">
              <input type="file" accept=".json" onChange={importData} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
              <Button variant="ghost" size="sm" className="text-gray-600 dark:text-gray-300 px-1.5 py-1 h-full" title="Import">
                <Upload size={13} className="sm:mr-1" />
                <span className="hidden sm:inline text-xs">Import</span>
              </Button>
            </div>
            {/* Clear */}
            <Button onClick={clearAllData} variant="ghost" size="sm" className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 px-1.5 py-1 h-7 sm:h-8 text-xs whitespace-nowrap">
              Clear
            </Button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">

          {/* Left: Participants */}
          <Card className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center shrink-0">
                    <Users className="text-white" size={16} />
                  </div>
                  <CardTitle className="text-base sm:text-lg font-bold text-black dark:text-white">Smart Expense Splitter</CardTitle>
                </div>
                <Button onClick={() => setShowGroupManager(true)} variant="ghost" size="sm" className="text-purple-600 dark:text-purple-400 px-2 py-1 h-8 text-xs" title="Saved Groups">
                  <Bookmark size={13} className="mr-1" />
                  <span className="hidden sm:inline">Groups</span>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Trip Name */}
              <div>
                <Label className="text-sm font-semibold text-black dark:text-white mb-2 block">Trip/Group Name (Optional)</Label>
                <Input
                  placeholder="e.g. Weekend Trip, Office Lunch..."
                  value={tripName} onChange={e => setTripName(e.target.value)}
                  className="w-full bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-black dark:text-white"
                />
              </div>

              <div>
                <h3 className="text-base font-bold text-black dark:text-white mb-3">Participants</h3>
                <div className="mb-3">
                  <Input
                    placeholder="Enter participant name..."
                    value={newParticipantName}
                    onChange={e => setNewParticipantName(e.target.value)}
                    onKeyPress={e => e.key === 'Enter' && addParticipant()}
                    className="w-full bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-black dark:text-white rounded-full"
                  />
                </div>

                {/* Participants circles */}
                <div className="flex flex-wrap gap-3 sm:gap-4 justify-center mb-4 min-h-[70px]">
                  {participants.length === 0 ? (
                    <div className="text-center py-3 text-gray-500 dark:text-gray-400">
                      <Users className="mx-auto mb-2" size={24} />
                      <p className="text-sm">Add participants to get started</p>
                    </div>
                  ) : participants.map((participant, index) => (
                    <div key={participant} className="flex flex-col items-center group">
                      <div className="relative">
                        <div
                          className="w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-white text-base sm:text-lg font-semibold mb-1 cursor-pointer"
                          style={{ backgroundColor: getColor(index) }}
                          onClick={() => startRenameParticipant(participant)}
                          title={`Click to rename ${participant}`}
                        >
                          {participant.charAt(0).toUpperCase()}
                        </div>
                        <div className="absolute -top-1.5 -right-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={e => { e.stopPropagation(); removeParticipant(participant); }}
                            className="h-5 w-5 bg-red-500 hover:bg-red-600 text-white rounded-full shadow flex items-center justify-center"
                            type="button" title={`Remove ${participant}`}
                          >
                            <X size={10} />
                          </button>
                        </div>
                      </div>
                      <span className="font-medium text-black dark:text-white text-xs text-center cursor-pointer hover:text-blue-600 max-w-[60px] truncate" onClick={() => startRenameParticipant(participant)}>{participant}</span>
                    </div>
                  ))}
                </div>

                <Button onClick={addParticipant} className="w-full bg-green-400 hover:bg-green-500 text-black font-semibold py-2.5 rounded-lg" disabled={!newParticipantName.trim()}>
                  <UserPlus size={15} className="mr-2" />Add person
                </Button>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-2 gap-3">
                <Card className="bg-indigo-600 rounded-lg">
                  <CardContent className="p-3 text-center">
                    <div className="w-7 h-7 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-1.5">
                      <DollarSign className="text-white" size={14} />
                    </div>
                    <h3 className="text-xs font-bold text-white mb-0.5">Total Expenses</h3>
                    <p className="text-base font-bold text-white">{formatCurrency(totalExpense)}</p>
                    <p className="text-xs text-white/70">{expenses.length} expenses</p>
                  </CardContent>
                </Card>
                <Card className="bg-teal-600 rounded-lg">
                  <CardContent className="p-3 text-center">
                    <div className="w-7 h-7 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-1.5">
                      <Calculator className="text-white" size={14} />
                    </div>
                    <h3 className="text-xs font-bold text-white mb-0.5">Pending</h3>
                    <p className="text-base font-bold text-white">
                      {formatCurrency(result ? Object.values(result.balances).reduce((s, b) => s + Math.abs(b), 0) / 2 : 0)}
                    </p>
                    <p className="text-xs text-white/70">not yet settled</p>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>

          {/* Right: Add Expense */}
          <Card className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-base sm:text-lg font-bold text-black dark:text-white">Add Expense</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Who Paid */}
              <div>
                <Label className="text-sm font-semibold text-black dark:text-white mb-2 block">Who Paid?</Label>
                <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-lg mb-3">
                  {['single', 'multiple'].map(mode => (
                    <div key={mode}
                      className={`flex-1 px-3 py-2 rounded-md font-medium text-sm transition-all cursor-pointer text-center ${paymentMode === mode ? 'bg-white dark:bg-gray-600 text-blue-600 shadow-sm' : 'text-black dark:text-gray-300'}`}
                      onClick={() => setPaymentMode(mode)}
                    >
                      {mode === 'single' ? 'Single Payer' : 'Multiple Payers'}
                    </div>
                  ))}
                </div>

                {paymentMode === 'single' ? (
                  <select
                    className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-black dark:text-white focus:ring-2 focus:ring-blue-400"
                    value={payer} onChange={e => setPayer(e.target.value)}
                  >
                    {participants.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                ) : (
                  <div className="space-y-2">
                    {multiplePayers.map((mp, idx) => (
                      <div key={idx} className="flex gap-2 items-center">
                        <select
                          className="flex-1 min-w-0 px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-black dark:text-white text-sm"
                          value={mp.person} onChange={e => updateMultiplePayerRow(idx, 'person', e.target.value)}
                        >
                          <option value="">Select person...</option>
                          {participants.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                        <input
                          type="number" placeholder="Amt"
                          value={mp.amount} onChange={e => updateMultiplePayerRow(idx, 'amount', e.target.value)}
                          className="w-24 shrink-0 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-black dark:text-white text-sm"
                        />
                        {multiplePayers.length > 1 && (
                          <button onClick={() => removeMultiplePayerRow(idx)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg shrink-0" type="button">
                            <X size={15} />
                          </button>
                        )}
                      </div>
                    ))}
                    <div className="flex items-center justify-between text-xs text-gray-500 px-1 pt-1">
                      <span>Pool: {formatCurrency(multiplePayers.reduce((s, mp) => s + (parseFloat(mp.amount) || 0), 0))}</span>
                    </div>
                    <button onClick={addMultiplePayerRow} type="button"
                      className="w-full py-2 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-500 dark:text-gray-400 hover:border-blue-400 hover:text-blue-600 flex items-center justify-center gap-1"
                    >
                      <Plus size={13} />Add Payer
                    </button>
                  </div>
                )}
              </div>

              {/* Amount (single only) */}
              {paymentMode === 'single' && (
                <div>
                  <Label className="text-sm font-semibold text-black dark:text-white mb-2 block">Amount ({CURRENCIES[currency]?.symbol || 'Rs'})</Label>
                  <Input type="number" placeholder="e.g. 1500" value={amount} onChange={e => setAmount(e.target.value)}
                    className="w-full bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-black dark:text-white"
                  />
                </div>
              )}

              {/* Description */}
              <div>
                <Label className="text-sm font-semibold text-black dark:text-white mb-2 block">Description</Label>
                <Input type="text" placeholder="e.g. Dinner, Gas, Hotel" value={description} onChange={e => setDescription(e.target.value)}
                  className="w-full bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-black dark:text-white"
                />
              </div>

              {/* Date + Notes row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-sm font-semibold text-black dark:text-white mb-2 block">Date</Label>
                  <input type="date" value={expenseDate} onChange={e => setExpenseDate(e.target.value)}
                    className="w-full px-3 py-2.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-black dark:text-white focus:ring-2 focus:ring-blue-400 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-sm font-semibold text-black dark:text-white mb-2 block">Notes (Optional)</Label>
                  <input type="text" placeholder="Any notes..." value={notes} onChange={e => setNotes(e.target.value)}
                    className="w-full px-3 py-2.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-black dark:text-white focus:ring-2 focus:ring-blue-400 text-sm"
                  />
                </div>
              </div>

              {/* Split Mode */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-sm font-semibold text-black dark:text-white">Split Mode</Label>
                  {splitMode === 'custom' && (
                    <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 p-0.5 rounded-md">
                      <button type="button" onClick={() => setSplitInputMode('amount')}
                        className={`px-2 py-0.5 rounded text-xs font-medium transition-all ${splitInputMode === 'amount' ? 'bg-white dark:bg-gray-600 text-blue-600 shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}>
                        {CURRENCIES[currency]?.symbol || 'Rs'}
                      </button>
                      <button type="button" onClick={() => setSplitInputMode('percent')}
                        className={`px-2 py-0.5 rounded text-xs font-medium transition-all ${splitInputMode === 'percent' ? 'bg-white dark:bg-gray-600 text-blue-600 shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}>
                        %
                      </button>
                    </div>
                  )}
                </div>
                <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
                  {['equal', 'custom'].map(mode => (
                    <div key={mode}
                      className={`flex-1 px-4 py-2 rounded-md font-medium text-sm transition-all cursor-pointer text-center capitalize ${splitMode === mode ? 'bg-white dark:bg-gray-600 text-blue-600 shadow-sm' : 'text-black dark:text-gray-300'}`}
                      onClick={() => setSplitMode(mode)}
                    >
                      {mode}
                    </div>
                  ))}
                </div>
              </div>

              {/* Participants Selection */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-sm font-semibold text-black dark:text-white">Who shares this?</Label>
                  <button type="button" onClick={() => {
                    const allSel = participants.every(p => customSplits[p]?.selected);
                    const next = {};
                    participants.forEach(p => { next[p] = { ...customSplits[p], selected: !allSel }; });
                    setCustomSplits(next);
                  }} className="text-xs text-blue-600 hover:text-blue-800 font-medium">
                    {participants.every(p => customSplits[p]?.selected) ? 'Deselect All' : 'Select All'}
                  </button>
                </div>
                <div className="flex flex-wrap gap-3 sm:gap-4 justify-center">
                  {participants.map((participant, index) => (
                    <div key={participant} className="flex flex-col items-center">
                      <label className="flex flex-col items-center cursor-pointer">
                        <input type="checkbox" checked={customSplits[participant]?.selected || false}
                          onChange={() => setCustomSplits({ ...customSplits, [participant]: { ...customSplits[participant], selected: !customSplits[participant]?.selected } })}
                          className="sr-only"
                        />
                        <div
                          className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-white text-sm sm:text-base font-semibold mb-1 transition-all ${customSplits[participant]?.selected ? 'ring-4 ring-blue-300' : 'opacity-50'}`}
                          style={{ backgroundColor: getColor(index) }}
                        >
                          {participant.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium text-black dark:text-white text-xs text-center max-w-[56px] truncate">{participant}</span>
                      </label>
                      {splitMode === 'custom' && customSplits[participant]?.selected && (
                        <div className="relative mt-1">
                          <input
                            type="number"
                            placeholder={splitInputMode === 'percent' ? '0' : '0'}
                            value={splitInputMode === 'percent' ? (customSplits[participant]?.percent || '') : (customSplits[participant]?.amount || '')}
                            onChange={e => setCustomSplits({ ...customSplits, [participant]: { ...customSplits[participant], [splitInputMode === 'percent' ? 'percent' : 'amount']: e.target.value } })}
                            className="w-16 sm:w-20 px-2 py-1 text-xs sm:text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-black dark:text-white focus:ring-2 focus:ring-blue-400"
                          />
                          {splitInputMode === 'percent' && <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-xs text-gray-400">%</span>}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                {splitMode === 'custom' && splitInputMode === 'percent' && (
                  <p className="text-center text-xs mt-2 text-gray-500 dark:text-gray-400">
                    Total: {participants.reduce((s, p) => s + (parseFloat(customSplits[p]?.percent) || 0), 0).toFixed(0)}% / 100%
                  </p>
                )}
              </div>

              {/* Add Expense Button */}
              <Button onClick={addExpense} className="w-full bg-gradient-to-r from-teal-500 to-green-600 hover:from-teal-600 hover:to-green-700 text-white font-semibold py-3 rounded-lg" disabled={participants.length === 0}>
                <Plus size={16} className="mr-2" />Add Expense
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Expenses List */}
        {expenses.length > 0 && (
          <Card className="mt-4 sm:mt-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-red-600 rounded-lg flex items-center justify-center shrink-0">
                    <DollarSign className="text-white" size={16} />
                  </div>
                  <div>
                    <CardTitle className="text-base font-semibold text-black dark:text-white">Added Expenses</CardTitle>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{expenses.length} recorded</p>
                  </div>
                </div>
                <Button onClick={clearAllExpenses} variant="ghost" size="sm" className="text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 text-xs">
                  <Trash2 size={13} className="mr-1" />Clear All
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-72 overflow-y-auto">
                {expenses.map((expense) => (
                  <div key={expense.id} className="group p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-start gap-2 min-w-0">
                        {expense.paymentMode === 'multiple' && expense.payers ? (
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold text-sm bg-purple-500 shrink-0">$</div>
                        ) : (
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold text-sm shrink-0" style={{ backgroundColor: getColor(participants.indexOf(expense.payer)) }}>
                            {expense.payer?.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          {expense.paymentMode === 'multiple' && expense.payers ? (
                            <div className="mb-1">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <span className="font-bold text-green-600 text-base">{formatCurrency(expense.amount)}</span>
                                <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 text-xs rounded-full">pooled</span>
                              </div>
                              <div className="flex flex-wrap gap-1">
                                {expense.payers.map(p => (
                                  <span key={p.name} className="text-xs bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700 text-purple-700 dark:text-purple-300 rounded-full px-2 py-0.5">
                                    {p.name}: {formatCurrency(p.amount)}
                                  </span>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span className="font-semibold text-black dark:text-white text-sm">{expense.payer}</span>
                              <span className="text-gray-500 dark:text-gray-400 text-xs">paid</span>
                              <span className="font-bold text-green-600 text-base">{formatCurrency(expense.amount)}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{expense.description}</span>
                            <span className="text-gray-400">•</span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">{formatDate(expense.date) || expense.date}</span>
                            <span className="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 text-xs rounded-full">{expense.splitMode}</span>
                          </div>
                          {expense.notes && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 italic">📝 {expense.notes}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button onClick={() => startEditExpense(expense)} variant="ghost" size="sm" className="h-8 px-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20">
                          <Edit2 size={14} /><span className="ml-1 text-xs hidden sm:inline">Edit</span>
                        </Button>
                        <Button onClick={() => deleteExpense(expense.id)} variant="ghost" size="sm" className="h-8 px-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20">
                          <Trash2 size={14} /><span className="ml-1 text-xs hidden sm:inline">Del</span>
                        </Button>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {Object.entries(expense.splits).map(([participant, amt]) => (
                        <div key={participant} className="flex items-center gap-1.5 px-2 py-1 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                          <div className="w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0" style={{ backgroundColor: getColor(participants.indexOf(participant)) }}>
                            {participant.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{participant}</span>
                          <span className="text-xs font-bold text-green-600">{formatCurrency(amt)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Calculate Button */}
        <div className="mt-6 text-center">
          <Button onClick={calculate} className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold px-8 py-3 sm:py-4 text-base sm:text-lg rounded-lg shadow-lg" disabled={expenses.length === 0 || participants.length < 2}>
            <Calculator size={18} className="mr-2" />Calculate Settlement
          </Button>
        </div>

        {/* Results */}
        {result && (
          <Card className="mt-4 sm:mt-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg flex items-center justify-center shrink-0">
                    <DollarSign className="text-white" size={16} />
                  </div>
                  <CardTitle className="text-base font-semibold text-gray-900 dark:text-white">Settlement Results</CardTitle>
                </div>
                <div className="flex gap-1 flex-wrap">
                  {/* Copy */}
                  <Button onClick={() => {
                    const lines = result.transactions.length === 0
                      ? ['All settled! No one owes anything.']
                      : result.transactions.map(t => `${t.from} pays ${t.to}: ${formatCurrency(t.amount)}`);
                    const text = (tripName ? `${tripName}\n` : '') + lines.join('\n');
                    navigator.clipboard.writeText(text).then(() => showCustomModal({ type: 'success', title: 'Copied!', message: 'Settlement copied to clipboard.', confirmText: 'OK' }));
                  }} variant="ghost" size="sm" className="text-gray-600 dark:text-gray-300 hover:text-gray-800 px-2 h-8" title="Copy">
                    <Download size={14} className="mr-1 rotate-180" /><span className="text-xs hidden sm:inline">Copy</span>
                  </Button>
                  {/* WhatsApp */}
                  <Button onClick={shareWhatsApp} variant="ghost" size="sm" className="text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 px-2 h-8" title="Share on WhatsApp">
                    <MessageCircle size={14} className="mr-1" /><span className="text-xs hidden sm:inline">WhatsApp</span>
                  </Button>
                  {/* Share Link */}
                  <Button onClick={generateShareLink} variant="ghost" size="sm" className="text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 px-2 h-8" title="Share Link">
                    <Link size={14} className="mr-1" /><span className="text-xs hidden sm:inline">Share</span>
                  </Button>
                  {/* PDF */}
                  <Button onClick={() => setShowPdfDialog(true)} variant="ghost" size="sm" className="text-gray-600 dark:text-gray-300 px-2 h-8" title="Download PDF">
                    <Download size={14} className="mr-1" /><span className="text-xs hidden sm:inline">PDF</span>
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {result.transactions.length === 0 ? (
                <div className="text-center py-6">
                  <div className="w-14 h-14 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-2xl">🎉</span>
                  </div>
                  <h3 className="text-lg font-bold text-green-600 mb-1">All Settled Up!</h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">No one owes anyone. Everyone is square!</p>
                </div>
              ) : (
                <div className="space-y-5">
                  <div>
                    <h3 className="font-bold text-base mb-3 flex items-center gap-2">
                      <span className="text-blue-600 dark:text-blue-400">Who pays whom</span>
                      <span className="bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 px-2 py-0.5 rounded-full text-xs font-semibold">
                        {result.transactions.length} payment{result.transactions.length !== 1 ? 's' : ''}
                      </span>
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Minimum transactions to settle everything:</p>
                    <div className="space-y-2">
                      {result.transactions.map((t) => (
                        <div key={`${t.from}${t.to}${t.amount}`} className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 bg-green-600 rounded-full flex items-center justify-center text-white font-semibold text-xs shrink-0">
                                {t.from.charAt(0).toUpperCase()}
                              </div>
                              <span className="font-semibold text-gray-800 dark:text-white text-sm">{t.from}</span>
                              <span className="text-gray-400 text-xs">→</span>
                              <span className="font-semibold text-gray-800 dark:text-white text-sm">{t.to}</span>
                            </div>
                            <p className="font-bold text-green-600 text-base">{formatCurrency(t.amount)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="border-t border-gray-200 dark:border-gray-700 pt-5">
                    <h4 className="font-bold text-sm mb-3 text-purple-600 dark:text-purple-400">Individual Balances</h4>
                    <div className="space-y-2">
                      {Object.entries(result.balances).filter(([, b]) => Math.abs(b) > 0.01).map(([person, balance]) => (
                        <div key={person} className="flex items-center justify-between p-2.5 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
                          <div className="flex items-center gap-2">
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white font-semibold text-xs ${balance > 0 ? 'bg-green-600' : 'bg-red-600'}`}>
                              {person.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-semibold text-gray-800 dark:text-white text-sm">{person}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">{balance > 0 ? 'Should receive' : 'Should pay'}</p>
                            </div>
                          </div>
                          <p className={`font-bold text-base ${balance > 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {balance > 0 ? '+' : ''}{formatCurrency(balance)}
                          </p>
                        </div>
                      ))}
                    </div>

                    {Object.entries(result.balances).filter(([, b]) => Math.abs(b) <= 0.01).length > 0 && (
                      <div className="mt-3 p-2.5 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                        <h5 className="font-semibold text-green-700 dark:text-green-400 mb-2 text-xs flex items-center gap-1">
                          <span>✅</span><span>Settled</span>
                        </h5>
                        <div className="flex flex-wrap gap-1.5">
                          {Object.entries(result.balances).filter(([, b]) => Math.abs(b) <= 0.01).map(([person]) => (
                            <div key={person} className="flex items-center gap-1.5 px-2 py-0.5 bg-green-100 dark:bg-green-900/40 border border-green-300 dark:border-green-700 rounded-full">
                              <div className="w-4 h-4 bg-green-600 rounded-full flex items-center justify-center text-white text-xs font-semibold">{person.charAt(0).toUpperCase()}</div>
                              <span className="text-xs font-medium text-green-800 dark:text-green-300">{person}</span>
                              <span className="text-green-600 text-xs">✓</span>
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
      </main>

      {/* ── Edit Expense Modal ── */}
      {editingExpense && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={e => { if (e.target === e.currentTarget) cancelEditExpense(); }}>
          <Card className="w-full sm:max-w-lg max-h-[92vh] sm:max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-xl shadow-xl border-0 sm:border border-gray-200 dark:border-gray-700">
            <CardHeader className="pb-3 sticky top-0 bg-white dark:bg-gray-800 z-10 border-b border-gray-100 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2 text-black dark:text-white">
                  <Edit2 className="text-blue-600" size={16} />Edit Expense
                </CardTitle>
                <Button onClick={cancelEditExpense} variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-500">
                  <X size={16} />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pb-6 pt-4">
              {/* Who Paid */}
              <div>
                <Label className="text-sm font-semibold text-black dark:text-white mb-2 block">Who Paid?</Label>
                <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-lg mb-3">
                  {['single', 'multiple'].map(mode => (
                    <div key={mode}
                      className={`flex-1 px-3 py-2 rounded-md font-medium text-sm transition-all cursor-pointer text-center ${editPaymentMode === mode ? 'bg-white dark:bg-gray-600 text-blue-600 shadow-sm' : 'text-black dark:text-gray-300'}`}
                      onClick={() => setEditPaymentMode(mode)}
                    >
                      {mode === 'single' ? 'Single' : 'Multiple'}
                    </div>
                  ))}
                </div>
                {editPaymentMode === 'single' ? (
                  <select className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-black dark:text-white focus:ring-2 focus:ring-blue-400"
                    value={editPayer} onChange={e => setEditPayer(e.target.value)}>
                    <option value="">Select payer...</option>
                    {participants.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                ) : (
                  <div className="space-y-2">
                    {editMultiplePayers.map((mp, idx) => (
                      <div key={idx} className="flex gap-2 items-center">
                        <select className="flex-1 px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-black dark:text-white text-sm"
                          value={mp.person} onChange={e => setEditMultiplePayers(prev => prev.map((p, i) => i === idx ? { ...p, person: e.target.value } : p))}>
                          <option value="">Select person...</option>
                          {participants.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                        <input type="number" placeholder="Amount" value={mp.amount}
                          onChange={e => setEditMultiplePayers(prev => prev.map((p, i) => i === idx ? { ...p, amount: e.target.value } : p))}
                          className="w-24 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-black dark:text-white text-sm" />
                        {editMultiplePayers.length > 1 && (
                          <button onClick={() => setEditMultiplePayers(prev => prev.filter((_, i) => i !== idx))} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg" type="button">
                            <X size={15} />
                          </button>
                        )}
                      </div>
                    ))}
                    <button onClick={() => setEditMultiplePayers(prev => [...prev, { person: '', amount: '' }])} type="button"
                      className="w-full py-2 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-500 dark:text-gray-400 hover:border-blue-400 hover:text-blue-600 flex items-center justify-center gap-1">
                      <Plus size={13} /> Add Payer
                    </button>
                  </div>
                )}
              </div>

              {editPaymentMode === 'single' && (
                <div>
                  <Label className="text-sm font-semibold text-black dark:text-white mb-2 block">Amount</Label>
                  <Input type="number" placeholder="0" value={editAmount} onChange={e => setEditAmount(e.target.value)}
                    className="w-full bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-black dark:text-white" />
                </div>
              )}

              <div>
                <Label className="text-sm font-semibold text-black dark:text-white mb-2 block">Description</Label>
                <Input type="text" placeholder="e.g. Dinner" value={editDescription} onChange={e => setEditDescription(e.target.value)}
                  className="w-full bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-black dark:text-white" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-sm font-semibold text-black dark:text-white mb-2 block">Date</Label>
                  <input type="date" value={editDate} onChange={e => setEditDate(e.target.value)}
                    className="w-full px-3 py-2.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-black dark:text-white text-sm focus:ring-2 focus:ring-blue-400" />
                </div>
                <div>
                  <Label className="text-sm font-semibold text-black dark:text-white mb-2 block">Notes</Label>
                  <input type="text" placeholder="Optional..." value={editNotes} onChange={e => setEditNotes(e.target.value)}
                    className="w-full px-3 py-2.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-black dark:text-white text-sm focus:ring-2 focus:ring-blue-400" />
                </div>
              </div>

              <div>
                <Label className="text-sm font-semibold text-black dark:text-white mb-2 block">Split Mode</Label>
                <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
                  {['equal', 'custom'].map(mode => (
                    <div key={mode}
                      className={`flex-1 px-4 py-2 rounded-md font-medium text-sm transition-all cursor-pointer text-center capitalize ${editSplitMode === mode ? 'bg-white dark:bg-gray-600 text-blue-600 shadow-sm' : 'text-black dark:text-gray-300'}`}
                      onClick={() => setEditSplitMode(mode)}
                    >{mode}</div>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-sm font-semibold text-black dark:text-white mb-3 block">Participants</Label>
                <div className="flex flex-wrap gap-3 justify-center">
                  {participants.map((participant, index) => (
                    <div key={participant} className="flex flex-col items-center">
                      <label className="flex flex-col items-center cursor-pointer">
                        <input type="checkbox" checked={editCustomSplits[participant]?.selected || false}
                          onChange={() => setEditCustomSplits(prev => ({ ...prev, [participant]: { ...prev[participant], selected: !prev[participant]?.selected } }))}
                          className="sr-only" />
                        <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-white text-sm sm:text-base font-semibold mb-1 transition-all ${editCustomSplits[participant]?.selected ? 'ring-4 ring-blue-300' : 'opacity-50'}`} style={{ backgroundColor: getColor(index) }}>
                          {participant.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium text-black dark:text-white text-xs text-center max-w-[56px] truncate">{participant}</span>
                      </label>
                      {editSplitMode === 'custom' && editCustomSplits[participant]?.selected && (
                        <input type="number" placeholder="0" value={editCustomSplits[participant]?.amount || ''}
                          onChange={e => setEditCustomSplits(prev => ({ ...prev, [participant]: { ...prev[participant], amount: e.target.value } }))}
                          className="mt-1 w-16 sm:w-20 px-2 py-1 text-xs sm:text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-black dark:text-white focus:ring-2 focus:ring-blue-400" />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button onClick={saveEditExpense} className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold py-3 rounded-lg">
                  <Save size={16} className="mr-2" />Save
                </Button>
                <Button onClick={cancelEditExpense} variant="outline" className="flex-1 py-3 rounded-lg dark:border-gray-600 dark:text-gray-300">
                  <X size={16} className="mr-2" />Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Rename Participant Modal ── */}
      {renamingParticipant && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
                <Edit2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="font-semibold text-lg text-blue-800 dark:text-blue-300">Rename Participant</h3>
            </div>
            <p className="text-gray-700 dark:text-gray-300 mb-4 text-sm">New name for "{renamingParticipant}":</p>
            <Input value={newParticipantNameForRename} onChange={e => setNewParticipantNameForRename(e.target.value)}
              onKeyPress={e => { if (e.key === 'Enter') saveRename(); if (e.key === 'Escape') cancelRename(); }}
              placeholder="Enter new name..." autoFocus
              className="w-full mb-3 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-black dark:text-white" />
            <div className="mb-5">
              <Label className="text-sm font-semibold text-black dark:text-white mb-2 block">Urdu display name (optional)</Label>
              <Input value={newParticipantUrduNameForRename} onChange={e => setNewParticipantUrduNameForRename(e.target.value)}
                placeholder="مثال: حمزہ" dir="rtl"
                className="w-full bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-black dark:text-white" />
            </div>
            <div className="flex gap-3 justify-end">
              <Button onClick={cancelRename} variant="outline" className="px-4 py-2 dark:border-gray-600 dark:text-gray-300">Cancel</Button>
              <Button onClick={saveRename} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white" disabled={!newParticipantNameForRename.trim()}>Rename</Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Trip Switcher Modal ── */}
      {showTripSwitcher && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={e => { if (e.target === e.currentTarget) setShowTripSwitcher(false); }}>
          <div className="bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-xl shadow-xl w-full sm:max-w-md max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-t-xl z-10">
              <div className="flex items-center gap-2">
                <Clock size={18} className="text-blue-600 dark:text-blue-400" />
                <h3 className="text-base font-bold text-gray-900 dark:text-white">Trip History</h3>
              </div>
              <div className="flex gap-2">
                <Button onClick={createNewTrip} size="sm" className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 h-8 text-xs">
                  <Plus size={12} className="mr-1" />New Trip
                </Button>
                <button onClick={() => setShowTripSwitcher(false)} className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400">
                  <X size={18} />
                </button>
              </div>
            </div>
            <div className="overflow-y-auto flex-1 p-4 space-y-2">
              {getStoredTrips().sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)).map(trip => (
                <div key={trip.id}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${trip.id === currentTripId ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 dark:border-blue-600' : 'border-gray-200 dark:border-gray-600 hover:border-blue-300 bg-white dark:bg-gray-700'}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0" onClick={() => trip.id !== currentTripId && switchToTrip(trip.id)}>
                      <p className="font-semibold text-gray-900 dark:text-white text-sm truncate">
                        {trip.name || 'Unnamed Trip'}
                        {trip.id === currentTripId && <span className="ml-2 text-xs bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded-full">Current</span>}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {trip.participants?.length || 0} people · {trip.expenses?.length || 0} expenses
                        {trip.updatedAt ? ` · ${new Date(trip.updatedAt).toLocaleDateString()}` : ''}
                      </p>
                    </div>
                    {trip.id !== currentTripId && (
                      <button onClick={e => { e.stopPropagation(); deleteTrip(trip.id); }}
                        className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded shrink-0" title="Delete">
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {getStoredTrips().length === 0 && (
                <p className="text-center text-gray-500 dark:text-gray-400 py-8 text-sm">No saved trips yet.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Group Manager Modal ── */}
      {showGroupManager && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={e => { if (e.target === e.currentTarget) setShowGroupManager(false); }}>
          <div className="bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-xl shadow-xl w-full sm:max-w-md max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-t-xl z-10">
              <div className="flex items-center gap-2">
                <Bookmark size={18} className="text-purple-600 dark:text-purple-400" />
                <h3 className="text-base font-bold text-gray-900 dark:text-white">Saved Groups</h3>
              </div>
              <button onClick={() => setShowGroupManager(false)} className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400"><X size={18} /></button>
            </div>
            <div className="p-4 border-b border-gray-100 dark:border-gray-700">
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Save current {participants.length > 0 ? `(${participants.length} people)` : ''} as group:</p>
              <div className="flex gap-2">
                <Input placeholder="Group name, e.g. Office Friends..."
                  value={newGroupName} onChange={e => setNewGroupName(e.target.value)}
                  onKeyPress={e => e.key === 'Enter' && saveCurrentAsGroup()}
                  className="flex-1 text-sm bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-black dark:text-white" />
                <Button onClick={saveCurrentAsGroup} size="sm" className="bg-purple-600 hover:bg-purple-700 text-white px-3 shrink-0">Save</Button>
              </div>
            </div>
            <div className="overflow-y-auto flex-1 p-4 space-y-2">
              {savedGroups.length === 0 ? (
                <p className="text-center text-gray-500 dark:text-gray-400 py-6 text-sm">No saved groups yet.</p>
              ) : savedGroups.map(group => (
                <div key={group.id} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 dark:text-white text-sm">{group.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{group.members.join(', ')}</p>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <button onClick={() => loadGroup(group)} className="text-xs bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 hover:bg-blue-200 px-2 py-1 rounded font-medium">Load</button>
                      <button onClick={() => setSavedGroups(prev => prev.filter(g => g.id !== group.id))} className="p-1 text-red-400 hover:text-red-600"><Trash2 size={13} /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── PDF Dialog ── */}
      {showPdfDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
          onClick={e => { if (e.target === e.currentTarget) setShowPdfDialog(false); }}>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-gray-900 dark:text-white">Download PDF</h3>
              <button onClick={() => setShowPdfDialog(false)} className="p-1 text-gray-500 dark:text-gray-400"><X size={18} /></button>
            </div>

            {/* Language */}
            <div className="mb-4">
              <Label className="text-sm font-semibold text-black dark:text-white mb-2 block">Language</Label>
              <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
                {[['en', 'English'], ['ur', 'اردو']].map(([val, label]) => (
                  <div key={val}
                    className={`flex-1 px-4 py-2 rounded-md font-medium text-sm transition-all cursor-pointer text-center ${pdfLanguage === val ? 'bg-white dark:bg-gray-600 text-blue-600 shadow-sm' : 'text-gray-600 dark:text-gray-400'}`}
                    onClick={() => setPdfLanguage(val)}
                  >{label}</div>
                ))}
              </div>
            </div>

            {/* Report Style */}
            <div className="mb-5">
              <Label className="text-sm font-semibold text-black dark:text-white mb-2 block">Report Style</Label>
              <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
                <div
                  className={`flex-1 px-3 py-2 rounded-md font-medium text-sm transition-all cursor-pointer text-center ${!pdfCompact ? 'bg-white dark:bg-gray-600 text-blue-600 shadow-sm' : 'text-gray-600 dark:text-gray-400'}`}
                  onClick={() => setPdfCompact(false)}
                >Full Report</div>
                <div
                  className={`flex-1 px-3 py-2 rounded-md font-medium text-sm transition-all cursor-pointer text-center ${pdfCompact ? 'bg-white dark:bg-gray-600 text-blue-600 shadow-sm' : 'text-gray-600 dark:text-gray-400'}`}
                  onClick={() => setPdfCompact(true)}
                >Quick Receipt</div>
              </div>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5 px-1">
                {pdfCompact ? 'Compact: summary + settlement + expenses (~2 pages)' : 'Full: charts, per-person breakdown, original debts'}
              </p>
            </div>

            <div className="flex gap-3">
              <Button onClick={() => { downloadPDF(); setShowPdfDialog(false); }} className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 text-white">
                <Download size={15} className="mr-2" />Download
              </Button>
              <Button onClick={() => setShowPdfDialog(false)} variant="outline" className="flex-1 dark:border-gray-600 dark:text-gray-300">Cancel</Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Share Link Modal ── */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
          onClick={e => { if (e.target === e.currentTarget) setShowShareModal(false); }}>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Share2 size={18} className="text-blue-600 dark:text-blue-400" />
                <h3 className="text-base font-bold text-gray-900 dark:text-white">Share Settlement</h3>
              </div>
              <button onClick={() => setShowShareModal(false)} className="p-1 text-gray-500 dark:text-gray-400"><X size={18} /></button>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">Anyone with this link can view the settlement (read-only).</p>
            <div className="flex gap-2 mb-3">
              <input readOnly value={shareUrl}
                className="flex-1 px-3 py-2 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 min-w-0" />
              <Button onClick={copyShareLink} size="sm" className={`px-3 shrink-0 ${shareCopied ? 'bg-green-600' : 'bg-blue-600'} text-white`}>
                {shareCopied ? <Check size={15} /> : <Link size={15} />}
              </Button>
            </div>
            {shareCopied && <p className="text-xs text-green-600 dark:text-green-400 text-center">Copied to clipboard!</p>}
          </div>
        </div>
      )}

      {/* ── Custom Modal ── */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${modalConfig.type === 'success' ? 'bg-green-100 dark:bg-green-900/40' : modalConfig.type === 'error' ? 'bg-red-100 dark:bg-red-900/40' : modalConfig.type === 'warning' ? 'bg-yellow-100 dark:bg-yellow-900/40' : 'bg-blue-100 dark:bg-blue-900/40'}`}>
                  {modalConfig.type === 'success' && <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>}
                  {modalConfig.type === 'error' && <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>}
                  {modalConfig.type === 'warning' && <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.268 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>}
                  {modalConfig.type === 'info' && <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                </div>
                <h3 className={`font-semibold text-base ${modalConfig.type === 'success' ? 'text-green-800 dark:text-green-300' : modalConfig.type === 'error' ? 'text-red-800 dark:text-red-300' : modalConfig.type === 'warning' ? 'text-yellow-800 dark:text-yellow-300' : 'text-blue-800 dark:text-blue-300'}`}>
                  {modalConfig.title}
                </h3>
              </div>
              <p className="text-gray-700 dark:text-gray-300 mb-6 whitespace-pre-line text-sm">{modalConfig.message}</p>
              <div className="flex gap-3 justify-end">
                {modalConfig.showCancel && (
                  <Button onClick={hideModal} variant="outline" className="px-4 py-2 dark:border-gray-600 dark:text-gray-300">{modalConfig.cancelText}</Button>
                )}
                <Button onClick={() => { if (modalConfig.onConfirm) modalConfig.onConfirm(); else hideModal(); }}
                  className={`px-4 py-2 text-white ${modalConfig.type === 'success' ? 'bg-green-600 hover:bg-green-700' : modalConfig.type === 'error' ? 'bg-red-600 hover:bg-red-700' : modalConfig.type === 'warning' ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-blue-600 hover:bg-blue-700'}`}>
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
