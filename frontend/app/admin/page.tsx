'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';

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

  // If string lacks timezone indicator ('Z' or '+'), append 'Z' so JS parses as UTC
  let isoStr = dateString.trim();
  if (!isoStr.endsWith('Z') && !isoStr.includes('+')) {
    isoStr = isoStr + 'Z';
  }

  const date = new Date(isoStr);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 10 || seconds < 0) return 'Just now';
  if (seconds < 60) return `${seconds} sec${seconds > 1 ? 's' : ''} ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min${minutes > 1 ? 's' : ''} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days > 1 ? 's' : ''} ago`;
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
  const [newMember, setNewMember] = useState({ name: '', phone: '', role: 'Singer' });

  // 1. Fetch Profile & Data on Mount
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

  const fetchProfile = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/auth/me', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setCurrentUser(data);
      } else {
        window.location.href = '/login';
      }
    } catch {
      window.location.href = '/login';
    }
  };

  const fetchBookings = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/bookings', { credentials: 'include' });
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
      const res = await fetch('http://localhost:8000/api/members', { credentials: 'include' });
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
      const res = await fetch('http://localhost:8000/api/admins', { credentials: 'include' });
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
      const res = await fetch('http://localhost:8000/api/settings');
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
      const res = await fetch('http://localhost:8000/api/audit', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(data);
      }
    } catch (err) {
      console.error('Failed to fetch audit logs:', err);
    }
  };

  // 2. Booking Status Updates
  const handleUpdateStatus = async (id: number, newStatus: string) => {
    try {
      const res = await fetch(`http://localhost:8000/api/bookings/${id}/status?status_str=${newStatus}`, {
        method: 'PATCH',
        credentials: 'include'
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
      const res = await fetch(`http://localhost:8000/api/bookings/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (res.ok) {
        fetchBookings();
      }
    } catch (err) {
      alert('Failed to delete booking');
    }
  };

  // 3. Add Member to Mandal Roster
  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('http://localhost:8000/api/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(newMember)
      });
      if (res.ok) {
        setNewMember({ name: '', phone: '', role: 'Singer' });
        fetchMembers();
      }
    } catch (err) {
      alert('Failed to add member');
    }
  };

  const handleDeleteMember = async (id: number) => {
    if (!confirm('Remove member from active mandal roster?')) return;
    try {
      const res = await fetch(`http://localhost:8000/api/members/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (res.ok) {
        fetchMembers();
      }
    } catch (err) {
      alert('Failed to remove member');
    }
  };

  // 4. Super Admin: Invite Admin (WhatsApp Invite Link Flow)
  const handleInviteAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('http://localhost:8000/api/admins/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
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

  // 5. Super Admin: Toggle Active/Deactivate or Reset Password or Delete
  const handleToggleAdminStatus = async (admin: AdminUser) => {
    try {
      const res = await fetch(`http://localhost:8000/api/admins/${admin.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
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
      const res = await fetch(`http://localhost:8000/api/admins/${admin.id}/reset-password`, {
        method: 'POST',
        credentials: 'include'
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
      const res = await fetch(`http://localhost:8000/api/admins/${admin.id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (res.ok) fetchAdmins();
    } catch (err) {
      alert('Failed to delete admin');
    }
  };

  // 6. Save Dynamic Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mandalSettings) return;

    try {
      const res = await fetch('http://localhost:8000/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          mandal_name: mandalSettings.mandal_name,
          whatsapp_contact: mandalSettings.whatsapp_contact,
          admin_notification_numbers: mandalSettings.admin_notification_numbers,
          booking_auto_reply_template: mandalSettings.booking_auto_reply_template,
          website_contact_numbers: mandalSettings.website_contact_numbers
        })
      });
      if (res.ok) {
        setSettingsMsg('Mandal configuration & templates saved successfully!');
        setTimeout(() => setSettingsMsg(''), 4000);
      }
    } catch (err) {
      alert('Failed to save settings');
    }
  };

  const handleLogout = async () => {
    await fetch('http://localhost:8000/api/auth/logout', { method: 'POST', credentials: 'include' });
    window.location.href = '/login';
  };

  // Filtering Logic
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
    <main className="min-h-screen bg-[#140C08] text-[#F8F4EC] pb-16 font-sans">
      
      {/* ── HEADER BANNER ──────────────────────────────────────────────────────── */}
      <header className="bg-gradient-to-b from-[#1C120C] via-[#2A1A10] to-[#140C08] border-b border-[#D4A017]/30 pt-8 pb-10 px-4 sm:px-8 relative shadow-2xl">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl border-2 border-[#D4A017]/60 overflow-hidden bg-[#140C08] relative shadow-lg">
              <Image
                src="/gallery/krishnaji.png"
                alt="Krishna Artwork"
                fill
                className="object-cover object-top"
              />
            </div>
            <div>
              <span className="inline-block px-3 py-0.5 rounded-full bg-[#D4A017]/15 border border-[#D4A017]/30 text-[#D4A017] text-[10px] uppercase tracking-widest font-semibold mb-1">
                ✨ Admin Management Portal ✨
              </span>
              <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#F8F4EC]">
                <span className="shimmer-gold">{mandalSettings?.mandal_name || 'Shyam Bhajan Seva Mandal'}</span>
              </h1>
              <p className="text-xs text-stone-300/80">
                Logged in as <strong className="text-[#D4A017]">{currentUser?.full_name}</strong> (@{currentUser?.username || 'admin'})
              </p>
            </div>
          </div>

          {/* Role Pill & Actions */}
          <div className="flex items-center gap-3">
            <span className="px-3 py-1.5 rounded-xl bg-[#1C120C] border border-[#D4A017]/40 text-xs font-semibold text-[#D4A017] uppercase tracking-wider shadow">
              {currentUser?.role === 'super_admin' ? '👑 Super Admin' : '👤 Admin'}
            </span>

            <button
              onClick={handleLogout}
              className="px-4 py-2 rounded-xl bg-red-950/60 border border-red-500/40 text-red-300 text-xs font-semibold hover:bg-red-900/80 transition-all cursor-pointer shadow"
            >
              Logout 🚪
            </button>
          </div>

        </div>

        {/* ── TAB SWITCHER ────────────────────────────────────────────────────── */}
        <div className="max-w-7xl mx-auto mt-8 flex flex-wrap gap-2 border-b border-[#D4A017]/20 pb-1">
          <button
            onClick={() => setActiveTab('bookings')}
            className={`px-5 py-2.5 rounded-t-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer border-t border-x ${
              activeTab === 'bookings'
                ? 'bg-[#140C08] border-[#D4A017]/50 text-[#D4A017] shadow-lg'
                : 'bg-[#1C120C]/60 border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            🚩 Event Requests ({bookings.length})
          </button>

          <button
            onClick={() => setActiveTab('roster')}
            className={`px-5 py-2.5 rounded-t-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer border-t border-x ${
              activeTab === 'roster'
                ? 'bg-[#140C08] border-[#D4A017]/50 text-[#D4A017] shadow-lg'
                : 'bg-[#1C120C]/60 border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            🪕 Active Roster ({members.length})
          </button>

          {currentUser?.role === 'super_admin' && (
            <>
              <button
                onClick={() => setActiveTab('admins')}
                className={`px-5 py-2.5 rounded-t-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer border-t border-x ${
                  activeTab === 'admins'
                    ? 'bg-[#140C08] border-[#D4A017]/50 text-[#D4A017] shadow-lg'
                    : 'bg-[#1C120C]/60 border-transparent text-stone-400 hover:text-stone-200'
                }`}
              >
                👥 Admin Management
              </button>

              <button
                onClick={() => setActiveTab('settings')}
                className={`px-5 py-2.5 rounded-t-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer border-t border-x ${
                  activeTab === 'settings'
                    ? 'bg-[#140C08] border-[#D4A017]/50 text-[#D4A017] shadow-lg'
                    : 'bg-[#1C120C]/60 border-transparent text-stone-400 hover:text-stone-200'
                }`}
              >
                ⚙️ Mandal Settings
              </button>

              <button
                onClick={() => setActiveTab('audit')}
                className={`px-5 py-2.5 rounded-t-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer border-t border-x ${
                  activeTab === 'audit'
                    ? 'bg-[#140C08] border-[#D4A017]/50 text-[#D4A017] shadow-lg'
                    : 'bg-[#1C120C]/60 border-transparent text-stone-400 hover:text-stone-200'
                }`}
              >
                📜 Security Audit Logs
              </button>
            </>
          )}
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-8 mt-8">

        {/* ── TAB 1: BOOKING REQUESTS MANAGEMENT ────────────────────────────── */}
        {activeTab === 'bookings' && (
          <div className="space-y-6">
            
            <div className="glass-devotional-card p-4 rounded-2xl border border-[#D4A017]/25 flex flex-col md:flex-row justify-between items-center gap-4">
              <input
                type="text"
                placeholder="Search by Host Name, Phone, or Address..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full md:w-96 px-4 py-2.5 bg-[#140C08] border border-[#D4A017]/30 text-[#F8F4EC] rounded-xl text-xs focus:ring-2 focus:ring-[#D4A017] outline-none"
              />

              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-stone-400">Filter Status:</span>
                {['All', 'Pending', 'Approved', 'Rescheduled', 'Rejected'].map(st => (
                  <button
                    key={st}
                    onClick={() => setFilterStatus(st)}
                    className={`px-3 py-1 rounded-full text-[11px] font-semibold transition-all cursor-pointer ${
                      filterStatus === st
                        ? 'bg-[#D4A017] text-[#140C08]'
                        : 'bg-[#140C08] border border-[#D4A017]/25 text-stone-300 hover:border-[#D4A017]'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            <div className="glass-devotional-card rounded-2xl border border-[#D4A017]/25 overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-stone-200">
                  <thead className="bg-[#140C08] text-[#D4A017] uppercase tracking-wider font-semibold text-[11px] border-b border-[#D4A017]/20">
                    <tr>
                      <th className="p-4">ID</th>
                      <th className="p-4">Host Name</th>
                      <th className="p-4">Date</th>
                      <th className="p-4">Contact</th>
                      <th className="p-4">Address</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#D4A017]/10">
                    {filteredBookings.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-stone-400 italic">
                          No booking requests match the selected criteria.
                        </td>
                      </tr>
                    ) : (
                      filteredBookings.map(b => (
                        <tr key={b.id} className="hover:bg-[#241710]/40 transition-colors">
                          <td className="p-4 font-mono font-bold text-[#D4A017]">#{b.id}</td>
                          <td className="p-4 font-semibold text-[#F8F4EC]">{b.full_name}</td>
                          <td className="p-4 font-medium text-amber-200/90">{b.booking_date}</td>
                          <td className="p-4">
                            <div>{b.phone}</div>
                            {b.alt_phone && <div className="text-[10px] text-stone-400">Alt: {b.alt_phone}</div>}
                          </td>
                          <td className="p-4 max-w-xs truncate">{b.address}</td>
                          <td className="p-4">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              b.status === 'Approved' ? 'bg-emerald-950 border border-emerald-500/50 text-emerald-300' :
                              b.status === 'Pending' ? 'bg-amber-950 border border-amber-500/50 text-amber-300 animate-pulse' :
                              b.status === 'Rescheduled' ? 'bg-blue-950 border border-blue-500/50 text-blue-300' :
                              'bg-rose-950 border border-rose-500/50 text-rose-300'
                            }`}>
                              {b.status}
                            </span>
                          </td>
                          <td className="p-4 text-right space-x-1">
                            <button
                              onClick={() => handleUpdateStatus(b.id, 'Approved')}
                              className="px-2.5 py-1 rounded-lg bg-emerald-900/60 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-800 transition-all cursor-pointer"
                            >
                              Approve ✓
                            </button>
                            <button
                              onClick={() => handleUpdateStatus(b.id, 'Rescheduled')}
                              className="px-2.5 py-1 rounded-lg bg-blue-900/60 border border-blue-500/40 text-blue-300 hover:bg-blue-800 transition-all cursor-pointer"
                            >
                              Reschedule 📅
                            </button>
                            <button
                              onClick={() => handleDeleteBooking(b.id)}
                              className="px-2 py-1 rounded-lg bg-red-950/60 border border-red-500/40 text-red-400 hover:bg-red-900 transition-all cursor-pointer"
                            >
                              Delete 🗑️
                            </button>
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
            
            <div className="glass-devotional-card p-6 rounded-2xl border border-[#D4A017]/25 h-fit">
              <h2 className="text-lg font-serif font-bold text-[#F8F4EC] mb-4">
                <span className="shimmer-gold">Add Mandal Performer</span>
              </h2>
              <form onSubmit={handleAddMember} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1 uppercase">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={newMember.name}
                    onChange={e => setNewMember({ ...newMember, name: e.target.value })}
                    className="w-full px-3 py-2 bg-[#140C08] border border-[#D4A017]/30 text-[#F8F4EC] rounded-xl text-xs outline-none focus:ring-1 focus:ring-[#D4A017]"
                    placeholder="e.g., Pandit Suresh Kumar"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1 uppercase">WhatsApp Phone *</label>
                  <input
                    type="text"
                    required
                    value={newMember.phone}
                    onChange={e => setNewMember({ ...newMember, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-[#140C08] border border-[#D4A017]/30 text-[#F8F4EC] rounded-xl text-xs outline-none focus:ring-1 focus:ring-[#D4A017]"
                    placeholder="+919876543210"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1 uppercase">Role *</label>
                  <select
                    value={newMember.role}
                    onChange={e => setNewMember({ ...newMember, role: e.target.value })}
                    className="w-full px-3 py-2 bg-[#140C08] border border-[#D4A017]/30 text-[#F8F4EC] rounded-xl text-xs outline-none focus:ring-1 focus:ring-[#D4A017]"
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
                  className="w-full bg-[#D4A017] text-[#140C08] font-bold py-2.5 rounded-xl text-xs hover:bg-[#C77A1A] hover:text-white transition-all cursor-pointer"
                >
                  + Add Member to Roster
                </button>
              </form>
            </div>

            <div className="lg:col-span-2 space-y-4">
              <h2 className="text-lg font-serif font-bold text-[#F8F4EC]">
                Active Mandal Roster ({members.length})
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {members.map(m => (
                  <div key={m.id} className="glass-devotional-card p-4 rounded-2xl border border-[#D4A017]/25 flex justify-between items-center">
                    <div>
                      <h3 className="font-semibold text-sm text-[#F8F4EC]">{m.name}</h3>
                      <span className="inline-block text-[10px] text-[#D4A017] bg-[#D4A017]/10 px-2 py-0.5 rounded-full border border-[#D4A017]/20 my-1 font-mono">
                        {m.role}
                      </span>
                      <p className="text-xs text-stone-400">{m.phone}</p>
                    </div>

                    <button
                      onClick={() => handleDeleteMember(m.id)}
                      className="p-2 bg-red-950/60 border border-red-500/40 text-red-400 rounded-xl hover:bg-red-900 transition-all text-xs cursor-pointer"
                      title="Remove Member"
                    >
                      🗑️
                    </button>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* ── TAB 3: ADMIN MANAGEMENT WITH RELATIVE TIME & INVITE FLOW ─────────── */}
        {activeTab === 'admins' && currentUser?.role === 'super_admin' && (
          <div className="space-y-6">
            
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-serif font-bold text-[#F8F4EC]">
                  <span className="shimmer-gold">Admin Management System</span>
                </h2>
                <p className="text-xs text-stone-400">
                  Send WhatsApp Invite Links to new administrators, manage roles, and track relative last logins.
                </p>
              </div>

              <button
                onClick={() => setShowAddAdminModal(true)}
                className="px-4 py-2.5 rounded-xl bg-[#D4A017] text-[#140C08] text-xs font-bold hover:bg-[#C77A1A] hover:text-white transition-all shadow-lg cursor-pointer flex items-center gap-2"
              >
                <span>+</span> Send WhatsApp Invite Link 📲
              </button>
            </div>

            {/* Admins Table */}
            <div className="glass-devotional-card rounded-2xl border border-[#D4A017]/25 overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-stone-200">
                  <thead className="bg-[#140C08] text-[#D4A017] uppercase tracking-wider font-semibold text-[11px] border-b border-[#D4A017]/20">
                    <tr>
                      <th className="p-4">Admin Name</th>
                      <th className="p-4">Username</th>
                      <th className="p-4">Role</th>
                      <th className="p-4">Status</th>
                      <th className="p-4">Last Login</th>
                      <th className="p-4">Phone Number</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#D4A017]/10">
                    {adminsList.map(adm => (
                      <tr key={adm.id} className="hover:bg-[#241710]/40 transition-colors">
                        <td className="p-4 font-semibold text-[#F8F4EC]">{adm.full_name}</td>
                        <td className="p-4 font-mono text-[#D4A017]">
                          {adm.username ? `@${adm.username}` : <span className="text-stone-500 italic">Pending Setup</span>}
                        </td>
                        <td className="p-4">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            adm.role === 'super_admin' ? 'bg-amber-950 border border-amber-500/50 text-amber-300' :
                            'bg-stone-900 border border-stone-600 text-stone-300'
                          }`}>
                            {adm.role === 'super_admin' ? '👑 Super Admin' : '👤 Admin'}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            adm.is_active ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/40' : 'bg-amber-950 text-amber-400 border border-amber-500/40'
                          }`}>
                            {adm.is_active ? 'Active' : 'Pending Invite'}
                          </span>
                        </td>
                        {/* 🌟 Relative Time Ago Display */}
                        <td className="p-4 font-medium text-stone-300">
                          {formatTimeAgo(adm.last_login)}
                        </td>
                        <td className="p-4">{adm.phone_number}</td>
                        <td className="p-4 text-right space-x-1">
                          <button
                            onClick={() => handleToggleAdminStatus(adm)}
                            className="px-2 py-1 rounded bg-stone-800 border border-stone-600 hover:bg-stone-700 text-[11px] transition-all cursor-pointer"
                          >
                            {adm.is_active ? 'Disable' : 'Enable'}
                          </button>
                          <button
                            onClick={() => handleResetAdminPassword(adm)}
                            className="px-2 py-1 rounded bg-amber-950 border border-amber-600 text-amber-300 hover:bg-amber-900 text-[11px] transition-all cursor-pointer"
                          >
                            Resend Invite 📲
                          </button>
                          {adm.id !== currentUser.id && (
                            <button
                              onClick={() => handleDeleteAdmin(adm)}
                              className="px-2 py-1 rounded bg-red-950 border border-red-600 text-red-400 hover:bg-red-900 text-[11px] transition-all cursor-pointer"
                            >
                              Soft Delete 🗑️
                            </button>
                          )}
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
              <h2 className="text-xl font-serif font-bold text-[#F8F4EC]">
                <span className="shimmer-gold">⚙️ Dynamic Mandal Settings</span>
              </h2>
              <p className="text-xs text-stone-400">
                Update Mandal contact numbers, notification dispatch lists, and WhatsApp templates without code modifications.
              </p>
            </div>

            {settingsMsg && (
              <div className="p-4 bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 rounded-xl text-xs font-semibold">
                ✅ {settingsMsg}
              </div>
            )}

            <form onSubmit={handleSaveSettings} className="glass-devotional-card p-6 sm:p-8 rounded-3xl border border-[#D4A017]/25 space-y-6">
              
              <div>
                <label className="block text-xs font-semibold text-stone-200 mb-1.5 uppercase tracking-wider">
                  Mandal Organization Name *
                </label>
                <input
                  type="text"
                  required
                  value={mandalSettings.mandal_name}
                  onChange={e => setMandalSettings({ ...mandalSettings, mandal_name: e.target.value })}
                  className="w-full px-4 py-3 bg-[#140C08] border border-[#D4A017]/30 text-[#F8F4EC] rounded-xl text-sm focus:ring-2 focus:ring-[#D4A017] outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-semibold text-stone-200 mb-1.5 uppercase tracking-wider">
                    Primary WhatsApp Contact *
                  </label>
                  <input
                    type="text"
                    required
                    value={mandalSettings.whatsapp_contact}
                    onChange={e => setMandalSettings({ ...mandalSettings, whatsapp_contact: e.target.value })}
                    className="w-full px-4 py-3 bg-[#140C08] border border-[#D4A017]/30 text-[#F8F4EC] rounded-xl text-sm focus:ring-2 focus:ring-[#D4A017] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-200 mb-1.5 uppercase tracking-wider">
                    Website Contact Phone Numbers *
                  </label>
                  <input
                    type="text"
                    required
                    value={mandalSettings.website_contact_numbers}
                    onChange={e => setMandalSettings({ ...mandalSettings, website_contact_numbers: e.target.value })}
                    className="w-full px-4 py-3 bg-[#140C08] border border-[#D4A017]/30 text-[#F8F4EC] rounded-xl text-sm focus:ring-2 focus:ring-[#D4A017] outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-200 mb-1.5 uppercase tracking-wider">
                  Admin Notification WhatsApp Numbers (Comma-Separated) *
                </label>
                <input
                  type="text"
                  required
                  value={mandalSettings.admin_notification_numbers}
                  onChange={e => setMandalSettings({ ...mandalSettings, admin_notification_numbers: e.target.value })}
                  className="w-full px-4 py-3 bg-[#140C08] border border-[#D4A017]/30 text-[#D4A017] rounded-xl text-sm font-mono focus:ring-2 focus:ring-[#D4A017] outline-none"
                  placeholder="whatsapp:+919876543210, whatsapp:+919123456789"
                />
                <p className="text-[11px] text-stone-400 mt-1">
                  Add 1, 2, or 3+ WhatsApp numbers separated by commas to receive new booking alerts.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-200 mb-1.5 uppercase tracking-wider">
                  Booking Auto-Reply WhatsApp Message Template *
                </label>
                <textarea
                  rows={4}
                  required
                  value={mandalSettings.booking_auto_reply_template}
                  onChange={e => setMandalSettings({ ...mandalSettings, booking_auto_reply_template: e.target.value })}
                  className="w-full px-4 py-3 bg-[#140C08] border border-[#D4A017]/30 text-[#F8F4EC] rounded-xl text-xs focus:ring-2 focus:ring-[#D4A017] outline-none leading-relaxed"
                />
              </div>

              <button
                type="submit"
                className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-[#D4A017] text-[#140C08] font-bold text-xs hover:bg-[#C77A1A] hover:text-white transition-all cursor-pointer shadow-xl"
              >
                Save Configuration & Templates 💾
              </button>
            </form>

          </div>
        )}

        {/* ── TAB 5: SECURITY AUDIT LOGS (SUPER ADMIN ONLY) ───────────────────── */}
        {activeTab === 'audit' && currentUser?.role === 'super_admin' && (
          <div className="space-y-6">
            
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h2 className="text-xl font-serif font-bold text-[#F8F4EC]">
                  <span className="shimmer-gold">Security Audit Trail</span>
                </h2>
                <p className="text-xs text-stone-400">
                  Immutable record of system authentications, admin invitations, password changes, and booking actions.
                </p>
              </div>

              <input
                type="text"
                placeholder="Filter logs by username or action..."
                value={auditSearch}
                onChange={e => setAuditSearch(e.target.value)}
                className="w-full md:w-80 px-4 py-2 bg-[#140C08] border border-[#D4A017]/30 text-[#F8F4EC] rounded-xl text-xs outline-none"
              />
            </div>

            <div className="glass-devotional-card rounded-2xl border border-[#D4A017]/25 overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-stone-200">
                  <thead className="bg-[#140C08] text-[#D4A017] uppercase tracking-wider font-semibold text-[11px] border-b border-[#D4A017]/20">
                    <tr>
                      <th className="p-4">Timestamp</th>
                      <th className="p-4">User</th>
                      <th className="p-4">Action Event</th>
                      <th className="p-4">Details</th>
                      <th className="p-4">IP Address</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#D4A017]/10 font-mono text-[11px]">
                    {filteredAuditLogs.map(log => (
                      <tr key={log.id} className="hover:bg-[#241710]/40 transition-colors">
                        <td className="p-4 text-amber-200/90">{formatTimeAgo(log.timestamp)}</td>
                        <td className="p-4 text-[#D4A017] font-bold">@{log.user_username}</td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            log.action.includes('SUCCESS') || log.action.includes('ACCEPTED') ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40' :
                            log.action.includes('FAILED') || log.action.includes('LOCKED') ? 'bg-red-950 text-red-300 border border-red-500/40' :
                            'bg-blue-950 text-blue-300 border border-blue-500/40'
                          }`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="p-4 font-sans text-stone-300">{log.details}</td>
                        <td className="p-4 text-stone-400">{log.ip_address}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

      </div>

      {/* ── MODAL 1: ISSUE ADMIN WHATSAPP INVITE ─────────────────────────────── */}
      {showAddAdminModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-devotional-card p-6 sm:p-8 rounded-3xl border border-[#D4A017]/40 max-w-md w-full relative shadow-2xl">
            <h3 className="text-xl font-serif font-bold text-[#F8F4EC] mb-2">
              <span className="shimmer-gold">📲 Issue WhatsApp Admin Invite</span>
            </h3>
            <p className="text-xs text-stone-300/80 mb-6">
              Generates a secure 24-hour invitation link dispatched via Twilio WhatsApp so the new Admin can set their username & password.
            </p>

            <form onSubmit={handleInviteAdmin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-200 mb-1 uppercase">Full Name *</label>
                <input
                  type="text"
                  required
                  value={newAdminName}
                  onChange={e => setNewAdminName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#140C08] border border-[#D4A017]/30 text-[#F8F4EC] rounded-xl text-xs outline-none focus:ring-1 focus:ring-[#D4A017]"
                  placeholder="e.g., Nilesh Sharma"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-200 mb-1 uppercase">WhatsApp Phone *</label>
                <input
                  type="text"
                  required
                  value={newAdminPhone}
                  onChange={e => setNewAdminPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#140C08] border border-[#D4A017]/30 text-[#F8F4EC] rounded-xl text-xs outline-none focus:ring-1 focus:ring-[#D4A017]"
                  placeholder="whatsapp:+919876543210"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-200 mb-1 uppercase">Email Address (Optional)</label>
                <input
                  type="email"
                  value={newAdminEmail}
                  onChange={e => setNewAdminEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#140C08] border border-[#D4A017]/30 text-[#F8F4EC] rounded-xl text-xs outline-none focus:ring-1 focus:ring-[#D4A017]"
                  placeholder="nilesh@example.com"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-200 mb-1 uppercase">Role *</label>
                <select
                  value={newAdminRole}
                  onChange={e => setNewAdminRole(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#140C08] border border-[#D4A017]/30 text-[#F8F4EC] rounded-xl text-xs outline-none focus:ring-1 focus:ring-[#D4A017]"
                >
                  <option value="admin">Admin (Bookings & Roster Control)</option>
                  <option value="super_admin">Super Admin (Full RBAC System Control)</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddAdminModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-stone-600 text-stone-300 text-xs font-semibold hover:bg-stone-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-[#D4A017] text-[#140C08] text-xs font-bold hover:bg-[#C77A1A] hover:text-white cursor-pointer shadow-lg"
                >
                  Generate & Send Invite 📲
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 2: GENERATED INVITE LINK DISPLAY ──────────────────────────── */}
      {createdInviteResult && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-devotional-card p-6 sm:p-8 rounded-3xl border border-emerald-500/50 max-w-md w-full relative shadow-2xl text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-950 border border-emerald-500 flex items-center justify-center mx-auto mb-3">
              <span className="text-2xl">📲</span>
            </div>

            <h3 className="text-xl font-serif font-bold text-[#F8F4EC] mb-2">
              WhatsApp Invite Link Generated
            </h3>
            <p className="text-xs text-stone-300 mb-6">
              The invitation link has been queued for WhatsApp delivery. You can also copy it manually:
            </p>

            <div className="bg-[#140C08] border border-[#D4A017]/30 p-3 rounded-2xl text-left font-mono text-[11px] text-[#D4A017] break-all mb-4">
              {createdInviteResult.invite_link}
            </div>

            <button
              onClick={() => {
                navigator.clipboard.writeText(createdInviteResult.invite_link);
                alert('Invite link copied to clipboard!');
              }}
              className="w-full py-2.5 mb-2 rounded-xl bg-[#1C120C] border border-[#D4A017]/40 text-[#D4A017] font-semibold text-xs hover:bg-[#2A1A10] cursor-pointer"
            >
              📋 Copy Invite Link to Clipboard
            </button>

            <button
              onClick={() => setCreatedInviteResult(null)}
              className="w-full py-3 rounded-xl bg-[#D4A017] text-[#140C08] font-bold text-xs hover:bg-[#C77A1A] hover:text-white cursor-pointer"
            >
              Close Window
            </button>
          </div>
        </div>
      )}

    </main>
  );
}