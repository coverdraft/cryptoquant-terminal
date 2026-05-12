'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await signIn('credentials', {
        password,
        redirect: false,
      });

      if (result?.error) {
        setError('Invalid password. Access denied.');
        setLoading(false);
      } else {
        router.push('/');
        router.refresh();
      }
    } catch {
      setError('Authentication failed. Try again.');
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0e17]">
      {/* Subtle background grid effect */}
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(59,130,246,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.3) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      <div className="relative z-10 w-full max-w-sm px-4">
        {/* Terminal header */}
        <div className="mb-8 text-center">
          <div className="mb-2 font-mono text-xs tracking-widest text-[#475569]">
            CRYPTOQUANT SYSTEMS
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#e2e8f0]">
            CryptoQuant Terminal
          </h1>
          <div className="mt-1 flex items-center justify-center gap-2">
            <span className="data-dot data-dot-live" />
            <span className="font-mono text-xs text-[#10b981]">SECURE ACCESS</span>
          </div>
        </div>

        <Card className="border-[#1e293b] bg-[#111827] shadow-lg shadow-black/40">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-medium text-[#e2e8f0]">
              Authentication Required
            </CardTitle>
            <CardDescription className="text-xs text-[#64748b]">
              Enter terminal access password to continue
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label
                  htmlFor="password"
                  className="font-mono text-xs uppercase tracking-wider text-[#64748b]"
                >
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter access key..."
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError('');
                  }}
                  className="border-[#1e293b] bg-[#0a0e17] font-mono text-sm text-[#e2e8f0] placeholder:text-[#334155] focus-visible:border-[#3b82f6] focus-visible:ring-[#3b82f6]/30"
                  autoFocus
                  disabled={loading}
                />
              </div>

              {error && (
                <div className="rounded-md border border-[#ef4444]/20 bg-[#ef4444]/5 px-3 py-2">
                  <p className="font-mono text-xs text-[#ef4444]">{error}</p>
                </div>
              )}

              <Button
                type="submit"
                className="w-full bg-[#3b82f6] font-mono text-xs uppercase tracking-wider text-[#0a0e17] hover:bg-[#2563eb] disabled:opacity-50"
                disabled={loading || !password}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="h-3 w-3 animate-spin rounded-full border-2 border-[#0a0e17] border-t-transparent" />
                    Authenticating...
                  </span>
                ) : (
                  'Access Terminal'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="mt-6 text-center font-mono text-[10px] tracking-wider text-[#334155]">
          CRYPTOQUANT TERMINAL v1.0 — AUTHORIZED PERSONNEL ONLY
        </div>
      </div>
    </div>
  );
}
