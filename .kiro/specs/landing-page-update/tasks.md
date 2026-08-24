# Implementation Plan: Landing Page Update

## Overview

Refactor `frontend/app/page.tsx` into a polished single-page client component with four scroll-linked sections, replace all `lucide-react` icon imports with inline SVG paths, remove the duplicate `<header>` from `layout.tsx`, and wire the booking form to the real FastAPI backend (`POST /api/bookings`, `GET /api/bookings`).

All code is TypeScript + React 19 + Tailwind CSS 4 inside the existing Next.js 16 App Router. No new routes, packages, or API routes are introduced.

## Tasks

- [x] 1. Remove the duplicate header from `layout.tsx`
  - Open `frontend/app/layout.tsx` and delete the entire `<header>` element and its contents
  - Render `{children}` directly inside `<body>`, keeping the `bg-spiritualBg` class and all metadata
  - Verify no `<header>` tag remains in the file
  - _Requirements: 1.1, 1.2_

- [x] 2. Set up TypeScript interfaces and client component scaffold in `page.tsx`
  - Replace the entire contents of `frontend/app/page.tsx` with a `'use client'` component
  - Define the `BookingFormData`, `BookingCreatePayload`, `BookingResponse`, and `SubmitStatus` interfaces from the design
  - Declare `useState` and `useRef` hooks: `formData`, `isSubmitting`, `submitStatus`, `bookedDates`, `dateConflict`, and the four section refs (`homeRef`, `aboutRef`, `bookRef`, `contactRef`)
  - Implement the `scrollTo` helper that calls `ref.current?.scrollIntoView({ behavior: 'smooth' })`
  - Return a minimal `<div>` placeholder (filled in subsequent tasks) — the component must compile without errors
  - _Requirements: 2.4, 2.5_

- [x] 3. Implement the sticky Navbar
  - Replace the placeholder with the full page shell (`<div>` with `min-h-screen`) containing a `<nav>` element
  - Apply `sticky top-0 z-50` positioning with the maroon (`#7C2D12`) background and white text from the theme
  - Render the site title "Shyam Bhajan Seva" as the leftmost element
  - Render four `<button>` elements: "Home", "About Us", "Book Your Date", "Contact Us" — each calls `scrollTo` with the matching ref
  - Replace any decorative icons with inline `<svg>` paths (no lucide-react imports)
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 9.1, 9.2_

- [x] 4. Implement the Hero section
  - Add `<div ref={homeRef}>` inside `<main>` as the first section
  - Render the headline ("Invite Baba Shyam's Divine Grace into your Home"), subtitle mentioning kirtan / harmonium / dholak / dhun, and a "Book Now" `<button>` that calls `scrollTo(bookRef)`
  - Apply the deep orange-to-brown gradient background (`from-[#7C2D12] to-[#C2410C]`) and gold (`#EAB308`) accent text
  - Decorative badge ("🙏 JAI SHREE SHYAM 🙏") and any arrow/chevron icon must use inline SVG or Unicode — no lucide-react
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 9.1, 9.2_

- [x] 5. Implement the About Us section with gallery placeholder
  - Add `<div ref={aboutRef}>` as the second section
  - Render descriptive text covering the Mandal's purpose, seva philosophy, and musical ensemble (harmonium, dholak, manjeera, khartaal)
  - Render a gallery grid with **exactly four** placeholder cards in a `grid-cols-2` layout; each card must show a label ("Image Placeholder" or "Video Placeholder") and display a hover overlay on mouse-over
  - The overlay icon (play/image symbol) must be an inline `<svg>` path — no lucide-react
  - Render the caption "Images and videos from our recent Bhajan Sandhyas will be uploaded here." below the grid
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 9.1, 9.2_

- [x] 6. Implement the `fetchBookedDates` helper and Booked Dates Panel
  - Implement `fetchBookedDates(): Promise<void>`:
    - Calls `GET http://localhost:8000/api/bookings`
    - Extracts `booking_date` from each `BookingResponse` and calls `setBookedDates([...dates])`
    - On any error: `catch(() => {})` — silently suppresses, leaves `bookedDates` as `[]`
  - Add a `useEffect(() => { fetchBookedDates(); }, [])` to fetch on mount
  - In the Booking section, render a **Booked Dates Panel** adjacent to the date picker:
    - When `bookedDates.length > 0`: render each date as a visually distinct badge (e.g., amber/gold pill)
    - When `bookedDates.length === 0`: render nothing (or a "No dates booked yet" note)
  - _Requirements: 7.1, 7.2, 7.3, 7.5_

