import React, { useState, useEffect, useMemo } from 'react';
import { 
  Wallet, TrendingUp, TrendingDown, Plus, Search, Trash2, 
  PieChart, ArrowUpRight, ArrowDownRight, 
  ShoppingBag, Coffee, Car, BookOpen, Zap, Gift, Smartphone, 
  AlertCircle, CheckCircle2, X, Banknote, Calendar as CalendarIcon,
  BarChart3, Filter, SlidersHorizontal, ArrowUpDown, ChevronDown, LayoutGrid, RotateCcw
} from 'lucide-react';

// --- 1. CONFIG & HELPERS ---

const EXPENSE_CATEGORIES = [
  { id: 'food', name: 'Food & Dining', icon: Coffee, color: 'text-orange-500', bg: 'bg-orange-100 dark:bg-orange-900/30' },
  { id: 'transport', name: 'Transportation', icon: Car, color: 'text-blue-500', bg: 'bg-blue-100 dark:bg-blue-900/30' },
  { id: 'shopping', name: 'Shopping', icon: ShoppingBag, color: 'text-pink-500', bg: 'bg-pink-100 dark:bg-pink-900/30' },
  { id: 'education', name: 'Education', icon: BookOpen, color: 'text-purple-500', bg: 'bg-purple-100 dark:bg-purple-900/30' },
  { id: 'bills', name: 'Bills & Utilities', icon: Zap, color: 'text-yellow-500', bg: 'bg-yellow-100 dark:bg-yellow-900/30' },
  { id: 'entertainment', name: 'Entertainment', icon: Smartphone, color: 'text-indigo-500', bg: 'bg-indigo-100 dark:bg-indigo-900/30' },
  { id: 'other', name: 'Other', icon: Gift, color: 'text-gray-500', bg: 'bg-gray-100 dark:bg-gray-800' },
];

const INCOME_CATEGORIES = [
  { id: 'salary', name: 'Salary', icon: Banknote, color: 'text-emerald-500', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
  { id: 'freelance', name: 'Freelance', icon: Wallet, color: 'text-blue-500', bg: 'bg-blue-100 dark:bg-blue-900/30' },
  { id: 'investments', name: 'Investments', icon: TrendingUp, color: 'text-purple-500', bg: 'bg-purple-100 dark:bg-purple-900/30' },
  { id: 'gift', name: 'Gifts & Grants', icon: Gift, color: 'text-pink-500', bg: 'bg-pink-100 dark:bg-pink-900/30' },
  { id: 'other_income', name: 'Other Income', icon: Plus, color: 'text-gray-500', bg: 'bg-gray-100 dark:bg-gray-800' },
];

const ALL_CATEGORIES = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES];

const getCategoryConfig = (catName) => {
    return ALL_CATEGORIES.find(c => c.name === catName) || EXPENSE_CATEGORIES[6];
};

// --- 2. CHART & STAT COMPONENTS ---

const MonthlyCashFlowChart = ({ income, expense }) => {
  const maxVal = Math.max(income, expense, 1000); 
  const hIncome = (income / maxVal) * 160;
  const hExpense = (expense / maxVal) * 160;

  return (
    <div className="flex justify-center items-end h-56 gap-16 pt-6 pb-2">
      <div className="flex flex-col items-center group">
        <span className="mb-2 text-sm font-bold text-emerald-600 dark:text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity">
          +Rs {income.toLocaleString()}
        </span>
        <div 
          className="w-16 bg-emerald-500 rounded-t-xl relative transition-all duration-500 hover:bg-emerald-400 shadow-lg shadow-emerald-500/20" 
          style={{ height: `${Math.max(hIncome, 4)}px` }}
        >
          {hIncome > 30 && <div className="absolute bottom-2 w-full text-center text-white/90 text-xs font-bold">In</div>}
        </div>
        <span className="mt-3 text-sm font-bold text-gray-600 dark:text-gray-300">Income</span>
      </div>

      <div className="flex flex-col items-center group">
        <span className="mb-2 text-sm font-bold text-red-600 dark:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
          -Rs {expense.toLocaleString()}
        </span>
        <div 
          className="w-16 bg-red-500 rounded-t-xl relative transition-all duration-500 hover:bg-red-400 shadow-lg shadow-red-500/20" 
          style={{ height: `${Math.max(hExpense, 4)}px` }}
        >
           {hExpense > 30 && <div className="absolute bottom-2 w-full text-center text-white/90 text-xs font-bold">Out</div>}
        </div>
        <span className="mt-3 text-sm font-bold text-gray-600 dark:text-gray-300">Expense</span>
      </div>
    </div>
  );
};

