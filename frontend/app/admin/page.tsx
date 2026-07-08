'use client';

import React, { useState, useEffect } from 'react';

export default function AdminDashboard() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [newMember, setNewMember] = useState({ name: '', phone: '', role: '' });
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    fetch('http://localhost:8000/api/bookings').then(res => res.json()).then(data => setBookings(data));
    fetch('http://localhost:8000/api/members').then(res => res.json()).then(data => setMembers(data));
  }, [refreshTrigger]);

  const handleStatusChange = async (id: number, newStatus: string) => {
    await fetch(`http://localhost:8000/api/bookings/${id}/status?status=${newStatus}`, { method: 'PATCH' });
    setRefreshTrigger(prev => prev + 1);
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('http://localhost:8000/api/members', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newMember)
    });
    setNewMember({ name: '', phone: '', role: '' });
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <main className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-serif font-bold text-maroon mb-6 border-b pb-2">Mandal Management & Admin Dashboard</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Bookings Request Management Table Column */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-stone-200">
            <h2 className="text-xl font-bold text-stone-800 mb-4">Incoming Event Requests</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-stone-100 text-stone-700 font-bold border-b border-stone-200">
                    <th className="p-3">Host Name</th>
                    <th className="p-3">Date Requested</th>
                    <th className="p-3">Phone</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {bookings.map((b) => (
                    <tr key={b.id} className="hover:bg-stone-50/50">
                      <td className="p-3 font-semibold text-stone-900">{b.full_name}</td>
                      <td className="p-3 text-stone-600">{b.booking_date}</td>
                      <td className="p-3 text-stone-600">{b.phone}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-xs font-bold 
                          ${b.status === 'Pending' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
                          {b.status}
                        </span>
                      </td>
                      <td className="p-3 text-right space-x-1">
                        {b.status === 'Pending' && (
                          <button onClick={() => handleStatusChange(b.id, 'Approved')} className="bg-emerald-700 text-white text-xs px-2 py-1 rounded font-bold hover:bg-emerald-800">
                            Approve
                          </button>
                        )}
                        <button onClick={() => handleStatusChange(b.id, 'Rescheduled')} className="bg-stone-200 text-stone-700 text-xs px-2 py-1 rounded hover:bg-stone-300">
                          Reschedule
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Roster & Member Management Column */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-stone-200">
            <h2 className="text-xl font-bold text-stone-800 mb-4">Add New Member</h2>
            <form onSubmit={handleAddMember} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-stone-600 mb-1">Member Name</label>
                <input type="text" required value={newMember.name} onChange={e => setNewMember({...newMember, name: e.target.value})} className="w-full p-2 border border-stone-300 rounded text-sm bg-stone-50" />
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-600 mb-1">Contact Phone</label>
                <input type="tel" required value={newMember.phone} onChange={e => setNewMember({...newMember, phone: e.target.value})} className="w-full p-2 border border-stone-300 rounded text-sm bg-stone-50" />
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-600 mb-1">Mandal Duty / Instrument</label>
                <input type="text" required value={newMember.role} onChange={e => setNewMember({...newMember, role: e.target.value})} className="w-full p-2 border border-stone-300 rounded text-sm bg-stone-50" placeholder="e.g., Lead Singer, Harmonium" />
              </div>
              <button type="submit" className="w-full bg-maroon text-white font-bold p-2 rounded text-sm hover:bg-stone-800 transition">Save Active Member</button>
            </form>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-stone-200">
            <h2 className="text-lg font-bold text-stone-800 mb-3">Active Roster ({members.length})</h2>
            <div className="space-y-2">
              {members.map(m => (
                <div key={m.id} className="p-3 bg-stone-50 rounded-lg border border-stone-150 flex justify-between items-center text-sm">
                  <div>
                    <p className="font-bold text-stone-800">{m.name}</p>
                    <p className="text-xs text-stone-500">{m.phone}</p>
                  </div>
                  <span className="bg-orange-100 text-saffron text-xs font-bold px-2 py-0.5 rounded-full">{m.role}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}