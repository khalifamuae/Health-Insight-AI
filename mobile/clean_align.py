import os
import re

files_to_check = [
    '/Users/khalifas/Desktop/Health-Insight-AI/mobile/src/screens/WorkoutPlansScreen.tsx',
    '/Users/khalifas/Desktop/Health-Insight-AI/mobile/src/screens/MyDietPlansScreen.tsx',
    '/Users/khalifas/Desktop/Health-Insight-AI/mobile/src/screens/DietScreen.tsx'
]

patterns = [
    (r"textAlign:\s*'left',?\s*", ""),
    (r"textAlign:\s*'right',?\s*", ""),
]

for filepath in files_to_check:
    if os.path.exists(filepath):
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()

        original = content
        for pattern, repl in patterns:
            content = re.sub(pattern, repl, content)
            
        if content != original:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"Updated {filepath}")
