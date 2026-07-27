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
    
    // Create channel with unique name
    const channelName = `realtime:${table}:${filter || 'all'}:${Date.now()}`
    
    channelRef.current = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table,
          filter,
        },
        handleRealtimeEvent
      )
      .subscribe((status) => {
        console.log(`[Realtime] Channel ${table} status:`, status)
      })

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [table, filter, handleRealtimeEvent])

  // Return cleanup function for manual cleanup if needed
  const cleanup = useCallback(() => {
    if (channelRef.current) {
      supabaseRef.current.removeChannel(channelRef.current)
      channelRef.current = null
    }
  }, [])

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

  useEffect(() => {
    const supabase = supabaseRef.current
    const tables = ['tasks', 'sholat', 'quran', 'doa', 'tidur', 'minum_air', 'masalah', 'pmo', 'syukur', 'kesenangan', 'saran_perbaikan']
    
    const channelName = `realtime:overview:${Date.now()}`
    
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
    
    channelRef.current.subscribe()

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [queryClient])

  return {}
}