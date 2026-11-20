#!/usr/bin/env python3
"""Regenera el PDF de ByFly desde Google Sheets. No ejecuta pedidos ni publica archivos."""
from pathlib import Path
from datetime import datetime
from zoneinfo import ZoneInfo
from collections import OrderedDict
from concurrent.futures import ThreadPoolExecutor
import argparse, csv, io, json, re, urllib.request, urllib.parse, zipfile, xml.etree.ElementTree as ET
from xml.sax.saxutils import escape
from PIL import Image, ImageOps
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.colors import HexColor, Color, white
from reportlab.lib.utils import ImageReader
from reportlab.platypus import Paragraph
from reportlab.lib.styles import ParagraphStyle

ROOT=Path(__file__).resolve().parent
ASSETS=ROOT/'assets'; PHOTOS=ROOT/'photos'; PHOTOS.mkdir(exist_ok=True)
SHEET='https://docs.google.com/spreadsheets/d/1S3lae3puAivBCbdBK9KCIcd54FHQkranri3mgAapCpE/export?format=xlsx'
W,H=540,780
DARK='#B74062'; HOT='#EE486E'; MID='#F699AE'; PALE='#FEEBEE'; INK='#32272C'; MUTED='#76666E'; LINE='#EDCED7'
PHONE='573147397938'
for face in ['Arsenal-Regular','Arsenal-Bold','Karma-Regular','Karma-Medium','Karma-SemiBold']:
    pdfmetrics.registerFont(TTFont(face,str(ASSETS/(face+'.ttf'))))

def number(v):
    return float(str(v).strip() or 0)

def money(n):
    return '$'+f'{n:,.0f}'.replace(',','.')

def label(s):
    return str(s).strip().capitalize()

