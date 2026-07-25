'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const res = await fetch('http://localhost:8000/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // ⚠️ CRITICAL: Must send credentials so httpOnly cookies persist in the browser!
        credentials: 'include',
        body: JSON.stringify({ username, password })
      });

      if (res.ok) {
        window.location.href = '/admin';
      } else {
        setError('Invalid Administrative Credentials. Please try again.');
      }
    } catch (err) {
      setError('Connection error. Is backend API server running?');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#140C08] contact-mandala-bg flex flex-col justify-center items-center px-4 relative overflow-hidden text-[#F8F4EC]">
      
      {/* Ambient Gold Radial Orbs */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#D4A017]/12 blur-3xl rounded-full pointer-events-none" />

      {/* Background Sacred Geometry Dots */}
      <div className="absolute inset-0 opacity-[0.04] pointer-events-none bg-[radial-gradient(#D4A017_1px,transparent_1px)] [background-size:28px_28px]" />

      {/* Return to Home floating link */}
      <div className="absolute top-6 left-6 z-20">
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#1C120C]/80 border border-[#D4A017]/30 text-[#F8F4EC] text-xs font-semibold hover:border-[#D4A017] hover:bg-[#241710] transition-all backdrop-blur-md shadow-lg"
        >
          <span>←</span> Back to Main Page
        </Link>
      </div>

      {/* Login Card Container */}
      <div className="glass-devotional-card p-8 sm:p-10 rounded-3xl border border-[#D4A017]/35 shadow-2xl max-w-md w-full text-center relative z-10 my-12">
        
        {/* Emblem Badge */}
        <div className="w-16 h-16 bg-[#D4A017]/15 border border-[#D4A017]/40 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-md">
          <span className="text-3xl">🔑</span>
        </div>

        {/* Tagline */}
        <span className="inline-block px-3 py-1 rounded-full bg-[#D4A017]/15 border border-[#D4A017]/30 text-[#D4A017] text-[11px] uppercase tracking-widest font-semibold mb-2">
          ✨ Committee Access Portal ✨
        </span>

        {/* Title */}
        <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#F8F4EC] mb-2">
          <span className="shimmer-gold">Admin Authentication</span>
        </h1>
        <p className="text-xs sm:text-sm text-stone-300/80 mb-6 font-light leading-relaxed">
          Enter administrative credentials to access the Shyam Bhajan Seva Mandal event portal.
        </p>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-5 text-left">
          
          {/* Username Input */}
          <div>
            <label className="block text-xs font-semibold text-stone-200 mb-1.5 uppercase tracking-wider">
              Username *
            </label>
            <input
              type="text"
              required
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full px-4 py-3 bg-[#140C08] border border-[#D4A017]/30 text-[#F8F4EC] rounded-xl text-sm focus:ring-2 focus:ring-[#D4A017] focus:border-transparent outline-none transition-all placeholder-stone-500 shadow-inner"
              placeholder="e.g., admin"
            />
          </div>

          {/* Password Input */}
          <div>
            <label className="block text-xs font-semibold text-stone-200 mb-1.5 uppercase tracking-wider">
              Password *
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-[#140C08] border border-[#D4A017]/30 text-[#F8F4EC] rounded-xl text-sm focus:ring-2 focus:ring-[#D4A017] focus:border-transparent outline-none transition-all placeholder-stone-500 shadow-inner tracking-widest text-lg"
              placeholder="••••••••••••"
            />
          </div>

          {/* Error Notice */}
          {error && (
            <div className="p-3 bg-red-950/80 border border-red-500/50 text-red-300 rounded-xl text-xs font-medium text-center">
              ⚠️ {error}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-[#D4A017] text-[#2A1A10] font-bold py-3.5 px-4 rounded-xl shadow-2xl transition-all duration-300 hover:bg-[#C77A1A] hover:text-white flex justify-center items-center gap-2 text-sm disabled:opacity-60 active:scale-98 animate-pulse-gold cursor-pointer"
          >
            {isLoading ? (
              <>
                <svg className="w-4 h-4 animate-spin text-[#2A1A10]" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Authenticating Session...
              </>
            ) : (
              'Verify & Authorize Session →'
            )}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-[#D4A017]/20 text-[11px] text-stone-400 italic">
          Shyam Bhajan Seva Mandal · Devotional Management System
        </div>

      </div>
    </main>
  );
}