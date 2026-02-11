import React, { useState, useEffect } from 'react';
import { 
  Wallet, TrendingUp, TrendingDown, Plus, Search, Trash2, 
  PieChart, ArrowUpRight, ArrowDownRight, 
  ShoppingBag, Coffee, Car, BookOpen, Zap, Gift, Smartphone, 
  AlertCircle, CheckCircle2, X, Banknote
} from 'lucide-react';

// --- 1. CONFIG & HELPERS ---
const CATEGORIES = [
  { id: 'food', name: 'Food & Dining', icon: Coffee, color: 'text-orange-500', bg: 'bg-orange-100 dark:bg-orange-900/30' },
  { id: 'transport', name: 'Transportation', icon: Car, color: 'text-blue-500', bg: 'bg-blue-100 dark:bg-blue-900/30' },
  { id: 'shopping', name: 'Shopping', icon: ShoppingBag, color: 'text-pink-500', bg: 'bg-pink-100 dark:bg-pink-900/30' },
  { id: 'education', name: 'Education', icon: BookOpen, color: 'text-purple-500', bg: 'bg-purple-100 dark:bg-purple-900/30' },
  { id: 'bills', name: 'Bills & Utilities', icon: Zap, color: 'text-yellow-500', bg: 'bg-yellow-100 dark:bg-yellow-900/30' },
  { id: 'entertainment', name: 'Entertainment', icon: Smartphone, color: 'text-indigo-500', bg: 'bg-indigo-100 dark:bg-indigo-900/30' },
  { id: 'other', name: 'Other', icon: Gift, color: 'text-gray-500', bg: 'bg-gray-100 dark:bg-gray-800' },
];

const getCategoryConfig = (catName) => CATEGORIES.find(c => c.name === catName) || CATEGORIES[6];

// --- 2. SUB-COMPONENTS ---

// A. OVERVIEW CARD
const StatCard = ({ title, amount, type, icon: Icon }) => {
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
      </div>
      <div className={`p-3 rounded-xl ${bgClass}`}>
        <Icon size={24} className={colorClass} />
      </div>
    </div>
  );
};

