'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

export default function DashboardPage() {
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sseStatus, setSseStatus] = useState('connecting');
  const [newLeadIds, setNewLeadIds] = useState(new Set());
  const sseRef = useRef(null);

  const fetchProviders = useCallback(async () => {
    try {
      const res = await fetch('/api/providers');
      const data = await res.json();
      setProviders(data);
    } catch (e) {
      console.error('Failed to fetch providers', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProviders();
  }, [fetchProviders]);

  useEffect(() => {
    let es;
    let retryTimeout;

    function connect() {
      es = new EventSource('/api/sse');
      sseRef.current = es;

      es.onopen = () => {
        setSseStatus('connected');
      };

      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'NEW_LEAD') {
            // Refresh provider data
            fetchProviders().then(() => {
              // Briefly highlight all cards
              if (data.leadId) {
                setNewLeadIds((prev) => new Set(prev).add(data.leadId));
                setTimeout(() => {
                  setNewLeadIds((prev) => {
                    const next = new Set(prev);
                    next.delete(data.leadId);
                    return next;
                  });
                }, 2000);
              }
            });
          }
        } catch {}
      };

      es.onerror = () => {
        setSseStatus('connecting');
        es.close();
        retryTimeout = setTimeout(connect, 3000);
      };
    }

    connect();

    return () => {
      if (sseRef.current) sseRef.current.close();
      clearTimeout(retryTimeout);
    };
  }, [fetchProviders]);

  const getQuotaClass = (provider) => {
    const remaining = provider.monthlyQuota - provider.leadsReceived;
    if (remaining <= 0) return 'low';
    if (remaining >= provider.monthlyQuota) return 'full';
    return '';
  };

  return (
    <>
      <nav className="nav">
        <a href="/" className="nav-brand">AYAN <span>KHAN</span></a>
        <ul className="nav-links">
          <li><a href="/request-service">Submit Lead</a></li>
          <li><a href="/dashboard" className="active">Dashboard</a></li>
          <li><a href="/test-tools">Test Tools</a></li>
        </ul>
      </nav>

      <div className="hero">
        <div className="hero-label">Feature 3 & 4 — Provider Dashboard</div>
        <h1>Live Dashboard</h1>
        <p>Real-time view of all 8 providers. Updates automatically when new leads are assigned via Server-Sent Events.</p>
      </div>

      <main className="main-wide">
        <div className="status-bar">
          <span className={`status-dot ${sseStatus}`}></span>
          {sseStatus === 'connected' ? 'Live — auto-updates via SSE' : 'Connecting to live feed…'}
          <span style={{ marginLeft: 'auto', opacity: 0.6 }}>
            {providers.length} providers loaded
          </span>
          <button
            className="btn btn-outline"
            style={{ marginLeft: '0.5rem', padding: '0.3rem 0.75rem', fontSize: '0.7rem' }}
            onClick={fetchProviders}
          >
            ↻ Refresh
          </button>
        </div>

        {loading ? (
          <div className="loading">
            <div className="spinner"></div>
            Loading providers…
          </div>
        ) : providers.length === 0 ? (
          <div className="alert alert-info">
            No providers found. Please visit <a href="/test-tools" style={{ color: 'inherit', fontWeight: 600 }}>Test Tools</a> to seed the database.
          </div>
        ) : (
          <div className="provider-grid">
            {providers.map((provider) => {
              const remaining = provider.monthlyQuota - provider.leadsReceived;
              return (
                <div
                  key={provider.id}
                  className="provider-card"
                  id={`provider-${provider.id}`}
                >
                  <div className="provider-header">
                    <span className="provider-name">{provider.name}</span>
                    <span className={`quota-badge ${getQuotaClass(provider)}`}>
                      {remaining <= 0 ? 'QUOTA FULL' : `${remaining} left`}
                    </span>
                  </div>
                  <div className="provider-body">
                    <div className="provider-stats">
                      <div className="stat">
                        <span className="stat-value">{provider.leadsReceived}</span>
                        <span className="stat-label">Received</span>
                      </div>
                      <div className="stat">
                        <span className="stat-value">{remaining > 0 ? remaining : 0}</span>
                        <span className="stat-label">Remaining</span>
                      </div>
                      <div className="stat">
                        <span className="stat-value">{provider.monthlyQuota}</span>
                        <span className="stat-label">Quota</span>
                      </div>
                    </div>

                    <div className="leads-list">
                      {provider.assignments.length === 0 ? (
                        <div className="no-leads">No leads assigned yet</div>
                      ) : (
                        provider.assignments.slice(0, 5).map((a) => (
                          <div
                            key={a.id}
                            className={`lead-item ${newLeadIds.has(a.leadId) ? 'new-lead' : ''}`}
                          >
                            <div className="lead-item-name">{a.lead.name}</div>
                            <div className="lead-item-meta">📍 {a.lead.city} · 📞 {a.lead.phone}</div>
                            <div className="lead-item-service">{a.lead.service.name}</div>
                          </div>
                        ))
                      )}
                      {provider.assignments.length > 5 && (
                        <div style={{ fontSize: '0.72rem', color: 'var(--muted)', textAlign: 'center', padding: '0.25rem' }}>
                          +{provider.assignments.length - 5} more leads
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}
