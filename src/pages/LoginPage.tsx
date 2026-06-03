import { useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { getApiErrorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';

export function LoginPage() {
  const { login, isAuthenticated } = useAuth();
  const [email, setEmail] = useState('testuser');
  const [password, setPassword] = useState('password');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email.trim(), password);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <form className="login-card card" onSubmit={handleSubmit}>
        <div className="page-header">
          <span className="badge">Admin portal</span>
          <h1>Sign in to viberp</h1>
          <p>Textile ERP dashboard</p>
        </div>
        {error && <div className="alert alert-error">{error}</div>}
        <label className="field">
          <span>Email / username</span>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
            required
          />
        </label>
        <label className="field">
          <span>Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </label>
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? 'Signing in…' : 'Login'}
        </button>
        <p className="hint">Dev seed: testuser / password</p>
        <p className="hint">After resetting the database, log out and sign in again.</p>
      </form>
    </div>
  );
}
