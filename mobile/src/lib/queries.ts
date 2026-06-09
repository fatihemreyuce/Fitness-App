import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from './supabase'

export type Exercise = {
  id: string
  name: string
  muscle_group: string
  equipment: string | null
  owner_id: string | null
}

export type Workout = {
  id: string
  user_id: string
  started_at: string
  ended_at: string | null
  notes: string | null
}

export type WorkoutSet = {
  id: string
  workout_id: string
  exercise_id: string
  set_number: number
  reps: number
  weight_kg: number
}

// --- Egzersizler ---
export function useExercises() {
  return useQuery({
    queryKey: ['exercises'],
    queryFn: async (): Promise<Exercise[]> => {
      const { data, error } = await supabase.from('exercises').select('*').order('name')
      if (error) throw error
      return data
    },
  })
}

export function useAddExercise() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { name: string; muscle_group: string; equipment: string | null }) => {
      const { data: userData } = await supabase.auth.getUser()
      const { error } = await supabase.from('exercises').insert({
        ...input,
        owner_id: userData.user!.id,
      })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['exercises'] }),
  })
}

// --- Antrenmanlar ---
export function useWorkouts() {
  return useQuery({
    queryKey: ['workouts'],
    queryFn: async (): Promise<Workout[]> => {
      const { data, error } = await supabase
        .from('workouts').select('*').order('started_at', { ascending: false })
      if (error) throw error
      return data
    },
  })
}

export function useWorkoutSets(workoutId: string) {
  return useQuery({
    queryKey: ['workout_sets', workoutId],
    queryFn: async (): Promise<(WorkoutSet & { exercise: Exercise })[]> => {
      const { data, error } = await supabase
        .from('workout_sets')
        .select('*, exercise:exercises(*)')
        .eq('workout_id', workoutId)
        .order('set_number')
      if (error) throw error
      return data as unknown as (WorkoutSet & { exercise: Exercise })[]
    },
  })
}

// Bir antrenmanı tüm setleriyle birlikte oluşturur
export function useCreateWorkout() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      notes: string | null
      sets: { exercise_id: string; set_number: number; reps: number; weight_kg: number }[]
    }) => {
      const { data: userData } = await supabase.auth.getUser()
      const { data: workout, error: wErr } = await supabase
        .from('workouts')
        .insert({ user_id: userData.user!.id, notes: input.notes, ended_at: new Date().toISOString() })
        .select()
        .single()
      if (wErr) throw wErr

      if (input.sets.length > 0) {
        const rows = input.sets.map((s) => ({ ...s, workout_id: workout.id }))
        const { error: sErr } = await supabase.from('workout_sets').insert(rows)
        if (sErr) throw sErr
      }
      return workout as Workout
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workouts'] }),
  })
}
