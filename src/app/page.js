import Link from 'next/link';

export default function HomePage() {
  return (
    <>
      <nav className="nav">
        <a href="/" className="nav-brand">AYAN <span>KHAN</span></a>
        <ul className="nav-links">
          <li><a href="/request-service">Submit Lead</a></li>
          <li><a href="/dashboard">Dashboard</a></li>
          <li><a href="/test-tools">Test Tools</a></li>
        </ul>
      </nav>

      <div className="hero">
        <div className="hero-label">Prowider — Lead Distribution System</div>
        <h1>AYAN KHAN</h1>
        <p>Full Stack Developer Assignment — Mini Lead Distribution Platform with fair allocation, real-time updates, and webhook idempotency.</p>
      </div>

      <main className="main">
        <div className="section-tag">Features</div>
        <p style={{ color: 'var(--muted)', fontSize: '0.875rem', maxWidth: '560px' }}>
          A complete lead generation and distribution system. Customers submit service enquiries;
          the system allocates them to providers using mandatory + round-robin fair distribution.
        </p>

        <div className="home-grid">
          <a href="/request-service" className="home-link-card">
            <div className="icon">📝</div>
            <h3>Request Service</h3>
            <p>Customer form to submit a new service enquiry. Duplicate check enforced at DB level.</p>
          </a>
          <a href="/dashboard" className="home-link-card">
            <div className="icon">📊</div>
            <h3>Provider Dashboard</h3>
            <p>Live view of all 8 providers — quota, leads received, and assigned leads. Updates in real time via SSE.</p>
          </a>
          <a href="/test-tools" className="home-link-card">
            <div className="icon">🧪</div>
            <h3>Test Tools</h3>
            <p>Simulate webhook quota reset, test idempotency, and generate 10 concurrent leads.</p>
          </a>
        </div>

        <hr className="divider" />

        <div className="section-tag">Allocation Rules</div>
        <div className="card" style={{ marginTop: '0.75rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr)', gap: '1rem' }}>
            {[
              { service: 'Service 1', mandatory: 'Provider 1', pool: 'Pool: 2, 3, 4' },
              { service: 'Service 2', mandatory: 'Provider 5', pool: 'Pool: 6, 7, 8' },
              { service: 'Service 3', mandatory: 'Provider 1 + 4', pool: 'Pool: 2, 3, 5, 6, 7, 8' },
            ].map((r) => (
              <div key={r.service} style={{ padding: '0.75rem', background: 'var(--paper)', borderRadius: '6px' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.8rem', marginBottom: '0.3rem' }}>{r.service}</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--accent)', fontWeight: 600 }}>Mandatory: {r.mandatory}</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>{r.pool}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: '0.25rem' }}>Total: 3 providers per lead</div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </>
  );
}
