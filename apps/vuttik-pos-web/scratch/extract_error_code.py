import os

file_path = r'dist\assets\index-DBJGLK2P.js'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

offset = 48376
start = max(0, offset - 100)
end = min(len(content), offset + 100)
print(f"Code at {offset}:")
print(content[start:end])
