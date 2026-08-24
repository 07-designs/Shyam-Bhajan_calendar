# Requirements Document

## Introduction

This feature refactors the existing "Shyam Bhajan Seva" homepage (`app/page.tsx`) into a polished, single-page, auto-scrollable website. The goals are:

1. Replace all `lucide-react` icon imports with inline SVG paths so the page has zero external icon library dependencies.
2. Remove the duplicate `<header>` rendered by `layout.tsx` so the page's own sticky navbar is the sole top-level navigation element.
3. Restructure the page into four clearly delineated sections — **Home (Hero)**, **About Us**, **Book Your Date**, and **Contact Us** — each reachable via smooth-scroll navigation.
4. Replace the simulated booking `setTimeout` with a real `POST /api/bookings` call and display already-booked dates fetched from `GET /api/bookings` as a visual indicator near the date picker.

The frontend stack is **Next.js 16 + React 19 + Tailwind CSS 4**. The backend is **FastAPI** running at `http://localhost:8000`.

---

## Glossary

- **Page**: The single Next.js route rendered by `frontend/app/page.tsx`.
- **Layout**: The root Next.js layout rendered by `frontend/app/layout.tsx`.
- **Navbar**: The sticky navigation bar rendered at the top of the Page.
- **Hero Section**: The full-width introductory banner at the top of the page body.
- **About Section**: The section describing the Mandal's purpose and containing the media gallery placeholder.
- **Booking Section**: The section containing the booking form and the booked-dates indicator.
- **Contact Section**: The section at the bottom containing placeholder contact information.
- **Booking Form**: The HTML form used to submit a new bhajan sandhya request.
- **Date Picker**: The native `<input type="date">` element inside the Booking Form.
- **Booked Dates Panel**: The visual indicator near the Date Picker that displays dates already reserved in the backend.
- **Backend API**: The FastAPI server running at `http://localhost:8000`.
- **Gallery Placeholder**: A grid of placeholder cards within the About Section reserved for future image/video uploads.
- **Smooth Scroll**: Browser-native scrolling animation triggered by `scrollIntoView({ behavior: 'smooth' })`.

---

## Requirements

---

### Requirement 1: Remove Duplicate Layout Header

**User Story:** As a developer, I want to remove the `<header>` element from `layout.tsx`, so that only the Page's own sticky Navbar is visible at the top of the screen and there is no duplicate header.

#### Acceptance Criteria

1. THE Layout SHALL render the page body (`{children}`) without wrapping it in a `<header>` element.
2. WHEN the Page is loaded, THE Page SHALL display exactly one navigation bar at the top of the viewport.

---

### Requirement 2: Sticky Navigation Bar

**User Story:** As a visitor, I want a sticky navigation bar fixed to the top of the screen, so that I can navigate to any section of the page at any time without scrolling back to the top.

#### Acceptance Criteria

1. THE Navbar SHALL remain fixed at the top of the viewport as the user scrolls down the page.
2. THE Navbar SHALL display the site title "Shyam Bhajan Seva" as the leftmost element.
3. THE Navbar SHALL contain four navigation items: "Home", "About Us", "Book Your Date", and "Contact Us".
4. WHEN a visitor clicks a navigation item, THE Page SHALL smooth-scroll the viewport to the corresponding section using `scrollIntoView({ behavior: 'smooth' })`.
5. THE Navbar SHALL use React `useRef` hooks to hold references to each section element.
6. THE Navbar SHALL use inline SVG paths for any decorative icons and SHALL NOT import from `lucide-react` or any other external icon library.
7. THE Navbar SHALL apply the thematic color palette (deep oranges, browns, and gold defined in `globals.css`).

---

### Requirement 3: Home (Hero) Section

**User Story:** As a visitor, I want an engaging hero section at the top of the page, so that I immediately understand the purpose of the Shyam Bhajan Seva platform and am encouraged to make a booking.

#### Acceptance Criteria

1. THE Hero Section SHALL display a prominent headline introducing the Bhajan Sandhya service.
2. THE Hero Section SHALL display a short descriptive subtitle about the Mandal's offering (kirtan, harmonium, dholak, dhun).
3. THE Hero Section SHALL display a "Book Now" call-to-action button that, WHEN clicked, smooth-scrolls the viewport to the Booking Section.
4. THE Hero Section SHALL apply the thematic color palette using deep orange-to-brown gradient backgrounds and gold accent text.
5. THE Hero Section SHALL NOT use any icons from `lucide-react` or external icon libraries; decorative elements SHALL use inline SVG or Unicode characters.

---

### Requirement 4: About Us Section

**User Story:** As a visitor, I want to read about the Mandal's dedication and see a gallery of past kirtans, so that I can trust the quality and authenticity of the service before booking.

#### Acceptance Criteria

1. THE About Section SHALL display descriptive text explaining the Mandal's purpose, seva philosophy, and musical ensemble.
2. THE About Section SHALL contain a Gallery Placeholder grid with a minimum of four placeholder cards designated for future image and video uploads.
3. WHEN a placeholder card is hovered, THE Gallery Placeholder SHALL display a visual overlay indicating the slot can hold an image or video.
4. THE About Section SHALL display a descriptive caption below the Gallery Placeholder stating that images and videos will be uploaded.
5. THE About Section SHALL NOT use icons from `lucide-react`; any icons used SHALL be rendered using inline SVG paths.