def load_data(offline=False):
    if offline:
        rows=json.loads((ROOT/'data.json').read_text(encoding='utf8'))
    else:
        raw=urllib.request.urlopen(SHEET,timeout=45).read()
        z=zipfile.ZipFile(io.BytesIO(raw));ns={'s':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
        strings=[''.join(t.text or '' for t in item.iter('{'+ns['s']+'}t')) for item in ET.fromstring(z.read('xl/sharedStrings.xml'))]
        workbook=ET.fromstring(z.read('xl/workbook.xml'))
        sheet=next(s for s in workbook.findall('s:sheets/s:sheet',ns) if s.attrib['name']=='Catálogo')
        rid=sheet.attrib['{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id']
        rels=ET.fromstring(z.read('xl/_rels/workbook.xml.rels'));target=next(r.attrib['Target'] for r in rels if r.attrib['Id']==rid)
        target=target.lstrip('/') if target.startswith('/') else 'xl/'+target
        matrix=[]
        for row in ET.fromstring(z.read(target)).findall('s:sheetData/s:row',ns):
            values={}
            for cell in row.findall('s:c',ns):
                col=re.sub(r'\d','',cell.attrib['r']);value=cell.find('s:v',ns);value=value.text if value is not None else ''
                if cell.attrib.get('t')=='s':value=strings[int(value)] if value else ''
                elif cell.attrib.get('t')=='inlineStr':value=''.join(t.text or '' for t in cell.findall('.//s:t',ns))
                values[col]=value
            matrix.append(values)
        headers=matrix[0];rows=[{headers.get(k,k):v for k,v in row.items()} for row in matrix[1:]]
    products=[];seen=set();issues={'stock_conflicts':[],'omitted_numeric_descriptions':[],'missing_images':[]}
    for r in rows:
        sku=r.get('SKU','').strip()
        if not sku or not r.get('nombre','').strip():continue
        if sku in seen:raise ValueError('SKU duplicado: '+sku)
        seen.add(sku)
        p={'sku':sku,'name':r['nombre'].strip(),'brand':r.get('marca','').strip(),'category':r.get('categoria','').strip() or 'Productos','retail':number(r.get('precio_detal','')),'wholesale':number(r.get('precio_mayor','')),'tone':r.get('tono','').strip(),'stock':number(r.get('stock',''))}
        p['available']=r.get('disponible','').strip().lower() in ['si','sí','yes','1','true'] and p['stock']>0
        if not p['available'] and p['stock']<=0 and r.get('disponible','').lower()=='si':issues['stock_conflicts'].append(sku)
        desc=r.get('Descripcion','').strip()
        if desc and re.fullmatch(r'[\s$\d.,-]+',desc):issues['omitted_numeric_descriptions'].append(sku);desc=''
        p['description']=desc
        p['badges']=[x.strip().lower() for x in re.split(r'[,;|]',r.get('badge','')) if x.strip()]
        if r.get('Nuevo','').strip().lower() in ['si','sí','1','true','nuevo']:p['badges'].append('nuevo')
        if p['category'].lower()=='combos':p['badges'].append('combo')
        p['image_ids']=[]
        for col in ['imagen_url','imagen_url2','imagen_url3','Img4','Img5','Img6']:
            url=r.get(col,'');m=re.search(r'/d/([^/]+)',url)
            image_id=m.group(1) if m else urllib.parse.parse_qs(urllib.parse.urlparse(url).query).get('id',[None])[0]
            if image_id and re.fullmatch(r'[A-Za-z0-9_-]+',image_id) and image_id not in p['image_ids']:p['image_ids'].append(image_id)
        if not p['image_ids']:issues['missing_images'].append(sku)
        products.append(p)
    if not products:raise ValueError('La hoja no contiene productos válidos. Se conserva el PDF anterior.')
    return products,issues

def get_photo(fid,refresh=True):
    dest=PHOTOS/(fid+'.jpg')
    if dest.exists() and not refresh:return fid,str(dest)
    try:
        req=urllib.request.Request('https://drive.google.com/thumbnail?id='+fid+'&sz=w850',headers={'User-Agent':'Mozilla/5.0'})
        with urllib.request.urlopen(req,timeout=12) as r:data=r.read()
        im=ImageOps.exif_transpose(Image.open(io.BytesIO(data))).convert('RGB');im.thumbnail((850,850));im.save(dest,quality=78,optimize=True)
        return fid,str(dest)
    except Exception:
        return fid,str(dest) if dest.exists() else None

class Catalog:
    def __init__(self,path,products,photo_map):
        self.c=canvas.Canvas(str(path),pagesize=(W,H),pageCompression=1)
        self.c.setTitle('ByFly Makeup | Catálogo completo | Detal y mayorista')
        self.c.setAuthor('ByFly Makeup');self.c.setSubject('Catálogo completo para presentación al cliente.');self.products=products;self.photos=photo_map;self.page=0
        self.date=datetime.now(ZoneInfo('America/Bogota')).strftime('%d/%m/%Y · %H:%M')
        self.groups=OrderedDict()
        order={'Combos':0,'Piel':1,'Ojos':2,'Labios':3,'Skincare':4,'Brochas':5,'Accesorios':6,'Cuidado corporal':7,'Corporal':8,'Cabello':9,'Importados':10,'Uñas':11}
        for p in sorted(products,key=lambda p:order.get(p['category'],9)):
            key=(p['category'],p['name'],p['brand'],p['retail'],p['wholesale'])
            self.groups.setdefault(key,[]).append(p)
        families=list(self.groups.values());self.family_count=len(families);self.groups=[]
        for family in families:
            images=list(dict.fromkeys(i for p in family for i in p['image_ids']))
            for p in family:p['family_images']=images
            self.groups.extend(family[i:i+6] for i in range(0,len(family),6))
        self.categories=list(dict.fromkeys(g[0]['category'] for g in self.groups));self.index_pages=(len(self.categories)+5)//6
        self.starts={cat:next(i+4+self.index_pages for i,g in enumerate(self.groups) if g[0]['category']==cat) for cat in self.categories}
        self.reader_cache={};self.qa=[]

    def text(self,x,y,t,size=13,font='Arsenal-Regular',color=INK,align='left'):
        self.c.setFillColor(HexColor(color));self.c.setFont(font,size)
        getattr(self.c,{'left':'drawString','center':'drawCentredString','right':'drawRightString'}[align])(x,y,str(t))

    def para(self,x,top,t,width,size=14,font='Arsenal-Regular',color=INK,leading=None):
        p=Paragraph(escape(str(t)).replace('\n','<br/>'),ParagraphStyle('p',fontName=font,fontSize=size,leading=leading or size*1.3,textColor=HexColor(color)))
        _,height=p.wrap(width,H);p.drawOn(self.c,x,top-height);return top-height

    def box(self,x,y,w,h,fill=white,stroke=None,r=16):
        self.c.setFillColor(HexColor(fill) if isinstance(fill,str) else fill)
        if stroke:self.c.setStrokeColor(HexColor(stroke));self.c.setLineWidth(.7)
        self.c.roundRect(x,y,w,h,r,fill=1,stroke=bool(stroke))

    def img(self,path,x,y,w,h,cover=False,r=0):
        if not path:return
        if path not in self.reader_cache:
            reader=ImageReader(str(path));self.reader_cache[path]=(reader,reader.getSize())
        reader,(iw,ih)=self.reader_cache[path];scale=max(w/iw,h/ih) if cover else min(w/iw,h/ih);dw,dh=iw*scale,ih*scale
        self.c.saveState()
        if r:
            p=self.c.beginPath();p.roundRect(x,y,w,h,r);self.c.clipPath(p,stroke=0)
        self.c.drawImage(reader,x+(w-dw)/2,y+(h-dh)/2,dw,dh,mask='auto');self.c.restoreState()

    def brand(self,x,y,w=116):
        self.img(str(ASSETS/'logo-horizontal.png'),x,y,w,w*.366)

    def rule(self,y,x=32,w=476):
        self.c.setStrokeColor(HexColor(LINE));self.c.setLineWidth(.65);self.c.line(x,y,x+w,y)

    def start(self,bookmark=None,title=None):
        self.page+=1;self.c.setFillColor(HexColor(PALE));self.c.rect(0,0,W,H,fill=1,stroke=0)
        if bookmark:
            self.c.bookmarkPage(bookmark)
            if title:self.c.addOutlineEntry(title,bookmark,level=0,closed=False)

    def footer(self):
        self.rule(49)
        self.text(33,31,'CATÁLOGO BYFLY · '+self.date,8.5,color=MUTED)
        self.text(W-34,31,f'{self.page:02}',10,font='Arsenal-Bold',color=DARK,align='right')
        self.text(363,31,'Volver al índice',10,color=DARK)
        self.c.linkRect('', 'index',(360,22,450,45),relative=0,thickness=0)
        self.c.showPage()

    def button(self,x,y,w,h,text,url=None,dest=None,dark=True):
        self.box(x,y,w,h,DARK if dark else '#FFFFFF',DARK,10)
        self.text(x+w/2,y+(h-14)/2+3,text,14,'Arsenal-Bold','#FFFFFF' if dark else DARK,'center')
        if url:self.c.linkURL(url,(x,y,x+w,y+h),relative=0,thickness=0)
        if dest:self.c.linkRect('',dest,(x,y,x+w,y+h),relative=0,thickness=0)

    def whatsapp(self,p=None,tone=None):
        msg='Hola, estoy viendo el catálogo de ByFly Makeup y quiero pedir esto...'
        if p:
            msg+='\nProducto: '+p['name']
            if tone:msg+='\nTono: '+tone
            if tone or not p['tone']:msg+='\nReferencia: '+p['sku']
            msg+='\nCantidad: \nQuisiera confirmar disponibilidad, precio aplicable y envío.'
        return 'https://wa.me/'+PHONE+'?text='+urllib.parse.quote(msg)

    def group_photos(self,g):
        return list(dict.fromkeys(self.photos[i] for p in g for i in p.get('family_images',p['image_ids']) if self.photos.get(i)))

    def cover(self):
        self.start('cover','Portada')
        self.brand(36,685,175)
        self.text(504,724,'CATÁLOGO',12,'Arsenal-Bold',DARK,'right')
        self.text(504,705,'DETAL + MAYORISTA',10,color=DARK,align='right')
        self.text(36,609,'Ser tú.',68,'Karma-Medium',DARK)
        self.para(39,570,'Aprender y mejorar para\ntransformarte a ti misma.',430,24,'Karma-Regular',DARK,31)
        self.rule(473,39,462)
        picks=[]
        for name in ['BASE ANI-K','LABIAL','COMBO SPLASH']:
            p=next((p for p in self.products if name in p['name'] and any(self.photos.get(i) for i in p['image_ids'])),None)
            if p:picks.append(next(self.photos[i] for i in p['image_ids'] if self.photos.get(i)))
        for i,path in enumerate(picks):
            y=208+(20 if i==1 else 0);self.img(path,36+i*160,y,148,220,cover=True,r=70)
        self.text(270,157,'Una selección de belleza que va contigo.',16,'Arsenal-Regular',DARK,'center')
        self.button(143,86,254,43,'Explorar la colección',dest='index')
        self.footer()

    def how_to(self):
        self.start('how','Cómo hacer tu pedido');self.brand(33,699,117)
        self.text(34,652,'Tu pedido,',36,'Karma-Medium',DARK);self.text(34,610,'más cerca.',36,'Karma-Medium',DARK)
        self.para(35,572,'Explora el catálogo y consulta tus referencias favoritas directamente por WhatsApp.',455,16,color=MUTED)
        items=[('01','Encuentra lo que va contigo','Usa el índice para ir a una categoría. En cada ficha verás los precios detal y mayorista, y los tonos disponibles.'),('02','Elige la referencia','Toca el botón de la ficha o la opción junto al tono. El enlace abrirá WhatsApp con el producto identificado.'),('03','Confirma tu pedido','Completa las cantidades y envía el mensaje. Consulta con ByFly la disponibilidad, el precio aplicable, el envío y el pago.')]
        y=413
        for n,t,b in items:
            self.box(32,y,476,110,'#FFFFFF',r=15);self.text(49,y+79,n,21,'Karma-Medium',DARK);self.text(91,y+84,t,17,'Arsenal-Bold',DARK);self.para(91,y+68,b,394,14,leading=18);y-=123
        self.button(34,105,472,43,'WhatsApp · 314 739 7938',url=self.whatsapp())
        self.para(35,88,'Consulta las condiciones para aplicar el precio mayorista.',470,11,color=MUTED)
        self.footer()

    def policies(self):
        self.start('policies','Información de compra');self.brand(33,699,117)
        self.text(34,651,'Antes de comprar',31,'Karma-Medium',DARK)
        self.para(34,615,'Envíos, pagos y condiciones de compra',470,16,color=MUTED)
        self.box(33,506,474,78,DARK,r=14)
        self.text(49,559,'INFORMACIÓN PENDIENTE DE APROBACIÓN',12,'Arsenal-Bold','#FFFFFF')
        self.para(49,545,'Las políticas definitivas de ByFly están pendientes de confirmación. Consulta las condiciones vigentes antes de realizar tu pedido.',441,13,color='#FFFFFF',leading=17)
        cards=[('Envíos y entregas','Cobertura, costos, transportadoras, tiempos de despacho y tiempos estimados de entrega.'),('Formas de pago','Medios habilitados y procedimiento para confirmar el pago del pedido.'),('Cambios y reclamaciones','Canal de atención, procedimiento y condiciones definitivas de la tienda.'),('Términos y compra mayorista','Condiciones de compra, tratamiento de datos y regla para aplicar precios mayoristas.')]
        for i,(t,b) in enumerate(cards):
            row,col=divmod(i,2);x=33+col*244;y=329-row*159
            self.box(x,y,231,144,'#FFFFFF',LINE,13);self.text(x+16,y+117,t,16,'Arsenal-Bold',DARK)
            self.para(x+16,y+99,b,198,13,leading=17);self.text(x+16,y+16,'POR CONFIRMAR',9,'Arsenal-Bold',MUTED)
        self.button(34,90,472,43,'Consultar condiciones por WhatsApp',url=self.whatsapp(),dark=False)
        self.footer()

    def index(self):
        for block in range(self.index_pages):
            self.start('index' if block==0 else 'index-'+str(block+1),'Índice de categorías' if block==0 else None);self.brand(33,699,117)
            self.text(507,717,f'ÍNDICE {block+1} / {self.index_pages}',11,'Arsenal-Bold',DARK,'right')
            self.text(34,651,'Encuentra tu próximo',30,'Karma-Medium',DARK);self.text(34,612,'imprescindible.',30,'Karma-Medium',DARK)
            self.text(35,574,f'{len(self.products)} referencias · Precios en pesos colombianos',14,color=MUTED)
            for i,cat in enumerate(self.categories[block*6:(block+1)*6]):
                y=468-i*77;g=next((g for g in self.groups if g[0]['category']==cat and self.group_photos(g)),None)
                self.box(33,y,474,69,'#FFFFFF',r=13)
                if g:self.img(self.group_photos(g)[0],42,y+7,55,55,cover=True,r=9)
                else:self.box(42,y+7,55,55,PALE,r=9)
                self.text(112,y+39,cat,21,'Karma-Medium',DARK)
                count=sum(p['category']==cat for p in self.products)
                self.text(113,y+17,f'{count} '+('referencia' if count==1 else 'referencias'),12,color=MUTED)
                self.text(482,y+26,f'{self.starts[cat]:02}',22,'Karma-Medium',DARK,'right')
                self.c.linkRect('','category-'+cat,(33,y,507,y+69),relative=0,thickness=0)
            if block+1<self.index_pages:
                self.text(507,63,'Más categorías >',11,'Arsenal-Bold',DARK,'right');self.c.linkRect('','index-'+str(block+2),(385,55,509,80),relative=0,thickness=0)
            self.footer()

    def product(self,g,index):
        p=g[0];self.start('product-'+p['sku'])
        if self.page==self.starts[p['category']]:self.c.bookmarkPage('category-'+p['category']);self.c.addOutlineEntry(p['category'],'category-'+p['category'],level=0,closed=False)
        self.brand(33,706,112);self.text(507,723,p['category'].upper(),12,'Arsenal-Bold',DARK,'right')
        self.rule(697)
        self.text(34,677,p['brand'] or 'BYFLY MAKEUP',11,'Arsenal-Bold',DARK)
        badges=set(b for q in g for b in q['badges'])
        badge='COMBO' if 'combo' in badges else 'NUEVO' if 'nuevo' in badges else ''
        if badge:self.box(431,665,76,22,DARK,r=11);self.text(469,672,badge,10,'Arsenal-Bold','#FFFFFF','center')
        name=label(p['name'])
        size=27 if len(name)<50 else 24
        title_bottom=self.para(34,655,name,472,size,'Karma-Medium',INK,size*1.12)
        photo_top=title_bottom-16
        rows=((len(g)+1)//2) if len(g)>4 else len(g)
        table_size=25+rows*36 if len(g)>4 else 25+rows*25 if len(g)>1 else 44 if p['tone'] else 23
        h=min(280,photo_top-14-(14 if len(g)>1 else 0)-60-23-table_size-145)
        if h<115:raise ValueError('Título demasiado largo para la ficha: '+p['sku'])
        gallery_y=photo_top-h
        paths=self.group_photos(g)[:3]
        self.box(33,gallery_y,474,h,'#FFFFFF',r=17)
        if not paths:
            self.img(str(ASSETS/'isotipo.png'),224,gallery_y+h/2-7,92,98)
            self.text(270,gallery_y+43,'Fotografía por incorporar',14,color=MUTED,align='center')
        elif len(paths)==1:
            self.img(paths[0],42,gallery_y+9,456,h-18,r=12)
        elif len(paths)==2:
            for i,path in enumerate(paths):self.img(path,42+i*234,gallery_y+9,222,h-18,r=12)
        else:
            self.img(paths[0],42,gallery_y+9,278,h-18,r=12)
            for i,path in enumerate(paths[1:]):self.img(path,330,gallery_y+9+i*(h/2-3),168,h/2-15,r=10)
        if not any(q['available'] for q in g):
            self.box(48,gallery_y+h-44,106,30,DARK,r=8);self.text(101,gallery_y+h-33,'AGOTADO',13,'Arsenal-Bold','#FFFFFF','center')
        y=gallery_y-14
        if len(g)>1:self.text(34,y,'Fotografías de referencia · Elige tu tono por SKU',10,color=MUTED);y-=14
        box_y=y-60
        for x,ttl,price,fill,clr in [(33,'PRECIO DETAL',p['retail'],'#FFFFFF',DARK),(277,'PRECIO MAYORISTA',p['wholesale'],DARK,'#FFFFFF')]:
            self.box(x,box_y,230,60,fill,DARK,12);self.text(x+16,box_y+42,ttl,10,'Arsenal-Bold',clr);self.text(x+16,box_y+15,money(price) if price>0 else 'Consultar',25,'Arsenal-Bold',clr)
            if price>0:self.text(x+212,box_y+18,'COP',10,color=clr,align='right')
        y=box_y-23
        if len(g)>1:
            self.text(34,y,'TONOS Y REFERENCIAS',10,'Arsenal-Bold',DARK);y-=25
            if len(g)>4:
                table_top=y
                for i,q in enumerate(g):
                    row,col=divmod(i,2);x=35+244*col;yy=table_top-row*36
                    tone=label(q['tone']) or q['sku'];tone_size=min(11,158/max(pdfmetrics.stringWidth(tone,'Arsenal-Bold',1),1))
                    self.text(x,yy,tone,tone_size,'Arsenal-Bold')
                    self.text(x+225,yy,'Disponible' if q['available'] else 'AGOTADO',9,'Arsenal-Bold',DARK if q['available'] else MUTED,align='right')
                    self.text(x,yy-12,q['sku'],9,color=MUTED)
                    if q['available']:
                        self.text(x+225,yy-12,'Consultar',9,'Arsenal-Bold',DARK,'right');self.c.linkURL(self.whatsapp(q,q['tone']),(x,yy-17,x+225,yy+12),relative=0,thickness=0)
                    self.rule(yy-19,x,225)
                y=table_top-((len(g)+1)//2)*36
            else:
                for q in g:
                    tone=label(q['tone']) or q['sku'];tone_size=min(12,214/max(pdfmetrics.stringWidth(tone,'Arsenal-Bold',1),1))
                    self.text(35,y,tone,tone_size,'Arsenal-Bold')
                    self.text(258,y,q['sku'],10,color=MUTED)
                    self.text(405,y,'Disponible' if q['available'] else 'AGOTADO',11,'Arsenal-Bold',DARK if q['available'] else MUTED,align='right')
                    if q['available']:
                        self.text(507,y,'Consultar',11,'Arsenal-Bold',DARK,'right');self.c.linkURL(self.whatsapp(q,q['tone']),(449,y-4,507,y+13),relative=0,thickness=0)
                    self.rule(y-7,34,472);y-=25
        else:
            self.text(35,y,p['sku'],12,color=MUTED)
            self.text(506,y,'Disponible' if p['available'] else 'AGOTADO',14,'Arsenal-Bold',DARK if p['available'] else MUTED,align='right');y-=22
            if p['tone']:self.text(35,y,'Tono: '+label(p['tone']),13);y-=22
        if y<137:raise ValueError(f'Contenido invade CTA en página {self.page}: {y}')
        self.qa.append({'page':self.page,'sku':p['sku'],'lowest_content_y':y,'variants':len(g),'images':len(paths)})
        available=any(q['available'] for q in g)
        self.button(34,88,472,42,'Consultar por WhatsApp' if available else 'Preguntar por disponibilidad',url=self.whatsapp(p,p['tone'] if len(g)==1 else None),dark=available)
        self.text(270,69,'Precio y disponibilidad sujetos a confirmación al hacer el pedido.',10,color=MUTED,align='center')
        self.footer()

    def closing(self):
        self.start('contact','Contacto')
        self.brand(132,638,276)
        self.text(270,526,'ByFly Makeup',33,'Karma-Medium',DARK,'center')
        self.text(270,479,'es ser tú.',39,'Karma-Medium',DARK,'center')
        self.para(76,435,'Es aprender y mejorar para transformarte a ti misma.',388,23,'Karma-Regular',DARK,32)
        self.rule(335,75,390)
        self.text(270,295,'¿Encontraste tus favoritos?',19,'Arsenal-Bold',DARK,'center')
        self.button(92,217,356,51,'Escríbenos · 314 739 7938',url=self.whatsapp())
        self.text(270,181,'byfly.com.co',17,color=DARK,align='center');self.c.linkURL('https://byfly.com.co/',(181,169,359,196),relative=0,thickness=0)
        self.text(270,118,'DETAL + MAYORISTA',12,'Arsenal-Bold',DARK,'center')
        self.footer()

    def build(self):
        self.cover();self.how_to();self.policies();self.index()
        for i,g in enumerate(self.groups):self.product(g,i)
        self.closing();self.c.save()

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--offline',action='store_true');parser.add_argument('--output',default=str(ROOT/'ByFly_Catalogo_Completo.pdf'));args=parser.parse_args()
    products,issues=load_data(args.offline)
    ids=list(dict.fromkeys(i for p in products for i in p['image_ids']))
    with ThreadPoolExecutor(max_workers=10) as ex:photos=dict(ex.map(lambda i:get_photo(i,not args.offline),ids))
    issues['failed_images']=[i for i,v in photos.items() if not v]
    output=Path(args.output);output.parent.mkdir(parents=True,exist_ok=True);tmp=output.with_suffix('.tmp.pdf')
    cat=Catalog(tmp,products,photos);cat.build();tmp.replace(output)
    (ROOT/'validation.json').write_text(json.dumps({'generated_at':cat.date,'pages':cat.page,'references':len(products),'groups':len(cat.groups),'issues':issues,'layout_checks':cat.qa},ensure_ascii=False,indent=2))
    print(json.dumps({'output':str(output),'pages':cat.page,'references':len(products),'groups':len(cat.groups),'issues':{k:len(v) for k,v in issues.items()}},ensure_ascii=False))

if __name__=='__main__':main()
