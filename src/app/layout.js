import './globals.css'

export const metadata = {
  title: 'Orbit — See your codebase. Talk to it.',
  description: 'AI-powered codebase visualiser for React and Next.js projects.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
