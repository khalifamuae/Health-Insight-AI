import os
import glob
import re

files_to_check = glob.glob('/Users/khalifas/Desktop/Health-Insight-AI/mobile/src/screens/*.tsx')
files_to_check.extend(glob.glob('/Users/khalifas/Desktop/Health-Insight-AI/mobile/src/screens/*.ts'))

patterns = [
    # Flex Direction
    (r"flexDirection:\s*isArabic\s*\?\s*'row-reverse'\s*:\s*'row'", "flexDirection: 'row'"),
    (r"flexDirection:\s*isArabic\s*\?\s*'row'\s*:\s*'row-reverse'", "flexDirection: 'row-reverse'"),
    
    # Text Alignment
    (r"textAlign:\s*isArabic\s*\?\s*'right'\s*:\s*'left'", "textAlign: 'left'"),
    (r"textAlign:\s*isArabic\s*\?\s*'left'\s*:\s*'right'", "textAlign: 'right'"),
    (r"textAlign:\s*isArabic\s*\?\s*'right'\s*:\s*'center'", "textAlign: isArabic ? 'left' : 'center'"),  # Replaces 'right' with 'left' so RTL flips it to right
    (r"textAlign:\s*isArabic\s*\?\s*'left'\s*:\s*'center'", "textAlign: isArabic ? 'right' : 'center'"),
    
    # Align Items / Self
    (r"alignItems:\s*isArabic\s*\?\s*'flex-end'\s*:\s*'flex-start'", "alignItems: 'flex-start'"),
    (r"alignItems:\s*isArabic\s*\?\s*'flex-start'\s*:\s*'flex-end'", "alignItems: 'flex-end'"),
    (r"alignSelf:\s*isArabic\s*\?\s*'flex-end'\s*:\s*'flex-start'", "alignSelf: 'flex-start'"),
    (r"alignSelf:\s*isArabic\s*\?\s*'flex-start'\s*:\s*'flex-end'", "alignSelf: 'flex-end'"),
    (r"alignSelf:\s*isArabic\s*\?\s*'stretch'\s*:\s*'center'", "alignSelf: isArabic ? 'stretch' : 'center'"),
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
