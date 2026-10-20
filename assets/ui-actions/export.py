"""Alpha-preserving runtime exports; run with Python + Pillow, no creative edits."""
from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parents[2]
for name in ("reeds", "home", "food", "nest"):
    image = Image.open(root / "assets/ui-actions" / f"{name}-source.png")
    assert image.mode == "RGBA" and image.getextrema()[-1] == (0, 255)
    image.thumbnail((256, 256), Image.Resampling.LANCZOS)
    target = root / "public/assets/ui/actions" / f"{name}.png"
    target.parent.mkdir(parents=True, exist_ok=True)
    image.save(target, optimize=True)
