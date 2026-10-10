"""Validate -> render -> verify -> publish. No credentials or cost columns in output."""
import argparse,csv,hashlib,io,json,math,os,re,subprocess,sys,time,urllib.parse,urllib.request
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime,timezone
from pathlib import Path
from PIL import Image,ImageOps
from categories import category,norm
ROOT=Path(__file__).resolve().parent
DEFAULT_URL='https://docs.google.com/spreadsheets/d/e/2PACX-1vQo4RhtucI4m_U32VCNzNy2E33wCeXeO2NKTcDOFn1mDupdXtPsqDEPF6NFJDYRc6LNWJJpRAZLguIt/pub?gid=1817499306&single=true&output=csv'
STATE='actualizacion.json';PDF='ByFly_Catalogo.pdf'
TRUE={'si','sí','yes','1','true','nuevo'}
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

def products_from_csv(raw,allow_missing_skus=False,omitted=None):
    reader=csv.DictReader(io.StringIO(raw.decode('utf-8-sig')))
    required={'SKU','nombre','categoria','precio_detal','precio_mayor','stock','disponible','imagen_url'}
    if not required<=set(reader.fieldnames or []):raise ValueError('Faltan columnas requeridas: '+', '.join(sorted(required-set(reader.fieldnames or []))))
    products=[];seen=set()
    for row_number,r in enumerate(reader,2):
        if not any(str(v or '').strip() for v in r.values()):continue
        sku=(r.get('SKU') or '').strip();name=(r.get('nombre') or '').strip()
        if not sku and not name:continue # blank formatted rows
        if not sku and name and allow_missing_skus:
            if omitted is not None:omitted.append({'fila':row_number,'nombre':name,'tono':(r.get('tono') or '').strip()})
            continue
        if not sku or not name:raise ValueError(f'Fila {row_number}: SKU y nombre son obligatorios ({name or sku})')
        if not re.fullmatch(r'[A-Za-z0-9_-]{1,45}',sku):raise ValueError('Formato de SKU no admitido: '+sku)
        if sku in seen:raise ValueError('SKU duplicado: '+sku)
        seen.add(sku)
        if not (r.get('categoria') or '').strip():raise ValueError('Categoría vacía: '+sku)
        p={'sku':sku,'name':name,'brand':(r.get('marca') or '').strip(),'tone':(r.get('tono') or '').strip(),'category':(r.get('categoria') or '').strip() or 'Productos','retail':numeric(r.get('precio_detal')),'wholesale':numeric(r.get('precio_mayor')),'stock':numeric(r.get('stock'))}
        p['available']=(r.get('disponible') or '').strip().lower() in TRUE and p['stock']>0
        badges=[b.strip().lower() for b in re.split('[,;|]',r.get('badge') or '')]
        p['new']=(r.get('Nuevo') or '').strip().lower() in TRUE or 'nuevo' in badges
        p['badges']=badges;p['description']='';p['source_category']=p['category'];p['imported']=norm(p['category'])=='IMPORTADOS'
        if norm(p['category'])=='CUIDADO CORPORAL':p['category']='Cuidado corporal'
        p['category'],p['category_reason']=category(p)
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
    return result

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
    if len(wa)!=1 or 'NOVEDADES' not in d[1].get_text():raise ValueError('Novedades o contacto inválido')
    report={'references':len(found),'pages':len(d),'missing_image_families':len({(p['category'],p['name'],p['brand']) for p in products if not p['family_images']}),'whatsapp_pages':wa,'bytes':(work/PDF).stat().st_size}
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
    try:head=client.head_object(Bucket=bucket,Key=PDF)
    except Exception as e:
        if getattr(e,'response',{}).get('Error',{}).get('Code') in ('NoSuchKey','NotFound','404'):return False
        raise
    return head.get('ContentLength',0)>0 and head.get('Metadata',{}).get('sha256')==state.get('pdf_sha256')