- [x] 7. Implement the Booking Form with real API submission
  - Add `<div ref={bookRef}>` as the third section containing the inline Booking Form (no modal)
  - Include all five fields using the correct HTML elements and `name` attributes matching `BookingFormData`:
    - Full Name — `<input type="text" name="full_name" required>`
    - Phone Number — `<input type="tel" name="phone" required>`
    - Address — `<textarea name="address" required>`
    - Preferred Date — `<input type="date" name="booking_date" required>`
    - Additional Notes — `<textarea name="notes">` (optional, not sent to backend)
  - Implement `handleInputChange` to keep `formData` in sync and set `dateConflict` when the chosen date is in `bookedDates`
  - Implement `handleSubmit`:
    - Sets `isSubmitting = true`, disables the submit button, shows a spinner inline SVG
    - Builds `BookingCreatePayload` (`alt_phone: null`) and calls `POST http://localhost:8000/api/bookings`
    - On HTTP 201: sets `submitStatus = 'success'`, resets `formData` to empty defaults, calls `fetchBookedDates()`
    - On HTTP 400: sets `submitStatus = 'error_conflict'`
    - On other non-2xx or network error: sets `submitStatus = 'error_generic'`
    - Always sets `isSubmitting = false` in `finally`
    - Does **not** use `setTimeout` as a substitute for a real fetch
  - Render conditional UI based on `submitStatus`:
    - `'success'`: success message + "Submit another request" button that resets to `'idle'`
    - `'error_conflict'`: inline warning "This date is already reserved. Please choose another date."
    - `'error_generic'`: inline error "Something went wrong. Please try again."
  - Render the `dateConflict` inline warning when `dateConflict === true`
  - Submit button label: "Submit Booking Request"
  - Spinner must be an inline `<svg>` — no lucide-react
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 7.4, 7.6, 9.1, 9.2_

- [x] 8. Implement the Contact Us section
  - Add `<div ref={contactRef}>` as the fourth section
  - Render three cards in a `grid-cols-1 md:grid-cols-3` layout: Phone, Email, Location
  - Phone card: ≥ 2 placeholder phone numbers
  - Email card: ≥ 2 placeholder email addresses
  - Location card: a placeholder area name (e.g., "Khatu Shyam Temple Area, Sikar, Rajasthan")
  - Each card icon must be an inline `<svg>` path — no lucide-react
  - Apply white card backgrounds with orange/maroon border accents per the theme
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 9.1, 9.2_

