"""Original analytic ambient sky, without a sun disk or photographed source.

Write linear RGBE Radiance HDR. Babylon's build-time browser conversion then
prefilters it into the checked runtime .env; gameplay never converts the HDR.
"""
from pathlib import Path
import math

root = Path(__file__).resolve().parents[2]
width, height = 512, 256
out = root / 'assets/sculpted/warm-neutral-sky.hdr'

def rgbe(rgb):
    peak = max(rgb)
    if peak < 1e-32:
        return (0, 0, 0, 0)
    mantissa, exponent = math.frexp(peak)
    scale = mantissa * 256 / peak
    return (*[min(255, int(c * scale)) for c in rgb], exponent + 128)

with out.open('wb') as stream:
    stream.write(f'#?RADIANCE\n# Original Coop Chaos analytic ambient sky; no sun disk\nFORMAT=32-bit_rle_rgbe\n\n-Y {height} +X {width}\n'.encode())
    for y in range(height):
        altitude = math.cos(math.pi * (y + .5) / height)
        if altitude >= 0:
            t = altitude ** .55
            rgb = tuple(a * (1-t) + b*t for a,b in zip((.56,.51,.40),(.36,.46,.56)))
        else:
            t = (-altitude) ** .4
            rgb = tuple(a * (1-t) + b*t for a,b in zip((.30,.28,.21),(.10,.12,.08)))
        pixels = [rgbe(rgb)] * width
        stream.write(bytes((2,2,width >> 8,width & 255)))
        for channel in range(4):
            for start in range(0,width,128):
                values = [p[channel] for p in pixels[start:start+128]]
                stream.write(bytes((len(values),*values)))
print(out)
