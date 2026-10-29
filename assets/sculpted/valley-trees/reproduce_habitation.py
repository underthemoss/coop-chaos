"""Rebuild only the habitation study and record actual deterministic comparisons."""
import os,sys,json,hashlib,subprocess
from pathlib import Path
S=Path(__file__).resolve().parent;ROOT=S.parents[2]
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
targets=[ROOT/'public/assets/environment/studies/longbough-habitation-study.glb',S/'habitation-presentation.json',S/'habitation-bark-albedo.png',S/'habitation-bark-normal.png']
legacy=[ROOT/'public/assets/environment/studies'/n for n in ('longbough-study.glb','crowncourt-study.glb','riverside-study.glb')]
before={str(p.relative_to(ROOT)):sha(p) for p in targets+legacy}
blender=os.environ.get('BLENDER_BIN','/tmp/coop-landscape-blender/Blender.app/Contents/MacOS/Blender')
with (S/'habitation-rebuild.log').open('w') as log:
 subprocess.run([blender,'--background','--threads','4','--python',str(S/'author_habitation.py'),'--','--no-render'],cwd=ROOT,stdout=log,stderr=subprocess.STDOUT,check=True)
after={str(p.relative_to(ROOT)):sha(p) for p in targets+legacy}
checks={name:{'before':before[name],'after':after[name],'identical':before[name]==after[name]} for name in before}
report={'revision':'longbough-habitation-v4','status':'PASS' if all(c['identical'] for c in checks.values()) else 'FAIL','command':[blender,'--background','--threads','4','--python','assets/sculpted/valley-trees/author_habitation.py','--','--no-render'],'checks':checks,'scope':'One recipe rerun on Blender 4.5.3 LTS, same host/runtime. Blend binary metadata is excluded; runtime GLB, images and presentation bytes must match. Three v5 study exports must remain unchanged.'}
(S/'habitation-determinism.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2));sys.exit(0 if report['status']=='PASS' else 1)
