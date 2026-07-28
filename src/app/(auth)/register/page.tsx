"use client"

import { useActionState, useState } from 'react'
import Link from 'next/link'
import { registerAction } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2 } from 'lucide-react'

type FormState = {
  error?: string | string[] | { _form?: string[]; username?: string[]; password?: string[]; confirmPassword?: string[] }
  message?: string
  success?: boolean
} | null

const initialState: FormState = null

export default function RegisterPage() {
  const [state, formAction, isPending] = useActionState(registerAction, initialState)
  const [localError, setLocalError] = useState<string | null>(null)

  const handleSubmit = (formData: FormData) => {
    const password = formData.get('password')
    const confirmPassword = formData.get('confirmPassword')

    if (password !== confirmPassword) {
      setLocalError('Password tidak cocok')
      return false
    }
    setLocalError(null)
    return true
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Daftar Daytrack</CardTitle>
          <CardDescription>Mulai melacak aktivitas harian Anda</CardDescription>
        </CardHeader>
        <CardContent>
          {localError && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{localError}</AlertDescription>
            </Alert>
          )}
          {state?.error && !localError && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>
                {typeof state.error === 'string' 
                  ? state.error 
                  : Array.isArray(state.error) 
                    ? state.error[0] 
                    : state.error._form?.[0] 
                    ?? state.error.username?.[0] 
                    ?? state.error.password?.[0] 
                    ?? state.error.confirmPassword?.[0] 
                    ?? 'Terjadi kesalahan'}
              </AlertDescription>
            </Alert>
          )}

          <form action={formAction} className="space-y-4" onSubmit={(e) => {
            if (!handleSubmit(new FormData(e.currentTarget))) {
              e.preventDefault()
            }
          }}>
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

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Konfirmasi Password</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                placeholder="••••••••"
                disabled={isPending}
              />
            </div>

            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Mendaftar...
                </>
              ) : (
                'Daftar'
              )}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center">
          <p className="text-sm text-muted-foreground">
            Sudah punya akun?{' '}
            <Link href="/login" className="underline hover:text-primary">
              Masuk di sini
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}