import os
import glob
import re

files_to_check = glob.glob('/Users/khalifas/Desktop/Health-Insight-AI/mobile/src/**/*.tsx', recursive=True)
files_to_check.extend(glob.glob('/Users/khalifas/Desktop/Health-Insight-AI/mobile/src/**/*.ts', recursive=True))

patterns = [
    (r"flexDirection:\s*isArabic\s*\?\s*'row-reverse'\s*:\s*'row'", "flexDirection: 'row'"),
    (r"textAlign:\s*isArabic\s*\?\s*'right'\s*:\s*'left'", "textAlign: 'left'"),
    (r"writingDirection:\s*isArabic\s*\?\s*'rtl'\s*:\s*'ltr',?\s*", ""),
    (r"alignItems:\s*isArabic\s*\?\s*'flex-end'\s*:\s*'flex-start'", "alignItems: 'flex-start'"),
    (r"justifyContent:\s*isArabic\s*\?\s*'flex-start'\s*:\s*'flex-end'", "justifyContent: 'flex-end'"),
    (r"justifyContent:\s*isArabic\s*\?\s*'flex-end'\s*:\s*'flex-start'", "justifyContent: 'flex-start'"),
    (r"alignSelf:\s*isArabic\s*\?\s*'flex-end'\s*:\s*'flex-start'", "alignSelf: 'flex-start'"),
    # Add optional spacing between properties
]

for filepath in files_to_check:
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    original = content
    for pattern, repl in patterns:
        content = re.sub(pattern, repl, content)
        
    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Updated {filepath}")
