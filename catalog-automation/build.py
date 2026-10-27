from pathlib import Path
import os,zlib
from categories import product_order
import json,sys,collections,math,io
from PIL import Image,ImageOps
from reportlab.lib.utils import ImageReader
sys.path.insert(0,str(Path(__file__).resolve().parent))
from generate_catalog import Catalog,ASSETS,PHOTOS,money,label,DARK,PALE,HOT,MID,INK,MUTED,LINE
from reportlab.pdfgen import canvas
from reportlab import rl_config
rl_config.useA85=False
from reportlab.lib.colors import HexColor
from reportlab.pdfbase import pdfmetrics
R=Path(__file__).resolve().parent
SOURCE=Path(__import__('os').environ.get('CATALOG_WORKDIR',str(R/'work'))) 
P=json.loads((SOURCE/'products.json').read_text());PH={x['id']:x['path'] for x in json.loads((SOURCE/'photo-quality.json').read_text())}
ORDER=['Combos','Rostro','Preparación y fijación','Ojos y cejas','Labios','Skincare','Brochas y esponjas','Cuidado corporal','Cabello','Uñas','Accesorios']
ORDER=[c for c in ORDER if any(p['category']==c for p in P)]+sorted({p['category'] for p in P}-set(ORDER))
_families=collections.OrderedDict()
for p in sorted(P,key=lambda x:(ORDER.index(x['category']),product_order(x))):
 _families.setdefault((p['category'],p['name'].upper(),p['brand'].upper()),[]).append(p)
source_order={p['sku']:i for i,p in enumerate(P)}
F=[];_new_families=[]
for family in _families.values():
 chunks=[family[i:i+6] for i in range(0,len(family),6)]
 for part_index,chunk in enumerate(chunks):
  for q in chunk:
   q['_family_part']=part_index+1
   q['_family_parts']=len(chunks)
   q['_family_continuation']=part_index>0
  F.append(chunk)
 if any(q['new'] for q in family):
  last_new=max(source_order[q['sku']] for q in family if q['new'])
  # Una familia aparece una sola vez en Novedades, aunque sus SKU ocupen varias fichas.
  _new_families.append((last_new,chunks[0]))
