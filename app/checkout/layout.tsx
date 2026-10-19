import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Secure Checkout | Akubrecah Technologies',
  description: 'Secure M-Pesa and card payment portal for Akubrecah Technologies services.',
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
