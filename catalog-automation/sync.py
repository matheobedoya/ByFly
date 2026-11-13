"""Validate -> render -> verify -> publish. No credentials or cost columns in output."""
import argparse,csv,hashlib,io,json,math,os,re,subprocess,sys,time,urllib.parse,urllib.request
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime,timezone
from pathlib import Path
from PIL import Image,ImageOps
from categories import category,norm
import pdf_guard
ROOT=Path(__file__).resolve().parent
DEFAULT_URL='https://docs.google.com/spreadsheets/d/e/2PACX-1vQo4RhtucI4m_U32VCNzNy2E33wCeXeO2NKTcDOFn1mDupdXtPsqDEPF6NFJDYRc6LNWJJpRAZLguIt/pub?gid=1817499306&single=true&output=csv'
STATE='actualizacion.json';PDF='ByFly_Catalogo.pdf';DOWNLOAD_PDF='ByFly_Catalogo_Download.pdf';DOWNLOAD_PAGE='descargar.html'
TRUE={'si','sí','yes','1','true','nuevo'}
# SKU excluidos intencionalmente del catálogo hasta nueva revisión.
SKIP_SKUS={'SKU-00239'}
# Nombres con los que la hoja escribe categorías que el catálogo ya tiene.
# "Capilar" (productos para el cabello) se clasifica como "Cabello". La categoría original de la hoja
# se conserva en source_category (revision.csv). Para tener una sección propia, borra esta línea.
CATEGORY_ALIASES={'CAPILAR':'Cabello','CAPILARES':'Cabello'}
def digest(data):return hashlib.sha256(data).hexdigest()
def encoded(value):return json.dumps(value,sort_keys=True,ensure_ascii=False,separators=(',',':')).encode()
def fetch(url):
    for attempt in range(3):
        try:
            req=urllib.request.Request(url,headers={'User-Agent':'ByFlyCatalog/1.0'})
            with urllib.request.urlopen(req,timeout=40) as r:return r.read()
        except Exception:
            if attempt==2:raise
            time.sleep(2**attempt)
def numeric(value):
    s=str(value or '').strip().replace('$','').replace(' ','')
    if re.fullmatch(r'\d{1,3}(\.\d{3})+',s):s=s.replace('.','')
    elif re.fullmatch(r'\d{1,3}(,\d{3})+',s):s=s.replace(',','')
    else:s=s.replace(',','.')
    n=float(s or '0')
    if not math.isfinite(n) or n<0:raise ValueError('Valor numérico inválido')
    return n