def publish(client,bucket,work,state,prefix=""):
    raw=(work/PDF).read_bytes();version=prefix+'versions/'+state['fingerprint']+'.pdf'
    for key in (version,prefix+PDF):
        client.put_object(Bucket=bucket,Key=key,Body=raw,ContentType='application/pdf',CacheControl='public,max-age=31536000,immutable' if key==version else 'no-cache,max-age=0,must-revalidate',Metadata={'sha256':digest(raw)})
        if client.head_object(Bucket=bucket,Key=key)['Metadata'].get('sha256')!=digest(raw):raise RuntimeError('No se verificó la publicación')
    # Commit the manifest last: failed builds never replace it.
    client.put_object(Bucket=bucket,Key=prefix+STATE,Body=encoded(state),ContentType='application/json',CacheControl='no-store')

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--local-csv');parser.add_argument('--preview',action='store_true',help='Prueba separada que omite filas sin SKU');parser.add_argument('--force',action='store_true');parser.add_argument('--workdir',default=str(ROOT/'work'));args=parser.parse_args()
    work=Path(args.workdir).resolve();work.mkdir(parents=True,exist_ok=True)
    local=bool(args.local_csv);client=None if local else s3_client();bucket=os.environ.get('R2_BUCKET','byflycatalogo');previous={} if local or args.preview else read_state(client,bucket)
    raw=Path(args.local_csv).read_bytes() if local else fetch(os.environ.get('CATALOG_SHEET_URL') or DEFAULT_URL)
    omitted=[];products=products_from_csv(raw,allow_missing_skus=args.preview,omitted=omitted)
    if args.preview:
        with (work/'filas_omitidas.csv').open('w',encoding='utf-8-sig',newline='') as f:
            w=csv.DictWriter(f,fieldnames=['fila','nombre','tono']);w.writeheader();w.writerows(omitted)
        print(f'PRUEBA: {len(omitted)} filas sin SKU omitidas. Publicación separada en pruebas/.',flush=True)
    if previous.get('references') and len(products)<previous['references']*.8 and not args.force:raise ValueError('La hoja perdió más del 20% de referencias. Revisar antes de forzar una ejecución manual.')
    print(f'Referencias válidas: {len(products)}',flush=True)
    if args.preview:
        ids=sorted({fid for p in products for fid in p['family_images']})
        downloaded=download_photos(ids,work)
        photos={x['id']:digest(Path(x['path']).read_bytes()) for x in downloaded}
    else:ids,photos=inspect_photos(products,work)
    # Includes code/assets: a layout correction also triggers regeneration.
    code_hash=digest(b''.join(p.read_bytes() for p in sorted(ROOT.rglob('*')) if p.is_file() and (p.suffix in ('.py','.ttf','.png','.txt')) and 'work' not in p.parts and '__pycache__' not in p.parts))
    fingerprint=digest(encoded({'products':products,'images':photos,'generator':code_hash}))
    if fingerprint==previous.get('fingerprint') and not args.force and published_matches(client,bucket,previous):
        print('Sin cambios: se conserva el PDF publicado.');return
    if not args.preview:download_photos(ids,work)
    (work/'products.json').write_bytes(encoded(products))
    subprocess.run([sys.executable,str(ROOT/'build.py')],env={**os.environ,'CATALOG_WORKDIR':str(work),'CATALOG_PREVIEW':f'PRUEBA · {len(products)} referencias con SKU · {len(omitted)} filas omitidas' if args.preview else ''},check=True)
    report=verify(work,products)
    prefix='pruebas/' if args.preview else ''
    state={**report,'preview':args.preview,'omitted_rows':len(omitted),'fingerprint':fingerprint,'updated_at':datetime.now(timezone.utc).isoformat(),'pdf':prefix+PDF,'version':prefix+'versions/'+fingerprint+'.pdf','pdf_sha256':digest((work/PDF).read_bytes())}
    if not local:
        if args.preview:publish(client,bucket,work,state,prefix=prefix)
        else:publish(client,bucket,work,state)
    (work/STATE).write_bytes(encoded(state))
    # Export only public columns for manual classification/photo review.
    fields=['sku','name','brand','tone','source_category','category','category_reason','new','retail','wholesale','stock','available']
    with (work/'revision.csv').open('w',encoding='utf-8-sig',newline='') as f:
        w=csv.DictWriter(f,fieldnames=fields,extrasaction='ignore');w.writeheader();w.writerows(products)
    print(json.dumps(report,ensure_ascii=False));print('Validado localmente.' if local else 'Publicado y verificado en R2.')
if __name__=='__main__':main()
