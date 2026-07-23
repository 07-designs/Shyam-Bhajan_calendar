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

  // Smart Video Preview & Fullscreen Modal State
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const previewVideoRef = useRef<HTMLVideoElement>(null);
  const [isLazyLoaded, setIsLazyLoaded] = useState(false);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);

  // IntersectionObserver for video preview lazy loading & viewport play/pause
  useEffect(() => {
    if (!videoContainerRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsLazyLoaded(true);
            if (previewVideoRef.current && !isVideoModalOpen) {
              previewVideoRef.current.play().catch(() => {});
            }
          } else {
            if (previewVideoRef.current) {
              previewVideoRef.current.pause();
            }
          }
        });
      },
      { threshold: 0.45, rootMargin: '50px 0px' }
    );

    observer.observe(videoContainerRef.current);
    return () => observer.disconnect();
  }, [isVideoModalOpen]);

  const openVideoModal = () => {
    setIsVideoModalOpen(true);
    document.body.style.overflow = 'hidden';
    if (previewVideoRef.current) {
      previewVideoRef.current.pause();
    }
  };

  const closeVideoModal = () => {
    setIsVideoModalOpen(false);
    document.body.style.overflow = 'auto';
    if (previewVideoRef.current && videoContainerRef.current) {
      previewVideoRef.current.play().catch(() => {});
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isVideoModalOpen) {
        closeVideoModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isVideoModalOpen]);

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
    <div className="min-h-screen bg-[#140C08] text-[#F8F4EC] font-sans">

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
              Nishan Yatra Mandal
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

        {/* ── Hero Section (World-Class Cinematic Devotional Landing Canvas) ──────────────────────────────────────────────── */}
        <div ref={homeRef} className="relative w-full overflow-hidden bg-[#140C08] text-[#F8F4EC] min-h-[95vh] lg:min-h-[100vh] flex items-center shadow-2xl border-b border-[#D4A017]/15">

          {/* 1. Seamless Full-Canvas Krishna Artwork Composition Background */}
          <div className="absolute inset-0 z-0">
            <img
              src="/gallery/krishna_hero.jpg"
              alt="Kanhaji Khatu Shyam Ji Divine Hero Canvas"
              className="w-full h-full object-cover object-right lg:object-[85%_center] transition-transform duration-1000 hover:scale-[1.02] opacity-95"
            />
          </div>

          {/* 2. Soft Golden Radial Glow behind Krishna */}
          <div className="absolute inset-0 z-0 krishna-aura-glow pointer-events-none" />

          {/* 3. Soft Warm Devotional Gradient Overlay (Fading seamless left-to-right) */}
          <div className="absolute inset-0 z-10 hero-devotional-overlay pointer-events-none" />

          {/* Bottom Fade into page background */}
          <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#140C08] via-[#140C08]/60 to-transparent z-10 pointer-events-none" />

          {/* Ambient floating golden particles & twinkling dots */}
          {[
            { top: '16%', left: '5%',  delay: '0s',    size: 'w-1.5 h-1.5' },
            { top: '24%', left: '42%', delay: '1.2s',  size: 'w-2 h-2' },
            { top: '68%', left: '7%',  delay: '0.6s',  size: 'w-1 h-1' },
            { top: '80%', left: '38%', delay: '2s',    size: 'w-1.5 h-1.5' },
            { top: '35%', left: '88%', delay: '1.5s',  size: 'w-1.5 h-1.5' },
          ].map((star, i) => (
            <div
              key={i}
              className={`absolute ${star.size} bg-[#D4A017] rounded-full animate-twinkle pointer-events-none z-20`}
              style={{ top: star.top, left: star.left, animationDelay: star.delay }}
            />
          ))}

          {/* 4. Floating Left-Aligned Content Container */}
          <div className="relative z-20 w-full max-w-7xl mx-auto px-6 sm:px-10 lg:px-16 py-20 lg:py-28 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            <div className="lg:col-span-7 text-left space-y-7 max-w-2xl">
              
              {/* Devotional Tagline Badge */}
              <div className="animate-fade-in-down">
                <span className="inline-flex items-center gap-2 bg-[#D4A017]/15 border border-[#D4A017]/35 text-[#D4A017] font-semibold text-xs sm:text-sm px-5 py-2.5 rounded-full tracking-wider backdrop-blur-md shadow-sm">
                  <span>✨</span>
                  <span>Where devotion meets your doorstep</span>
                  <span>•</span>
                  <span>JAI SHREE SHYAM</span>
                  <span>✨</span>
                </span>
              </div>

              {/* Headline */}
              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-serif font-bold text-[#F8F4EC] leading-[1.15] tracking-tight animate-fade-in-up delay-200">
                Invite Baba Shyam&apos;s{' '}
                <span className="shimmer-gold block sm:inline">Divine Grace</span>{' '}
                Into Your Home
              </h1>

              {/* Paragraph Description (~45-55 chars per line) */}
              <p className="text-[#F8F4EC]/85 text-base sm:text-lg lg:text-xl max-w-xl leading-relaxed animate-fade-in-up delay-300 font-light">
                Book a Bhajan Sandhya with our Mandal — soulful kirtan, harmonium, dholak, and dhun. A divine evening of devotion at your doorstep.
              </p>
              {/* CTA Buttons */}
              <div className="flex flex-wrap items-center gap-5 pt-3 animate-fade-in-up delay-400">
                <button
                  onClick={() => scrollTo(bookRef)}
                  className="inline-flex items-center bg-[#D4A017] text-[#2A1A10] font-bold text-base sm:text-lg px-9 py-4 rounded-full shadow-2xl hover:scale-105 hover:bg-[#C77A1A] hover:text-white transition-all duration-300 animate-pulse-gold"
                >
                  Book Your Date
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 ml-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>

                <button
                  onClick={() => scrollTo(aboutRef)}
                  className="inline-flex items-center border border-white/25 text-[#F8F4EC] font-semibold text-base sm:text-lg px-8 py-4 rounded-full hover:bg-white/15 hover:border-amber-300/80 transition-all duration-300 backdrop-blur-md bg-white/10"
                >
                  Learn More
                </button>
              </div>

              {/* Trust Social Proof / Sub-Badge */}
              <div className="pt-2 flex items-center gap-3 animate-fade-in-up delay-500 text-xs text-amber-200/90 font-medium">
                <div className="flex -space-x-2">
                  <span className="w-7 h-7 rounded-full bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-[10px] text-amber-200">🙏</span>
                  <span className="w-7 h-7 rounded-full bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-[10px] text-amber-200">🌸</span>
                  <span className="w-7 h-7 rounded-full bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-[10px] text-amber-200">✨</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-amber-400">★★★★★</span>
                  <span className="text-stone-300">Trusted by 500+ Devotees</span>
                </div>
              </div>

            </div>

          </div>

        </div>

        {/* ── About Us Section (🪶 Morpankh & Mandala Motif) ──────────────────────────────────────────── */}
        <div ref={aboutRef} className="relative py-24 px-4 overflow-hidden about-morpankh-motif border-t border-[#D4A017]/20">
          
          {/* Faded Peacock Feather (Morpankh) Background Overlay */}
          <div className="absolute top-0 right-0 w-[450px] h-[450px] opacity-[0.05] pointer-events-none transform translate-x-20 -translate-y-20">
            <svg viewBox="0 0 200 200" fill="none" className="w-full h-full text-[#D4A017]">
              <path d="M100 10C60 50 30 90 20 150C40 130 80 110 100 10Z" fill="currentColor"/>
              <circle cx="100" cy="50" r="25" stroke="currentColor" strokeWidth="4"/>
              <circle cx="100" cy="50" r="12" fill="currentColor"/>
            </svg>
          </div>

          <div className="max-w-6xl mx-auto relative z-10">

            {/* Section heading */}
            <div className="text-center mb-16 reveal relative">
              <div className="w-48 h-48 mx-auto -mb-32 opacity-20 rounded-full mandala-heading-bg pointer-events-none" />
              <span className="text-[#D4A017] text-xs uppercase tracking-widest font-semibold block mb-2">🪶 Sacred Seva & Music</span>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-serif font-bold text-[#F8F4EC]">
                About Our Mandal
              </h2>
              <div className="w-24 h-1 bg-[#D4A017] mx-auto mt-3 rounded-full" />
            </div>

            {/* Two-column grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">

              {/* LEFT COLUMN — descriptive text */}
              <div className="reveal">
                <p className="text-stone-300/90 leading-relaxed mb-5 text-base sm:text-lg font-light">
                  Shyam Bhajan Seva Mandal is a devotional group dedicated to the loving service of Baba Shyam through the sacred art of kirtan. For years, we have been bringing the warmth of collective devotion directly to homes, temples, and community gatherings — transforming every space into a spiritual sanctuary.
                </p>
                <p className="text-stone-300/90 leading-relaxed mb-8 text-base sm:text-lg font-light">
                  Our team of devoted musicians and singers performs with a single purpose: to create an atmosphere of pure bhakti where every heart can experience the divine presence of Khatu Shyam ji. We believe that true seva is offered without expectation, and that belief guides every kirtan we perform.
                </p>

                {/* Feature list */}
                <ul className="space-y-4">

                  {/* Item 1 — Complete Musical Ensemble */}
                  <li className="flex items-start gap-4 glass-devotional-card p-5 rounded-2xl cursor-default">
                    <span className="mt-1 shrink-0 p-2.5 bg-[#D4A017]/15 border border-[#D4A017]/30 text-[#D4A017] rounded-xl shadow-sm">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                      </svg>
                    </span>
                    <div>
                      <p className="font-semibold text-lg text-[#D4A017]">Complete Musical Ensemble</p>
                      <p className="text-sm text-stone-300/80 leading-relaxed">Harmonium, dholak, manjeera, khartaal — a full devotional orchestra for your sandhya.</p>
                    </div>
                  </li>

                  {/* Item 2 — Pure Seva Bhav */}
                  <li className="flex items-start gap-4 glass-devotional-card p-5 rounded-2xl cursor-default">
                    <span className="mt-1 shrink-0 p-2.5 bg-[#D4A017]/15 border border-[#D4A017]/30 text-[#D4A017] rounded-xl shadow-sm">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                      </svg>
                    </span>
                    <div>
                      <p className="font-semibold text-lg text-[#D4A017]">Pure Seva Bhav</p>
                      <p className="text-sm text-stone-300/80 leading-relaxed">Seva-based, not commercial — every performance is an offering to Baba Shyam, not a transaction.</p>
                    </div>
                  </li>

                </ul>
              </div>

              {/* RIGHT COLUMN — gallery placeholder */}
              <div className="glass-devotional-card rounded-3xl p-7 border border-[#D4A017]/30 shadow-2xl reveal lotus-bokeh-bg" style={{ transitionDelay: '150ms' }}>

                {/* Gallery heading */}
                <h3 className="text-xl font-semibold text-[#D4A017] mb-5 flex items-center gap-2.5">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-[#D4A017]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  🌸 Past Kirtan Glimpses
                </h3>

                {/* Gallery: 2 images + 1 video in grid */}
                <div className="grid grid-cols-2 gap-4">

                  {/* Card 1 — kirtan1.jpeg */}
                  <div className="aspect-square rounded-xl relative overflow-hidden group cursor-pointer shadow-lg border border-[#D4A017]/25">
                    <img
                      src="/gallery/kirtan1.jpeg"
                      alt="Bhajan Sandhya kirtan session"
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent flex items-end justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 p-4">
                      <p className="text-white text-xs font-semibold text-center">Bhajan Sandhya</p>
                    </div>
                  </div>

                  {/* Card 2 — kirtan2.jpeg */}
                  <div className="aspect-square rounded-xl relative overflow-hidden group cursor-pointer shadow-lg border border-[#D4A017]/25">
                    <img
                      src="/gallery/kirtan2.jpeg"
                      alt="Devotional gathering with Mandal"
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent flex items-end justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 p-4">
                      <p className="text-white text-xs font-semibold text-center">Devotional Gathering</p>
                    </div>
                  </div>

                  {/* Card 3 — Cinematic Smart Video Preview */}
                  <div
                    ref={videoContainerRef}
                    onClick={openVideoModal}
                    className="aspect-video col-span-2 rounded-2xl relative overflow-hidden shadow-2xl border border-[#D4A017]/35 group cursor-pointer bg-[#140C08]"
                  >
                    {isLazyLoaded ? (
                      <video
                        ref={previewVideoRef}
                        src="/gallery/kir_vid1.mp4"
                        muted
                        loop
                        playsInline
                        preload="metadata"
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full bg-[#140C08] flex items-center justify-center">
                        <span className="text-[#D4A017]/50 text-xs tracking-wider animate-pulse">Loading Bhajan Sandhya Glimpse...</span>
                      </div>
                    )}

                    {/* Dark gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#140C08]/90 via-[#140C08]/30 to-transparent transition-opacity duration-300 group-hover:from-[#140C08]/95" />

                    {/* Custom Circular Play Button */}
                    <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                      <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-[#D4A017]/25 border-2 border-[#D4A017] backdrop-blur-md flex items-center justify-center text-[#F8F4EC] shadow-[0_0_30px_rgba(212,160,23,0.4)] group-hover:scale-110 group-hover:bg-[#D4A017]/45 transition-all duration-300">
                        <svg className="w-7 h-7 sm:w-8 sm:h-8 ml-1 text-[#F8F4EC] fill-current" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </div>
                    </div>

                    {/* Overlay Info Header & Footer */}
                    <div className="absolute bottom-3.5 left-4 right-4 z-10 flex justify-between items-end">
                      <div>
                        <span className="inline-block bg-[#D4A017]/20 border border-[#D4A017]/40 text-[#D4A017] text-[10px] sm:text-xs font-bold px-3 py-0.5 rounded-full mb-1 backdrop-blur-sm">
                          🎬 Video Glimpse
                        </span>
                        <h4 className="text-sm sm:text-base font-serif font-bold text-[#F8F4EC] drop-shadow-md">
                          Bhajan Sandhya Glimpse
                        </h4>
                        <p className="text-xs text-stone-300/80 font-light">
                          Experience Divine Devotion
                        </p>
                      </div>
                      <span className="text-[11px] sm:text-xs text-[#D4A017] font-semibold bg-black/60 px-3 py-1 rounded-full border border-[#D4A017]/30 backdrop-blur-md group-hover:bg-[#D4A017] group-hover:text-[#2A1A10] transition-colors hidden sm:inline-block">
                        Watch Fullscreen 🔊
                      </span>
                    </div>
                  </div>

                </div>

                {/* Caption */}
                <p className="text-xs text-center text-stone-400/90 mt-5 italic">
                  Glimpses from our recent Bhajan Sandhyas
                </p>

              </div>
            </div>

          </div>
        </div>

        {/* ── Book Your Date Section (🪔 Diya Glow & Temple Ambience) ───────────────────────────────────────── */}
        <div ref={bookRef} className="relative py-24 px-4 overflow-hidden diya-ambient-glow border-t border-[#D4A017]/20">
          
          {/* Ambient Diya Light Glow & Radial Orbs */}
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-[#D4A017]/12 blur-3xl rounded-full pointer-events-none" />

          <div className="max-w-6xl mx-auto relative z-10">

            {/* Section heading */}
            <div className="text-center mb-16 reveal">
              <span className="text-[#D4A017] text-xs uppercase tracking-widest font-semibold block mb-2">🪔 Divine Invitation</span>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-serif font-bold text-[#F8F4EC]">Book Your Date</h2>
              <div className="w-24 h-1 bg-[#D4A017] mx-auto mt-3 rounded-full" />
              <p className="text-stone-300/90 max-w-2xl mx-auto mt-4 text-base sm:text-lg font-light leading-relaxed">
                Fill out the form below to request a Bhajan Sandhya at your home. We will get back to you to confirm the details and availability.
              </p>
            </div>

            <div className="max-w-2xl mx-auto reveal">

              {/* Booking Form Floating Premium Glass Card */}
              <div className="glass-devotional-card rounded-3xl p-8 sm:p-10 border border-[#D4A017]/35 shadow-2xl text-[#F8F4EC]">

                {/* Success state */}
                {submitStatus === 'success' ? (
                  <div className="text-center py-10">
                    <div className="w-16 h-16 bg-[#D4A017]/20 border border-[#D4A017]/45 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-[#D4A017]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <h3 className="text-2xl font-bold text-[#F8F4EC] mb-2">🙏 Jai Shree Shyam!</h3>
                    <p className="text-stone-300 mb-6">Your booking request has been submitted. We will contact you shortly to confirm the details.</p>
                    <button
                      onClick={() => setSubmitStatus('idle')}
                      className="text-[#D4A017] font-semibold hover:underline"
                    >
                      Submit another request
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-6">

                    {/* Name + Phone row */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label htmlFor="full_name" className="block text-sm font-medium text-stone-200 mb-1.5">Full Name *</label>
                        <input
                          type="text"
                          id="full_name"
                          name="full_name"
                          required
                          value={formData.full_name}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 bg-[#140C08] border border-[#D4A017]/30 text-[#F8F4EC] rounded-xl focus:ring-2 focus:ring-[#D4A017] focus:border-transparent outline-none transition-all placeholder-stone-500 shadow-inner"
                          placeholder="Your full name"
                        />
                      </div>
                      <div>
                        <label htmlFor="phone" className="block text-sm font-medium text-stone-200 mb-1.5">Phone Number *</label>
                        <input
                          type="tel"
                          id="phone"
                          name="phone"
                          required
                          value={formData.phone}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 bg-[#140C08] border border-[#D4A017]/30 text-[#F8F4EC] rounded-xl focus:ring-2 focus:ring-[#D4A017] focus:border-transparent outline-none transition-all placeholder-stone-500 shadow-inner"
                          placeholder="+91 98765 43210"
                        />
                      </div>
                    </div>

                    {/* Preferred Date */}
                    <div>
                      <label htmlFor="booking_date" className="block text-sm font-medium text-stone-200 mb-1.5">Preferred Date *</label>
                      <input
                        type="date"
                        id="booking_date"
                        name="booking_date"
                        required
                        value={formData.booking_date}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 bg-[#140C08] border border-[#D4A017]/30 text-[#F8F4EC] rounded-xl focus:ring-2 focus:ring-[#D4A017] focus:border-transparent outline-none transition-all shadow-inner"
                      />
                      {dateConflict && (
                        <p className="mt-1.5 text-sm text-amber-400 font-medium">
                          ⚠️ This date is already reserved. Please choose another date.
                        </p>
                      )}
                    </div>

                    {/* Address */}
                    <div>
                      <label htmlFor="address" className="block text-sm font-medium text-stone-200 mb-1.5">Event Address *</label>
                      <textarea
                        id="address"
                        name="address"
                        required
                        rows={3}
                        value={formData.address}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 bg-[#140C08] border border-[#D4A017]/30 text-[#F8F4EC] rounded-xl focus:ring-2 focus:ring-[#D4A017] focus:border-transparent outline-none transition-all resize-none placeholder-stone-500 shadow-inner"
                        placeholder="Enter the complete address for the Bhajan Sandhya..."
                      />
                    </div>

                    {/* Additional Notes */}
                    <div>
                      <label htmlFor="notes" className="block text-sm font-medium text-stone-200 mb-1.5">Additional Notes <span className="text-stone-400">(Optional)</span></label>
                      <textarea
                        id="notes"
                        name="notes"
                        rows={2}
                        value={formData.notes}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 bg-[#140C08] border border-[#D4A017]/30 text-[#F8F4EC] rounded-xl focus:ring-2 focus:ring-[#D4A017] focus:border-transparent outline-none transition-all resize-none placeholder-stone-500 shadow-inner"
                        placeholder="Any specific requests or details..."
                      />
                    </div>

                    {/* Error messages */}
                    {submitStatus === 'error_conflict' && (
                      <div className="p-3.5 bg-amber-950/80 border border-amber-500/50 text-amber-300 rounded-xl text-sm font-medium">
                        This date is already reserved. Please choose another date.
                      </div>
                    )}
                    {submitStatus === 'error_generic' && (
                      <div className="p-3.5 bg-red-950/80 border border-red-500/50 text-red-300 rounded-xl text-sm">
                        Something went wrong. Please try again.
                      </div>
                    )}

                    {/* Submit button */}
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full bg-[#D4A017] text-[#2A1A10] font-bold py-4 px-6 rounded-xl shadow-2xl transition-all duration-300 hover:bg-[#C77A1A] hover:text-white flex justify-center items-center gap-2.5 disabled:opacity-70 disabled:cursor-not-allowed animate-pulse-gold text-base sm:text-lg"
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

                    <p className="text-xs text-center text-stone-400/90">
                      Submitting this form is a request only. Confirmation will be shared after we contact you.
                    </p>

                  </form>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Contact Us Section (🙏 Mandala & Sacred Geometry Motif) ──────────────────────────────────────────── */}
        <div ref={contactRef} className="relative py-24 px-4 overflow-hidden contact-mandala-bg border-t border-[#D4A017]/20">
          
          {/* Subtle Sacred Geometry Pattern Overlay */}
          <div className="absolute inset-0 opacity-[0.04] pointer-events-none bg-[radial-gradient(#D4A017_1px,transparent_1px)] [background-size:28px_28px]" />

          <div className="max-w-6xl mx-auto relative z-10">

            {/* Section heading */}
            <div className="text-center mb-16 reveal">
              <span className="text-[#D4A017] text-xs uppercase tracking-widest font-semibold block mb-2">🙏 Connect With Us</span>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-serif font-bold text-[#F8F4EC]">
                Contact Us
              </h2>
              <div className="w-24 h-1 bg-[#D4A017] mx-auto mt-3 rounded-full" />
            </div>

            {/* Three-column card grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto mt-12">

              {/* Card 1 — Phone */}
              <div className="glass-devotional-card p-8 rounded-3xl text-center reveal">
                <div className="w-14 h-14 bg-[#D4A017]/15 text-[#D4A017] border border-[#D4A017]/35 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-sm">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-[#D4A017] mb-2">Call Us</h3>
                <p className="text-stone-300 text-base font-light">+91 98765 43210</p>
                <p className="text-stone-300 text-base font-light">+91 91234 56789</p>
              </div>

              {/* Card 2 — Email */}
              <div className="glass-devotional-card p-8 rounded-3xl text-center reveal" style={{ transitionDelay: '120ms' }}>
                <div className="w-14 h-14 bg-[#D4A017]/15 text-[#D4A017] border border-[#D4A017]/35 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-sm">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-[#D4A017] mb-2">Email Us</h3>
                <p className="text-stone-300 text-base font-light">seva@shyambhajan.com</p>
                <p className="text-stone-300 text-base font-light">contact@shyambhajan.com</p>
              </div>

              {/* Card 3 — Location */}
              <div className="glass-devotional-card p-8 rounded-3xl text-center reveal" style={{ transitionDelay: '240ms' }}>
                <div className="w-14 h-14 bg-[#D4A017]/15 text-[#D4A017] border border-[#D4A017]/35 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-sm">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-[#D4A017] mb-2">Location</h3>
                <p className="text-stone-300 text-base font-light">Khatu Shyam Temple Area</p>
                <p className="text-stone-300 text-base font-light">Sikar, Rajasthan, India</p>
              </div>

            </div>

          </div>
        </div>

      </main>

      {/* ── Footer Section (✨ Starry Night & Golden Horizon Glow) ───────────────────────────────────────── */}
      <footer className="relative overflow-hidden footer-horizon-glow border-t border-[#D4A017]/25">
        <div className="py-16">
          {/* Soft Golden Horizon Orb */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-32 bg-[#D4A017]/15 blur-3xl rounded-full pointer-events-none" />
          <div className="relative z-10 max-w-6xl mx-auto px-4 text-center text-[#F8F4EC]">
            <p className="font-serif text-3xl sm:text-4xl font-bold mb-3">
              <span className="shimmer-gold">🙏 Jai Shree Shyam 🙏</span>
            </p>
            <p className="text-stone-400 text-sm mt-3 font-light">
              © {new Date().getFullYear()} Shyam Bhajan Seva Mandal · Serving with devotion
            </p>
          </div>
        </div>
      </footer>

      {/* ── Fullscreen Video Modal ─────────────────────────────────────────── */}
      {isVideoModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/92 backdrop-blur-2xl flex items-center justify-center p-4 sm:p-8 animate-fade-in"
          onClick={closeVideoModal}
        >
          {/* Close Button */}
          <button
            onClick={closeVideoModal}
            className="absolute top-6 right-6 z-50 w-12 h-12 rounded-full bg-[#1C120C]/90 border border-[#D4A017]/40 text-[#F8F4EC] flex items-center justify-center text-xl hover:bg-[#D4A017] hover:text-[#140C08] transition-all shadow-2xl cursor-pointer"
            aria-label="Close video modal"
          >
            ✕
          </button>

          {/* Video Container inside Modal */}
          <div
            className="relative max-w-5xl w-full aspect-video rounded-3xl overflow-hidden shadow-[0_0_80px_rgba(212,160,23,0.35)] border border-[#D4A017]/40 bg-[#140C08]"
            onClick={(e) => e.stopPropagation()}
          >
            <video
              src="/gallery/kir_vid1.mp4"
              controls
              autoPlay
              playsInline
              preload="auto"
              className="w-full h-full object-contain"
            />
          </div>
        </div>
      )}

    </div>
  );
}
