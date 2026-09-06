'use client';

import { API_BASE_URL } from '../config';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';

interface Booking {
  id: number;
  full_name: string;
  phone: string;
  alt_phone?: string;
  address: string;
  booking_date: string;
  status: string;
}

interface MandalMember {
  id: number;
  name: string;
  phone: string;
  role: string;
}

interface AdminUser {
  id: number;
  full_name: string;
  username?: string;
  phone_number: string;
  email?: string;
  role: string;
  is_active: boolean;
  must_change_password: boolean;
  last_login?: string;
  created_at: string;
  created_by?: string;
}

interface AuditLog {
  id: number;
  timestamp: string;
  user_username: string;
  action: string;
  details: string;
  ip_address: string;
}

interface MandalSettings {
  id: number;
  mandal_name: string;
  whatsapp_contact: string;
  admin_notification_numbers: string;
  booking_auto_reply_template: string;
  website_contact_numbers: string;
}

// Relative "Time Ago" helper with UTC timezone awareness
function formatTimeAgo(dateString?: string) {
  if (!dateString) return 'Never';

  let isoStr = dateString.trim();
  if (!isoStr.endsWith('Z') && !isoStr.includes('+')) {
    isoStr = isoStr + 'Z';
  }

  const date = new Date(isoStr);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 10 || seconds < 0) return 'Just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return date.toLocaleDateString();
}

