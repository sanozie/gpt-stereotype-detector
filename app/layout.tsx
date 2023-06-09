import './globals.css'
import { Inter } from 'next/font/google'
import { HotToaster } from '@/components/hot-toaster'

export const metadata = {
  title: 'Stereotypical GPT',
  description:
    'A Next.js app that uses Vercel Postgres with pgvector, Prisma, and OpenAI to power a semantic search.',
}

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  display: 'swap',
})

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.variable}>
        {children}
        <HotToaster />
      </body>
    </html>
  )
}
