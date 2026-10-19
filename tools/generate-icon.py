"""Cursive shared-N monogram. Rebuild with fonttools, Node sharp and URW Z003."""
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
import subprocess

def png(svg,path,size):
 subprocess.run(['node','-e',"const sharp=require('sharp');let a=[];process.stdin.on('data',x=>a.push(x));process.stdin.on('end',()=>sharp(Buffer.concat(a)).resize(Number(process.argv[2])).png().toFile(process.argv[1]).catch(e=>{console.error(e);process.exit(1)}));",path,str(size)],input=svg.encode(),check=True)

font=TTFont('/usr/share/fonts/opentype/urw-base35/Z003-MediumItalic.otf')
glyphs=font.getGlyphSet();cmap=font.getBestCmap();units=font['head'].unitsPerEm
parts=[]
def text(value,x,y,size,color):
 for letter in value:
  glyph=glyphs[cmap[ord(letter)]];pen=SVGPathPen(glyphs);scale=size/units
  glyph.draw(TransformPen(pen,(scale,0,0,-scale,x,y)))
  parts.append((pen.getCommands(),color));x+=glyph.width*scale

text('N',95,745,760,'#f8f5e8')
text('th',615,360,230,'#d7e7a8')
text('ota',620,738,240,'#f8f5e8')
body=''.join(f'<path d="{d}" fill="{color}"/>' for d,color in parts)
square='<path d="M0 0H1024V1024H0Z" fill="#30483a"/>'
def svg_wrap(content,view='0 0 1024 1024'):
 return '<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="'+view+'">'+content+'</svg>'
svg=svg_wrap(square+body)
Path('artwork/shared-n.svg').write_text(svg)
for size in (192,512):png(svg,f'dist/icon-{size}.png',size)
png(svg,'artwork/Nth-Nota-icon.png',1024)
for density,size in [('mdpi',48),('hdpi',72),('xhdpi',96),('xxhdpi',144),('xxxhdpi',192)]:
 folder=Path('android/app/src/main/res')/('mipmap-'+density);folder.mkdir(exist_ok=True)
 png(svg,str(folder/'ic_launcher.png'),size)

# Android controls the outer adaptive mask. Fit an actual square inside its
# smallest circular visible region (72/108 of the full foreground viewport).
origin=276;scale=472/1024
paths='<path android:pathData="M0 0H1024V1024H0Z" android:fillColor="#30483a"/>'+''.join(f'<path android:pathData="{d}" android:fillColor="{color}"/>' for d,color in parts)
head='<vector xmlns:android="http://schemas.android.com/apk/res/android" android:width="108dp" android:height="108dp" android:viewportWidth="1024" android:viewportHeight="1024">'
group=f'<group android:translateX="{origin}" android:translateY="{origin}" android:scaleX="{scale}" android:scaleY="{scale}">'
Path('android/app/src/main/res/drawable/ic_launcher_foreground.xml').write_text(head+group+paths+'</group></vector>')
mono_path='M0 0H1024V1024H0Z '+' '.join(d for d,color in parts)
mono=head+group+f'<path android:pathData="{mono_path}" android:fillColor="#ffffff" android:fillType="evenOdd"/></group></vector>'
Path('android/app/src/main/res/drawable/ic_launcher_monochrome.xml').write_text(mono)
for folder,extra in [('mipmap-anydpi-v26',''),('mipmap-anydpi-v33','<monochrome android:drawable="@drawable/ic_launcher_monochrome"/>')]:
 Path('android/app/src/main/res/'+folder+'/ic_launcher.xml').write_text('<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android"><background android:drawable="@color/icon_background"/><foreground android:drawable="@drawable/ic_launcher_foreground"/>'+extra+'</adaptive-icon>')
Path('android/app/src/main/res/values/icon_colors.xml').write_text('<resources><color name="icon_background">#f6f5f0</color></resources>')

# Code-native previews approximate Android's circular launcher mask.
clip='<defs><clipPath id="mask"><circle cx="512" cy="512" r="341.333333"/></clipPath></defs>'
new_inner=f'<g transform="translate({origin} {origin}) scale({scale})">'+square+body+'</g>'
new_preview=svg_wrap(clip+'<g clip-path="url(#mask)"><rect width="1024" height="1024" fill="#f6f5f0"/>'+new_inner+'</g>','170.666667 170.666667 682.666666 682.666666')
png(new_preview,'artwork/icon-options/new-launcher-preview.png',512)
old=Path('artwork/icon-options/old-italic.svg').read_text()
old_body=old.split('>',1)[1].rsplit('</svg>',1)[0]
old_preview=svg_wrap(clip+'<g clip-path="url(#mask)">'+old_body+'</g>','170.666667 170.666667 682.666666 682.666666')
# Unique mask IDs keep the two embedded SVGs independent in the comparison.
old_preview=old_preview.replace('id="mask"','id="old-mask"').replace('url(#mask)','url(#old-mask)')
compare='<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="620" viewBox="0 0 1000 620"><rect width="1000" height="620" fill="#ecebe4"/>'
for source,x,label in [(old_preview,80,'Current · italic'),(new_preview,560,'New · cursive square')]:
 source=source.replace('width="1024" height="1024" viewBox','width="360" height="360" viewBox',1)
 compare+=f'<g transform="translate({x} 100)">'+source+f'<text x="180" y="420" text-anchor="middle" font-family="sans-serif" font-size="26" fill="#30483a">{label}</text></g>'
compare+='</svg>'
Path('artwork/icon-options/comparison.svg').write_text(compare)
png(compare,'artwork/icon-options/comparison.png',1000)
print('Created cursive square mark, adaptive/themed assets, and comparison preview.')