def products_from_csv(raw):
    reader=csv.DictReader(io.StringIO(raw.decode('utf-8-sig')))
    required={'SKU','nombre','categoria','precio_detal','precio_mayor','stock','disponible','imagen_url'}
    if not required<=set(reader.fieldnames or []):raise ValueError('Faltan columnas requeridas: '+', '.join(sorted(required-set(reader.fieldnames or []))))
    products=[];seen=set();last_valid_source_category=None
    for row_number,r in enumerate(reader,2):
        if not any(str(v or '').strip() for v in r.values()):continue
        sku=(r.get('SKU') or '').strip();name=(r.get('nombre') or '').strip()
        if not sku and not name:continue # blank formatted rows
        # Skip configured SKUs before validating their required fields, so a deliberately
        # excluded article with an empty category does not stop the entire build.
        if sku in SKIP_SKUS:
            print(f'SKU omitido por configuración: {sku}',flush=True)
            continue
        if not sku or not name:raise ValueError(f'Fila {row_number}: SKU y nombre son obligatorios ({name or sku})')
        if not re.fullmatch(r'[A-Za-z0-9_-]{1,45}',sku):raise ValueError('Formato de SKU no admitido: '+sku)
        if sku in seen:raise ValueError('SKU duplicado: '+sku)
        seen.add(sku)
        source_category=(r.get('categoria') or '').strip()
        if not source_category:
            if not last_valid_source_category:
                raise ValueError(
                    f'Categoría vacía y no existe una categoría anterior válida para heredar: {sku} (fila {row_number})'
                )
            source_category=last_valid_source_category
            print(
                f'Categoría vacía: {sku}; se hereda la categoría anterior "{source_category}" (fila {row_number})',
                flush=True,
            )
        canonical_category=CATEGORY_ALIASES.get(source_category.upper(),source_category)
        p={'sku':sku,'name':name,'brand':(r.get('marca') or '').strip(),'tone':(r.get('tono') or '').strip(),'category':canonical_category,'retail':numeric(r.get('precio_detal')),'wholesale':numeric(r.get('precio_mayor')),'stock':numeric(r.get('stock'))}
        p['available']=(r.get('disponible') or '').strip().lower() in TRUE and p['stock']>0
        badges=[b.strip().lower() for b in re.split('[,;|]',r.get('badge') or '')]
        p['new']=(r.get('Nuevo') or '').strip().lower() in TRUE or 'nuevo' in badges
        p['badges']=badges;p['description']='';p['source_category']=source_category;p['imported']=norm(p['category'])=='IMPORTADOS'
        if norm(p['category'])=='CUIDADO CORPORAL':p['category']='Cuidado corporal'
        p['category'],p['category_reason']=category(p)
        # The next product with an empty source category inherits the previous
        # product's final catalog category (after normalization/classification).
        last_valid_source_category=p['category']
        p['image_ids']=[]
        for col in ('imagen_url','imagen_url2','imagen_url3','Img4','Img5','Img6'):
            url=(r.get(col) or '').strip()
            if not url:continue
            parsed=urllib.parse.urlparse(url)
            if parsed.scheme!='https':raise ValueError('La imagen debe usar HTTPS: '+sku)
            if parsed.hostname in ('drive.google.com','docs.google.com'):
                match=re.search(r'/d/([\w-]+)',parsed.path)
                fid=match.group(1) if match else urllib.parse.parse_qs(parsed.query).get('id',[''])[0]
                if not re.fullmatch(r'[\w-]+',fid):raise ValueError('Enlace de Drive inválido: '+sku)
            else:
                # HTTPS images supported; explicit URLs remain part of the fingerprint.
                fid=url
            if fid not in p['image_ids']:p['image_ids'].append(fid)
        products.append(p)
    if not products:raise ValueError('Catálogo vacío: se conserva la publicación anterior')
    families={}
    for p in products:families.setdefault((p['category'],norm(p['name']),norm(p['brand'])),[]).append(p)
    for family in families.values():
        ids=list(dict.fromkeys(fid for p in family for fid in p['image_ids']))
        for p in family:p['family_images']=ids[:1] # one cover image, with explicit family reference disclaimer
    return products

def image_url(fid,width):return fid if fid.startswith('https://') else 'https://drive.google.com/thumbnail?id='+urllib.parse.quote(fid)+'&sz=w'+str(width)
def photo(fid,width):
    data=fetch(image_url(fid,width))
    with Image.open(io.BytesIO(data)) as src:
        im=ImageOps.exif_transpose(src).convert('RGB');im.load()
    return im

def inspect_photos(products,work):
    ids=sorted({fid for p in products for fid in p['family_images']})
    def one(fid):
        try:im=photo(fid,320)
        except Exception as e:raise ValueError('No se pudo leer la imagen de portada: '+fid) from e
        # Hash decoded pixels, avoiding changing image container metadata.
        return fid,digest(str(im.size).encode()+im.tobytes())
    hashes={}
    with ThreadPoolExecutor(max_workers=8) as pool:
        for i,(fid,h) in enumerate(pool.map(one,ids),1):
            hashes[fid]=h
            if i%50==0 or i==len(ids):print(f'Fotos comprobadas: {i}/{len(ids)}',flush=True)
    return ids,hashes

def download_photos(ids,work):
    dest=work/'photos';dest.mkdir(parents=True,exist_ok=True)
    def one(fid):
        try:im=photo(fid,1600)
        except Exception as e:raise ValueError('No se pudo descargar la imagen en alta resolución: '+fid) from e
        path=dest/(digest(fid.encode())+'.png');im.save(path,optimize=True)
        return {'id':fid,'path':str(path.resolve()),'width':im.width,'height':im.height}
    result=[]
    with ThreadPoolExecutor(max_workers=8) as pool:
        for i,item in enumerate(pool.map(one,ids),1):
            result.append(item)
            if i%50==0 or i==len(ids):print(f'Fotos descargadas: {i}/{len(ids)}',flush=True)
    (work/'photo-quality.json').write_bytes(encoded(result))

