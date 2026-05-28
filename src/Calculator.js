import React, { useState, useEffect } from 'react';
import { evaluate } from 'mathjs';
import { History, Trash2, Delete, Calculator as CalcIcon, Code2 } from 'lucide-react';

const Calculator = () => {
  const [mode, setMode] = useState('scientific'); 
  const [expression, setExpression] = useState('');
  const [result, setResult] = useState('0');
  const [base, setBase] = useState(10); 
  const [history, setHistory] = useState([]);

  // Safely evaluate the math string
  const calculateResult = (expr, currentBase = 10) => {
    try {
      if (!expr) return '0';
      
      let safeExpr = expr
        .replace(/×/g, '*')
        .replace(/÷/g, '/')
        .replace(/π/g, 'pi')
        .replace(/√\(/g, 'sqrt(');

      let evaluated = evaluate(safeExpr);

      if (mode === 'programmer') {
        evaluated = Math.floor(evaluated); 
        if (currentBase === 16) return evaluated.toString(16).toUpperCase();
        if (currentBase === 8) return evaluated.toString(8);
        if (currentBase === 2) return evaluated.toString(2);
        return evaluated.toString(10);
      }

      return Math.round(evaluated * 100000000) / 100000000;
    } catch (error) {
      return result; 
    }
  };

  // Run live evaluation
  useEffect(() => {
    setResult(calculateResult(expression, base));
  }, [expression, base, mode]);

  const handleInput = (value) => setExpression((prev) => prev + value);
  const handleClear = () => { setExpression(''); setResult('0'); };
  const handleBackspace = () => setExpression((prev) => prev.slice(0, -1));
  
  const handleEqual = () => {
    const finalResult = result.toString();
    if (expression && finalResult !== '0' && expression !== finalResult) {
      setHistory(prev => [{ expr: expression, res: finalResult, mode }, ...prev].slice(0, 20));
    }
    setExpression(finalResult);
    setResult('');
  };

  const handleModeSwitch = (newMode) => {
    setMode(newMode);
    setExpression('');
    setResult('0');
    setBase(10); 
  };

  const clearHistory = () => setHistory([]);

  // Keypad Configurations
  const scientificKeys = [
    { label: 'sin', val: 'sin(' }, { label: 'cos', val: 'cos(' }, { label: 'tan', val: 'tan(' }, { label: 'AC', val: 'AC', type: 'action' },
    { label: 'log', val: 'log10(' }, { label: 'ln', val: 'log(' }, { label: '(', val: '(' }, { label: ')', val: ')' },
    { label: '√', val: '√(' }, { label: '^', val: '^' }, { label: '%', val: '%' }, { label: '÷', val: '÷', type: 'operator' },
    { label: '7', val: '7', type: 'num' }, { label: '8', val: '8', type: 'num' }, { label: '9', val: '9', type: 'num' }, { label: '×', val: '×', type: 'operator' },
    { label: '4', val: '4', type: 'num' }, { label: '5', val: '5', type: 'num' }, { label: '6', val: '6', type: 'num' }, { label: '-', val: '-', type: 'operator' },
    { label: '1', val: '1', type: 'num' }, { label: '2', val: '2', type: 'num' }, { label: '3', val: '3', type: 'num' }, { label: '+', val: '+', type: 'operator' },
    { label: '0', val: '0', type: 'num' }, { label: '.', val: '.', type: 'num' }, { label: 'π', val: 'π' }, { label: '=', val: '=', type: 'equal' }
  ];

  const programmerKeys = [
    { label: 'AND', val: ' & ' }, { label: 'OR', val: ' | ' }, { label: 'XOR', val: ' ^ ' }, { label: 'AC', val: 'AC', type: 'action' },
    { label: 'NOT', val: '~' }, { label: '<<', val: ' << ' }, { label: '>>', val: ' >> ' }, { label: '⌫', val: '⌫', type: 'action' },
    { label: 'A', val: 'A', hexOnly: true, type: 'num' }, { label: 'B', val: 'B', hexOnly: true, type: 'num' }, { label: '7', val: '7', maxBase: 8, type: 'num' }, { label: '8', val: '8', maxBase: 10, type: 'num' },
    { label: 'C', val: 'C', hexOnly: true, type: 'num' }, { label: 'D', val: 'D', hexOnly: true, type: 'num' }, { label: '4', val: '4', maxBase: 8, type: 'num' }, { label: '5', val: '5', maxBase: 8, type: 'num' },
    { label: 'E', val: 'E', hexOnly: true, type: 'num' }, { label: 'F', val: 'F', hexOnly: true, type: 'num' }, { label: '1', val: '1', maxBase: 2, type: 'num' }, { label: '2', val: '2', maxBase: 8, type: 'num' },
    { label: '(', val: '(' }, { label: ')', val: ')' }, { label: '0', val: '0', maxBase: 2, type: 'num' }, { label: '=', val: '=', type: 'equal' }
  ];

  const activeKeys = mode === 'scientific' ? scientificKeys : programmerKeys;

  const isKeyDisabled = (key) => {
    if (mode !== 'programmer') return false;
    if (key.hexOnly && base !== 16) return true;
    if (key.maxBase && base < key.maxBase) return true;
    return false;
  };

  const getButtonClass = (btn, disabled) => {
    if (disabled) return 'opacity-10 cursor-not-allowed bg-transparent text-gray-500 border border-[#333]';
    if (btn.type === 'operator') return 'bg-blue-600/10 text-blue-500 hover:bg-blue-600/20 border border-blue-500/20';
    if (btn.type === 'action') return 'bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20';
    if (btn.type === 'equal') return 'bg-blue-600 text-white hover:bg-blue-500 shadow-lg shadow-blue-500/30';
    if (btn.type === 'num') return 'bg-white dark:bg-[#2A2A2A] text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-[#333] shadow-sm';
    return 'bg-gray-100 dark:bg-[#1E1E1E] text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[#2C2C2C] border border-transparent dark:border-[#333]';
  };

  return (
    <div className="w-full h-full p-4 md:p-6 flex flex-col lg:flex-row gap-4 md:gap-6 max-w-[1600px] mx-auto animate-fadeIn">
      
      {/* --- LEFT PANE: CALCULATOR ENGINE --- */}
      <div className="flex-1 flex flex-col bg-white dark:bg-[#121212] rounded-3xl shadow-2xl border border-gray-200 dark:border-[#2C2C2C] overflow-hidden">
        
        {/* Top Bar & Toggles */}
        <div className="p-4 md:p-6 border-b border-gray-100 dark:border-[#2C2C2C] flex justify-between items-center bg-gray-50 dark:bg-[#1A1A1A]">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-xl text-blue-500"><CalcIcon size={20} /></div>
            Workspace
          </h2>
          <div className="flex bg-gray-200 dark:bg-[#0A0A0A] rounded-xl p-1 border border-gray-300 dark:border-[#333]">
            <button onClick={() => handleModeSwitch('scientific')} className={`px-3 md:px-5 py-2 text-xs md:text-sm font-bold rounded-lg transition-all flex items-center gap-2 ${mode === 'scientific' ? 'bg-white dark:bg-[#2C2C2C] text-gray-900 dark:text-white shadow' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>
              <CalcIcon size={16} /> <span className="hidden sm:inline">Scientific</span>
            </button>
            <button onClick={() => handleModeSwitch('programmer')} className={`px-3 md:px-5 py-2 text-xs md:text-sm font-bold rounded-lg transition-all flex items-center gap-2 ${mode === 'programmer' ? 'bg-brand-blue text-white shadow' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>
              <Code2 size={16} /> <span className="hidden sm:inline">Programmer</span>
            </button>
          </div>
        </div>

        <div className="p-4 md:p-6 flex-1 flex flex-col gap-4 md:gap-6 min-h-0">
          {/* Main Display Area */}
          <div className="w-full bg-gray-50 dark:bg-[#1A1A1A] p-4 md:p-6 rounded-2xl text-right flex flex-col justify-end min-h-[120px] md:min-h-[160px] border border-gray-200 dark:border-[#2C2C2C] relative overflow-hidden group flex-shrink-0">
            <div className="absolute top-4 left-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer hover:text-red-500" onClick={handleBackspace}>
              <Delete size={20} />
            </div>
            <div className="text-gray-500 dark:text-gray-400 text-lg md:text-2xl tracking-wider min-h-[28px] overflow-x-auto whitespace-nowrap [&::-webkit-scrollbar]:hidden font-mono mb-2">
              {expression || '0'}
            </div>
            <div className="text-5xl md:text-7xl font-black text-gray-900 dark:text-white overflow-x-auto whitespace-nowrap [&::-webkit-scrollbar]:hidden tracking-tighter">
              {result}
            </div>
          </div>

          {/* FLUID KEYPAD GRID - No more missing buttons! */}
          <div className="grid grid-cols-4 gap-2 md:gap-3 flex-1 min-h-0">
            {activeKeys.map((btn, index) => {
              const disabled = isKeyDisabled(btn);
              return (
                <button
                  key={index}
                  disabled={disabled}
                  onClick={() => {
                    if (btn.val === 'AC') handleClear();
                    else if (btn.val === '⌫') handleBackspace();
                    else if (btn.val === '=') handleEqual();
                    else handleInput(btn.val);
                  }}
                  className={`w-full h-full min-h-[40px] text-base md:text-xl font-bold rounded-xl md:rounded-2xl transition-all active:scale-95 flex items-center justify-center ${getButtonClass(btn, disabled)}`}
                >
                  {btn.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* --- RIGHT PANE: CONTEXT & HISTORY --- */}
      <div className="w-full lg:w-80 xl:w-96 flex flex-col gap-4 md:gap-6 overflow-y-auto">
        
        {/* Live Programmer Conversions */}
        {mode === 'programmer' && (
          <div className="bg-white dark:bg-[#121212] rounded-3xl shadow-lg border border-gray-200 dark:border-[#2C2C2C] p-5 flex-shrink-0">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 px-1">Live Conversions</h3>
            <div className="space-y-2">
              {[{ label: 'HEX', val: 16 }, { label: 'DEC', val: 10 }, { label: 'OCT', val: 8 }, { label: 'BIN', val: 2 }].map((b) => (
                <button 
                  key={b.val} 
                  onClick={() => setBase(b.val)}
                  className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${base === b.val ? 'bg-blue-500/10 border-blue-500/30' : 'bg-gray-50 dark:bg-[#1A1A1A] border-transparent hover:border-gray-300 dark:hover:border-[#333]'}`}
                >
                  <span className={`text-sm font-bold ${base === b.val ? 'text-blue-500' : 'text-gray-500'}`}>{b.label}</span>
                  <span className={`font-mono text-sm truncate max-w-[150px] md:max-w-[180px] ${base === b.val ? 'text-gray-900 dark:text-white font-bold' : 'text-gray-600 dark:text-gray-400'}`}>
                    {calculateResult(expression || result || '0', b.val)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* The Tape (History) */}
        <div className="flex-1 bg-white dark:bg-[#121212] rounded-3xl shadow-lg border border-gray-200 dark:border-[#2C2C2C] flex flex-col overflow-hidden min-h-[250px]">
          <div className="p-4 md:p-5 border-b border-gray-100 dark:border-[#2C2C2C] flex justify-between items-center bg-gray-50 dark:bg-[#1A1A1A]">
            <h3 className="text-sm font-bold text-gray-800 dark:text-white flex items-center gap-2">
              <History size={16} className="text-brand-blue" />
              History Tape
            </h3>
            {history.length > 0 && (
              <button onClick={clearHistory} className="text-gray-400 hover:text-red-500 transition-colors" title="Clear History">
                <Trash2 size={16} />
              </button>
            )}
          </div>
          
          <div className="flex-1 overflow-y-auto p-2 [&::-webkit-scrollbar]:hidden">
            {history.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 opacity-50 space-y-3">
                <History size={32} />
                <p className="text-xs font-medium">No calculations yet</p>
              </div>
            ) : (
              <div className="space-y-1">
                {history.map((item, idx) => (
                  <div key={idx} className="p-4 rounded-xl hover:bg-gray-50 dark:hover:bg-[#1A1A1A] cursor-pointer group transition-colors text-right" onClick={() => setExpression(item.res)}>
                    <div className="text-xs text-gray-400 font-mono mb-1 truncate">{item.expr} =</div>
                    <div className="text-lg font-bold text-gray-900 dark:text-white group-hover:text-brand-blue transition-colors truncate">{item.res}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default Calculator;