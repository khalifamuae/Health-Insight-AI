export interface GlobalExercise {
    id: string; // e.g., 'chest-1'
    titleEn: string;
    titleAr: string;
    muscleGroupEn: string;
    muscleGroupAr: string;
    videoUrl: string; // Remote URL to be streamed or downloaded
}

// These are placeholder URLs for now until the user uploads the actual 100 MP4s
// We will use a reliable, lightweight sample video for testing the UI
const SAMPLE_VIDEO = "https://d23dyxeqlo5psv.cloudfront.net/big_buck_bunny.mp4";

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
    { id: 'chest-1', titleEn: 'Barbell Bench Press', titleAr: 'ضغط الصدر بالبار مستوي', muscleGroupEn: 'Chest', muscleGroupAr: 'صدر', videoUrl: SAMPLE_VIDEO },
    { id: 'chest-2', titleEn: 'Incline Dumbbell Press', titleAr: 'ضغط بالدمبلز صدر علوي', muscleGroupEn: 'Chest', muscleGroupAr: 'صدر', videoUrl: SAMPLE_VIDEO },
    { id: 'chest-3', titleEn: 'Cable Crossover', titleAr: 'تفتيح بالكابل', muscleGroupEn: 'Chest', muscleGroupAr: 'صدر', videoUrl: SAMPLE_VIDEO },
    { id: 'chest-4', titleEn: 'Dumbbell Pullover', titleAr: 'بول أوفر بالدمبل', muscleGroupEn: 'Chest', muscleGroupAr: 'صدر', videoUrl: SAMPLE_VIDEO },

    // --- BACK (ظهر) ---
    { id: 'back-1', titleEn: 'Lat Pulldown', titleAr: 'سحب ظهر واسع', muscleGroupEn: 'Back', muscleGroupAr: 'ظهر', videoUrl: SAMPLE_VIDEO },
    { id: 'back-2', titleEn: 'Barbell Row', titleAr: 'سحب بالبار', muscleGroupEn: 'Back', muscleGroupAr: 'ظهر', videoUrl: SAMPLE_VIDEO },
    { id: 'back-3', titleEn: 'Seated Cable Row', titleAr: 'سحب أرضي ضيق', muscleGroupEn: 'Back', muscleGroupAr: 'ظهر', videoUrl: SAMPLE_VIDEO },
    { id: 'back-4', titleEn: 'Deadlift', titleAr: 'رفعة مميتة', muscleGroupEn: 'Back', muscleGroupAr: 'ظهر', videoUrl: SAMPLE_VIDEO },

    // --- LEGS (أرجل) ---
    { id: 'legs-1', titleEn: 'Barbell Squat', titleAr: 'سكوات بالبار', muscleGroupEn: 'Legs', muscleGroupAr: 'أرجل', videoUrl: SAMPLE_VIDEO },
    { id: 'legs-2', titleEn: 'Leg Press', titleAr: 'دفع بالقدمين', muscleGroupEn: 'Legs', muscleGroupAr: 'أرجل', videoUrl: SAMPLE_VIDEO },
    { id: 'legs-3', titleEn: 'Leg Extension', titleAr: 'رفرفة أمامي', muscleGroupEn: 'Legs', muscleGroupAr: 'أرجل', videoUrl: SAMPLE_VIDEO },
    { id: 'legs-4', titleEn: 'Lying Leg Curl', titleAr: 'رفرفة خلفي', muscleGroupEn: 'Legs', muscleGroupAr: 'أرجل', videoUrl: SAMPLE_VIDEO },

    // --- SHOULDERS (أكتاف) ---
    { id: 'shoulders-1', titleEn: 'Overhead Press', titleAr: 'ضغط أكتاف بالبار', muscleGroupEn: 'Shoulders', muscleGroupAr: 'أكتاف', videoUrl: SAMPLE_VIDEO },
    { id: 'shoulders-2', titleEn: 'Dumbbell Lateral Raise', titleAr: 'رفرفة جانبي', muscleGroupEn: 'Shoulders', muscleGroupAr: 'أكتاف', videoUrl: SAMPLE_VIDEO },
    { id: 'shoulders-3', titleEn: 'Dumbbell Front Raise', titleAr: 'رفرفة أمامي بالدمبلز', muscleGroupEn: 'Shoulders', muscleGroupAr: 'أكتاف', videoUrl: SAMPLE_VIDEO },
    { id: 'shoulders-4', titleEn: 'Reverse Pec Deck', titleAr: 'كتف خلفي بالجهاز', muscleGroupEn: 'Shoulders', muscleGroupAr: 'أكتاف', videoUrl: SAMPLE_VIDEO },

    // --- BICEPS (باي) ---
    { id: 'biceps-1', titleEn: 'Barbell Curl', titleAr: 'بار باي', muscleGroupEn: 'Biceps', muscleGroupAr: 'باي', videoUrl: SAMPLE_VIDEO },
    { id: 'biceps-2', titleEn: 'Dumbbell Hammer Curl', titleAr: 'شاكوش بالدمبلز', muscleGroupEn: 'Biceps', muscleGroupAr: 'باي', videoUrl: SAMPLE_VIDEO },
    { id: 'biceps-3', titleEn: 'Preacher Curl', titleAr: 'ارتكاز على الجهاز', muscleGroupEn: 'Biceps', muscleGroupAr: 'باي', videoUrl: SAMPLE_VIDEO },

    // --- TRICEPS (تراي) ---
    { id: 'triceps-1', titleEn: 'Triceps Pushdown', titleAr: 'سحب تراي بالكابل', muscleGroupEn: 'Triceps', muscleGroupAr: 'تراي', videoUrl: SAMPLE_VIDEO },
    { id: 'triceps-2', titleEn: 'Overhead Extension', titleAr: 'تراي خلف الرأس', muscleGroupEn: 'Triceps', muscleGroupAr: 'تراي', videoUrl: SAMPLE_VIDEO },
    { id: 'triceps-3', titleEn: 'Dumbbell Kickback', titleAr: 'ركل للخلف بالدمبل', muscleGroupEn: 'Triceps', muscleGroupAr: 'تراي', videoUrl: SAMPLE_VIDEO },

    // --- FOREARMS (سواعد) ---
    { id: 'forearms-1', titleEn: 'Wrist Curl', titleAr: 'طي الريست للداخل', muscleGroupEn: 'Forearms', muscleGroupAr: 'سواعد', videoUrl: SAMPLE_VIDEO },
    { id: 'forearms-2', titleEn: 'Reverse Wrist Curl', titleAr: 'طي الريست للخارج', muscleGroupEn: 'Forearms', muscleGroupAr: 'سواعد', videoUrl: SAMPLE_VIDEO },

    // --- CALVES (بطات) ---
    { id: 'calves-1', titleEn: 'Standing Calf Raise', titleAr: 'سمانة وقوف', muscleGroupEn: 'Calves', muscleGroupAr: 'بطات', videoUrl: SAMPLE_VIDEO },
    { id: 'calves-2', titleEn: 'Seated Calf Raise', titleAr: 'سمانة جلوس', muscleGroupEn: 'Calves', muscleGroupAr: 'بطات', videoUrl: SAMPLE_VIDEO },
];