def verify(work,products):
    import fitz
    d=fitz.open(work/PDF);qa=json.loads((work/'layout.json').read_text());found=[];wa=[]
    for i,page in enumerate(d):
        if tuple(page.rect[2:])!=(560.,700.):raise ValueError('Tamaño de página inesperado')
        for block in page.get_text('dict')['blocks']:
            for line in block.get('lines',[]):
                for span in line['spans']:
                    x,y,x2,y2=span['bbox']
                    if x<0 or y<0 or x2>560.5 or y2>700.5:raise ValueError('Texto fuera de página '+str(i+1)+': '+span['text'])
        for link in page.get_links():
            if link['kind']==fitz.LINK_GOTO and not 0<=link['page']<len(d):raise ValueError('Enlace interno roto')
            if link['kind']==fitz.LINK_NAMED:
                try:target=int(link.get('page'))-1
                except (TypeError,ValueError):raise ValueError('Destino interno con nombre inválido')
                if not 0<=target<len(d):raise ValueError('Destino nombrado fuera del PDF')
            if 'wa.me' in link.get('uri',''):wa.append(i+1)
    bysku={p['sku']:p for p in products}
    for row in qa:
        text=d[row['page']-1].get_text();tokens=text.split()
        for sku in row['skus']:
            if tokens.count(sku)!=1:raise ValueError('Referencia ausente o repetida: '+sku)
            found.append(sku)
            for key in ('retail','wholesale'):
                n=bysku[sku][key];price='$'+f'{n:,.0f}'.replace(',','.') if n else 'Consultar'
                if price not in text:raise ValueError('Precio no coincide: '+sku)
    if len(found)!=len(products) or set(found)!=set(bysku) or len(found)!=len(set(found)):raise ValueError('Cobertura de referencias inválida')
    contact_page=len(d)
    if wa.count(contact_page)!=1 or 'NOVEDADES' not in d[1].get_text().upper():raise ValueError('Novedades o enlace WhatsApp en contacto inválido')
    news_path=work/'news.json'
    if not news_path.is_file():raise ValueError('Falta el registro de Novedades generado')
    news_items=json.loads(news_path.read_text(encoding='utf-8'))
    if not news_items:raise ValueError('La sección Novedades no puede quedar vacía')
    if len(news_items)>6:raise ValueError('Novedades debe limitarse a seis familias recientes por edición')
    if not any(link.get('kind') in (fitz.LINK_GOTO,fitz.LINK_NAMED) for link in d[1].get_links()):raise ValueError('La sección Novedades no tiene enlaces a fichas de producto')
    # Cada ficha que declara una foto debe contener el trazo de marco rosa aplicado por build.py.
    frame_rgb=(230/255,198/255,209/255)
    for row in qa:
        if row.get('images_drawn',0):
            framed=False
            for drawing in d[row['page']-1].get_drawings():
                color=drawing.get('color')
                if color and all(abs(color[i]-frame_rgb[i])<0.02 for i in range(3)):
                    framed=True;break
            if not framed:raise ValueError('Fotografía sin marco en página '+str(row['page']))
    photo_frames_total=0
    for page in d:
        for drawing in page.get_drawings():
            color=drawing.get('color')
            if color and all(abs(color[i]-frame_rgb[i])<0.02 for i in range(3)):
                photo_frames_total+=1
    report={'references':len(found),'pages':len(d),'news_families':len(news_items),'latest_news_skus':[x['last_added_sku'] for x in news_items],'framed_photo_pages':sum(1 for x in qa if x.get('images_drawn',0)),'photo_frames_total':photo_frames_total,'missing_image_families':len({(p['category'],p['name'],p['brand']) for p in products if not p['family_images']}),'whatsapp_pages':wa,'bytes':(work/PDF).stat().st_size}
    (work/'verification.json').write_bytes(encoded(report));return report

