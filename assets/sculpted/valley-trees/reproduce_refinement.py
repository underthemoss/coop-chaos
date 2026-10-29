"""Rebuild the isolated refinement twice; verify runtime byte determinism."""
import hashlib,json,os,subprocess,sys
from pathlib import Path
S=Path(__file__).resolve().parent;ROOT=S.parents[2]
blender=os.environ['BLENDER_BIN'];asset=ROOT/'public/assets/environment/studies/longbough-refinement-study.glb'
runs=[]
for i in range(2):
 result=subprocess.run([blender,'--background','--threads','4','--python',str(S/'author_refinement.py'),'--','--no-render'],cwd=ROOT,capture_output=True,text=True)
 if result.returncode or 'Traceback' in result.stdout+result.stderr:raise RuntimeError(result.stdout+result.stderr)
 runs.append({'run':i+1,'sha256':hashlib.sha256(asset.read_bytes()).hexdigest(),'bytes':asset.stat().st_size})
assert runs[0]['sha256']==runs[1]['sha256'],'Runtime export is not byte deterministic'
subprocess.run([sys.executable,str(S/'validate_refinement.py')],cwd=ROOT,check=True,capture_output=True)
result=subprocess.run([blender,'--background','--threads','4','--python',str(S/'inspect_refinement.py')],cwd=ROOT,capture_output=True,text=True)
assert result.returncode==0 and 'Traceback' not in result.stdout+result.stderr,result.stdout+result.stderr
out={'state':'PASS','revision':json.loads((S/'refinement-presentation.json').read_text())['revision'],'runs':runs,'checks':['Two separate Blender processes produce identical GLB bytes','Parsed GLB validation passes','Saved source color/UV boundaries, floor/headroom and support-anchor samples pass'],'limits':'Runtime byte determinism; Blender source files can contain session metadata and are not claimed byte deterministic.'}
(S/'refinement-determinism.json').write_text(json.dumps(out,indent=2)+'\n');print(json.dumps(out,indent=2))