const StatCard = ({ title, amount, type, icon: Icon, subText }) => {
  const isPositive = type === 'income';
  const colorClass = isPositive ? 'text-emerald-600 dark:text-emerald-400' : type === 'expense' ? 'text-red-600 dark:text-red-400' : 'text-blue-600 dark:text-blue-400';
  const bgClass = isPositive ? 'bg-emerald-50 dark:bg-emerald-900/20' : type === 'expense' ? 'bg-red-50 dark:bg-red-900/20' : 'bg-blue-50 dark:bg-blue-900/20';

  return (
    <div className="bg-white dark:bg-[#1E1E1E] p-6 rounded-2xl border border-gray-100 dark:border-[#2C2C2C] shadow-sm flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{title}</p>
        <h3 className={`text-2xl font-bold ${colorClass}`}>
           {type === 'expense' ? '-' : ''}Rs {amount.toLocaleString()}
        </h3>
        {subText && <p className="text-[10px] text-gray-400 mt-1">{subText}</p>}
      </div>
      <div className={`p-3 rounded-xl ${bgClass}`}>
        <Icon size={24} className={colorClass} />
      </div>
    </div>
  );
};

const TransactionRow = ({ t, onDelete }) => {
  const cat = getCategoryConfig(t.category);
  const isIncome = t.type === 'income';
  const Icon = cat.icon;

  return (
    <div className="group flex items-center justify-between p-4 bg-white dark:bg-[#1E1E1E] border border-gray-100 dark:border-[#2C2C2C] rounded-xl hover:shadow-md transition-all">
      <div className="flex items-center gap-4">
        <div className={`p-3 rounded-xl ${cat.bg} ${cat.color}`}>
          <Icon size={20} />
        </div>
        <div>
          <h4 className="font-bold text-gray-800 dark:text-white text-sm">{t.description}</h4>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{t.date} • {t.category}</p>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <span className={`font-bold text-sm ${isIncome ? 'text-emerald-600' : 'text-red-600'}`}>
          {isIncome ? '+' : '-'} Rs {Number(t.amount).toLocaleString()}
        </span>
        <button onClick={() => onDelete(t.id)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg opacity-0 group-hover:opacity-100 transition-all">
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
};

// --- 4. MAIN COMPONENT ---
const CashManager = ({ activeTab }) => {
  const [transactions, setTransactions] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false); // New State for Filter Modal
  
  // Dates
  const currentMonthISO = new Date().toISOString().slice(0, 7);
  const [selectedMonth, setSelectedMonth] = useState(currentMonthISO);
  
  const token = localStorage.getItem('token');

  // Transaction Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('All'); 
  const [filterCategory, setFilterCategory] = useState('All'); 
  const [sortOrder, setSortOrder] = useState('Newest'); 

  // Add Transaction Form
  const [newTrans, setNewTrans] = useState({ 
    type: 'expense', 
    amount: '', 
    category: 'Food & Dining', 
    description: '', 
    date: new Date().toISOString().split('T')[0] 
  });
  const [errors, setErrors] = useState({}); 

  const [budgets, setBudgets] = useState({});
  const [editingBudget, setEditingBudget] = useState(null);
  const [budgetInput, setBudgetInput] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      if (!token) return;
      try {
        const [transRes, budgetRes] = await Promise.all([
          fetch('/api/transactions', { headers: { 'x-auth-token': token } }),
          fetch('/api/budgets', { headers: { 'x-auth-token': token } })
        ]);
        
        if (transRes.ok && budgetRes.ok) {
            const transData = await transRes.json();
            const budgetData = await budgetRes.json();
            setTransactions(transData.map(t => ({ ...t, id: t._id })));
            
            const bObj = {};
            budgetData.forEach(b => bObj[b.category] = b.limit);
            setBudgets(bObj);
        }
      } catch (err) { console.error("Failed to fetch data", err); }
    };
    fetchData();
  }, [token]);

  const validateForm = () => {
    const newErrors = {};
    if (!newTrans.amount) newErrors.amount = "Enter amount";
    if (!newTrans.description) newErrors.description = "Enter description";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAdd = async () => {
    if (!validateForm()) return; 
    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
        body: JSON.stringify({ ...newTrans, amount: Number(newTrans.amount) })
      });
      if (res.ok) {
          const savedT = await res.json();
          setTransactions([{ ...savedT, id: savedT._id }, ...transactions]);
          setShowAddModal(false);
          setNewTrans({ type: 'expense', amount: '', category: 'Food & Dining', description: '', date: new Date().toISOString().split('T')[0] });
          setErrors({}); 
      }
    } catch (error) { console.error("Error adding", error); }
  };

  const handleDelete = async (id) => {
    try {
      await fetch(`/api/transactions/${id}`, { method: 'DELETE', headers: { 'x-auth-token': token } });
      setTransactions(transactions.filter(t => t.id !== id));
    } catch (error) { console.error("Error deleting", error); }
  };

  const handleSetBudget = async (category) => {
    try {
      const limit = Number(budgetInput);
      await fetch('/api/budgets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
        body: JSON.stringify({ category, limit })
      });
      setBudgets({ ...budgets, [category]: limit });
      setEditingBudget(null);
    } catch (error) { console.error("Error setting budget", error); }
  };

  const resetFilters = () => {
    setFilterType('All');
    setFilterCategory('All');
    setSortOrder('Newest');
    setShowFilterModal(false);
  };

  // --- CALCULATION LOGIC ---
  const currentMonthTransactions = useMemo(() => {
      return transactions.filter(t => t.date.startsWith(currentMonthISO));
  }, [transactions, currentMonthISO]);

  const ovIncome = currentMonthTransactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
  const ovExpense = currentMonthTransactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
  const ovBalance = ovIncome - ovExpense;

  const filteredTransactions = transactions.filter(t => t.date.startsWith(selectedMonth));
  
  const selectedMonthTotals = useMemo(() => {
      const totals = {};
      let totalExp = 0;
      
      filteredTransactions.forEach(t => {
          if (t.type === 'expense') {
              totals[t.category] = (totals[t.category] || 0) + t.amount;
              totalExp += t.amount;
          }
      });

      return EXPENSE_CATEGORIES.map(cat => ({
          ...cat,
          total: totals[cat.name] || 0,
          percentage: totalExp > 0 ? Math.round(((totals[cat.name] || 0) / totalExp) * 100) : 0
      })).sort((a, b) => b.total - a.total);
  }, [filteredTransactions]);

  const monthTotalIncome = filteredTransactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
  const monthTotalExpense = filteredTransactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);

  const totalIncome = transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
  const balance = totalIncome - totalExpense;

  // --- RENDERERS ---

  const renderOverview = () => (
    <div className="space-y-8 animate-fadeIn">
      <div className="flex items-center gap-2">
        <div className="w-1 h-6 bg-brand-blue rounded-full"></div>
        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">
            Overview for {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard title="Monthly Balance" amount={ovBalance} type="balance" icon={Wallet} subText="Current month only" />
        <StatCard title="Monthly Income" amount={ovIncome} type="income" icon={ArrowUpRight} subText="Current month only" />
        <StatCard title="Monthly Expenses" amount={ovExpense} type="expense" icon={ArrowDownRight} subText="Current month only" />
      </div>
      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-gray-800 dark:text-white">Recent Activity (This Month)</h3>
          <button onClick={() => setShowAddModal(true)} className="flex items-center gap-2 text-sm font-bold text-brand-blue bg-blue-50 dark:bg-blue-900/20 px-4 py-2 rounded-xl hover:bg-blue-100 transition-colors">
            <Plus size={16} /> Add New
          </button>
        </div>
        <div className="space-y-3">
          {currentMonthTransactions.slice(0, 5).map(t => <TransactionRow key={t.id} t={t} onDelete={handleDelete} />)}
          {currentMonthTransactions.length === 0 && <p className="text-gray-400 text-sm italic">No transactions this month.</p>}
        </div>
      </div>
    </div>
  );

  const renderTransactions = () => {
    let processedDocs = [...transactions];

    if (searchQuery) {
        const q = searchQuery.toLowerCase();
        processedDocs = processedDocs.filter(t => 
            t.description.toLowerCase().includes(q) || 
            t.category.toLowerCase().includes(q)
        );
    }

    if (filterType !== 'All') processedDocs = processedDocs.filter(t => t.type === filterType.toLowerCase());
    if (filterCategory !== 'All') processedDocs = processedDocs.filter(t => t.category === filterCategory);

    processedDocs.sort((a, b) => {
        if (sortOrder === 'Newest') return new Date(b.date) - new Date(a.date);
        if (sortOrder === 'Oldest') return new Date(a.date) - new Date(b.date);
        if (sortOrder === 'Highest') return b.amount - a.amount;
        if (sortOrder === 'Lowest') return a.amount - b.amount;
        return 0;
    });

    // Check if any filter is active
    const activeFiltersCount = (filterType !== 'All' ? 1 : 0) + (filterCategory !== 'All' ? 1 : 0) + (sortOrder !== 'Newest' ? 1 : 0);

    return (
        <div className="animate-fadeIn space-y-6">
           <div className="flex flex-col gap-4">
                {/* Search & Actions Bar */}
                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="relative w-full md:w-64">
                        <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
                        <input 
                            type="text" 
                            placeholder="Search transactions..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-white dark:bg-[#1E1E1E] border border-gray-200 dark:border-[#333] rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-blue dark:text-white" 
                        />
                    </div>
                    
                    <div className="flex gap-3 w-full md:w-auto">
                        {/* NEW FILTER BUTTON */}
                        <button 
                            onClick={() => setShowFilterModal(true)} 
                            className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold border transition-all ${activeFiltersCount > 0 ? 'bg-blue-50 dark:bg-blue-900/20 text-brand-blue border-blue-200 dark:border-blue-800' : 'bg-white dark:bg-[#1E1E1E] text-gray-600 dark:text-gray-300 border-gray-200 dark:border-[#333] hover:bg-gray-50 dark:hover:bg-[#252525]'}`}
                        >
                            <SlidersHorizontal size={18} />
                            Filters 
                            {activeFiltersCount > 0 && <span className="bg-brand-blue text-white text-[10px] px-1.5 py-0.5 rounded-full">{activeFiltersCount}</span>}
                        </button>

                        <button onClick={() => setShowAddModal(true)} className="flex-1 md:flex-none bg-brand-blue hover:bg-blue-600 text-white font-bold py-2.5 px-6 rounded-xl shadow-lg shadow-blue-500/30 transition-all flex items-center justify-center gap-2">
                            <Plus size={18} /> <span className="hidden md:inline">Add</span>
                        </button>
                    </div>
                </div>
           </div>

           {/* List */}
           <div className="space-y-3">
              {processedDocs.map(t => <TransactionRow key={t.id} t={t} onDelete={handleDelete} />)}
              {processedDocs.length === 0 && (
                <div className="text-center py-12 bg-gray-50 dark:bg-[#1E1E1E] rounded-2xl border border-dashed border-gray-200 dark:border-[#333]">
                  <p className="text-gray-400">No transactions found matching your filters.</p>
                  {activeFiltersCount > 0 && (
                      <button onClick={resetFilters} className="mt-2 text-sm text-brand-blue font-bold hover:underline">Clear Filters</button>
                  )}
                </div>
              )}
           </div>
        </div>
    );
  };

  const renderAnalytics = () => (
    <div className="animate-fadeIn space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <BarChart3 className="text-brand-blue" /> Monthly Performance
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Review your income and expenses for specific months.</p>
          </div>
          <div className="relative group">
              <CalendarIcon size={16} className="absolute left-3 top-2.5 text-gray-500 z-10" />
              <input 
                  type="month" 
                  value={selectedMonth} 
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="pl-9 pr-4 py-2 bg-white dark:bg-[#1E1E1E] border border-gray-200 dark:border-[#333] rounded-xl text-sm font-medium text-gray-700 dark:text-white outline-none focus:ring-2 focus:ring-brand-blue shadow-sm cursor-pointer dark:[color-scheme:dark]"
              />
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="bg-white dark:bg-[#1E1E1E] p-6 rounded-2xl border border-gray-200 dark:border-[#333] shadow-sm">
            <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-2">Cash Flow</h3>
            <p className="text-xs text-gray-500 mb-6">Income vs Expense for {selectedMonth}</p>
            <MonthlyCashFlowChart income={monthTotalIncome} expense={monthTotalExpense} />
            <div className="mt-4 grid grid-cols-2 gap-4 border-t border-gray-100 dark:border-[#333] pt-4">
                <div className="text-center">
                    <p className="text-xs text-gray-500 font-bold uppercase">Net Savings</p>
                    <p className={`text-lg font-bold ${monthTotalIncome - monthTotalExpense >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-500'}`}>
                        {monthTotalIncome - monthTotalExpense >= 0 ? '+' : ''} Rs {(monthTotalIncome - monthTotalExpense).toLocaleString()}
                    </p>
                </div>
                <div className="text-center">
                    <p className="text-xs text-gray-500 font-bold uppercase">Save Rate</p>
                    <p className="text-lg font-bold text-gray-800 dark:text-white">
                        {monthTotalIncome > 0 ? Math.round(((monthTotalIncome - monthTotalExpense) / monthTotalIncome) * 100) : 0}%
                    </p>
                </div>
            </div>
        </div>

        <div className="lg:col-span-2 bg-white dark:bg-[#1E1E1E] p-6 rounded-2xl border border-gray-200 dark:border-[#333] shadow-sm">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                    <PieChart size={20} className="text-purple-500" /> Expense Breakdown
                </h3>
                <span className="text-xs font-bold bg-gray-100 dark:bg-[#333] text-gray-500 px-2 py-1 rounded">
                    Total: Rs {monthTotalExpense.toLocaleString()}
                </span>
            </div>
            <div className="space-y-5 overflow-y-auto max-h-[300px] custom-scrollbar pr-2">
                {selectedMonthTotals.filter(c => c.total > 0).map(cat => (
                    <div key={cat.id}>
                        <div className="flex justify-between text-sm mb-1.5">
                            <span className="flex items-center gap-2 text-gray-700 dark:text-gray-200 font-medium">
                                <cat.icon size={16} className={cat.color} /> {cat.name}
                            </span>
                            <span className="font-bold text-gray-900 dark:text-white">{cat.percentage}% (Rs {cat.total.toLocaleString()})</span>
                        </div>
                        <div className="h-2.5 w-full bg-gray-100 dark:bg-[#333] rounded-full overflow-hidden">
                            <div className={`h-full ${cat.bg.replace('/30', '')} ${cat.color.replace('text', 'bg')}`} style={{ width: `${cat.percentage}%` }}></div>
                        </div>
                    </div>
                ))}
                {selectedMonthTotals.every(c => c.total === 0) && (
                    <div className="h-full flex flex-col items-center justify-center text-gray-400 italic py-12">
                        <ShoppingBag size={40} className="mb-3 opacity-20" />
                        <p>No expenses recorded for {selectedMonth}.</p>
                    </div>
                )}
            </div>
        </div>
      </div>
    </div>
  );

  const renderBudget = () => (
    <div className="animate-fadeIn space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {EXPENSE_CATEGORIES.filter(c => c.id !== 'other').map(cat => {
          const budget = budgets[cat.name] || 0;
          const spent = transactions
            .filter(t => t.type === 'expense' && t.category === cat.name)
            .reduce((acc, t) => acc + t.amount, 0);
          
          const percentage = budget > 0 ? Math.min(100, Math.round((spent / budget) * 100)) : 0;
          const isOver = spent > budget && budget > 0;
          const isHighUsage = percentage >= 75; 
          const barColor = isOver ? 'bg-red-600' : isHighUsage ? 'bg-red-500' : 'bg-brand-blue';
          const textColor = isOver || isHighUsage ? 'text-red-500 font-bold' : 'text-gray-500';

          return (
            <div key={cat.id} className={`bg-white dark:bg-[#1E1E1E] p-5 rounded-2xl border transition-colors ${isOver ? 'border-red-200 dark:border-red-900/30' : 'border-gray-200 dark:border-[#333]'}`}>
              <div className="flex justify-between items-start mb-4">
                 <div className="flex items-center gap-3">
                   <div className={`p-2.5 rounded-lg ${cat.bg} ${cat.color}`}><cat.icon size={20} /></div>
                   <div>
                     <h4 className="font-bold text-gray-800 dark:text-white">{cat.name}</h4>
                     <p className="text-xs text-gray-400">Monthly Limit</p>
                   </div>
                 </div>
                 {editingBudget === cat.name ? (
                   <div className="flex items-center gap-2">
                     <input 
                       type="number" 
                       autoFocus
                       className="w-20 bg-gray-50 dark:bg-[#2C2C2C] text-gray-900 dark:text-white border border-gray-300 dark:border-[#444] rounded px-2 py-1 text-xs outline-none focus:border-brand-blue" 
                       placeholder="Amount"
                       value={budgetInput}
                       onChange={(e) => setBudgetInput(e.target.value)}
                     />
                     <button onClick={() => handleSetBudget(cat.name)} className="text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 p-1 rounded transition-colors"><CheckCircle2 size={16} /></button>
                     <button onClick={() => setEditingBudget(null)} className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 p-1 rounded transition-colors"><X size={16} /></button>
                   </div>
                 ) : (
                   <button onClick={() => { setEditingBudget(cat.name); setBudgetInput(budget || ''); }} className="text-xs font-bold text-brand-blue hover:underline">
                     {budget > 0 ? `Rs ${budget.toLocaleString()}` : 'Set Budget'}
                   </button>
                 )}
              </div>
              <div className="mb-2 flex justify-between text-xs font-medium">
                <span className={textColor}>Spent: Rs {spent.toLocaleString()}</span>
                <span className={isHighUsage ? "text-red-500 font-bold" : "text-gray-400"}>{percentage}%</span>
              </div>
              <div className="h-2.5 w-full bg-gray-100 dark:bg-[#333] rounded-full overflow-hidden">
                 <div className={`h-full transition-all duration-500 ${barColor}`} style={{ width: `${percentage}%` }}></div>
              </div>
              {isOver && (
                <div className="mt-3 flex items-center gap-2 text-xs text-red-500 bg-red-50 dark:bg-red-900/20 p-2 rounded-lg animate-pulse">
                  <AlertCircle size={14} /> <span>Exceeded by Rs {(spent - budget).toLocaleString()}!</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderContent = () => {
    switch(activeTab) {
      case 'Cash-Transactions': return renderTransactions();
      case 'Cash-Analytics': return renderAnalytics();
      case 'Cash-Budget': return renderBudget();
      default: return renderOverview();
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto pb-24">
      <div className="mb-8">
        <h1 className="text-3xl font-bold dark:text-white text-gray-900">Cash Management</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Track expenses, manage budgets, and analyze spending.</p>
      </div>

      {renderContent()}

      {/* --- ADD TRANSACTION MODAL --- */}
      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-[#1E1E1E] w-full max-w-md rounded-2xl shadow-2xl border border-gray-200 dark:border-[#2C2C2C] overflow-hidden animate-slideUp flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-gray-100 dark:border-[#333] flex justify-between items-center shrink-0">
              <h3 className="font-bold text-lg dark:text-white">Add Transaction</h3>
              <button onClick={() => setShowAddModal(false)}><X size={20} className="text-gray-400 hover:text-gray-600" /></button>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto custom-scrollbar">
              <div className="flex bg-gray-100 dark:bg-[#2C2C2C] p-1 rounded-xl shrink-0">
                <button onClick={() => setNewTrans({...newTrans, type: 'expense', category: EXPENSE_CATEGORIES[0].name})} className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${newTrans.type === 'expense' ? 'bg-white dark:bg-[#3E3E3E] text-red-500 shadow-sm' : 'text-gray-500'}`}>Expense</button>
                <button onClick={() => setNewTrans({...newTrans, type: 'income', category: INCOME_CATEGORIES[0].name})} className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${newTrans.type === 'income' ? 'bg-white dark:bg-[#3E3E3E] text-emerald-500 shadow-sm' : 'text-gray-500'}`}>Income</button>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase">Amount</label>
                <div className="relative mt-1">
                  <div className="absolute left-3 top-3 text-gray-400 text-xs font-bold">PKR</div>
                  <input type="number" value={newTrans.amount} onChange={e => { setNewTrans({...newTrans, amount: e.target.value}); setErrors({...errors, amount: null}); }} className={`w-full bg-gray-50 dark:bg-[#121212] border rounded-xl pl-11 pr-4 py-2.5 outline-none focus:ring-2 dark:text-white transition-all ${errors.amount ? 'border-red-500 focus:ring-red-200 bg-red-50 dark:bg-red-900/10' : 'border-gray-200 dark:border-[#333] focus:ring-brand-blue'}`} placeholder="0.00" autoFocus />
                </div>
                {errors.amount && <p className="text-red-500 text-xs mt-1 font-medium flex items-center gap-1"><AlertCircle size={10}/> {errors.amount}</p>}
              </div>
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase">Category</label>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {(newTrans.type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES).map(cat => (
                    <button key={cat.id} onClick={() => setNewTrans({...newTrans, category: cat.name})} className={`flex flex-col items-center justify-center p-2 rounded-xl border transition-all ${newTrans.category === cat.name ? (newTrans.type === 'expense' ? 'border-brand-blue bg-blue-50 dark:bg-blue-900/20 text-brand-blue' : 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600') : 'border-gray-100 dark:border-[#333] text-gray-500 hover:bg-gray-50 dark:hover:bg-[#252525]'}`}>
                      <cat.icon size={18} className="mb-1" />
                      <span className="text-[10px] font-medium truncate w-full text-center">{cat.name}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase">Description</label>
                <input type="text" value={newTrans.description} onChange={e => { setNewTrans({...newTrans, description: e.target.value}); setErrors({...errors, description: null}); }} className={`w-full mt-1 bg-gray-50 dark:bg-[#121212] border rounded-xl px-4 py-2.5 outline-none focus:ring-2 dark:text-white transition-all ${errors.description ? 'border-red-500 focus:ring-red-200 bg-red-50 dark:bg-red-900/10' : 'border-gray-200 dark:border-[#333] focus:ring-brand-blue'}`} placeholder="What was this for?" />
                {errors.description && <p className="text-red-500 text-xs mt-1 font-medium flex items-center gap-1"><AlertCircle size={10}/> {errors.description}</p>}
              </div>
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase">Date</label>
                <input type="date" value={newTrans.date} onChange={e => setNewTrans({...newTrans, date: e.target.value})} className="w-full mt-1 bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-[#333] rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-brand-blue dark:text-white dark:[color-scheme:dark]" />
              </div>
              <button onClick={handleAdd} className="w-full bg-brand-blue hover:bg-blue-600 text-white font-bold py-3 rounded-xl shadow-lg shadow-blue-500/30 transition-all mt-2 shrink-0">Save Transaction</button>
            </div>
          </div>
        </div>
      )}

      {/* --- NEW FILTER MODAL --- */}
      {showFilterModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-[#1E1E1E] w-full max-w-md rounded-2xl shadow-2xl border border-gray-200 dark:border-[#2C2C2C] overflow-hidden animate-slideUp flex flex-col max-h-[80vh]">
            <div className="p-5 border-b border-gray-100 dark:border-[#333] flex justify-between items-center shrink-0">
              <h3 className="font-bold text-lg dark:text-white flex items-center gap-2"><SlidersHorizontal size={20}/> Filters & Sort</h3>
              <button onClick={() => setShowFilterModal(false)}><X size={20} className="text-gray-400 hover:text-gray-600" /></button>
            </div>
            
            <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar">
              
              {/* Filter By Type */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Transaction Type</label>
                <div className="flex gap-2">
                  {['All', 'Income', 'Expense'].map(type => (
                    <button 
                      key={type}
                      onClick={() => setFilterType(type)}
                      className={`flex-1 py-2 rounded-xl text-sm font-bold border transition-all ${filterType === type ? 'bg-blue-50 dark:bg-blue-900/20 border-brand-blue text-brand-blue' : 'border-gray-200 dark:border-[#444] text-gray-500 hover:bg-gray-50 dark:hover:bg-[#252525]'}`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {/* Filter By Category */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Category</label>
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    onClick={() => setFilterCategory('All')}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium transition-all ${filterCategory === 'All' ? 'bg-blue-50 dark:bg-blue-900/20 border-brand-blue text-brand-blue' : 'border-gray-200 dark:border-[#444] text-gray-500 hover:bg-gray-50 dark:hover:bg-[#252525]'}`}
                  >
                    <LayoutGrid size={16} /> All Categories
                  </button>
                  {ALL_CATEGORIES.map(cat => (
                    <button 
                      key={cat.id}
                      onClick={() => setFilterCategory(cat.name)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium transition-all ${filterCategory === cat.name ? 'bg-blue-50 dark:bg-blue-900/20 border-brand-blue text-brand-blue' : 'border-gray-200 dark:border-[#444] text-gray-500 hover:bg-gray-50 dark:hover:bg-[#252525]'}`}
                    >
                      <cat.icon size={16} className={cat.color} /> {cat.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sort Order */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Sort Order</label>
                <div className="grid grid-cols-2 gap-2">
                  {['Newest', 'Oldest', 'Highest', 'Lowest'].map(sort => (
                    <button 
                      key={sort}
                      onClick={() => setSortOrder(sort)}
                      className={`flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-bold border transition-all ${sortOrder === sort ? 'bg-blue-50 dark:bg-blue-900/20 border-brand-blue text-brand-blue' : 'border-gray-200 dark:border-[#444] text-gray-500 hover:bg-gray-50 dark:hover:bg-[#252525]'}`}
                    >
                      {sort}
                    </button>
                  ))}
                </div>
              </div>

            </div>

            {/* Footer Actions */}
            <div className="p-5 border-t border-gray-100 dark:border-[#333] flex gap-3 shrink-0 bg-gray-50 dark:bg-[#252525]">
              <button 
                onClick={resetFilters}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-gray-500 hover:bg-gray-200 dark:hover:bg-[#333] transition-colors"
              >
                <RotateCcw size={18} /> Reset
              </button>
              <button 
                onClick={() => setShowFilterModal(false)}
                className="flex-1 bg-brand-blue hover:bg-blue-600 text-white font-bold py-2.5 rounded-xl shadow-lg shadow-blue-500/30 transition-all"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default CashManager;