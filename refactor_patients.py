import os
import re

def replace_in_file(file_path):
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
    except Exception as e:
        print(f"Could not read {file_path}: {e}")
        return

    # Use negative lookbehind to avoid 'use client' or 'use Client'
    # Lookbehind in Python: (?<!...)
    
    # We replace:
    # CLIENTS -> PATIENTS
    # CLIENT  -> PATIENT (but not CLIENT Component)
    # clients -> patients
    # Clients -> Patients
    # client  -> patient
    # Client  -> Patient
    
    replacements = [
        (r'(?<!use\s)clients', 'patients'),
        (r'(?<!use\s)Clients', 'Patients'),
        (r'(?<!use\s)client', 'patient'),
        (r'(?<!use\s)Client', 'Patient'),
        (r'CLIENTS', 'PATIENTS'),
        (r'CLIENT(?!\s+Component)', 'PATIENT'),
    ]
    
    new_content = content
    for pattern, replacement in replacements:
        # We need to handle case-sensitive replacements correctly
        # The lookbehind works for case-sensitive too
        new_content = re.sub(pattern, replacement, new_content)

    if new_content != content:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Updated: {file_path}")

def walk_and_replace(root_dir):
    for root, dirs, files in os.walk(root_dir):
        if any(x in root for x in ['node_modules', '.next', '.git']):
            continue
            
        for file in files:
            if file.endswith(('.ts', '.tsx', '.js', '.jsx', '.json', '.md')):
                replace_in_file(os.path.join(root, file))

if __name__ == "__main__":
    target = r'c:\Users\dayoo\.gemini\antigravity\scratch\patriotic-virtual-prod\emr-portal'
    walk_and_replace(target)
