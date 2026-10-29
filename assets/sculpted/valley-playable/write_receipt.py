"""Assemble the final source receipt without changing authored assets."""
import hashlib
import json
from pathlib import Path

S = Path(__file__).resolve().parent
R = S.parents[2]


def record(path):
    path = Path(path)
    return {'path': str(path.relative_to(R)), 'bytes': path.stat().st_size,
            'sha256': hashlib.sha256(path.read_bytes()).hexdigest()}


def read(name):
    return json.loads((S / name).read_text())


profile = R / 'src/content/valley-habitat.json'
contract = json.loads(profile.read_text())
profile_sha = record(profile)['sha256']
checks = read('asset-checks.json')
appearance=read('appearance-geometry.json')
palette={'revision':'accepted-v4-preserved','evidence':'shape-baseline-v4/palette-qualification.json','currentProof':'crown-shape-checks.json: every COLOR_0 value exact'}
banks=read('bank-checks.json')
bankmeta=read('bank-assets.json')
grove=read('grove-checks.json')
grove_contract=read('grove-assets.json')
proofs = ['asset-checks.json', 'determinism.json', 'source-fit.json',
          'source-animation-fit.json', 'source-access-animation.json',
          'source-soles.json', 'source-support.json', 'floor-measures.json']
for name in proofs:
    assert read(name)['profileSha256'] == profile_sha, name
for name, result in checks['assets'].items():
    assert record(R / 'public' / contract['assetUrls'][name].lstrip('/'))['sha256'] == result['sha256']
for name in ['source-animation-fit.json','source-access-animation.json','source-soles.json','source-support.json']:
    assert read(name)['livingSha256']==checks['assets']['living']['sha256'],name
    assert read(name)['kitSha256']==checks['assets']['kit']['sha256'],name
assert checks['state'] == read('determinism.json')['state'] == banks['state'] == 'PASS'
assert appearance['state']==grove['state']=='PASS'
for name,info in grove['assets'].items():
    assert record(R/'public'/grove_contract['assets'][name]['assetUrl'].lstrip('/'))['sha256']==info['sha256']
