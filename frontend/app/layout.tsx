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
        {children}
      </body>
    </html>
  )
}