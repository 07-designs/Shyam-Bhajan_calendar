'use client';

import React, { useState } from 'react';
import Link from 'next/link';

export default function LoginPage() {
  // Mode switcher: 'login' | 'must_change_password' | 'forgot_password_step1' | 'forgot_password_step2'
  const [mode, setMode] = useState<'login' | 'must_change_password' | 'forgot_password_step1' | 'forgot_password_step2'>('login');

  // Form State
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  
  // First-time & OTP Reset Password State
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');

  // UI Feedback State
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Password Rules Helper
  const hasMinLen = newPassword.length >= 8;
  const hasUpper = /[A-Z]/.test(newPassword);
  const hasLower = /[a-z]/.test(newPassword);
  const hasDigit = /\d/.test(newPassword);
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword);
  const isPasswordValid = hasMinLen && hasUpper && hasLower && hasDigit && hasSpecial;

  // 1. Standard Login Handler
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setIsLoading(true);

    try {
      const res = await fetch('http://localhost:8000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();

      if (res.ok) {
        if (data.must_change_password) {
          setMode('must_change_password');
          setSuccessMsg('First-time login detected! Please set a new secure password to proceed.');
        } else {
          window.location.href = '/admin';
        }
      } else {
        setError(data.detail || 'Invalid credentials or account locked.');
      }
    } catch (err) {
      setError('Connection error. Is backend API server running on port 8000?');
    } finally {
      setIsLoading(false);
    }
  };

  // 2. First Login Password Change Handler
  const handleFirstTimePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError('New password and confirm password do not match.');
      return;
    }
    if (!isPasswordValid) {
      setError('Password does not meet the minimum security requirements.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('http://localhost:8000/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ new_password: newPassword })
      });

      const data = await res.json();
      if (res.ok) {
        window.location.href = '/admin';
      } else {
        setError(data.detail || 'Failed to update password.');
      }
    } catch (err) {
      setError('Network error updating password.');
    } finally {
      setIsLoading(false);
    }
  };

  // 3. Request WhatsApp OTP
  const handleRequestOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setIsLoading(true);

    try {
      const res = await fetch('http://localhost:8000/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username })
      });
      const data = await res.json();

      if (res.ok) {
        setMode('forgot_password_step2');
        setSuccessMsg(`If username '${username}' exists, a 6-digit OTP was sent via WhatsApp!`);
      } else {
        setError(data.detail || 'Failed to send OTP.');
      }
    } catch (err) {
      setError('Failed to connect to authentication server.');
    } finally {
      setIsLoading(false);
    }
  };

  // 4. Verify OTP & Set New Password
  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (!isPasswordValid) {
      setError('Password does not meet security requirements.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('http://localhost:8000/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, otp_code: otpCode, new_password: newPassword })
      });
      const data = await res.json();

      if (res.ok) {
        setMode('login');
        setSuccessMsg('Password reset successfully! Please log in with your new password.');
        setPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setOtpCode('');
      } else {
        setError(data.detail || 'Invalid or expired OTP code.');
      }
    } catch (err) {
      setError('Failed to reset password.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#140C08] contact-mandala-bg flex flex-col justify-center items-center px-4 relative overflow-hidden text-[#F8F4EC]">
      
      {/* Ambient Gold Radial Orbs */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#D4A017]/12 blur-3xl rounded-full pointer-events-none" />
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

      {/* Main Container */}
      <div className="glass-devotional-card p-8 sm:p-10 rounded-3xl border border-[#D4A017]/35 shadow-2xl max-w-md w-full text-center relative z-10 my-12">
        
        {/* Emblem Badge */}
        <div className="w-16 h-16 bg-[#D4A017]/15 border border-[#D4A017]/40 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-md">
          <span className="text-3xl">
            {mode === 'login' ? '🔑' : mode === 'must_change_password' ? '🔒' : '📲'}
          </span>
        </div>

        {/* Tagline */}
        <span className="inline-block px-3 py-1 rounded-full bg-[#D4A017]/15 border border-[#D4A017]/30 text-[#D4A017] text-[11px] uppercase tracking-widest font-semibold mb-2">
          ✨ Committee Access Portal ✨
        </span>

        {/* Title */}
        <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#F8F4EC] mb-2">
          <span className="shimmer-gold">
            {mode === 'login' && 'Admin Authentication'}
            {mode === 'must_change_password' && 'Create New Password'}
            {mode === 'forgot_password_step1' && 'WhatsApp OTP Reset'}
            {mode === 'forgot_password_step2' && 'Verify OTP & Set Password'}
          </span>
        </h1>
        <p className="text-xs sm:text-sm text-stone-300/80 mb-6 font-light leading-relaxed">
          {mode === 'login' && 'Enter your administrative credentials to manage Shyam Bhajan Seva events.'}
          {mode === 'must_change_password' && 'For security reasons, temporary passwords must be updated on first login.'}
          {mode === 'forgot_password_step1' && 'Enter your username to receive a 6-digit OTP via Twilio WhatsApp.'}
          {mode === 'forgot_password_step2' && 'Enter the 6-digit WhatsApp OTP code sent to your registered phone number.'}
        </p>

        {/* Feedback Messages */}
        {error && (
          <div className="mb-4 p-3 bg-red-950/80 border border-red-500/50 text-red-300 rounded-xl text-xs font-medium text-left">
            ⚠️ {error}
          </div>
        )}
        {successMsg && (
          <div className="mb-4 p-3 bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 rounded-xl text-xs font-medium text-left">
            ✅ {successMsg}
          </div>
        )}

        {/* MODE 1: Standard Login */}
        {mode === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4 text-left">
            <div>
              <label className="block text-xs font-semibold text-stone-200 mb-1.5 uppercase tracking-wider">
                Username *
              </label>
              <input
                type="text"
                required
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="w-full px-4 py-3 bg-[#140C08] border border-[#D4A017]/30 text-[#F8F4EC] rounded-xl text-sm focus:ring-2 focus:ring-[#D4A017] outline-none transition-all placeholder-stone-500 shadow-inner"
                placeholder="e.g., nilesh"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-xs font-semibold text-stone-200 uppercase tracking-wider">
                  Password *
                </label>
                <button
                  type="button"
                  onClick={() => { setMode('forgot_password_step1'); setError(''); setSuccessMsg(''); }}
                  className="text-xs text-[#D4A017] hover:underline"
                >
                  Forgot Password?
                </button>
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-[#140C08] border border-[#D4A017]/30 text-[#F8F4EC] rounded-xl text-sm focus:ring-2 focus:ring-[#D4A017] outline-none transition-all placeholder-stone-500 shadow-inner tracking-widest"
                placeholder="••••••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#D4A017] text-[#2A1A10] font-bold py-3.5 px-4 rounded-xl shadow-2xl transition-all duration-300 hover:bg-[#C77A1A] hover:text-white flex justify-center items-center gap-2 text-sm disabled:opacity-60 cursor-pointer mt-6"
            >
              {isLoading ? 'Authenticating Session...' : 'Authorize Session →'}
            </button>
          </form>
        )}

        {/* MODE 2: First Login Password Change */}
        {mode === 'must_change_password' && (
          <form onSubmit={handleFirstTimePasswordChange} className="space-y-4 text-left">
            <div>
              <label className="block text-xs font-semibold text-stone-200 mb-1.5 uppercase tracking-wider">
                New Password *
              </label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                className="w-full px-4 py-3 bg-[#140C08] border border-[#D4A017]/30 text-[#F8F4EC] rounded-xl text-sm focus:ring-2 focus:ring-[#D4A017] outline-none transition-all tracking-widest"
                placeholder="••••••••••••"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-200 mb-1.5 uppercase tracking-wider">
                Confirm New Password *
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

            {/* Password Rules Checklist */}
            <div className="p-3 bg-[#140C08]/90 border border-[#D4A017]/20 rounded-xl text-[11px] space-y-1">
              <span className="font-semibold text-[#D4A017] block mb-1">Password Requirements:</span>
              <div className={hasMinLen ? 'text-emerald-400' : 'text-stone-400'}>
                {hasMinLen ? '✓' : '○'} At least 8 characters long
              </div>
              <div className={hasUpper && hasLower ? 'text-emerald-400' : 'text-stone-400'}>
                {hasUpper && hasLower ? '✓' : '○'} Uppercase & Lowercase letters
              </div>
              <div className={hasDigit ? 'text-emerald-400' : 'text-stone-400'}>
                {hasDigit ? '✓' : '○'} At least one digit (0-9)
              </div>
              <div className={hasSpecial ? 'text-emerald-400' : 'text-stone-400'}>
                {hasSpecial ? '✓' : '○'} Special character (!@#$%^&*)
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || !isPasswordValid}
              className="w-full bg-[#D4A017] text-[#2A1A10] font-bold py-3.5 px-4 rounded-xl shadow-2xl transition-all duration-300 hover:bg-[#C77A1A] hover:text-white flex justify-center items-center gap-2 text-sm disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? 'Updating Password...' : 'Save New Password & Enter Dashboard →'}
            </button>
          </form>
        )}

        {/* MODE 3: Forgot Password - Step 1 (Username input) */}
        {mode === 'forgot_password_step1' && (
          <form onSubmit={handleRequestOTP} className="space-y-4 text-left">
            <div>
              <label className="block text-xs font-semibold text-stone-200 mb-1.5 uppercase tracking-wider">
                Admin Username *
              </label>
              <input
                type="text"
                required
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="w-full px-4 py-3 bg-[#140C08] border border-[#D4A017]/30 text-[#F8F4EC] rounded-xl text-sm focus:ring-2 focus:ring-[#D4A017] outline-none transition-all placeholder-stone-500 shadow-inner"
                placeholder="e.g., nilesh"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#D4A017] text-[#2A1A10] font-bold py-3.5 px-4 rounded-xl shadow-2xl transition-all hover:bg-[#C77A1A] hover:text-white text-sm disabled:opacity-60 cursor-pointer"
            >
              {isLoading ? 'Sending WhatsApp OTP...' : 'Send OTP via WhatsApp 📲'}
            </button>

            <button
              type="button"
              onClick={() => { setMode('login'); setError(''); setSuccessMsg(''); }}
              className="w-full py-2 text-xs text-stone-400 hover:text-[#F8F4EC] transition-all text-center block"
            >
              ← Back to Login
            </button>
          </form>
        )}

        {/* MODE 4: Forgot Password - Step 2 (Verify OTP & Reset) */}
        {mode === 'forgot_password_step2' && (
          <form onSubmit={handleVerifyOTP} className="space-y-4 text-left">
            <div>
              <label className="block text-xs font-semibold text-stone-200 mb-1.5 uppercase tracking-wider">
                6-Digit WhatsApp OTP Code *
              </label>
              <input
                type="text"
                required
                maxLength={6}
                value={otpCode}
                onChange={e => setOtpCode(e.target.value)}
                className="w-full px-4 py-3 bg-[#140C08] border border-[#D4A017]/40 text-[#D4A017] rounded-xl text-lg font-bold text-center tracking-[0.5em] focus:ring-2 focus:ring-[#D4A017] outline-none"
                placeholder="123456"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-200 mb-1.5 uppercase tracking-wider">
                New Password *
              </label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                className="w-full px-4 py-3 bg-[#140C08] border border-[#D4A017]/30 text-[#F8F4EC] rounded-xl text-sm focus:ring-2 focus:ring-[#D4A017] outline-none tracking-widest"
                placeholder="••••••••••••"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-200 mb-1.5 uppercase tracking-wider">
                Confirm New Password *
              </label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-3 bg-[#140C08] border border-[#D4A017]/30 text-[#F8F4EC] rounded-xl text-sm focus:ring-2 focus:ring-[#D4A017] outline-none tracking-widest"
                placeholder="••••••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || !isPasswordValid}
              className="w-full bg-[#D4A017] text-[#2A1A10] font-bold py-3.5 px-4 rounded-xl shadow-2xl transition-all hover:bg-[#C77A1A] hover:text-white text-sm disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? 'Verifying OTP...' : 'Verify OTP & Reset Password →'}
            </button>

            <button
              type="button"
              onClick={() => { setMode('login'); setError(''); setSuccessMsg(''); }}
              className="w-full py-2 text-xs text-stone-400 hover:text-[#F8F4EC] transition-all text-center block"
            >
              Cancel & Return to Login
            </button>
          </form>
        )}

        <div className="mt-6 pt-4 border-t border-[#D4A017]/20 text-[11px] text-stone-400 italic">
          Shyam Bhajan Seva Mandal · Production Admin Management System
        </div>

      </div>
    </main>
  );
}