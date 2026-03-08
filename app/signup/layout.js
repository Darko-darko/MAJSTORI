import { Suspense } from 'react'
import RefCapture from '../components/RefCapture'

export const metadata = {
  title: 'Registrieren',
  robots: { index: false, follow: false },
}

export default function SignupLayout({ children }) {
  return (
    <>
      <Suspense fallback={null}><RefCapture /></Suspense>
      {children}
    </>
  )
}
