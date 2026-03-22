'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    router.push('/landing');
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-dark flex items-center justify-center">
      <div className="text-cyan-400 text-xl">Redirecting...</div>
    </div>
  );
}
