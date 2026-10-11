'use client';
import React, { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { X, Lock, Mail, User as UserIcon, Sparkles } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const { login, register } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (isRegister) {
        await register(username, email, password);
      } else {
        await login(username, password);
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoFill = () => {
    setUsername('director_cinematics');
    setEmail('director@mastermind.studio');
    setPassword('MasterMind2024!');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="relative w-full max-w-md bg-[#0f1016] border border-[#272a3a] rounded-2xl p-7 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-gray-400 hover:text-white p-1 rounded-lg hover:bg-[#1a1c26] transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#d4af37]/20 to-[#d4af37]/5 border border-[#d4af37]/40 mb-3">
            <Lock className="w-6 h-6 text-[#d4af37]" />
          </div>
          <h2 className="text-2xl font-serif font-bold text-white tracking-wide">
            {isRegister ? 'Join Master Mind' : 'Studio Authentication'}
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            {isRegister
              ? 'Create your studio account to store presets and photo workflows'
              : 'Sign in to access your cinematic grading projects'}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-950/60 border border-red-800/80 text-xs text-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1">
              Username
            </label>
            <div className="relative">
              <UserIcon className="absolute left-3.5 top-3 w-4 h-4 text-gray-500" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="cinematographer_pro"
                className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-[#161822] border border-[#292c3d] text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#d4af37]"
              />
            </div>
          </div>

          {isRegister && (
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 w-4 h-4 text-gray-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="editor@studio.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-[#161822] border border-[#292c3d] text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#d4af37]"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3 w-4 h-4 text-gray-500" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-[#161822] border border-[#292c3d] text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#d4af37]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 rounded-lg bg-gradient-to-r from-[#d4af37] via-[#c29c29] to-[#a6821e] text-black font-bold text-xs uppercase tracking-wider hover:opacity-95 disabled:opacity-50 transition-all shadow-lg shadow-[#d4af37]/20"
          >
            {loading ? 'Authenticating...' : isRegister ? 'Create Account' : 'Sign In to Studio'}
          </button>
        </form>

        {/* Quick Demo Helper */}
        <div className="mt-4 pt-4 border-t border-[#1f212e] flex flex-col gap-2">
          <button
            type="button"
            onClick={handleDemoFill}
            className="w-full py-2 px-3 rounded-lg bg-[#141620] hover:bg-[#1a1d2c] border border-[#262838] text-[11px] text-[#d4af37] flex items-center justify-center gap-1.5 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Auto-fill Demo Credentials</span>
          </button>

          <p className="text-center text-xs text-gray-400 mt-2">
            {isRegister ? 'Already have an account?' : "Don't have an account yet?"}{' '}
            <button
              type="button"
              onClick={() => {
                setIsRegister(!isRegister);
                setError(null);
              }}
              className="text-[#d4af37] hover:underline font-semibold ml-1"
            >
              {isRegister ? 'Sign In' : 'Register Now'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