NEW=[group for _,group in sorted(_new_families,key=lambda item:item[0],reverse=True)]
class Edition(Catalog):
 def __init__(self,path):
  self.desktop=False;self.w,self.h=(560,700)
  self.c=canvas.Canvas(str(path),pagesize=(self.w,self.h),pageCompression=1)
  self.c.setTitle('ByFly Makeup | Catálogo digital');self.c.setAuthor('ByFly Makeup')
  self.c.setViewerPreference('FitWindow','true')
  self.c.setPageSize((self.w,self.h));self.c._doc.Catalog.PageLayout='SinglePage'
  self.page=0;self.products=P;self.photos=PH;self.groups=F;self.reader_cache={};self.qa=[];self.date=__import__('datetime').datetime.now(__import__('zoneinfo').ZoneInfo('America/Bogota')).strftime('%d/%m/%Y')
  self.newpages=max(1,math.ceil(len(NEW)/6));self.first=1+self.newpages+3+1
  self.starts={cat:next(i+self.first for i,f in enumerate(F) if f[0]['category']==cat) for cat in ORDER}
 def start(self,key=None,title=None):
  self.page+=1;self.c.setFillColor(HexColor('#FFFDFC'));self.c.rect(0,0,self.w,self.h,fill=1,stroke=0)
  if key:
   self.c.bookmarkPage(key)
   if title:self.c.addOutlineEntry(title,key,0,False)
 def footer(self):
  w=self.w;self.rule(33,28,w-56)
  self.text(28,17,'BYFLY MAKEUP · '+self.date,8,color=MUTED)
  self.text(w-28,17,str(self.page).zfill(2),9,'Arsenal-Bold',DARK,'right')
  self.text(w-160,17,'Índice',9,color=DARK);self.c.linkRect('','index',(w-166,8,w-119,29),thickness=0)
  self.text(w-108,17,'Novedades',9,color=DARK);self.c.linkRect('','news',(w-112,8,w-48,29),thickness=0)
  self.c.showPage()
 def img(self,path,x,y,w,h,cover=False,r=0):
  if not path:return
  if path not in self.reader_cache:
   source=Image.open(path)
   # PDF transport encoding only: preserve native dimensions and content.
   if source.mode not in ('RGB','L'):source=source.convert('RGB')
   buf=io.BytesIO();source.thumbnail((1400,1400),Image.Resampling.LANCZOS);source.save(buf,format='JPEG',quality=90,optimize=True,subsampling=2);buf.seek(0)
   reader=ImageReader(buf);self.reader_cache[path]=(reader,source.size)
  reader,(iw,ih)=self.reader_cache[path];scale=min(w/iw,h/ih);dw,dh=iw*scale,ih*scale
  self.c.drawImage(reader,x+(w-dw)/2,y+(h-dh)/2,dw,dh,mask='auto')
 def brand(self,x,y,w=116):
  # Native PDF colorization: keep the official PNG alpha mask unchanged.
  path=str(ASSETS/'logo-pdf.png');self.c.drawImage(path,x,y,w,w*1776/4858,mask='auto')
  if not getattr(self,'logo_colored',False):
   from reportlab.pdfbase.pdfdoc import PDFImageXObject
   size=Image.open(path).size;rgb=bytes.fromhex(DARK.lstrip('#'))
   for obj in self.c._doc.idToObject.values():
    if isinstance(obj,PDFImageXObject) and obj.colorSpace=='DeviceRGB' and (obj.width,obj.height)==size and getattr(obj,'smask',None):
     obj.streamContent=zlib.compress(rgb*(obj.width*obj.height));obj._filters=('FlateDecode',)
   self.logo_colored=True
 def emoji(self,name,x,y,size=23):
  self.c.drawImage(str(ASSETS/('emoji-'+name+'.png')),x,y,size,size,mask='auto')
 def head(self,title,subtitle=''):
  self.brand(28,self.h-63,120);self.text(self.w-28,self.h-38,title.upper(),10,'Arsenal-Bold',DARK,'right')
  if subtitle:self.text(28,self.h-85,subtitle,11,color=MUTED)
 def small(self,x,y,w,text,dest=None,url=None):
  self.box(x,y,w,28,DARK,r=7);self.text(x+w/2,y+9,text,10,'Arsenal-Bold','#FFFFFF','center')
  if dest:self.c.linkRect('',dest,(x,y,x+w,y+28),thickness=0)
  if url:self.c.linkURL(url,(x,y,x+w,y+28),thickness=0)
 def cover(self):
  self.start('cover','Portada');w,h=self.w,self.h
  self.box(0,0,w,h,PALE,r=0);self.brand(w/2-110,h-115,220)
  self.text(w/2,h-145,'CATÁLOGO · DETAL + MAYORISTA',11,'Arsenal-Bold',DARK,'center')
  if os.environ.get('CATALOG_PREVIEW'):self.text(w/2,h-166,'VISTA PREVIA DE DISEÑO · selección de productos',9,color=MUTED,align='center')
  self.text(w/2,h-221,'Ser tú.',58,'Karma-Medium',DARK,'center')
  self.text(w/2,h-253,'Aprender y mejorar para transformarte a ti misma.',16,'Karma-Regular',DARK,'center')
  picks=[]
  for needle in ['BASE ANI-K','GLOSS MIMOSA XL','RUBOR AURA']:
   f=next((f for f in F if needle==f[0]['name'] and f[0]['family_images']),None)
   if f:picks.append(PH[f[0]['family_images'][0]])
  for i,path in enumerate(picks):self.img(path,28+i*173,163,159,238,r=12)
  self.text(w/2,129,'Belleza para cada versión de ti.',17,'Karma-Regular',DARK,'center')
  self.small(95,68,180,'Explorar la colección','index');self.small(289,68,175,'Ver novedades','news')
  self.footer()
 def news(self):
  for block in range(self.newpages):
   self.start('news' if block==0 else f'news{block}', 'Novedades' if block==0 else None);self.head('Novedades',f'Selección marcada como nueva en la hoja · {block+1}/{self.newpages}')
   self.text(28,self.h-126,'Lo nuevo, para ti.',30,'Karma-Medium',DARK)
   count=len(NEW[block*6:(block+1)*6]);
   if not count:
    self.para(28,480,'Pronto encontrarás novedades aquí. Explora la colección desde el índice.',self.w-56,20);self.footer();continue
   cols=min(count,3 if self.desktop else 2);rows=math.ceil(count/cols);gap=15;cw=(self.w-56-gap*(cols-1))/cols
   top=self.h-152;ch=(top-88-gap*(rows-1))/rows
   for i,f in enumerate(NEW[block*6:(block+1)*6]):
    col=i%cols;row=i//cols;x=28+col*(cw+gap);y=top-(row+1)*ch-row*gap;p=f[0]
    self.box(x,y,cw,ch,'#FEEBEE',r=10)
    paths=self.group_photos(f)
    photo_h=ch-62
    if paths:self.img(paths[0],x+6,y+58,cw-12,photo_h-6,r=7)
    self.text(x+9,y+43,p['brand'],9,'Arsenal-Bold',DARK)
    self.para(x+9,y+33,label(p['name']),cw-18,10,'Arsenal-Regular',INK,12)
    self.c.linkRect('','product-'+p['sku'],(x,y,x+cw,y+ch),thickness=0)
   self.text(28,53,'Toca una imagen para ir a su ficha. Cada SKU aparece una sola vez en las fichas.',10,color=MUTED)
   if block+1<self.newpages:self.small(self.w-122,75,94,'Más novedades',f'news{block+1}')
   self.footer()
 def info(self):
  self.start('how','Cómo comprar');self.head('Cómo comprar')
  self.text(28,self.h-125,'Elige. Anota. Escríbenos.',30,'Karma-Medium',DARK)
  cards=[('01 · Explora','Encuentra tus favoritos en el índice o las novedades. Los precios detal y mayorista están visibles para todos.'),('02 · Selecciona','Elige el producto, el tono y la cantidad. Los productos sin existencias aparecen como AGOTADO.'),('03 · Escríbenos','Envíanos tu lista por WhatsApp. Te ayudamos a confirmar disponibilidad y completar tu compra.')]
  top=520
  for title,body in cards:
   self.box(28,top-112,self.w-56,112,'#FFF3F6',stroke=LINE,r=10)
   self.text(44,top-28,title,19,'Karma-Medium',DARK)
   self.para(44,top-44,body,self.w-88,14,leading=19)
   top-=128
  self.small(28,77,124,'Dónde comprar','contact');self.footer()
 def policies(self):
  self.start('policies','Antes de comprar');self.head('Antes de comprar')
  self.text(28,575,'Condiciones de compra',30,'Karma-Medium',DARK)
  self.para(28,544,'Antes de pagar, confirma las condiciones de envío, medios de pago y reclamaciones con ByFly.',self.w-56,14,leading=19)
  items=[('truck','Envíos','Confirma cobertura, costo y plazo de entrega para tu destino.',80),('money','Pagos','Consulta los medios de pago habilitados y solicita la confirmación de tu pedido.',80),('returns','Cambios y reclamaciones','Consulta el procedimiento y las condiciones aplicables a tu compra.',80),('shopping','Compra mayorista','Compra mayorista a partir de $130.000. Tienes un mes para hacer compras desde una sola unidad.',100)]
  top=480
  for icon,title,body,height in items:
   bottom=top-height;self.box(28,bottom,self.w-56,height,'#FFF3F6',stroke=LINE,r=10)
   self.emoji(icon,42,top-35,23);self.text(77,top-28,title,17,'Arsenal-Bold',DARK)
   self.para(77,top-41,body,self.w-123,14,leading=19);top=bottom-12
  self.small(28,70,120,'Escríbenos','contact');self.footer()
 def index(self):
  self.start('index','Índice');self.head('La colección',f'{len(P)} referencias únicas · Precios en pesos colombianos')
  self.text(28,self.h-126,'Encuentra tus favoritos.',29,'Karma-Medium',DARK)
  cols=2 if self.desktop else 1;rh=71 if self.desktop else min(43,430/max(1,len(ORDER)));cw=(self.w-56-20*(cols-1))/cols
  for i,cat in enumerate(ORDER):
   col=i//6 if self.desktop else 0;row=i%6 if self.desktop else i;x=28+col*(cw+20);y=self.h-170-row*rh
   self.text(x,y,cat,18 if self.desktop else 16,'Karma-Medium',DARK)
   self.text(x+cw-6,y,str(self.starts[cat]),13,'Arsenal-Bold',DARK,'right');self.rule(y-12,x,cw)
   self.c.linkRect('','category-'+cat,(x,y-12,x+cw,y+23),thickness=0)
  self.footer()
 def product_continuation(self,f):
  """Render variant overflow without duplicating the family's product photo."""
  p=f[0];w,h=self.w,self.h;self.start('product-'+p['sku'])
  self.head(p['category'])
  x=28;tw=w-56
  self.text(x,h-106,p['brand'] or 'BYFLY MAKEUP',10,'Arsenal-Bold',DARK)
  tb=self.para(x,h-119,label(p['name']),tw,24,'Karma-Medium',INK,27)
  note_y=tb-13
  part=p.get('_family_part',2);parts=p.get('_family_parts',2)
  self.text(x,note_y,f'Continuación de referencias {part} de {parts} · La imagen aparece en la primera ficha.',10,color=MUTED)
  y=note_y-27
  same=len(set((q['retail'],q['wholesale']) for q in f))==1
  if same:
   self.text(x,y,'PRECIO DETAL',9,'Arsenal-Bold',MUTED)
   self.text(x+tw/2,y,'PRECIO MAYORISTA',9,'Arsenal-Bold',MUTED)
   self.text(x,y-24,money(p['retail']) if p['retail']>0 else 'Consultar',21,'Arsenal-Bold',DARK)
   self.text(x+tw/2,y-24,money(p['wholesale']) if p['wholesale']>0 else 'Consultar',21,'Arsenal-Bold',DARK)
   y-=53
  else:
   self.text(x,y,'PRECIOS POR VARIANTE · COP',9,'Arsenal-Bold',DARK)
   y-=20
  self.text(x,y,'REFERENCIA',9,'Arsenal-Bold',MUTED)
  self.text(x+105,y,'TONO / VARIANTE',9,'Arsenal-Bold',MUTED)
  self.text(w-28,y,'ESTADO',9,'Arsenal-Bold',MUTED,'right')
  y-=18
  for q in f:
   row_h=39 if same else 43
   bottom=y-row_h+4
   self.box(x,bottom,tw,row_h,'#FFF8FA',stroke=LINE,r=7)
   self.text(x+10,bottom+row_h-15,q['sku'],10,'Arsenal-Bold',DARK)
   tone=q['tone'] or ('Sin tono indicado' if len(f)>1 else 'Única')
   tone=tone[:-2] if tone.endswith('.0') else tone
   maxwidth=tw-235
   fs=min(12,maxwidth/max(pdfmetrics.stringWidth(tone,'Arsenal-Regular',1),1))
   self.text(x+105,bottom+row_h-15,tone,fs,'Arsenal-Regular',INK)
   self.text(w-38,bottom+row_h-15,'Disponible' if q['available'] else 'AGOTADO',10,'Arsenal-Bold',DARK if q['available'] else MUTED,'right')
   if not same:
    price_line='Detal '+(money(q['retail']) if q['retail']>0 else 'Consultar')+' · Mayorista '+(money(q['wholesale']) if q['wholesale']>0 else 'Consultar')
    self.text(x+10,bottom+8,price_line,9,'Arsenal-Regular',DARK)
   y=bottom-5
  if y<128:raise ValueError(f'Continuación de referencias invade CTA en página {self.page}: {y}')
  available=any(q['available'] for q in f)
  self.button(34,88,472,42,'Consultar por WhatsApp' if available else 'Preguntar por disponibilidad',url=self.whatsapp(p,p['tone'] if len(f)==1 else None),dark=available)
  self.text(270,69,'Precio y disponibilidad sujetos a confirmación al hacer el pedido.',10,color=MUTED,align='center')
  self.qa.append({'page':self.page,'skus':[q['sku'] for q in f],'category':p['category'],'image':False,'images_drawn':0,'continuation':True,'family_part':part,'family_parts':parts,'lowest_y':y,'image_height':0})
  self.footer()
 def product(self,f):
  p=f[0]
  if p.get('_family_continuation',False):return self.product_continuation(f)
  w,h=self.w,self.h;self.start('product-'+p['sku'])
  if self.page==self.starts[p['category']]:self.c.bookmarkPage('category-'+p['category']);self.c.addOutlineEntry(p['category'],'category-'+p['category'],0,False)
  self.head(p['category'])
  if self.desktop:x,top,tw=572,h-106,360
  else:x,top,tw=28,h-85,w-56
  self.text(x,top,p['brand'] or 'BYFLY MAKEUP',10,'Arsenal-Bold',DARK)
  tags=[]
  if any(q['new'] for q in f):tags.append('NOVEDAD')
  if p['imported']:tags.append('IMPORTADO')
  if tags:self.text(w-28,h-76,' · '.join(tags),9,'Arsenal-Bold',DARK,'right')
  size=23 if self.desktop else 24
  tb=self.para(x,top-13,label(p['name']),tw,size,'Karma-Medium',INK,size*1.12)
  same=len(set((q['retail'],q['wholesale']) for q in f))==1
  rowh=(18 if len(f)>8 else 21) if same else 40
  table_h=24+len(f)*rowh
  price_h=62 if same else 15
  if self.desktop:gx,gy,gw,gh=28,83,516,h-164;info_top=tb-24
  else:
   gallery_top=tb-12;gy=73+table_h+price_h+21;gx,gw,gh=28,w-56,gallery_top-gy;info_top=gy-17
  if gh<150:raise ValueError(('Photo space',p['sku'],gh))
  self.box(gx,gy,gw,gh,'#FEEBEE',r=12)
  paths=self.group_photos(f)
  if not paths:
   self.img(str(ASSETS/'isotipo.png'),gx+gw/2-35,gy+gh/2,70,70)
   self.text(gx+gw/2,gy+gh/2-27,'Fotografía pendiente',13,color=MUTED,align='center')
  else:
   # Keep product fully visible: contain, never crop or fabricate packaging.
   self.img(paths[0],gx+7,gy+7,gw-14,gh-14,r=8)
  if not any(q['available'] for q in f):
   self.box(gx+12,gy+gh-32,83,21,DARK,r=6);self.text(gx+53,gy+gh-25,'AGOTADO',10,'Arsenal-Bold','#FFFFFF','center')
  y=info_top
  if same:
   half=tw/2
   for offset,t,price in [(0,'DETAL',p['retail']),(half,'MAYORISTA',p['wholesale'])]:
    self.text(x+offset,y,t,9,'Arsenal-Bold',MUTED);self.text(x+offset,y-26,money(price) if price>0 else 'Consultar',24,'Arsenal-Bold',DARK)
   y-=55
  else:self.text(x,y,'PRECIOS POR VARIANTE · COP',9,'Arsenal-Bold',DARK);y-=18
  columns=[(0,'REFERENCIA'),(tw*.28,'TONO / VARIANTE'),(tw,'ESTADO')]
  for xx,title in columns:self.text(x+xx,y,title,10,'Arsenal-Bold',MUTED,'right' if xx==tw else 'left')
  y-=20
  for q in f:
   self.text(x,y,q['sku'],12.5 if len(f)>8 else 14,color=INK)
   tone=q['tone'] or ('Sin tono indicado' if len(f)>1 else 'Única');tone=tone[:-2] if tone.endswith('.0') else tone
   tx=x+tw*.28;maxwidth=tw*.43
   fs=min(13 if len(f)>8 else 15,maxwidth/max(pdfmetrics.stringWidth(tone,'Arsenal-Regular',1),1))
   self.text(tx,y,tone,fs,color=INK)
   self.text(x+tw,y,'Disponible' if q['available'] else 'AGOTADO',11 if len(f)>8 else 12,'Arsenal-Bold',DARK if q['available'] else MUTED,'right')
   if not same:
    self.text(x,y-18,'Detal '+(money(q['retail']) if q['retail'] else 'Consultar'),14,'Arsenal-Bold',DARK)
    self.text(x+tw*.5,y-18,'Mayor '+(money(q['wholesale']) if q['wholesale'] else 'Consultar'),14,'Arsenal-Bold',DARK)
   y-=rowh
  if self.desktop and len(paths)>1 and y>220:
   for i,path in enumerate(paths[1:3]):self.img(path,x+i*(tw/2+5),88,tw/2-8,min(170,y-112),r=8)
  if y<54:raise ValueError(('Table overflow',p['sku'],y))
  if len(f)>1:self.text(gx,gy-12 if self.desktop else 49,'Imagen de referencia de la familia; verifica el tono por SKU.',9,color=MUTED)
  elif self.desktop:self.text(gx,gy-12,'Imagen de referencia del producto.',9,color=MUTED)
  if self.desktop:self.text(x,55,'Precios y disponibilidad sujetos a confirmación.',9,color=MUTED)
  self.qa.append({'page':self.page,'skus':[q['sku'] for q in f],'category':p['category'],'image':bool(paths),'images_drawn':1 if paths else 0,'continuation':False,'family_part':p.get('_family_part',1),'family_parts':p.get('_family_parts',1),'lowest_y':y,'image_height':gh})
  self.footer()
 def closing(self):
  self.start('contact','Contacto');w,h=self.w,self.h;self.brand(w/2-110,h-145,220)
  self.text(w/2,487,'Tus favoritos, en un pedido.',29,'Karma-Medium',DARK,'center')
  self.para(54,452,'Envía tu lista con productos, tonos y cantidades. Te ayudamos a confirmar disponibilidad y a completar tu compra fácilmente.',w-108,17,leading=23)
  self.box(120,215,320,115,'#FFF3F6',stroke=LINE,r=12)
  self.text(140,304,'Escríbenos',18,'Karma-Medium',DARK)
  self.text(140,280,'WhatsApp · 314 739 7938',14,color=INK)
  self.small(140,232,152,'Abrir WhatsApp',url=self.whatsapp())
  self.box(120,78,320,115,'#FFF3F6',stroke=LINE,r=12)
  self.text(140,167,'Dónde comprar',18,'Karma-Medium',DARK)
  self.text(140,143,'byfly.com.co',16,'Arsenal-Bold',DARK)
  self.small(140,95,152,'Visitar página web',url='https://byfly.com.co/')
  self.footer()
 def build(self):
  self.cover();self.news();self.info();self.policies();self.index()
  for f in F:self.product(f)
  self.closing();self.c.save()

if __name__=='__main__':
 c=Edition(SOURCE/'ByFly_Catalogo.pdf');c.build()
 (SOURCE/'layout.json').write_text(json.dumps(c.qa,ensure_ascii=False))
 print(json.dumps({'pages':c.page,'references':len(P),'bytes':(SOURCE/'ByFly_Catalogo.pdf').stat().st_size}))
