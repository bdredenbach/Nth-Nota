"""Outlined shared-N monogram. Rebuild with fonttools, Node sharp and Nimbus Roman Italic."""
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
import subprocess
def png(svg,path,size):
 subprocess.run(['node','-e',"const sharp=require('sharp');let a=[];process.stdin.on('data',x=>a.push(x));process.stdin.on('end',()=>sharp(Buffer.concat(a)).resize(Number(process.argv[2])).png().toFile(process.argv[1]).catch(e=>{console.error(e);process.exit(1)}));",path,str(size)],input=svg.encode(),check=True)
font=TTFont('/usr/share/fonts/opentype/urw-base35/NimbusRoman-Italic.otf')
glyphs=font.getGlyphSet();cmap=font.getBestCmap();units=font['head'].unitsPerEm
parts=[]
def text(value,x,y,size,color):
 for letter in value:
  glyph=glyphs[cmap[ord(letter)]];pen=SVGPathPen(glyphs);scale=size/units
  glyph.draw(TransformPen(pen,(scale,0,0,-scale,x,y)))
  parts.append((pen.getCommands(),color));x+=glyph.width*scale
text('N',130,800,840,'#f8f5e8')
text('th',650,414,235,'#d7e7a8')
text('ota',610,750,235,'#f8f5e8')
# Keep the complete shared-letter mark inside an adaptive icon's safe area.
body='<g transform="translate(112.64 112.64) scale(.78)">'+''.join(f'<path d="{d}" fill="{color}"/>' for d,color in parts)+'</g>'
svg='<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024"><rect width="1024" height="1024" rx="220" fill="#30483a"/>'+body+'</svg>'
Path('artwork/shared-n.svg').write_text(svg)
for size in (192,512):png(svg,f'dist/icon-{size}.png',size)
png(svg,'artwork/Nth-Nota-icon.png',1024)
for density,size in [('mdpi',48),('hdpi',72),('xhdpi',96),('xxhdpi',144),('xxxhdpi',192)]:
 folder=Path('android/app/src/main/res')/('mipmap-'+density);folder.mkdir(exist_ok=True)
 png(svg,str(folder/'ic_launcher.png'),size)
paths=''.join(f'<path android:pathData="{d}" android:fillColor="{color}"/>' for d,color in parts)
vector='<vector xmlns:android="http://schemas.android.com/apk/res/android" android:width="108dp" android:height="108dp" android:viewportWidth="1024" android:viewportHeight="1024"><group android:translateX="112.64" android:translateY="112.64" android:scaleX=".78" android:scaleY=".78">'+paths+'</group></vector>'
Path('android/app/src/main/res/drawable/ic_launcher_foreground.xml').write_text(vector)
mono=vector.replace('#d7e7a8','#ffffff').replace('#f8f5e8','#ffffff')
Path('android/app/src/main/res/drawable/ic_launcher_monochrome.xml').write_text(mono)
for folder,extra in [('mipmap-anydpi-v26',''),('mipmap-anydpi-v33','<monochrome android:drawable="@drawable/ic_launcher_monochrome"/>')]:
 Path('android/app/src/main/res/'+folder+'/ic_launcher.xml').write_text('<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android"><background android:drawable="@color/icon_background"/><foreground android:drawable="@drawable/ic_launcher_foreground"/>'+extra+'</adaptive-icon>')
Path('android/app/src/main/res/values/icon_colors.xml').write_text('<resources><color name="icon_background">#30483a</color></resources>')
print('Created shared-N vector, web icons, and Android adaptive/themed icons.')
