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
      <div className="min-h-screen bg-[#140C08] contact-mandala-bg flex flex-col items-center justify-center p-4 text-[#F8F4EC]">
        <div className="relative flex items-center justify-center mb-4">
          <div className="w-16 h-16 border-4 border-[#D4A017]/20 border-t-[#D4A017] rounded-full animate-spin"></div>
          <span className="absolute text-xl">🙏</span>
        </div>
        <h2 className="text-2xl font-serif font-bold shimmer-gold animate-pulse">
          Jai Shree Shyam
        </h2>
        <p className="text-sm text-stone-300/80 mt-1 font-light">Verifying administrative credentials & loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#140C08] contact-mandala-bg text-[#F8F4EC] font-sans pb-16 relative overflow-hidden">
      
      {/* Toast Notification Container */}
      <div className="fixed top-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`pointer-events-auto px-4 py-3 rounded-xl shadow-2xl border text-sm font-medium flex items-center justify-between transition-all duration-300 backdrop-blur-md ${
              toast.type === 'success'
                ? 'bg-emerald-950/90 text-emerald-200 border-emerald-500/50'
                : toast.type === 'error'
                ? 'bg-red-950/90 text-red-200 border-red-500/50'
                : 'bg-[#1C120C]/90 text-amber-200 border-[#D4A017]/40'
            }`}
          >
            <span>{toast.message}</span>
            <button
              onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
              className="ml-3 text-xs opacity-70 hover:opacity-100 cursor-pointer"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      {/* Hero Header & Devotional Banner */}
      <header className="relative bg-gradient-to-r from-[#1C120C] via-[#2A1A10] to-[#140C08] text-[#F8F4EC] shadow-2xl border-b border-[#D4A017]/30">
        
        {/* Soft Ambient Orbs */}
        <div className="absolute top-0 right-1/4 w-[500px] h-[300px] bg-[#D4A017]/10 blur-3xl rounded-full pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 relative z-10">
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            
            {/* Left Section: Text Content & Title */}
            <div className="space-y-4 text-left">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#D4A017]/15 border border-[#D4A017]/35 text-[#D4A017] text-xs font-semibold tracking-widest uppercase backdrop-blur-md">
                <span>✨</span>
                <span>JAI SHREE SHYAM</span>
                <span>✨</span>
              </div>
              
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-bold text-[#F8F4EC] tracking-tight leading-tight">
                <span className="shimmer-gold">Shyam Bhajan Seva</span>
                <span className="block text-2xl sm:text-3xl text-amber-200/90 font-sans font-light mt-1">
                  Mandal & Event Admin Portal
                </span>
              </h1>

              <p className="text-stone-300/90 text-sm sm:text-base max-w-xl leading-relaxed font-light">
                Seamlessly manage bhajan event requests, roster schedules, mandal member duties, and host communications with full administrative control.
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  onClick={() => setRefreshTrigger(prev => prev + 1)}
                  className="px-5 py-2.5 rounded-xl bg-[#D4A017] text-[#2A1A10] font-bold text-xs sm:text-sm shadow-xl hover:bg-[#C77A1A] hover:text-white transition-all duration-300 flex items-center gap-2 animate-pulse-gold cursor-pointer"
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
                  className="px-5 py-2.5 rounded-xl bg-[#1C120C]/80 hover:bg-[#241710] border border-[#D4A017]/30 text-[#F8F4EC] text-xs sm:text-sm font-semibold hover:border-[#D4A017] transition-all flex items-center gap-2 shadow-lg cursor-pointer"
                >
                  <svg className="w-4 h-4 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Exit Session
                </button>
              </div>
            </div>

            {/* Right Section: Artwork & Frame Display */}
            <div className="relative flex justify-center lg:justify-end">
              <div className="relative group w-full max-w-sm sm:max-w-md h-64 sm:h-72 rounded-3xl overflow-hidden shadow-2xl border-2 border-[#D4A017]/40 bg-[#140C08]">
                
                {/* Glow Radial Aura Effect */}
                <div className="absolute inset-0 bg-radial from-[#D4A017]/20 via-amber-900/10 to-transparent pointer-events-none"></div>

                {/* Kanhaji Artwork */}
                <img
                  src="/gallery/krishnaji.png"
                  alt="Kanhaji Divine Artwork"
                  className="w-full h-full object-cover object-top transition-transform duration-700 group-hover:scale-105"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />

                {/* Edge Fading Mask Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#140C08]/90 via-transparent to-transparent"></div>
                <div className="absolute inset-0 bg-gradient-to-r from-[#140C08]/60 via-transparent to-transparent"></div>

                <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end text-[#F8F4EC]">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-[#D4A017]">Jay Shree Khatu Shyam Ji</p>
                    <p className="text-sm font-serif italic text-stone-300">Haare Ka Sahara, Baba Shyam Hamara</p>
                  </div>
                  <span className="text-2xl animate-pulse">🌸</span>
                </div>
              </div>
            </div>

          </div>

        </div>
      </header>

      {/* Main Dashboard Body Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10 space-y-10 relative z-10">

        {/* 1. TOP SECTION: 4-Column Stats Overview Header */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
          
          {/* Card 1: Total Requests */}
          <div className="glass-devotional-card p-5 rounded-2xl border border-[#D4A017]/25 shadow-xl flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-amber-200/80">Total Requests</p>
              <h3 className="text-3xl font-serif font-bold text-[#F8F4EC] mt-1">{stats.total}</h3>
              <p className="text-xs text-stone-400 mt-1 font-light">All time bookings</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-[#D4A017]/15 text-[#D4A017] flex items-center justify-center text-xl font-bold border border-[#D4A017]/35 shadow-inner">
              📋
            </div>
          </div>

          {/* Card 2: Pending Approval */}
          <div className="glass-devotional-card p-5 rounded-2xl border border-amber-500/35 shadow-xl flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-amber-400">Pending Approval</p>
              <h3 className="text-3xl font-serif font-bold text-amber-300 mt-1">{stats.pending}</h3>
              <p className="text-xs text-amber-200/70 mt-1 font-light">Requires admin review</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center text-xl font-bold border border-amber-400/40 shadow-inner">
              ⏳
            </div>
          </div>

          {/* Card 3: Approved Events */}
          <div className="glass-devotional-card p-5 rounded-2xl border border-emerald-500/35 shadow-xl flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-400">Approved Events</p>
              <h3 className="text-3xl font-serif font-bold text-emerald-300 mt-1">{stats.approved}</h3>
              <p className="text-xs text-emerald-200/70 mt-1 font-light">Confirmed bhajan dates</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center text-xl font-bold border border-emerald-400/40 shadow-inner">
              ✅
            </div>
          </div>

          {/* Card 4: Active Mandal Members */}
          <div className="glass-devotional-card p-5 rounded-2xl border border-indigo-500/35 shadow-xl flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-indigo-300">Active Members</p>
              <h3 className="text-3xl font-serif font-bold text-indigo-200 mt-1">{stats.activeMembers}</h3>
              <p className="text-xs text-indigo-200/70 mt-1 font-light">On-call performers</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-indigo-500/20 text-indigo-300 flex items-center justify-center text-xl font-bold border border-indigo-400/40 shadow-inner">
              🎵
            </div>
          </div>

        </section>

        {/* 2. 2-COLUMN RESPONSIVE LAYOUT: 65% Left (Event Requests) / 35% Right (Active Roster) */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* LEFT COLUMN: 65% Width -> Incoming Event Requests Table */}
          <div className="lg:col-span-7 xl:col-span-8 space-y-6">
            
            <div className="glass-devotional-card rounded-3xl shadow-2xl border border-[#D4A017]/30 overflow-hidden">
              
              {/* Table Header & Controls Bar */}
              <div className="p-6 border-b border-[#D4A017]/20 bg-[#140C08]/70 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-serif font-bold text-[#F8F4EC] flex items-center gap-2">
                      <span>🚩</span> <span className="shimmer-gold">Incoming Event Requests</span>
                    </h2>
                    <p className="text-xs text-stone-300/80 mt-0.5 font-light">
                      Review, approve, reschedule, or manage host booking requests.
                    </p>
                  </div>

                  <span className="text-xs font-semibold px-3 py-1 rounded-full bg-[#D4A017]/15 text-[#D4A017] border border-[#D4A017]/30 self-start sm:self-auto">
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
                      className="w-full pl-9 pr-4 py-2.5 border border-[#D4A017]/30 rounded-xl text-sm bg-[#140C08] text-[#F8F4EC] focus:outline-none focus:ring-2 focus:ring-[#D4A017] placeholder-stone-500 transition shadow-inner"
                    />
                    <svg className="w-4 h-4 text-stone-400 absolute left-3 top-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    {searchTerm && (
                      <button onClick={() => setSearchTerm('')} className="absolute right-3 top-3 text-xs text-stone-400 hover:text-[#F8F4EC]">
                        ✕
                      </button>
                    )}
                  </div>

                  {/* Filter Pills */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                    {['All', 'Pending', 'Approved', 'Rescheduled', 'Rejected'].map(status => (
                      <button
                        key={status}
                        onClick={() => setStatusFilter(status)}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                          statusFilter === status
                            ? 'bg-[#D4A017] text-[#2A1A10] shadow-md'
                            : 'bg-[#140C08] text-stone-300 border border-[#D4A017]/20 hover:border-[#D4A017]/50'
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
                    <tr className="bg-[#140C08]/90 text-[#D4A017] font-bold border-b border-[#D4A017]/25 text-xs uppercase tracking-wider">
                      <th className="py-4 px-4">Host Name</th>
                      <th className="py-4 px-4">Date</th>
                      <th className="py-4 px-4">Contact</th>
                      <th className="py-4 px-4">Address / Location</th>
                      <th className="py-4 px-4">Status</th>
                      <th className="py-4 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#D4A017]/15">
                    {filteredBookings.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-stone-400">
                          <div className="flex flex-col items-center justify-center space-y-2">
                            <span className="text-3xl">📭</span>
                            <p className="font-semibold text-[#F8F4EC]">No booking requests found</p>
                            <p className="text-xs text-stone-400 font-light">
                              {searchTerm || statusFilter !== 'All'
                                ? 'Try adjusting your search terms or filter selection.'
                                : 'New event requests submitted by devotees will appear here.'}
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredBookings.map(b => (
                        <tr key={b.id} className="hover:bg-[#241710]/70 transition-colors">
                          
                          {/* Host Name */}
                          <td className="py-4 px-4">
                            <div className="font-bold text-[#F8F4EC]">{b.full_name}</div>
                            {b.alt_phone && (
                              <div className="text-[11px] text-stone-400">Alt: {b.alt_phone}</div>
                            )}
                          </td>

                          {/* Requested Date */}
                          <td className="py-4 px-4 whitespace-nowrap">
                            <span className="font-semibold text-amber-200 bg-[#140C08] border border-[#D4A017]/30 px-2.5 py-1 rounded-lg text-xs">
                              {b.booking_date}
                            </span>
                          </td>

                          {/* Phone Contact */}
                          <td className="py-4 px-4 whitespace-nowrap text-stone-300">
                            <a href={`tel:${b.phone}`} className="hover:text-[#D4A017] hover:underline flex items-center gap-1 font-mono text-xs">
                              <span>📞</span> {b.phone}
                            </a>
                          </td>

                          {/* Location/Address */}
                          <td className="py-4 px-4 text-stone-300 max-w-xs truncate font-light" title={b.address}>
                            {b.address}
                          </td>

                          {/* Status Badge */}
                          <td className="py-4 px-4 whitespace-nowrap">
                            {b.status === 'Pending' && (
                              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-400/40 inline-flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping"></span>
                                Pending
                              </span>
                            )}
                            {b.status === 'Approved' && (
                              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 inline-flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                                Approved
                              </span>
                            )}
                            {b.status === 'Rescheduled' && (
                              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-400/40 inline-flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
                                Rescheduled
                              </span>
                            )}
                            {b.status === 'Rejected' && (
                              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-400/40 inline-flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                                Rejected
                              </span>
                            )}
                          </td>

                          {/* Action Buttons */}
                          <td className="py-4 px-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              
                              {/* Pending Specific Actions */}
                              {b.status === 'Pending' && (
                                <>
                                  <button
                                    disabled={actionLoadingId === b.id}
                                    onClick={() => handleStatusChange(b.id, 'Approved')}
                                    className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs px-3 py-1.5 rounded-lg font-bold shadow-md transition active:scale-95 disabled:opacity-50 cursor-pointer"
                                  >
                                    Approve
                                  </button>

                                  <button
                                    onClick={() => {
                                      setRescheduleBooking(b);
                                      setNewRescheduleDate(b.booking_date);
                                    }}
                                    className="bg-[#140C08] border border-[#D4A017]/30 text-stone-200 hover:border-[#D4A017] hover:text-white text-xs px-2.5 py-1.5 rounded-lg font-semibold transition cursor-pointer"
                                  >
                                    Reschedule
                                  </button>

                                  <button
                                    onClick={() => setDeleteConfirmation({
                                      type: 'booking',
                                      id: b.id,
                                      title: `Reject booking for ${b.full_name}?`
                                    })}
                                    className="bg-rose-950/60 text-rose-300 hover:bg-rose-900 border border-rose-500/40 text-xs px-2.5 py-1.5 rounded-lg font-semibold transition cursor-pointer"
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
                                    className="bg-[#140C08] hover:bg-[#241710] text-amber-200 border border-[#D4A017]/30 text-xs px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer"
                                  >
                                    View Details
                                  </button>

                                  <button
                                    onClick={() => setDeleteConfirmation({
                                      type: 'booking',
                                      id: b.id,
                                      title: `Cancel & remove approved booking for ${b.full_name}?`
                                    })}
                                    className="bg-rose-950/60 text-rose-300 hover:bg-rose-900 border border-rose-500/40 text-xs px-2.5 py-1.5 rounded-lg font-semibold transition cursor-pointer"
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
                                    className="bg-[#140C08] hover:bg-[#241710] text-amber-200 border border-[#D4A017]/30 text-xs px-2.5 py-1.5 rounded-lg font-semibold transition cursor-pointer"
                                  >
                                    Details
                                  </button>

                                  <button
                                    onClick={() => setDeleteConfirmation({
                                      type: 'booking',
                                      id: b.id,
                                      title: `Delete record for ${b.full_name}?`
                                    })}
                                    className="text-stone-400 hover:text-rose-400 p-1.5 rounded hover:bg-rose-950/40 transition cursor-pointer"
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

          {/* RIGHT COLUMN: 35% Width -> Active Roster & Member Management */}
          <div className="lg:col-span-5 xl:col-span-4 space-y-6">
            
            {/* Form: Add New Member */}
            <div className="glass-devotional-card p-6 rounded-3xl shadow-2xl border border-[#D4A017]/30 space-y-4">
              <div className="border-b border-[#D4A017]/20 pb-3">
                <h2 className="text-lg font-serif font-bold text-[#F8F4EC] flex items-center gap-2">
                  <span>👤</span> <span className="shimmer-gold">Add Mandal Member</span>
                </h2>
                <p className="text-xs text-stone-300/80 font-light">Register new performers, singers, or instrument artists.</p>
              </div>

              <form onSubmit={handleAddMember} className="space-y-4">
                
                {/* Member Name */}
                <div>
                  <label className="block text-xs font-semibold text-stone-200 mb-1 uppercase tracking-wider">
                    Full Name <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Rajesh Sharma"
                    value={newMember.name}
                    onChange={e => setNewMember({ ...newMember, name: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-[#D4A017]/30 rounded-xl text-sm bg-[#140C08] text-[#F8F4EC] focus:outline-none focus:ring-2 focus:ring-[#D4A017] placeholder-stone-500 transition shadow-inner"
                  />
                </div>

                {/* Contact Phone */}
                <div>
                  <label className="block text-xs font-semibold text-stone-200 mb-1 uppercase tracking-wider">
                    Contact Phone (10 Digits) <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    placeholder="e.g., 9876543210"
                    value={newMember.phone}
                    onChange={e => setNewMember({ ...newMember, phone: e.target.value.replace(/\D/g, '') })}
                    className="w-full px-3.5 py-2.5 border border-[#D4A017]/30 rounded-xl text-sm bg-[#140C08] text-[#F8F4EC] focus:outline-none focus:ring-2 focus:ring-[#D4A017] placeholder-stone-500 transition shadow-inner font-mono"
                  />
                </div>

                {/* Role Dropdown */}
                <div>
                  <label className="block text-xs font-semibold text-stone-200 mb-1 uppercase tracking-wider">
                    Mandal Duty / Role <span className="text-rose-400">*</span>
                  </label>
                  <select
                    value={newMember.role}
                    onChange={e => setNewMember({ ...newMember, role: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-[#D4A017]/30 rounded-xl text-sm bg-[#140C08] text-[#F8F4EC] focus:outline-none focus:ring-2 focus:ring-[#D4A017] transition shadow-inner cursor-pointer"
                  >
                    {MANDAL_ROLES.map(role => (
                      <option key={role} value={role} className="bg-[#140C08] text-[#F8F4EC]">{role}</option>
                    ))}
                  </select>
                </div>

                {/* Custom Role Input if 'Other / Custom' selected */}
                {newMember.role === 'Other / Custom' && (
                  <div>
                    <label className="block text-xs font-semibold text-stone-200 mb-1 uppercase tracking-wider">Specify Role Title</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g., Keyboardist / Flutist"
                      value={newMember.customRole}
                      onChange={e => setNewMember({ ...newMember, customRole: e.target.value })}
                      className="w-full px-3.5 py-2.5 border border-[#D4A017]/30 rounded-xl text-sm bg-[#140C08] text-[#F8F4EC] focus:outline-none focus:ring-2 focus:ring-[#D4A017] placeholder-stone-500 transition shadow-inner"
                    />
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={addingMember}
                  className="w-full bg-[#D4A017] text-[#2A1A10] hover:bg-[#C77A1A] hover:text-white font-bold py-3 px-4 rounded-xl text-sm shadow-xl transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-60 active:scale-98 cursor-pointer animate-pulse-gold"
                >
                  {addingMember ? (
                    <>
                      <div className="w-4 h-4 border-2 border-[#2A1A10]/30 border-t-[#2A1A10] rounded-full animate-spin"></div>
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
            <div className="glass-devotional-card p-6 rounded-3xl shadow-2xl border border-[#D4A017]/30 space-y-4">
              <div className="flex items-center justify-between border-b border-[#D4A017]/20 pb-3">
                <h2 className="text-lg font-serif font-bold text-[#F8F4EC] flex items-center gap-2">
                  <span>🪕</span> <span className="shimmer-gold">Active Roster</span>
                </h2>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#D4A017]/20 text-[#D4A017] border border-[#D4A017]/40">
                  {members.length} Members
                </span>
              </div>

              {members.length === 0 ? (
                <div className="py-8 text-center text-stone-400">
                  <p className="text-sm font-semibold">No active members registered</p>
                  <p className="text-xs text-stone-400 mt-1 font-light">Use the form above to build your mandal team roster.</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                  {members.map(member => (
                    <div
                      key={member.id}
                      className="p-3.5 bg-[#140C08]/80 rounded-2xl border border-[#D4A017]/20 hover:border-[#D4A017]/50 hover:bg-[#241710] transition-all flex items-center justify-between group shadow-sm"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-[#F8F4EC] text-sm">{member.name}</p>
                          <span className="bg-[#D4A017]/20 text-[#D4A017] text-[10px] font-bold px-2 py-0.5 rounded-full border border-[#D4A017]/35">
                            {member.role}
                          </span>
                        </div>
                        <p className="text-xs font-mono text-stone-300 flex items-center gap-1 font-light">
                          <span>📞</span> {member.phone}
                        </p>
                      </div>

                      {/* Remove Member Button */}
                      <button
                        onClick={() => setDeleteConfirmation({
                          type: 'member',
                          id: member.id,
                          title: `Remove ${member.name} from active roster?`
                        })}
                        className="text-stone-400 hover:text-rose-400 hover:bg-rose-950/40 p-2 rounded-lg transition-colors cursor-pointer"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="glass-devotional-card rounded-3xl max-w-lg w-full p-7 shadow-2xl border border-[#D4A017]/40 text-[#F8F4EC] space-y-5 relative">
            <button
              onClick={() => setSelectedBooking(null)}
              className="absolute top-4 right-4 text-stone-400 hover:text-[#F8F4EC] text-lg font-bold w-8 h-8 rounded-full flex items-center justify-center hover:bg-[#241710] transition-colors cursor-pointer"
            >
              ✕
            </button>

            <div className="border-b border-[#D4A017]/20 pb-3">
              <span className="text-xs font-bold text-[#D4A017] uppercase tracking-wider">Event Details</span>
              <h3 className="text-xl font-serif font-bold text-[#F8F4EC] mt-0.5">{selectedBooking.full_name}</h3>
            </div>

            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3 bg-[#140C08] p-3.5 rounded-xl border border-[#D4A017]/25">
                <div>
                  <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider">Requested Date</p>
                  <p className="font-bold text-amber-200 mt-0.5">{selectedBooking.booking_date}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider">Current Status</p>
                  <p className="font-bold text-[#F8F4EC] mt-0.5">{selectedBooking.status}</p>
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider">Primary Contact Phone</p>
                <p className="font-mono text-stone-200 mt-0.5">{selectedBooking.phone}</p>
              </div>

              {selectedBooking.alt_phone && (
                <div>
                  <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider">Alternate Phone</p>
                  <p className="font-mono text-stone-200 mt-0.5">{selectedBooking.alt_phone}</p>
                </div>
              )}

              <div>
                <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider">Event Address / Location</p>
                <p className="text-stone-200 mt-0.5 bg-[#140C08] p-3.5 rounded-xl border border-[#D4A017]/25 leading-relaxed whitespace-pre-wrap font-light">
                  {selectedBooking.address}
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#D4A017]/20">
              <button
                onClick={() => setSelectedBooking(null)}
                className="px-4 py-2 bg-[#140C08] hover:bg-[#241710] text-[#F8F4EC] border border-[#D4A017]/30 font-semibold rounded-xl text-xs transition cursor-pointer"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Reschedule Date Picker */}
      {rescheduleBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="glass-devotional-card rounded-3xl max-w-md w-full p-7 shadow-2xl border border-[#D4A017]/40 text-[#F8F4EC] space-y-5 relative">
            <button
              onClick={() => setRescheduleBooking(null)}
              className="absolute top-4 right-4 text-stone-400 hover:text-[#F8F4EC] font-bold w-8 h-8 rounded-full flex items-center justify-center hover:bg-[#241710] transition-colors cursor-pointer"
            >
              ✕
            </button>

            <div>
              <h3 className="text-xl font-serif font-bold text-[#D4A017]">Reschedule Event</h3>
              <p className="text-xs text-stone-300/80 font-light mt-1">Select a new date for {rescheduleBooking.full_name}'s bhajan seva.</p>
            </div>

            <form onSubmit={handleRescheduleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-stone-200 mb-1.5 uppercase tracking-wider">New Event Date</label>
                <input
                  type="date"
                  required
                  value={newRescheduleDate}
                  onChange={e => setNewRescheduleDate(e.target.value)}
                  className="w-full p-3 border border-[#D4A017]/30 rounded-xl text-sm bg-[#140C08] text-[#F8F4EC] focus:outline-none focus:ring-2 focus:ring-[#D4A017]"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setRescheduleBooking(null)}
                  className="px-4 py-2.5 bg-[#140C08] hover:bg-[#241710] text-[#F8F4EC] border border-[#D4A017]/30 font-semibold rounded-xl text-xs transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#D4A017] text-[#2A1A10] hover:bg-[#C77A1A] hover:text-white font-bold rounded-xl text-xs transition shadow-lg cursor-pointer"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="glass-devotional-card rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-[#D4A017]/40 text-[#F8F4EC] space-y-4 text-center">
            <div className="w-14 h-14 rounded-2xl bg-rose-950/80 border border-rose-500/40 text-rose-300 flex items-center justify-center text-2xl font-bold mx-auto shadow-md">
              ⚠️
            </div>

            <div>
              <h3 className="text-base font-bold text-[#F8F4EC]">{deleteConfirmation.title}</h3>
              <p className="text-xs text-stone-400 mt-1 font-light">This action cannot be undone.</p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setDeleteConfirmation(null)}
                className="px-4 py-2.5 bg-[#140C08] hover:bg-[#241710] text-[#F8F4EC] border border-[#D4A017]/30 font-semibold rounded-xl text-xs transition flex-1 cursor-pointer"
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
                className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs transition shadow-lg flex-1 cursor-pointer"
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