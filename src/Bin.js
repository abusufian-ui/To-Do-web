import React, { useState } from 'react';
import { Trash2, RefreshCw, AlertTriangle, CheckCircle2, CheckSquare, CreditCard, Activity, FileText } from 'lucide-react';

const Bin = ({ binItems = [], restoreItem, permanentlyDeleteItem, restoreAll, deleteAll }) => {
  const [confirmation, setConfirmation] = useState({ isOpen: false, type: null, item: null });

  const handleActionClick = (type, item = null) => setConfirmation({ isOpen: true, type, item });
  const closeConfirmation = () => setConfirmation({ isOpen: false, type: null, item: null });

  const confirmAction = () => {
    const { type, item } = confirmation;
    if (type === 'delete' && item) permanentlyDeleteItem(item.id, item.binType);
    if (type === 'restore' && item) restoreItem(item.id, item.binType);
    if (type === 'deleteAll') deleteAll();
    if (type === 'restoreAll') restoreAll();
    closeConfirmation();
  };

  const getModalConfig = () => {
    switch (confirmation.type) {
      case 'delete':
        return {
          title: 'Permanently Delete?',
          message: `This ${confirmation.item?.binType?.toLowerCase() || 'item'} will be gone forever. This action cannot be undone.`,
          icon: <Trash2 size={24} className="text-red-600 dark:text-red-500" />,
          bgColor: 'bg-red-100 dark:bg-red-900/30',
          confirmBtn: 'bg-red-600 hover:bg-red-700 text-white',
          confirmText: 'Yes, Delete'
        };
      case 'restore':
        return {
          title: 'Restore Item?',
          message: `This ${confirmation.item?.binType?.toLowerCase() || 'item'} will be moved back to your active lists.`,
          icon: <RefreshCw size={24} className="text-green-600 dark:text-green-500" />,
          bgColor: 'bg-green-100 dark:bg-green-900/30',
          confirmBtn: 'bg-green-600 hover:bg-green-700 text-white',
          confirmText: 'Yes, Restore'
        };
      case 'deleteAll':
        return {
          title: 'Empty Recycle Bin?',
          message: 'All items in the bin will be permanently deleted. This cannot be undone.',
          icon: <AlertTriangle size={24} className="text-red-600 dark:text-red-500" />,
          bgColor: 'bg-red-100 dark:bg-red-900/30',
          confirmBtn: 'bg-red-600 hover:bg-red-700 text-white',
          confirmText: 'Empty Bin'
        };
      case 'restoreAll':
        return {
          title: 'Restore All Items?',
          message: 'All items in the bin will be moved back to your active lists.',
          icon: <CheckCircle2 size={24} className="text-blue-600 dark:text-blue-500" />,
          bgColor: 'bg-blue-100 dark:bg-blue-900/30',
          confirmBtn: 'bg-blue-600 hover:bg-blue-700 text-white',
          confirmText: 'Restore All'
        };
      default: return {};
    }
  };

  const config = getModalConfig();

  const getBadgeUI = (type) => {
    if(type === 'Task') return { icon: <CheckSquare size={14}/>, color: 'text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30' };
    if(type === 'Transaction') return { icon: <CreditCard size={14}/>, color: 'text-emerald-600 bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-900/30' };
    if(type === 'Habit') return { icon: <Activity size={14}/>, color: 'text-rose-600 bg-rose-100 dark:text-rose-400 dark:bg-rose-900/30' };
    if(type === 'Note') return { icon: <FileText size={14}/>, color: 'text-purple-600 bg-purple-100 dark:text-purple-400 dark:bg-purple-900/30' }; 
    return { icon: null, color: '' };
  };

  return (
    <div className="p-8 w-full animate-fadeIn pb-20 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-10">
        <h2 className="text-3xl font-bold dark:text-white text-gray-800">Recycle Bin</h2>
        
        {binItems.length > 0 && (
          <div className="flex gap-3">
            <button onClick={() => handleActionClick('restoreAll')} className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors shadow-lg shadow-green-500/20 active:scale-95">
              <RefreshCw size={16} /> Restore All
            </button>
            <button onClick={() => handleActionClick('deleteAll')} className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors shadow-lg shadow-red-500/20 active:scale-95">
              <Trash2 size={16} /> Empty Bin
            </button>
          </div>
        )}
      </div>

      {binItems.length > 0 && (
        <div className="flex text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 px-4">
          <div className="flex-1">Item Details</div>
          <div className="w-40 text-center">Deleted At</div>
          <div className="w-24 text-right">Actions</div>
        </div>
      )}

      <div className="space-y-3">
        {binItems.length > 0 ? (
          binItems.map(item => {
            const badge = getBadgeUI(item.binType);
            return (
              <div key={item.id} className="bg-white dark:bg-[#1E1E1E] border border-gray-200 dark:border-[#2C2C2C] rounded-xl p-4 flex items-center justify-between group hover:shadow-md transition-all">
                <div className="flex-1 flex flex-col items-start">
                  <div className="flex items-center gap-3">
                    <span className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${badge.color}`}>
                      {badge.icon} {item.binType}
                    </span>
                    <h3 className="font-bold text-gray-800 dark:text-gray-200 line-through decoration-gray-400">{item.name}</h3>
                  </div>
                  <p className="text-xs text-gray-500 mt-1.5 flex items-center gap-2 font-medium">
                    {item.subtitle}
                  </p>
                </div>
                
                <div className="w-40 text-center text-sm text-gray-500 dark:text-gray-400 font-medium">
                  {new Date(item.deletedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </div>

                <div className="w-24 flex justify-end gap-2">
                  <button onClick={() => handleActionClick('restore', item)} className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors" title="Restore"><RefreshCw size={18} /></button>
                  <button onClick={() => handleActionClick('delete', item)} className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors" title="Permanently Delete"><Trash2 size={18} /></button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-24 flex flex-col items-center justify-center border-2 border-dashed border-gray-200 dark:border-[#2C2C2C] rounded-2xl">
            <div className="w-16 h-16 bg-gray-100 dark:bg-[#2C2C2C] rounded-full flex items-center justify-center mb-4"><Trash2 size={32} className="text-gray-400" /></div>
            <p className="text-gray-500 dark:text-gray-400 font-medium">Recycle Bin is empty</p>
          </div>
        )}
      </div>

      {confirmation.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-[#1E1E1E] w-full max-w-md rounded-2xl shadow-2xl border border-gray-200 dark:border-[#2C2C2C] overflow-hidden animate-slideUp">
            <div className="p-6 text-center">
              <div className={`w-14 h-14 ${config.bgColor} rounded-full flex items-center justify-center mx-auto mb-5`}>{config.icon}</div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{config.title}</h3>
              <div className="text-sm text-gray-500 dark:text-gray-400 mb-8 leading-relaxed">
                {config.message}
                {confirmation.item && (
                  <div className="mt-3 p-3 bg-gray-50 dark:bg-[#121212] rounded-lg border border-gray-100 dark:border-[#333]">
                    <span className="font-semibold text-gray-800 dark:text-gray-200 block truncate">"{confirmation.item.name}"</span>
                  </div>
                )}
              </div>
              <div className="flex gap-3">
                <button onClick={closeConfirmation} className="flex-1 py-3 rounded-xl border border-gray-200 dark:border-[#333] text-gray-600 dark:text-gray-300 font-bold hover:bg-gray-50 dark:hover:bg-[#2C2C2C] transition-colors text-sm">Cancel</button>
                <button onClick={confirmAction} className={`flex-1 py-3 rounded-xl font-bold shadow-lg transition-all text-sm active:scale-95 ${config.confirmBtn}`}>{config.confirmText}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Bin;