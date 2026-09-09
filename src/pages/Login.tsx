// ============================================================
// Khanraksh — Authentication Portal (Login & Registration)
// ============================================================

import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Lock, User as UserIcon, AlertCircle, ArrowRight, Activity, Radio, Cpu, UserPlus, CheckCircle, Eye, EyeOff } from 'lucide-react';
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
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Register Form States
  const [regFullName, setRegFullName] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showRegConfirmPassword, setShowRegConfirmPassword] = useState(false);

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
      setError('Authentication error. Unable to connect to backend.');
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
        role: 'DGMS Inspector',
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
      background: 'var(--bg)',
      color: 'var(--text-primary)',
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
            <img src="/logo.png" alt="MINESAFE AI" style={{ width: 44, height: 44, objectFit: 'contain', filter: 'invert(1)' }} />
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
            Compliant with DGMS Safety Intelligence Guidelines
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
            background: 'var(--card-hover)',
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
                background: mode === 'login' ? 'var(--card)' : 'transparent',
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
                background: mode === 'register' ? 'var(--card)' : 'transparent',
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
              {mode === 'login' ? 'Sign In to Portal' : 'Register DGMS Inspector Profile'}
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
              background: 'var(--success-bg)',
              border: '1px solid var(--success-light)',
              borderRadius: 'var(--r-md)',
              padding: '10px 14px',
              color: 'var(--success)',
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
                    placeholder="Enter your username"
                    required
                  />
                  <UserIcon size={16} color="var(--text-muted)" style={{ position: 'absolute', left: 12, top: 11 }} />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Security Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showLoginPassword ? 'text' : 'password'}
                    className="form-input"
                    style={{ width: '100%', paddingLeft: 36, paddingRight: 40 }}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    required
                  />
                  <Lock size={16} color="var(--text-muted)" style={{ position: 'absolute', left: 12, top: 11 }} />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    style={{
                      position: 'absolute',
                      right: 8,
                      top: 6,
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: 4,
                      borderRadius: 'var(--r-sm)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    aria-label={showLoginPassword ? 'Hide password' : 'Show password'}
                    title={showLoginPassword ? 'Hide password' : 'Show password'}
                  >
                    {showLoginPassword
                      ? <EyeOff size={16} color="var(--text-muted)" />
                      : <Eye size={16} color="var(--text-muted)" />
                    }
                  </button>
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
                <label className="form-label">Security Password (min 6 chars)</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showRegPassword ? 'text' : 'password'}
                    className="form-input"
                    style={{ width: '100%', paddingLeft: 36, paddingRight: 40 }}
                    value={regPassword}
                    onChange={e => setRegPassword(e.target.value)}
                    placeholder="••••••••••••"
                    required
                  />
                  <Lock size={16} color="var(--text-muted)" style={{ position: 'absolute', left: 12, top: 11 }} />
                  <button
                    type="button"
                    onClick={() => setShowRegPassword(!showRegPassword)}
                    style={{
                      position: 'absolute',
                      right: 8,
                      top: 6,
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: 4,
                      borderRadius: 'var(--r-sm)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    aria-label={showRegPassword ? 'Hide password' : 'Show password'}
                    title={showRegPassword ? 'Hide password' : 'Show password'}
                  >
                    {showRegPassword
                      ? <EyeOff size={16} color="var(--text-muted)" />
                      : <Eye size={16} color="var(--text-muted)" />
                    }
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Confirm Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showRegConfirmPassword ? 'text' : 'password'}
                    className="form-input"
                    style={{ width: '100%', paddingLeft: 36, paddingRight: 40 }}
                    value={regConfirmPassword}
                    onChange={e => setRegConfirmPassword(e.target.value)}
                    placeholder="••••••••••••"
                    required
                  />
                  <Lock size={16} color="var(--text-muted)" style={{ position: 'absolute', left: 12, top: 11 }} />
                  <button
                    type="button"
                    onClick={() => setShowRegConfirmPassword(!showRegConfirmPassword)}
                    style={{
                      position: 'absolute',
                      right: 8,
                      top: 6,
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: 4,
                      borderRadius: 'var(--r-sm)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    aria-label={showRegConfirmPassword ? 'Hide password' : 'Show password'}
                    title={showRegConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showRegConfirmPassword
                      ? <EyeOff size={16} color="var(--text-muted)" />
                      : <Eye size={16} color="var(--text-muted)" />
                    }
                  </button>
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
