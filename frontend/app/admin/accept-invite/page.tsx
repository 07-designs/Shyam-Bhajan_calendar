'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

function AcceptInviteContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [error, setError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Password Rules Helper
  const hasMinLen = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasDigit = /\d/.test(password);
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
  const isPasswordValid = hasMinLen && hasUpper && hasLower && hasDigit && hasSpecial;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!token) {
      setError('Missing invitation token in URL.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (!isPasswordValid) {
      setError('Password does not meet security requirements.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('http://localhost:8000/api/admins/accept-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          username,
          password
        })
      });

      const data = await res.json();
      if (res.ok) {
        setIsSuccess(true);
      } else {
        setError(data.detail || 'Failed to process invitation.');
      }
    } catch (err) {
      setError('Network connection error.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="glass-devotional-card p-8 rounded-3xl border border-emerald-500/50 max-w-md w-full text-center shadow-2xl relative z-10">
        <div className="w-16 h-16 rounded-full bg-emerald-950 border border-emerald-500 flex items-center justify-center mx-auto mb-4">
          <span className="text-3xl">🎉</span>
        </div>

        <h1 className="text-2xl font-serif font-bold text-[#F8F4EC] mb-2">
          Account Setup Complete!
        </h1>
        <p className="text-xs text-stone-300 mb-6">
          Your admin account <strong className="text-[#D4A017]">@{username}</strong> has been activated successfully. You can now log in to the portal.
        </p>

        <Link
          href="/login"
          className="inline-block w-full py-3.5 rounded-xl bg-[#D4A017] text-[#140C08] font-bold text-sm hover:bg-[#C77A1A] hover:text-white transition-all shadow-lg"
        >
          Proceed to Login →
        </Link>
      </div>
    );
  }

  return (
    <div className="glass-devotional-card p-8 sm:p-10 rounded-3xl border border-[#D4A017]/35 shadow-2xl max-w-md w-full text-center relative z-10 my-12">
      
      {/* Emblem Badge */}
      <div className="w-16 h-16 bg-[#D4A017]/15 border border-[#D4A017]/40 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-md">
        <span className="text-3xl">🤝</span>
      </div>

      {/* Tagline */}
      <span className="inline-block px-3 py-1 rounded-full bg-[#D4A017]/15 border border-[#D4A017]/30 text-[#D4A017] text-[11px] uppercase tracking-widest font-semibold mb-2">
        ✨ Committee Admin Invitation ✨
      </span>

      {/* Title */}
      <h1 className="text-2xl font-serif font-bold text-[#F8F4EC] mb-2">
        <span className="shimmer-gold">Set Up Your Admin Account</span>
      </h1>
      <p className="text-xs text-stone-300/80 mb-6 leading-relaxed">
        Choose your unique username and create a secure password to activate your Mandal administrator account.
      </p>

      {/* Feedback Messages */}
      {error && (
        <div className="mb-4 p-3 bg-red-950/80 border border-red-500/50 text-red-300 rounded-xl text-xs font-medium text-left">
          ⚠️ {error}
        </div>
      )}

      {!token ? (
        <div className="p-4 bg-amber-950/60 border border-amber-500/40 text-amber-200 rounded-xl text-xs">
          ⚠️ Invalid invite link format. Please check the WhatsApp invitation link provided by your Super Admin.
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          <div>
            <label className="block text-xs font-semibold text-stone-200 mb-1.5 uppercase tracking-wider">
              Choose Username *
            </label>
            <input
              type="text"
              required
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full px-4 py-3 bg-[#140C08] border border-[#D4A017]/30 text-[#F8F4EC] rounded-xl text-sm focus:ring-2 focus:ring-[#D4A017] outline-none transition-all placeholder-stone-500 shadow-inner font-mono"
              placeholder="e.g., nilesh"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-200 mb-1.5 uppercase tracking-wider">
              Create Password *
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-[#140C08] border border-[#D4A017]/30 text-[#F8F4EC] rounded-xl text-sm focus:ring-2 focus:ring-[#D4A017] outline-none transition-all tracking-widest"
              placeholder="••••••••••••"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-200 mb-1.5 uppercase tracking-wider">
              Confirm Password *
            </label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-3 bg-[#140C08] border border-[#D4A017]/30 text-[#F8F4EC] rounded-xl text-sm focus:ring-2 focus:ring-[#D4A017] outline-none transition-all tracking-widest"
              placeholder="••••••••••••"
            />
          </div>

          {/* Password Checklist */}
          <div className="p-3 bg-[#140C08]/90 border border-[#D4A017]/20 rounded-xl text-[11px] space-y-1">
            <span className="font-semibold text-[#D4A017] block mb-1">Password Requirements:</span>
            <div className={hasMinLen ? 'text-emerald-400' : 'text-stone-400'}>
              {hasMinLen ? '✓' : '○'} Minimum 8 characters
            </div>
            <div className={hasUpper && hasLower ? 'text-emerald-400' : 'text-stone-400'}>
              {hasUpper && hasLower ? '✓' : '○'} Uppercase & Lowercase letters
            </div>
            <div className={hasDigit ? 'text-emerald-400' : 'text-stone-400'}>
              {hasDigit ? '✓' : '○'} Numerical digit (0-9)
            </div>
            <div className={hasSpecial ? 'text-emerald-400' : 'text-stone-400'}>
              {hasSpecial ? '✓' : '○'} Special character (!@#$%^&*)
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading || !isPasswordValid || !username.trim()}
            className="w-full bg-[#D4A017] text-[#2A1A10] font-bold py-3.5 px-4 rounded-xl shadow-2xl transition-all duration-300 hover:bg-[#C77A1A] hover:text-white flex justify-center items-center gap-2 text-sm disabled:opacity-50 cursor-pointer"
          >
            {isLoading ? 'Activating Account...' : 'Activate Account & Finish →'}
          </button>
        </form>
      )}

      <div className="mt-6 pt-4 border-t border-[#D4A017]/20 text-[11px] text-stone-400 italic">
        Shyam Bhajan Seva Mandal · Committee Invite Setup
      </div>

    </div>
  );
}

export default function AcceptInvitePage() {
  return (
    <main className="min-h-screen bg-[#140C08] contact-mandala-bg flex flex-col justify-center items-center px-4 relative overflow-hidden text-[#F8F4EC]">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#D4A017]/12 blur-3xl rounded-full pointer-events-none" />
      <Suspense fallback={<div className="text-stone-300">Loading Invitation...</div>}>
        <AcceptInviteContent />
      </Suspense>
    </main>
  );
}
