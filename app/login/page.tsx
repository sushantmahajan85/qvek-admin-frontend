import type { Metadata } from 'next';
import { LoginPage } from '@/components/qvek/login';

export const metadata: Metadata = { title: 'Sign in — Qvek Admin' };

export default function Page() {
  return <LoginPage />;
}
