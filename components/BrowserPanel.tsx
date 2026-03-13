import React, { useState, useEffect } from 'react';
import { Globe, Search, ExternalLink, FileText, Eye, List, Loader2 } from 'lucide-react';
import { BrowseSession, WebPage } from '../types';
import { webAgentService } from '../services/WebAgentService';

type ViewMode = 'rendered' | 'text' | 'results';

const BrowserPanel: React.FC = () => {
  const [session, setSession] = useState<BrowseSession | null>(null);
  const [urlInput, setUrlInput] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('results');
  const [selectedPage, setSelectedPage] = useState<WebPage | null>(null);

  useEffect(() => {
    webAgentService.setSessionCallback((s) => {
      setSession(s);
      // Auto-switch to results when we get search results
      if (s.searchResults.length > 0 && s.pages.length === 0) {
        setViewMode('results');
      }
      // Auto-switch to text when a page is fetched
      if (s.pages.length > 0) {
        setSelectedPage(s.pages[s.pages.length - 1]);
        setViewMode('text');
      }
    });
    return () => webAgentService.setSessionCallback(null);
  }, []);

  const handleNavigate = async () => {
    if (!urlInput.trim()) return;
    let url = urlInput.trim();
    if (!url.startsWith('http')) url = 'https://' + url;
    setUrlInput(url);
    const page = await webAgentService.fetchPage(url);
    if (page) {
      setSelectedPage(page);
      setViewMode('text');
    }
  };

  const handleBrowseGoal = () => {
    if (!urlInput.trim()) return;
    webAgentService.browse(urlInput.trim());
    setUrlInput('');
  };

  const statusColors: Record<string, string> = {
    idle: 'text-emerald-400/50',
    searching: 'text-amber-400',
    fetching: 'text-amber-400',
    analyzing: 'text-blue-400',
    complete: 'text-emerald-400',
    error: 'text-red-400',
  };

  return (
    <div className="flex flex-col h-full">
      {/* URL Bar */}
      <div className="flex items-center gap-2 p-3 border-b border-emerald-400/15">
        <Globe size={14} className="text-emerald-400/50 flex-shrink-0" />
        <input
          type="text"
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              if (urlInput.startsWith('http') || urlInput.includes('.')) {
                handleNavigate();
              } else {
                handleBrowseGoal();
              }
            }
          }}
          placeholder="Enter URL or search goal... (e.g., 'best React frameworks 2026')"
          className="flex-1 bg-white/[0.03] border border-emerald-400/15 rounded px-2.5 py-1.5 text-[11px] text-emerald-50 outline-none placeholder:text-emerald-400/30 focus:border-emerald-400/30 font-mono"
        />
        <button
          onClick={handleNavigate}
          className="px-2.5 py-1.5 rounded bg-emerald-600/40 hover:bg-emerald-500/40 text-[10px] font-mono text-emerald-200 transition-colors"
        >
          GO
        </button>
        <button
          onClick={handleBrowseGoal}
          className="px-2.5 py-1.5 rounded bg-amber-600/40 hover:bg-amber-500/40 text-[10px] font-mono text-amber-200 transition-colors flex items-center gap-1"
        >
          <Search size={10} />
          BROWSE
        </button>
      </div>

      {/* Status bar */}
      {session && (
        <div className="flex items-center justify-between px-3 py-1.5 border-b border-emerald-400/10 bg-emerald-500/5">
          <div className="flex items-center gap-2">
            {(session.status === 'searching' || session.status === 'fetching' || session.status === 'analyzing') && (
              <Loader2 size={10} className="text-amber-400 animate-spin" />
            )}
            <span className={`text-[10px] font-mono uppercase tracking-wider ${statusColors[session.status] || 'text-emerald-400/50'}`}>
              {session.status}
            </span>
            <span className="text-[9px] font-mono text-emerald-400/40">
              — {session.goal}
            </span>
          </div>
          <div className="flex items-center gap-2 text-[9px] font-mono text-emerald-400/40">
            <span>{session.pages.length} pages</span>
            <span>{session.searchResults.length} results</span>
          </div>
        </div>
      )}

      {/* View mode tabs */}
      <div className="flex items-center gap-0 border-b border-emerald-400/10">
        {([
          { id: 'results' as ViewMode, label: 'RESULTS', icon: List },
          { id: 'text' as ViewMode, label: 'TEXT', icon: FileText },
          { id: 'rendered' as ViewMode, label: 'RENDERED', icon: Eye },
        ]).map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setViewMode(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2 text-[10px] font-mono tracking-wider transition-all border-b-2 ${
                viewMode === tab.id
                  ? 'text-emerald-200 border-emerald-400 bg-emerald-500/10'
                  : 'text-emerald-400/40 border-transparent hover:text-emerald-300/60'
              }`}
            >
              <Icon size={10} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-auto min-h-0 custom-scrollbar">
        {/* No session state */}
        {!session && (
          <div className="flex flex-col items-center justify-center h-full gap-3 p-6">
            <Globe size={32} className="text-emerald-400/20" />
            <p className="text-xs text-emerald-400/40 font-mono text-center">
              Enter a URL to fetch a page, or type a goal and click BROWSE<br />
              for autonomous web research.
            </p>
            <p className="text-[10px] text-amber-400/40 font-mono">
              TIP: Use <span className="text-amber-300/60">/browse &lt;goal&gt;</span> in the chat panel
            </p>
          </div>
        )}

        {/* Results view */}
        {viewMode === 'results' && session && (
          <div className="p-3 space-y-2">
            {session.searchResults.length === 0 && (
              <p className="text-[11px] text-emerald-400/40 font-mono py-4 text-center">
                {session.status === 'searching' ? 'Searching...' : 'No search results yet.'}
              </p>
            )}
            {session.searchResults.map((r, i) => (
              <div
                key={i}
                className="border border-emerald-400/10 rounded p-2.5 hover:bg-emerald-500/5 transition-colors cursor-pointer"
                onClick={async () => {
                  const page = await webAgentService.fetchPage(r.url);
                  if (page) {
                    setSelectedPage(page);
                    setViewMode('text');
                  }
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-mono text-emerald-200 truncate">{r.title}</p>
                    <p className="text-[9px] font-mono text-emerald-400/40 truncate mt-0.5">{r.url}</p>
                    <p className="text-[10px] text-emerald-300/50 mt-1 line-clamp-2">{r.snippet}</p>
                  </div>
                  <ExternalLink size={10} className="text-emerald-400/30 flex-shrink-0 mt-0.5" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Text view */}
        {viewMode === 'text' && (
          <div className="p-4">
            {selectedPage ? (
              <>
                <div className="mb-3 pb-2 border-b border-emerald-400/10">
                  <h3 className="text-xs font-mono text-emerald-200 mb-1">{selectedPage.title}</h3>
                  <p className="text-[9px] font-mono text-emerald-400/40">{selectedPage.url}</p>
                </div>
                <div className="text-[11px] font-mono text-emerald-100/80 leading-relaxed whitespace-pre-wrap">
                  {selectedPage.content || 'No content extracted.'}
                </div>
              </>
            ) : (
              <p className="text-[11px] text-emerald-400/40 font-mono text-center py-8">
                Select a page from results or enter a URL to view content.
              </p>
            )}
          </div>
        )}

        {/* Rendered (iframe) view */}
        {viewMode === 'rendered' && (
          <div className="h-full">
            {selectedPage?.rawHtml ? (
              <iframe
                srcDoc={selectedPage.rawHtml}
                sandbox="allow-same-origin"
                className="w-full h-full border-0 bg-white"
                title="Web Preview"
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-[11px] text-emerald-400/40 font-mono">
                  No page loaded for preview.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Browse history */}
      {session && session.pages.length > 0 && (
        <div className="border-t border-emerald-400/10 px-3 py-2 max-h-[80px] overflow-y-auto custom-scrollbar">
          <span className="text-[9px] font-mono text-emerald-400/40 uppercase tracking-wider">History</span>
          <div className="flex flex-wrap gap-1 mt-1">
            {session.pages.map((p, i) => (
              <button
                key={i}
                onClick={() => { setSelectedPage(p); setViewMode('text'); }}
                className={`text-[9px] font-mono px-1.5 py-0.5 rounded transition-colors truncate max-w-[150px] ${
                  selectedPage?.url === p.url
                    ? 'bg-emerald-500/15 text-emerald-300'
                    : 'bg-emerald-500/5 text-emerald-400/50 hover:bg-emerald-500/10'
                }`}
                title={p.title}
              >
                {p.title.substring(0, 25)}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default BrowserPanel;
