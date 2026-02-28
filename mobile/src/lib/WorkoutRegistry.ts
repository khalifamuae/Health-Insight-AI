export interface GlobalExercise {
    id: string; // The URL-encoded filename (without extension if preferred, but here we use exact filename)
    titleEn: string;
    titleAr: string;
    muscleGroupEn: string;
    muscleGroupAr: string;
    videoUrl: string; // Remote URL to be streamed or downloaded
}

// Cloudflare R2 Custom Domain (CDN Enabled for fast loading)
const VIDEO_BASE_URL = "https://assets.biotrack-ai.com";

// Helper function to generate the correct video URL.
// We expect folders inside R2 exactly matching the muscleGroupEn
const getVideoUrl = (folderName: string, fileName: string) => {
    // encodeURIComponent ensures spaces and special characters are valid in the URL
    return `${VIDEO_BASE_URL}/100%20Gym%20Workouts/${folderName}/${encodeURIComponent(fileName)}`;
};

export const EXERCISE_REGISTRY: GlobalExercise[] = [

    // ==========================================
    // Shoulders (أكتاف)
    // ==========================================
    { id: 'shoulders-1', titleEn: 'Front Raise (Dumbbell)', titleAr: 'رفرفة أمامي بالدمبل', muscleGroupEn: 'Shoulders', muscleGroupAr: 'أكتاف', videoUrl: getVideoUrl('Shoulders', 'Front Raise (Dumbbell).mp4') },
    { id: 'shoulders-2', titleEn: 'Dumbbell Upright Row', titleAr: 'سحب عمودي بالدمبل', muscleGroupEn: 'Shoulders', muscleGroupAr: 'أكتاف', videoUrl: getVideoUrl('Shoulders', 'Dumbbell Upright Row.mp4') },
    { id: 'shoulders-3', titleEn: 'Dumbbell Overhead Standard', titleAr: 'ضغط أكتاف بالدمبل', muscleGroupEn: 'Shoulders', muscleGroupAr: 'أكتاف', videoUrl: getVideoUrl('Shoulders', 'Dumbbell Overhead Standard.mp4') },
    { id: 'shoulders-4', titleEn: 'Barbell Upright Row', titleAr: 'سحب عمودي بالبار', muscleGroupEn: 'Shoulders', muscleGroupAr: 'أكتاف', videoUrl: getVideoUrl('Shoulders', 'Barbell Upright Row.mp4') },
    { id: 'shoulders-5', titleEn: 'Barbell Overhead Press Standing', titleAr: 'ضغط أكتاف بالبار (وقوف)', muscleGroupEn: 'Shoulders', muscleGroupAr: 'أكتاف', videoUrl: getVideoUrl('Shoulders', 'Barbell Overhead Press Standing.mp4') },
    { id: 'shoulders-6', titleEn: 'Arnold Press Dumbbell', titleAr: 'ضغط أرنولد بالدمبل', muscleGroupEn: 'Shoulders', muscleGroupAr: 'أكتاف', videoUrl: getVideoUrl('Shoulders', 'Arnold Press Dumbbell.mp4') },
    { id: 'shoulders-7', titleEn: 'Military Press (Seated - Smith Machine)', titleAr: 'ضغط أكتاف (جلوس على جهاز سميث)', muscleGroupEn: 'Shoulders', muscleGroupAr: 'أكتاف', videoUrl: getVideoUrl('Shoulders', 'Military Press (Seated - Smith Machine).mp4') },
    { id: 'shoulders-8', titleEn: 'Lateral Raises (Machine)', titleAr: 'رفرفة جانبي (جهاز)', muscleGroupEn: 'Shoulders', muscleGroupAr: 'أكتاف', videoUrl: getVideoUrl('Shoulders', 'Lateral Raises (Machine).mp4') },
    { id: 'shoulders-9', titleEn: 'Lateral Raises (Dumbbell)', titleAr: 'رفرفة جانبي بالدمبل', muscleGroupEn: 'Shoulders', muscleGroupAr: 'أكتاف', videoUrl: getVideoUrl('Shoulders', 'Lateral Raises (Dumbbell).mp4') },
    { id: 'shoulders-10', titleEn: 'Lateral Raises (Cable)', titleAr: 'رفرفة جانبي بالكابل', muscleGroupEn: 'Shoulders', muscleGroupAr: 'أكتاف', videoUrl: getVideoUrl('Shoulders', 'Lateral Raises (Cable).mp4') },
    { id: 'shoulders-11', titleEn: 'Kettelbell Overhead Press', titleAr: 'ضغط أكتاف بالكتل بيل', muscleGroupEn: 'Shoulders', muscleGroupAr: 'أكتاف', videoUrl: getVideoUrl('Shoulders', 'Kettelbell Overhead Press.mp4') },
    { id: 'shoulders-12', titleEn: 'Front Raise (Weighted Plate)', titleAr: 'رفرفة أمامي (بالطارة)', muscleGroupEn: 'Shoulders', muscleGroupAr: 'أكتاف', videoUrl: getVideoUrl('Shoulders', 'Front Raise (Weighted Plate).mp4') },
    { id: 'shoulders-13', titleEn: 'Rear Delt Fly Machine', titleAr: 'كتف خلفي (جهاز فراشة عكسي)', muscleGroupEn: 'Shoulders', muscleGroupAr: 'أكتاف', videoUrl: getVideoUrl('Shoulders', 'Rear Delt Fly Machine.mp4') },
    { id: 'shoulders-14', titleEn: 'Rear Delt Fly (Reverse Pec Deck)', titleAr: 'كتف خلفي (جهاز الرفرفة)', muscleGroupEn: 'Shoulders', muscleGroupAr: 'أكتاف', videoUrl: getVideoUrl('Shoulders', 'Rear Delt Fly (Reverse Pec Deck).mp4') },

    // ==========================================
    // Legs (أرجل)
    // ==========================================
    { id: 'legs-1', titleEn: 'Barbell March', titleAr: 'مسير بالبار', muscleGroupEn: 'Legs', muscleGroupAr: 'أرجل', videoUrl: getVideoUrl('Legs', 'Barbell March.mp4') },
    { id: 'legs-2', titleEn: 'Barbell Hip Thrust', titleAr: 'دفع الورك بالبار', muscleGroupEn: 'Legs', muscleGroupAr: 'أرجل', videoUrl: getVideoUrl('Legs', 'Barbell Hip Thrust.mp4') },
    { id: 'legs-3', titleEn: 'Barbell Front Squat', titleAr: 'سكوات أمامي بالبار', muscleGroupEn: 'Legs', muscleGroupAr: 'أرجل', videoUrl: getVideoUrl('Legs', 'Barbell Front Squat.mp4') },
    { id: 'legs-4', titleEn: 'Barbell Bulgarian Split Squat', titleAr: 'سكوات بلغاري بالبار', muscleGroupEn: 'Legs', muscleGroupAr: 'أرجل', videoUrl: getVideoUrl('Legs', 'Barbell Bulgarian Split Squat.mp4') },
    { id: 'legs-5', titleEn: 'Barbell Back Squat', titleAr: 'سكوات خلفي بالبار', muscleGroupEn: 'Legs', muscleGroupAr: 'أرجل', videoUrl: getVideoUrl('Legs', 'Barbell Back Squat.mp4') },
    { id: 'legs-6', titleEn: 'Air Bike Sprint', titleAr: 'دراجة هوائية (اير بايك)', muscleGroupEn: 'Cardio', muscleGroupAr: 'كارديو', videoUrl: getVideoUrl('Legs', 'Air Bike Sprint.mp4') },
    { id: 'legs-7', titleEn: 'Dumbbell Goblet Squat', titleAr: 'سكوات جوبليت بالدمبل', muscleGroupEn: 'Legs', muscleGroupAr: 'أرجل', videoUrl: getVideoUrl('Legs', 'Dumbbell Goblet Squat.mp4') },
    { id: 'legs-8', titleEn: 'Dumbbell Bulgarian Split Squat', titleAr: 'سكوات بلغاري بالدمبل', muscleGroupEn: 'Legs', muscleGroupAr: 'أرجل', videoUrl: getVideoUrl('Legs', 'Dumbbell Bulgarian Split Squat.mp4') },
    { id: 'legs-9', titleEn: 'Cyclying', titleAr: 'دراجة ثابتة', muscleGroupEn: 'Cardio', muscleGroupAr: 'كارديو', videoUrl: getVideoUrl('Legs', 'Cyclying.mp4') },
    { id: 'legs-10', titleEn: 'Cable Leg Kickback', titleAr: 'ركل الساق للخلف بالكابل', muscleGroupEn: 'Legs', muscleGroupAr: 'أرجل', videoUrl: getVideoUrl('Legs', 'Cable Leg Kickback.mp4') },
    { id: 'legs-11', titleEn: 'Barbell Romanian Deadlift', titleAr: 'رفعة مميتة رومانية بالبار', muscleGroupEn: 'Legs', muscleGroupAr: 'أرجل', videoUrl: getVideoUrl('Legs', 'Barbell Romanian Deadlift.mp4') },
    { id: 'legs-12', titleEn: 'Barbell Reverse Lunges', titleAr: 'طعن خلفي بالبار', muscleGroupEn: 'Legs', muscleGroupAr: 'أرجل', videoUrl: getVideoUrl('Legs', 'Barbell Reverse Lunges.mp4') },
    { id: 'legs-13', titleEn: 'KettleBell Hold March', titleAr: 'مسير مع حمل الكتل بيل', muscleGroupEn: 'Legs', muscleGroupAr: 'أرجل', videoUrl: getVideoUrl('Legs', 'KettleBell Hold March.mp4') },
    { id: 'legs-14', titleEn: 'Hip Abduction Machine', titleAr: 'جهاز فتح الحوض', muscleGroupEn: 'Legs', muscleGroupAr: 'أرجل', videoUrl: getVideoUrl('Legs', 'Hip Abduction Machine.mp4') },
    { id: 'legs-15', titleEn: 'Hack Squat Machine', titleAr: 'جهاز هاك سكوات', muscleGroupEn: 'Legs', muscleGroupAr: 'أرجل', videoUrl: getVideoUrl('Legs', 'Hack Squat Machine.mp4') },
    { id: 'legs-16', titleEn: 'Elliptical HIIT Machine', titleAr: 'جهاز الاوبتيراك', muscleGroupEn: 'Cardio', muscleGroupAr: 'كارديو', videoUrl: getVideoUrl('Legs', 'Elliptical HIIT Machine.mp4') },
    { id: 'legs-17', titleEn: 'Dumbbell Jump Squat', titleAr: 'سكوات قفز بالدمبل', muscleGroupEn: 'Legs', muscleGroupAr: 'أرجل', videoUrl: getVideoUrl('Legs', 'Dumbbell Jump Squat.mp4') },
    { id: 'legs-18', titleEn: 'Dumbbell Hip Hinge', titleAr: 'انحناء الورك بالدمبل', muscleGroupEn: 'Legs', muscleGroupAr: 'أرجل', videoUrl: getVideoUrl('Legs', 'Dumbbell Hip Hinge.mp4') },
    { id: 'legs-19', titleEn: 'Rope Wave', titleAr: 'حبال المقاومة (باتل روب)', muscleGroupEn: 'Cardio', muscleGroupAr: 'كارديو', videoUrl: getVideoUrl('Legs', 'Rope Wave.mp4') },
    { id: 'legs-20', titleEn: 'Lying Leg Curl Machine', titleAr: 'جهاز رفرفة خلفي تمدد', muscleGroupEn: 'Legs', muscleGroupAr: 'أرجل', videoUrl: getVideoUrl('Legs', 'Lying Leg Curl Machine.mp4') },
    { id: 'legs-21', titleEn: 'Leg Press Machine', titleAr: 'جهاز دفع القدمين', muscleGroupEn: 'Legs', muscleGroupAr: 'أرجل', videoUrl: getVideoUrl('Legs', 'Leg Press Machine.mp4') },
    { id: 'legs-22', titleEn: 'Leg Extension Machine', titleAr: 'جهاز رفرفة أمامي', muscleGroupEn: 'Legs', muscleGroupAr: 'أرجل', videoUrl: getVideoUrl('Legs', 'Leg Extension Machine.mp4') },
    { id: 'legs-23', titleEn: 'Kettlebell Swing', titleAr: 'أرجحة الكتل بيل', muscleGroupEn: 'Legs', muscleGroupAr: 'أرجل', videoUrl: getVideoUrl('Legs', 'Kettlebell Swing.mp4') },
    { id: 'legs-24', titleEn: 'Kettlebell Lift Up', titleAr: 'رفع الكتل بيل', muscleGroupEn: 'Legs', muscleGroupAr: 'أرجل', videoUrl: getVideoUrl('Legs', 'Kettlebell Lift Up.mp4') },
    { id: 'legs-25', titleEn: 'StepMill Machine Version 1', titleAr: 'جهاز صعود الدرج', muscleGroupEn: 'Cardio', muscleGroupAr: 'كارديو', videoUrl: getVideoUrl('Legs', 'StepMill Machine Version 1.mp4') },
    { id: 'legs-26', titleEn: 'Step-Ups (Weighted)', titleAr: 'صعود الدرجة (بالأوزان)', muscleGroupEn: 'Legs', muscleGroupAr: 'أرجل', videoUrl: getVideoUrl('Legs', 'Step-Ups (Weighted).mp4') },
    { id: 'legs-27', titleEn: 'Seated Overhead Press', titleAr: 'انتبه: فيديو ضغط أكتاف', muscleGroupEn: 'Shoulders', muscleGroupAr: 'أكتاف', videoUrl: getVideoUrl('Legs', 'Seated Overhead Press.mp4') },
    { id: 'legs-28', titleEn: 'Seated Leg Curl Machine', titleAr: 'جهاز رفرفة خلفي جلوس', muscleGroupEn: 'Legs', muscleGroupAr: 'أرجل', videoUrl: getVideoUrl('Legs', 'Seated Leg Curl Machine.mp4') },
    { id: 'legs-29', titleEn: 'Run on Treadmill', titleAr: 'جري على السير', muscleGroupEn: 'Cardio', muscleGroupAr: 'كارديو', videoUrl: getVideoUrl('Legs', 'Run on Treadmill.mp4') },
    { id: 'legs-30', titleEn: 'Rowing Machine', titleAr: 'جهاز التجديف', muscleGroupEn: 'Cardio', muscleGroupAr: 'كارديو', videoUrl: getVideoUrl('Legs', 'Rowing Machine.mp4') },
    { id: 'legs-31', titleEn: 'Walk On Treadmill', titleAr: 'مشي على السير', muscleGroupEn: 'Cardio', muscleGroupAr: 'كارديو', videoUrl: getVideoUrl('Legs', 'Walk On Treadmill.mp4') },
    { id: 'legs-32', titleEn: 'Tricep Pushdown (Cable - Rope)', titleAr: 'سحب تراي بالحبل', muscleGroupEn: 'Triceps', muscleGroupAr: 'تراي', videoUrl: getVideoUrl('Legs', 'Tricep Pushdown (Cable - Rope).mp4') },
    { id: 'legs-33', titleEn: 'Stiff-Legged Deadlift Machine', titleAr: 'جهاز الرفعة المميتة', muscleGroupEn: 'Legs', muscleGroupAr: 'أرجل', videoUrl: getVideoUrl('Legs', 'Stiff-Legged Deadlift Machine.mp4') },
    { id: 'legs-34', titleEn: 'StepMill Machine', titleAr: 'جهاز تسلق الدرج', muscleGroupEn: 'Cardio', muscleGroupAr: 'كارديو', videoUrl: getVideoUrl('Legs', 'StepMill Machine.mp4') },

    // ==========================================
    // Chest (صدر)
    // ==========================================
    { id: 'chest-1', titleEn: 'Dumbbell Bench Press (Decline)', titleAr: 'تجميع صدر سفلي بالدمبل', muscleGroupEn: 'Chest', muscleGroupAr: 'صدر', videoUrl: getVideoUrl('Chest', 'Dumbbell Bench Press (Decline).mp4') },
    { id: 'chest-2', titleEn: 'Dumbbell Bench Press (Bench)', titleAr: 'تجميع صدر مستوي بالدمبل', muscleGroupEn: 'Chest', muscleGroupAr: 'صدر', videoUrl: getVideoUrl('Chest', 'Dumbbell Bench Press (Bench ).mp4') },
    { id: 'chest-3', titleEn: 'Dips (Chest focus - leaning forward)', titleAr: 'متوازي (ميل للأمام لصدر)', muscleGroupEn: 'Chest', muscleGroupAr: 'صدر', videoUrl: getVideoUrl('Chest', 'Dips (Chest focus - leaning forward).mp4') },
    { id: 'chest-4', titleEn: 'Cable Crossover (High to Low)', titleAr: 'تفتيح صدر كابل (عالي لأسفل)', muscleGroupEn: 'Chest', muscleGroupAr: 'صدر', videoUrl: getVideoUrl('Chest', 'Cable Crossover (High to Low).mp4') },
    { id: 'chest-5', titleEn: 'Barbell Incline Bench Press', titleAr: 'ضغط صدر علوي بالبار', muscleGroupEn: 'Chest', muscleGroupAr: 'صدر', videoUrl: getVideoUrl('Chest', 'Barbell Incline Bench Press.mp4') },
    { id: 'chest-6', titleEn: 'Barbell Bench Press Flat', titleAr: 'ضغط صدر مستوي بالبار', muscleGroupEn: 'Chest', muscleGroupAr: 'صدر', videoUrl: getVideoUrl('Chest', 'Barbell Bench Press Flat.mp4') },
    { id: 'chest-7', titleEn: 'Svend Press Chest', titleAr: 'ضغط سفيند للصدر', muscleGroupEn: 'Chest', muscleGroupAr: 'صدر', videoUrl: getVideoUrl('Chest', 'Svend Press Chest.mp4') },
    { id: 'chest-8', titleEn: 'Pec Deck Machine Fly', titleAr: 'جهاز فراشة الصدر', muscleGroupEn: 'Chest', muscleGroupAr: 'صدر', videoUrl: getVideoUrl('Chest', 'Pec Deck Machine Fly.mp4') },
    { id: 'chest-9', titleEn: 'Dumbbell Flys Incline', titleAr: 'تفتيح صدر علوي بالدمبل', muscleGroupEn: 'Chest', muscleGroupAr: 'صدر', videoUrl: getVideoUrl('Chest', 'Dumbbell Flys Incline.mp4') },
    { id: 'chest-10', titleEn: 'Dumbbell Flys Flat', titleAr: 'تفتيح صدر مستوي بالدمبل', muscleGroupEn: 'Chest', muscleGroupAr: 'صدر', videoUrl: getVideoUrl('Chest', 'Dumbbell Flys Flat.mp4') },
    { id: 'chest-11', titleEn: 'Dumbbell Bench Press Incline', titleAr: 'تجميع صدر علوي بالدمبل', muscleGroupEn: 'Chest', muscleGroupAr: 'صدر', videoUrl: getVideoUrl('Chest', 'Dumbbell Bench Press Incline.mp4') },

    // ==========================================
    // Back (ظهر)
    // ==========================================
    { id: 'back-1', titleEn: 'Deadlift Sumo Barbell', titleAr: 'رفعة مميتة (سومو) بالبار', muscleGroupEn: 'Back', muscleGroupAr: 'ظهر', videoUrl: getVideoUrl('Back', 'Deadlift Sumo Barbell.mp4') },
    { id: 'back-2', titleEn: 'Deadlift Barbell', titleAr: 'رفعة مميتة بالبار', muscleGroupEn: 'Back', muscleGroupAr: 'ظهر', videoUrl: getVideoUrl('Back', 'Deadlift Barbell .mp4') },
    { id: 'back-3', titleEn: 'Chin Up Leg Folded', titleAr: 'عقلة عكسي (ثني الأرجل)', muscleGroupEn: 'Back', muscleGroupAr: 'ظهر', videoUrl: getVideoUrl('Back', 'Chin Up Leg Folded.mp4') },
    { id: 'back-4', titleEn: 'Cable Face Pull', titleAr: 'سحب كابل للوجه', muscleGroupEn: 'Shoulders', muscleGroupAr: 'أكتاف', videoUrl: getVideoUrl('Back', 'Cable Face Pull.mp4') },
    { id: 'back-5', titleEn: 'Barbell Shrug', titleAr: 'رفرفة كتف علوي (شراغز) بالبار', muscleGroupEn: 'Back', muscleGroupAr: 'ظهر', videoUrl: getVideoUrl('Back', 'Barbell Shrug.mp4') },
    { id: 'back-6', titleEn: 'Barbell Bent Over Row', titleAr: 'سحب بار انحناء', muscleGroupEn: 'Back', muscleGroupAr: 'ظهر', videoUrl: getVideoUrl('Back', 'Barbell Bent Over Row.mp4') },
    { id: 'back-7', titleEn: 'Rear Delt Fly With Dumbbell', titleAr: 'كتف خلفي انحناء بالدمبل', muscleGroupEn: 'Shoulders', muscleGroupAr: 'أكتاف', videoUrl: getVideoUrl('Back', 'Rear Delt Fly With Dumbbell.mp4') },
    { id: 'back-8', titleEn: 'Pull Up', titleAr: 'عقلة (سحب أمامي)', muscleGroupEn: 'Back', muscleGroupAr: 'ظهر', videoUrl: getVideoUrl('Back', 'Pull Up.mp4') },
    { id: 'back-9', titleEn: 'Lat Pull Down Wide Grip', titleAr: 'سحب ظهر واسع جهاز', muscleGroupEn: 'Back', muscleGroupAr: 'ظهر', videoUrl: getVideoUrl('Back', 'Lat Pull Down Wide Grip.mp4') },
    { id: 'back-10', titleEn: 'Hyperextensions (Back Extensions)', titleAr: 'جهاز قطنية (ظهر سفلي)', muscleGroupEn: 'Back', muscleGroupAr: 'ظهر', videoUrl: getVideoUrl('Back', 'Hyperextensions (Back Extensions).mp4') },
    { id: 'back-11', titleEn: 'Good Morning Barbell', titleAr: 'تمرين صباح الخير بالبار (قطنية)', muscleGroupEn: 'Back', muscleGroupAr: 'ظهر', videoUrl: getVideoUrl('Back', 'Good Morning Barbell.mp4') },
    { id: 'back-12', titleEn: 'Dumbbell Shrug', titleAr: 'ترابيس بالدمبل', muscleGroupEn: 'Back', muscleGroupAr: 'ظهر', videoUrl: getVideoUrl('Back', 'Dumbbell Shrug.mp4') },
    { id: 'back-13', titleEn: 'T-Bar Row', titleAr: 'سحب تي بار', muscleGroupEn: 'Back', muscleGroupAr: 'ظهر', videoUrl: getVideoUrl('Back', 'T-Bar Row.mp4') },
    { id: 'back-14', titleEn: 'Seated Chest Supported Machine', titleAr: 'سحب ظهر بجهاز الدعم', muscleGroupEn: 'Back', muscleGroupAr: 'ظهر', videoUrl: getVideoUrl('Back', 'Seated Chest Supported Machine.mp4') },

    // ==========================================
    // Arms (ذراع - تراي وباي)
    // ==========================================
    { id: 'arms-1', titleEn: 'Close-Grip Bench Press Barbell', titleAr: 'ضغط صدر ضيق (للتراي)', muscleGroupEn: 'Triceps', muscleGroupAr: 'تراي', videoUrl: getVideoUrl('Arms', 'Close-Grip Bench Press Barbell.mp4') },
    { id: 'arms-2', titleEn: 'Cable Wood Chop', titleAr: 'كابل تقطيع لخارجي (خواصر)', muscleGroupEn: 'Abs', muscleGroupAr: 'بطن', videoUrl: getVideoUrl('Arms', 'Cable Wood Chop.mp4') },
    { id: 'arms-3', titleEn: 'Cable Curl (Straight Bar)', titleAr: 'باي كابل (بار مستقيم)', muscleGroupEn: 'Biceps', muscleGroupAr: 'باي', videoUrl: getVideoUrl('Arms', 'Cable Curl (Straight Bar).mp4') },
    { id: 'arms-4', titleEn: 'Barbell Hold', titleAr: 'ثبات تحمل بالبار', muscleGroupEn: 'Forearms', muscleGroupAr: 'سواعد', videoUrl: getVideoUrl('Arms', 'Barbell Hold.mp4') },
    { id: 'arms-5', titleEn: 'Barbell Curl Standard', titleAr: 'باي بالبار (وقوف)', muscleGroupEn: 'Biceps', muscleGroupAr: 'باي', videoUrl: getVideoUrl('Arms', 'Barbell Curl Standard.mp4') },
    { id: 'arms-6', titleEn: 'Band Pushups', titleAr: 'ضغط بمقاومة الشريط (أول)', muscleGroupEn: 'Chest', muscleGroupAr: 'صدر', videoUrl: getVideoUrl('Arms', 'Band Pushups.mp4') },
    // { id: 'arms-7', titleEn: 'Band Pushups ', titleAr: 'ضغط بمقاومة الشريط (ثاني)', muscleGroupEn: 'Chest', muscleGroupAr: 'صدر', videoUrl: getVideoUrl('Arms', 'Band Pushups .mp4') }, // Duplicate/Typo in R2 upload
    { id: 'arms-8', titleEn: 'Dumbbell Spider Curl', titleAr: 'باي عنكبوت بالدمبل', muscleGroupEn: 'Biceps', muscleGroupAr: 'باي', videoUrl: getVideoUrl('Arms', 'Dumbbell Spider Curl.mp4') },
    { id: 'arms-9', titleEn: 'Dumbbell Overhead Press Version 1', titleAr: 'انتبه: ضغط أكتاف بالدمبل', muscleGroupEn: 'Shoulders', muscleGroupAr: 'أكتاف', videoUrl: getVideoUrl('Arms', 'Dumbbell Overhead Press Version 1.mp4') },
    { id: 'arms-10', titleEn: 'Dumbbell Hammer Curl', titleAr: 'باي مطرقة بالدمبل', muscleGroupEn: 'Biceps', muscleGroupAr: 'باي', videoUrl: getVideoUrl('Arms', 'Dumbbell Hammer Curl.mp4') },
    { id: 'arms-11', titleEn: 'Dumbbell Curl', titleAr: 'باي تبادل بالدمبل', muscleGroupEn: 'Biceps', muscleGroupAr: 'باي', videoUrl: getVideoUrl('Arms', 'Dumbbell Curl.mp4') },
    { id: 'arms-12', titleEn: 'Concentration Curl (Seated)', titleAr: 'باي ارتكاز دمبل جلوس', muscleGroupEn: 'Biceps', muscleGroupAr: 'باي', videoUrl: getVideoUrl('Arms', 'Concentration Curl (Seated).mp4') },
    { id: 'arms-13', titleEn: 'Tricep Pushdown (Cable - Straight Bar)', titleAr: 'سحب تراي كابل (بار مستقيم)', muscleGroupEn: 'Triceps', muscleGroupAr: 'تراي', videoUrl: getVideoUrl('Arms', 'Tricep Pushdown (Cable - Straight Bar).mp4') },
    { id: 'arms-14', titleEn: 'Skull Crushers (EZ Bar)', titleAr: 'تراي خلف الرأس بالبار الزجزاج', muscleGroupEn: 'Triceps', muscleGroupAr: 'تراي', videoUrl: getVideoUrl('Arms', 'Skull Crushers (EZ Bar).mp4') },
    { id: 'arms-15', titleEn: 'Single Arm Pull Rope', titleAr: 'سحب ظهر يد واحدة حبل', muscleGroupEn: 'Back', muscleGroupAr: 'ظهر', videoUrl: getVideoUrl('Arms', 'Single Arm Pull Rope.mp4') },
    { id: 'arms-16', titleEn: 'Preacher Curl Ez Bar', titleAr: 'باي ارتكاز بالبار الزجزاج', muscleGroupEn: 'Biceps', muscleGroupAr: 'باي', videoUrl: getVideoUrl('Arms', 'Preacher Curl Ez Bar.mp4') },
    { id: 'arms-17', titleEn: 'Overhead Tricep Extension (Dumbbell)', titleAr: 'تراي خلف الرأس بالدمبل', muscleGroupEn: 'Triceps', muscleGroupAr: 'تراي', videoUrl: getVideoUrl('Arms', 'Overhead Tricep Extension (Dumbbell).mp4') },
    { id: 'arms-18', titleEn: 'Landmine Press (Single Arm)', titleAr: 'ضغط لاندمين بيد واحدة', muscleGroupEn: 'Shoulders', muscleGroupAr: 'أكتاف', videoUrl: getVideoUrl('Arms', 'Landmine Press (Single Arm).mp4') },
    { id: 'arms-19', titleEn: 'Wide Dumbbell Push up', titleAr: 'ضغط واسع مستندا على دمبل', muscleGroupEn: 'Chest', muscleGroupAr: 'صدر', videoUrl: getVideoUrl('Arms', 'Wide Dumbbell Push up.mp4') },
    { id: 'arms-20', titleEn: 'Weighted Push up', titleAr: 'ضغط بوزن إضافي', muscleGroupEn: 'Chest', muscleGroupAr: 'صدر', videoUrl: getVideoUrl('Arms', 'Weighted Push up.mp4') },

    // ==========================================
    // Abs (بطن)
    // ==========================================
    { id: 'abs-1', titleEn: 'Plank Hold Weighted', titleAr: 'ثبات بلانك بالوزن', muscleGroupEn: 'Abs', muscleGroupAr: 'بطن', videoUrl: getVideoUrl('Abs', 'Plank Hold Weighted.mp4') },
    { id: 'abs-2', titleEn: 'Kettlebell Sit-Ups To Press', titleAr: 'تمارين بطن مع رفع الكتل بيل', muscleGroupEn: 'Abs', muscleGroupAr: 'بطن', videoUrl: getVideoUrl('Abs', 'Kettlebell Sit-Ups To Press.mp4') },
    { id: 'abs-3', titleEn: 'Hanging Leg Raise', titleAr: 'رفع الأرجل (تعلق)', muscleGroupEn: 'Abs', muscleGroupAr: 'بطن', videoUrl: getVideoUrl('Abs', 'Hanging Leg Raise.mp4') },
    { id: 'abs-4', titleEn: 'Captain’s Chair Leg Raises', titleAr: 'رفع أرجل بجهاز العقلة', muscleGroupEn: 'Abs', muscleGroupAr: 'بطن', videoUrl: getVideoUrl('Abs', 'Captain’s Chair Leg Raises.mp4') },
    { id: 'abs-5', titleEn: 'Cable Crunch (Kneeling)', titleAr: 'كرانش بطن بالكابل', muscleGroupEn: 'Abs', muscleGroupAr: 'بطن', videoUrl: getVideoUrl('Abs', 'Cable Crunch (Kneeling).mp4') },
    { id: 'abs-6', titleEn: 'Ab Roll Workout', titleAr: 'تمرين عجلة البطن', muscleGroupEn: 'Abs', muscleGroupAr: 'بطن', videoUrl: getVideoUrl('Abs', 'Ab Roll Workout.mp4') },
    { id: 'abs-7', titleEn: 'Russian Twist Weighted', titleAr: 'تويست روسي بالوزن', muscleGroupEn: 'Abs', muscleGroupAr: 'بطن', videoUrl: getVideoUrl('Abs', 'Russian Twist Weighted.mp4') },

];
