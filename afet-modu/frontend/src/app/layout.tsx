import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Afet Modu — ING Hubs Türkiye',
  description: 'Müşteri başvurmaz, banka müşteriye gelir. Afet sonrası otonom kredi erteleme sistemi.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  )
}
