"""Prueba con la forma REAL de la hoja de ByFly (exportación pública del 12/11/2026).

Qué se toma de la hoja real:
  * El encabezado exacto, con la columna sin nombre (K) y la columna precio_costo que la exportación pública incluye.
  * Las últimas 42 referencias (SKU-00880 a SKU-00921), que incluyen los productos nuevos, la categoría "Capilar"
    (una fila con espacio al final: "Capilar "), marcas vacías y las novedades más recientes.
Los nombres y tonos son una transcripción aproximada de esas filas (sirven para probar la lógica, no como texto oficial).
Los costos NO se copian: se usa un valor centinela para comprobar que precio_costo nunca llega al PDF ni a los archivos.
Para actualizar esta prueba con la hoja nueva basta con cambiar la lista FILAS."""
import csv,io,json,os,subprocess,sys,tempfile,unittest
from pathlib import Path
from unittest.mock import patch
import sync
import pdf_guard

ENCABEZADO=['nombre','marca','categoria','precio_detal','precio_mayor','imagen_url','imagen_url2','imagen_url3','tono','surtido','',
            'disponible','stock','precio_costo','SKU','Descripcion','Img4','Img5','Img6','Tipo_combo','Archivado_combo']
CENTINELA='COSTO-SECRETO-123'
# (número de SKU, nombre, marca, categoría tal como la escribe la hoja, detal, mayor, stock, tono)
FILAS=[
    (880,'RUBOR X3 PRETTY BLUSH','PURPURE','Piel',24000,19400,2,'tono 4'),
    (881,'SPLASH IMPORTADO PURPURE','PURPURE','Cuidado corporal',26000,19900,6,'MARACUYAZO'),
    (882,'SPLASH IMPORTADO PURPURE','PURPURE','Cuidado corporal',26000,19900,3,'CHOCOVIBES'),
    (883,'BRILLO LABIAL/BLOOM AQUA KISS','BLOOMSHELL','Labios',18000,10500,21,'Tono 01'),
    (884,'BRILLO LABIAL/BLOOM AQUA KISS','BLOOMSHELL','Labios',18000,10500,19,'Tono 02'),
    (885,'BLOOM MULTIGEL FACE PRIMER','BLOOMSHELL','Skincare',24000,15500,3,''),
    (886,'POLVO SUELTO/BLOOM X 2','BLOOMSHELL','Piel',38000,29500,1,'Natural/Canela'),
    (887,'POLVO SUELTO/BLOOM X 2','BLOOMSHELL','Piel',38000,29500,4,'Peach/Pink'),
    (888,'POLVO SUELTO/BLOOM X 2','BLOOMSHELL','Piel',38000,29500,10,'White/Natural'),
    (889,'POLVO SUELTO/BLOOM X 2','BLOOMSHELL','Piel',38000,29500,3,'Mate Pink/Luminoso'),
    (890,'BLOOM CREAM/BLOOM JELLY GLOW','BLOOMSHELL','Piel',20000,14500,10,'Sonrojadita'),
    (891,'BLOOM CREAM/BLOOM JELLY GLOW','BLOOMSHELL','Piel',20000,14500,6,'Coqueta'),
    (892,'BLOOM COSMIC [BL-BIC303]','BLOOMSHELL','Piel',32000,25000,9,''),
    (893,'BORLA TERCIOPELO [BL-B107]','BLOOMSHELL','Brochas',6000,3500,9,''),
    (894,'KIT CARTUCHERA SECRET CRUSH','PURPURE','Cuidado corporal',38000,28400,4,''),
    (895,'ENCRESPADOR RADIANTE ANIK','ANI-K','Accesorios',15000,11500,2,''),
    (896,'KIT BROCHAS KABUKI X10','','Brochas',20000,15000,1,''),
    (897,'RUBOR DUO VIBRANT','ENCHANTE','Piel',38000,26000,1,'Rose Rush'),
    (898,'RUBOR DUO VIBRANT','ENCHANTE','Piel',38000,26000,1,'Peach Glow'),
    (899,'RUBOR DUO VIBRANT','ENCHANTE','Piel',38000,26000,1,'Soft Kiss'),
    (900,'BASE MY FOUNDATION','BLOOMSHELL','Piel',35000,25500,1,'4,8'),
    (901,'BASE MY FOUNDATION','BLOOMSHELL','Piel',35000,25500,2,'4,5'),
    (902,'POLVO COMPACTO SOFT','BLOOMSHELL','Piel',32000,24500,2,'Tono 01'),
    (903,'POLVO COMPACTO SOFT','BLOOMSHELL','Piel',32000,24500,3,'Tono 02'),
    (904,'POLVO COMPACTO SOFT','BLOOMSHELL','Piel',32000,24500,2,'Tono 03'),
    (905,'PESTAÑINA FLASH LASH ANIK','ANI-K','Ojos',24000,18000,2,''),
    (906,'PESTAÑINA ETERNAL LASH ANIK','ANI-K','Ojos',24000,18000,1,''),
    (907,'PERFUME PARA EL CABELLO CLICK HAIR','CLICK HAIR','Capilar',39900,32000,2,'Vainila'),
    (908,'PERFUME PARA EL CABELLO CLICK HAIR','CLICK HAIR','Capilar',39900,32000,3,'Seduction'),
    (909,'PERFUME PARA EL CABELLO CLICK HAIR','CLICK HAIR','Capilar',39900,32000,2,'Tropical'),
    (910,'MINI PERFUME PEQUEÑO MILAGROS','MILAGROS','Capilar',12900,10000,4,'Martina'),
    (911,'MINI PERFUME PEQUEÑO MILAGROS','MILAGROS','Capilar',12900,10000,2,'Bali'),
    (912,'ACONDICIONADOR MIEL ROSADA LLUVIA ESTRELLAS','LLUVIA ESTRELLAS','Capilar',37900,31000,1,''),
    (913,'SHAMPOO MIEL ROSADA LLUVIA ESTRELLAS','LLUVIA ESTRELLAS','Capilar ',37900,31000,1,''),
    (914,'MIEL ROSADA PARA CABELLO LLUVIA ESTRELLAS','LLUVIA ESTRELLAS','Capilar',41900,35000,2,''),
    (915,'PESTAÑINA AMOR A PRIMERA VISTA','VOGUE','Ojos',25000,25000,2,''),
    (916,'AGUA MICELAR GRANDE','GARNIER','Skincare',32500,32500,2,''),
    (917,'KIT ACCESORIOS SKINCARE COMPLETO','','Accesorios',28000,18000,12,''),
    (918,'CEPILLO CEREZO','','Accesorios',18000,13500,2,''),
    (919,'CEPILLO MOÑO ROSADO','','Accesorios',18000,13500,2,''),
    (920,'CEPILLO MOÑO GATO MINI','','Accesorios',15000,10900,2,''),
    (921,'SPLASH MINI ROSAS','','Cuidado corporal',12000,10500,1,''),
]

