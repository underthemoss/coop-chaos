"""Regenerate original editable Blender assets and checked runtime exports."""
from pathlib import Path
import os
import shutil
import subprocess
import sys

root = Path(__file__).resolve().parents[2]
candidate = os.environ.get('BLENDER_BIN') or shutil.which('blender')
if not candidate and Path('/Applications/Blender.app/Contents/MacOS/Blender').is_file():
    candidate = '/Applications/Blender.app/Contents/MacOS/Blender'
if not candidate or not Path(candidate).is_file():
    sys.exit('Blender 4.5 LTS is required only for asset authoring. Set BLENDER_BIN to its executable; npm run build/check use checked-in GLBs without Blender.')
subprocess.run([candidate, '--background', '--python', str(root/'assets/sculpted/author.py')], cwd=root, check=True)
subprocess.run([candidate, '--background', '--python', str(root/'assets/sculpted/author_ground.py')], cwd=root, check=True)
subprocess.run([candidate, '--background', '--python', str(root/'assets/sculpted/author_dressing.py'), '--', '--no-render'], cwd=root, check=True)
subprocess.run([candidate, '--background', '--python', str(root/'assets/sculpted/chickens/author_chickens.py'), '--', 'fern', 'rook', 'dapple', 'wren', '--no-render'], cwd=root, check=True)

subprocess.run([candidate, '--background', '--python', str(root/'assets/sculpted/technology/author_technology.py')], cwd=root, check=True)
