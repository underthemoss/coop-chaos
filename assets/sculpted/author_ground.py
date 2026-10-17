"""Runtime derivatives from preserved original generated surface albedos.

Run with Blender --background --python assets/sculpted/author_ground.py.
This is a surface-color blend, not baked lighting or a scene illustration.
"""
from pathlib import Path
import bpy

root = Path(__file__).resolve().parents[2]
source = Path(__file__).resolve().parent
result = bpy.data.images.load(str(source / "ground-painted-source.png"))
woodland = bpy.data.images.load(str(source / "woodland-albedo-source.png"))
size = 1536
woodland.scale(size, size)
# Preserve native painted detail: broad color islands were authored without grain.
# Decode before changing filepath: Blender loads file images lazily.
_ = result.pixels[0]
print("Painted albedo native dimensions:", tuple(result.size))
result.filepath_raw = str(root / "public/assets/materials/meadow-albedo.jpg")
result.file_format = "JPEG"
result.save()
woodland.scale(96, 96)
woodland.scale(size, size)
woodland.filepath_raw = str(root / "public/assets/materials/woodland-soft-albedo.jpg")
woodland.file_format = "JPEG"
woodland.save()