- [x] 9. Apply thematic styling and remove all lucide-react references
  - Verify the page compiles with zero `import` statements referencing `lucide-react`
  - Confirm all sections use the CSS custom properties from `globals.css`: `--color-saffron` (#C2410C), `--color-maroon` (#7C2D12), `--color-gold` (#EAB308), `--color-spiritualBg` (#FFFDF9)
  - Ensure all styling is done via Tailwind utility classes — no inline `style=` objects or additional CSS files
  - Navbar, Hero, and Footer use maroon/saffron backgrounds with gold accents
  - Booking Form and Contact cards use white/warm-neutral backgrounds with orange/maroon border accents
  - _Requirements: 9.1, 9.2, 9.3, 10.1, 10.2, 10.3, 10.4_

- [x] 10. Install testing framework and write unit tests
  - [x] 10.1 Install Vitest, @testing-library/react, @testing-library/user-event, jsdom, and fast-check as dev dependencies
    - Run: `npm install --save-dev vitest @testing-library/react @testing-library/user-event @vitejs/plugin-react jsdom fast-check`
    - Add a `vitest.config.ts` (or update `next.config.ts`) to configure jsdom environment
    - Add `"test": "vitest --run"` script to `package.json`
    - _Requirements: all_

  - [ ]* 10.2 Write unit tests for layout and navbar
    - Test: `layout.tsx` renders `{children}` without a `<header>` element
    - Test: page renders exactly one `<nav>` element
    - Test: Navbar contains the four labels "Home", "About Us", "Book Your Date", "Contact Us"
    - Test: clicking a nav button calls `scrollIntoView` with `{ behavior: 'smooth' }`
    - _Requirements: 1.1, 1.2, 2.3, 2.4_

  - [ ]* 10.3 Write unit tests for Hero, About, and Contact sections
    - Test: "Book Now" button triggers scroll to booking section ref
    - Test: Gallery placeholder renders ≥ 4 cards
    - Test: Contact section has ≥ 2 phone numbers, ≥ 2 emails, 1 location entry
    - Test: No `lucide-react` import present in `page.tsx` source text
    - _Requirements: 3.3, 4.2, 8.1, 8.2, 8.3, 9.1_

  - [ ]* 10.4 Write unit tests for booking form UI states
    - Test: form renders all 5 fields; date input is `type="date"`; no calendar grid rendered
    - Test: POST 201 → success message shown + fields cleared
    - Test: POST 400 → "already reserved" message shown
    - Test: POST 500 → generic error message shown
    - Test: while submitting → button is disabled + spinner is visible
    - Test: component mount triggers `GET /api/bookings`
    - Test: after successful POST, `GET /api/bookings` is called again
    - Test: GET failure → no error UI shown, form still renders
    - _Requirements: 5.2, 5.3, 5.4, 6.3, 6.4, 6.5, 6.6, 7.1, 7.5, 7.6_

- [ ] 11. Write property-based tests
  - [ ]* 11.1 Write property test for booking form payload field mapping (Property 1)
    - Use `fc.record` to generate arbitrary valid `full_name`, `phone`, `address`, and `booking_date` values
    - Mock `fetch`, render `<Home />`, fill all form fields with the generated values, submit the form
    - Assert the captured POST body equals `{ full_name, phone, address, booking_date, alt_phone: null }`
    - Run with `numRuns: 100`
    - **Property 1: Booking form payload maps all fields correctly**
    - **Validates: Requirement 6.2**

  - [ ]* 11.2 Write property test for booked dates panel completeness (Property 2)
    - Use `fc.array(fc.record({ id, full_name, address, phone, alt_phone, booking_date, status }))` to generate arbitrary booking records
    - Mock `GET /api/bookings` to return the generated records
    - Render `<Home />`, assert every `booking_date` from the records is present in the rendered Booked Dates Panel
    - Run with `numRuns: 100`
    - **Property 2: Booked dates panel displays exactly the dates returned by the API**
    - **Validates: Requirements 7.2, 7.3**

  - [ ]* 11.3 Write property test for date conflict warning (Property 3)
    - Use `fc.array(fc.date().map(...), { minLength: 1 })` and `fc.nat()` to generate a list of booked dates and pick one
    - Mock `GET /api/bookings`, render `<Home />`, set the date picker to the picked date
    - Assert the "already reserved" inline warning is visible
    - Run with `numRuns: 100`
    - **Property 3: Date conflict warning fires for every booked date**
    - **Validates: Requirement 7.4**

  - [ ]* 11.4 Write property test for inline SVG icons (Property 4)
    - Render `<Home />` once
    - Query all `<svg>` elements in the rendered output
    - Assert each SVG has at least one `<path>` child with a `d` attribute
    - Assert no element has a class or data attribute tied to lucide-react
    - **Property 4: All rendered icons are inline SVG elements**
    - **Validates: Requirements 2.6, 3.5, 4.5, 8.5, 9.1, 9.2**

- [x] 12. Final checkpoint — Ensure all tests pass
  - Run `npm run test` from `frontend/` and confirm all unit and property tests pass
  - Confirm `npm run build` (or `next build`) completes with no TypeScript or Tailwind errors
  - Ensure all tasks pass, ask the user if questions arise.

## Notes

- Sub-tasks marked with `*` are optional and can be skipped for a faster MVP build
- Tasks 1–9 are pure implementation; tasks 10–11 add testing coverage
- Each task references specific requirements for traceability
- The design document contains the full TypeScript interfaces (`BookingFormData`, `BookingCreatePayload`, `BookingResponse`, `SubmitStatus`) — use them as-is
- The FastAPI backend at `http://localhost:8000` must be running for manual verification of tasks 6, 7
- The `notes` field in `BookingFormData` is a UI-only field and must NOT be included in the `BookingCreatePayload` sent to the backend
