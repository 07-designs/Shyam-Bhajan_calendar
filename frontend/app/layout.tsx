import './globals.css'
import React from 'react'

export const metadata = {
  title: 'Shyam Bhajan Seva Platform',
  description: 'Book a divine Bhajan Sandhya easily at home.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-spiritualBg text-stone-900 min-h-screen">
        <header className="bg-maroon text-white p-4 shadow-md flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold tracking-wide text-gold">Shyam Bhajan Seva</span>
          </div>
          <nav className="flex gap-4 text-sm font-semibold">
            <a href="/" className="hover:text-gold transition">Home</a>
            <a href="/admin" className="bg-saffron px-3 py-1.5 rounded text-white hover:bg-orange-700 transition">Admin Access</a>
          </nav>
        </header>
        {children}
      </body>
    </html>
  )
}