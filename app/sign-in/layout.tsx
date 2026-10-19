import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign In | Akubrecah Technologies',
  description: 'Authentication portal for Akubrecah Technologies client and developer consoles.',
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default function SignInLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
