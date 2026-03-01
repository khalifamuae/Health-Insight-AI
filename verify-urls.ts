import fs from 'fs';
import https from 'https';

// Cloudflare R2 Custom Domain
const VIDEO_BASE_URL = "https://assets.biotrack-ai.com";

const getVideoUrl = (folderName: string, fileName: string) => {
    return `${VIDEO_BASE_URL}/100%20Gym%20Workouts/${folderName}/${encodeURIComponent(fileName)}`;
};

interface SimpleExercise {
    folder: string;
    file: string;
}

const exercises: SimpleExercise[] = [
    // Shoulders
    { folder: 'Shoulders', file: 'Front Raise (Dumbbell).mp4' },
    { folder: 'Shoulders', file: 'Dumbbell Upright Row.mp4' },
    { folder: 'Shoulders', file: 'Dumbbell Overhead Standard.mp4' },
    { folder: 'Shoulders', file: 'Barbell Upright Row.mp4' },
    { folder: 'Shoulders', file: 'Barbell Overhead Press Standing.mp4' },
    { folder: 'Shoulders', file: 'Arnold Press Dumbbell.mp4' },
    { folder: 'Shoulders', file: 'Military Press (Seated - Smith Machine).mp4' },
    { folder: 'Shoulders', file: 'Lateral Raises (Machine).mp4' },
    { folder: 'Shoulders', file: 'Lateral Raises (Dumbbell).mp4' },
    { folder: 'Shoulders', file: 'Lateral Raises (Cable).mp4' },
    { folder: 'Shoulders', file: 'Kettelbell Overhead Press.mp4' },
    { folder: 'Shoulders', file: 'Front Raise (Weighted Plate).mp4' },
    { folder: 'Shoulders', file: 'Rear Delt Fly Machine.mp4' },
    { folder: 'Shoulders', file: 'Rear Delt Fly (Reverse Pec Deck).mp4' },

    // Legs
    { folder: 'Legs', file: 'Barbell March.mp4' },
    { folder: 'Legs', file: 'Barbell Hip Thrust.mp4' },
    { folder: 'Legs', file: 'Barbell Front Squat.mp4' },
    { folder: 'Legs', file: 'Barbell Bulgarian Split Squat.mp4' },
    { folder: 'Legs', file: 'Barbell Back Squat.mp4' },
    { folder: 'Legs', file: 'Air Bike Sprint.mp4' },
    { folder: 'Legs', file: 'Dumbbell Goblet Squat.mp4' },
    { folder: 'Legs', file: 'Dumbbell Bulgarian Split Squat.mp4' },
    { folder: 'Legs', file: 'Cyclying.mp4' }, // Note typo in original: Cyclying
    { folder: 'Legs', file: 'Cable Leg Kickback.mp4' },
    { folder: 'Legs', file: 'Barbell Romanian Deadlift.mp4' },
    { folder: 'Legs', file: 'Barbell Reverse Lunges.mp4' },
    { folder: 'Legs', file: 'KettleBell Hold March.mp4' },
    { folder: 'Legs', file: 'Hip Abduction Machine.mp4' },
    { folder: 'Legs', file: 'Hack Squat Machine.mp4' },
    { folder: 'Legs', file: 'Elliptical HIIT Machine.mp4' },
    { folder: 'Legs', file: 'Dumbbell Jump Squat.mp4' },
    { folder: 'Legs', file: 'Dumbbell Hip Hinge.mp4' },
    { folder: 'Legs', file: 'Rope Wave.mp4' },
    { folder: 'Legs', file: 'Lying Leg Curl Machine.mp4' },
    { folder: 'Legs', file: 'Leg Press Machine.mp4' },
    { folder: 'Legs', file: 'Leg Extension Machine.mp4' },
    { folder: 'Legs', file: 'Kettlebell Swing.mp4' },
    { folder: 'Legs', file: 'Kettlebell Lift Up.mp4' },
    { folder: 'Legs', file: 'StepMill Machine Version 1.mp4' },
    { folder: 'Legs', file: 'Step-Ups (Weighted).mp4' },
    { folder: 'Legs', file: 'Seated Overhead Press.mp4' },
    { folder: 'Legs', file: 'Seated Leg Curl Machine.mp4' },
    { folder: 'Legs', file: 'Run on Treadmill.mp4' },
    { folder: 'Legs', file: 'Rowing Machine.mp4' },
    { folder: 'Legs', file: 'Walk On Treadmill.mp4' },
    { folder: 'Legs', file: 'Tricep Pushdown (Cable - Rope).mp4' },
    { folder: 'Legs', file: 'Stiff-Legged Deadlift Machine.mp4' },
    { folder: 'Legs', file: 'StepMill Machine.mp4' },

    // Chest
    { folder: 'Chest', file: 'Dumbbell Bench Press (Decline).mp4' },
    { folder: 'Chest', file: 'Dumbbell Bench Press (Bench ).mp4' }, // Note trailing space
    { folder: 'Chest', file: 'Dips (Chest focus - leaning forward).mp4' },
    { folder: 'Chest', file: 'Cable Crossover (High to Low).mp4' },
    { folder: 'Chest', file: 'Barbell Incline Bench Press.mp4' },
    { folder: 'Chest', file: 'Barbell Bench Press Flat.mp4' },
    { folder: 'Chest', file: 'Svend Press Chest.mp4' },
    { folder: 'Chest', file: 'Pec Deck Machine Fly.mp4' },
    { folder: 'Chest', file: 'Dumbbell Flys Incline.mp4' },
    { folder: 'Chest', file: 'Dumbbell Flys Flat.mp4' },
    { folder: 'Chest', file: 'Dumbbell Bench Press Incline.mp4' },

    // Back
    { folder: 'Back', file: 'Deadlift Sumo Barbell.mp4' },
    { folder: 'Back', file: 'Deadlift Barbell .mp4' }, // Note trailing space
    { folder: 'Back', file: 'Chin Up Leg Folded.mp4' },
    { folder: 'Back', file: 'Cable Face Pull.mp4' },
    { folder: 'Back', file: 'Barbell Shrug.mp4' },
    { folder: 'Back', file: 'Barbell Bent Over Row.mp4' },
    { folder: 'Back', file: 'Rear Delt Fly With Dumbbell.mp4' },
    { folder: 'Back', file: 'Pull Up.mp4' },
    { folder: 'Back', file: 'Lat Pull Down Wide Grip.mp4' },
    { folder: 'Back', file: 'Hyperextensions (Back Extensions).mp4' },
    { folder: 'Back', file: 'Good Morning Barbell.mp4' },
    { folder: 'Back', file: 'Dumbbell Shrug.mp4' },
    { folder: 'Back', file: 'T-Bar Row.mp4' },
    { folder: 'Back', file: 'Seated Chest Supported Machine.mp4' },

    // Arms
    { folder: 'Arms', file: 'Close-Grip Bench Press Barbell.mp4' },
    { folder: 'Arms', file: 'Cable Wood Chop.mp4' },
    { folder: 'Arms', file: 'Cable Curl (Straight Bar).mp4' },
    { folder: 'Arms', file: 'Barbell Hold.mp4' },
    { folder: 'Arms', file: 'Barbell Curl Standard.mp4' },
    { folder: 'Arms', file: 'Band Pushups.mp4' },
    { folder: 'Arms', file: 'Band Pushups .mp4' }, // Note trailing space
    { folder: 'Arms', file: 'Dumbbell Spider Curl.mp4' },
    { folder: 'Arms', file: 'Dumbbell Overhead Press Version 1.mp4' },
    { folder: 'Arms', file: 'Dumbbell Hammer Curl.mp4' },
    { folder: 'Arms', file: 'Dumbbell Curl.mp4' },
    { folder: 'Arms', file: 'Concentration Curl (Seated).mp4' },
    { folder: 'Arms', file: 'Tricep Pushdown (Cable - Straight Bar).mp4' },
    { folder: 'Arms', file: 'Skull Crushers (EZ Bar).mp4' },
    { folder: 'Arms', file: 'Single Arm Pull Rope.mp4' },
    { folder: 'Arms', file: 'Preacher Curl Ez Bar.mp4' },
    { folder: 'Arms', file: 'Overhead Tricep Extension (Dumbbell).mp4' },
    { folder: 'Arms', file: 'Landmine Press (Single Arm).mp4' },
    { folder: 'Arms', file: 'Wide Dumbbell Push up.mp4' },
    { folder: 'Arms', file: 'Weighted Push up.mp4' },

    // Abs
    { folder: 'Abs', file: 'Plank Hold Weighted.mp4' },
    { folder: 'Abs', file: 'Kettlebell Sit-Ups To Press.mp4' },
    { folder: 'Abs', file: 'Hanging Leg Raise.mp4' },
    { folder: 'Abs', file: 'Captain’s Chair Leg Raises.mp4' },
    { folder: 'Abs', file: 'Cable Crunch (Kneeling).mp4' },
    { folder: 'Abs', file: 'Ab Roll Workout.mp4' },
    { folder: 'Abs', file: 'Russian Twist Weighted.mp4' },
];

