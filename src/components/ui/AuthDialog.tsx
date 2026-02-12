import { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
import { X, Mail, Lock, Github, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';
import { useModelStore } from '../../store/useModelStore';

interface AuthDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthDialog = ({ isOpen, onClose }: AuthDialogProps) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [mounted, setMounted] = useState(false);
  const colorMode = useModelStore(state => state.colorMode);

  useEffect(() => {
    if (isOpen) {
      setMounted(true);
      // Reset form when dialog opens
      setError(null);
      setSuccess(null);
    } else {
      setTimeout(() => setMounted(false), 200); // Wait for exit animation
    }
  }, [isOpen]);

  if (!isOpen && !mounted) return null;

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    // Basic validation
    if (!email || !password) {
      setError('Please fill in all fields');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        setSuccess('Successfully signed in!');
        setTimeout(() => onClose(), 1000);
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        setSuccess('Account created! Check your email to confirm.');
        setTimeout(() => {
          setEmail('');
          setPassword('');
          setIsLogin(true);
        }, 2000);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthSignIn = async (provider: 'google' | 'github') => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: window.location.origin,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '16px',
        animation: isOpen ? 'fadeIn 0.2s ease-out' : 'fadeOut 0.15s ease-in',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: colorMode === 'dark' 
            ? 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)' 
            : 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
          borderRadius: '12px',
          maxWidth: '380px',
          width: '100%',
          boxShadow: colorMode === 'dark'
            ? '0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(59, 130, 246, 0.1)'
            : '0 25px 50px -12px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(226, 232, 240, 0.8)',
          border: colorMode === 'dark' ? '1px solid #334155' : '1px solid #e2e8f0',
          overflow: 'hidden',
          animation: isOpen ? 'slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)' : 'slideDown 0.2s ease-in',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Decorative top bar */}
        <div style={{
          height: '4px',
          background: 'linear-gradient(90deg, #3b82f6 0%, #8b5cf6 50%, #ec4899 100%)',
        }} />

        {/* Header */}
        <div
          style={{
            padding: '18px 20px 16px',
            borderBottom: colorMode === 'dark' ? '1px solid rgba(51, 65, 85, 0.5)' : '1px solid rgba(226, 232, 240, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'relative',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
            }}>
              <Sparkles size={16} color="white" />
            </div>
            <div>
              <h2
                style={{
                  margin: 0,
                  fontSize: '17px',
                  fontWeight: 700,
                  background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  letterSpacing: '-0.02em',
                }}
              >
                {isLogin ? 'Welcome Back' : 'Join SQLModel'}
              </h2>
              <p style={{
                margin: '2px 0 0 0',
                fontSize: '11px',
                color: colorMode === 'dark' ? '#94a3b8' : '#64748b',
                fontWeight: 400,
              }}>
                {isLogin ? 'Sign in to your account' : 'Create your free account'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            style={{
              background: colorMode === 'dark' ? 'rgba(51, 65, 85, 0.5)' : 'rgba(226, 232, 240, 0.6)',
              border: 'none',
              padding: '10px',
              cursor: 'pointer',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: colorMode === 'dark' ? '#94a3b8' : '#64748b',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = colorMode === 'dark' ? 'rgba(51, 65, 85, 0.8)' : 'rgba(226, 232, 240, 1)';
              e.currentTarget.style.transform = 'rotate(90deg)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = colorMode === 'dark' ? 'rgba(51, 65, 85, 0.5)' : 'rgba(226, 232, 240, 0.6)';
              e.currentTarget.style.transform = 'rotate(0deg)';
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px' }}>
          {/* Success/Error Messages */}
          {(error || success) && (
            <div style={{
              marginBottom: '16px',
              padding: '10px 12px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              background: error 
                ? (colorMode === 'dark' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(254, 226, 226, 0.8)')
                : (colorMode === 'dark' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(220, 252, 231, 0.8)'),
              border: error
                ? (colorMode === 'dark' ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(220, 38, 38, 0.2)')
                : (colorMode === 'dark' ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid rgba(21, 128, 61, 0.2)'),
              animation: 'slideInDown 0.3s ease-out',
            }}>
              {error ? <AlertCircle size={16} color="#ef4444" /> : <CheckCircle2 size={16} color="#22c55e" />}
              <p style={{
                margin: 0,
                fontSize: '12px',
                lineHeight: '1.5',
                color: error 
                  ? (colorMode === 'dark' ? '#fca5a5' : '#dc2626')
                  : (colorMode === 'dark' ? '#86efac' : '#15803d'),
                fontWeight: 500,
              }}>
                {error || success}
              </p>
            </div>
          )}

          {/* OAuth Buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '18px' }}>
            <button
              onClick={() => handleOAuthSignIn('google')}
              disabled={loading}
              aria-label="Sign in with Google"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                padding: '10px 14px',
                border: colorMode === 'dark' ? '1.5px solid rgba(51, 65, 85, 0.6)' : '1.5px solid #e2e8f0',
                borderRadius: '8px',
                background: colorMode === 'dark' ? 'rgba(15, 23, 42, 0.5)' : '#ffffff',
                color: colorMode === 'dark' ? '#f1f5f9' : '#1e293b',
                fontSize: '13px',
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                opacity: loading ? 0.6 : 1,
                boxShadow: colorMode === 'dark' 
                  ? '0 2px 8px rgba(0, 0, 0, 0.3)'
                  : '0 1px 3px rgba(0, 0, 0, 0.05)',
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.currentTarget.style.background = colorMode === 'dark' ? 'rgba(30, 41, 59, 0.8)' : '#f8fafc';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = colorMode === 'dark' 
                    ? '0 4px 12px rgba(0, 0, 0, 0.4)'
                    : '0 4px 12px rgba(0, 0, 0, 0.08)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = colorMode === 'dark' ? 'rgba(15, 23, 42, 0.5)' : '#ffffff';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = colorMode === 'dark' 
                  ? '0 2px 8px rgba(0, 0, 0, 0.3)'
                  : '0 1px 3px rgba(0, 0, 0, 0.05)';
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Continue with Google
            </button>

            <button
              onClick={() => handleOAuthSignIn('github')}
              disabled={loading}
              aria-label="Sign in with GitHub"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                padding: '10px 14px',
                border: colorMode === 'dark' ? '1.5px solid rgba(51, 65, 85, 0.6)' : '1.5px solid #e2e8f0',
                borderRadius: '8px',
                background: colorMode === 'dark' ? 'rgba(15, 23, 42, 0.5)' : '#ffffff',
                color: colorMode === 'dark' ? '#f1f5f9' : '#1e293b',
                fontSize: '13px',
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                opacity: loading ? 0.6 : 1,
                boxShadow: colorMode === 'dark' 
                  ? '0 2px 8px rgba(0, 0, 0, 0.3)'
                  : '0 1px 3px rgba(0, 0, 0, 0.05)',
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.currentTarget.style.background = colorMode === 'dark' ? 'rgba(30, 41, 59, 0.8)' : '#f8fafc';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = colorMode === 'dark' 
                    ? '0 4px 12px rgba(0, 0, 0, 0.4)'
                    : '0 4px 12px rgba(0, 0, 0, 0.08)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = colorMode === 'dark' ? 'rgba(15, 23, 42, 0.5)' : '#ffffff';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = colorMode === 'dark' 
                  ? '0 2px 8px rgba(0, 0, 0, 0.3)'
                  : '0 1px 3px rgba(0, 0, 0, 0.05)';
              }}
            >
              <Github size={20} />
              Continue with GitHub
            </button>
          </div>

          {/* Divider */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '18px',
            }}
          >
            <div
              style={{
                flex: 1,
                height: '1px',
                background: colorMode === 'dark' 
                  ? 'linear-gradient(90deg, transparent 0%, rgba(51, 65, 85, 0.6) 50%, transparent 100%)'
                  : 'linear-gradient(90deg, transparent 0%, rgba(226, 232, 240, 0.8) 50%, transparent 100%)',
              }}
            />
            <span
              style={{
                color: colorMode === 'dark' ? '#64748b' : '#94a3b8',
                fontSize: '11px',
                fontWeight: 600,
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
              }}
            >
              or
            </span>
            <div
              style={{
                flex: 1,
                height: '1px',
                background: colorMode === 'dark' 
                  ? 'linear-gradient(90deg, transparent 0%, rgba(51, 65, 85, 0.6) 50%, transparent 100%)'
                  : 'linear-gradient(90deg, transparent 0%, rgba(226, 232, 240, 0.8) 50%, transparent 100%)',
              }}
            />
          </div>

          {/* Email/Password Form */}
          <form onSubmit={handleEmailAuth} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label
                htmlFor="email-input"
                style={{
                  display: 'block',
                  marginBottom: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: colorMode === 'dark' ? '#cbd5e1' : '#475569',
                  letterSpacing: '-0.01em',
                }}
              >
                Email Address
              </label>
              <div style={{ position: 'relative' }}>
                <Mail
                  size={16}
                  style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: emailFocused 
                      ? '#3b82f6'
                      : (colorMode === 'dark' ? '#64748b' : '#94a3b8'),
                    transition: 'color 0.2s',
                    pointerEvents: 'none',
                  }}
                />
                <input
                  id="email-input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setEmailFocused(true)}
                  onBlur={() => setEmailFocused(false)}
                  required
                  disabled={loading}
                  placeholder="you@example.com"
                  autoComplete="email"
                  style={{
                    width: '100%',
                    padding: '10px 12px 10px 38px',
                    border: emailFocused
                      ? '2px solid #3b82f6'
                      : error
                      ? `2px solid ${colorMode === 'dark' ? '#ef4444' : '#dc2626'}`
                      : colorMode === 'dark' 
                      ? '1.5px solid rgba(51, 65, 85, 0.6)' 
                      : '1.5px solid #e2e8f0',
                    borderRadius: '8px',
                    background: colorMode === 'dark' ? 'rgba(15, 23, 42, 0.5)' : '#ffffff',
                    color: colorMode === 'dark' ? '#f1f5f9' : '#1e293b',
                    fontSize: '13px',
                    outline: 'none',
                    transition: 'all 0.2s ease',
                    boxShadow: emailFocused
                      ? colorMode === 'dark'
                        ? '0 0 0 3px rgba(59, 130, 246, 0.1), 0 2px 8px rgba(0, 0, 0, 0.3)'
                        : '0 0 0 3px rgba(59, 130, 246, 0.1), 0 1px 3px rgba(0, 0, 0, 0.05)'
                      : 'none',
                    cursor: loading ? 'not-allowed' : 'text',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password-input"
                style={{
                  display: 'block',
                  marginBottom: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: colorMode === 'dark' ? '#cbd5e1' : '#475569',
                  letterSpacing: '-0.01em',
                }}
              >
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <Lock
                  size={16}
                  style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: passwordFocused 
                      ? '#3b82f6'
                      : (colorMode === 'dark' ? '#64748b' : '#94a3b8'),
                    transition: 'color 0.2s',
                    pointerEvents: 'none',
                  }}
                />
                <input
                  id="password-input"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setPasswordFocused(true)}
                  onBlur={() => setPasswordFocused(false)}
                  required
                  minLength={6}
                  disabled={loading}
                  placeholder="Enter your password"
                  autoComplete={isLogin ? 'current-password' : 'new-password'}
                  style={{
                    width: '100%',
                    padding: '10px 12px 10px 38px',
                    border: passwordFocused
                      ? '2px solid #3b82f6'
                      : error
                      ? `2px solid ${colorMode === 'dark' ? '#ef4444' : '#dc2626'}`
                      : colorMode === 'dark' 
                      ? '1.5px solid rgba(51, 65, 85, 0.6)' 
                      : '1.5px solid #e2e8f0',
                    borderRadius: '8px',
                    background: colorMode === 'dark' ? 'rgba(15, 23, 42, 0.5)' : '#ffffff',
                    color: colorMode === 'dark' ? '#f1f5f9' : '#1e293b',
                    fontSize: '13px',
                    outline: 'none',
                    transition: 'all 0.2s ease',
                    boxShadow: passwordFocused
                      ? colorMode === 'dark'
                        ? '0 0 0 3px rgba(59, 130, 246, 0.1), 0 2px 8px rgba(0, 0, 0, 0.3)'
                        : '0 0 0 3px rgba(59, 130, 246, 0.1), 0 1px 3px rgba(0, 0, 0, 0.05)'
                      : 'none',
                    cursor: loading ? 'not-allowed' : 'text',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
              {!isLogin && (
                <p style={{
                  margin: '6px 0 0 0',
                  fontSize: '11px',
                  color: colorMode === 'dark' ? '#64748b' : '#94a3b8',
                }}>
                  Must be at least 6 characters
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || success !== null}
              aria-label={isLogin ? 'Sign in' : 'Create account'}
              style={{
                padding: '11px 16px',
                border: 'none',
                borderRadius: '8px',
                background: loading || success 
                  ? (colorMode === 'dark' ? 'rgba(59, 130, 246, 0.5)' : 'rgba(59, 130, 246, 0.6)')
                  : 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                color: '#ffffff',
                fontSize: '13px',
                fontWeight: 700,
                cursor: loading || success ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                opacity: loading || success ? 0.7 : 1,
                boxShadow: colorMode === 'dark'
                  ? '0 4px 12px rgba(59, 130, 246, 0.3)'
                  : '0 3px 10px rgba(59, 130, 246, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
              onMouseEnter={(e) => {
                if (!loading && !success) {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = colorMode === 'dark'
                    ? '0 8px 20px rgba(59, 130, 246, 0.4)'
                    : '0 6px 18px rgba(59, 130, 246, 0.35)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = colorMode === 'dark'
                  ? '0 4px 12px rgba(59, 130, 246, 0.3)'
                  : '0 3px 10px rgba(59, 130, 246, 0.25)';
              }}
            >
              {loading ? (
                <>
                  <div style={{
                    width: '16px',
                    height: '16px',
                    border: '2px solid rgba(255, 255, 255, 0.3)',
                    borderTopColor: '#ffffff',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite',
                  }} />
                  Processing...
                </>
              ) : success ? (
                <>
                  <CheckCircle2 size={16} />
                  {success.includes('created') ? 'Account Created!' : 'Signed In!'}
                </>
              ) : (
                isLogin ? 'Sign In' : 'Create Account'
              )}
            </button>
          </form>

          {/* Toggle Login/Register */}
          <div
            style={{
              marginTop: '18px',
              paddingTop: '16px',
              borderTop: colorMode === 'dark' 
                ? '1px solid rgba(51, 65, 85, 0.5)' 
                : '1px solid rgba(226, 232, 240, 0.8)',
              textAlign: 'center',
            }}
          >
            <p style={{ 
              margin: 0, 
              fontSize: '12px', 
              color: colorMode === 'dark' ? '#94a3b8' : '#64748b',
              lineHeight: '1.6',
            }}>
              {isLogin ? "Don't have an account?" : 'Already have an account?'}{' '}
              <button
                type="button"
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError(null);
                  setSuccess(null);
                }}
                disabled={loading}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#3b82f6',
                  fontWeight: 700,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  textDecoration: 'none',
                  fontSize: '12px',
                  padding: 0,
                  transition: 'color 0.2s',
                }}
                onMouseEnter={(e) => {
                  if (!loading) e.currentTarget.style.color = '#8b5cf6';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = '#3b82f6';
                }}
              >
                {isLogin ? 'Sign up' : 'Sign in'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
