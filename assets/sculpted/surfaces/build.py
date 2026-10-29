"""Normal runtime albedo derivatives; preserve the exact generated source PNGs.
Run: Blender --background --python assets/sculpted/surfaces/build.py
"""
from pathlib import Path
import bpy, hashlib, json
root = Path(__file__).resolve().parents[3]
source = Path(__file__).resolve().parent
receipt = []
for name in ['meadow-turf', 'weathered-stone']:
    original = source / (name + '-source.png')
    image = bpy.data.images.load(str(original), check_existing=False)
    dimensions = list(image.size)
    _ = image.pixels[0]
    image.scale(1024, 1024)
    output = root / 'public/assets/materials' / (name + '-v1.jpg')
    image.file_format = 'JPEG'
    image.filepath_raw = str(output)
    image.save()
    receipt.append({'source': str(original.relative_to(root)), 'sourceDimensions': dimensions,
                    'sourceSha256': hashlib.sha256(original.read_bytes()).hexdigest(),
                    'runtime': str(output.relative_to(root)), 'runtimeDimensions': list(image.size),
                    'runtimeSha256': hashlib.sha256(output.read_bytes()).hexdigest(), 'bytes': output.stat().st_size})
(source / 'exports.json').write_text(json.dumps(receipt, indent=2) + '\n')
print(json.dumps(receipt, indent=2))
