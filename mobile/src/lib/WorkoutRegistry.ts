export interface GlobalExercise {
    id: string; // e.g., 'chest-1'
    titleEn: string;
    titleAr: string;
    muscleGroupEn: string;
    muscleGroupAr: string;
    videoUrl: string; // Remote URL to be streamed or downloaded
}

// Cloudflare R2 Public Development URL
const VIDEO_BASE_URL = "https://pub-8183870d5f9f4c1196f1ca8347faa84b.r2.dev";

// Helper function to generate the correct video URL.
// We expect folders inside R2 exactly matching the muscleGroupEn (lowercase)
// and inside them, the MP4 files matching the exercise id exactly.
// Example: https://pub-8183870d5f9f4c1196f1ca8347faa84b.r2.dev/chest/chest-1.mp4
const getVideoUrl = (muscleGroupEn: string, id: string) => {
    const folderName = muscleGroupEn.toLowerCase();
    return `${VIDEO_BASE_URL}/${folderName}/${id}.mp4`;
};

// Grouping Categories: 
// 1. Chest (صدر)
// 2. Back (ظهر)
// 3. Legs (أرجل)
// 4. Shoulders (أكتاف)
// 5. Biceps (باي)
// 6. Triceps (تراي)
// 7. Forearms (سواعد)
// 8. Calves (بطات)

