'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';

// ── TypeScript Interfaces ──────────────────────────────────────────────────────

interface BookingFormData {
  full_name: string;
  phone: string;
  address: string;
  booking_date: string;
  notes: string;
}

interface BookingCreatePayload {
  full_name: string;
  address: string;
  phone: string;
  alt_phone: null;
  booking_date: string;
}

interface BookingResponse {
  id: number;
  full_name: string;
  address: string;
  phone: string;
  alt_phone: string | null;
  booking_date: string;
  status: string;
}

type SubmitStatus = 'idle' | 'success' | 'error_conflict' | 'error_generic';

// ── Component ─────────────────────────────────────────────────────────────────

export default function Home() {
  // Form state
  const [formData, setFormData] = useState<BookingFormData>({
    full_name: '',
    phone: '',
    address: '',
    booking_date: '',
    notes: '',
  });

  // UI state
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitStatus, setSubmitStatus] = useState<SubmitStatus>('idle');
  const [bookedDates, setBookedDates] = useState<string[]>([]);
  const [dateConflict, setDateConflict] = useState<boolean>(false);

  // Section refs for smooth scroll navigation
  const homeRef    = useRef<HTMLDivElement>(null);
  const aboutRef   = useRef<HTMLDivElement>(null);
  const bookRef    = useRef<HTMLDivElement>(null);
  const contactRef = useRef<HTMLDivElement>(null);

  // Navbar scroll state
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Smooth-scroll helper
  function scrollTo(ref: React.RefObject<HTMLDivElement | null>) {
    ref.current?.scrollIntoView({ behavior: 'smooth' });
    setMobileOpen(false);
  }

  // Track scroll for navbar style change
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Scroll-reveal via IntersectionObserver
  const revealObserver = useCallback(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );
    document.querySelectorAll('.reveal, .reveal-scale').forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const cleanup = revealObserver();
    return cleanup;
  }, [revealObserver]);

  async function fetchBookedDates(): Promise<void> {
    try {
      const res = await fetch('http://localhost:8000/api/bookings');
      if (!res.ok) return;
      const data: BookingResponse[] = await res.json();
      setBookedDates(data.map((b) => b.booking_date));
    } catch {
      // silently suppress — graceful degradation
    }
  }

  useEffect(() => {
    fetchBookedDates();
  }, []);

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (name === 'booking_date') {
      setDateConflict(bookedDates.includes(value));
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus('idle');
    try {
      const payload: BookingCreatePayload = {
        full_name: formData.full_name,
        address: formData.address,
        phone: formData.phone,
        alt_phone: null,
        booking_date: formData.booking_date,
      };
      const res = await fetch('http://localhost:8000/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.status === 201) {
        setSubmitStatus('success');
        setFormData({ full_name: '', phone: '', address: '', booking_date: '', notes: '' });
        setDateConflict(false);
        await fetchBookedDates();
      } else if (res.status === 400) {
        setSubmitStatus('error_conflict');
      } else {
        setSubmitStatus('error_generic');
      }
    } catch {
      setSubmitStatus('error_generic');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#FFFDF9] font-sans">

      {/* ── Sticky Navbar ─────────────────────────────────────────────────── */}
      <nav className={`sticky top-0 z-50 text-white transition-all duration-500 ${scrolled ? 'nav-scrolled' : 'nav-gradient'}`}>
        <div className="flex justify-between items-center h-16 max-w-6xl mx-auto px-4 sm:px-6">

          {/* Left: site title with shimmer on scroll */}
          <button
            onClick={() => scrollTo(homeRef)}
            className="font-bold text-xl tracking-wide flex items-center gap-2 group"
          >
            <span className="text-2xl group-hover:animate-bounce inline-block">🙏</span>
            <span className={`transition-all duration-300 ${scrolled ? 'shimmer-gold' : 'text-white'}`}>
              Shyam Bhajan Seva
            </span>
          </button>

          {/* Right: nav links (desktop) */}
          <div className="hidden md:flex items-center gap-1">
            {[
              { label: 'Home',          ref: homeRef },
              { label: 'About Us',      ref: aboutRef },
              { label: 'Book Your Date',ref: bookRef },
              { label: 'Contact Us',    ref: contactRef },
            ].map(({ label, ref }) => (
              <button
                key={label}
                onClick={() => scrollTo(ref)}
                className="relative px-4 py-2 rounded-full text-sm font-medium text-white/90 hover:text-[#EAB308] transition-all duration-200 hover:bg-white/10 group"
              >
                {label}
                <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-0 h-0.5 bg-[#EAB308] rounded-full group-hover:w-4/5 transition-all duration-300" />
              </button>
            ))}
            <button
              onClick={() => scrollTo(bookRef)}
              className="ml-3 px-5 py-2 bg-[#EAB308] text-[#3b0f02] font-bold text-sm rounded-full hover:bg-yellow-300 transition-all duration-200 hover:scale-105 shadow-lg animate-pulse-gold"
            >
              Book Now ✨
            </button>
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 rounded-lg hover:bg-white/10 transition-colors"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            <div className="w-5 flex flex-col gap-1.5">
              <span className={`block h-0.5 bg-white rounded transition-all duration-300 ${mobileOpen ? 'rotate-45 translate-y-2' : ''}`} />
              <span className={`block h-0.5 bg-white rounded transition-all duration-300 ${mobileOpen ? 'opacity-0' : ''}`} />
              <span className={`block h-0.5 bg-white rounded transition-all duration-300 ${mobileOpen ? '-rotate-45 -translate-y-2' : ''}`} />
            </div>
          </button>

        </div>

        {/* Mobile dropdown */}
        <div className={`md:hidden overflow-hidden transition-all duration-300 ${mobileOpen ? 'max-h-72 opacity-100' : 'max-h-0 opacity-0'}`}>
          <div className="px-4 pb-4 flex flex-col gap-1 border-t border-white/10 pt-2">
            {[
              { label: 'Home',           ref: homeRef },
              { label: 'About Us',       ref: aboutRef },
              { label: 'Book Your Date', ref: bookRef },
              { label: 'Contact Us',     ref: contactRef },
            ].map(({ label, ref }) => (
              <button
                key={label}
                onClick={() => scrollTo(ref)}
                className="text-left px-4 py-2.5 rounded-xl text-sm font-medium text-white/90 hover:text-[#EAB308] hover:bg-white/10 transition-all duration-200"
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* ── Main content ─────────────────────────────────────────────────── */}
      <main className="pb-16">

        {/* ── Hero Section ──────────────────────────────────────────────── */}
        <div ref={homeRef} className="px-4 py-12 md:py-20">
          <div className="hero-gradient rounded-3xl text-center p-8 md:p-20 max-w-6xl mx-auto shadow-2xl relative overflow-hidden min-h-[480px] flex items-center justify-center">

            {/* Animated floating orbs */}
            <div className="absolute top-10 left-10 w-40 h-40 bg-[#EAB308]/20 rounded-full blur-3xl animate-float pointer-events-none" />
            <div className="absolute bottom-10 right-10 w-56 h-56 bg-orange-400/20 rounded-full blur-3xl animate-float pointer-events-none" style={{ animationDelay: '2s' }} />
            <div className="absolute top-1/2 left-1/4 w-28 h-28 bg-red-300/10 rounded-full blur-2xl animate-float pointer-events-none" style={{ animationDelay: '4s' }} />

            {/* Twinkling stars */}
            {[
              { top: '15%', left: '8%',  delay: '0s',    size: 'w-1.5 h-1.5' },
              { top: '25%', left: '88%', delay: '1.2s',  size: 'w-2 h-2' },
              { top: '70%', left: '5%',  delay: '0.6s',  size: 'w-1 h-1' },
              { top: '80%', left: '92%', delay: '2s',    size: 'w-1.5 h-1.5' },
              { top: '40%', left: '95%', delay: '1.5s',  size: 'w-1 h-1' },
              { top: '10%', left: '50%', delay: '0.3s',  size: 'w-1 h-1' },
            ].map((star, i) => (
              <div
                key={i}
                className={`absolute ${star.size} bg-[#EAB308] rounded-full animate-twinkle pointer-events-none`}
                style={{ top: star.top, left: star.left, animationDelay: star.delay }}
              />
            ))}

            {/* Subtle grid overlay */}
            <div
              className="absolute inset-0 pointer-events-none opacity-5"
              style={{
                backgroundImage: 'linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px)',
                backgroundSize: '60px 60px',
              }}
            />

            {/* Content */}
            <div className="relative z-10 w-full">
              <div className="animate-fade-in-down">
                <span className="inline-block bg-[#EAB308]/20 border border-[#EAB308]/40 text-[#EAB308] font-bold text-sm px-6 py-2 rounded-full mb-8 tracking-widest backdrop-blur-sm">
                  ✨ JAI SHREE SHYAM ✨
                </span>
              </div>

              <h1 className="text-4xl md:text-5xl lg:text-7xl font-serif font-bold text-white leading-tight mb-6 animate-fade-in-up delay-200">
                Invite Baba Shyam&apos;s{' '}
                <span className="shimmer-gold">Divine Grace</span>{' '}
                into your Home
              </h1>

              <p className="text-orange-100/90 text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed animate-fade-in-up delay-300">
                Book a Bhajan Sandhya with our Mandal — soulful kirtan, harmonium, dholak, and dhun. A divine evening of devotion at your doorstep.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in-up delay-400">
                <button
                  onClick={() => scrollTo(bookRef)}
                  className="inline-flex items-center bg-[#EAB308] text-[#3b0f02] font-bold text-lg px-10 py-4 rounded-full shadow-2xl hover:scale-105 hover:bg-yellow-300 transition-all duration-300 animate-pulse-gold"
                >
                  Book Your Date
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
                <button
                  onClick={() => scrollTo(aboutRef)}
                  className="inline-flex items-center border-2 border-white/30 text-white font-semibold text-base px-8 py-4 rounded-full hover:bg-white/10 hover:border-white/60 transition-all duration-300 backdrop-blur-sm"
                >
                  Learn More
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── About Us Section ──────────────────────────────────────────── */}
        <div ref={aboutRef}>
          <div className="border-t border-orange-100 mt-20 pt-10 px-4 max-w-6xl mx-auto">

            {/* Section heading */}
            <div className="text-center mb-12 reveal">
              <h2 className="text-3xl md:text-4xl font-serif font-bold text-[#7C2D12]">
                About Our Mandal
              </h2>
              <div className="w-24 h-1 bg-[#EAB308] mx-auto mt-3 rounded-full" />
            </div>

            {/* Two-column grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">

              {/* LEFT COLUMN — descriptive text */}
              <div className="reveal">
                <p className="text-gray-700 leading-relaxed mb-4">
                  Shyam Bhajan Seva Mandal is a devotional group dedicated to the loving service of Baba Shyam through the sacred art of kirtan. For years, we have been bringing the warmth of collective devotion directly to homes, temples, and community gatherings — transforming every space into a spiritual sanctuary.
                </p>
                <p className="text-gray-700 leading-relaxed mb-6">
                  Our team of devoted musicians and singers performs with a single purpose: to create an atmosphere of pure bhakti where every heart can experience the divine presence of Khatu Shyam ji. We believe that true seva is offered without expectation, and that belief guides every kirtan we perform.
                </p>

                {/* Feature list */}
                <ul className="space-y-4">

                  {/* Item 1 — Complete Musical Ensemble */}
                  <li className="flex items-start gap-3 card-lift p-3 rounded-xl hover:bg-orange-50 cursor-default">
                    <span className="mt-1 shrink-0 text-[#7C2D12]">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                      </svg>
                    </span>
                    <div>
                      <p className="font-semibold text-[#7C2D12]">Complete Musical Ensemble</p>
                      <p className="text-sm text-gray-600">Harmonium, dholak, manjeera, khartaal — a full devotional orchestra for your sandhya.</p>
                    </div>
                  </li>

                  {/* Item 2 — Pure Seva Bhav */}
                  <li className="flex items-start gap-3 card-lift p-3 rounded-xl hover:bg-orange-50 cursor-default">
                    <span className="mt-1 shrink-0 text-[#7C2D12]">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                      </svg>
                    </span>
                    <div>
                      <p className="font-semibold text-[#7C2D12]">Pure Seva Bhav</p>
                      <p className="text-sm text-gray-600">Seva-based, not commercial — every performance is an offering to Baba Shyam, not a transaction.</p>
                    </div>
                  </li>

                </ul>
              </div>

              {/* RIGHT COLUMN — gallery placeholder */}
              <div className="bg-orange-50 rounded-2xl p-6 border border-orange-100 shadow-inner reveal" style={{ transitionDelay: '150ms' }}>

                {/* Gallery heading */}
                <h3 className="text-lg font-semibold text-[#7C2D12] mb-4 flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Past Kirtan Glimpses
                </h3>

                {/* Gallery: 2 images + 1 video in grid */}
                <div className="grid grid-cols-2 gap-4">

                  {/* Card 1 — kirtan1.jpeg */}
                  <div className="aspect-square rounded-lg relative overflow-hidden group cursor-pointer shadow-md hover:shadow-xl transition-shadow">
                    <img
                      src="/gallery/kirtan1.jpeg"
                      alt="Bhajan Sandhya kirtan session"
                      className="w-full h-full object-cover"
                    />
                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent flex items-end justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 p-4">
                      <p className="text-white text-xs font-semibold text-center">Bhajan Sandhya</p>
                    </div>
                  </div>

                  {/* Card 2 — kirtan2.jpeg */}
                  <div className="aspect-square rounded-lg relative overflow-hidden group cursor-pointer shadow-md hover:shadow-xl transition-shadow">
                    <img
                      src="/gallery/kirtan2.jpeg"
                      alt="Devotional gathering with Mandal"
                      className="w-full h-full object-cover"
                    />
                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent flex items-end justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 p-4">
                      <p className="text-white text-xs font-semibold text-center">Devotional Gathering</p>
                    </div>
                  </div>

                  {/* Card 3 — kir_vid1.mp4 (wide, spans 2 columns) */}
                  <div className="aspect-video col-span-2 rounded-lg relative overflow-hidden shadow-md hover:shadow-xl transition-shadow">
                    <video
                      src="/gallery/kir_vid1.mp4"
                      controls
                      className="w-full h-full object-cover rounded-lg"
                      preload="metadata"
                    >
                      Your browser does not support the video tag.
                    </video>
                    <div className="absolute top-2 left-2 bg-[#7C2D12]/80 backdrop-blur-sm text-white text-xs font-bold px-2 py-1 rounded-full">
                      🎬 Video
                    </div>
                  </div>

                </div>

                {/* Caption */}
                <p className="text-sm text-center text-gray-500 mt-4 italic">
                  Glimpses from our recent Bhajan Sandhyas
                </p>

              </div>
            </div>

          </div>
        </div>

        {/* ── Book Your Date Section ───────────────────────────────────────── */}
        <div ref={bookRef}>
          <div className="border-t border-orange-100 mt-20 pt-10 px-4 max-w-6xl mx-auto">

            {/* Section heading */}
            <div className="text-center mb-12 reveal">
              <h2 className="text-3xl md:text-4xl font-serif font-bold text-[#7C2D12]">Book Your Date</h2>
              <div className="w-24 h-1 bg-[#EAB308] mx-auto mt-3 rounded-full" />
              <p className="text-gray-600 max-w-2xl mx-auto mt-4 text-lg">
                Fill out the form below to request a Bhajan Sandhya at your home. We will get back to you to confirm the details and availability.
              </p>
            </div>

            <div className="max-w-2xl mx-auto reveal">

              {/* Booking Form Card */}
              <div className="bg-white rounded-2xl shadow-xl p-8 border border-orange-100">

                {/* Success state */}
                {submitStatus === 'success' ? (
                  <div className="text-center py-10">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">🙏 Jai Shree Shyam!</h3>
                    <p className="text-gray-600 mb-6">Your booking request has been submitted. We will contact you shortly to confirm the details.</p>
                    <button
                      onClick={() => setSubmitStatus('idle')}
                      className="text-[#7C2D12] font-semibold hover:underline"
                    >
                      Submit another request
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-6">

                    {/* Name + Phone row */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label htmlFor="full_name" className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                        <input
                          type="text"
                          id="full_name"
                          name="full_name"
                          required
                          value={formData.full_name}
                          onChange={handleInputChange}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7C2D12] focus:border-transparent outline-none transition-all"
                          placeholder="Your full name"
                        />
                      </div>
                      <div>
                        <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">Phone Number *</label>
                        <input
                          type="tel"
                          id="phone"
                          name="phone"
                          required
                          value={formData.phone}
                          onChange={handleInputChange}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7C2D12] focus:border-transparent outline-none transition-all"
                          placeholder="+91 98765 43210"
                        />
                      </div>
                    </div>

                    {/* Preferred Date */}
                    <div>
                      <label htmlFor="booking_date" className="block text-sm font-medium text-gray-700 mb-1">Preferred Date *</label>
                      <input
                        type="date"
                        id="booking_date"
                        name="booking_date"
                        required
                        value={formData.booking_date}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7C2D12] focus:border-transparent outline-none transition-all"
                      />
                      {dateConflict && (
                        <p className="mt-1 text-sm text-amber-700 font-medium">
                          ⚠️ This date is already reserved. Please choose another date.
                        </p>
                      )}
                    </div>

                    {/* Address */}
                    <div>
                      <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">Event Address *</label>
                      <textarea
                        id="address"
                        name="address"
                        required
                        rows={3}
                        value={formData.address}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7C2D12] focus:border-transparent outline-none transition-all resize-none"
                        placeholder="Enter the complete address for the Bhajan Sandhya..."
                      />
                    </div>

                    {/* Additional Notes */}
                    <div>
                      <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">Additional Notes <span className="text-gray-400">(Optional)</span></label>
                      <textarea
                        id="notes"
                        name="notes"
                        rows={2}
                        value={formData.notes}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7C2D12] focus:border-transparent outline-none transition-all resize-none"
                        placeholder="Any specific requests or details..."
                      />
                    </div>

                    {/* Error messages */}
                    {submitStatus === 'error_conflict' && (
                      <div className="p-3 bg-amber-50 border border-amber-300 text-amber-800 rounded-lg text-sm font-medium">
                        This date is already reserved. Please choose another date.
                      </div>
                    )}
                    {submitStatus === 'error_generic' && (
                      <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                        Something went wrong. Please try again.
                      </div>
                    )}

                    {/* Submit button */}
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full bg-gradient-to-r from-[#7C2D12] via-[#C2410C] to-[#EA580C] text-white font-bold py-3 px-4 rounded-lg shadow-md transition-all duration-300 hover:shadow-xl hover:scale-[1.02] flex justify-center items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed animate-gradient-shift"
                    >
                      {isSubmitting ? (
                        <>
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 100 16v-4l-3 3 3 3v-4a8 8 0 01-8-8z" />
                          </svg>
                          Submitting Request...
                        </>
                      ) : (
                        'Submit Booking Request'
                      )}
                    </button>

                    <p className="text-xs text-center text-gray-500">
                      Submitting this form is a request only. Confirmation will be shared after we contact you.
                    </p>

                  </form>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Contact Us Section ──────────────────────────────────────────── */}
        <div ref={contactRef}>
          <div className="border-t border-orange-100 mt-20 pt-10 px-4 max-w-6xl mx-auto">

            {/* Section heading */}
            <div className="text-center mb-12 reveal">
              <h2 className="text-3xl md:text-4xl font-serif font-bold text-[#7C2D12]">
                Contact Us
              </h2>
              <div className="w-24 h-1 bg-[#EAB308] mx-auto mt-3 rounded-full" />
            </div>

            {/* Three-column card grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto mt-12">

              {/* Card 1 — Phone */}
              <div className="bg-white p-6 rounded-2xl shadow-md border border-orange-50 text-center card-lift reveal">
                <div className="w-12 h-12 bg-gradient-to-br from-orange-100 to-amber-100 text-[#7C2D12] rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-[#7C2D12] mb-2">Call Us</h3>
                <p className="text-gray-600">+91 98765 43210</p>
                <p className="text-gray-600">+91 91234 56789</p>
              </div>

              {/* Card 2 — Email */}
              <div className="bg-white p-6 rounded-2xl shadow-md border border-orange-50 text-center card-lift reveal" style={{ transitionDelay: '120ms' }}>
                <div className="w-12 h-12 bg-gradient-to-br from-orange-100 to-amber-100 text-[#7C2D12] rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-[#7C2D12] mb-2">Email Us</h3>
                <p className="text-gray-600">seva@shyambhajan.com</p>
                <p className="text-gray-600">contact@shyambhajan.com</p>
              </div>

              {/* Card 3 — Location */}
              <div className="bg-white p-6 rounded-2xl shadow-md border border-orange-50 text-center card-lift reveal" style={{ transitionDelay: '240ms' }}>
                <div className="w-12 h-12 bg-gradient-to-br from-orange-100 to-amber-100 text-[#7C2D12] rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-[#7C2D12] mb-2">Location</h3>
                <p className="text-gray-600">Khatu Shyam Temple Area</p>
                <p className="text-gray-600">Sikar, Rajasthan, India</p>
              </div>

            </div>

          </div>
        </div>

      </main>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="relative mt-20 overflow-hidden">
        <div className="hero-gradient py-12">
          {/* Subtle orb */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-24 bg-[#EAB308]/10 blur-3xl rounded-full pointer-events-none" />
          <div className="relative z-10 max-w-6xl mx-auto px-4 text-center text-white">
            <p className="font-serif text-3xl font-bold mb-2">
              <span className="shimmer-gold">🙏 Jai Shree Shyam 🙏</span>
            </p>
            <p className="text-orange-200/70 text-sm mt-3">
              © {new Date().getFullYear()} Shyam Bhajan Seva Mandal · Serving with devotion
            </p>
          </div>
        </div>
      </footer>

    </div>
  );
}
