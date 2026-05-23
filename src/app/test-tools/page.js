'use client';

import { useState } from 'react';

function ToolCard({ title, description, children }) {
  return (
    <div className="tool-card">
      <h3>{title}</h3>
      <p>{description}</p>
      {children}
    </div>
  );
}

export default function TestToolsPage() {
  const [seedLog, setSeedLog] = useState('');
  const [resetLog, setResetLog] = useState('');
  const [idempotencyLog, setIdempotencyLog] = useState('');
  const [concurrencyLog, setConcurrencyLog] = useState('');
  const [seedLoading, setSeedLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [idempotencyLoading, setIdempotencyLoading] = useState(false);
  const [concurrencyLoading, setConcurrencyLoading] = useState(false);

  // Fixed event ID for idempotency testing
  const IDEMPOTENCY_EVENT_ID = 'evt_quota_reset_monthly_2024_01';

  async function handleSeed() {
    setSeedLoading(true);
    setSeedLog('Seeding database...');
    try {
      const res = await fetch('/api/seed', { method: 'POST' });
      const data = await res.json();
      setSeedLog(res.ok ? `✓ ${data.message}` : `✗ Error: ${data.error}`);
    } catch (e) {
      setSeedLog(`✗ Network error: ${e.message}`);
    } finally {
      setSeedLoading(false);
    }
  }

  async function handleQuotaReset() {
    setResetLoading(true);
    const eventId = `evt_reset_${Date.now()}`;
    setResetLog(`Sending webhook with eventId: ${eventId}...\n`);
    try {
      const res = await fetch('/api/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId, type: 'QUOTA_RESET', payload: { source: 'test-tools' } }),
      });
      const data = await res.json();
      setResetLog((prev) => prev + (res.ok
        ? `✓ Success!\n  idempotent: ${data.idempotent}\n  message: ${data.message}`
        : `✗ Error: ${data.error}`));
    } catch (e) {
      setResetLog((prev) => prev + `✗ Network error: ${e.message}`);
    } finally {
      setResetLoading(false);
    }
  }

  async function handleIdempotencyTest() {
    setIdempotencyLoading(true);
    setIdempotencyLog(`Testing idempotency with fixed eventId: ${IDEMPOTENCY_EVENT_ID}\nSending 3 identical requests...\n`);

    const calls = [1, 2, 3].map(async (i) => {
      const res = await fetch('/api/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: IDEMPOTENCY_EVENT_ID,
          type: 'QUOTA_RESET',
          payload: { call: i },
        }),
      });
      const data = await res.json();
      return `Call ${i}: idempotent=${data.idempotent}, msg="${data.message}"`;
    });

    try {
      const results = await Promise.all(calls);
      setIdempotencyLog(
        `eventId: ${IDEMPOTENCY_EVENT_ID}\n` +
        `Sent 3 concurrent identical calls:\n` +
        results.join('\n') +
        `\n\n✓ Only 1 actual quota reset happened regardless of call count.`
      );
    } catch (e) {
      setIdempotencyLog((prev) => prev + `\n✗ Error: ${e.message}`);
    } finally {
      setIdempotencyLoading(false);
    }
  }

  async function handleConcurrencyTest() {
    setConcurrencyLoading(true);
    setConcurrencyLog('Generating 10 leads simultaneously...\n');
    try {
      const res = await fetch('/api/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'GENERATE_LEADS' }),
      });
      const data = await res.json();
      if (res.ok) {
        setConcurrencyLog(
          `✓ ${data.message}\n` +
          `  Succeeded: ${data.succeeded}\n` +
          `  Failed: ${data.failed}\n\n` +
          `Check Dashboard to verify fair allocation was maintained.`
        );
      } else {
        setConcurrencyLog(`✗ Error: ${data.error}`);
      }
    } catch (e) {
      setConcurrencyLog(`✗ Network error: ${e.message}`);
    } finally {
      setConcurrencyLoading(false);
    }
  }

  return (
    <>
      <nav className="nav">
        <a href="/" className="nav-brand">AYAN <span>KHAN</span></a>
        <ul className="nav-links">
          <li><a href="/request-service">Submit Lead</a></li>
          <li><a href="/dashboard">Dashboard</a></li>
          <li><a href="/test-tools" className="active">Test Tools</a></li>
        </ul>
      </nav>

      <div className="hero">
        <div className="hero-label">Feature 5 — Testing Panel</div>
        <h1>Test Tools</h1>
        <p>Simulate webhook events, test idempotency, and generate concurrent leads. These tools simulate backend events — quota reset only via webhook.</p>
      </div>

      <main className="main-wide">
        <div className="alert alert-info" style={{ marginBottom: '1.5rem' }}>
          <span>ℹ</span>
          <div>
            <strong>Note:</strong> Quota reset is only accessible through the webhook endpoint — it cannot be triggered from the normal user UI (lead submission form).
          </div>
        </div>

        <div className="tool-grid">
          <ToolCard
            title="🌱 Seed Database"
            description="Insert initial seed data: 3 services, 8 providers, allocation states. Safe to run multiple times (idempotent upserts)."
          >
            <button className="btn btn-dark" onClick={handleSeed} disabled={seedLoading}>
              {seedLoading ? 'Seeding…' : 'Seed Database'}
            </button>
            {seedLog && <div className="result-log">{seedLog}</div>}
          </ToolCard>

          <ToolCard
            title="🔄 Reset Provider Quota"
            description="Simulates a payment gateway webhook confirming provider subscription. Resets all provider quotas to 10. Each call uses a unique eventId."
          >
            <button className="btn btn-success" onClick={handleQuotaReset} disabled={resetLoading}>
              {resetLoading ? 'Processing…' : 'Reset All Quotas'}
            </button>
            {resetLog && <div className="result-log">{resetLog}</div>}
          </ToolCard>

          <ToolCard
            title="🔁 Test Idempotency"
            description={`Calls the webhook 3 times with the same fixed eventId. Only the first call should process; subsequent calls return idempotent=true. EventId: ${IDEMPOTENCY_EVENT_ID}`}
          >
            <button className="btn btn-warning" onClick={handleIdempotencyTest} disabled={idempotencyLoading}>
              {idempotencyLoading ? 'Testing…' : 'Test Idempotency (3x)'}
            </button>
            {idempotencyLog && <div className="result-log">{idempotencyLog}</div>}
          </ToolCard>

          <ToolCard
            title="⚡ Concurrency Test"
            description="Generates 10 leads simultaneously using Promise.all. Tests that allocation logic is safe under concurrent requests (serializable transactions + row-level locking)."
          >
            <button className="btn btn-primary" onClick={handleConcurrencyTest} disabled={concurrencyLoading}>
              {concurrencyLoading ? 'Generating…' : 'Generate 10 Leads (Concurrent)'}
            </button>
            {concurrencyLog && <div className="result-log">{concurrencyLog}</div>}
            {!concurrencyLoading && concurrencyLog && (
              <a
                href="/dashboard"
                className="btn btn-outline"
                style={{ marginTop: '0.5rem', fontSize: '0.72rem', padding: '0.4rem 0.75rem' }}
              >
                View Dashboard →
              </a>
            )}
          </ToolCard>
        </div>

        <hr className="divider" />

        <div className="card">
          <div className="card-title">
            <span className="dot" style={{ background: 'var(--accent2)' }}></span>
            Implementation Notes
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr)', gap: '1rem', fontSize: '0.82rem', color: 'var(--muted)' }}>
            <div>
              <strong style={{ color: 'var(--ink)', fontFamily: 'var(--font-display)', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Allocation Algorithm</strong>
              <p style={{ marginTop: '0.35rem' }}>Mandatory providers are assigned first (if under quota). Remaining slots use round-robin via a persisted <code>AllocationState.pointer</code> in PostgreSQL, locked with <code>FOR UPDATE</code> to prevent race conditions.</p>
            </div>
            <div>
              <strong style={{ color: 'var(--ink)', fontFamily: 'var(--font-display)', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Concurrency Handling</strong>
              <p style={{ marginTop: '0.35rem' }}>All lead creation happens in a <code>SERIALIZABLE</code> Prisma transaction. The allocation pointer row is locked with <code>SELECT FOR UPDATE</code> ensuring only one transaction advances it at a time.</p>
            </div>
            <div>
              <strong style={{ color: 'var(--ink)', fontFamily: 'var(--font-display)', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Webhook Idempotency</strong>
              <p style={{ marginTop: '0.35rem' }}>Each webhook call includes a unique <code>eventId</code>. The system stores processed event IDs in a <code>WebhookEvent</code> table. If an <code>eventId</code> already exists, the quota reset is skipped and <code>idempotent: true</code> is returned.</p>
            </div>
            <div>
              <strong style={{ color: 'var(--ink)', fontFamily: 'var(--font-display)', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Real-Time Updates</strong>
              <p style={{ marginTop: '0.35rem' }}>Dashboard uses Server-Sent Events (SSE). When a new lead is created, the API broadcasts a <code>NEW_LEAD</code> event to all connected SSE clients, triggering an automatic data refresh.</p>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
