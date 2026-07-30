"use server"

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { z } from 'zod'

const loginSchema = z.object({
  username: z.string().min(1, 'Username wajib diisi'),
  password: z.string().min(6, 'Password minimal 6 karakter'),
})

const registerSchema = z.object({
  username: z.string().min(3, 'Username minimal 3 karakter'),
  password: z.string().min(6, 'Password minimal 6 karakter'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Password tidak cocok',
  path: ['confirmPassword'],
})

type LoginForm = z.infer<typeof loginSchema>
type RegisterForm = z.infer<typeof registerSchema>

type FormState = {
  error?: string | string[] | { _form?: string[]; username?: string[]; password?: string[]; confirmPassword?: string[] }
  message?: string
  success?: boolean
}

export async function loginAction(prevState: FormState | null, formData: FormData): Promise<FormState> {
  const rawData = {
    username: formData.get('username') as string,
    password: formData.get('password') as string,
  }

  const validated = loginSchema.safeParse(rawData)
  if (!validated.success) {
    return { error: validated.error.flatten().fieldErrors }
  }

  const { username, password } = validated.data
  const supabase = await createClient()

  // Map username to email format: username@daytrack.local
  const email = `${username}@daytrack.local`
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return { error: error.message }
  }

  redirect('/overview')
}

export async function registerAction(prevState: FormState | null, formData: FormData): Promise<FormState> {
  const rawData = {
    username: formData.get('username') as string,
    password: formData.get('password') as string,
    confirmPassword: formData.get('confirmPassword') as string,
  }

  const validated = registerSchema.safeParse(rawData)
  if (!validated.success) {
    return { error: validated.error.flatten().fieldErrors }
  }

  const { username, password } = validated.data
  const supabase = await createClient()

  // Map username to email format for Supabase
  const email = `${username}@daytrack.local`
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        username,
        role: 'admin',
      },
    },
  })

  if (error) {
    return { error: error.message }
  }

  redirect('/overview')
}

export async function logoutAction() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
