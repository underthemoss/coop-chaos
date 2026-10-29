"""Two fresh-process crown/bank exports must reproduce exact shipped GLB bytes."""
import hashlib,json,subprocess,sys
from pathlib import Path
S=Path(__file__).resolve().parent
R=S.parents[2]
blender=sys.argv[1] if len(sys.argv)>1 else '/tmp/coop-landscape-blender/Blender.app/Contents/MacOS/Blender'
names=['longbough-living','longbough-woven-kit','valley-grove-oak','valley-grove-spread','valley-grove-shrub','valley-bank-shoulder','valley-bank-shelf','valley-shore-outcrop']
paths=[R/'public/assets/environment/valley'/f'{n}.glb' for n in names]
profile=R/'src/content/valley-habitat.json'
def hashes():return {str(p.relative_to(R)):hashlib.sha256(p.read_bytes()).hexdigest() for p in paths}
initial=hashes();runs=[];profile_hash=hashlib.sha256(profile.read_bytes()).hexdigest()
for i in range(2):
 for script in ['author_crown_shape.py','author_banks.py']:
  subprocess.run([blender,'-b','--python-exit-code','1','--python',str(S/script)],cwd=R,check=True,stdout=subprocess.DEVNULL)
 result=hashes();assert result==initial,(i,result,initial);runs.append(result)
 assert hashlib.sha256(profile.read_bytes()).hexdigest()==profile_hash
receipt={'revision':json.loads((S/'crown-shape.json').read_text())['revision'],'state':'PASS','method':'Two fresh Blender4.5.3 crown-shape processes from preserved accepted-v4 GLBs and two fresh original bank-family authoring processes. All eight shipped GLBs byte-identical to initial candidate, including unchanged kit; profile unchanged. Editable Blend files regenerated but not asserted byte-deterministic. Earlier appearance/scenic generation proofs retained in historical baseline folders.','profileSha256':profile_hash,'initial':initial,'runs':runs}
(S/'determinism.json').write_text(json.dumps(receipt,indent=2)+'\n')
print('DETERMINISM_PASS',initial,flush=True)