receipt = {
    'state': 'READY — source asset lane; runtime acceptance owned separately',
    'revision': appearance['revision'], 'habitatRevision':contract['revision'], 'profile': record(profile),
    'assets': checks['assets'],
    'totals': {'bytes': sum(x['bytes'] for x in checks['assets'].values()),
               'triangles': sum(x['triangles'] for x in checks['assets'].values()),
               'primitives': sum(g['primitives'] for x in checks['assets'].values() for g in x['groups'])},
    'sourceFrame': contract['sourceFrame'], 'presentation': contract['presentation'],
    'stages': contract['profile']['stages'],
    'appearanceGeometry':appearance,
    'selectiveFoliagePalette':palette,
    'scenicGrove':{'revision':grove_contract['revision'],'assets':grove['assets'],
                  'sourceBoundsAndLowWood':grove_contract['assets'],
                  'totals':{'bytes':sum(x['bytes'] for x in grove['assets'].values()),'triangles':sum(x['triangles'] for x in grove['assets'].values()),'primitives':6},
                  'role':'Scenic/background only; primary accepted source-v2 for normal gameplay backdrop. Occasional visible core shoulders/lobe rhythm remain; not a close-up hero or gameplay habitat.'},
    'bankFamily':{'revision':bankmeta['revision'],'sourceFrame':bankmeta['sourceFrame'],'assets':banks['assets'],'placementContract':bankmeta['assets'],'totals':{'bytes':sum(x['bytes'] for x in banks['assets'].values()),'triangles':sum(x['triangles'] for x in banks['assets'].values()),'primitives':6},'role':'Original partly buried scenic bank/shore masses; runtime owns safe blocked-bank placements and visual qualification, no walkable/collision support claim.'},
    'floorAreasM2': {n: x['areaM2'] for n, x in read('floor-measures.json')['floors'].items()},
    'checks': {
        'glb': checks['state'], 'freshProcessDeterminism': read('determinism.json')['state'],
        'naturalAnimationPosesPerAdult': {k: v['poseCount'] for k, v in read('source-animation-fit.json')['birds'].items()},
        'walkAccessPosesPerAdult': {k: v['poseCount'] for k, v in read('source-access-animation.json')['birds'].items()},
        'naturalAnimationIntersections': sum(x['intersectingPoses'] for x in read('source-animation-fit.json')['birds'].values()),
        'walkAccessIntersectingPoses': sum(len(x['hits']) for x in read('source-access-animation.json')['birds'].values()),
        'basketSweepSamples': len(read('source-support.json')['basket']['samples']),
        'basketSweepSurfacePairs': sum(x['surfacePairs'] for x in read('source-support.json')['basket']['samples']),
        'payloadVsBasketPairs': read('source-support.json')['basket']['payloadVsBasketPairs'],
        'payloadGapAboveBasketFloorM': read('source-support.json')['basket']['payloadGapAboveFloor'],
        'soleProjection': 'All four actual adults, six places, both feet: all66low-toe rays supported. Curved bark local gaps/penetrations retained in source-soles.json.',
        'sourceRenders': 'Current shape-v3 actual-export whole/detail/strategy and grove source renders, plus bank-family source render. DCC lighting is separate from actual runtime acceptance.',
        'runtime': 'Independent integration owner; source checks do not assert transformed movement, reload or performance acceptance.'
    },
    'fitEvidenceReuse':'Crown positions/normals changed: actual animated natural/access checks, both-foot sole checks, support/lift sweep were rerun against this exact living SHA. All four receipts assert current living/kit hashes. Historical source-fit.json is rejected/rest-pose diagnostic evidence, not the current animation acceptance. Wood, kit, profile, accepted v4 COLOR_0 and all other glTF attributes/topology remain exact against shape-baseline-v4.',
    'evidence': [record(S / n) for n in proofs + ['living-extraction.json', 'root-sections.json','appearance-geometry.json','appearance-qualification.json','palette-qualification.json','grove-assets.json','grove-checks.json','crown-shape.json','crown-shape-checks.json','bank-assets.json','bank-checks.json']],
    'editableSources': [record(p) for p in sorted(S.glob('*.blend'))],
    'authoringAndValidation': [record(p) for p in sorted(S.glob('*.py'))] + [record(S / 'README.md')],
    'renders': [record(p) for p in sorted(S.glob('candidate-*.png'))],
    'consumerReview': record(S / 'consumer-review.json'),
    'provenance': {
        'living': 'Original accepted v8 subset; appearance-baseline-v1 retains original extraction. Current shape-v3 changes crown POSITION/NORMAL only against accepted shape-baseline-v4; living wood and original image bytes exact, accepted golden-green COLOR_0 exact. Whole components near measured natural approaches retain original foliage to preserve clearance.',
        'newKit': 'Original fitted bound-reed geometry authored by author_valley.py using original buildings helper builders. Current appearance pass preserves exact geometry/stages while adding warm edge and recessed interior COLOR_0. No copied reference pixels or external asset downloads.',
        'appearanceRecipe':'author_crown_shape.py reads preserved accepted v4 GLBs, applies original unequal spray/shoulder deformation with transformed normals and recessed cores, retaining protected natural-approach components. Editable Blends import actual shipped bytes. Original appearance and geometry generators/evidence remain historical.',
        'bankRecipe':'author_banks.py composes original fractured courses with protected moss, cooler wet lower faces and warmer mineral upper planes; reuses original landscape Sculpture helpers. No external meshes/images or reference pixels.',
        'grove':'author_grove.py original low-cost continuous paths and folded opaque leaves, no full hero clones. Existing original generated bark paint is embedded as JPEG85; original source PNG and provenance preserved in valley-trees.',
        'groveBarkSource':record(R/'assets/sculpted/valley-trees/bark-painted-v1-source.png'),
        'reedImage': record(R / 'assets/sculpted/buildings/reed-weave-v1-source.png'),
        'reedGenerationPromptAndSource': record(R / 'assets/sculpted/buildings/reed-material-provenance.json'),
        'reedImageSourceCopyVerifiedByteIdentical': True, 'reedImageDimensionsPx': [1254, 1254],
        'barkSourceProvenance': 'assets/sculpted/valley-trees/README.md and original refinement source receipt; generated painted diffuse retained unchanged.',
        'preserved': checks['preserved']
    },
    'limits': [
        'One full-size living hero plus reusable staged kit; no top platform. Availability and six-place rules remain simulation-owned.',
        'Original sculpt and leaf-lobe rhythm remain stylized; simplified foliage lighting and inherited painted bark treatment remain production-art limits.',
        'Scenic grove is accepted for layered background use at normal camera scale; intermittent support-core shoulders, lobe rhythm and simplified trunks remain unsuitable as new close-up heroes.',
        'Sampled source mesh contacts do not prove structural strength, IK/grasp, arbitrary body sizes, crowd avoidance or zero-collision physics.',
        'Open ladder approaches are climbing apertures, not continuously grounded walking ramps; no cargo-on-ladder or basket-passenger ability is claimed.',
        'Root Y0 is anatomical ground; negative-Y underside remains buried. Current canonical map reserves the conservative full low-wood envelope including buried portions plus .35m clearance, not an exact plane-collision mask. Root sections are evidence for future tightening.',
        'Generated reed image contains some woven shading; perfect seam continuity and pure-unlit diffuse are not asserted.',
        'GLBs reproduce byte-for-byte; regenerated editable Blend bytes are not claimed deterministic. No npm/browser/commit/deploy work performed in this asset lane.'
    ]
}
(S / 'asset-receipt.json').write_text(json.dumps(receipt, indent=2) + '\n')
print('RECEIPT', record(S / 'asset-receipt.json'))
