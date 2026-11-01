"""Extract source underlining for word-box prompts without changing live question data."""
from pathlib import Path
from docx import Document
import json,re
normalize=lambda text:re.sub(r'\s+',' ',text).strip()
result={}
for book in (2,3):
 for unit in json.loads(Path(f'explorer-data/book{book}.json').read_text()):
  eligible={q['number'] for q in unit['questions'] if q['type']=='choice' and (unit['passages'][q['passage']]['part']=='vocabulary' or re.search(r'\bbox\b',unit['passages'][q['passage']]['instructions'],re.I)) and unit['passages'][q['passage']]['bank'] and sorted(o['text'] for o in q['options'])==sorted(o['text'] for o in unit['passages'][q['passage']]['bank'])}
  doc=Document(f'upload/reading-explorer/book{book}/unit-{unit["id"].lower()}.docx');targets={}
  for paragraph in doc.paragraphs:
   if paragraph.text.strip()=='Answer Section':break
   match=re.match(r'^(?:_{2,}\s*)?(\d+)\.\s*(.+)$',normalize(paragraph.text))
   if not match or int(match[1]) not in eligible:continue
   pieces=[];current=''
   for run in paragraph.runs:
    if run.underline:current+=run.text
    elif current:
     pieces.append(normalize(current));current=''
   if current:pieces.append(normalize(current))
   pieces=[p for p in pieces if p and not re.fullmatch(r'[\d_\W]+',p)]
   if pieces:targets[int(match[1])]=list(dict.fromkeys(pieces))
  if targets:result[f'reading-explorer-{book}-{unit["id"]}']=targets
Path('explorer-word-box-format.js').write_text("'use strict';\n// Source display formatting only; saved answer indices are unchanged.\nwindow.explorerWordBoxFormat="+json.dumps(result,ensure_ascii=False,separators=(',',':'))+';\n')
print('Source underlining:',sum(len(q) for q in result.values()),'prompts in',len(result),'units')
