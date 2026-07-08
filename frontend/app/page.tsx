'use client';

import React, { useState, useEffect } from 'react';

export default function PublicHomepage() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [successState, setSuccessState] = useState(false);
  
  // Form State
  const [formData, setFormData] = useState({
    fullName: '',
    address: '',
    phone: '',
    altPhone: ''
  });

  useEffect(() => {
    fetch('http://localhost:8000/api/bookings')
      .then(res => res.json())
      .then(data => setBookings(data))
      .catch(err => console.error("Error fetching available days:", err));
  }, [successState]);

  const bookedDates = bookings.map(b => b.booking_date);

  const handleDayClick = (day: number) => {
    // Basic standard date formatting setup for July 2026
    const dateStr = `2026-07-${day.toString().padStart(2, '0')}`;
    if (bookedDates.includes(dateStr)) return; // Restrict choosing booked dates
    setSelectedDate(dateStr);
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      full_name: formData.fullName,
      address: formData.address,
      phone: formData.phone,
      alt_phone: formData.altPhone || null,
      booking_date: selectedDate
    };

    try {
      const response = await fetch('http://localhost:8000/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (response.ok) {
        setSuccessState(true);
        setIsModalOpen(false);
        setFormData({ fullName: '', address: '', phone: '', altPhone: '' });
      } else {
        alert("Action failed. Check console error parameters.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <main className="max-w-6xl mx-auto px-4 py-8">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-maroon to-saffron text-white rounded-2xl p-8 text-center shadow-xl mb-12">
        <span className="bg-gold text-maroon font-bold text-xs uppercase px-3 py-1 rounded-full tracking-wider">🙏 Jai Shree Shyam 🙏</span>
        <h1 className="text-4xl md:text-5xl font-serif font-bold mt-4 mb-2 text-amber-100">Invite Baba Shyam's Divine Grace into your Home</h1>
        <p className="text-orange-100 max-w-2xl mx-auto text-sm md:text-base">
          Book a Bhajan Sandhya with our Mandal. Soulful kirtan, harmonium, dholak, and dhun — a divine evening of devotion at your doorstep.
        </p>
      </section>

      {/* Booking Calendar Matrix Section */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 bg-white p-6 rounded-xl shadow-md border border-stone-200">
          <h2 className="text-xl font-bold mb-4 text-maroon flex items-center gap-2">🗓️ July 2026 Availability Calendar</h2>
          <p className="text-xs text-stone-500 mb-4">Tap on an available date to request a Bhajan Sandhya at your home. Booked dates are shown in gold.</p>
          
          <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold mb-2 text-stone-500">
            <div>Su</div><div>Mo</div><div>Tu</div><div>We</div><div>Th</div><div>Fr</div><div>Sa</div>
          </div>
          <div className="grid grid-cols-7 gap-2">
            {/* Calendar Padding offsets for starting day layout */}
            <div className="h-12"></div><div className="h-12"></div><div className="h-12"></div>
            {Array.from({ length: 31 }, (_, i) => {
              const dayNum = i + 1;
              const loopDateStr = `2026-07-${dayNum.toString().padStart(2, '0')}`;
              const isBooked = bookedDates.includes(loopDateStr);

              return (
                <button
                  key={dayNum}
                  onClick={() => handleDayClick(dayNum)}
                  disabled={isBooked}
                  className={`h-12 rounded-lg font-medium transition flex flex-col justify-center items-center text-sm
                    ${isBooked ? 'bg-gold text-maroon font-bold cursor-not-allowed' : 'bg-stone-100 hover:bg-saffron hover:text-white text-stone-800'}`}
                >
                  {dayNum}
                  {isBooked && <span className="text-[9px] block tracking-tighter">Booked</span>}
                </button>
              );
            })}
          </div>
        </div>

        <div className="bg-stone-50 p-6 rounded-xl border border-stone-200 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-bold text-maroon mb-3">Why book with us?</h3>
            <ul className="space-y-4 text-sm text-stone-700">
              <li><strong>🎶 Complete Mandal:</strong> Full team of singers with harmonium, dholak, manjeera & khartaal.</li>
              <li><strong>✨ Devotional Focus:</strong> Authentic bhajans, jhanki and aarti in the divine spirit of Baba Shyam.</li>
              <li><strong>❤️ Seva-first, not commerce:</strong> Bookings are seva-based. Our mandal serves the community with devotion.</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Booking Form Modal Component */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex justify-center items-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 border border-stone-300">
            <h3 className="text-xl font-bold text-maroon mb-1">Request Bhajan Sandhya</h3>
            <p className="text-xs text-stone-500 mb-4">Date Selected: <span className="font-bold text-saffron">{selectedDate}</span></p>
            <form onSubmit={handleFormSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Full Name</label>
                <input type="text" required value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} className="w-full p-2 border border-stone-300 rounded text-sm bg-stone-50 focus:outline-saffron" placeholder="Enter full name" />
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Complete Address</label>
                <textarea required value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="w-full p-2 border border-stone-300 rounded text-sm bg-stone-50 focus:outline-saffron h-20" placeholder="Provide complete address for hosting event" />
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">WhatsApp Mobile Phone Number</label>
                <input type="tel" required value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full p-2 border border-stone-300 rounded text-sm bg-stone-50 focus:outline-saffron" placeholder="Primary phone number" />
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Alternative Contact (Optional)</label>
                <input type="tel" value={formData.altPhone} onChange={e => setFormData({...formData, altPhone: e.target.value})} className="w-full p-2 border border-stone-300 rounded text-sm bg-stone-50 focus:outline-saffron" placeholder="Secondary phone number" />
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border text-stone-600 rounded text-sm hover:bg-stone-100">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-saffron text-white rounded text-sm font-semibold hover:bg-orange-700">Confirm Request</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Success Notification Alert */}
      {successState && (
        <div className="fixed bottom-5 right-5 bg-emerald-800 text-white p-5 rounded-lg shadow-xl border border-emerald-500 max-w-sm z-50">
          <h4 className="font-bold text-amber-300">🙏 Jai Shree Shyam!</h4>
          <p className="text-xs mt-1">Booking Request Sent. Core group members have been automatically updated via live notification tracking.</p>
          <button onClick={() => setSuccessState(false)} className="mt-3 text-xs bg-white text-emerald-900 font-bold px-2 py-1 rounded">Close</button>
        </div>
      )}
    </main>
  );
}