import csv,io,json,tempfile,unittest
from pathlib import Path
from unittest.mock import patch
import sync
HEADERS=['SKU','nombre','marca','categoria','precio_detal','precio_mayor','stock','disponible','imagen_url','Nuevo']
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
    def test_family_picture_only_same_category(self):
        url='https://drive.google.com/file/d/abc/view'
        p=sync.products_from_csv(source([row(imagen_url=url),row(SKU='SKU-00002'),row(SKU='SKU-00003',categoria='Labios')]))
        self.assertEqual(p[1]['family_images'],['abc']);self.assertEqual(p[2]['family_images'],[])
    def test_verify_empty_news_and_large_family(self):
        import os,subprocess,sys
        with tempfile.TemporaryDirectory() as td:
            work=Path(td);p=sync.products_from_csv(source([row(SKU=f'SKU-{i:05}') for i in range(1,15)]))
            (work/'products.json').write_bytes(sync.encoded(p));(work/'photo-quality.json').write_text('[]')
            subprocess.run([sys.executable,str(sync.ROOT/'build.py')],env={**os.environ,'CATALOG_WORKDIR':td},check=True,capture_output=True)
            report=sync.verify(work,p);self.assertEqual(report['references'],14);self.assertEqual(report['pages'],9)
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
    def test_publish_order_and_failure_keeps_manifest(self):
        class Client:
            def __init__(self,fail=False):self.keys=[];self.metadata={};self.fail=fail
            def put_object(self,**kw):
                if self.fail and kw['Key']==sync.PDF:raise RuntimeError('offline')
                self.keys.append(kw['Key']);self.metadata[kw['Key']]=kw.get('Metadata',{})
            def head_object(self,**kw):return {'Metadata':self.metadata[kw['Key']]}
        with tempfile.TemporaryDirectory() as td:
            w=Path(td);(w/sync.PDF).write_bytes(b'verified-pdf');state={'fingerprint':'abc'}
            c=Client();sync.publish(c,'bucket',w,state);self.assertEqual(c.keys,['versions/abc.pdf',sync.PDF,sync.STATE])
            c=Client(True)
            with self.assertRaises(RuntimeError):sync.publish(c,'bucket',w,state)
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
    def test_retry_image_download(self):
        class Response:
            def __enter__(self):return self
            def __exit__(self,*args):pass
            def read(self):return b'ok'
        with patch('sync.urllib.request.urlopen',side_effect=[OSError(),Response()]),patch('sync.time.sleep'):
            self.assertEqual(sync.fetch('https://example.com'),b'ok')
if __name__=='__main__':unittest.main()