def hoja():
    f=io.StringIO();w=csv.writer(f);w.writerow(ENCABEZADO)
    for n,nombre,marca,cat,detal,mayor,stock,tono in FILAS:
        fila=dict.fromkeys(ENCABEZADO,'')
        fila.update(nombre=nombre,marca=marca,categoria=cat,precio_detal=detal,precio_mayor=mayor,tono=tono,
                    disponible='si' if stock>0 else 'no',stock=stock,precio_costo=CENTINELA,SKU=f'SKU-{n:05}')
        w.writerow([fila[c] for c in ENCABEZADO])
    return f.getvalue().encode()

class HojaRealTests(unittest.TestCase):
    def test_hoja_real_se_lee_completa_y_sin_costos(self):
        productos=sync.products_from_csv(hoja())
        self.assertEqual(len(productos),42);self.assertEqual(productos[-1]['sku'],'SKU-00921')
        self.assertTrue(all('precio_costo' not in p for p in productos))
        self.assertNotIn(CENTINELA,json.dumps(productos))
        self.assertTrue(all(p['retail']>0 and p['wholesale']>0 for p in productos))

    def test_capilar_incluida_la_variante_con_espacio_llega_como_cabello(self):
        vistos={}
        def espia(p):vistos[p['sku']]=p['category'];return p['category'],'prueba'
        with patch.object(sync,'category',espia):
            productos=sync.products_from_csv(hoja())
        capilares=[f'SKU-{n:05}' for n in range(907,915)]
        self.assertEqual([vistos[s] for s in capilares],['Cabello']*8)
        self.assertEqual({p['source_category'] for p in productos if p['sku'] in capilares},{'Capilar'})

    def test_pdf_de_la_hoja_real_novedades_y_validacion_estricta(self):
        with tempfile.TemporaryDirectory() as td:
            work=Path(td);productos=sync.products_from_csv(hoja())
            (work/'products.json').write_bytes(sync.encoded(productos));(work/'photo-quality.json').write_text('[]')
            subprocess.run([sys.executable,str(sync.ROOT/'build.py')],env={**os.environ,'CATALOG_WORKDIR':td},check=True,capture_output=True)
            problemas,info=pdf_guard.inspect(str(work/sync.PDF))
            self.assertEqual(problemas,[])
            informe=sync.verify(work,productos)
            self.assertEqual(informe['references'],42);self.assertEqual(informe['news_families'],6)
            self.assertEqual(informe['latest_news_skus'],['SKU-00921','SKU-00920','SKU-00919','SKU-00918','SKU-00917','SKU-00916'])
            import fitz
            texto=' '.join(p.get_text() for p in fitz.open(work/sync.PDF))
            self.assertNotIn(CENTINELA,texto)

if __name__=='__main__':unittest.main()
