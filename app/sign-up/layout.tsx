import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign Up | Akubrecah Technologies',
  description: 'Create an account on Akubrecah Technologies.',
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default function SignUpLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
