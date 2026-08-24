/**
 * Centralized API Configuration for Frontend
 * Reads process.env.NEXT_PUBLIC_API_URL when deployed to Vercel/Production.
 * Defaults to 'http://localhost:8000' for local development.
 */
export const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
).replace(/\/$/, '');
