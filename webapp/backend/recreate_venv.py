#!/usr/bin/env python3
"""
Скрипт для пересоздания виртуального окружения с Python 3.12
"""
import subprocess
import sys
import os
import shutil
from pathlib import Path

def find_python312():
    """Поиск Python 3.12 в системе"""
    paths = [
        "python3.12",
        "/opt/homebrew/opt/python@3.12/bin/python3.12",
        "/opt/homebrew/bin/python3.12",
    ]
    
    for path in paths:
        try:
            result = subprocess.run(
                [path, "--version"],
                capture_output=True,
                text=True,
                check=True
            )
            if "3.12" in result.stdout:
                return path
        except (subprocess.CalledProcessError, FileNotFoundError):
            continue
    
    return None

def main():
    script_dir = Path(__file__).parent
    venv_dir = script_dir / "venv"
    
    print("🔄 Пересоздание виртуального окружения с Python 3.12")
    print()
    
    # Поиск Python 3.12
    python312 = find_python312()
    if not python312:
        print("❌ Python 3.12 не найден!")
        print("Установите Python 3.12 через Homebrew:")
        print("  brew install python@3.12")
        sys.exit(1)
    
    print(f"✅ Найден Python 3.12: {python312}")
    version_result = subprocess.run([python312, "--version"], capture_output=True, text=True)
    print(f"   Версия: {version_result.stdout.strip()}")
    print()
    
    # Удаление старого venv
    if venv_dir.exists():
        print("🗑️  Удаление старого venv...")
        shutil.rmtree(venv_dir)
        print("✅ Старое venv удалено")
        print()
    
    # Создание нового venv
    print("📦 Создание нового venv с Python 3.12...")
    result = subprocess.run(
        [python312, "-m", "venv", str(venv_dir)],
        cwd=script_dir
    )
    
    if result.returncode != 0:
        print("❌ Ошибка при создании venv")
        sys.exit(1)
    
    print("✅ Новое venv создано")
    print()
    
    # Определение пути к pip
    if sys.platform == "win32":
        pip_path = venv_dir / "Scripts" / "pip"
        python_path = venv_dir / "Scripts" / "python"
    else:
        pip_path = venv_dir / "bin" / "pip"
        python_path = venv_dir / "bin" / "python"
    
    # Обновление pip
    print("📦 Обновление pip...")
    subprocess.run([str(pip_path), "install", "--upgrade", "pip", "setuptools", "wheel"], check=True)
    
    pip_version = subprocess.run([str(pip_path), "--version"], capture_output=True, text=True)
    print(f"✅ pip обновлен: {pip_version.stdout.strip()}")
    print()
    
    # Установка зависимостей
    requirements_file = script_dir / "requirements.txt"
    if not requirements_file.exists():
        print("❌ Файл requirements.txt не найден!")
        sys.exit(1)
    
    print("📥 Установка зависимостей из requirements.txt...")
    result = subprocess.run(
        [str(pip_path), "install", "-r", str(requirements_file)],
        cwd=script_dir
    )
    
    if result.returncode == 0:
        print()
        print("✅ Все зависимости успешно установлены!")
        print()
        print("🎉 Виртуальное окружение готово к использованию!")
        print()
        print("Для активации в будущем выполните:")
        if sys.platform == "win32":
            print("  cd webapp\\backend")
            print("  venv\\Scripts\\activate")
        else:
            print("  cd webapp/backend")
            print("  source venv/bin/activate")
        print()
        print("Для запуска backend:")
        print("  uvicorn app.main:app --reload --host 0.0.0.0 --port 8000")
    else:
        print()
        print("⚠️  Были ошибки при установке зависимостей")
        print("Проверьте вывод выше для деталей")
        sys.exit(1)

if __name__ == "__main__":
    main()

