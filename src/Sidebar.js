import React, { useState } from 'react';
import { 
  CheckSquare, Calendar, StickyNote, BarChart3, Settings, 
  ChevronLeft, ChevronRight, Trash2, Wallet, PieChart, 
  CreditCard, PiggyBank, ChevronDown, LayoutDashboard, History,
  GraduationCap, Shield
} from 'lucide-react';

const Sidebar = ({ activeTab, setActiveTab, isOpen, toggleSidebar, binCount = 0, user }) => {
  const [isCashExpanded, setIsCashExpanded] = useState(false);
  const [isAcademicsExpanded, setIsAcademicsExpanded] = useState(false);

  // 1. WORK TOOLS (Top Section)
  const menuItems = [
    { name: 'Tasks', icon: CheckSquare },
    { name: 'Calendar', icon: Calendar },
    { name: 'Notes', icon: StickyNote }, // Correctly mapped to Notes
  ];

  const academicsSubItems = [
    { id: 'Grade Book', label: 'Grade Book', icon: BarChart3 },
    { id: 'History', label: 'History', icon: History },
  ];

  const cashSubItems = [
    { id: 'Cash-Overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'Cash-Transactions', label: 'Transactions', icon: CreditCard },
    { id: 'Cash-Analytics', label: 'Analytics', icon: PieChart },
    { id: 'Cash-Budget', label: 'Budget', icon: PiggyBank },
  ];

  const handleCashClick = () => {
    if (!isOpen) toggleSidebar();
    setIsCashExpanded(!isCashExpanded);
    if (isAcademicsExpanded) setIsAcademicsExpanded(false);
  };

  const handleAcademicsClick = () => {
    if (!isOpen) toggleSidebar();
    setIsAcademicsExpanded(!isAcademicsExpanded);
    if (isCashExpanded) setIsCashExpanded(false);
  };

  // Helper to check if a section is active (contains the current tab)
  const isAcademicsActive = ['Grade Book', 'History'].includes(activeTab);
  const isCashActive = activeTab.startsWith('Cash');

  return (
    <div className={`
      relative h-screen bg-white dark:bg-[#1E1E1E] border-r border-gray-200 dark:border-[#2C2C2C] 
      flex flex-col transition-all duration-300 ease-in-out
      ${isOpen ? 'w-64 p-6' : 'w-20 p-4 items-center'}
    `}>
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
          height: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #cbd5e1;
        }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #3f3f46;
        }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #52525b;
        }
      `}</style>
      
      {isOpen && (
        <h2 className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-4 animate-fadeIn whitespace-nowrap shrink-0">
          Tools
        </h2>
      )}

      <div className={`flex flex-col gap-2 w-full flex-1 ${isOpen ? 'overflow-y-auto custom-scrollbar' : 'overflow-visible'}`}>
        
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.name;
          return (
            <button
              key={item.name}
              onClick={() => setActiveTab(item.name)} // Sets 'Notes' tab when clicked
              className={`
                w-full flex items-center gap-3 p-3 rounded-lg transition-all duration-200 group relative
                ${isActive 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' 
                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#2C2C2C] hover:text-gray-900 dark:hover:text-white'
                }
                ${!isOpen && 'justify-center'}
              `}
            >
              <div className="relative"><Icon size={20} strokeWidth={2} /></div>
              {isOpen && <span className="text-sm font-medium whitespace-nowrap flex-1 text-left">{item.name}</span>}
              
              {!isOpen && <div className="absolute left-14 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 whitespace-nowrap">{item.name}</div>}
            </button>
          );
        })}

        {/* --- ACADEMICS SECTION --- */}
        <button
          onClick={handleAcademicsClick}
          className={`
            w-full flex items-center gap-3 p-3 rounded-lg transition-all duration-200 group relative
            ${isAcademicsActive && !isOpen // Highlight parent only if closed and active
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' 
              : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#2C2C2C] hover:text-gray-900 dark:hover:text-white'}
            ${!isOpen && 'justify-center'}
          `}
        >
          <GraduationCap size={20} strokeWidth={2} />
          {isOpen && (
            <>
              <span className="text-sm font-medium whitespace-nowrap flex-1 text-left">Academics</span>
              {isAcademicsExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </>
          )}
          {!isOpen && <div className="absolute left-14 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 whitespace-nowrap">Academics</div>}
        </button>

        {isOpen && isAcademicsExpanded && (
          <div className="mt-1 ml-4 space-y-1 border-l-2 border-gray-100 dark:border-[#333] pl-2 animate-slideDown">
            {academicsSubItems.map((sub) => (
              <button
                key={sub.id}
                onClick={() => setActiveTab(sub.id)}
                className={`
                  w-full flex items-center gap-3 p-2 rounded-md transition-all text-sm
                  ${activeTab === sub.id 
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20 font-medium' 
                    : 'text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/10'}
                `}
              >
                <sub.icon size={16} />
                <span>{sub.label}</span>
              </button>
            ))}
          </div>
        )}

        {/* --- CASH MANAGER SECTION --- */}
        <button
          onClick={handleCashClick}
          className={`
            w-full flex items-center gap-3 p-3 rounded-lg transition-all duration-200 group relative
            ${isCashActive && !isOpen // Highlight parent only if closed and active
              ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20' 
              : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#2C2C2C] hover:text-gray-900 dark:hover:text-white'}
            ${!isOpen && 'justify-center'}
          `}
        >
          <Wallet size={20} strokeWidth={2} />
          {isOpen && (
            <>
              <span className="text-sm font-medium whitespace-nowrap flex-1 text-left">Cash Manager</span>
              {isCashExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </>
          )}
          {!isOpen && <div className="absolute left-14 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 whitespace-nowrap">Cash Management</div>}
        </button>

        {isOpen && isCashExpanded && (
          <div className="mt-1 ml-4 space-y-1 border-l-2 border-gray-100 dark:border-[#333] pl-2 animate-slideDown">
            {cashSubItems.map((sub) => (
              <button
                key={sub.id}
                onClick={() => setActiveTab(sub.id)}
                className={`
                  w-full flex items-center gap-3 p-2 rounded-md transition-all text-sm
                  ${activeTab === sub.id 
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20 font-medium' 
                    : 'text-gray-500 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/10'}
                `}
              >
                <sub.icon size={16} />
                <span>{sub.label}</span>
              </button>
            ))}
          </div>
        )}

        {/* --- ADMIN SECTION --- */}
        {user && user.isAdmin && (
          <button
            onClick={() => setActiveTab('Admin')}
            className={`
              w-full flex items-center gap-3 p-3 rounded-lg transition-all duration-200 group relative
              ${activeTab === 'Admin' 
                ? 'bg-red-600 text-white shadow-lg shadow-red-500/20' 
                : 'text-gray-500 dark:text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600'}
              ${!isOpen && 'justify-center'}
            `}
          >
            <div className="relative"><Shield size={20} strokeWidth={2} /></div>
            {isOpen && <span className="text-sm font-bold whitespace-nowrap flex-1 text-left">Admin Panel</span>}
            {!isOpen && <div className="absolute left-14 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 whitespace-nowrap">Admin</div>}
          </button>
        )}

      </div>

      <div className="mt-auto w-full pt-4 border-t border-gray-200 dark:border-[#2C2C2C] flex flex-col gap-2 shrink-0 bg-white dark:bg-[#1E1E1E]">
        <button
          onClick={() => setActiveTab('Settings')}
          className={`
            flex items-center gap-3 p-3 rounded-lg transition-all duration-200 group relative w-full
            ${activeTab === 'Settings' 
              ? 'bg-gray-100 dark:bg-[#333] text-gray-900 dark:text-white font-bold' 
              : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#2C2C2C] hover:text-gray-900 dark:hover:text-white'
            }
            ${!isOpen && 'justify-center'}
          `}
        >
          <div className="relative"><Settings size={20} strokeWidth={2} /></div>
          {isOpen && <span className="text-sm font-medium whitespace-nowrap flex-1 text-left">Settings</span>}
          {!isOpen && <div className="absolute left-14 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 whitespace-nowrap">Settings</div>}
        </button>

        <button
           onClick={() => setActiveTab('Bin')}
           className={`
             w-full flex items-center gap-3 p-3 rounded-lg transition-all duration-200 group relative
             ${activeTab === 'Bin' 
               ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400' 
               : 'text-gray-500 dark:text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/10 hover:text-red-600'}
             ${!isOpen && 'justify-center'}
           `}
         >
           <div className="relative">
             <Trash2 size={20} strokeWidth={2} />
             {binCount > 0 && (
               <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-[#1E1E1E]"></span>
             )}
           </div>
           
           {isOpen && (
             <div className="flex-1 flex justify-between items-center">
               <span className="text-sm font-medium">Bin</span>
               {binCount > 0 && (
                 <span className="text-[10px] bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 px-1.5 py-0.5 rounded-full font-bold">
                   {binCount}
                 </span>
               )}
             </div>
           )}
           {!isOpen && <div className="absolute left-14 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 whitespace-nowrap">Recycle Bin</div>}
         </button>

        <button 
          onClick={toggleSidebar}
          className="flex items-center justify-center w-full p-2 mt-1 text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#2C2C2C] rounded-lg transition-colors"
        >
          {isOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
        </button>
      </div>

    </div>
  );
};

export default Sidebar;