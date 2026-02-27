import * as SecureStore from 'expo-secure-store';

const WORKOUT_PLANS_KEY = 'savedWorkoutPlansV1';

export interface WorkoutDayPlan {
  day: string;
  focus: string;
  exercises: string[];
}

export interface WorkoutPlan {
  id: string;
  title: string;
  goal: string;
  level: string;
  daysPerWeek: number;
  createdAt: string;
  days: WorkoutDayPlan[];
}

async function loadPlansRaw(): Promise<WorkoutPlan[]> {
  const raw = await SecureStore.getItemAsync(WORKOUT_PLANS_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as WorkoutPlan[]) : [];
  } catch {
    return [];
  }
}

async function persistPlans(plans: WorkoutPlan[]) {
  await SecureStore.setItemAsync(WORKOUT_PLANS_KEY, JSON.stringify(plans));
}

export async function getSavedWorkoutPlans(): Promise<WorkoutPlan[]> {
  return loadPlansRaw();
}

export async function saveWorkoutPlan(plan: WorkoutPlan): Promise<void> {
  const plans = await loadPlansRaw();
  const updated = [plan, ...plans];
  await persistPlans(updated);
}

export async function deleteWorkoutPlan(planId: string): Promise<void> {
  const plans = await loadPlansRaw();
  const updated = plans.filter((p) => p.id !== planId);
  await persistPlans(updated);
}
