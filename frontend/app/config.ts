/**
 * Centralized API Configuration for Frontend.
 * Reads process.env.NEXT_PUBLIC_API_URL when deployed to Vercel/Production.
 * Defaults to live production Render API URL: https://shyam-bhajan-calendar.onrender.com
 */
export const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL || 'https://shyam-bhajan-calendar.onrender.com'
).replace(/\/$/, '');
