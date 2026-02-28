import AsyncStorage from '@react-native-async-storage/async-storage';

export interface ExerciseDefinition {
    id: string;
    title: string;
    titleAr: string;
    muscleGroup: string;
    muscleGroupAr: string;
    videoUrl: string; // The URL for the video (external web or server path)
}

export interface SavedExercise {
    id: string; // Unique ID for this specific saved instance
    exerciseId: string; // References the global ExerciseDefinition.id
    sets: number;
    reps: number;
    dateAdded?: string; // ISO date string of when this was added
}

export interface WorkoutGroup {
    id: string;
    name: string; // User-defined name, e.g., "Day 1: Chest & Triceps"
    exercises: SavedExercise[];
}

const WORKOUT_PLANS_KEY = '@health_insight_workout_plans';

export const WorkoutStore = {
    // Get all user-created workout groups
    async getGroups(): Promise<WorkoutGroup[]> {
        try {
            const data = await AsyncStorage.getItem(WORKOUT_PLANS_KEY);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            console.error('Failed to load workout groups', e);
            return [];
        }
    },

    // Save the entire list of groups (used for reordering, adding, updating)
    async saveGroups(groups: WorkoutGroup[]): Promise<void> {
        try {
            await AsyncStorage.setItem(WORKOUT_PLANS_KEY, JSON.stringify(groups));
        } catch (e) {
            console.error('Failed to save workout groups', e);
        }
    },

    // Create a new empty group (e.g. "Upper Body Day")
    async createGroup(name: string): Promise<WorkoutGroup> {
        const groups = await this.getGroups();
        const newGroup: WorkoutGroup = {
            id: Date.now().toString(),
            name,
            exercises: [],
        };
        await this.saveGroups([...groups, newGroup]);
        return newGroup;
    },

    // Add an exercise with specific sets/reps to a specific group
    async addExerciseToGroup(groupId: string, exerciseId: string, sets: number, reps: number): Promise<void> {
        const groups = await this.getGroups();
        const updatedGroups = groups.map((g) => {
            if (g.id === groupId) {
                return {
                    ...g,
                    exercises: [...g.exercises, {
                        id: Date.now().toString(),
                        exerciseId,
                        sets,
                        reps,
                        dateAdded: new Date().toISOString()
                    }],
                };
            }
            return g;
        });
        await this.saveGroups(updatedGroups);
    },

    // Remove a specific exercise instance from a group
    async removeExerciseFromGroup(groupId: string, savedExerciseId: string): Promise<void> {
        const groups = await this.getGroups();
        const updatedGroups = groups.map((g) => {
            if (g.id === groupId) {
                return {
                    ...g,
                    exercises: g.exercises.filter((ex) => ex.id !== savedExerciseId),
                };
            }
            return g;
        });
        await this.saveGroups(updatedGroups);
    },

    // Update sets/reps for a specific exercise instance
    async updateExerciseSetsReps(groupId: string, savedExerciseId: string, sets: number, reps: number): Promise<void> {
        const groups = await this.getGroups();
        const updatedGroups = groups.map((g) => {
            if (g.id === groupId) {
                return {
                    ...g,
                    exercises: g.exercises.map((ex) => {
                        if (ex.id === savedExerciseId) {
                            return { ...ex, sets, reps }
                        }
                        return ex;
                    }),
                };
            }
            return g;
        });
        await this.saveGroups(updatedGroups);
    }
};
