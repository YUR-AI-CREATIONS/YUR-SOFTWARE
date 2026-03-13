import React, { useState, useEffect, useCallback } from 'react';
import { Shield, RefreshCw, Circle, Zap, Wifi, WifiOff } from 'lucide-react';
import type { ConnectedService } from '../types';
import { getTrustVaultStatus, checkBackendHealth, ConnectorStatus } from '../services/backendApi';

const fallbackServices: ConnectedService[] = [
  { id: 'llm', name: 'Emergent LLM', status: 'connected', metricLabel: 'Tokens', metricValue: '0' },
  { id: 'mongo', name: 'MongoDB', status: 'connected', metricLabel: 'Queries', metricValue: '0' },
  { id: 'supa', name: 'Supabase', status: 'connected', metricLabel: 'Queries', metricValue: '0' },
];

const keyLabels = [
  { label: 'Emergent LLM Key', masked: '••••••••••••••s3' },
  { label: 'MongoDB Connection', masked: '••••••••••••••db' },
  { label: 'Supabase Key', masked: '••••••••••••••sb' },
];

const TrustVault: React.FC = () => {
  const [services, setServices] = useState<ConnectedService[]>(fallbackServices);
  const [autoRotate, setAutoRotate] = useState(true);
  const [backendOnline, setBackendOnline] = useState(false);
  const [lastChecked, setLastChecked] = useState<string | null>(null);

  const refreshStatus = useCallback(async () => {
    const online = await checkBackendHealth();
    setBackendOnline(online);
    if (!online) return;

    try {
      const data = await getTrustVaultStatus();
      setLastChecked(data.checked_at);

      const mapped: ConnectedService[] = data.connectors.map((c: ConnectorStatus) => ({
        id: c.name.toLowerCase().replace(/\s+/g, '_'),
        name: c.name,
        status: c.connected ? 'connected' : (c.status === 'error' ? 'error' : 'disconnected'),
        metricLabel: c.tokens_total ? 'Tokens' : 'Queries',
        metricValue: c.tokens_total
          ? `${c.tokens_used?.toLocaleString() || '0'} / ${c.tokens_total.toLocaleString()}`
          : `${c.queries?.toLocaleString() || '0'}`,
      }));
      setServices(mapped);
    } catch {
      // Keep fallback
    }
  }, []);

  useEffect(() => {
    refreshStatus();
    const interval = setInterval(refreshStatus, 20000);
    return () => clearInterval(interval);
  }, [refreshStatus]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-emerald-400/15 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Shield size={12} className="text-emerald-400/50" />
          <span className="text-[10px] font-space font-bold tracking-widest text-white uppercase">Trust Vault</span>
          {backendOnline ? (
            <Wifi size={8} className="text-emerald-400/60" />
          ) : (
            <WifiOff size={8} className="text-amber-400/40" />
          )}
        </div>
        <button onClick={refreshStatus} className="p-1 hover:bg-emerald-500/10 rounded transition-colors">
          <RefreshCw size={10} className="text-emerald-400/50" />
        </button>
      </div>

      {/* Services */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2 min-h-0">
        {services.map(svc => (
          <div key={svc.id} className="border border-emerald-400/15 rounded-md p-3">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <Circle size={6} className={
                  svc.status === 'connected' ? 'text-emerald-400 fill-emerald-400' :
                  svc.status === 'error' ? 'text-red-400 fill-red-400' :
                  'text-amber-400 fill-amber-400'
                } />
                <span className="text-[11px] font-mono text-emerald-100">{svc.name}</span>
              </div>
              <span className={`text-[9px] font-mono font-bold tracking-wider px-2 py-0.5 rounded ${
                svc.status === 'connected'
                  ? 'text-emerald-400 bg-emerald-500/10'
                  : svc.status === 'error'
                  ? 'text-red-400 bg-red-500/10'
                  : 'text-amber-400 bg-amber-500/10'
              }`}>
                {svc.status.toUpperCase()}
              </span>
            </div>
            <div className="flex items-center justify-between ml-4">
              <span className="text-[10px] font-mono text-emerald-400/50">{svc.metricLabel}: {svc.metricValue}</span>
            </div>
          </div>
        ))}

        {/* Key Rotation */}
        <div className="mt-3 pt-3 border-t border-emerald-400/15">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-mono text-emerald-300/60 uppercase tracking-wider">Key Rotation</span>
            <button
              onClick={() => setAutoRotate(!autoRotate)}
              className={`flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-mono transition-colors ${
                autoRotate
                  ? 'bg-emerald-500/15 text-emerald-400'
                  : 'bg-white/5 text-emerald-400/50'
              }`}
            >
              <Zap size={8} />
              AUTO
            </button>
          </div>

          {keyLabels.map((k, i) => (
            <div key={i} className="flex items-center justify-between py-1.5">
              <span className="text-[10px] font-mono text-emerald-200/70">{k.label}</span>
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-mono text-emerald-400/40">{k.masked}</span>
                <button className="p-0.5 hover:bg-emerald-500/10 rounded transition-colors">
                  <RefreshCw size={8} className="text-emerald-400/40" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-emerald-400/15 flex items-center justify-between flex-shrink-0">
        {lastChecked && (
          <span className="text-[8px] font-mono text-emerald-400/30">
            Last check: {new Date(lastChecked).toLocaleTimeString()}
          </span>
        )}
        <div className="flex items-center gap-1.5 ml-auto">
          <Zap size={10} className="text-emerald-400/50" />
          <span className="text-[9px] font-mono text-emerald-400/50">Made with Emergent</span>
        </div>
      </div>
    </div>
  );
};

export default TrustVault;
