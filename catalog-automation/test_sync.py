import csv,io,json,tempfile,unittest
from pathlib import Path
from unittest.mock import patch
import sync
FRAME_HEX='#E6C6D1'
HEADERS=['SKU','nombre','marca','categoria','precio_detal','precio_mayor','stock','disponible','imagen_url','Nuevo','tono']
def source(rows):
    f=io.StringIO();w=csv.DictWriter(f,fieldnames=HEADERS);w.writeheader();w.writerows(rows);return f.getvalue().encode()
def row(**kw):return dict(SKU='SKU-00001',nombre='BASE',marca='TEST',categoria='Piel',precio_detal='44.000',precio_mayor='36000',stock='2',disponible='si',imagen_url='',Nuevo='',**kw) if not kw else {**row(),**kw}
class SyncTests(unittest.TestCase):
    def test_parse_prices_new_and_stock(self):
        p=sync.products_from_csv(source([row(stock='0',Nuevo='Nuevo')]))[0]
        self.assertEqual((p['retail'],p['wholesale']),(44000,36000));self.assertFalse(p['available']);self.assertTrue(p['new']);self.assertEqual(p['category'],'Rostro');self.assertNotIn('precio_costo',p)
    def test_duplicate_missing_empty_and_nonfinite_block(self):
        for rows in ([row(),row()],[row(SKU='')],[],[row(precio_detal='nan')]):
            with self.subTest(rows=rows),self.assertRaises(ValueError):sync.products_from_csv(source(rows))
    def test_configured_sku_is_skipped_even_when_category_is_empty(self):
        products=sync.products_from_csv(source([
            row(SKU='SKU-00239',categoria=''),
            row(SKU='SKU-00002',nombre='Producto que sí va')
        ]))
        self.assertEqual([p['sku'] for p in products],['SKU-00002'])
    def test_missing_category_inherits_previous_product_category(self):
        products=sync.products_from_csv(source([
            row(SKU='SKU-00001',nombre='Producto anterior',categoria='Labios'),
            row(SKU='SKU-00002',nombre='Producto sin categoria',categoria=''),
            row(SKU='SKU-00003',nombre='Producto siguiente',categoria='Rostro'),
        ]))
        self.assertEqual(products[0]['source_category'],'Labios')
        self.assertEqual(products[1]['source_category'],'Labios')
        self.assertEqual(products[1]['category'],'Labios')
        self.assertEqual(products[2]['source_category'],'Rostro')

    def test_first_product_cannot_inherit_missing_category(self):
        with self.assertRaisesRegex(ValueError,'no existe una categoría anterior válida'):
            sync.products_from_csv(source([row(SKU='SKU-00001',categoria='')]))

    def test_missing_category_inherits_previous_final_catalog_category(self):
        products=sync.products_from_csv(source([
            row(SKU='SKU-00001',nombre='Producto de piel',categoria='Piel'),
            row(SKU='SKU-00002',nombre='Producto sin categoria',categoria=''),
        ]))
        self.assertEqual(products[0]['category'],'Rostro')
        self.assertEqual(products[1]['source_category'],'Rostro')
        self.assertEqual(products[1]['category'],'Rostro')

    def test_multiple_missing_categories_keep_last_valid_category(self):
        products=sync.products_from_csv(source([
            row(SKU='SKU-00001',nombre='Producto base',categoria='Labios'),
            row(SKU='SKU-00002',nombre='Producto sin categoria A',categoria=''),
            row(SKU='SKU-00003',nombre='Producto sin categoria B',categoria=''),
            row(SKU='SKU-00004',nombre='Producto rostro',categoria='Rostro'),
            row(SKU='SKU-00005',nombre='Producto sin categoria C',categoria=''),
        ]))
        self.assertEqual([p['source_category'] for p in products],['Labios','Labios','Labios','Rostro','Rostro'])
    def test_family_picture_only_same_category(self):
        url='https://drive.google.com/file/d/abc/view'
        p=sync.products_from_csv(source([row(imagen_url=url),row(SKU='SKU-00002'),row(SKU='SKU-00003',categoria='Labios')]))
        self.assertEqual(p[1]['family_images'],['abc']);self.assertEqual(p[2]['family_images'],[])
    def test_verify_news_and_large_family(self):
        import os,subprocess,sys
        with tempfile.TemporaryDirectory() as td:
            work=Path(td);p=sync.products_from_csv(source([row(SKU=f'SKU-{i:05}') for i in range(1,15)]))
            (work/'products.json').write_bytes(sync.encoded(p));(work/'photo-quality.json').write_text('[]')
            subprocess.run([sys.executable,str(sync.ROOT/'build.py')],env={**os.environ,'CATALOG_WORKDIR':td},check=True,capture_output=True)
            report=sync.verify(work,p);self.assertEqual(report['references'],14);self.assertEqual(report['pages'],9)
    def test_latest_six_families_appear_in_news_without_new_flag(self):
        import os,subprocess,sys
        import fitz
        with tempfile.TemporaryDirectory() as td:
            work=Path(td)
            rows=[row(SKU=f'SKU-{i:05}',nombre=f'Producto Reciente {i}',marca=f'MARCA-{i}',Nuevo='') for i in range(8,0,-1)]
            products=sync.products_from_csv(source(rows))
            (work/'products.json').write_bytes(sync.encoded(products));(work/'photo-quality.json').write_text('[]')
            subprocess.run([sys.executable,str(sync.ROOT/'build.py')],env={**os.environ,'CATALOG_WORKDIR':td},check=True,capture_output=True)
            news=json.loads((work/'news.json').read_text())
            self.assertEqual([item['last_added_sku'] for item in news],['SKU-00008','SKU-00007','SKU-00006','SKU-00005','SKU-00004','SKU-00003'])
            doc=fitz.open(work/sync.PDF);news_text=doc[1].get_text()
            for i in range(3,9):self.assertIn(f'producto reciente {i}'.lower(),news_text.lower())
            self.assertNotIn('Producto Reciente 1',news_text);self.assertNotIn('Producto Reciente 2',news_text)

    def test_large_family_continuations_do_not_repeat_photo(self):
        import os,subprocess,sys
        from PIL import Image
        with tempfile.TemporaryDirectory() as td:
            work=Path(td);photos=work/'photos';photos.mkdir()
            image_path=photos/'abc.jpg';Image.new('RGB',(80,80),(238,72,110)).save(image_path)
            rows=[row(SKU=f'SKU-{i:05}',imagen_url='https://drive.google.com/file/d/abc/view' if i==1 else '') for i in range(1,15)]
            products=sync.products_from_csv(source(rows))
            (work/'products.json').write_bytes(sync.encoded(products))
            (work/'photo-quality.json').write_text(json.dumps([{'id':'abc','path':str(image_path),'width':80,'height':80}]))
            subprocess.run([sys.executable,str(sync.ROOT/'build.py')],env={**os.environ,'CATALOG_WORKDIR':td},check=True,capture_output=True)
            qa=json.loads((work/'layout.json').read_text())
            product_pages=[item for item in qa if 'skus' in item]
            self.assertEqual([len(item['skus']) for item in product_pages],[6,6,2])
            self.assertEqual([item['continuation'] for item in product_pages],[False,True,True])
            self.assertEqual([item['family_part'] for item in product_pages],[1,2,3])
            self.assertEqual([item['images_drawn'] for item in product_pages],[1,0,0])
            self.assertEqual(len({sku for item in product_pages for sku in item['skus']}),14)
            report=sync.verify(work,products)
            self.assertEqual(report['references'],14)
            import fitz
            doc=fitz.open(work/sync.PDF)
            page=doc[product_pages[0]['page']-1]
            expected=tuple(int(FRAME_HEX[i:i+2],16)/255 for i in (1,3,5))
            frame_drawings=[d for d in page.get_drawings() if d.get('color') and all(abs(d['color'][i]-expected[i])<0.015 for i in range(3))]
            self.assertTrue(frame_drawings,'La fotografía debe tener un marco visible en el PDF')
    def _build_with_photos(self,td,rows,photo_ids):
        import os,subprocess,sys
        from PIL import Image
        work=Path(td);photos=work/'photos';photos.mkdir()
        quality=[]
        for fid in photo_ids:
            path=photos/(fid+'.jpg');Image.new('RGB',(80,80),(238,72,110)).save(path)
            quality.append({'id':fid,'path':str(path),'width':80,'height':80})
        products=sync.products_from_csv(source(rows))
        (work/'products.json').write_bytes(sync.encoded(products));(work/'photo-quality.json').write_text(json.dumps(quality))
        subprocess.run([sys.executable,str(sync.ROOT/'build.py')],env={**os.environ,'CATALOG_WORKDIR':td},check=True,capture_output=True)
        return work,products,[item for item in json.loads((work/'layout.json').read_text()) if 'skus' in item]

    def test_same_photo_different_names_become_one_page_of_tones(self):
        # "GLOSS MIMOSA FRESA/COCO/UVA" con la misma foto = un producto en tres tonos: una sola ficha.
        foto='https://drive.google.com/file/d/gloss/view'
        rows=[row(SKU='SKU-00001',nombre='GLOSS MIMOSA FRESA',imagen_url=foto),row(SKU='SKU-00002',nombre='GLOSS MIMOSA COCO',imagen_url=foto),
              row(SKU='SKU-00003',nombre='GLOSS MIMOSA UVA',imagen_url=foto),
              # misma foto pero nombres sin palabras en común: NO se unen
              row(SKU='SKU-00004',nombre='BROCHA KABUKI',imagen_url='https://drive.google.com/file/d/b/view'),
              row(SKU='SKU-00005',nombre='ESPONJA GOTA',imagen_url='https://drive.google.com/file/d/b/view')]
        with tempfile.TemporaryDirectory() as td:
            work,products,pages=self._build_with_photos(td,rows,['gloss','b'])
            self.assertIn(['SKU-00001','SKU-00002','SKU-00003'],[sorted(x['skus']) for x in pages])
            self.assertIn(['SKU-00004'],[x['skus'] for x in pages]);self.assertIn(['SKU-00005'],[x['skus'] for x in pages])
            report=sync.verify(work,products);self.assertEqual(report['references'],5)
            import fitz
            doc=fitz.open(work/sync.PDF);page=next(x for x in pages if len(x['skus'])==3)
            text=doc[page['page']-1].get_text()
            for tone in ('FRESA','COCO','UVA'):self.assertIn(tone,text)
            self.assertIn('GLOSS MIMOSA',text)

    def test_sku_is_not_visible_but_stays_searchable(self):
        import pikepdf
        foto='https://drive.google.com/file/d/f/view'
        rows=[row(SKU=f'SKU-0000{i}',nombre='LABIAL MATE',tono=t,imagen_url=foto) for i,t in ((1,'Rojo'),(2,'Nude'))]
        with tempfile.TemporaryDirectory() as td:
            work,products,pages=self._build_with_photos(td,rows,['f'])
            with pikepdf.open(work/sync.PDF) as pdf:
                content=pdf.pages[pages[0]['page']-1].Contents.read_bytes()
            # Cada SKU se escribe en modo de texto 3 (invisible) y el modo vuelve a 0 para el resto de la página.
            self.assertEqual(content.count(b'3 Tr'),2);self.assertGreaterEqual(content.count(b'0 Tr'),2)
            report=sync.verify(work,products);self.assertEqual(report['references'],2)

    def test_landing_page_is_mobile_friendly_and_has_download_fallback(self):
        page=(sync.ROOT/sync.DOWNLOAD_PAGE).read_text(encoding='utf-8')
        self.assertIn('name="viewport"',page)
        self.assertIn('href="/ByFly_Catalogo_Download.pdf"',page)
        self.assertIn('download="ByFly_Catalogo.pdf"',page)
        self.assertIn('href="/ByFly_Catalogo.pdf"',page)
        self.assertIn('Ver catálogo',page)
        self.assertIn('Descargar PDF',page)
        self.assertIn('Logotipo oficial de ByFly Makeup',page)
        self.assertIn('Guardar en Archivos',page)
        self.assertIn('Mostrar vista previa',page)
        # Los botones funcionan aunque la página se abra fuera del dominio del catálogo.
        self.assertIn("HOST='catalogo.byfly.com.co'",page)
        # Aviso para el navegador interno de Instagram/Facebook/TikTok, que no abre PDF.
        self.assertIn('id="inapp"',page);self.assertIn('Abrir en Chrome',page);self.assertIn('Copiar enlace',page)
        # Siempre la versión publicada: ?v=<huella> de actualizacion.json.
        self.assertIn('/actualizacion.json',page)

    def test_publish_generated_pdf_bytes_to_both_stable_urls(self):
        from reportlab.pdfgen import canvas
        buf=io.BytesIO();pdf=canvas.Canvas(buf,pagesize=(560,700));pdf.drawString(40,650,'PDF generado y validado');pdf.showPage();pdf.drawString(40,650,'Segunda página');pdf.showPage();pdf.save();generated_pdf=buf.getvalue()
        class Client:
            def __init__(self,fail=False):self.keys=[];self.metadata={};self.http={};self.sizes={};self.bodies={};self.fail=fail
            def put_object(self,**kw):
                if self.fail and kw['Key']==sync.PDF:raise RuntimeError('offline')
                self.keys.append(kw['Key']);self.metadata[kw['Key']]=kw.get('Metadata',{})
                self.http[kw['Key']]={'ContentDisposition':kw.get('ContentDisposition'),'ContentType':kw.get('ContentType')}
                self.sizes[kw['Key']]=len(kw['Body']);self.bodies[kw['Key']]=kw['Body']
            def head_object(self,**kw):return {'Metadata':self.metadata[kw['Key']],'ContentLength':self.sizes[kw['Key']],**self.http[kw['Key']]}
        with tempfile.TemporaryDirectory() as td:
            w=Path(td);(w/sync.PDF).write_bytes(generated_pdf)
            state={'fingerprint':'abc','references':14}
            c=Client();sync.publish(c,'bucket',w,state)
            self.assertEqual(c.keys,['versions/abc.pdf',sync.PDF,sync.DOWNLOAD_PDF,sync.DOWNLOAD_PAGE,sync.STATE])
            self.assertTrue(c.http[sync.PDF]['ContentDisposition'].startswith('inline'))
            self.assertTrue(c.http[sync.DOWNLOAD_PDF]['ContentDisposition'].startswith('attachment'))
            self.assertEqual(c.http[sync.DOWNLOAD_PAGE]['ContentType'],'text/html; charset=utf-8')
            self.assertEqual(c.bodies[sync.PDF],generated_pdf)
            self.assertEqual(c.bodies[sync.DOWNLOAD_PDF],generated_pdf)
            self.assertEqual(state['pdf_sha256'],sync.digest(generated_pdf))
            c=Client(True)
            with self.assertRaises(RuntimeError):sync.publish(c,'bucket',w,{'fingerprint':'abc','references':14},generated_pdf)
            self.assertNotIn(sync.STATE,c.keys)
    def test_no_change_skips_render_and_upload(self):
        with tempfile.TemporaryDirectory() as td,patch('sys.argv',['sync','--workdir',td]),patch('sync.s3_client'),patch('sync.read_state',return_value={'references':1,'fingerprint':'constant'}),patch('sync.fetch',return_value=source([row()])),patch('sync.inspect_photos',return_value=([],{})),patch('sync.digest',return_value='constant'),patch('sync.download_photos') as download,patch('sync.published_matches',return_value=True),patch('sync.publish') as publish:
            sync.main();download.assert_not_called();publish.assert_not_called()
    def test_invalid_source_never_publishes(self):
        with tempfile.TemporaryDirectory() as td,patch('sys.argv',['sync','--workdir',td]),patch('sync.s3_client'),patch('sync.read_state',return_value={}),patch('sync.fetch',return_value=source([row(SKU='')])),patch('sync.publish') as publish:
            with self.assertRaises(ValueError):sync.main()
            publish.assert_not_called()
    def test_deleted_publication_is_not_skipped(self):
        class Missing(Exception):response={'Error':{'Code':'404'}}
        class Client:
            def head_object(self,**kw):raise Missing()
        self.assertFalse(sync.published_matches(Client(),'bucket',{}))
    def test_missing_download_object_forces_republication(self):
        class MissingDownload(Exception):
            response={'Error':{'Code':'NoSuchKey'}}
        class Client:
            def head_object(self,**kw):
                if kw['Key']==sync.DOWNLOAD_PDF:raise MissingDownload()
                return {'ContentLength':100,'Metadata':{'sha256':'same'},'ContentDisposition':'inline'}
        self.assertFalse(sync.published_matches(Client(),'bucket',{'pdf_sha256':'same'}))

    def test_retry_image_download(self):
        class Response:
            def __enter__(self):return self
            def __exit__(self,*args):pass
            def read(self):return b'ok'
        with patch('sync.urllib.request.urlopen',side_effect=[OSError(),Response()]),patch('sync.time.sleep'):
            self.assertEqual(sync.fetch('https://example.com'),b'ok')
    def test_generated_pdf_passes_strict_validation(self):
        # MuPDF y poppler toleran errores que Adobe y los visores móviles rechazan: se valida con qpdf.
        import os,subprocess,sys
        import pdf_guard
        with tempfile.TemporaryDirectory() as td:
            work=Path(td)
            products=sync.products_from_csv(source([row(SKU=f'SKU-{i:05}',nombre=f'Producto {i}') for i in range(1,9)]))
            (work/'products.json').write_bytes(sync.encoded(products));(work/'photo-quality.json').write_text('[]')
            subprocess.run([sys.executable,str(sync.ROOT/'build.py')],env={**os.environ,'CATALOG_WORKDIR':td},check=True,capture_output=True)
            problems,info=pdf_guard.inspect(str(work/sync.PDF))
            self.assertEqual(problems,[]);self.assertGreater(info['pages'],1)

    def test_publish_rejects_pdf_with_syntax_errors(self):
        from reportlab.pdfgen import canvas
        buf=io.BytesIO();c=canvas.Canvas(buf,pagesize=(560,700))
        c._doc.Catalog.PageLayout='SinglePage'  # texto plano a propósito: genera "/PageLayout SinglePage" (sin barra)
        c.drawString(40,650,'a');c.showPage();c.drawString(40,650,'b');c.showPage();c.save()
        class Client:
            def __init__(self):self.keys=[]
            def put_object(self,**kw):self.keys.append(kw['Key'])
        with tempfile.TemporaryDirectory() as td:
            w=Path(td);(w/sync.PDF).write_bytes(buf.getvalue());client=Client()
            with self.assertRaisesRegex(ValueError,'validación estricta'):sync.publish(client,'bucket',w,{'fingerprint':'abc','references':2})
            self.assertEqual(client.keys,[])

    def test_capilar_category_is_classified_as_cabello(self):
        # Se espía categories.category() para que la prueba no dependa de las reglas internas de categories.py:
        # lo que se comprueba es que "Capilar" llega ya traducido a "Cabello" y que la hoja original se conserva.
        seen=[]
        def spy(p):seen.append(p['category']);return p['category'],'prueba'
        with patch.object(sync,'category',spy):
            p=sync.products_from_csv(source([row(categoria='Capilar',nombre='SHAMPOO MIEL ROSADA')]))[0]
        self.assertEqual(seen,['Cabello']);self.assertEqual(p['category'],'Cabello');self.assertEqual(p['source_category'],'Capilar')

    def test_placeholder_cells_do_not_stop_the_catalog(self):
        # Caso real (12/11): SKU-00240 llegó con "-" en una celda numérica y detuvo todo el flujo.
        rows=[row(SKU='SKU-00001'),row(SKU='SKU-00002',categoria='',precio_detal='-',precio_mayor='-',stock='-'),
              row(SKU='SKU-00003',stock='-'),row(SKU='SKU-00004',precio_mayor='#VALUE!')]
        products=sync.products_from_csv(source(rows))
        self.assertEqual([p['sku'] for p in products],['SKU-00001','SKU-00003']);self.assertEqual(products[1]['stock'],0);self.assertFalse(products[1]['available'])
        with self.assertRaisesRegex(ValueError,'sin precio válido'):
            sync.products_from_csv(source([row(SKU='SKU-00001')]+[row(SKU=f'SKU-{i:05}',precio_detal='-') for i in range(2,9)]))
        with self.assertRaises(ValueError):sync.products_from_csv(source([row(SKU='SKU-00001'),row(SKU='SKU-00002',precio_detal='abc')]))

if __name__=='__main__':unittest.main()
