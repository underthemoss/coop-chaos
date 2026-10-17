"""Render actual stored animation studies from an editable chicken .blend."""
import bpy,os,sys
base=os.path.dirname(os.path.abspath(__file__))
identity=sys.argv[sys.argv.index('--')+1] if '--' in sys.argv else 'fern'
bpy.ops.wm.open_mainfile(filepath=os.path.join(base,identity+'.blend'))
scene=bpy.context.scene;scene.cycles.samples=24;scene.render.resolution_x=700;scene.render.resolution_y=700
for name,frame in [('walk',7),('gather',13),('flight',7)]:
 for ob in scene.objects:
  if ob.animation_data:
   for track in ob.animation_data.nla_tracks:track.mute=track.name!=name
 scene.frame_set(frame)
 scene.render.filepath=os.path.join(base,identity+'-'+name+'-proof-v5.png')
 bpy.ops.render.render(write_still=True)
