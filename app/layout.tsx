import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'TNS FashionAI',
  description: 'Dashboard de ventas e importación de referencias para TNS.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  )
}
