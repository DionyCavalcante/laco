import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Lock, Eye, EyeOff } from 'lucide-react';

// ── Context ───────────────────────────────────────────────────────────────────

interface AuthContextValue {
  apiKey: string;
  isAuthenticated: boolean;
  setApiKey: (key: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return ctx;
}

// ── Provider ──────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [apiKey, setApiKeyState] = useState<string>(
    () => localStorage.getItem('laco_api_key') || ''
  );

  const setApiKey = useCallback((key: string) => {
    const trimmed = key.trim();
    localStorage.setItem('laco_api_key', trimmed);
    setApiKeyState(trimmed);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('laco_api_key');
    localStorage.removeItem('laco_slug');
    sessionStorage.removeItem('laco_auth');
    setApiKeyState('');
  }, []);

  return (
    <AuthContext.Provider value={{ apiKey, isAuthenticated: apiKey.length > 0, setApiKey, logout }}>
      {apiKey ? children : <LoginScreen onLogin={setApiKey} />}
    </AuthContext.Provider>
  );
}

// ── Tela de Login ─────────────────────────────────────────────────────────────

function LoginScreen({ onLogin }: { onLogin: (key: string) => void }) {
  const [key, setKey] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!key.trim()) { setError('Informe a API Key'); return; }

    setLoading(true);
    setError('');

    try {
      const res = await fetch(`/api/settings/clinic`, {
        headers: { 'x-api-key': key.trim(), 'Content-Type': 'application/json' },
      });
      if (res.status === 401) { setError('API Key inválida'); return; }
      // 500 = banco offline mas chave correta — deixa entrar
      onLogin(key.trim());
    } catch {
      setError('Sem conexão com o servidor.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#071318' }}>
      <div className="w-full max-w-md px-6">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-5"
            style={{ background: 'linear-gradient(135deg,#C9A96E,#9A6B10)', boxShadow: '0 0 32px rgba(201,169,110,0.35)' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#071318" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
            </svg>
          </div>
          <h1 className="text-3xl font-bold tracking-tight" style={{ color: '#F5F5F2', fontFamily: 'Inter, sans-serif' }}>Astrai</h1>
          <p className="text-sm mt-1.5 font-medium" style={{ color: 'rgba(245,245,242,0.40)' }}>Plataforma de gestão clínica</p>
        </div>

        {/* Card */}
        <form onSubmit={handleSubmit}
          className="rounded-2xl p-8 space-y-5"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-widest mb-2"
              style={{ color: 'rgba(245,245,242,0.40)' }}>
              API Key
            </label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'rgba(245,245,242,0.30)' }} />
              <input
                type={show ? 'text' : 'password'}
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder="Sua chave de acesso"
                className="w-full rounded-xl py-3.5 pl-11 pr-12 text-sm transition-all outline-none"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.10)',
                  color: '#F5F5F2',
                  fontFamily: 'inherit',
                }}
                onFocus={e => { e.currentTarget.style.borderColor = 'rgba(201,169,110,0.45)'; }}
                onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)'; }}
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShow(!show)}
                className="absolute right-4 top-1/2 -translate-y-1/2 transition-colors"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(245,245,242,0.30)' }}
              >
                {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {error && <p className="mt-2 text-xs font-medium" style={{ color: '#c94f4f' }}>{error}</p>}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 text-[11px] font-bold uppercase tracking-widest rounded-xl transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: '#C9A96E', color: '#071318', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
          >
            {loading ? 'Verificando…' : 'Entrar'}
          </button>
        </form>

        <p className="text-center text-[10px] mt-6 font-medium uppercase tracking-widest"
          style={{ color: 'rgba(245,245,242,0.25)' }}>
          API Key no arquivo <span style={{ color: 'rgba(245,245,242,0.45)' }}>.env</span> do backend
        </p>
      </div>
    </div>
  );
}
