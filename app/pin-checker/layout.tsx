import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Internal Verification Utility | Akubrecah Technologies',
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default function PinCheckerLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
