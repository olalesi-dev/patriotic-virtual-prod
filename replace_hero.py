import re

# Read the file
with open('public/index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Define the replacement
old_pattern = r'<div class="hv-main">.*?</svg>\s*</div>'
new_content = '<div class="hv-main"><img src="hero-image.png" alt="Healthcare professional using holographic medical display" style="width: 100%; height: auto; border-radius: 22px; box-shadow: 0 24px 60px rgba(0, 0, 0, .5);" /></div>'

# Replace
content = re.sub(old_pattern, new_content, content, flags=re.DOTALL)

# Write back
with open('public/index.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("Hero image replaced successfully!")
