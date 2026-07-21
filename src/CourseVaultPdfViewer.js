import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker URL
if (typeof window !== 'undefined' && pdfjsLib && pdfjsLib.GlobalWorkerOptions) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version || '3.11.174'}/build/pdf.worker.min.mjs`;
}

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const CourseVaultPdfViewer = () => {
  const [filesList, setFilesList] = useState([]);
  const [activeFileIndex, setActiveFileIndex] = useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pdfDoc, setPdfDoc] = useState(null);
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageInputVal, setPageInputVal] = useState('1');
  const [zoom, setZoom] = useState(1.0);
  const [showSidebar, setShowSidebar] = useState(true);

  const scrollContainerRef = useRef(null);
  const pageContainerRefs = useRef({});
  const thumbnailRefs = useRef({});
  const observerRef = useRef(null);

  // Initialize files list on mount
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const batchKey = params.get('batchKey');
      const isBatch = params.get('batch') === 'true' || !!batchKey;

      let items = [];
      if (batchKey) {
        const stored = sessionStorage.getItem(batchKey) || localStorage.getItem(batchKey) || localStorage.getItem('vault_viewer_latest_batch');
        if (stored) {
          try { items = JSON.parse(stored); } catch (_) {}
        }
      }

      if (!items || items.length === 0) {
        const storedLocal = localStorage.getItem('vault_viewer_batch');
        const storedSession = sessionStorage.getItem('vault_viewer_batch');
        const stored = storedSession || storedLocal;
        if (stored) {
          try { items = JSON.parse(stored); } catch (_) {}
        }
      }

      // Fallback if not batch or storage empty
      if (!items || items.length === 0) {
        const source = params.get('source');
        const fileId = params.get('id');
        const rawTitle = params.get('title') || 'Document.pdf';
        if (source && fileId) {
          items = [{
            id: fileId,
            source: source,
            title: rawTitle,
            fileName: rawTitle
          }];
        }
      }

      if (items && items.length > 0) {
        setFilesList(items);
        setActiveFileIndex(0);
      } else {
        setError('No document parameters found.');
        setLoading(false);
      }
    } catch (err) {
      console.error('[PDF_VIEWER] Initialization error:', err);
      setError('Failed to initialize document viewer.');
      setLoading(false);
    }
  }, []);

  // Enforce document tab title persistently
  useEffect(() => {
    if (filesList.length === 0) return;

    const updateTabTitle = () => {
      if (filesList.length === 1) {
        const activeFile = filesList[0];
        const rawTitle = activeFile.title || activeFile.fileName || 'Document.pdf';
        const cleanTitle = rawTitle;
        if (document.title !== cleanTitle) {
          document.title = cleanTitle;
        }
      } else if (filesList.length > 1) {
        if (document.title !== 'Course Files Viewer') {
          document.title = 'Course Files Viewer';
        }
      }
    };

    updateTabTitle();
    const interval = setInterval(updateTabTitle, 500);
    return () => clearInterval(interval);
  }, [filesList]);

  // Keyboard shortcut blocking (Prevent Save, Print, DevTools)
  useEffect(() => {
    const handleKeyDown = (e) => {
      const isCtrlOrCmd = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();

      if (
        (isCtrlOrCmd && ['s', 'p', 'u'].includes(key)) ||
        e.key === 'F12' ||
        (isCtrlOrCmd && e.shiftKey && ['i', 'c', 'j'].includes(key))
      ) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, []);

  // Ctrl + Wheel PDF Zoom inside viewport (Prevents browser whole-page zooming)
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleWheelZoom = (e) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const zoomDelta = e.deltaY < 0 ? 0.15 : -0.15;
        setZoom(z => Math.min(Math.max(parseFloat((z + zoomDelta).toFixed(2)), 0.5), 3.0));
      }
    };

    container.addEventListener('wheel', handleWheelZoom, { passive: false });
    return () => container.removeEventListener('wheel', handleWheelZoom);
  }, []);

  // Load active PDF document
  useEffect(() => {
    if (filesList.length === 0) return;

    let active = true;
    const currentFile = filesList[activeFileIndex];
    if (!currentFile) return;

    const loadDocument = async () => {
      setLoading(true);
      setError(null);
      setPdfDoc(null);
      setNumPages(0);
      setCurrentPage(1);
      setPageInputVal('1');

      try {
        const params = new URLSearchParams(window.location.search);
        const urlToken = params.get('token');
        const token = (urlToken && urlToken !== 'null' && urlToken !== 'undefined')
          ? urlToken
          : (localStorage.getItem('token') || sessionStorage.getItem('token') || '');

        const streamUrl = `${API_BASE}/api/vault/stream-data/${currentFile.source}/${currentFile.id}?token=${encodeURIComponent(token)}`;

        const response = await fetch(streamUrl, {
          headers: {
            ...(token ? { 'x-auth-token': token } : {}),
            'Accept': 'application/x-vault-stream'
          }
        });

        if (!response.ok) {
          throw new Error(`Failed to load document (HTTP ${response.status})`);
        }

        const rawArrayBuffer = await response.arrayBuffer();
        if (!active) return;

        const uint8Data = new Uint8Array(rawArrayBuffer);
        const loadingTask = pdfjsLib.getDocument({ data: uint8Data });
        const doc = await loadingTask.promise;

        if (!active) return;
        setPdfDoc(doc);
        setNumPages(doc.numPages);
        setLoading(false);
      } catch (err) {
        console.error('[PDF_CANVAS_VIEWER] Document load error:', err);
        if (active) {
          setError(err.message || 'Failed to open document.');
          setLoading(false);
        }
      }
    };

    loadDocument();

    return () => { active = false; };
  }, [filesList, activeFileIndex]);

  // Setup Intersection Observer to track visible page on vertical scroll
  useEffect(() => {
    if (!pdfDoc || numPages === 0) return;

    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const pageNum = parseInt(entry.target.getAttribute('data-page-number'), 10);
          if (pageNum) {
            setCurrentPage(pageNum);
            setPageInputVal(pageNum.toString());
          }
        }
      });
    }, {
      root: scrollContainerRef.current,
      threshold: 0.4
    });

    observerRef.current = observer;

    Object.values(pageContainerRefs.current).forEach(el => {
      if (el) observer.observe(el);
    });

    return () => {
      if (observerRef.current) observerRef.current.disconnect();
    };
  }, [pdfDoc, numPages]);

  // Render individual page onto canvas
  const renderSinglePage = useCallback(async (pageNum, canvasEl, isThumbnail = false) => {
    if (!pdfDoc || !canvasEl) return;

    try {
      const page = await pdfDoc.getPage(pageNum);
      const renderScale = isThumbnail ? 0.22 : zoom * 1.3;
      const viewport = page.getViewport({ scale: renderScale });

      const context = canvasEl.getContext('2d');
      canvasEl.height = viewport.height;
      canvasEl.width = viewport.width;

      const renderContext = {
        canvasContext: context,
        viewport: viewport
      };

      await page.render(renderContext).promise;
    } catch (err) {
      if (err.name !== 'RenderingCancelledException') {
        console.error(`Page ${pageNum} render error:`, err);
      }
    }
  }, [pdfDoc, zoom]);

  // Page navigation handlers
  const handlePageJumpSubmit = (e) => {
    if (e.key === 'Enter') {
      const targetPage = parseInt(pageInputVal, 10);
      if (targetPage >= 1 && targetPage <= numPages) {
        scrollToPage(targetPage);
      } else {
        setPageInputVal(currentPage.toString());
      }
    }
  };

  const scrollToPage = (pageNum) => {
    const targetEl = pageContainerRefs.current[pageNum];
    if (targetEl) {
      targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setCurrentPage(pageNum);
      setPageInputVal(pageNum.toString());
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) scrollToPage(currentPage - 1);
  };

  const handleNextPage = () => {
    if (currentPage < numPages) scrollToPage(currentPage + 1);
  };

  const handleZoomIn = () => setZoom(z => Math.min(z + 0.2, 3.0));
  const handleZoomOut = () => setZoom(z => Math.max(z - 0.2, 0.5));
  const handleResetZoom = () => setZoom(1.0);

  const closeFileTab = (idxToRemove, e) => {
    if (e) e.stopPropagation();

    const updated = filesList.filter((_, i) => i !== idxToRemove);
    if (updated.length === 0) {
      window.close();
      return;
    }

    setFilesList(updated);
    if (activeFileIndex >= updated.length) {
      setActiveFileIndex(Math.max(0, updated.length - 1));
    } else if (idxToRemove < activeFileIndex) {
      setActiveFileIndex(a => Math.max(0, a - 1));
    }
  };

  const popoutTabToWindow = (fileIndex) => {
    const fileObj = filesList[fileIndex];
    if (!fileObj) return;

    const currentToken = localStorage.getItem('token') || sessionStorage.getItem('token') || '';
    const jsonStr = JSON.stringify([fileObj]);
    try { localStorage.setItem('vault_viewer_batch', jsonStr); } catch (_) {}
    try { sessionStorage.setItem('vault_viewer_batch', jsonStr); } catch (_) {}

    const viewerUrl = `/pdf-viewer?batch=true&source=${encodeURIComponent(fileObj.source)}&id=${encodeURIComponent(fileObj.id)}&title=${encodeURIComponent(fileObj.title || fileObj.fileName)}&token=${encodeURIComponent(currentToken)}`;
    window.open(viewerUrl, '_blank');
  };

  const activeFile = filesList[activeFileIndex] || {};
  const displayTitle = activeFile.title || activeFile.fileName || 'Document.pdf';

  return (
    <div
      onContextMenu={e => e.preventDefault()}
      style={{
        width: '100vw', height: '100vh', background: '#0e0e11',
        color: '#e4e1ed', fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        userSelect: 'none', WebkitUserSelect: 'none'
      }}
    >
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .chrome-scroll-area::-webkit-scrollbar { width: 10px; height: 10px; }
        .chrome-scroll-area::-webkit-scrollbar-track { background: #18181f; }
        .chrome-scroll-area::-webkit-scrollbar-thumb { background: #3f3f50; border-radius: 5px; }
        .chrome-scroll-area::-webkit-scrollbar-thumb:hover { background: #565670; }
        .subtabs-bar::-webkit-scrollbar { height: 4px; }
        .subtabs-bar::-webkit-scrollbar-thumb { background: #3b82f6; border-radius: 2px; }
        @media print { body { display: none !important; } }
      `}</style>

      {/* ── TOP HEADER TOOLBAR (Chrome PDF Viewer Aesthetic) ── */}
      <header style={{
        height: 54, background: '#1c1c24', borderBottom: '1px solid #2a2a36',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 16px', flexShrink: 0, zIndex: 20
      }}>
        {/* Left: Sidebar Toggle & Title / Multi-Tabs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, overflow: 'hidden', flex: 1 }}>
          <button
            onClick={() => setShowSidebar(s => !s)}
            style={{
              background: showSidebar ? '#2d2d3a' : 'transparent', border: 'none', color: '#e4e1ed',
              width: 34, height: 34, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', fontSize: 16
            }}
            title="Toggle Thumbnails Sidebar"
          >
            ☰
          </button>

          {/* Single File Title OR Multi-File Header Tabs */}
          {filesList.length === 1 ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 400 }}>
                📄 {displayTitle}
              </span>
            </div>
          ) : (
            <div className="subtabs-bar" style={{ display: 'flex', alignItems: 'center', gap: 6, overflowX: 'auto', flex: 1, paddingRight: 16 }}>
              {filesList.map((file, idx) => {
                const isActive = idx === activeFileIndex;
                const tabTitle = file.title || file.fileName || `File ${idx + 1}`;
                return (
                  <div
                    key={file.id || idx}
                    draggable="true"
                    onDragEnd={() => popoutTabToWindow(idx)}
                    onClick={() => setActiveFileIndex(idx)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '6px 12px', borderRadius: '8px 8px 0 0',
                      background: isActive ? '#323644' : '#22222c',
                      color: isActive ? '#ffffff' : '#94a3b8',
                      borderTop: isActive ? '2px solid #3b82f6' : '2px solid transparent',
                      borderLeft: '1px solid #2a2a36', borderRight: '1px solid #2a2a36',
                      fontWeight: isActive ? 600 : 400, fontSize: 12,
                      cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap', maxWidth: 220
                    }}
                  >
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>
                      📄 {tabTitle}
                    </span>

                    {/* Pop-out button */}
                    <button
                      onClick={(e) => { e.stopPropagation(); popoutTabToWindow(idx); }}
                      style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '0 2px', fontSize: 11 }}
                      title="Drag or click to open in new tab window"
                    >
                      ↗
                    </button>

                    {/* Close Tab (X) button */}
                    <button
                      onClick={(e) => closeFileTab(idx, e)}
                      style={{
                        background: 'none', border: 'none', color: '#94a3b8',
                        cursor: 'pointer', padding: '0 2px', fontSize: 12,
                        borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}
                      onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                      onMouseLeave={e => e.currentTarget.style.color = '#94a3b8'}
                      title="Close file tab"
                    >
                      ✕
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Center: Page Controls + Direct Jump Input + Zoom */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {!loading && !error && numPages > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#121218', border: '1px solid #2d2d3a', borderRadius: 8, padding: '3px 10px' }}>
              <button
                onClick={handlePrevPage}
                disabled={currentPage <= 1}
                style={{ background: 'none', border: 'none', color: currentPage <= 1 ? '#444' : '#cbd5e1', cursor: currentPage <= 1 ? 'default' : 'pointer', fontSize: 13, padding: '0 4px' }}
              >◀</button>

              <input
                type="number"
                min={1}
                max={numPages}
                value={pageInputVal}
                onChange={(e) => setPageInputVal(e.target.value)}
                onKeyDown={handlePageJumpSubmit}
                onBlur={() => setPageInputVal(currentPage.toString())}
                style={{
                  width: 36, background: '#22222c', border: '1px solid #3b82f6',
                  borderRadius: 4, color: '#fff', textAlign: 'center',
                  fontSize: 12, fontWeight: 700, padding: '2px 0', outline: 'none'
                }}
              />
              <span style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8' }}>
                / {numPages}
              </span>

              <button
                onClick={handleNextPage}
                disabled={currentPage >= numPages}
                style={{ background: 'none', border: 'none', color: currentPage >= numPages ? '#444' : '#cbd5e1', cursor: currentPage >= numPages ? 'default' : 'pointer', fontSize: 13, padding: '0 4px' }}
              >▶</button>
            </div>
          )}

          {/* Zoom controls */}
          <div style={{ display: 'flex', alignItems: 'center', background: '#121218', border: '1px solid #2d2d3a', borderRadius: 8, padding: '2px 6px' }}>
            <button
              onClick={handleZoomOut}
              style={{ background: 'none', border: 'none', color: '#cbd5e1', cursor: 'pointer', padding: '2px 6px', fontSize: 14, fontWeight: 700 }}
              title="Zoom Out"
            >-</button>
            <span onClick={handleResetZoom} style={{ fontSize: 12, fontWeight: 600, color: '#e2e8f0', padding: '0 6px', cursor: 'pointer' }}>
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={handleZoomIn}
              style={{ background: 'none', border: 'none', color: '#cbd5e1', cursor: 'pointer', padding: '2px 6px', fontSize: 14, fontWeight: 700 }}
              title="Zoom In"
            >+</button>
          </div>
        </div>
      </header>

      {/* ── BODY WORKSPACE (THUMBNAILS SIDEBAR + MAIN VERTICAL SCROLL CANVAS STACK) ── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>
        
        {/* Left Thumbnails Sidebar */}
        {showSidebar && !loading && !error && numPages > 0 && (
          <aside className="chrome-scroll-area" style={{
            width: 190, background: '#16161e', borderRight: '1px solid #2a2a36',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            padding: '16px 10px', overflowY: 'auto', gap: 16, flexShrink: 0
          }}>
            {Array.from({ length: numPages }, (_, i) => i + 1).map(pageNum => {
              const isActive = pageNum === currentPage;
              return (
                <div
                  key={pageNum}
                  onClick={() => scrollToPage(pageNum)}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    cursor: 'pointer', gap: 6
                  }}
                >
                  <div style={{
                    border: isActive ? '2px solid #3b82f6' : '1px solid #333344',
                    borderRadius: 4, overflow: 'hidden', background: '#fff',
                    boxShadow: isActive ? '0 0 12px rgba(59,130,246,0.5)' : '0 2px 6px rgba(0,0,0,0.4)',
                    transition: 'all 0.15s ease'
                  }}>
                    <canvas
                      ref={el => {
                        thumbnailRefs.current[pageNum] = el;
                        if (el) renderSinglePage(pageNum, el, true);
                      }}
                      style={{ display: 'block' }}
                    />
                  </div>
                  <span style={{ fontSize: 11, fontWeight: isActive ? 700 : 500, color: isActive ? '#60a5fa' : '#94a3b8' }}>
                    {pageNum}
                  </span>
                </div>
              );
            })}
          </aside>
        )}

        {/* Main Vertical Scroll Container (Supports Ctrl + Scroll PDF Zoom) */}
        <main
          ref={scrollContainerRef}
          className="chrome-scroll-area"
          style={{
            flex: 1, background: '#0e0e11', overflowY: 'auto',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            padding: '32px 16px', gap: 28
          }}
        >
          {loading && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, color: '#93c5fd', marginTop: '20vh' }}>
              <div style={{ width: 40, height: 40, border: '3px solid rgba(59,130,246,0.2)', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              <span style={{ fontSize: 14, fontWeight: 500, color: '#c7c4d7' }}>Rendering document pages…</span>
            </div>
          )}

          {error && (
            <div style={{ textAlign: 'center', color: '#ffb4ab', padding: 32, marginTop: '20vh' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
              <p style={{ margin: 0, fontWeight: 700, fontSize: 16 }}>{error}</p>
            </div>
          )}

          {!loading && !error && numPages > 0 && (
            Array.from({ length: numPages }, (_, i) => i + 1).map(pageNum => (
              <div
                key={pageNum}
                data-page-number={pageNum}
                ref={el => { pageContainerRefs.current[pageNum] = el; }}
                style={{
                  background: '#ffffff', borderRadius: 4,
                  boxShadow: '0 8px 30px rgba(0,0,0,0.7), 0 0 1px rgba(255,255,255,0.1)',
                  marginBottom: 8, display: 'flex', justifyContent: 'center'
                }}
              >
                <canvas
                  ref={el => {
                    if (el) renderSinglePage(pageNum, el, false);
                  }}
                  style={{ display: 'block', borderRadius: 4 }}
                />
              </div>
            ))
          )}
        </main>
      </div>
    </div>
  );
};

export default CourseVaultPdfViewer;
