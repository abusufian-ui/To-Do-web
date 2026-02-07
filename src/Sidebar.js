import React from 'react';
import { 
  CheckSquare, Calendar, StickyNote, BarChart3, Settings, 
  ChevronLeft, ChevronRight, Trash2 
} from 'lucide-react';

// Added binCount prop
const Sidebar = ({ activeTab, setActiveTab, isOpen, toggleSidebar, binCount = 0 }) => {
  
  const menuItems = [
    { name: 'Tasks', icon: CheckSquare },
    { name: 'Calendar', icon: Calendar },
    { name: 'Notes', icon: StickyNote },
    { name: 'Grade Book', icon: BarChart3 },
    { name: 'Settings', icon: Settings },
    { name: 'Bin', icon: Trash2 },
  ];

  return (
    <div className={`
      relative h-screen bg-white dark:bg-[#1E1E1E] border-r border-gray-200 dark:border-[#2C2C2C] 
      flex flex-col transition-all duration-300 ease-in-out
      ${isOpen ? 'w-64 p-6' : 'w-20 p-4 items-center'}
    `}>
      
      {isOpen && (
        <h2 className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-4 animate-fadeIn whitespace-nowrap">
          Tools
        </h2>
      )}

      <div className="flex flex-col gap-2 w-full">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.name;
          const isBin = item.name === 'Bin';

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
              <div className="relative">
                <Icon size={20} strokeWidth={2} />
                {/* BIN NOTIFICATION DOT */}
                {isBin && binCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-[#1E1E1E]"></span>
                )}
              </div>
              
              {isOpen && (
                <div className="flex-1 flex justify-between items-center overflow-hidden">
                  <span className="text-sm font-medium whitespace-nowrap">
                    {item.name}
                  </span>
                  {/* Optional: Show number count in open sidebar too */}
                  {isBin && binCount > 0 && (
                    <span className="text-[10px] bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 px-1.5 py-0.5 rounded-full font-bold">
                      {binCount}
                    </span>
                  )}
                </div>
              )}
              
              {!isOpen && (
                 <div className="absolute left-14 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 whitespace-nowrap">
                   {item.name} {isBin && binCount > 0 && `(${binCount})`}
                 </div>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-auto w-full pt-4 border-t border-gray-200 dark:border-[#2C2C2C]">
        <button 
          onClick={toggleSidebar}
          className="flex items-center justify-center w-full p-2 text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#2C2C2C] rounded-lg transition-colors"
        >
          {isOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
        </button>
      </div>

    </div>
  );
};

export default Sidebar;