"""Reproducible matched-source overview from final rendered front views."""
import bpy,json
from pathlib import Path
SOURCE=Path(__file__).resolve().parent
names=('longbough','crowncourt','riverside');images=[]
for name in names:
    rev=json.loads((SOURCE/(name+'-qualification.json')).read_text())['revision']
    image=bpy.data.images.load(str(SOURCE/(name+'-'+rev+'-front.png')))
    image.scale(800,686);images.append(image)
pixels=[0.0]*(2400*686*4)
for i,image in enumerate(images):
    data=list(image.pixels)
    for row in range(686):
        start=(row*2400+i*800)*4;pixels[start:start+3200]=data[row*3200:(row+1)*3200]
out=bpy.data.images.new('Longbough Crowncourt Windward',width=2400,height=686,alpha=True)
out.pixels.foreach_set(pixels);out.filepath_raw=str(SOURCE/('three-forms-'+rev+'-contact-sheet.png'));out.file_format='PNG';out.save()
