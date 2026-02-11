import React, { useState } from 'react';
import { 
  CheckSquare, Calendar, StickyNote, BarChart3, Settings, 
  ChevronLeft, ChevronRight, Trash2, Wallet, PieChart, 
  CreditCard, PiggyBank, ChevronDown, LayoutDashboard, History,
  GraduationCap
} from 'lucide-react';

const Sidebar = ({ activeTab, setActiveTab, isOpen, toggleSidebar, binCount = 0 }) => {
  const [isCashExpanded, setIsCashExpanded] = useState(false);
  const [isAcademicsExpanded, setIsAcademicsExpanded] = useState(false);

  // 1. WORK TOOLS (Top Section)
  const menuItems = [
    { name: 'Tasks', icon: CheckSquare },
    { name: 'Calendar', icon: Calendar },
    { name: 'Notes', icon: StickyNote },
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

  return (
    <div className={`
      relative h-screen bg-white dark:bg-[#1E1E1E] border-r border-gray-200 dark:border-[#2C2C2C] 
      flex flex-col transition-all duration-300 ease-in-out
      ${isOpen ? 'w-64 p-6' : 'w-20 p-4 items-center'}
    `}>
      {/* --- CSS TRICK TO HIDE SCROLLBAR --- */}
      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
      
      {/* HEADER */}
      {isOpen && (
        <h2 className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-4 animate-fadeIn whitespace-nowrap shrink-0">
          Tools
        </h2>
      )}

      {/* --- SCROLLABLE SECTION (WORK TOOLS) --- */}
      <div className="flex flex-col gap-2 w-full flex-1 overflow-y-auto no-scrollbar">
        
        {/* Standard Items */}
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.name;
          return (
            <button
              key={item.name}
              onClick={() => setActiveTab(item.name)}
              className={`
                flex items-center gap-3 p-3 rounded-lg transition-all duration-200 group relative
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

        {/* Academics Section */}
        <div className="pt-1">
           <button
             onClick={handleAcademicsClick}
             className={`
               w-full flex items-center gap-3 p-3 rounded-lg transition-all duration-200 group relative
               ${isAcademicsExpanded || ['Grade Book', 'History'].includes(activeTab)
                 ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' 
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
                       ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-bold' 
                       : 'text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/10'}
                   `}
                 >
                   <sub.icon size={16} />
                   <span>{sub.label}</span>
                 </button>
               ))}
             </div>
           )}
        </div>

        {/* Cash Manager Section */}
        <div className="pt-1">
           <button
             onClick={handleCashClick}
             className={`
               w-full flex items-center gap-3 p-3 rounded-lg transition-all duration-200 group relative
               ${isCashExpanded || activeTab.startsWith('Cash')
                 ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400' 
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
                       ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 font-bold' 
                       : 'text-gray-500 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/10'}
                   `}
                 >
                   <sub.icon size={16} />
                   <span>{sub.label}</span>
                 </button>
               ))}
             </div>
           )}
        </div>
      </div>

      {/* --- FIXED BOTTOM SECTION (UTILITIES) --- */}
      <div className="mt-auto w-full pt-4 border-t border-gray-200 dark:border-[#2C2C2C] flex flex-col gap-2 shrink-0 bg-white dark:bg-[#1E1E1E]">
        
        {/* SETTINGS */}
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

        {/* BIN */}
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

        {/* TOGGLE BUTTON */}
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