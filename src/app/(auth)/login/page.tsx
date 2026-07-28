"use client"

import { useActionState } from 'react'
import Link from 'next/link'
import { loginAction } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2 } from 'lucide-react'

type FormState = {
  error?: string | string[] | { _form?: string[]; username?: string[]; password?: string[] }
  message?: string
  success?: boolean
} | null

const initialState: FormState = null

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(loginAction, initialState)

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Masuk ke Daytrack</CardTitle>
          <CardDescription>Masuk untuk melacak aktivitas harian Anda</CardDescription>
        </CardHeader>
        <CardContent>
          {state?.error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>
                {typeof state.error === 'string' 
                  ? state.error 
                  : Array.isArray(state.error) 
                    ? state.error[0] 
                    : state.error._form?.[0] 
                    ?? state.error.username?.[0] 
                    ?? state.error.password?.[0] 
                    ?? 'Terjadi kesalahan'}
              </AlertDescription>
            </Alert>
          )}

          <form action={formAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                name="username"
                type="text"
                placeholder="admin"
                disabled={isPending}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                disabled={isPending}
              />
            </div>

            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Masuk...
                </>
              ) : (
                'Masuk'
              )}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center">
          <p className="text-sm text-muted-foreground">
            Belum punya akun?{' '}
            <Link href="/register" className="underline hover:text-primary">
              Daftar di sini
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}