import React, { useEffect, useRef, useState } from 'react';
import { X, ShieldAlert, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';

// Set worker CDN matching pdfjs-dist version
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || '3.11.174'}/pdf.worker.min.js`;

const SecureDocumentViewer = ({ fileUrl, fileName, onClose }) => {
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const canvasRef = useRef(null);
  const [pdfDoc, setPdfDoc] = useState(null);

  // Disable developer tools keys and printing
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Disable Ctrl+P (Print)
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        alert("Printing is disabled for premium vault documents.");
      }
      // Disable Ctrl+S (Save)
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
      }
      // Disable F12, Ctrl+Shift+I, Ctrl+Shift+C, Ctrl+Shift+J (DevTools)
      if (e.key === 'F12' || 
          (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'C' || e.key === 'J')) ||
          (e.ctrlKey && e.key === 'u')) { // Ctrl+U View Source
        e.preventDefault();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Load PDF Document
  useEffect(() => {
    setLoading(true);
    setError(null);
    
    const loadPdf = async () => {
      try {
        const loadingTask = pdfjsLib.getDocument({
          url: fileUrl,
          withCredentials: false
        });
        const pdf = await loadingTask.promise;
        setPdfDoc(pdf);
        setNumPages(pdf.numPages);
        setCurrentPage(1);
        setLoading(false);
      } catch (err) {
        console.error("PDF loading error:", err);
        setError("Unable to load document securely. Please try again later.");
        setLoading(false);
      }
    };

    loadPdf();
  }, [fileUrl]);

  // Render Page
  useEffect(() => {
    if (!pdfDoc) return;

    let isCurrent = true;
    const renderPage = async () => {
      try {
        const page = await pdfDoc.getPage(currentPage);
        
        // Render at scale for crispness
        const scale = 1.5; 
        const viewport = page.getViewport({ scale });
        const canvas = canvasRef.current;
        if (!canvas || !isCurrent) return;

        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        const renderContext = {
          canvasContext: context,
          viewport: viewport
        };
        await page.render(renderContext).promise;
      } catch (err) {
        console.error("Error rendering page:", err);
      }
    };

    renderPage();
    return () => {
      isCurrent = false;
    };
  }, [pdfDoc, currentPage]);

  const handlePrevPage = () => {
    setCurrentPage(prev => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(prev + 1, numPages));
  };

  return (
    <div 
      className="fixed inset-0 z-[9999] flex flex-col bg-slate-950/95 backdrop-blur-md select-none"
      onContextMenu={(e) => e.preventDefault()}
      style={{ userSelect: 'none', WebkitUserSelect: 'none', msUserSelect: 'none' }}
    >
      <style>{`
        @media print {
          body {
            display: none !important;
          }
          canvas, img, div {
            display: none !important;
          }
        }
      `}</style>

      {/* Header bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/50">
        <div className="flex items-center space-x-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-slate-100 text-sm max-w-xs md:max-w-md truncate">{fileName}</h3>
            <p className="text-xs text-slate-400 font-mono">Secure Vault Viewer • View Only Mode</p>
          </div>
        </div>
        
        <button 
          onClick={onClose}
          className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
          title="Close Viewer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Main Viewer Area */}
      <div className="flex-1 flex items-center justify-center p-4 overflow-auto">
        {loading ? (
          <div className="flex flex-col items-center space-y-4">
            <Loader2 className="w-10 h-10 text-emerald-400 animate-spin" />
            <p className="text-slate-400 text-sm">Decrypting and loading document securely...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center text-center p-8 bg-slate-900/40 rounded-2xl border border-rose-500/20 max-w-md">
            <ShieldAlert className="w-12 h-12 text-rose-400 mb-4" />
            <h4 className="text-slate-100 font-semibold mb-2">Security or Loading Error</h4>
            <p className="text-slate-400 text-sm">{error}</p>
          </div>
        ) : (
          <div className="relative shadow-2xl border border-slate-800 rounded-lg overflow-hidden bg-white max-h-[85vh]">
            <canvas 
              ref={canvasRef} 
              className="max-w-full h-auto object-contain block pointer-events-none" 
              style={{ maxHeight: '82vh' }}
            />
          </div>
        )}
      </div>

      {/* Control Footer */}
      {!loading && !error && (
        <div className="px-6 py-4 bg-slate-900/50 border-t border-slate-800 flex items-center justify-between text-slate-300">
          <p className="text-xs text-slate-400 hidden sm:block">
            ⚠️ Downloading, printing, and screenshotting is prohibited.
          </p>

          <div className="flex items-center space-x-4 mx-auto sm:mx-0">
            <button 
              onClick={handlePrevPage}
              disabled={currentPage <= 1}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-slate-800 text-slate-200 transition"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="text-sm font-medium">
              Page {currentPage} of {numPages}
            </span>
            <button 
              onClick={handleNextPage}
              disabled={currentPage >= numPages}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-slate-800 text-slate-200 transition"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SecureDocumentViewer;
