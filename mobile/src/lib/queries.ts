import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from './supabase'
import { weekStartISO, type WorkoutRow } from './stats'

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
export type WorkoutWithSets = Workout & {
  workout_sets: { reps: number; weight_kg: number; exercise: { name: string } | null }[]
}

export function useWorkouts() {
  return useQuery({
    queryKey: ['workouts'],
    queryFn: async (): Promise<WorkoutWithSets[]> => {
      const { data, error } = await supabase
        .from('workouts')
        .select('*, workout_sets(reps, weight_kg, exercise:exercises(name))')
        .order('started_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as unknown as WorkoutWithSets[]
    },
  })
}

export function useWorkout(id: string) {
  return useQuery({
    queryKey: ['workout', id],
    queryFn: async (): Promise<{ started_at: string }> => {
      const { data, error } = await supabase.from('workouts').select('started_at').eq('id', id).single()
      if (error) throw error
      return data as { started_at: string }
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

// ============ Beslenme ============
export type Food = {
  id: string
  name: string
  brand: string | null
  calories_per_100g: number
  protein_g: number
  carb_g: number
  fat_g: number
  owner_id: string | null
}

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack'

export type FoodEntry = {
  id: string
  user_id: string
  entry_date: string
  meal_type: MealType
  food_id: string
  quantity_g: number
}

export function useFoods(search: string) {
  return useQuery({
    queryKey: ['foods', search],
    queryFn: async (): Promise<Food[]> => {
      let q = supabase.from('foods').select('*').order('name').limit(50)
      if (search.trim()) q = q.ilike('name', `%${search.trim()}%`)
      const { data, error } = await q
      if (error) throw error
      return data
    },
  })
}

export function useAddCustomFood() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { name: string; calories_per_100g: number; protein_g: number; carb_g: number; fat_g: number }) => {
      const { data: userData } = await supabase.auth.getUser()
      const { data, error } = await supabase.from('foods')
        .insert({ ...input, owner_id: userData.user!.id }).select().single()
      if (error) throw error
      return data as Food
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['foods'] }),
  })
}

export function useDayEntries(date: string) {
  return useQuery({
    queryKey: ['food_entries', date],
    queryFn: async (): Promise<(FoodEntry & { food: Food })[]> => {
      const { data, error } = await supabase
        .from('food_entries')
        .select('*, food:foods(*)')
        .eq('entry_date', date)
        .order('created_at')
      if (error) throw error
      return data as unknown as (FoodEntry & { food: Food })[]
    },
  })
}

export function useAddFoodEntry() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { entry_date: string; meal_type: MealType; food_id: string; quantity_g: number }) => {
      const { data: userData } = await supabase.auth.getUser()
      const { error } = await supabase.from('food_entries').insert({ ...input, user_id: userData.user!.id })
      if (error) throw error
    },
    onSuccess: (_d, vars) => qc.invalidateQueries({ queryKey: ['food_entries', vars.entry_date] }),
  })
}

export function useDeleteFoodEntry(date: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('food_entries').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['food_entries', date] }),
  })
}

export type Goals = { daily_calorie_goal: number | null; daily_protein_goal: number | null }

export function useGoals() {
  return useQuery({
    queryKey: ['goals'],
    queryFn: async (): Promise<Goals> => {
      const { data: userData } = await supabase.auth.getUser()
      const { data, error } = await supabase.from('profiles')
        .select('daily_calorie_goal, daily_protein_goal').eq('id', userData.user!.id).single()
      if (error) throw error
      return data as Goals
    },
  })
}

export function useUpdateGoals() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: Goals) => {
      const { data: userData } = await supabase.auth.getUser()
      const { error } = await supabase.from('profiles').update(input).eq('id', userData.user!.id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['goals'] }),
  })
}

export function entryMacros(e: FoodEntry & { food: Food | null }) {
  if (!e.food) return { calories: 0, protein: 0, carb: 0, fat: 0 }
  const r = e.quantity_g / 100
  return {
    calories: e.food.calories_per_100g * r,
    protein: e.food.protein_g * r,
    carb: e.food.carb_g * r,
    fat: e.food.fat_g * r,
  }
}

// ============ İstatistik sorguları ============
export function useWorkoutStats() {
  return useQuery({
    queryKey: ['workout_stats'],
    queryFn: async (): Promise<WorkoutRow[]> => {
      const { data, error } = await supabase
        .from('workouts')
        .select('started_at, workout_sets(reps, weight_kg)')
        .order('started_at')
      if (error) throw error
      return (data ?? []) as unknown as WorkoutRow[]
    },
  })
}

export function useNutritionWeek(today: string) {
  return useQuery({
    queryKey: ['nutrition_week', today],
    queryFn: async (): Promise<{ entry_date: string; calories: number }[]> => {
      const start = weekStartISO(today, 7)
      const { data, error } = await supabase
        .from('food_entries')
        .select('entry_date, quantity_g, food:foods(calories_per_100g)')
        .gte('entry_date', start)
        .lte('entry_date', today)
      if (error) throw error
      type Row = { entry_date: string; quantity_g: number; food: { calories_per_100g: number } | null }
      return ((data ?? []) as unknown as Row[]).map((r) => ({
        entry_date: r.entry_date,
        calories: r.food ? r.food.calories_per_100g * (r.quantity_g / 100) : 0,
      }))
    },
  })
}
