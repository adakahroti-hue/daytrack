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

// Global channel registry with callback queue
interface ChannelEntry {
  channel: RealtimeChannel
  count: number
  handlers: Map<string, (payload: any) => void>
  subscribed: boolean
  combinedHandler?: (payload: any) => void
}

const channelRegistry = new Map<string, ChannelEntry>()

function getOrCreateChannelEntry(table: string, filter: string | undefined, supabase: ReturnType<typeof createClient>): ChannelEntry {
  const key = `${table}:${filter || 'all'}`
  
  if (channelRegistry.has(key)) {
    const entry = channelRegistry.get(key)!
    entry.count++
    return entry
  }
  
  const channelName = `daytrack:${key}`
  const channel = supabase.channel(channelName)
  
  const entry: ChannelEntry = {
    channel,
    count: 1,
    handlers: new Map(),
    subscribed: false,
  }
  
  channelRegistry.set(key, entry)
  return entry
}

function releaseChannelEntry(table: string, filter: string | undefined, handlerId: string, supabase: ReturnType<typeof createClient>) {
  const key = `${table}:${filter || 'all'}`
  const entry = channelRegistry.get(key)
  
  if (entry) {
    entry.handlers.delete(handlerId)
    entry.count--
    
    if (entry.count === 0) {
      if (entry.subscribed) {
        supabase.removeChannel(entry.channel)
      }
      channelRegistry.delete(key)
    }
  }
}

function subscribeChannel(entry: ChannelEntry, supabase: ReturnType<typeof createClient>) {
  if (!entry.subscribed) {
    // Create combined handler that calls all registered handlers
    entry.combinedHandler = (payload: any) => {
      entry.handlers.forEach(handler => {
        try {
          handler(payload)
        } catch (e) {
          console.error('[Realtime] Handler error:', e)
        }
      })
    }
    
    // Add the combined handler ONCE
    entry.channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: entry.channel.topic.split(':')[1] || '', // This won't work, need table name
        filter: entry.channel.topic.split(':')[2] || undefined,
      },
      entry.combinedHandler
    )
    
    entry.channel.subscribe((status) => {
      console.log(`[Realtime] Channel status:`, status)
    })
    entry.subscribed = true
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
  const supabaseRef = useRef(createClient())
  const handlerIdRef = useRef<string>('')
  const entryRef = useRef<ChannelEntry | null>(null)

  const handleRealtimeEvent = useCallback((payload: any) => {
    console.log(`[Realtime] ${payload.eventType} on ${table}:`, payload)
    
    queryKeys.forEach(key => {
      queryClient.invalidateQueries({ queryKey: key })
    })

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
    
    const entry = getOrCreateChannelEntry(table, filter, supabase)
    entryRef.current = entry

    const handlerId = `${table}:${filter || 'all'}:${Math.random().toString(36).slice(2)}`
    handlerIdRef.current = handlerId

    entry.handlers.set(handlerId, handleRealtimeEvent)

    // Set up combined handler and subscribe only once
    if (!entry.subscribed) {
      entry.combinedHandler = (payload: any) => {
        entry.handlers.forEach(handler => {
          try {
            handler(payload)
          } catch (e) {
            console.error('[Realtime] Handler error:', e)
          }
        })
      }
      
      entry.channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table,
          filter,
        },
        entry.combinedHandler
      )
      
      entry.channel.subscribe((status) => {
        console.log(`[Realtime] Channel ${table} status:`, status)
      })
      entry.subscribed = true
    }

    return () => {
      releaseChannelEntry(table, filter, handlerId, supabase)
      entryRef.current = null
      handlerIdRef.current = ''
    }
  }, [table, filter, handleRealtimeEvent])

  const cleanup = useCallback(() => {
    if (entryRef.current && handlerIdRef.current) {
      const supabase = supabaseRef.current
      releaseChannelEntry(table, filter, handlerIdRef.current, supabase)
      entryRef.current = null
      handlerIdRef.current = ''
    }
  }, [table, filter])

  return { cleanup }
}
export function useTasksRealtime(queryKeys: string[][] = [['tasks']], filter?: string) {
  return useRealtime({
    table: 'tasks',
    queryKeys,
    filter,
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

export function usePrayerLogRealtime(dateKey: string) {
  return useRealtime({
    table: 'prayer_logs',
    filter: `tanggal=eq.${dateKey}`,
    queryKeys: [['prayer_logs', dateKey], ['prayer_logs', 'range']],
  })
}

export function useQuranLogRealtime(dateKey: string) {
  return useRealtime({
    table: 'quran_logs',
    filter: `tanggal=eq.${dateKey}`,
    queryKeys: [['quran_logs', dateKey], ['quran_logs', 'range']],
  })
}

export function useDoaLogRealtime(dateKey: string) {
  return useRealtime({
    table: 'doa_logs',
    filter: `tanggal=eq.${dateKey}`,
    queryKeys: [['doa_logs', dateKey], ['doa_logs', 'range']],
  })
}

export function useSyukurLogRealtime(dateKey: string) {
  return useRealtime({
    table: 'syukur_logs',
    filter: `tanggal=eq.${dateKey}`,
    queryKeys: [['syukur_logs', dateKey], ['syukur_logs', 'range']],
  })
}

export function useTidurLogRealtime(dateKey: string) {
  return useRealtime({
    table: 'tidur_logs',
    filter: `tanggal=eq.${dateKey}`,
    queryKeys: [['tidur_logs', dateKey], ['tidur_logs', 'range']],
  })
}

export function useMinumAirLogRealtime(dateKey: string) {
  return useRealtime({
    table: 'minum_air_logs',
    filter: `tanggal=eq.${dateKey}`,
    queryKeys: [['minum_air_logs', dateKey], ['minum_air_logs', 'range']],
  })
}

export function useMasalahLogRealtime(dateKey: string) {
  return useRealtime({
    table: 'masalah_logs',
    filter: `tanggal=eq.${dateKey}`,
    queryKeys: [['masalah_logs', dateKey], ['masalah_logs', 'range']],
  })
}

export function usePmoLogRealtime(dateKey: string) {
  return useRealtime({
    table: 'pmo_logs',
    filter: `tanggal=eq.${dateKey}`,
    queryKeys: [['pmo_logs', dateKey], ['pmo_logs', 'range']],
  })
}

export function useFunQueueRealtime() {
  return useRealtime({
    table: 'fun_queue',
    queryKeys: [['fun_queue']],
  })
}

export function useImprovementBacklogRealtime() {
  return useRealtime({
    table: 'improvement_backlog',
    queryKeys: [['improvement_backlog']],
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
    const tables = ['tasks', 'sholat', 'quran', 'doa', 'tidur_logs', 'minum_air_logs', 'masalah_logs', 'pmo_logs', 'syukur_logs', 'fun_queue', 'improvement_backlog']
    
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