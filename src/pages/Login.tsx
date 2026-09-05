// ============================================================
// MineSafe AI — Authentication Portal (Login & Registration)
// ============================================================

import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Shield, Lock, User as UserIcon, AlertCircle, ArrowRight, Activity, Radio, Cpu, UserPlus, CheckCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { config } from '../config';

interface LoginProps {
  initialMode?: 'login' | 'register';
}

export function LoginPage({ initialMode }: LoginProps) {
  const { login, register } = useApp();
  const navigate = useNavigate();
  const location = useLocation();

  // Mode: 'login' or 'register'
  const isRegisterRoute = location.pathname === '/register' || initialMode === 'register';
  const [mode, setMode] = useState<'login' | 'register'>(isRegisterRoute ? 'register' : 'login');

  // Login Form States
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('minesafe2026');
  const [rememberMe, setRememberMe] = useState(true);

  // Register Form States
  const [regFullName, setRegFullName] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regRole, setRegRole] = useState('Safety Officer');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');

  // Status & Feedback
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (location.pathname === '/register') {
      setMode('register');
    } else if (location.pathname === '/login') {
      setMode('login');
    }
  }, [location.pathname]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    try {
      const success = await login(username, password);
      if (success) {
        navigate('/dashboard');
      } else {
        setError('Invalid username or password. Please verify credentials.');
        setLoading(false);
      }
    } catch {
      setError('Authentication error. Unable to connect to MineSafe backend.');
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!regFullName.trim()) {
      setError('Please enter your full official name.');
      return;
    }
    if (!regUsername.trim()) {
      setError('Please enter a desired username/ID.');
      return;
    }
    if (regPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (regPassword !== regConfirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      await register({
        name: regFullName.trim(),
        username: regUsername.trim(),
        password: regPassword,
        role: regRole,
      });
      setSuccessMsg('Account registered successfully! Redirecting...');
      setTimeout(() => {
        navigate('/dashboard');
      }, 600);
    } catch (err: unknown) {
      const apiErr = err as { response?: { data?: { detail?: string } }; message?: string };
      const detail = apiErr.response?.data?.detail || apiErr.message || 'Registration failed. Check server connection.';
      setError(detail);
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

      {/* Right Form Panel */}
      <div style={{
        flex: '1 1 50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px',
      }}>
        <div style={{ width: '100%', maxWidth: 440 }}>
          {/* Top Auth Mode Tabs */}
          <div style={{
            display: 'flex',
            background: '#F1F5F9',
            borderRadius: 'var(--r-md)',
            padding: 4,
            marginBottom: 28,
          }}>
            <button
              type="button"
              onClick={() => { setMode('login'); setError(''); setSuccessMsg(''); }}
              style={{
                flex: 1,
                padding: '8px 16px',
                border: 'none',
                borderRadius: 'var(--r-sm)',
                background: mode === 'login' ? '#FFFFFF' : 'transparent',
                color: mode === 'login' ? 'var(--primary)' : 'var(--text-secondary)',
                fontWeight: mode === 'login' ? 700 : 500,
                fontSize: '0.875rem',
                boxShadow: mode === 'login' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setMode('register'); setError(''); setSuccessMsg(''); }}
              style={{
                flex: 1,
                padding: '8px 16px',
                border: 'none',
                borderRadius: 'var(--r-sm)',
                background: mode === 'register' ? '#FFFFFF' : 'transparent',
                color: mode === 'register' ? 'var(--primary)' : 'var(--text-secondary)',
                fontWeight: mode === 'register' ? 700 : 500,
                fontSize: '0.875rem',
                boxShadow: mode === 'register' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              Create Account
            </button>
          </div>

          <div style={{ marginBottom: 24 }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 6 }}>
              {mode === 'login' ? 'Sign In to Portal' : 'Register Safety Officer Profile'}
            </h2>
            <p className="text-sm text-secondary">
              {mode === 'login'
                ? 'Authorized access for Mine Safety Officers, Geotechnical Engineers & Regulators'
                : 'Create credentials to access live subsidence telemetry and alert controls'}
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
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div style={{
              background: 'var(--normal-bg)',
              border: '1px solid var(--normal-light)',
              borderRadius: 'var(--r-md)',
              padding: '10px 14px',
              color: 'var(--normal)',
              fontSize: '0.8125rem',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 20,
            }}>
              <CheckCircle size={16} style={{ flexShrink: 0 }} />
              <span>{successMsg}</span>
            </div>
          )}

          {mode === 'login' ? (
            /* --- LOGIN FORM --- */
            <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
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
          ) : (
            /* --- REGISTER FORM --- */
            <form onSubmit={handleRegisterSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="form-group">
                <label className="form-label">Full Name & Title</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    className="form-input"
                    style={{ width: '100%', paddingLeft: 36 }}
                    value={regFullName}
                    onChange={e => setRegFullName(e.target.value)}
                    placeholder="e.g. Dr. Rajesh Sharma"
                    required
                  />
                  <UserIcon size={16} color="var(--text-muted)" style={{ position: 'absolute', left: 12, top: 11 }} />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Desired Username / Official ID</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    className="form-input"
                    style={{ width: '100%', paddingLeft: 36 }}
                    value={regUsername}
                    onChange={e => setRegUsername(e.target.value)}
                    placeholder="e.g. rsharma"
                    required
                  />
                  <UserPlus size={16} color="var(--text-muted)" style={{ position: 'absolute', left: 12, top: 11 }} />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Official Role</label>
                <select
                  className="form-select"
                  value={regRole}
                  onChange={e => setRegRole(e.target.value)}
                  style={{ width: '100%' }}
                >
                  <option value="Safety Officer">Safety Officer</option>
                  <option value="Geotechnical Engineer">Geotechnical Engineer</option>
                  <option value="Mine Manager">Mine Manager</option>
                  <option value="GIS Analyst">GIS / Subsidence Analyst</option>
                  <option value="DGMS Inspector">DGMS Inspector / Regulator</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Security Password (min 6 chars)</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="password"
                    className="form-input"
                    style={{ width: '100%', paddingLeft: 36 }}
                    value={regPassword}
                    onChange={e => setRegPassword(e.target.value)}
                    placeholder="••••••••••••"
                    required
                  />
                  <Lock size={16} color="var(--text-muted)" style={{ position: 'absolute', left: 12, top: 11 }} />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Confirm Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="password"
                    className="form-input"
                    style={{ width: '100%', paddingLeft: 36 }}
                    value={regConfirmPassword}
                    onChange={e => setRegConfirmPassword(e.target.value)}
                    placeholder="••••••••••••"
                    required
                  />
                  <Lock size={16} color="var(--text-muted)" style={{ position: 'absolute', left: 12, top: 11 }} />
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                style={{ padding: '12px', justifyContent: 'center', marginTop: 8 }}
                disabled={loading}
              >
                {loading ? 'Creating Account...' : (
                  <>
                    <span>Register Account & Enter Dashboard</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Credentials Box for Quick Reference in Login mode */}
          {mode === 'login' && (
            <div style={{
              marginTop: 24,
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--r-md)',
              padding: '12px 14px',
            }}>
              <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
                <span className="text-xs" style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>
                  SAMPLE ROLE CREDENTIALS:
                </span>
                <span className="text-xs text-muted" style={{ fontSize: '0.7rem' }}>Click to autofill</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                {[
                  { role: 'Safety Officer', user: 'admin', pass: 'minesafe2026' },
                  { role: 'Geotech Engineer', user: 'geotech', pass: 'minesafe2026' },
                  { role: 'Mine Manager', user: 'manager', pass: 'minesafe2026' },
                  { role: 'DGMS Inspector', user: 'inspector', pass: 'minesafe2026' },
                ].map(c => (
                  <button
                    key={c.user}
                    type="button"
                    onClick={() => { setUsername(c.user); setPassword(c.pass); setError(''); }}
                    style={{
                      background: username === c.user ? 'var(--primary-bg, #EFF6FF)' : '#FFFFFF',
                      border: `1px solid ${username === c.user ? 'var(--primary)' : 'var(--border)'}`,
                      borderRadius: 'var(--r-sm)',
                      padding: '6px 8px',
                      textAlign: 'left',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 2,
                    }}
                  >
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: username === c.user ? 'var(--primary)' : 'var(--text-primary)' }}>
                      {c.role}
                    </span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      ID: <code>{c.user}</code>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Bottom Switcher */}
          <div style={{ marginTop: 20, textAlign: 'center' }}>
            {mode === 'login' ? (
              <span className="text-xs text-secondary">
                Don't have an account yet?{' '}
                <button
                  type="button"
                  onClick={() => { setMode('register'); setError(''); setSuccessMsg(''); }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--primary)',
                    fontWeight: 700,
                    cursor: 'pointer',
                    textDecoration: 'underline',
                  }}
                >
                  Create Account
                </button>
              </span>
            ) : (
              <span className="text-xs text-secondary">
                Already registered?{' '}
                <button
                  type="button"
                  onClick={() => { setMode('login'); setError(''); setSuccessMsg(''); }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--primary)',
                    fontWeight: 700,
                    cursor: 'pointer',
                    textDecoration: 'underline',
                  }}
                >
                  Sign In here
                </button>
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