---

### Requirement 5: Book Your Date Section — Form Display

**User Story:** As a visitor, I want to see a booking form directly on the page (not in a modal or popup), so that I can quickly fill in my details without an extra interaction step.

#### Acceptance Criteria

1. THE Booking Section SHALL display the Booking Form inline on the page without a modal overlay or dialog.
2. THE Booking Form SHALL contain the following fields: Full Name (text, required), Phone Number (tel, required), Address (textarea, required), Preferred Date (Date Picker, required), and Additional Notes (textarea, optional).
3. THE Date Picker SHALL be a native HTML `<input type="date">` element.
4. THE Booking Form SHALL NOT contain or render an interactive calendar widget or a date-grid matrix UI.
5. THE Booking Form SHALL display a submit button labeled "Submit Booking Request".

---

### Requirement 6: Book Your Date Section — Real API Submission

**User Story:** As a visitor, I want my booking request to be sent to the real backend, so that the Mandal receives my information and can confirm the date.

#### Acceptance Criteria

1. WHEN the visitor submits the Booking Form, THE Booking Form SHALL send an HTTP `POST` request to `http://localhost:8000/api/bookings`.
2. THE Booking Form SHALL map form fields to the backend payload as follows: `full_name` ← Full Name, `phone` ← Phone Number, `address` ← Address, `booking_date` ← Preferred Date (ISO 8601 date string), `alt_phone` ← `null` (field not present in this form).
3. WHEN the `POST` request returns HTTP 201, THE Booking Form SHALL display a success confirmation message and reset all form fields to their empty defaults.
4. WHEN the `POST` request returns HTTP 400 (date already booked), THE Booking Form SHALL display an error message informing the visitor that the selected date is already taken.
5. WHEN the `POST` request returns any other non-2xx status, THE Booking Form SHALL display a generic error message instructing the visitor to try again.
6. WHILE the `POST` request is in-flight, THE Booking Form SHALL disable the submit button and display a loading indicator.
7. THE Booking Form SHALL NOT use `setTimeout` or any simulated delay in place of a real API call.

---

### Requirement 7: Book Your Date Section — Booked Dates Indicator

**User Story:** As a visitor, I want to see which dates are already booked before I pick a date, so that I can choose an available date without trial and error.

#### Acceptance Criteria

1. WHEN the Booking Section is first rendered, THE Booked Dates Panel SHALL fetch the list of existing bookings from `GET http://localhost:8000/api/bookings`.
2. THE Booked Dates Panel SHALL extract the `booking_date` field from each booking record returned by the API.
3. THE Booked Dates Panel SHALL display the booked dates as a visually distinct list or set of badges near the Date Picker.
4. WHEN a visitor selects a date in the Date Picker that matches a booked date, THE Booking Form SHALL display an inline warning message informing the visitor that the chosen date is already reserved.
5. WHEN the `GET` request fails, THE Booked Dates Panel SHALL silently suppress the error and display no booked dates (graceful degradation), so that the rest of the form remains functional.
6. WHEN a new booking is successfully submitted, THE Booked Dates Panel SHALL refresh the booked dates list from the API to reflect the newly added booking.

---

### Requirement 8: Contact Us Section

**User Story:** As a visitor, I want to find the Mandal's contact details at the bottom of the page, so that I can reach out through phone, email, or locate them if needed.

#### Acceptance Criteria

1. THE Contact Section SHALL display at least two placeholder phone numbers.
2. THE Contact Section SHALL display at least two placeholder email addresses.
3. THE Contact Section SHALL display a placeholder physical location or area name.
4. THE Contact Section SHALL present each contact category (phone, email, location) in a visually distinct card or block.
5. THE Contact Section SHALL NOT use icons from `lucide-react`; any icons SHALL be rendered using inline SVG paths.

---

### Requirement 9: No External Icon Library Dependencies

**User Story:** As a developer, I want the page to use only inline SVG icons, so that there are no runtime imports from `lucide-react` or similar libraries that could cause bundle bloat or version conflicts.

#### Acceptance Criteria

1. THE Page SHALL NOT contain any `import` statement referencing `lucide-react` or any other third-party icon library.
2. THE Page SHALL render all icons using inline `<svg>` elements with hardcoded path data (`d` attribute).
3. WHEN the project is built, THE build output SHALL contain zero references to `lucide-react` within the `page.tsx` compiled bundle.

---

### Requirement 10: Thematic Styling Consistency

**User Story:** As a designer, I want all sections to follow the established color palette, so that the page has a cohesive devotional visual identity.

#### Acceptance Criteria

1. THE Page SHALL apply the color palette defined in `globals.css`: `--color-saffron: #C2410C`, `--color-maroon: #7C2D12`, `--color-gold: #EAB308`, and `--color-spiritualBg: #FFFDF9`.
2. THE Page SHALL use Tailwind CSS utility classes for all styling and SHALL NOT introduce additional CSS-in-JS solutions or external stylesheet imports.
3. THE Navbar, Hero Section, and Footer SHALL use deep orange or maroon backgrounds with gold accent elements.
4. THE Booking Form and Contact Section cards SHALL use white or light warm-neutral backgrounds with orange or maroon border accents.
