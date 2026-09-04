// ============================================================
// MineSafe AI — Login Page (Screen 0)
// ============================================================

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Lock, User as UserIcon, AlertCircle, ArrowRight, Activity, Radio, Cpu } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { config } from '../config';

export function LoginPage() {
  const { login } = useApp();
  const navigate = useNavigate();

  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('minesafe2026');
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const success = await login(username, password);
      if (success) {
        navigate('/dashboard');
      } else {
        setError('Invalid username or password. Please verify backend credentials.');
        setLoading(false);
      }
    } catch {
      setError('Authentication error. Unable to connect to MineSafe backend.');
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      background: '#F8FAFC',
      color: '#111827',
      fontFamily: 'var(--font-sans)',
    }}>
      {/* Left Branding Panel */}
      <div style={{
        flex: '1 1 50%',
        background: 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)',
        color: 'white',
        padding: '60px 48px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Ambient Grid overlay */}
        <div style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
          opacity: 0.5,
        }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div className="flex items-center gap-sm" style={{ marginBottom: 32 }}>
            <div style={{
              background: 'var(--primary)',
              width: 38,
              height: 38,
              borderRadius: 'var(--r-md)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Shield size={22} color="white" />
            </div>
            <div>
              <span style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
                {config.app.name}
              </span>
              <div className="text-xs" style={{ color: '#94A3B8' }}>Autonomous Geotechnical Safety Platform</div>
            </div>
          </div>

          <div style={{ maxWidth: 480 }}>
            <h1 style={{ fontSize: '2.2rem', fontWeight: 800, lineHeight: 1.2, color: 'white', marginBottom: 16 }}>
              Real-Time Mine Subsidence Intelligence & Early Warning
            </h1>
            <p style={{ fontSize: '0.9375rem', color: '#94A3B8', lineHeight: 1.6, marginBottom: 28 }}>
              Monitor surface deformation in underground coal mines with low-cost ESP32 wireless sensor nodes,
              identify abnormal multi-indicator patterns, predict subsidence risk with AI, and support rapid safety decisions.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="flex items-center gap-sm text-sm" style={{ color: '#E2E8F0' }}>
                <div style={{ background: 'rgba(37,99,235,0.2)', padding: 6, borderRadius: 'var(--r-sm)' }}>
                  <Cpu size={16} color="#60A5FA" />
                </div>
                <span>ESP32 5-Indicator Sensor Array (Tilt, Displacement, Vibration, Crack, Rel. Movement)</span>
              </div>
              <div className="flex items-center gap-sm text-sm" style={{ color: '#E2E8F0' }}>
                <div style={{ background: 'rgba(124,58,237,0.2)', padding: 6, borderRadius: 'var(--r-sm)' }}>
                  <Activity size={16} color="#A78BFA" />
                </div>
                <span>Location-Specific Multi-Threshold Evaluation (L0 Normal to L3 Critical)</span>
              </div>
              <div className="flex items-center gap-sm text-sm" style={{ color: '#E2E8F0' }}>
                <div style={{ background: 'rgba(16,185,129,0.2)', padding: 6, borderRadius: 'var(--r-sm)' }}>
                  <Radio size={16} color="#34D399" />
                </div>
                <span>Real-Time GIS & Satellite Imagery Integration with Safe Zone Routing</span>
              </div>
            </div>
          </div>
        </div>

        <div style={{ position: 'relative', zIndex: 1, paddingTop: 32, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <div className="text-xs" style={{ color: '#64748B' }}>
            Prototype Demonstration Site — Jharkhand, India &bull; Compliant with DGMS Safety Intelligence Guidelines
          </div>
        </div>
      </div>

      {/* Right Login Form */}
      <div style={{
        flex: '1 1 50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px',
      }}>
        <div style={{ width: '100%', maxWidth: 400 }}>
          <div style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 6 }}>Sign In to Portal</h2>
            <p className="text-sm text-secondary">
              Authorized access for Mine Safety Officers, Geotechnical Engineers & Regulators
            </p>
          </div>

          {error && (
            <div style={{
              background: 'var(--critical-bg)',
              border: '1px solid var(--critical-light)',
              borderRadius: 'var(--r-md)',
              padding: '10px 14px',
              color: 'var(--critical)',
              fontSize: '0.8125rem',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 20,
            }}>
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="form-group">
              <label className="form-label">Username / Official ID</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  className="form-input"
                  style={{ width: '100%', paddingLeft: 36 }}
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="e.g. admin"
                  required
                />
                <UserIcon size={16} color="var(--text-muted)" style={{ position: 'absolute', left: 12, top: 11 }} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Security Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="password"
                  className="form-input"
                  style={{ width: '100%', paddingLeft: 36 }}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                />
                <Lock size={16} color="var(--text-muted)" style={{ position: 'absolute', left: 12, top: 11 }} />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="form-checkbox">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={e => setRememberMe(e.target.checked)}
                />
                <span className="text-xs text-secondary">Remember this session</span>
              </label>
              <span className="text-xs text-muted">Backend Integrated</span>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ padding: '12px', justifyContent: 'center', marginTop: 8 }}
              disabled={loading}
            >
              {loading ? 'Authenticating...' : (
                <>
                  <span>Sign In to Safety Dashboard</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {/* Credentials Box */}
          <div style={{
            marginTop: 32,
            background: 'var(--bg)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--r-md)',
            padding: '12px 14px',
          }}>
            <div className="text-xs" style={{ fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 4 }}>
              DEMO BACKEND CREDENTIALS:
            </div>
            <div className="text-xs text-muted" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Username: <code>{config.auth.demoUsername}</code></span>
              <span>Password: <code>{config.auth.demoPassword}</code></span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