def s3_client():
    import boto3
    from botocore.config import Config
    endpoint=os.environ['R2_ENDPOINT']
    if not re.fullmatch(r'https://[a-fA-F0-9]{32}\.r2\.cloudflarestorage\.com/?',endpoint):raise ValueError('R2_ENDPOINT debe ser el endpoint S3 de la cuenta, sin /bucket')
    return boto3.client('s3',endpoint_url=endpoint,aws_access_key_id=os.environ['R2_ACCESS_KEY_ID'],aws_secret_access_key=os.environ['R2_SECRET_ACCESS_KEY'],region_name='auto',config=Config(request_checksum_calculation='when_required',response_checksum_validation='when_required'))

def read_state(client,bucket):
    from botocore.exceptions import ClientError
    try:return json.loads(client.get_object(Bucket=bucket,Key=STATE)['Body'].read())
    except ClientError as e:
        if e.response['Error']['Code'] in ('NoSuchKey','404'):return {}
        raise

def published_matches(client,bucket,state):
    expected_pdf=state.get('pdf_sha256')
    expected_page=digest((ROOT/DOWNLOAD_PAGE).read_bytes())
    if not expected_pdf:return False
    expected=[(PDF,expected_pdf),(DOWNLOAD_PDF,expected_pdf),(DOWNLOAD_PAGE,expected_page)]
    for key,expected_hash in expected:
        try:head=client.head_object(Bucket=bucket,Key=key)
        except Exception as e:
            if getattr(e,'response',{}).get('Error',{}).get('Code') in ('NoSuchKey','NotFound','404'):return False
            raise
        if head.get('ContentLength',0)<=0 or head.get('Metadata',{}).get('sha256')!=expected_hash:return False
        disposition=(head.get('ContentDisposition') or '').lower()
        if key==PDF and not disposition.startswith('inline'):return False
        if key==DOWNLOAD_PDF and not disposition.startswith('attachment'):return False
        if key==DOWNLOAD_PAGE and head.get('ContentType','').split(';')[0]!='text/html':return False
    return True

