import './globals.css'
import React from 'react'

export const metadata = {
  title: 'Shree Nishan Yatra Parivar | Shyam Bhajan Seva',
  description: 'Book a divine Bhajan Sandhya easily at home.',
  icons: {
    icon: '/icon.png',
    shortcut: '/icon.png',
    apple: '/icon.png',
  },
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