"""Rebuild only Lowfork in isolation and qualify the bark-only re-export.

Run with Blender's --background --python. Shipped geometry is read, never replaced.
"""
import hashlib
import json
import tempfile
from pathlib import Path

import bpy


ROOT = Path(__file__).resolve().parents[3]
AUTHOR = ROOT / 'assets/sculpted/author.py'
RECIPE = ROOT / 'assets/sculpted/trees.py'


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


with tempfile.TemporaryDirectory(prefix='coop-lowfork-reproduction-') as directory:
    stage = Path(directory)
    for subdirectory in ['source/environment', 'public/environment']:
        (stage / subdirectory).mkdir(parents=True)
    scope = {'__file__': str(AUTHOR), '__name__': 'source_qualification'}
    # Load the established helper definitions without executing the asset launcher.
    helpers = AUTHOR.read_text().split("\nfor sub in ['environment','characters']:")[0]
    exec(compile(helpers, str(AUTHOR), 'exec'), scope)
    exec(compile(RECIPE.read_text(), str(RECIPE), 'exec'), scope)
    scope['SOURCE'] = stage / 'source'
    scope['OUT'] = stage / 'public'
    scope['oak']()
    generated_path = stage / 'public/environment/lowfork.glb'
    expected = digest(ROOT / 'public/assets/environment/lowfork.glb')
    regenerated = digest(generated_path)
    assert regenerated == expected, ('independent regeneration', expected, regenerated)

    bpy.ops.wm.open_mainfile(filepath=str(stage / 'source/environment/lowfork.blend'))
    wood = bpy.data.objects['lowfork continuous living boughs metre-v2']
    paths = json.loads(wood['growth_paths'])
    roots = json.loads(wood['root_paths'])
    scope['lowfork_bark'](wood, paths, roots, relief=False)
    scope['lowfork_growth_bark'](wood, paths + roots)
    scope['export']('environment/lowfork', list(bpy.context.scene.objects))
    bark = digest(generated_path)
    assert bark == expected, ('bark-only re-export', expected, bark)

    result = {
        'runtimeSha256': expected,
        'independentRegenerationSha256': regenerated,
        'barkOnlyReexportSha256': bark,
        'checks': {
            'independentRecipeReproducesRuntime': True,
            'legacyBarkLauncherIsIdempotent': True,
        },
        'sourceRecipeHashes': {
            str(path.relative_to(ROOT)): digest(path)
            for path in [AUTHOR, RECIPE, Path(__file__).resolve()]
        },
    }
    (ROOT / 'assets/sculpted/trees/refinement-generation.json').write_text(
        json.dumps(result, indent=2) + '\n'
    )
    print(json.dumps(result, indent=2))