def publish(client,bucket,work,state,pdf_raw=None):
    # Solo se publican los bytes del PDF recién generado y ya validado.
    pdf_path=work/PDF
    raw=pdf_raw if pdf_raw is not None else pdf_path.read_bytes()
    if not raw.startswith(b'%PDF-'):
        raise ValueError('El archivo generado no tiene cabecera PDF válida')
    import fitz
    doc=fitz.open(stream=raw,filetype='pdf')
    if doc.is_encrypted or len(doc)<2:
        raise ValueError('El PDF generado está cifrado o no contiene las páginas esperadas')
    strict_problems,_=pdf_guard.inspect_bytes(raw)
    if strict_problems:raise ValueError('El PDF no pasó la validación estricta y no se publicó: '+'; '.join(strict_problems))
    pdf_hash=digest(raw)
    state.update({'pdf_sha256':pdf_hash,'references':state.get('references',0),
                  'pages':len(doc),'bytes':len(raw),'master_pdf':'generated-from-current-sheet'})
    version='versions/'+state['fingerprint']+'.pdf'
    page_path=ROOT/DOWNLOAD_PAGE
    if not page_path.is_file():
        raise FileNotFoundError(f'Falta la página de descarga: {page_path}')
    page=page_path.read_bytes()
    if b'ByFly_Catalogo_Download.pdf' not in page or b'ByFly_Catalogo.pdf' not in page:
        raise ValueError('La página de descarga debe incluir vista previa y descarga del mismo PDF')
    objects=[
        (version,raw,'application/pdf','inline; filename="ByFly_Catalogo.pdf"','public,max-age=31536000,immutable'),
        (PDF,raw,'application/pdf','inline; filename="ByFly_Catalogo.pdf"','public,max-age=300'),
        (DOWNLOAD_PDF,raw,'application/pdf','attachment; filename="ByFly_Catalogo.pdf"','public,max-age=300'),
        (DOWNLOAD_PAGE,page,'text/html; charset=utf-8','inline; filename="descargar.html"','public,max-age=300'),
    ]
    for key,body,content_type,content_disposition,cache_control in objects:
        client.put_object(Bucket=bucket,Key=key,Body=body,ContentType=content_type,
            ContentDisposition=content_disposition,CacheControl=cache_control,
            Metadata={'sha256':digest(body)})
        head=client.head_object(Bucket=bucket,Key=key)
        if head.get('Metadata',{}).get('sha256')!=digest(body) or head.get('ContentLength',len(body))!=len(body):
            raise RuntimeError('No se verificó la publicación de '+key)
        if head.get('ContentDisposition') and head['ContentDisposition']!=content_disposition:
            raise RuntimeError('No se verificó Content-Disposition para '+key)
    # El manifiesto se actualiza al final: un fallo conserva la última publicación válida.
    client.put_object(Bucket=bucket,Key=STATE,Body=encoded(state),ContentType='application/json',CacheControl='no-store')
    return {'references':state['references'],'pages':state['pages'],'bytes':state['bytes'],'pdf_sha256':pdf_hash}

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--local-csv');parser.add_argument('--force',action='store_true');parser.add_argument('--workdir',default=str(ROOT/'work'));args=parser.parse_args()
    work=Path(args.workdir).resolve();work.mkdir(parents=True,exist_ok=True)
    local=bool(args.local_csv);client=None if local else s3_client();bucket=os.environ.get('R2_BUCKET','byflycatalogo');previous={} if local else read_state(client,bucket)
    raw=Path(args.local_csv).read_bytes() if local else fetch(os.environ.get('CATALOG_SHEET_URL') or DEFAULT_URL)
    products=products_from_csv(raw)
    if previous.get('references') and len(products)<previous['references']*.8 and not args.force:raise ValueError('La hoja perdió más del 20% de referencias. Revisar antes de forzar una ejecución manual.')
    print(f'Referencias válidas: {len(products)}',flush=True)
    ids,photos=inspect_photos(products,work)
    # Includes code/assets: a layout correction also triggers regeneration.
    code_hash=digest(b''.join(p.read_bytes() for p in sorted(ROOT.rglob('*')) if p.is_file() and (p.suffix in ('.py','.ttf','.png','.txt','.html')) and 'work' not in p.parts and '__pycache__' not in p.parts))
    fingerprint=digest(encoded({'products':products,'images':photos,'generator':code_hash}))
    if fingerprint==previous.get('fingerprint') and not args.force and published_matches(client,bucket,previous):
        print('Sin cambios: se conserva el PDF publicado.');return
    download_photos(ids,work);(work/'products.json').write_bytes(encoded(products))
    subprocess.run([sys.executable,str(ROOT/'build.py')],env={**os.environ,'CATALOG_WORKDIR':str(work)},check=True)
    # Validación estricta (qpdf): MuPDF perdona errores que Adobe y los visores móviles no. Si hace falta se repara
    # (y se avisa en el registro); si no se puede dejar válido, se detiene y se conserva la publicación anterior.
    guard=pdf_guard.finalize(work/PDF)
    if guard['repaired']:print('AVISO: el generador produjo un PDF con errores de sintaxis y se reparó automáticamente. Revisa build.py.',flush=True)
    report=verify(work,products)
    report['pdf_repaired']=guard['repaired'];(work/'verification.json').write_bytes(encoded(report))
    state={**report,'fingerprint':fingerprint,'updated_at':datetime.now(timezone.utc).isoformat(),'pdf':PDF,'version':'versions/'+fingerprint+'.pdf','pdf_sha256':digest((work/PDF).read_bytes())}
    pdf_raw=(work/PDF).read_bytes()
    if not local:
        published_report=publish(client,bucket,work,state,pdf_raw)
        report.update(published_report)
    state['pdf_sha256']=digest(pdf_raw);state['pages']=report['pages'];state['bytes']=len(pdf_raw)
    (work/STATE).write_bytes(encoded(state))
    # Export only public columns for manual classification/photo review.
    fields=['sku','name','brand','tone','source_category','category','category_reason','new','retail','wholesale','stock','available']
    with (work/'revision.csv').open('w',encoding='utf-8-sig',newline='') as f:
        w=csv.DictWriter(f,fieldnames=fields,extrasaction='ignore');w.writeheader();w.writerows(products)
    print(json.dumps(report,ensure_ascii=False));print('Validado localmente.' if local else 'Publicado y verificado en R2.')
if __name__=='__main__':main()
