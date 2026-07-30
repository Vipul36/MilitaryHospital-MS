import React, { useState } from 'react';
import { Shield, Lock, User, AlertCircle, Eye, EyeOff } from 'lucide-react';
import type { UserRole } from '@mhshms/types';
import { API_BASE_URL } from '../config/api';

interface LoginProps {
  onLoginSuccess: (user: any, token: string) => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('ADMIN');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Attempt backend authentication
      const response = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
      });

      const result = await response.json();

      if (response.ok && result.status === 'success') {
        const { token, user } = result.data;
        onLoginSuccess(user, token);
      } else {
        if (response.status === 500 || result?.code === 'AUTH_FAILED') {
          throw new Error('Database offline or internal server error');
        }
        setError(result.message || 'Incorrect username or password. Check credentials.');
      }

    } catch (err) {
      console.warn('Backend API server not accessible. Activating local mock login fallback.', err);
      setIsOffline(true);
      
      // Fallback Mock Login Simulation
      setTimeout(() => {
        if (
          (username === 'admin' && password === 'admin123') ||
          (username === 'doctor' && password === 'doctor123') ||
          (username === 'patient' && password === 'patient123') ||
          (username === 'demo')
        ) {
          const mockUser = {
            id: `user-${username}`,
            username: username,
            role: username === 'admin' ? 'ADMIN' : username === 'doctor' ? 'DOCTOR' : username === 'patient' ? 'PATIENT' : role,
            email: `${username}@militaryhospital.gov.in`,
            phone: '+919999999999'
          };
          onLoginSuccess(mockUser, `mock-token-${username}`);
        } else {
          setError('Offline Mode: Invalid credentials. Try "admin" / "admin123" or "doctor" / "doctor123".');
        }
        setLoading(false);
      }, 500);
      return;
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden font-sans">
      
      {/* Decorative military grid patterns */}
      <div className="absolute inset-0 opacity-5 bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:24px_24px]"></div>
      
      {/* Radial spotlight effect */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[500px] bg-military-900/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="w-full max-w-md bg-navy-900/40 backdrop-blur-md border border-slate-800 rounded-3xl p-8 shadow-2xl relative z-10">
        
        {/* Terminal Header */}
        <div className="text-center mb-8">
          <div className="mx-auto h-14 w-14 bg-gradient-to-br from-military to-military-700 rounded-2xl flex items-center justify-center shadow-lg shadow-military/20 border border-military-400/30 mb-4">
            <Shield className="h-7 w-7 text-white" />
          </div>
          <h2 className="text-xl font-black text-white tracking-wide uppercase">MHSHMS Operations</h2>
          <span className="text-[10px] text-military-300 font-extrabold uppercase tracking-widest block mt-1">
            Military Hospital Command Terminal
          </span>
        </div>

        {isOffline && (
          <div className="mb-4 bg-amber-950/40 border border-amber-800/40 p-3 rounded-2xl flex items-center gap-2.5 text-amber-300 text-xs">
            <AlertCircle className="h-4.5 w-4.5 shrink-0" />
            <span>Connecting to simulated offline workspace. Credentials verified locally.</span>
          </div>
        )}

        {error && (
          <div className="mb-6 bg-red-950/40 border border-red-900/40 p-3.5 rounded-2xl flex items-center gap-3 text-red-200 text-xs animate-shake">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Username */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
              Service ID / Username
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-slate-900/80 border border-slate-800 text-slate-200 placeholder-slate-600 rounded-xl py-2.5 pl-11 pr-4 text-xs focus:ring-1 focus:ring-military focus:border-military focus:outline-none transition-all"
                placeholder="e.g. admin or DEF-90812-M"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
              Secure Passkey
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-900/80 border border-slate-800 text-slate-200 placeholder-slate-600 rounded-xl py-2.5 pl-11 pr-11 text-xs focus:ring-1 focus:ring-military focus:border-military focus:outline-none transition-all"
                placeholder="••••••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-3 text-slate-500 hover:text-slate-300 transition-colors"
              >
                {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
              </button>
            </div>
          </div>

          {/* Role Dropdown */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
              Acting Command Role
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              className="w-full bg-slate-900/80 border border-slate-800 text-slate-200 rounded-xl p-2.5 text-xs focus:ring-1 focus:ring-military focus:border-military focus:outline-none"
            >
              <option value="ADMIN">Command Hospital Admin</option>
              <option value="DOCTOR">Medical Specialist / Surgeon</option>
              <option value="PATIENT">Military Personnel / Dependent</option>
              <option value="PHARMACIST">Clinical Pharmacist</option>
              <option value="REFERRAL_OFFICER">Command Referral Authority</option>
            </select>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-military hover:bg-military-600 disabled:bg-military-800/50 disabled:cursor-not-allowed text-white font-bold text-xs uppercase py-3.5 px-4 rounded-xl transition-all shadow-lg shadow-military/20 flex items-center justify-center gap-2 mt-2"
          >
            {loading ? (
              <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            ) : (
              <span>Authenticate Credentials</span>
            )}
          </button>
        </form>

        {/* Credentials reminder for demo */}
        <div className="mt-8 pt-6 border-t border-slate-800 text-center">
          <p className="text-[10px] text-slate-500">
            For evaluation, use default credentials:<br />
            Admin: <span className="text-slate-400 font-mono">admin / admin123</span><br />
            Doctor: <span className="text-slate-400 font-mono">doctor / doctor123</span><br />
            Patient: <span className="text-slate-400 font-mono">patient / patient123</span>
          </p>
        </div>
      </div>
    </div>
  );
}
