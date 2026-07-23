'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';

// API Base URL (falls back to local backend port)
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// ---- TYPES ----
export interface Booking {
  id: number;
  full_name: string;
  address: string;
  phone: string;
  alt_phone?: string | null;
  booking_date: string;
  status: 'Pending' | 'Approved' | 'Rescheduled' | 'Rejected' | string;
}

export interface Member {
  id: number;
  name: string;
  phone: string;
  role: string;
}

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

// Pre-defined role options for the Mandal member form
const MANDAL_ROLES = [
  'Lead Singer',
  'Co-Singer',
  'Harmonium Player',
  'Dholak Player',
  'Tabla Player',
  'Octapad Player',
  'Sound Engineer',
  'Event Coordinator',
  'Other / Custom'
];

export default function AdminDashboard() {
  const router = useRouter();

  // Core Data States
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Form & Interaction States
  const [newMember, setNewMember] = useState({ name: '', phone: '', role: 'Lead Singer', customRole: '' });
  const [addingMember, setAddingMember] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');

  // Modals & Popovers State
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [rescheduleBooking, setRescheduleBooking] = useState<Booking | null>(null);
  const [newRescheduleDate, setNewRescheduleDate] = useState('');
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    type: 'booking' | 'member';
    id: number;
    title: string;
  } | null>(null);

  // Notification Toasts State
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  // 1. Initial Load & Session Validation
  useEffect(() => {
    const initializeAdmin = async () => {
      try {
        const [bookingsRes, membersRes] = await Promise.all([
          fetch(`${API_BASE}/api/bookings`, { credentials: 'include' }),
          fetch(`${API_BASE}/api/members`, { credentials: 'include' })
        ]);

        if (bookingsRes.status === 401 || membersRes.status === 401) {
          addToast('Session expired. Redirecting to login...', 'error');
          router.push('/login');
          return;
        }

        if (bookingsRes.ok) {
          const bookingsData = await bookingsRes.json();
          setBookings(bookingsData);
        } else {
          addToast('Failed to load event bookings', 'error');
        }

        if (membersRes.ok) {
          const membersData = await membersRes.json();
          setMembers(membersData);
        } else {
          addToast('Failed to load mandal roster', 'error');
        }
      } catch (error) {
        console.error('Error initializing admin session:', error);
        addToast('Unable to connect to backend server. Ensure API is running.', 'error');
      } finally {
        setLoading(false);
      }
    };

    initializeAdmin();
  }, [refreshTrigger, router]);

  // 2. Calculated Statistics Overview
  const stats = useMemo(() => {
    const total = bookings.length;
    const pending = bookings.filter(b => b.status === 'Pending').length;
    const approved = bookings.filter(b => b.status === 'Approved').length;
    const activeMembers = members.length;
    return { total, pending, approved, activeMembers };
  }, [bookings, members]);

  // 3. Filtered & Searched Bookings
  const filteredBookings = useMemo(() => {
    return bookings.filter(b => {
      const matchesSearch =
        b.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.phone.includes(searchTerm) ||
        b.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.booking_date.includes(searchTerm);

      const matchesStatus = statusFilter === 'All' || b.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [bookings, searchTerm, statusFilter]);

  // 4. API Handler: Status Update (Approve / Reschedule / Reject)
  const handleStatusChange = async (id: number, newStatus: string) => {
    setActionLoadingId(id);
    try {
      const res = await fetch(`${API_BASE}/api/bookings/${id}/status?status=${encodeURIComponent(newStatus)}`, {
        method: 'PATCH',
        credentials: 'include'
      });

      if (res.ok) {
        addToast(`Booking status updated to "${newStatus}"`, 'success');
        setRefreshTrigger(prev => prev + 1);
        if (selectedBooking?.id === id) {
          setSelectedBooking(prev => prev ? { ...prev, status: newStatus } : null);
        }
      } else {
        const errData = await res.json().catch(() => ({}));
        addToast(errData.detail || 'Failed to update booking status', 'error');
      }
    } catch (error) {
      addToast('Network error while updating status', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  // 5. API Handler: Reschedule Request
  const handleRescheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rescheduleBooking || !newRescheduleDate) return;

    setActionLoadingId(rescheduleBooking.id);
    try {
      const res = await fetch(`${API_BASE}/api/bookings/${rescheduleBooking.id}/status?status=Rescheduled`, {
        method: 'PATCH',
        credentials: 'include'
      });

      if (res.ok) {
        addToast(`Event rescheduled for ${rescheduleBooking.full_name}`, 'success');
        setRescheduleBooking(null);
        setNewRescheduleDate('');
        setRefreshTrigger(prev => prev + 1);
      } else {
        addToast('Failed to reschedule event', 'error');
      }
    } catch (error) {
      addToast('Error communicating with backend server', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  // 6. API Handler: Delete Booking Request
  const handleDeleteBooking = async (id: number) => {
    setActionLoadingId(id);
    try {
      const res = await fetch(`${API_BASE}/api/bookings/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (res.ok) {
        addToast('Booking request deleted successfully', 'success');
        setRefreshTrigger(prev => prev + 1);
        if (selectedBooking?.id === id) setSelectedBooking(null);
      } else {
        addToast('Failed to delete booking request', 'error');
      }
    } catch (error) {
      addToast('Error while deleting booking', 'error');
    } finally {
      setActionLoadingId(null);
      setDeleteConfirmation(null);
    }
  };

  // 7. API Handler: Add Mandal Member
  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();

    const selectedRole = newMember.role === 'Other / Custom' ? newMember.customRole : newMember.role;

    if (!newMember.name.trim()) {
      addToast('Please enter member full name', 'error');
      return;
    }

    const cleanPhone = newMember.phone.trim();
    if (!/^\d{10}$/.test(cleanPhone.replace(/[- ]/g, ''))) {
      addToast('Please enter a valid 10-digit contact number', 'error');
      return;
    }

    if (!selectedRole.trim()) {
      addToast('Please select or specify a mandal role', 'error');
      return;
    }

    setAddingMember(true);
    try {
      const res = await fetch(`${API_BASE}/api/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: newMember.name.trim(),
          phone: cleanPhone,
          role: selectedRole.trim()
        })
      });

      if (res.ok) {
        addToast(`Added ${newMember.name} to active roster`, 'success');
        setNewMember({ name: '', phone: '', role: 'Lead Singer', customRole: '' });
        setRefreshTrigger(prev => prev + 1);
      } else {
        const errData = await res.json().catch(() => ({}));
        addToast(errData.detail || 'Failed to add mandal member', 'error');
      }
    } catch (error) {
      addToast('Error adding member to roster', 'error');
    } finally {
      setAddingMember(false);
    }
  };

  // 8. API Handler: Remove Mandal Member
  const handleDeleteMember = async (id: number) => {
    try {
      const res = await fetch(`${API_BASE}/api/members/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (res.ok) {
        addToast('Mandal member removed from roster', 'success');
        setRefreshTrigger(prev => prev + 1);
      } else {
        addToast('Failed to remove member from roster', 'error');
      }
    } catch (error) {
      addToast('Error removing member from roster', 'error');
    } finally {
      setDeleteConfirmation(null);
    }
  };

  // Initial loading state presentation
  if (loading) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] flex flex-col items-center justify-center p-4">
        <div className="relative flex items-center justify-center mb-4">
          <div className="w-16 h-16 border-4 border-[#8B2607]/20 border-t-[#8B2607] rounded-full animate-spin"></div>
          <span className="absolute text-xl">🙏</span>
        </div>
        <h2 className="text-xl font-serif font-bold text-[#8B2607] animate-pulse">
          Jai Shree Shyam
        </h2>
        <p className="text-sm text-stone-500 mt-1">Verifying administrative credentials & loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-stone-800 font-sans pb-16">
      
      {/* Toast Notification Container */}
      <div className="fixed top-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`pointer-events-auto px-4 py-3 rounded-lg shadow-lg border text-sm font-medium flex items-center justify-between transition-all duration-300 animate-slide-in ${
              toast.type === 'success'
                ? 'bg-emerald-900 text-emerald-100 border-emerald-700'
                : toast.type === 'error'
                ? 'bg-rose-900 text-rose-100 border-rose-700'
                : 'bg-stone-900 text-stone-100 border-stone-700'
            }`}
          >
            <span>{toast.message}</span>
            <button
              onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
              className="ml-3 text-xs opacity-70 hover:opacity-100"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      {/* Hero Header & Devotional Banner with Split Background Gradient */}
      <header className="relative bg-gradient-to-r from-[#8B2E0F] via-[#C85213] via-50% to-[#132E3C] text-white shadow-md border-b border-[#8B2607]/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            
            {/* Left Section: Text Content & Title */}
            <div className="space-y-4 text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-amber-200 text-xs font-semibold tracking-wider uppercase">
                <span>✨</span>
                <span>JAI SHREE SHYAM</span>
                <span>✨</span>
              </div>
              
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-bold text-amber-50 tracking-tight leading-tight">
                Shyam Bhajan Seva
                <span className="block text-2xl sm:text-3xl text-amber-300 font-sans font-normal mt-1">
                  Mandal & Event Admin Portal
                </span>
              </h1>

              <p className="text-stone-200 text-sm sm:text-base max-w-xl leading-relaxed">
                Seamlessly manage bhajan event requests, roster schedules, mandal member duties, and host communications with full administrative control.
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  onClick={() => setRefreshTrigger(prev => prev + 1)}
                  className="px-4 py-2 rounded-lg bg-amber-500 text-stone-950 font-bold text-xs sm:text-sm shadow-md hover:bg-amber-400 active:scale-95 transition-all flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Refresh Live Data
                </button>

                <button
                  onClick={() => {
                    fetch(`${API_BASE}/api/admin/logout`, { method: 'POST', credentials: 'include' }).catch(() => {});
                    router.push('/login');
                  }}
                  className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/25 text-white text-xs sm:text-sm font-semibold hover:border-amber-300 transition-all flex items-center gap-2"
                >
                  <svg className="w-4 h-4 text-rose-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Exit Session
                </button>
              </div>
            </div>

            {/* Right Section: Artwork & Frame Display with Soft Aura */}
            <div className="relative flex justify-center lg:justify-end">
              <div className="relative group w-full max-w-sm sm:max-w-md h-64 sm:h-72 rounded-3xl overflow-hidden shadow-2xl border-2 border-amber-400/40 bg-[#0F222D]">
                
                {/* Glow Radial Aura Effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-amber-500/20 via-teal-500/10 to-transparent pointer-events-none"></div>

                {/* Kanhaji Artwork */}
                <img
                  src="/gallery/krishnaji.png"
                  alt="Kanhaji Divine Artwork"
                  className="w-full h-full object-cover object-top transition-transform duration-700 group-hover:scale-105"
                  onError={(e) => {
                    // Fallback if image path differs
                    e.currentTarget.style.display = 'none';
                  }}
                />

                {/* Edge Fading Mask Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-stone-950/80 via-transparent to-transparent"></div>
                <div className="absolute inset-0 bg-gradient-to-r from-[#8B2E0F]/40 via-transparent to-transparent"></div>

                <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end text-amber-100">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-amber-300">Jay Shree Khatu Shyam Ji</p>
                    <p className="text-sm font-serif italic text-stone-200">Haare Ka Sahara, Baba Shyam Hamara</p>
                  </div>
                  <span className="text-2xl animate-pulse">🌸</span>
                </div>
              </div>
            </div>

          </div>

        </div>
      </header>

      {/* Main Dashboard Body Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 space-y-8">

        {/* 1. TOP SECTION: 4-Column Stats Overview Header */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          
          {/* Card 1: Total Requests */}
          <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm hover:shadow-md transition-all flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-stone-500">Total Requests</p>
              <h3 className="text-3xl font-serif font-bold text-stone-900 mt-1">{stats.total}</h3>
              <p className="text-xs text-stone-500 mt-1">All time bookings</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-[#8B2607] flex items-center justify-center text-xl font-bold border border-amber-200">
              📋
            </div>
          </div>

          {/* Card 2: Pending Approval */}
          <div className="bg-white p-5 rounded-2xl border border-amber-200 shadow-sm hover:shadow-md transition-all flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-amber-700">Pending Approval</p>
              <h3 className="text-3xl font-serif font-bold text-amber-800 mt-1">{stats.pending}</h3>
              <p className="text-xs text-amber-700/80 mt-1">Requires admin review</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center text-xl font-bold border border-amber-300">
              ⏳
            </div>
          </div>

          {/* Card 3: Approved Events */}
          <div className="bg-[#FDFBF7] p-5 rounded-2xl border border-emerald-200 shadow-sm hover:shadow-md transition-all flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">Approved Events</p>
              <h3 className="text-3xl font-serif font-bold text-emerald-800 mt-1">{stats.approved}</h3>
              <p className="text-xs text-emerald-700/80 mt-1">Confirmed bhajan dates</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center text-xl font-bold border border-emerald-300">
              ✅
            </div>
          </div>

          {/* Card 4: Active Mandal Members */}
          <div className="bg-white p-5 rounded-2xl border border-indigo-200 shadow-sm hover:shadow-md transition-all flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-indigo-700">Active Members</p>
              <h3 className="text-3xl font-serif font-bold text-indigo-900 mt-1">{stats.activeMembers}</h3>
              <p className="text-xs text-indigo-700/80 mt-1">On-call performers</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-800 flex items-center justify-center text-xl font-bold border border-indigo-300">
              🎵
            </div>
          </div>

        </section>

        {/* 2. 2-COLUMN RESPONSIVE LAYOUT: 65% Left (Event Requests) / 35% Right (Active Roster) */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* LEFT COLUMN: 65% Width (lg:col-span-7 / xl:col-span-8) -> Incoming Event Requests Table */}
          <div className="lg:col-span-7 xl:col-span-8 space-y-6">
            
            <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
              
              {/* Table Header & Controls Bar */}
              <div className="p-6 border-b border-stone-100 bg-[#FDFBF7]/60 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-serif font-bold text-[#8B2607] flex items-center gap-2">
                      <span>🚩</span> Incoming Event Requests
                    </h2>
                    <p className="text-xs text-stone-500 mt-0.5">
                      Review, approve, reschedule, or manage host booking requests.
                    </p>
                  </div>

                  <span className="text-xs font-semibold px-3 py-1 rounded-full bg-stone-100 text-stone-600 border border-stone-200 self-start sm:self-auto">
                    Showing {filteredBookings.length} of {bookings.length}
                  </span>
                </div>

                {/* Search Bar & Status Filter Tabs */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
                  
                  {/* Search Input */}
                  <div className="relative flex-1">
                    <input
                      type="text"
                      placeholder="Search host name, phone, date, address..."
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 border border-stone-300 rounded-lg text-sm bg-stone-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#8B2607]/30 transition"
                    />
                    <svg className="w-4 h-4 text-stone-400 absolute left-3 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    {searchTerm && (
                      <button onClick={() => setSearchTerm('')} className="absolute right-3 top-2.5 text-xs text-stone-400 hover:text-stone-600">
                        ✕
                      </button>
                    )}
                  </div>

                  {/* Filter Pills */}
                  <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
                    {['All', 'Pending', 'Approved', 'Rescheduled', 'Rejected'].map(status => (
                      <button
                        key={status}
                        onClick={() => setStatusFilter(status)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                          statusFilter === status
                            ? 'bg-[#8B2607] text-white shadow-sm'
                            : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                        }`}
                      >
                        {status}
                      </button>
                    ))}
                  </div>

                </div>
              </div>

              {/* Event Table Container */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-stone-100/70 text-stone-700 font-bold border-b border-stone-200 text-xs uppercase tracking-wider">
                      <th className="py-3.5 px-4">Host Name</th>
                      <th className="py-3.5 px-4">Date</th>
                      <th className="py-3.5 px-4">Contact</th>
                      <th className="py-3.5 px-4">Address / Location</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {filteredBookings.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-stone-500">
                          <div className="flex flex-col items-center justify-center space-y-2">
                            <span className="text-3xl">📭</span>
                            <p className="font-semibold text-stone-700">No booking requests found</p>
                            <p className="text-xs text-stone-400">
                              {searchTerm || statusFilter !== 'All'
                                ? 'Try adjusting your search terms or filter selection.'
                                : 'New event requests submitted by devotees will appear here.'}
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredBookings.map(b => (
                        <tr key={b.id} className="hover:bg-amber-50/30 transition-colors">
                          
                          {/* Host Name */}
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-stone-900">{b.full_name}</div>
                            {b.alt_phone && (
                              <div className="text-[11px] text-stone-500">Alt: {b.alt_phone}</div>
                            )}
                          </td>

                          {/* Requested Date */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span className="font-semibold text-stone-800 bg-stone-100 px-2 py-1 rounded text-xs">
                              {b.booking_date}
                            </span>
                          </td>

                          {/* Phone Contact */}
                          <td className="py-3.5 px-4 whitespace-nowrap text-stone-700">
                            <a href={`tel:${b.phone}`} className="hover:text-[#8B2607] hover:underline flex items-center gap-1 font-mono text-xs">
                              <span>📞</span> {b.phone}
                            </a>
                          </td>

                          {/* Location/Address */}
                          <td className="py-3.5 px-4 text-stone-600 max-w-xs truncate" title={b.address}>
                            {b.address}
                          </td>

                          {/* Status Badge */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            {b.status === 'Pending' && (
                              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200 inline-flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping"></span>
                                Pending
                              </span>
                            )}
                            {b.status === 'Approved' && (
                              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 inline-flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                                Approved
                              </span>
                            )}
                            {b.status === 'Rescheduled' && (
                              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800 border border-indigo-200 inline-flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-600"></span>
                                Rescheduled
                              </span>
                            )}
                            {b.status === 'Rejected' && (
                              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200 inline-flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-600"></span>
                                Rejected
                              </span>
                            )}
                          </td>

                          {/* Action Buttons */}
                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              
                              {/* Pending Specific Actions */}
                              {b.status === 'Pending' && (
                                <>
                                  <button
                                    disabled={actionLoadingId === b.id}
                                    onClick={() => handleStatusChange(b.id, 'Approved')}
                                    className="bg-emerald-600 text-white hover:bg-emerald-700 text-xs px-2.5 py-1 rounded-lg font-bold shadow-sm transition active:scale-95 disabled:opacity-50"
                                  >
                                    Approve
                                  </button>

                                  <button
                                    onClick={() => {
                                      setRescheduleBooking(b);
                                      setNewRescheduleDate(b.booking_date);
                                    }}
                                    className="bg-white border border-stone-300 text-stone-700 hover:bg-stone-100 text-xs px-2.5 py-1 rounded-lg font-semibold transition"
                                  >
                                    Reschedule
                                  </button>

                                  <button
                                    onClick={() => setDeleteConfirmation({
                                      type: 'booking',
                                      id: b.id,
                                      title: `Reject booking for ${b.full_name}?`
                                    })}
                                    className="bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 text-xs px-2 py-1 rounded-lg font-semibold transition"
                                    title="Reject / Delete"
                                  >
                                    Reject
                                  </button>
                                </>
                              )}

                              {/* Approved Specific Actions */}
                              {b.status === 'Approved' && (
                                <>
                                  <button
                                    onClick={() => setSelectedBooking(b)}
                                    className="bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs px-2.5 py-1 rounded-lg font-semibold transition border border-stone-200"
                                  >
                                    View Details
                                  </button>

                                  <button
                                    onClick={() => setDeleteConfirmation({
                                      type: 'booking',
                                      id: b.id,
                                      title: `Cancel & remove approved booking for ${b.full_name}?`
                                    })}
                                    className="bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 text-xs px-2 py-1 rounded-lg font-semibold transition"
                                  >
                                    Cancel
                                  </button>
                                </>
                              )}

                              {/* Rescheduled & Rejected Generic Actions */}
                              {(b.status === 'Rescheduled' || b.status === 'Rejected') && (
                                <>
                                  <button
                                    onClick={() => setSelectedBooking(b)}
                                    className="bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs px-2 py-1 rounded-lg font-semibold transition border border-stone-200"
                                  >
                                    Details
                                  </button>

                                  <button
                                    onClick={() => setDeleteConfirmation({
                                      type: 'booking',
                                      id: b.id,
                                      title: `Delete record for ${b.full_name}?`
                                    })}
                                    className="text-stone-400 hover:text-rose-600 p-1 rounded hover:bg-rose-50 transition"
                                    title="Delete Record"
                                  >
                                    🗑️
                                  </button>
                                </>
                              )}

                            </div>
                          </td>

                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

            </div>

          </div>

          {/* RIGHT COLUMN: 35% Width (lg:col-span-5 / xl:col-span-4) -> Active Roster & Member Management */}
          <div className="lg:col-span-5 xl:col-span-4 space-y-6">
            
            {/* Form: Add New Member */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200 space-y-4">
              <div className="border-b border-stone-100 pb-3">
                <h2 className="text-lg font-serif font-bold text-[#8B2607] flex items-center gap-2">
                  <span>👤</span> Add Mandal Member
                </h2>
                <p className="text-xs text-stone-500">Register new performers, singers, or instrument artists.</p>
              </div>

              <form onSubmit={handleAddMember} className="space-y-4">
                
                {/* Member Name */}
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Full Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Rajesh Sharma"
                    value={newMember.name}
                    onChange={e => setNewMember({ ...newMember, name: e.target.value })}
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm bg-stone-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#8B2607]/30 transition"
                  />
                </div>

                {/* Contact Phone */}
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Contact Phone (10 Digits) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    placeholder="e.g., 9876543210"
                    value={newMember.phone}
                    onChange={e => setNewMember({ ...newMember, phone: e.target.value.replace(/\D/g, '') })}
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm bg-stone-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#8B2607]/30 transition font-mono"
                  />
                </div>

                {/* Role Dropdown */}
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Mandal Duty / Role <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={newMember.role}
                    onChange={e => setNewMember({ ...newMember, role: e.target.value })}
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm bg-stone-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#8B2607]/30 transition"
                  >
                    {MANDAL_ROLES.map(role => (
                      <option key={role} value={role}>{role}</option>
                    ))}
                  </select>
                </div>

                {/* Custom Role Input if 'Other / Custom' selected */}
                {newMember.role === 'Other / Custom' && (
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">Specify Role Title</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g., Keyboardist / Flutist"
                      value={newMember.customRole}
                      onChange={e => setNewMember({ ...newMember, customRole: e.target.value })}
                      className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm bg-stone-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#8B2607]/30 transition"
                    />
                  </div>
                )}

                {/* Submit Button with Loading Spinner */}
                <button
                  type="submit"
                  disabled={addingMember}
                  className="w-full bg-[#8B2607] hover:bg-[#701E05] text-white font-bold py-2.5 px-4 rounded-lg text-sm shadow transition duration-200 flex items-center justify-center gap-2 disabled:opacity-60 active:scale-98"
                >
                  {addingMember ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>Saving Member...</span>
                    </>
                  ) : (
                    <>
                      <span>+</span>
                      <span>Save Active Member</span>
                    </>
                  )}
                </button>

              </form>
            </div>

            {/* List: Active Mandal Roster */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200 space-y-4">
              <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                <h2 className="text-lg font-serif font-bold text-stone-900 flex items-center gap-2">
                  <span>🪕</span> Active Roster
                </h2>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200">
                  {members.length} Members
                </span>
              </div>

              {members.length === 0 ? (
                <div className="py-8 text-center text-stone-500">
                  <p className="text-sm font-semibold">No active members registered</p>
                  <p className="text-xs text-stone-400 mt-1">Use the form above to build your mandal team roster.</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                  {members.map(member => (
                    <div
                      key={member.id}
                      className="p-3.5 bg-stone-50/80 rounded-xl border border-stone-200 hover:border-amber-300 hover:bg-amber-50/20 transition-all flex items-center justify-between group"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-stone-900 text-sm">{member.name}</p>
                          <span className="bg-amber-100 text-amber-900 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-200">
                            {member.role}
                          </span>
                        </div>
                        <p className="text-xs font-mono text-stone-600 flex items-center gap-1">
                          <span>📞</span> {member.phone}
                        </p>
                      </div>

                      {/* Remove / Delete Member Button with Hover Transition to text-rose-600 */}
                      <button
                        onClick={() => setDeleteConfirmation({
                          type: 'member',
                          id: member.id,
                          title: `Remove ${member.name} from active roster?`
                        })}
                        className="text-stone-400 hover:text-rose-600 hover:bg-rose-50 p-2 rounded-lg transition-colors group-hover:opacity-100"
                        title="Remove Member"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

        </section>
      </main>

      {/* ----------------- MODALS & POPOVERS ----------------- */}

      {/* Modal 1: Booking Event Details View */}
      {selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-stone-200 space-y-5 relative">
            <button
              onClick={() => setSelectedBooking(null)}
              className="absolute top-4 right-4 text-stone-400 hover:text-stone-700 text-lg font-bold w-8 h-8 rounded-full flex items-center justify-center hover:bg-stone-100"
            >
              ✕
            </button>

            <div className="border-b border-stone-100 pb-3">
              <span className="text-xs font-bold text-[#8B2607] uppercase tracking-wider">Event Details</span>
              <h3 className="text-xl font-serif font-bold text-stone-900 mt-0.5">{selectedBooking.full_name}</h3>
            </div>

            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3 bg-stone-50 p-3.5 rounded-xl border border-stone-200">
                <div>
                  <p className="text-xs font-semibold text-stone-500">Requested Date</p>
                  <p className="font-bold text-stone-900 mt-0.5">{selectedBooking.booking_date}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-stone-500">Current Status</p>
                  <p className="font-bold text-stone-900 mt-0.5">{selectedBooking.status}</p>
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-stone-500">Primary Contact Phone</p>
                <p className="font-mono text-stone-800 mt-0.5">{selectedBooking.phone}</p>
              </div>

              {selectedBooking.alt_phone && (
                <div>
                  <p className="text-xs font-semibold text-stone-500">Alternate Phone</p>
                  <p className="font-mono text-stone-800 mt-0.5">{selectedBooking.alt_phone}</p>
                </div>
              )}

              <div>
                <p className="text-xs font-semibold text-stone-500">Event Address / Location</p>
                <p className="text-stone-800 mt-0.5 bg-stone-50 p-3 rounded-lg border border-stone-200 leading-relaxed whitespace-pre-wrap">
                  {selectedBooking.address}
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-stone-100">
              <button
                onClick={() => setSelectedBooking(null)}
                className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold rounded-lg text-xs transition"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Reschedule Date Picker */}
      {rescheduleBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-stone-200 space-y-4 relative">
            <button
              onClick={() => setRescheduleBooking(null)}
              className="absolute top-4 right-4 text-stone-400 hover:text-stone-700 font-bold w-8 h-8 rounded-full flex items-center justify-center hover:bg-stone-100"
            >
              ✕
            </button>

            <div>
              <h3 className="text-lg font-serif font-bold text-[#8B2607]">Reschedule Event</h3>
              <p className="text-xs text-stone-500">Select a new date for {rescheduleBooking.full_name}'s bhajan seva.</p>
            </div>

            <form onSubmit={handleRescheduleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">New Event Date</label>
                <input
                  type="date"
                  required
                  value={newRescheduleDate}
                  onChange={e => setNewRescheduleDate(e.target.value)}
                  className="w-full p-2.5 border border-stone-300 rounded-lg text-sm bg-stone-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#8B2607]/30"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRescheduleBooking(null)}
                  className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold rounded-lg text-xs transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#8B2607] hover:bg-[#701E05] text-white font-bold rounded-lg text-xs transition shadow"
                >
                  Confirm Reschedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Confirmation Popover / Dialog for Delete Actions */}
      {deleteConfirmation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-stone-200 space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center text-xl font-bold mx-auto">
              ⚠️
            </div>

            <div>
              <h3 className="text-base font-bold text-stone-900">{deleteConfirmation.title}</h3>
              <p className="text-xs text-stone-500 mt-1">This action cannot be undone.</p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setDeleteConfirmation(null)}
                className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold rounded-lg text-xs transition flex-1"
              >
                Keep Record
              </button>
              <button
                onClick={() => {
                  if (deleteConfirmation.type === 'booking') {
                    handleDeleteBooking(deleteConfirmation.id);
                  } else {
                    handleDeleteMember(deleteConfirmation.id);
                  }
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg text-xs transition shadow flex-1"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}