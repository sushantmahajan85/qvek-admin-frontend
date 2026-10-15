'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { QvekMark } from '@/components/shared/brand';
import { loginSchema, type LoginInput } from './api';
import { useAdminLogin } from './hooks';

export function LoginForm() {
  const { mutate, isPending } = useAdminLogin();
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
        <form className="flex flex-col gap-3" onSubmit={handleSubmit((v) => mutate(v))}>
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
          <Button type="submit" disabled={isPending}>
            {isPending ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
