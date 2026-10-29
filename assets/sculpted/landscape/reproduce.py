"""Repeat standalone export and record exact GLB determinism."""
import hashlib,json,os,shutil,subprocess
from pathlib import Path

SOURCE=Path(__file__).resolve().parent
ROOT=SOURCE.parents[2]
files=[ROOT/'public/assets/environment'/('valley-'+name+'.glb') for name in ('cliff-ledge','boulder','scree')]
def hashes():return {str(p.relative_to(ROOT)):hashlib.sha256(p.read_bytes()).hexdigest() for p in files}
before=hashes()
blender=os.environ.get('BLENDER_BIN') or shutil.which('blender')
if not blender:raise SystemExit('Set BLENDER_BIN to Blender 4.5 LTS')
subprocess.run([blender,'--background','--threads','4','--python',str(SOURCE/'author_landscape.py'),'--','--no-render'],cwd=ROOT,check=True)
after=hashes();result={'revision':'landscape-v3','before':before,'after':after,'identical':before==after,'comparison':'Three GLBs only; editable Blender files contain save-session metadata.'}
(SOURCE/'determinism.json').write_text(json.dumps(result,indent=2)+'\n')
assert before==after,'Repeated GLB export differed'
print('PASS: all three GLBs byte-identical across independent Blender runs')
