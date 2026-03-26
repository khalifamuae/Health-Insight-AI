import { api } from './api';

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
    startWeight?: number; // Weight used in the first set
    endWeight?: number;   // Weight lifted in the final set
    weightUnit?: 'kg' | 'lbs'; // Unit for weight tracking
}

export interface WorkoutGroup {
    id: string;
    name: string; // User-defined name, e.g., "Day 1: Chest & Triceps"
    exercises: SavedExercise[];
    authorId?: string;
    userId?: string;
}

export const WorkoutStore = {
    // Get all user-created workout groups
    async getGroups(clientId?: string): Promise<WorkoutGroup[]> {
        try {
            const data: any[] = await api.get(clientId ? `/api/saved-workouts?targetClientId=${clientId}` : '/api/saved-workouts');
            if (data && data.length > 0) {
                const planStr = data[0].planData;
                const parsed = typeof planStr === 'string' ? JSON.parse(planStr) : planStr;
                return parsed.map((g: any) => ({ ...g, authorId: data[0].authorId, userId: data[0].userId }));
            }
            return [];
        } catch (e) {
            console.error('Failed to load workout groups from cloud', e);
            return [];
        }
    },

    // Save the entire list of groups (used for reordering, adding, updating)
    async saveGroups(groups: WorkoutGroup[], clientId?: string): Promise<void> {
        try {
            await api.post(clientId ? `/api/saved-workouts/sync?targetClientId=${clientId}` : '/api/saved-workouts/sync', { planData: groups });
        } catch (e) {
            console.error('Failed to sync workout groups to cloud', e);
        }
    },

    // Create a new empty group (e.g. "Upper Body Day")
    async createGroup(name: string, clientId?: string): Promise<WorkoutGroup> {
        const groups = await this.getGroups(clientId);
        const newGroup: WorkoutGroup = {
            id: Date.now().toString(),
            name,
            exercises: [],
        };
        await this.saveGroups([...groups, newGroup], clientId);
        return newGroup;
    },

    // Add an exercise with specific sets/reps to a specific group
    async addExerciseToGroup(groupId: string, exerciseId: string, sets: number, reps: number, clientId?: string): Promise<void> {
        const groups = await this.getGroups(clientId);
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
        await this.saveGroups(updatedGroups, clientId);
    },

    // Remove a specific exercise instance from a group
    async removeExerciseFromGroup(groupId: string, savedExerciseId: string, clientId?: string): Promise<void> {
        const groups = await this.getGroups(clientId);
        const updatedGroups = groups.map((g) => {
            if (g.id === groupId) {
                return {
                    ...g,
                    exercises: g.exercises.filter((ex) => ex.id !== savedExerciseId),
                };
            }
            return g;
        });
        await this.saveGroups(updatedGroups, clientId);
    },

    // Update sets/reps for a specific exercise instance
    async updateExerciseDetails(groupId: string, savedExerciseId: string, updates: Partial<SavedExercise>, clientId?: string): Promise<void> {
        const groups = await this.getGroups(clientId);
        const updatedGroups = groups.map((g) => {
            if (g.id === groupId) {
                return {
                    ...g,
                    exercises: g.exercises.map((ex) => {
                        if (ex.id === savedExerciseId) {
                            return { ...ex, ...updates };
                        }
                        return ex;
                    }),
                };
            }
            return g;
        });
        await this.saveGroups(updatedGroups, clientId);
    },


    // Share a group to the cloud and get a 6-character code
    async shareGroup(groupId: string, clientId?: string): Promise<string> {
        const groups = await this.getGroups(clientId);
        const group = groups.find(g => g.id === groupId);
        if (!group) throw new Error("Workout group not found");

        // Dynamically import api to avoid circular dependencies
        const { api } = require('./api');
        const res = await api.shareWorkout(group.name, group.exercises);
        return res.shareCode;
    },

    // Share all groups bundled together
    async shareAllGroups(clientId?: string): Promise<string> {
        const groups = await this.getGroups(clientId);
        if (groups.length === 0) throw new Error("No workout groups to share");

        // Dynamically import api to avoid circular dependencies
        const { api } = require('./api');

        // We package the array of groups inside the exercises payload
        // The groupName acts as a flag for the multi-group bundle
        const res = await api.shareWorkout("All Workout Plans", groups);
        return res.shareCode;
    },

    // Import a group (or multiple groups) from a 6-character code
    async importGroup(code: string, clientId?: string): Promise<void> {
        const { api } = require('./api');
        const res = await api.importSharedWorkout(code);

        const currentGroups = await this.getGroups(clientId);
        let newGroupsToAdd: WorkoutGroup[] = [];

        // Check if this is a bundled multi-group export
        // Bundled exports have the groups inside the 'exercises' array
        if (res.groupName === "All Workout Plans" && Array.isArray(res.exercises) && res.exercises.length > 0 && res.exercises[0].exercises) {

            // Loop through each group in the bundle
            res.exercises.forEach((importedGroup: WorkoutGroup, groupIndex: number) => {
                newGroupsToAdd.push({
                    id: Date.now().toString() + groupIndex.toString(),
                    name: `${importedGroup.name} (Imported)`,
                    exercises: importedGroup.exercises.map((ex: any, exIndex: number) => ({
                        ...ex,
                        id: Date.now().toString() + groupIndex.toString() + exIndex.toString() + Math.random().toString(36).substr(2, 5),
                        dateAdded: new Date().toISOString()
                    })),
                });
            });

        } else {
            // Standard single-group import
            newGroupsToAdd.push({
                id: Date.now().toString(),
                name: `${res.groupName} (Imported)`,
                exercises: res.exercises.map((ex: any, index: number) => ({
                    ...ex,
                    id: Date.now().toString() + index.toString() + Math.random().toString(36).substr(2, 5),
                    dateAdded: new Date().toISOString()
                })),
            });
        }

        await this.saveGroups([...currentGroups, ...newGroupsToAdd], clientId);
    }
};