async function checkUrl(url: string, file: string): Promise<boolean> {
    return new Promise((resolve) => {
        let attempts = 0;

        // Sometimes Cloudflare resets connections quickly on un-cached assets, simple retry helps
        const doCheck = () => {
            https.request(url, { method: 'HEAD', timeout: 15000 }, (res) => {
                if (res.statusCode === 200 || res.statusCode === 304) {
                    resolve(true);
                } else {
                    console.log(`❌ [${res.statusCode}] Failed: ${file}`);
                    resolve(false);
                }
            }).on('error', (err) => {
                attempts++;
                if (attempts < 2) {
                    doCheck();
                } else {
                    console.log(`❌ [ERR] Failed: ${file} - ${err.message}`);
                    resolve(false);
                }
            }).on('timeout', () => {
                console.log(`❌ [TIMEOUT] Failed: ${file}`);
                resolve(false);
            }).end();
        };

        doCheck();
    });
}

async function run() {
    let successCount = 0;
    let failCount = 0;

    console.log(`Starting check for ${exercises.length} videos...`);

    // Check in smaller batches to avoid overwhelming the network
    const batchSize = 10;
    for (let i = 0; i < exercises.length; i += batchSize) {
        const batch = exercises.slice(i, i + batchSize);
        const promises = batch.map(ex => {
            const url = getVideoUrl(ex.folder, ex.file);
            return checkUrl(url, ex.file).then(success => {
                if (success) successCount++;
                else failCount++;
            });
        });

        await Promise.all(promises);
    }

    console.log(`\n✅ Working: ${successCount}`);
    console.log(`❌ Failed: ${failCount}`);
}

run();
