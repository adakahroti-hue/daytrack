"use client"

import { useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useQueryClient } from '@tanstack/react-query'
import { RealtimeChannel } from '@supabase/supabase-js'

interface RealtimeOptions {
  table: string
  filter?: string
  onInsert?: (payload: any) => void
  onUpdate?: (payload: any) => void
  onDelete?: (payload: any) => void
  queryKeys?: string[][]
}

// Global channel registry to prevent duplicate channels per table
const channelRegistry = new Map<string, { channel: RealtimeChannel; count: number }>()

function getOrCreateChannel(table: string, filter: string | undefined, supabase: ReturnType<typeof createClient>): RealtimeChannel {
  const key = `${table}:${filter || 'all'}`
  
  if (channelRegistry.has(key)) {
    const entry = channelRegistry.get(key)!
    entry.count++
    return entry.channel
  }
  
  // Create new channel with stable name (no timestamp)
  const channelName = `daytrack:${key}`
  const channel = supabase.channel(channelName)
  
  channelRegistry.set(key, { channel, count: 1 })
  return channel
}

function releaseChannel(table: string, filter: string | undefined, supabase: ReturnType<typeof createClient>) {
  const key = `${table}:${filter || 'all'}`
  const entry = channelRegistry.get(key)
  
  if (entry) {
    entry.count--
    if (entry.count === 0) {
      supabase.removeChannel(entry.channel)
      channelRegistry.delete(key)
    }
  }
}

export function useRealtime({
  table,
  filter,
  onInsert,
  onUpdate,
  onDelete,
  queryKeys = [],
}: RealtimeOptions) {
  const queryClient = useQueryClient()
  const channelRef = useRef<RealtimeChannel | null>(null)
  const supabaseRef = useRef(createClient())
  const subscribedRef = useRef(false)

  const handleRealtimeEvent = useCallback((payload: any) => {
    console.log(`[Realtime] ${payload.eventType} on ${table}:`, payload)
    
    // Invalidate all related query keys
    queryKeys.forEach(key => {
      queryClient.invalidateQueries({ queryKey: key })
    })

    // Call custom handlers
    switch (payload.eventType) {
      case 'INSERT':
        onInsert?.(payload)
        break
      case 'UPDATE':
        onUpdate?.(payload)
        break
      case 'DELETE':
        onDelete?.(payload)
        break
    }
  }, [table, queryClient, queryKeys, onInsert, onUpdate, onDelete])

  useEffect(() => {
    const supabase = supabaseRef.current
    
    // Get or create shared channel for this table
    const channel = getOrCreateChannel(table, filter, supabase)
    channelRef.current = channel

    // Add callback BEFORE subscribe (or if already subscribed, it's fine - same channel)
    channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table,
        filter,
      },
      handleRealtimeEvent
    )

    // Subscribe only once per channel
    if (!subscribedRef.current) {
      channel.subscribe((status) => {
        console.log(`[Realtime] Channel ${table} status:`, status)
      })
      subscribedRef.current = true
    }

    return () => {
      // Remove this specific callback from channel
      // Note: supabase-js doesn't support removing single callback easily
      // So we rely on reference counting
      releaseChannel(table, filter, supabase)
      channelRef.current = null
      subscribedRef.current = false
    }
  }, [table, filter, handleRealtimeEvent])

  const cleanup = useCallback(() => {
    if (channelRef.current) {
      const supabase = supabaseRef.current
      releaseChannel(table, filter, supabase)
      channelRef.current = null
      subscribedRef.current = false
    }
  }, [table, filter])

  return { cleanup }
}

// Specific hooks for each table
export function useTasksRealtime(queryKeys: string[][] = [['tasks']]) {
  return useRealtime({
    table: 'tasks',
    queryKeys,
  })
}

export function useSholatRealtime(queryKeys: string[][] = [['sholat']]) {
  return useRealtime({
    table: 'sholat',
    queryKeys,
  })
}

export function useQuranRealtime(queryKeys: string[][] = [['quran']]) {
  return useRealtime({
    table: 'quran',
    queryKeys,
  })
}

export function useDoaRealtime(queryKeys: string[][] = [['doa']]) {
  return useRealtime({
    table: 'doa',
    queryKeys,
  })
}

export function useTidurRealtime(queryKeys: string[][] = [['tidur']]) {
  return useRealtime({
    table: 'tidur',
    queryKeys,
  })
}

export function useMinumAirRealtime(queryKeys: string[][] = [['minum_air']]) {
  return useRealtime({
    table: 'minum_air',
    queryKeys,
  })
}

export function useMasalahRealtime(queryKeys: string[][] = [['masalah']]) {
  return useRealtime({
    table: 'masalah',
    queryKeys,
  })
}

export function usePMORealtime(queryKeys: string[][] = [['pmo']]) {
  return useRealtime({
    table: 'pmo',
    queryKeys,
  })
}

export function useSyukurRealtime(queryKeys: string[][] = [['syukur']]) {
  return useRealtime({
    table: 'syukur',
    queryKeys,
  })
}

export function useKesenanganRealtime(queryKeys: string[][] = [['kesenangan']]) {
  return useRealtime({
    table: 'kesenangan',
    queryKeys,
  })
}

export function useSaranPerbaikanRealtime(queryKeys: string[][] = [['saran_perbaikan']]) {
  return useRealtime({
    table: 'saran_perbaikan',
    queryKeys,
  })
}

// Multi-table realtime hook for overview pages
export function useOverviewRealtime() {
  const queryClient = useQueryClient()
  const channelRef = useRef<RealtimeChannel | null>(null)
  const supabaseRef = useRef(createClient())
  const subscribedRef = useRef(false)

  useEffect(() => {
    const supabase = supabaseRef.current
    const tables = ['tasks', 'sholat', 'quran', 'doa', 'tidur', 'minum_air', 'masalah', 'pmo', 'syukur', 'kesenangan', 'saran_perbaikan']
    
    // Use stable channel name
    const channelName = `daytrack:overview:all`
    
    channelRef.current = supabase.channel(channelName)
    
    tables.forEach(table => {
      channelRef.current!.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table,
        },
        (payload) => {
          console.log(`[Realtime Overview] ${payload.eventType} on ${table}:`, payload)
          // Invalidate overview queries
          queryClient.invalidateQueries({ queryKey: ['overview'] })
          // Invalidate individual table queries
          queryClient.invalidateQueries({ queryKey: [table] })
        }
      )
    })
    
    // Subscribe only once
    if (!subscribedRef.current) {
      channelRef.current.subscribe()
      subscribedRef.current = true
    }

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
        subscribedRef.current = false
      }
    }
  }, [queryClient])

  return {}
}