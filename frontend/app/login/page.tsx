'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const res = await fetch('http://localhost:8000/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // ⚠️ CRITICAL: Must send credentials so httpOnly cookies persist in the browser!
        credentials: 'include',
        body: JSON.stringify({ username, password })
      });

      if (res.ok) {
        // 1. Route to the admin dashboard
        //router.push('/admin');
        // 2. Refresh server component state so Next.js middleware/guards recognize the cookie
        //router.refresh();
        window.location.href = '/admin';
      } else {
        setError('Invalid Administrative Credentials.');
      }
    } catch (err) {
      setError('Connection error. Is backend API running?');
    }
  };

  return (
    <main className="min-h-[80vh] flex justify-center items-center px-4">
      <div className="bg-white p-8 rounded-xl shadow-md border border-stone-200 max-w-md w-full text-center">
        <span className="text-3xl">🔑</span>
        <h1 className="text-2xl font-serif font-bold text-maroon mt-3 mb-1">Committee Access</h1>
        <p className="text-xs text-stone-500 mb-6">Enter your administrative username and password.</p>
        
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-left text-xs font-bold text-stone-600 mb-1">Username</label>
            <input 
              type="text" 
              required 
              value={username} 
              onChange={e => setUsername(e.target.value)} 
              className="w-full p-3 border border-stone-300 rounded text-sm bg-stone-50 focus:outline-saffron" 
              placeholder="e.g., lead_admin"
            />
          </div>

          <div>
            <label className="block text-left text-xs font-bold text-stone-600 mb-1">Password</label>
            <input 
              type="password" 
              required 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              className="w-full p-3 border border-stone-300 rounded text-sm bg-stone-50 focus:outline-saffron tracking-widest text-lg" 
              placeholder="••••••••••••"
            />
          </div>
          
          {error && <p className="text-xs text-rose-600 font-semibold">{error}</p>}
          <button type="submit" className="w-full bg-saffron text-white font-bold p-3 rounded text-sm hover:bg-orange-700 transition">
            Verify & Authorize Session
          </button>
        </form>
      </div>
    </main>
  );
}