export const EXERCISE_REGISTRY: GlobalExercise[] = [
    // --- CHEST (صدر) ---
    { id: 'chest-1', titleEn: 'Barbell Bench Press', titleAr: 'ضغط الصدر بالبار مستوي', muscleGroupEn: 'Chest', muscleGroupAr: 'صدر', videoUrl: getVideoUrl('Chest', 'chest-1') },
    { id: 'chest-2', titleEn: 'Incline Dumbbell Press', titleAr: 'ضغط بالدمبلز صدر علوي', muscleGroupEn: 'Chest', muscleGroupAr: 'صدر', videoUrl: getVideoUrl('Chest', 'chest-2') },
    { id: 'chest-3', titleEn: 'Cable Crossover', titleAr: 'تفتيح بالكابل', muscleGroupEn: 'Chest', muscleGroupAr: 'صدر', videoUrl: getVideoUrl('Chest', 'chest-3') },
    { id: 'chest-4', titleEn: 'Dumbbell Pullover', titleAr: 'بول أوفر بالدمبل', muscleGroupEn: 'Chest', muscleGroupAr: 'صدر', videoUrl: getVideoUrl('Chest', 'chest-4') },

    // --- BACK (ظهر) ---
    { id: 'back-1', titleEn: 'Lat Pulldown', titleAr: 'سحب ظهر واسع', muscleGroupEn: 'Back', muscleGroupAr: 'ظهر', videoUrl: getVideoUrl('Back', 'back-1') },
    { id: 'back-2', titleEn: 'Barbell Row', titleAr: 'سحب بالبار', muscleGroupEn: 'Back', muscleGroupAr: 'ظهر', videoUrl: getVideoUrl('Back', 'back-2') },
    { id: 'back-3', titleEn: 'Seated Cable Row', titleAr: 'سحب أرضي ضيق', muscleGroupEn: 'Back', muscleGroupAr: 'ظهر', videoUrl: getVideoUrl('Back', 'back-3') },
    { id: 'back-4', titleEn: 'Deadlift', titleAr: 'رفعة مميتة', muscleGroupEn: 'Back', muscleGroupAr: 'ظهر', videoUrl: getVideoUrl('Back', 'back-4') },

    // --- LEGS (أرجل) ---
    { id: 'legs-1', titleEn: 'Barbell Squat', titleAr: 'سكوات بالبار', muscleGroupEn: 'Legs', muscleGroupAr: 'أرجل', videoUrl: getVideoUrl('Legs', 'legs-1') },
    { id: 'legs-2', titleEn: 'Leg Press', titleAr: 'دفع بالقدمين', muscleGroupEn: 'Legs', muscleGroupAr: 'أرجل', videoUrl: getVideoUrl('Legs', 'legs-2') },
    { id: 'legs-3', titleEn: 'Leg Extension', titleAr: 'رفرفة أمامي', muscleGroupEn: 'Legs', muscleGroupAr: 'أرجل', videoUrl: getVideoUrl('Legs', 'legs-3') },
    { id: 'legs-4', titleEn: 'Lying Leg Curl', titleAr: 'رفرفة خلفي', muscleGroupEn: 'Legs', muscleGroupAr: 'أرجل', videoUrl: getVideoUrl('Legs', 'legs-4') },

    // --- SHOULDERS (أكتاف) ---
    { id: 'shoulders-1', titleEn: 'Overhead Press', titleAr: 'ضغط أكتاف بالبار', muscleGroupEn: 'Shoulders', muscleGroupAr: 'أكتاف', videoUrl: getVideoUrl('Shoulders', 'shoulders-1') },
    { id: 'shoulders-2', titleEn: 'Dumbbell Lateral Raise', titleAr: 'رفرفة جانبي', muscleGroupEn: 'Shoulders', muscleGroupAr: 'أكتاف', videoUrl: getVideoUrl('Shoulders', 'shoulders-2') },
    { id: 'shoulders-3', titleEn: 'Dumbbell Front Raise', titleAr: 'رفرفة أمامي بالدمبلز', muscleGroupEn: 'Shoulders', muscleGroupAr: 'أكتاف', videoUrl: getVideoUrl('Shoulders', 'shoulders-3') },
    { id: 'shoulders-4', titleEn: 'Reverse Pec Deck', titleAr: 'كتف خلفي بالجهاز', muscleGroupEn: 'Shoulders', muscleGroupAr: 'أكتاف', videoUrl: getVideoUrl('Shoulders', 'shoulders-4') },

    // --- BICEPS (باي) ---
    { id: 'biceps-1', titleEn: 'Barbell Curl', titleAr: 'بار باي', muscleGroupEn: 'Biceps', muscleGroupAr: 'باي', videoUrl: getVideoUrl('Biceps', 'biceps-1') },
    { id: 'biceps-2', titleEn: 'Dumbbell Hammer Curl', titleAr: 'شاكوش بالدمبلز', muscleGroupEn: 'Biceps', muscleGroupAr: 'باي', videoUrl: getVideoUrl('Biceps', 'biceps-2') },
    { id: 'biceps-3', titleEn: 'Preacher Curl', titleAr: 'ارتكاز على الجهاز', muscleGroupEn: 'Biceps', muscleGroupAr: 'باي', videoUrl: getVideoUrl('Biceps', 'biceps-3') },

    // --- TRICEPS (تراي) ---
    { id: 'triceps-1', titleEn: 'Triceps Pushdown', titleAr: 'سحب تراي بالكابل', muscleGroupEn: 'Triceps', muscleGroupAr: 'تراي', videoUrl: getVideoUrl('Triceps', 'triceps-1') },
    { id: 'triceps-2', titleEn: 'Overhead Extension', titleAr: 'تراي خلف الرأس', muscleGroupEn: 'Triceps', muscleGroupAr: 'تراي', videoUrl: getVideoUrl('Triceps', 'triceps-2') },
    { id: 'triceps-3', titleEn: 'Dumbbell Kickback', titleAr: 'ركل للخلف بالدمبل', muscleGroupEn: 'Triceps', muscleGroupAr: 'تراي', videoUrl: getVideoUrl('Triceps', 'triceps-3') },

    // --- FOREARMS (سواعد) ---
    { id: 'forearms-1', titleEn: 'Wrist Curl', titleAr: 'طي الريست للداخل', muscleGroupEn: 'Forearms', muscleGroupAr: 'سواعد', videoUrl: getVideoUrl('Forearms', 'forearms-1') },
    { id: 'forearms-2', titleEn: 'Reverse Wrist Curl', titleAr: 'طي الريست للخارج', muscleGroupEn: 'Forearms', muscleGroupAr: 'سواعد', videoUrl: getVideoUrl('Forearms', 'forearms-2') },

    // --- CALVES (بطات) ---
    { id: 'calves-1', titleEn: 'Standing Calf Raise', titleAr: 'سمانة وقوف', muscleGroupEn: 'Calves', muscleGroupAr: 'بطات', videoUrl: getVideoUrl('Calves', 'calves-1') },
    { id: 'calves-2', titleEn: 'Seated Calf Raise', titleAr: 'سمانة جلوس', muscleGroupEn: 'Calves', muscleGroupAr: 'بطات', videoUrl: getVideoUrl('Calves', 'calves-2') },
];