export default function AdminDashboard() {
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(null);
  const [activeTab, setActiveTab] = useState<'bookings' | 'roster' | 'admins' | 'settings' | 'audit'>('bookings');

  // Bookings & Roster State
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [members, setMembers] = useState<MandalMember[]>([]);

  // Admin Management State
  const [adminsList, setAdminsList] = useState<AdminUser[]>([]);
  const [showAddAdminModal, setShowAddAdminModal] = useState(false);
  const [newAdminName, setNewAdminName] = useState('');
  const [newAdminPhone, setNewAdminPhone] = useState('');
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminRole, setNewAdminRole] = useState('admin');

  // Newly Generated Invite Link Modal
  const [createdInviteResult, setCreatedInviteResult] = useState<{ invite_link: string } | null>(null);

  // Dynamic Settings State
  const [mandalSettings, setMandalSettings] = useState<MandalSettings | null>(null);
  const [settingsMsg, setSettingsMsg] = useState('');

  // Security Audit Logs State
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [auditSearch, setAuditSearch] = useState('');

  // UI & Filter States
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [newMember, setNewMember] = useState({ name: '', phone: '', role: 'Lead Bhajan Singer' });

  useEffect(() => {
    fetchProfile();
    fetchBookings();
    fetchMembers();
    fetchSettings();
  }, []);

  useEffect(() => {
    if (currentUser?.role === 'super_admin') {
      if (activeTab === 'admins') fetchAdmins();
      if (activeTab === 'settings') fetchSettings();
      if (activeTab === 'audit') fetchAuditLogs();
    }
  }, [activeTab, currentUser]);

  const getAuthHeaders = (): Record<string, string> => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  };

  const fetchProfile = async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;
    if (!token) {
      if (typeof window !== 'undefined') window.location.href = '/login';
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/me`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setCurrentUser(data);
      } else {
        if (typeof window !== 'undefined') localStorage.removeItem('admin_token');
        window.location.href = '/login';
      }
    } catch {
      if (typeof window !== 'undefined') localStorage.removeItem('admin_token');
      window.location.href = '/login';
    }
  };

  const fetchBookings = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/bookings`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setBookings(data);
      }
    } catch (err) {
      console.error('Failed to fetch bookings:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMembers = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/members`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setMembers(data);
      }
    } catch (err) {
      console.error('Failed to fetch members:', err);
    }
  };

  const fetchAdmins = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/admins`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setAdminsList(data);
      }
    } catch (err) {
      console.error('Failed to fetch admins list:', err);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/settings`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setMandalSettings(data);
      }
    } catch (err) {
      console.error('Failed to fetch settings:', err);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/audit`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(data);
      }
    } catch (err) {
      console.error('Failed to fetch audit logs:', err);
    }
  };

  const handleUpdateStatus = async (id: number, newStatus: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/bookings/${id}/status?status_str=${newStatus}`, {
        method: 'PATCH',
        headers: getAuthHeaders()
      });
      if (res.ok) {
        fetchBookings();
      }
    } catch (err) {
      alert('Failed to update booking status');
    }
  };

  const handleDeleteBooking = async (id: number) => {
    if (!confirm('Are you sure you want to delete this booking request?')) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/bookings/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      if (res.ok) {
        fetchBookings();
      }
    } catch (err) {
      alert('Failed to delete booking');
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE_URL}/api/members`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(newMember)
      });
      if (res.ok) {
        setNewMember({ name: '', phone: '', role: 'Lead Bhajan Singer' });
        fetchMembers();
      }
    } catch (err) {
      alert('Failed to add member');
    }
  };

  const handleDeleteMember = async (id: number) => {
    if (!confirm('Remove member from active mandal roster?')) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/members/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      if (res.ok) {
        fetchMembers();
      }
    } catch (err) {
      alert('Failed to remove member');
    }
  };

  const handleInviteAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE_URL}/api/admins/invite`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          full_name: newAdminName,
          phone_number: newAdminPhone,
          email: newAdminEmail || undefined,
          role: newAdminRole
        })
      });

      const data = await res.json();
      if (res.ok) {
        setCreatedInviteResult({ invite_link: data.invite_link });
        setShowAddAdminModal(false);
        setNewAdminName('');
        setNewAdminPhone('');
        setNewAdminEmail('');
        fetchAdmins();
      } else {
        alert(data.detail || 'Failed to generate Admin invite');
      }
    } catch (err) {
      alert('Network error creating Admin invite');
    }
  };

  const handleToggleAdminStatus = async (admin: AdminUser) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/admins/${admin.id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ is_active: !admin.is_active })
      });
      if (res.ok) fetchAdmins();
    } catch (err) {
      alert('Failed to toggle admin status');
    }
  };

  const handleResetAdminPassword = async (admin: AdminUser) => {
    if (!confirm(`Send password reset invite link to '${admin.username || admin.full_name}' via WhatsApp?`)) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/admins/${admin.id}/reset-password`, {
        method: 'POST',
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (res.ok) {
        setCreatedInviteResult({ invite_link: data.invite_link });
      }
    } catch (err) {
      alert('Failed to reset password');
    }
  };

  const handleDeleteAdmin = async (admin: AdminUser) => {
    if (!confirm(`Soft delete admin account '${admin.username || admin.full_name}'?`)) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/admins/${admin.id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      if (res.ok) fetchAdmins();
    } catch (err) {
      alert('Failed to delete admin');
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mandalSettings) return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/settings`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          mandal_name: mandalSettings.mandal_name,
          whatsapp_contact: mandalSettings.whatsapp_contact,
          admin_notification_numbers: mandalSettings.admin_notification_numbers,
          booking_auto_reply_template: mandalSettings.booking_auto_reply_template,
          website_contact_numbers: mandalSettings.website_contact_numbers
        })
      });
      if (res.ok) {
        setSettingsMsg('Mandal configuration & templates saved successfully.');
        setTimeout(() => setSettingsMsg(''), 4000);
      }
    } catch (err) {
      alert('Failed to save settings');
    }
  };

  const handleLogout = async () => {
    if (typeof window !== 'undefined') localStorage.removeItem('admin_token');
    await fetch(`${API_BASE_URL}/api/auth/logout`, { method: 'POST', headers: getAuthHeaders() });
    window.location.href = '/login';
  };

  const filteredBookings = bookings.filter(b => {
    const matchesStatus = filterStatus === 'All' || b.status === filterStatus;
    const matchesSearch = b.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          b.phone.includes(searchTerm) ||
                          b.address.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const filteredAuditLogs = auditLogs.filter(log =>
    log.user_username.toLowerCase().includes(auditSearch.toLowerCase()) ||
    log.action.toLowerCase().includes(auditSearch.toLowerCase()) ||
    log.details.toLowerCase().includes(auditSearch.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#140C08] text-[#F8FAFC] font-sans antialiased">
      
      {/* ── ENTERPRISE TOP NAVIGATION ────────────────────────────────────────────── */}
      <header className="border-b border-white/10 bg-[#1A100B]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            
            {/* Left Brand Identifier */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full border border-amber-500/40 overflow-hidden bg-[#140C08] relative shrink-0">
                <Image
                  src="/gallery/krishnaji.png"
                  alt="Mandal Logo"
                  fill
                  className="object-cover"
                />
              </div>
              <div>
                <h1 className="text-sm font-semibold text-[#F8FAFC] tracking-tight">
                  {mandalSettings?.mandal_name || 'Shree Nishan Yatra Parivar'}
                </h1>
                <p className="text-[11px] text-[#A89F91]">Management Console</p>
              </div>
            </div>

            {/* Right Profile & Actions */}
            <div className="flex items-center gap-3">
              <span className="hidden sm:inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                {currentUser?.role === 'super_admin' ? 'Super Admin' : 'Admin'}
              </span>

              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-[#D6C7B2]">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                <span className="font-mono text-white">{currentUser?.full_name}</span>
                {currentUser?.username && (
                  <span className="text-[#A89F91]">(@{currentUser.username})</span>
                )}
              </div>

              <button
                onClick={handleLogout}
                className="px-3 py-1.5 rounded-lg border border-white/10 text-xs font-medium text-stone-300 hover:text-white hover:bg-white/5 hover:border-white/20 transition-all flex items-center gap-1.5"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span>Logout</span>
              </button>
            </div>

          </div>

          {/* Sub-Navigation Enterprise Tab Strip */}
          <nav className="-mb-px flex space-x-8 border-t border-white/5 pt-1">
            <button
              onClick={() => setActiveTab('bookings')}
              className={`py-3 px-1 border-b-2 text-xs font-medium transition-colors flex items-center gap-2 ${
                activeTab === 'bookings'
                  ? 'border-amber-500 text-amber-400'
                  : 'border-transparent text-[#A89F91] hover:text-[#D6C7B2] hover:border-white/20'
              }`}
            >
              <span>Event Requests</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
                activeTab === 'bookings' ? 'bg-amber-500/20 text-amber-300' : 'bg-white/5 text-[#A89F91]'
              }`}>
                {bookings.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('roster')}
              className={`py-3 px-1 border-b-2 text-xs font-medium transition-colors flex items-center gap-2 ${
                activeTab === 'roster'
                  ? 'border-amber-500 text-amber-400'
                  : 'border-transparent text-[#A89F91] hover:text-[#D6C7B2] hover:border-white/20'
              }`}
            >
              <span>Active Roster</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
                activeTab === 'roster' ? 'bg-amber-500/20 text-amber-300' : 'bg-white/5 text-[#A89F91]'
              }`}>
                {members.length}
              </span>
            </button>

            {currentUser?.role === 'super_admin' && (
              <>
                <button
                  onClick={() => setActiveTab('admins')}
                  className={`py-3 px-1 border-b-2 text-xs font-medium transition-colors flex items-center gap-2 ${
                    activeTab === 'admins'
                      ? 'border-amber-500 text-amber-400'
                      : 'border-transparent text-[#A89F91] hover:text-[#D6C7B2] hover:border-white/20'
                  }`}
                >
                  <span>Admin Management</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
                    activeTab === 'admins' ? 'bg-amber-500/20 text-amber-300' : 'bg-white/5 text-[#A89F91]'
                  }`}>
                    {adminsList.length}
                  </span>
                </button>

                <button
                  onClick={() => setActiveTab('settings')}
                  className={`py-3 px-1 border-b-2 text-xs font-medium transition-colors ${
                    activeTab === 'settings'
                      ? 'border-amber-500 text-amber-400'
                      : 'border-transparent text-[#A89F91] hover:text-[#D6C7B2] hover:border-white/20'
                  }`}
                >
                  <span>Mandal Settings</span>
                </button>

                <button
                  onClick={() => setActiveTab('audit')}
                  className={`py-3 px-1 border-b-2 text-xs font-medium transition-colors ${
                    activeTab === 'audit'
                      ? 'border-amber-500 text-amber-400'
                      : 'border-transparent text-[#A89F91] hover:text-[#D6C7B2] hover:border-white/20'
                  }`}
                >
                  <span>Security Audit Logs</span>
                </button>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* ── MAIN CONTENT AREA ────────────────────────────────────────────────────── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* ── TAB 1: BOOKING REQUESTS MANAGEMENT ────────────────────────────── */}
        {activeTab === 'bookings' && (
          <div className="space-y-6">
            
            {/* Header & Controls Toolbar */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/[0.02] p-4 rounded-xl border border-white/10">
              
              {/* Search Bar */}
              <div className="relative w-full sm:w-80">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#A89F91]">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Search by Host, Phone, or Address..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-[#1C120C] border border-white/10 text-white placeholder-[#A89F91] rounded-lg text-xs outline-none focus:ring-1 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all"
                />
              </div>

              {/* Status Filter Tabs */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs text-[#A89F91] mr-1 hidden lg:inline">Status:</span>
                {['All', 'Pending', 'Approved', 'Rescheduled', 'Rejected'].map(st => (
                  <button
                    key={st}
                    onClick={() => setFilterStatus(st)}
                    className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                      filterStatus === st
                        ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                        : 'text-[#A89F91] hover:text-[#D6C7B2] hover:bg-white/5 border border-transparent'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {/* Clean Enterprise Data Table */}
            <div className="bg-white/[0.02] rounded-xl border border-white/10 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 bg-white/[0.02] text-xs font-semibold text-[#A89F91] uppercase tracking-wider">
                      <th className="py-3.5 px-4 font-mono">ID</th>
                      <th className="py-3.5 px-4">Host Name</th>
                      <th className="py-3.5 px-4">Preferred Date</th>
                      <th className="py-3.5 px-4">Contact Phone</th>
                      <th className="py-3.5 px-4">Event Address</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-xs">
                    {filteredBookings.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 px-4 text-center">
                          <div className="flex flex-col items-center justify-center space-y-2">
                            <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-[#A89F91]">
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            </div>
                            <p className="text-sm font-medium text-white">No booking requests found</p>
                            <p className="text-xs text-[#A89F91]">No records match your selected status or search filter.</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredBookings.map(b => (
                        <tr key={b.id} className="hover:bg-white/[0.02] transition-colors align-middle">
                          <td className="py-3.5 px-4 font-mono font-medium text-amber-400/90">#{b.id}</td>
                          <td className="py-3.5 px-4 font-medium text-white">{b.full_name}</td>
                          <td className="py-3.5 px-4 font-mono text-[#D6C7B2]">{b.booking_date}</td>
                          <td className="py-3.5 px-4 font-mono text-[#D6C7B2]">
                            <div>{b.phone}</div>
                            {b.alt_phone && <div className="text-[10px] text-[#A89F91]">Alt: {b.alt_phone}</div>}
                          </td>
                          <td className="py-3.5 px-4 text-[#D6C7B2] max-w-xs truncate">{b.address}</td>
                          <td className="py-3.5 px-4">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${
                              b.status === 'Approved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                              b.status === 'Pending' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                              b.status === 'Rescheduled' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                              'bg-rose-500/10 text-rose-400 border-rose-500/20'
                            }`}>
                              {b.status}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {b.status !== 'Approved' && (
                                <button
                                  onClick={() => handleUpdateStatus(b.id, 'Approved')}
                                  className="p-1.5 rounded-md border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 transition-all"
                                  title="Approve Booking"
                                >
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                  </svg>
                                </button>
                              )}
                              {b.status !== 'Rescheduled' && (
                                <button
                                  onClick={() => handleUpdateStatus(b.id, 'Rescheduled')}
                                  className="p-1.5 rounded-md border border-blue-500/30 text-blue-400 hover:bg-blue-500/10 transition-all"
                                  title="Mark Rescheduled"
                                >
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                  </svg>
                                </button>
                              )}
                              <button
                                onClick={() => handleDeleteBooking(b.id)}
                                className="p-1.5 rounded-md border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 transition-all"
                                title="Delete Booking"
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
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
        )}

        {/* ── TAB 2: ACTIVE MANDAL ROSTER ─────────────────────────────────────── */}
        {activeTab === 'roster' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left Add Member Form */}
            <div className="bg-white/[0.02] p-6 rounded-xl border border-white/10 h-fit space-y-4">
              <div>
                <h2 className="text-base font-semibold text-white">Add Mandal Performer</h2>
                <p className="text-xs text-[#A89F91] mt-0.5">Register active artists and volunteers into the roster.</p>
              </div>

              <form onSubmit={handleAddMember} className="space-y-4 pt-2">
                <div>
                  <label className="block text-xs font-medium text-[#D6C7B2] mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={newMember.name}
                    onChange={e => setNewMember({ ...newMember, name: e.target.value })}
                    className="w-full px-3 py-2 bg-[#1C120C] border border-white/10 text-white rounded-lg text-xs outline-none focus:ring-1 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all placeholder-[#A89F91]"
                    placeholder="e.g. Pandit Suresh Kumar"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#D6C7B2] mb-1">Phone Number *</label>
                  <input
                    type="text"
                    required
                    value={newMember.phone}
                    onChange={e => setNewMember({ ...newMember, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-[#1C120C] border border-white/10 text-white rounded-lg text-xs outline-none focus:ring-1 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all font-mono placeholder-[#A89F91]"
                    placeholder="+91 98765 43210"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#D6C7B2] mb-1">Performance Role *</label>
                  <select
                    value={newMember.role}
                    onChange={e => setNewMember({ ...newMember, role: e.target.value })}
                    className="w-full px-3 py-2 bg-[#1C120C] border border-white/10 text-white rounded-lg text-xs outline-none focus:ring-1 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all"
                  >
                    <option value="Lead Bhajan Singer">Lead Bhajan Singer</option>
                    <option value="Harmonium Master">Harmonium Master</option>
                    <option value="Dholak / Tabla Artist">Dholak / Tabla Artist</option>
                    <option value="Octapad & Chorus">Octapad & Chorus</option>
                    <option value="Organizing Volunteer">Organizing Volunteer</option>
                  </select>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-lg bg-amber-500 text-stone-950 font-semibold text-xs hover:bg-amber-400 transition-all shadow-md mt-2 flex items-center justify-center gap-1.5"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  <span>Add Member to Roster</span>
                </button>
              </form>
            </div>

            {/* Right Roster Grid */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-base font-semibold text-white">Active Mandal Roster</h2>
                <span className="text-xs text-[#A89F91] font-mono">{members.length} Total Members</span>
              </div>

              {members.length === 0 ? (
                <div className="bg-white/[0.02] p-12 rounded-xl border border-white/10 text-center">
                  <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-[#A89F91] mx-auto mb-2">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-white">No active roster members</p>
                  <p className="text-xs text-[#A89F91]">Add your first performer using the form on the left.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {members.map(m => (
                    <div key={m.id} className="bg-white/[0.02] p-4 rounded-xl border border-white/10 flex justify-between items-center hover:border-white/20 transition-all">
                      <div>
                        <h3 className="font-semibold text-sm text-white">{m.name}</h3>
                        <span className="inline-block text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20 my-1.5 font-mono">
                          {m.role}
                        </span>
                        <p className="text-xs font-mono text-[#A89F91]">{m.phone}</p>
                      </div>

                      <button
                        onClick={() => handleDeleteMember(m.id)}
                        className="p-2 border border-rose-500/30 text-rose-400 rounded-lg hover:bg-rose-500/10 transition-all"
                        title="Remove Member"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}

        {/* ── TAB 3: ADMIN MANAGEMENT WITH RELATIVE TIME & INVITE FLOW ─────────── */}
        {activeTab === 'admins' && currentUser?.role === 'super_admin' && (
          <div className="space-y-6">
            
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="text-base font-semibold text-white">Administrator Accounts</h2>
                <p className="text-xs text-[#A89F91]">Manage role-based permissions, issue WhatsApp invitations, and audit access.</p>
              </div>

              <button
                onClick={() => setShowAddAdminModal(true)}
                className="px-4 py-2 rounded-lg bg-amber-500 text-stone-950 text-xs font-semibold hover:bg-amber-400 transition-all shadow-md flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
                <span>Send WhatsApp Invite Link</span>
              </button>
            </div>

            {/* Admins Table */}
            <div className="bg-white/[0.02] rounded-xl border border-white/10 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 bg-white/[0.02] text-xs font-semibold text-[#A89F91] uppercase tracking-wider">
                      <th className="py-3.5 px-4">Admin Name</th>
                      <th className="py-3.5 px-4">Username</th>
                      <th className="py-3.5 px-4">Role</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4">Last Login</th>
                      <th className="py-3.5 px-4">Phone Number</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-xs">
                    {adminsList.map(adm => (
                      <tr key={adm.id} className="hover:bg-white/[0.02] transition-colors align-middle">
                        <td className="py-3.5 px-4 font-medium text-white">{adm.full_name}</td>
                        <td className="py-3.5 px-4 font-mono text-amber-400">
                          {adm.username ? `@${adm.username}` : <span className="text-[#A89F91] italic font-sans text-[11px]">Pending Setup</span>}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-medium border ${
                            adm.role === 'super_admin' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                            'bg-white/5 text-stone-300 border-white/10'
                          }`}>
                            {adm.role === 'super_admin' ? 'Super Admin' : 'Admin'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-medium border ${
                            adm.is_active ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          }`}>
                            {adm.is_active ? 'Active' : 'Pending Invite'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-[#D6C7B2]">
                          {formatTimeAgo(adm.last_login)}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-[#D6C7B2]">{adm.phone_number}</td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleToggleAdminStatus(adm)}
                              className="px-2.5 py-1 rounded-md border border-white/10 text-stone-300 hover:text-white hover:bg-white/5 text-xs transition-all"
                            >
                              {adm.is_active ? 'Disable' : 'Enable'}
                            </button>
                            <button
                              onClick={() => handleResetAdminPassword(adm)}
                              className="px-2.5 py-1 rounded-md border border-amber-500/30 text-amber-400 hover:bg-amber-500/10 text-xs transition-all"
                            >
                              Resend Invite
                            </button>
                            {adm.id !== currentUser.id && (
                              <button
                                onClick={() => handleDeleteAdmin(adm)}
                                className="p-1 rounded-md border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 transition-all"
                                title="Soft Delete Account"
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* ── TAB 4: DYNAMIC MANDAL SETTINGS (SUPER ADMIN ONLY) ────────────────── */}
        {activeTab === 'settings' && currentUser?.role === 'super_admin' && mandalSettings && (
          <div className="space-y-6 max-w-4xl">
            <div>
              <h2 className="text-base font-semibold text-white">Mandal System Settings</h2>
              <p className="text-xs text-[#A89F91]">
                Manage contact channels, admin notification numbers, and WhatsApp templates.
              </p>
            </div>

            {settingsMsg && (
              <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg text-xs font-medium flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span>{settingsMsg}</span>
              </div>
            )}

            <form onSubmit={handleSaveSettings} className="bg-white/[0.02] p-6 sm:p-8 rounded-xl border border-white/10 space-y-6">
              
              <div>
                <label className="block text-xs font-medium text-[#D6C7B2] mb-1.5 uppercase tracking-wider">
                  Mandal Organization Name *
                </label>
                <input
                  type="text"
                  required
                  value={mandalSettings.mandal_name}
                  onChange={e => setMandalSettings({ ...mandalSettings, mandal_name: e.target.value })}
                  className="w-full px-4 py-2.5 bg-[#1C120C] border border-white/10 text-white rounded-lg text-xs outline-none focus:ring-1 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-medium text-[#D6C7B2] mb-1.5 uppercase tracking-wider">
                    Primary WhatsApp Contact *
                  </label>
                  <input
                    type="text"
                    required
                    value={mandalSettings.whatsapp_contact}
                    onChange={e => setMandalSettings({ ...mandalSettings, whatsapp_contact: e.target.value })}
                    className="w-full px-4 py-2.5 bg-[#1C120C] border border-white/10 text-white rounded-lg text-xs outline-none focus:ring-1 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#D6C7B2] mb-1.5 uppercase tracking-wider">
                    Website Contact Numbers *
                  </label>
                  <input
                    type="text"
                    required
                    value={mandalSettings.website_contact_numbers}
                    onChange={e => setMandalSettings({ ...mandalSettings, website_contact_numbers: e.target.value })}
                    className="w-full px-4 py-2.5 bg-[#1C120C] border border-white/10 text-white rounded-lg text-xs outline-none focus:ring-1 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#D6C7B2] mb-1.5 uppercase tracking-wider">
                  Admin Notification WhatsApp Numbers (Comma-Separated) *
                </label>
                <input
                  type="text"
                  required
                  value={mandalSettings.admin_notification_numbers}
                  onChange={e => setMandalSettings({ ...mandalSettings, admin_notification_numbers: e.target.value })}
                  className="w-full px-4 py-2.5 bg-[#1C120C] border border-white/10 text-amber-400 rounded-lg text-xs font-mono outline-none focus:ring-1 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all"
                  placeholder="whatsapp:+919876543210, whatsapp:+919123456789"
                />
                <p className="text-[11px] text-[#A89F91] mt-1">
                  Add 1 or more WhatsApp numbers separated by commas to receive new booking notifications.
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#D6C7B2] mb-1.5 uppercase tracking-wider">
                  Booking Auto-Reply WhatsApp Message Template *
                </label>
                <textarea
                  rows={4}
                  required
                  value={mandalSettings.booking_auto_reply_template}
                  onChange={e => setMandalSettings({ ...mandalSettings, booking_auto_reply_template: e.target.value })}
                  className="w-full px-4 py-2.5 bg-[#1C120C] border border-white/10 text-white rounded-lg text-xs outline-none focus:ring-1 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all font-mono leading-relaxed"
                />
              </div>

              <button
                type="submit"
                className="px-6 py-2.5 rounded-lg bg-amber-500 text-stone-950 font-semibold text-xs hover:bg-amber-400 transition-all shadow-md"
              >
                Save Settings & Configuration
              </button>
            </form>

          </div>
        )}

        {/* ── TAB 5: SECURITY AUDIT LOGS (SUPER ADMIN ONLY) ───────────────────── */}
        {activeTab === 'audit' && currentUser?.role === 'super_admin' && (
          <div className="space-y-6">
            
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="text-base font-semibold text-white">Security Audit Log</h2>
                <p className="text-xs text-[#A89F91]">Immutable trail of admin authentications, invitations, and state modifications.</p>
              </div>

              <div className="relative w-full sm:w-72">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#A89F91]">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Filter by user or action..."
                  value={auditSearch}
                  onChange={e => setAuditSearch(e.target.value)}
                  className="w-full pl-8 pr-4 py-1.5 bg-[#1C120C] border border-white/10 text-white placeholder-[#A89F91] rounded-lg text-xs outline-none focus:ring-1 focus:ring-amber-500/50 transition-all"
                />
              </div>
            </div>

            <div className="bg-white/[0.02] rounded-xl border border-white/10 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 bg-white/[0.02] text-xs font-semibold text-[#A89F91] uppercase tracking-wider">
                      <th className="py-3.5 px-4 font-mono">Timestamp</th>
                      <th className="py-3.5 px-4">User</th>
                      <th className="py-3.5 px-4">Action Event</th>
                      <th className="py-3.5 px-4">Details</th>
                      <th className="py-3.5 px-4 font-mono">IP Address</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 font-mono text-xs">
                    {filteredAuditLogs.map(log => (
                      <tr key={log.id} className="hover:bg-white/[0.02] transition-colors align-middle">
                        <td className="py-3.5 px-4 text-[#D6C7B2]">{formatTimeAgo(log.timestamp)}</td>
                        <td className="py-3.5 px-4 text-amber-400 font-medium">@{log.user_username}</td>
                        <td className="py-3.5 px-4">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border ${
                            log.action.includes('SUCCESS') || log.action.includes('ACCEPTED') ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                            log.action.includes('FAILED') || log.action.includes('LOCKED') ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                            'bg-blue-500/10 text-blue-400 border-blue-500/20'
                          }`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-sans text-[#D6C7B2]">{log.details}</td>
                        <td className="py-3.5 px-4 text-[#A89F91]">{log.ip_address}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

      </main>

      {/* ── MODAL 1: ISSUE ADMIN WHATSAPP INVITE ─────────────────────────────── */}
      {showAddAdminModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1C120C] p-6 sm:p-8 rounded-xl border border-white/10 max-w-md w-full relative shadow-2xl space-y-5">
            <div className="flex justify-between items-center border-b border-white/10 pb-4">
              <h3 className="text-base font-semibold text-white">Issue WhatsApp Admin Invite</h3>
              <button
                onClick={() => setShowAddAdminModal(false)}
                className="text-[#A89F91] hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <p className="text-xs text-[#A89F91]">
              Generates a secure 24-hour invitation link dispatched via WhatsApp so the new admin can configure credentials.
            </p>

            <form onSubmit={handleInviteAdmin} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#D6C7B2] mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={newAdminName}
                  onChange={e => setNewAdminName(e.target.value)}
                  className="w-full px-3 py-2 bg-[#140C08] border border-white/10 text-white rounded-lg text-xs outline-none focus:ring-1 focus:ring-amber-500/50"
                  placeholder="e.g. Nilesh Sharma"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#D6C7B2] mb-1">WhatsApp Phone *</label>
                <input
                  type="text"
                  required
                  value={newAdminPhone}
                  onChange={e => setNewAdminPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-[#140C08] border border-white/10 text-white rounded-lg text-xs outline-none focus:ring-1 focus:ring-amber-500/50 font-mono"
                  placeholder="whatsapp:+919876543210"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#D6C7B2] mb-1">Email Address (Optional)</label>
                <input
                  type="email"
                  value={newAdminEmail}
                  onChange={e => setNewAdminEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-[#140C08] border border-white/10 text-white rounded-lg text-xs outline-none focus:ring-1 focus:ring-amber-500/50"
                  placeholder="nilesh@example.com"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#D6C7B2] mb-1">Role *</label>
                <select
                  value={newAdminRole}
                  onChange={e => setNewAdminRole(e.target.value)}
                  className="w-full px-3 py-2 bg-[#140C08] border border-white/10 text-white rounded-lg text-xs outline-none focus:ring-1 focus:ring-amber-500/50"
                >
                  <option value="admin">Admin (Bookings & Roster Control)</option>
                  <option value="super_admin">Super Admin (Full Access)</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddAdminModal(false)}
                  className="flex-1 py-2 rounded-lg border border-white/10 text-stone-300 text-xs font-medium hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-lg bg-amber-500 text-stone-950 text-xs font-semibold hover:bg-amber-400"
                >
                  Generate & Send Invite
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 2: GENERATED INVITE LINK DISPLAY ──────────────────────────── */}
      {createdInviteResult && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1C120C] p-6 sm:p-8 rounded-xl border border-emerald-500/30 max-w-md w-full relative shadow-2xl text-center space-y-4">
            <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>

            <h3 className="text-base font-semibold text-white">
              WhatsApp Invite Link Generated
            </h3>
            <p className="text-xs text-[#A89F91]">
              The invitation link has been dispatched via WhatsApp. You can also copy it manually:
            </p>

            <div className="bg-[#140C08] border border-white/10 p-3 rounded-lg text-left font-mono text-[11px] text-amber-400 break-all">
              {createdInviteResult.invite_link}
            </div>

            <div className="space-y-2 pt-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(createdInviteResult.invite_link);
                  alert('Invite link copied to clipboard.');
                }}
                className="w-full py-2 rounded-lg bg-white/5 border border-white/10 text-stone-200 font-medium text-xs hover:bg-white/10"
              >
                Copy Link to Clipboard
              </button>

              <button
                onClick={() => setCreatedInviteResult(null)}
                className="w-full py-2 rounded-lg bg-amber-500 text-stone-950 font-semibold text-xs hover:bg-amber-400"
              >
                Close Window
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}