// B. TRANSACTION ROW
const TransactionRow = ({ t, onDelete }) => {
  const cat = getCategoryConfig(t.category);
  const isIncome = t.type === 'income';
  const Icon = isIncome ? TrendingUp : cat.icon;

  return (
    <div className="group flex items-center justify-between p-4 bg-white dark:bg-[#1E1E1E] border border-gray-100 dark:border-[#2C2C2C] rounded-xl hover:shadow-md transition-all">
      <div className="flex items-center gap-4">
        <div className={`p-3 rounded-xl ${isIncome ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600' : cat.bg + ' ' + cat.color}`}>
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

// --- 3. MAIN COMPONENT ---
const CashManager = ({ activeTab }) => {
  // --- STATE ---
  const [transactions, setTransactions] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  
  // Form State & Errors
  const [newTrans, setNewTrans] = useState({ 
    type: 'expense', 
    amount: '', 
    category: 'Food & Dining', 
    description: '', 
    date: new Date().toISOString().split('T')[0] 
  });
  const [errors, setErrors] = useState({}); // New Error State

  // Budget State
  const [budgets, setBudgets] = useState({});
  const [editingBudget, setEditingBudget] = useState(null);
  const [budgetInput, setBudgetInput] = useState('');

  // --- LOAD DATA FROM API ---
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [transRes, budgetRes] = await Promise.all([
          fetch('/api/transactions'),
          fetch('/api/budgets')
        ]);
        
        const transData = await transRes.json();
        const budgetData = await budgetRes.json();
        
        setTransactions(transData.map(t => ({ ...t, id: t._id })));
        
        const bObj = {};
        budgetData.forEach(b => bObj[b.category] = b.limit);
        setBudgets(bObj);
      } catch (err) {
        console.error("Failed to fetch cash data", err);
      }
    };
    fetchData();
  }, []);

  // --- ACTIONS ---
  const validateForm = () => {
    const newErrors = {};
    if (!newTrans.amount) newErrors.amount = "Please enter an amount.";
    if (!newTrans.description) newErrors.description = "Please enter a description.";
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAdd = async () => {
    if (!validateForm()) return; // Stop if validation fails
    
    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newTrans, amount: Number(newTrans.amount) })
      });
      const savedT = await res.json();
      
      setTransactions([{ ...savedT, id: savedT._id }, ...transactions]);
      setShowAddModal(false);
      setNewTrans({ type: 'expense', amount: '', category: 'Food & Dining', description: '', date: new Date().toISOString().split('T')[0] });
      setErrors({}); // Clear errors
    } catch (error) {
      console.error("Error adding transaction", error);
    }
  };

  const handleDelete = async (id) => {
    try {
      await fetch(`/api/transactions/${id}`, { method: 'DELETE' });
      setTransactions(transactions.filter(t => t.id !== id));
    } catch (error) {
      console.error("Error deleting transaction", error);
    }
  };

  const handleSetBudget = async (category) => {
    try {
      const limit = Number(budgetInput);
      await fetch('/api/budgets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, limit })
      });
      
      setBudgets({ ...budgets, [category]: limit });
      setEditingBudget(null);
    } catch (error) {
      console.error("Error setting budget", error);
    }
  };

  // --- CALCULATIONS ---
  const totalIncome = transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
  const balance = totalIncome - totalExpense;

  const categoryTotals = CATEGORIES.map(cat => {
    const total = transactions
      .filter(t => t.type === 'expense' && t.category === cat.name)
      .reduce((acc, t) => acc + t.amount, 0);
    return { ...cat, total };
  }).filter(c => c.total > 0).sort((a, b) => b.total - a.total);

  // --- RENDERERS ---

  // 1. OVERVIEW VIEW
  const renderOverview = () => (
    <div className="space-y-8 animate-fadeIn">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard title="Total Balance" amount={balance} type="balance" icon={Wallet} />
        <StatCard title="Total Income" amount={totalIncome} type="income" icon={ArrowUpRight} />
        <StatCard title="Total Expenses" amount={totalExpense} type="expense" icon={ArrowDownRight} />
      </div>

      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-gray-800 dark:text-white">Recent Activity</h3>
          <button onClick={() => setShowAddModal(true)} className="flex items-center gap-2 text-sm font-bold text-brand-blue bg-blue-50 dark:bg-blue-900/20 px-4 py-2 rounded-xl hover:bg-blue-100 transition-colors">
            <Plus size={16} /> Add New
          </button>
        </div>
        <div className="space-y-3">
          {transactions.slice(0, 5).map(t => <TransactionRow key={t.id} t={t} onDelete={handleDelete} />)}
          {transactions.length === 0 && <p className="text-gray-400 text-sm italic">No transactions yet.</p>}
        </div>
      </div>
    </div>
  );

  // 2. TRANSACTIONS VIEW
  const renderTransactions = () => (
    <div className="animate-fadeIn space-y-6">
       <div className="flex flex-col md:flex-row justify-between items-center gap-4">
         <div className="relative w-full md:w-64">
           <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
           <input type="text" placeholder="Search..." className="w-full bg-white dark:bg-[#1E1E1E] border border-gray-200 dark:border-[#333] rounded-xl pl-10 pr-4 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-blue" />
         </div>
         <button onClick={() => setShowAddModal(true)} className="w-full md:w-auto bg-brand-blue hover:bg-blue-600 text-white font-bold py-2.5 px-6 rounded-xl shadow-lg shadow-blue-500/30 transition-all flex items-center justify-center gap-2">
            <Plus size={18} /> Add Transaction
         </button>
       </div>

       <div className="space-y-3">
          {transactions.map(t => <TransactionRow key={t.id} t={t} onDelete={handleDelete} />)}
          {transactions.length === 0 && (
            <div className="text-center py-12 bg-gray-50 dark:bg-[#1E1E1E] rounded-2xl border border-dashed border-gray-200 dark:border-[#333]">
              <p className="text-gray-400">No transactions found.</p>
            </div>
          )}
       </div>
    </div>
  );

  // 3. ANALYTICS VIEW
  const renderAnalytics = () => (
    <div className="animate-fadeIn grid grid-cols-1 md:grid-cols-2 gap-8">
      <div className="bg-white dark:bg-[#1E1E1E] p-6 rounded-2xl border border-gray-200 dark:border-[#333]">
        <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-2">
          <PieChart size={20} className="text-brand-blue" /> Expense Breakdown
        </h3>
        <div className="space-y-6">
          {categoryTotals.map(cat => {
            const percentage = Math.round((cat.total / totalExpense) * 100) || 0;
            return (
              <div key={cat.id}>
                <div className="flex justify-between text-sm mb-2">
                  <span className="flex items-center gap-2 text-gray-700 dark:text-gray-200 font-medium">
                    <cat.icon size={16} className={cat.color} /> {cat.name}
                  </span>
                  <span className="font-bold text-gray-900 dark:text-white">{percentage}% (Rs {cat.total})</span>
                </div>
                <div className="h-2 w-full bg-gray-100 dark:bg-[#333] rounded-full overflow-hidden">
                  <div className={`h-full ${cat.bg.replace('/30', '')} ${cat.color.replace('text', 'bg')}`} style={{ width: `${percentage}%` }}></div>
                </div>
              </div>
            );
          })}
          {categoryTotals.length === 0 && <p className="text-gray-400 italic text-sm">No expense data to analyze.</p>}
        </div>
      </div>
      
      <div className="space-y-6">
        <div className="bg-gradient-to-br from-indigo-600 to-purple-700 p-6 rounded-2xl text-white shadow-xl">
           <h3 className="font-bold text-lg mb-2">Spending Insight</h3>
           <p className="opacity-90 text-sm leading-relaxed">
             You have spent <span className="font-bold text-xl">Rs {totalExpense.toLocaleString()}</span> this month. 
             {totalIncome > 0 && totalExpense > totalIncome 
               ? " Warning: You have exceeded your income!" 
               : " Good job keeping expenses below income."}
           </p>
        </div>
      </div>
    </div>
  );

  // 4. BUDGET VIEW
  const renderBudget = () => (
    <div className="animate-fadeIn space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {CATEGORIES.filter(c => c.id !== 'other').map(cat => {
          const budget = budgets[cat.name] || 0;
          const spent = transactions
            .filter(t => t.type === 'expense' && t.category === cat.name)
            .reduce((acc, t) => acc + t.amount, 0);
          
          const percentage = budget > 0 ? Math.min(100, Math.round((spent / budget) * 100)) : 0;
          
          // --- UPDATED ALERT LOGIC ---
          const isOver = spent > budget && budget > 0;
          const isHighUsage = percentage >= 75; // 75% threshold
          
          // Determine Colors based on thresholds
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
                       className="w-20 bg-gray-50 dark:bg-[#333] border border-gray-300 dark:border-[#444] rounded px-2 py-1 text-xs outline-none"
                       placeholder="Amount"
                       value={budgetInput}
                       onChange={(e) => setBudgetInput(e.target.value)}
                     />
                     <button onClick={() => handleSetBudget(cat.name)} className="text-emerald-500"><CheckCircle2 size={16} /></button>
                     <button onClick={() => setEditingBudget(null)} className="text-red-500"><X size={16} /></button>
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
                 <div 
                   className={`h-full transition-all duration-500 ${barColor}`} 
                   style={{ width: `${percentage}%` }}
                 ></div>
              </div>
              
              {isOver && (
                <div className="mt-3 flex items-center gap-2 text-xs text-red-500 bg-red-50 dark:bg-red-900/20 p-2 rounded-lg animate-pulse">
                  <AlertCircle size={14} /> <span>Exceeded by Rs {(spent - budget).toLocaleString()}!</span>
                </div>
              )}
              {!isOver && isHighUsage && (
                 <div className="mt-3 flex items-center gap-2 text-xs text-red-500 bg-red-50 dark:bg-red-900/10 p-2 rounded-lg">
                  <AlertCircle size={14} /> <span>Warning: {percentage}% of budget used.</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  // --- ROUTER ---
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
          <div className="bg-white dark:bg-[#1E1E1E] w-full max-w-md rounded-2xl shadow-2xl border border-gray-200 dark:border-[#2C2C2C] overflow-hidden animate-slideUp">
            <div className="p-5 border-b border-gray-100 dark:border-[#333] flex justify-between items-center">
              <h3 className="font-bold text-lg dark:text-white">Add Transaction</h3>
              <button onClick={() => setShowAddModal(false)}><X size={20} className="text-gray-400 hover:text-gray-600" /></button>
            </div>
            <div className="p-6 space-y-4">
              
              {/* Type Switcher */}
              <div className="flex bg-gray-100 dark:bg-[#2C2C2C] p-1 rounded-xl">
                <button 
                  onClick={() => setNewTrans({...newTrans, type: 'expense'})}
                  className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${newTrans.type === 'expense' ? 'bg-white dark:bg-[#3E3E3E] text-red-500 shadow-sm' : 'text-gray-500'}`}
                >Expense</button>
                <button 
                  onClick={() => setNewTrans({...newTrans, type: 'income'})}
                  className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${newTrans.type === 'income' ? 'bg-white dark:bg-[#3E3E3E] text-emerald-500 shadow-sm' : 'text-gray-500'}`}
                >Income</button>
              </div>

              {/* Amount - WITH VALIDATION */}
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase">Amount</label>
                <div className="relative mt-1">
                  {/* Changed Icon to PKR text */}
                  <div className="absolute left-3 top-3 text-gray-400 text-xs font-bold">PKR</div>
                  <input 
                    type="number" 
                    value={newTrans.amount} 
                    onChange={e => {
                        setNewTrans({...newTrans, amount: e.target.value});
                        setErrors({...errors, amount: null}); // Clear error on change
                    }} 
                    className={`w-full bg-gray-50 dark:bg-[#121212] border rounded-xl pl-11 pr-4 py-2.5 outline-none focus:ring-2 dark:text-white transition-all
                      ${errors.amount 
                        ? 'border-red-500 focus:ring-red-200 bg-red-50 dark:bg-red-900/10' 
                        : 'border-gray-200 dark:border-[#333] focus:ring-brand-blue'
                      }`}
                    placeholder="0.00" 
                    autoFocus 
                  />
                </div>
                {errors.amount && <p className="text-red-500 text-xs mt-1 font-medium flex items-center gap-1"><AlertCircle size={10}/> {errors.amount}</p>}
              </div>

              {/* Category */}
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase">Category</label>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {CATEGORIES.map(cat => (
                    <button 
                      key={cat.id} 
                      onClick={() => setNewTrans({...newTrans, category: cat.name})}
                      className={`flex flex-col items-center justify-center p-2 rounded-xl border transition-all ${newTrans.category === cat.name ? 'border-brand-blue bg-blue-50 dark:bg-blue-900/20 text-brand-blue' : 'border-gray-100 dark:border-[#333] text-gray-500 hover:bg-gray-50 dark:hover:bg-[#252525]'}`}
                    >
                      <cat.icon size={18} className="mb-1" />
                      <span className="text-[10px] font-medium truncate w-full text-center">{cat.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Description - WITH VALIDATION */}
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase">Description</label>
                <input 
                  type="text" 
                  value={newTrans.description} 
                  onChange={e => {
                      setNewTrans({...newTrans, description: e.target.value});
                      setErrors({...errors, description: null}); // Clear error on change
                  }} 
                  className={`w-full mt-1 bg-gray-50 dark:bg-[#121212] border rounded-xl px-4 py-2.5 outline-none focus:ring-2 dark:text-white transition-all
                    ${errors.description 
                        ? 'border-red-500 focus:ring-red-200 bg-red-50 dark:bg-red-900/10' 
                        : 'border-gray-200 dark:border-[#333] focus:ring-brand-blue'
                    }`}
                  placeholder="What was this for?" 
                />
                {errors.description && <p className="text-red-500 text-xs mt-1 font-medium flex items-center gap-1"><AlertCircle size={10}/> {errors.description}</p>}
              </div>

              {/* Date */}
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase">Date</label>
                <input type="date" value={newTrans.date} onChange={e => setNewTrans({...newTrans, date: e.target.value})} className="w-full mt-1 bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-[#333] rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-brand-blue dark:text-white dark:[color-scheme:dark]" />
              </div>

              <button onClick={handleAdd} className="w-full bg-brand-blue hover:bg-blue-600 text-white font-bold py-3 rounded-xl shadow-lg shadow-blue-500/30 transition-all mt-2">
                Save Transaction
              </button>

            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default CashManager;