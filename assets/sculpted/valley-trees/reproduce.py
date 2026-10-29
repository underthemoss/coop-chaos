"""Byte reproducibility receipt; BLENDER_BIN points to Blender 4.5.3 LTS."""
import os,subprocess,hashlib,json
from pathlib import Path
SOURCE=Path(__file__).resolve().parent;ROOT=SOURCE.parents[2]
names=('longbough','crowncourt','riverside')
def sha(path):return hashlib.sha256(path.read_bytes()).hexdigest()
results=[]
for name in names:
    file=ROOT/'public/assets/environment/studies'/(name+'-study.glb');before=sha(file)
    command=[os.environ['BLENDER_BIN'],'--background','--threads','4','--python',str(SOURCE/'author_trees.py'),'--',name,'--no-render']
    run=subprocess.run(command,cwd=ROOT,capture_output=True,text=True)
    if run.returncode:raise RuntimeError(run.stdout[-2000:]+run.stderr[-2000:])
    after=sha(file);assert before==after,(name,before,after)
    results.append({'file':str(file.relative_to(ROOT)),'before_sha256':before,'after_sha256':after,'identical':True})
(SOURCE/'determinism.json').write_text(json.dumps({'blender':'4.5.3 LTS','exports':results},indent=2)+'\n')
print(json.dumps(results,indent=2))
