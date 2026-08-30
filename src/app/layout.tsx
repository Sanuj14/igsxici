import type { Metadata } from 'next'
import { Providers } from './providers'
import './globals.css'

export const metadata: Metadata = {
  title: 'Skyscraper Street — Live Strategy Game',
  description: 'Build, trade, survive. The ultimate real-time skyscraper construction strategy game for college events.',
  keywords: ['skyscraper', 'strategy game', 'college event', 'live game'],
  openGraph: {
    title: 'Skyscraper Street',
    description: 'Build the best skyscraper in India. Survive the chaos.',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}
