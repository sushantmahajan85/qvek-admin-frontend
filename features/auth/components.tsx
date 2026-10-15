'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { QvekMark } from '@/components/shared/brand';
import { loginSchema, type LoginInput } from './api';
import { useAdminLogin } from './hooks';

export function LoginForm() {
  const { login, mfa, mfaRequired } = useAdminLogin();
  const [code, setCode] = React.useState('');
  const { register, handleSubmit, formState } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });
  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <span className="flex items-center gap-2">
          <QvekMark size={26} />
          <CardTitle>Qvek admin</CardTitle>
        </span>
      </CardHeader>
      <CardContent>
        {!mfaRequired ? (
          <form className="flex flex-col gap-3" onSubmit={handleSubmit((v) => login.mutate(v))}>
            <Input placeholder="Username" autoComplete="username" {...register('username')} />
            {formState.errors.username && (
              <p className="text-xs text-red-500">{formState.errors.username.message}</p>
            )}
            <Input
              placeholder="Password"
              type="password"
              autoComplete="current-password"
              {...register('password')}
            />
            {formState.errors.password && (
              <p className="text-xs text-red-500">{formState.errors.password.message}</p>
            )}
            <Button type="submit" disabled={login.isPending}>
              {login.isPending ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>
        ) : (
          <form
            className="flex flex-col gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (/^\d{6}$/.test(code)) mfa.mutate(code);
            }}
          >
            <p className="text-sm text-muted2">Enter the 6-digit code from your authenticator app.</p>
            <Input
              placeholder="123456"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            />
            <Button type="submit" disabled={mfa.isPending || code.length !== 6}>
              {mfa.isPending ? 'Verifying…' : 'Verify'}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
