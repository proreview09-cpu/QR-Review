import { useState, useEffect } from 'react';
import { useNavigate, Navigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';
import GoogleSignInButton from '../components/GoogleSignInButton';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleClientId, setGoogleClientId] = useState('');
  const { user, loading: authLoading, login, googleSignIn } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/public/config').then(({ data }) => setGoogleClientId(data.googleClientId || '')).catch(() => {});
  }, []);

  if (authLoading) {
    return <div className="flex min-h-screen items-center justify-center bg-[#f7f9fd]"><div className="h-9 w-9 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" /></div>;
  }

  if (user) {
    return <Navigate to={user.role === 'admin' ? '/admin' : '/dashboard'} />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const u = await login(email, password);
      toast.success(`Welcome, ${u.name}!`);
      navigate(u.role === 'admin' ? '/admin' : '/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async (credential) => {
    setGoogleLoading(true);
    try {
      const data = await googleSignIn(credential);
      toast.success(data.created ? `Account created. Welcome, ${data.user.name}!` : `Welcome back, ${data.user.name}!`);
      navigate(data.user.role === 'admin' ? '/admin' : '/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Google sign-in failed');
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f7f9fd]">
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-10">
        <div className="mb-8 text-center">
          <span className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-500 text-lg font-extrabold text-white shadow-lg shadow-indigo-200">QR</span>
          <h1 className="text-3xl font-extrabold tracking-tight text-[#17182d]">Welcome back</h1>
          <p className="mt-2 text-sm text-slate-500">Sign in to your account</p>
        </div>

        <div className="rounded-2xl border border-[#e9edf5] bg-white p-8 shadow-[0_8px_28px_rgba(41,45,54,0.05)]">
          {googleClientId && (
            <>
              <GoogleSignInButton clientId={googleClientId} onCredential={handleGoogle} onError={(msg) => toast.error(msg)} />
              {googleLoading && <p className="mt-2 text-center text-xs font-bold text-slate-400">Signing in with Google...</p>}
              <div className="my-5 flex items-center gap-3">
                <span className="h-px flex-1 bg-[#e9edf5]" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">or</span>
                <span className="h-px flex-1 bg-[#e9edf5]" />
              </div>
            </>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="mb-1 block text-sm font-bold text-slate-600">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
                required
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-bold text-slate-600">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input"
                required
                placeholder="Your password"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-500 py-3.5 text-sm font-extrabold text-white shadow-lg shadow-indigo-200 transition hover:-translate-y-0.5 disabled:opacity-50"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
          <p className="mt-5 text-center text-sm text-slate-500">
            New here?{' '}
            <Link to="/register" className="font-bold text-indigo-600 hover:underline">Create an account</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
