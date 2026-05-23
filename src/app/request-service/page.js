'use client';

import { useState, useEffect } from 'react';

export default function RequestServicePage() {
  const [services, setServices] = useState([]);
  const [form, setForm] = useState({ name: '', phone: '', city: '', serviceId: '', description: '' });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/services')
      .then((r) => r.json())
      .then(setServices)
      .catch(() => {});
  }, []);

  const handleChange = (e) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    setError('');
    setResult(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setResult(null);

    if (!form.name || !form.phone || !form.city || !form.serviceId || !form.description) {
      setError('All fields are required.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, serviceId: Number(form.serviceId) }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Something went wrong.');
      } else {
        setResult(data);
        setForm({ name: '', phone: '', city: '', serviceId: '', description: '' });
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <nav className="nav">
        <a href="/" className="nav-brand">AYAN <span>KHAN</span></a>
        <ul className="nav-links">
          <li><a href="/request-service" className="active">Submit Lead</a></li>
          <li><a href="/dashboard">Dashboard</a></li>
          <li><a href="/test-tools">Test Tools</a></li>
        </ul>
      </nav>

      <div className="hero">
        <div className="hero-label">Feature 1 — Customer Enquiry</div>
        <h1>Request a Service</h1>
        <p>Submit your service enquiry. Our system will automatically match you with the right providers.</p>
      </div>

      <main className="main">
        <div className="card">
          <div className="card-title">
            <span className="dot"></span>
            New Lead Submission
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="name">Full Name</label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  placeholder="Enter your full name"
                  value={form.name}
                  onChange={handleChange}
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label htmlFor="phone">Phone Number</label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  placeholder="e.g. 9999999999"
                  value={form.phone}
                  onChange={handleChange}
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label htmlFor="city">City</label>
                <input
                  id="city"
                  name="city"
                  type="text"
                  placeholder="Your city"
                  value={form.city}
                  onChange={handleChange}
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label htmlFor="serviceId">Service Type</label>
                <select
                  id="serviceId"
                  name="serviceId"
                  value={form.serviceId}
                  onChange={handleChange}
                  disabled={loading}
                >
                  <option value="">Select a service</option>
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group full">
                <label htmlFor="description">Description</label>
                <textarea
                  id="description"
                  name="description"
                  placeholder="Describe your requirements..."
                  value={form.description}
                  onChange={handleChange}
                  disabled={loading}
                />
              </div>
            </div>

            <div style={{ marginTop: '1.25rem', display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? (
                  <>
                    <span className="spinner" style={{ width: 14, height: 14, marginRight: 0 }}></span>
                    Submitting…
                  </>
                ) : (
                  'Submit Enquiry'
                )}
              </button>
              <a href="/dashboard" className="btn btn-outline">View Dashboard</a>
            </div>
          </form>

          {error && (
            <div className="alert alert-error">
              <span>⚠</span>
              <span>{error}</span>
            </div>
          )}

          {result && (
            <div className="alert alert-success">
              <span>✓</span>
              <div>
                <strong>Lead submitted successfully!</strong>
                <div style={{ fontSize: '0.8rem', marginTop: '0.2rem' }}>
                  Lead #{result.leadId} assigned to {result.assignedProviders} provider(s).
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="card" style={{ marginTop: '1.25rem' }}>
          <div className="card-title" style={{ marginBottom: '0.75rem', paddingBottom: '0.75rem' }}>
            <span className="dot" style={{ background: 'var(--accent2)' }}></span>
            Duplicate Prevention Rule
          </div>
          <p style={{ fontSize: '0.82rem', color: 'var(--muted)', lineHeight: 1.6 }}>
            The same phone number <strong style={{ color: 'var(--ink)' }}>cannot</strong> submit a lead for the same service twice.
            However, the same phone number <strong style={{ color: 'var(--ink)' }}>can</strong> submit leads for different services.
            This is enforced at the database level via a unique constraint on <code style={{ fontSize: '0.78rem', background: 'var(--paper)', padding: '0.1rem 0.3rem', borderRadius: 3 }}>(phone, serviceId)</code>.
          </p>
        </div>
      </main>
    </>
  );
}
