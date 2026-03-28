import os

# Папки и файлы, которые не нужно показывать ИИ
IGNORE_DIRS = ['.git', 'node_modules', 'venv', '__pycache__', '.replit']
IGNORE_FILES = ['.env', 'package-lock.json', 'poetry.lock', 'gather_code.py']

with open('all_code.txt', 'w', encoding='utf-8') as outfile:
    for root, dirs, files in os.walk('.'):
        # Исключаем ненужные папки
        dirs[:] = [d for d in dirs if d not in IGNORE_DIRS]
        for file in files:
            if file in IGNORE_FILES or file.endswith(('.png', '.jpg', '.pyc', '.zip')): 
                continue

            filepath = os.path.join(root, file)
            outfile.write(f"\n\n{'='*40}\n")
            outfile.write(f"ФАЙЛ: {filepath}\n")
            outfile.write(f"{'='*40}\n\n")

            try:
                with open(filepath, 'r', encoding='utf-8') as infile:
                    outfile.write(infile.read())
            except Exception:
                outfile.write("[Бинарный файл или ошибка чтения]\n")

print("Готово! Весь код собран в файл all_code.txt")