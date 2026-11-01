"""Correct the two remaining bitmap crop defects found in the November 2026 audit.

Pass the PDF rendered from ENGL010_Supplemental Reading Tests 5_Student.docx.
The source box borders, rather than fixed page margins, determine the crops.
Existing questions, answers, IDs and saved-attempt revisions stay untouched.
"""
from pathlib import Path
import json,sys,subprocess,io
import fitz
from PIL import Image,ImageOps,ImageDraw

doc=fitz.open(sys.argv[1]);path=Path('reading-tests.json');tests=json.loads(path.read_text());output=Path('reading-images/crop-reviewed');output.mkdir(exist_ok=True)
for number,page_number in [(15,30),(17,34)]:
 test=next(t for t in tests if t['id']==number)
 if number==15:
  # Preserve the existing diagram positions; the Word converter moves these floats.
  original=Image.open(io.BytesIO(subprocess.check_output(['git','show','HEAD:reading-images/b1-15-1.webp']))).convert('RGB')
  gray=original.convert('L');w,h=gray.size
  border=next(y for y in range(40) if sum(gray.getpixel((x,y))<140 for x in range(w))>.8*w)
  image=ImageOps.expand(original.crop((0,border+3,w,h)),border=(0,7,0,0),fill='white')
  # Retain the source border, excluding heading descenders immediately below it.
  image.paste(original.crop((0,border,w,border+1)),(0,6))
  ink=[x for x in range(w) if gray.getpixel((x,border))<140];left,right=min(ink),max(ink)
  pen=ImageDraw.Draw(image);pen.line((left,6,right,6),fill=original.getpixel((left+20,border)));pen.rectangle((left+1,7,right-1,10),fill='white')
  asset=output/'b1-15-1.png';image.save(asset)
  test['sourceImages']=[str(asset)];test['sourceImageInfo']=[{'sourcePage':30,'sourceImage':'reading-images/b1-15-1.webp','pixelCrop':[0,border+3,w,h],'paddingTop':7,'topBorderSourceRow':border}]
  print(number,asset,image.size)
  continue
 page=doc[page_number-1]
 horizontal=[d['rect'] for d in page.get_drawings() if d['rect'].width>400 and d['rect'].height<1 and d['rect'].y0<650]
 assert len(horizontal)==2,(number,horizontal)
 top,bottom=sorted(horizontal,key=lambda r:r.y0)
 # The full frame includes captions and printed line numbers. Keep the page heading out.
 rect=fitz.Rect(min(top.x0,bottom.x0)-5,top.y0-0.1,max(top.x1,bottom.x1)+5,bottom.y0+5)
 content=[fitz.Rect(span['bbox']) for block in page.get_text('dict')['blocks'] for line in block.get('lines',[]) for span in line['spans'] if top.y0<=span['bbox'][1] and span['bbox'][3]<=bottom.y0+1]
 # Some captions and text runs extend slightly beyond the Word table border.
 rect.x0=min([rect.x0]+[r.x0-5 for r in content]);rect.x1=max([rect.x1]+[r.x1+5 for r in content])
 assert all(rect.contains(r) for r in content)
 pix=page.get_pixmap(matrix=fitz.Matrix(2.5,2.5),clip=rect,alpha=False)
 image=ImageOps.expand(Image.frombytes('RGB',[pix.width,pix.height],pix.samples),border=(0,6,0,0),fill='white');asset=output/f'b1-{number}-1.webp';image.save(asset,'WEBP',quality=92)
 test['sourceImages']=[str(asset)];test['sourceImageInfo']=[{'sourcePage':page_number,'crop':list(rect)}]
 print(number,asset,pix.width,pix.height)
path.write_text(json.dumps(tests,ensure_ascii=False,separators=(',',':')))
