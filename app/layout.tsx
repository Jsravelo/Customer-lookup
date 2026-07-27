import type { Metadata } from 'next'
import { Mulish } from 'next/font/google'
import './globals.css'

const mulish = Mulish({
  subsets: ['latin'],
  variable: '--font-mulish',
})

export const metadata: Metadata = {
  title: 'Customer Lookup — ZenMaid',
  description: 'ZenMaid CS tool — look up customer history across Intercom and Close CRM',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={mulish.variable}>
      <body className="min-h-screen bg-[#f2f7f7] font-sans text-gray-900 antialiased">
        {children}
      </body>
    </html>
  )
}
