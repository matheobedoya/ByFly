import unicodedata,re
def norm(s):return ''.join(c for c in unicodedata.normalize('NFD',s.upper().strip()) if unicodedata.category(c)!='Mn')
def category(x):
 n=norm(x['name']);old=x['category']
 if n.startswith('RUBOR') and old!='Combos':return 'Rostro','Rubor facial: agrupar en Rostro'
 # Overrides by product function, not origin. Preserve specialized kits in their functional category.
 if n=='MALTEADA BRONCEADORA TOY STORY':return 'Cuidado corporal','Trendy la clasifica como Body Shine en Cuidado corporal: https://www.maquillajetrendyshop.com/cuidado-de-la-piel/corporal/'
 if old=='Corporal':return 'Cuidado corporal','Unificación de Corporal y Cuidado corporal'
 if old=='Importados':
  if any(w in n for w in ['LIP','LABIOS','GLOSS']):return 'Labios','Clasificación por uso; conserva etiqueta Importado'
  if 'RUBOR' in n:return 'Rostro','Clasificación por uso; conserva etiqueta Importado'
  if 'FIJADOR' in n:return 'Preparación y fijación','Clasificación por uso; conserva etiqueta Importado'
  if 'KIT' in n:return 'Combos','Set corporal; conserva etiqueta Importado'
  return 'Cuidado corporal','Clasificación por uso; conserva etiqueta Importado'
 if n=='SPLASH CAPILAR':return 'Cabello','Producto capilar'
 if old=='Accesorios' and (n.startswith('CEPILLO') or n.startswith('PEINILLA') or n=='MONOS DE BARBIE'):return 'Cabello','Implemento para el cabello'
 if old=='Accesorios' and 'BEAUTY BLENDER' in n:return 'Brochas y esponjas','Esponja de maquillaje'
 if old=='Skincare':
  if 'FIJADOR' in n or n.startswith('PRIMER') or n in ['BLOOM MIST FIX HIDRATANTE','OIL CONTROL']:return 'Preparación y fijación','Preparación o fijación de maquillaje'
  if n=='LIMPIADOR BROCHAS':return 'Brochas y esponjas','Limpieza de herramientas de maquillaje'
  if n=='CREMA DE MANOS ICE CREAM':return 'Cuidado corporal','Cuidado de manos'
  if n in ['SERUM DE PESTANAS','SERUM DE CEJAS','PEGA DE PESTANAS DUO']:return 'Ojos y cejas','Uso en pestañas o cejas'
  if n in ['POMOS X100','POMOS X180','ALGODON','POMO ESPONJA LIMPIADORA ENGOL']:return 'Accesorios','Implemento de limpieza o aplicación'
 if old=='Piel' and (n.startswith('SOMBRA') or n=='PALETA PARTY GLITTER'):return 'Ojos y cejas','Sombra o paleta para ojos'
 if old=='Cuidado corporal' and ('KIT' in n or 'COMBO' in n):return 'Combos','Set de varios productos corporales'
 if old=='Brochas' and 'CORRECTOR' in n and n.startswith('KIT'):return 'Combos','Kit mixto de maquillaje y herramienta'
 if old=='Labios' and n=='BLOOM ME ESPEJO DE CORAZON BLOOMSHELL':return 'Labios','Brillo hidratante con espejo: https://cocopinkstore.com/products/bloom-mocha-espejo-corazon-brillo-hidratante-bloomshell-copia'
 mapping={'Piel':'Rostro','Ojos':'Ojos y cejas','Brochas':'Brochas y esponjas'}
 return mapping.get(old,old),'Categoría acorde al uso indicado por el nombre' if old not in mapping else 'Nombre de categoría normalizado según su contenido'


def product_order(p):
 """Keep product types together, then alphabetical by name and brand."""
 n=norm(p['name'])
 priorities={
  'Rostro':('BASE','CORRECTOR','POLVO','RUBOR','CONTORNO','BRONCEADOR','ILUMINADOR'),
  'Preparación y fijación':('PRIMER','PREBASE','FIJADOR','MIST'),
  'Ojos y cejas':('SOMBRA','PALETA','DELINEADOR','PESTAN','RIMEL','MASCARA','CEJAS'),
  'Labios':('LABIAL','GLOSS','BRILLO','TINTA','DELINEADOR','BALSAMO'),
  'Skincare':('LIMPIADOR','DESMAQUILLANTE','TONICO','SERUM','CREMA','MASCARILLA','PROTECTOR'),
 }
 terms=priorities.get(p['category'],())
 rank=next((i for i,t in enumerate(terms) if t in n),len(terms))
 tone_key=tuple((0,int(t)) if t.isdigit() else (1,t) for t in re.split(r'(\d+)',norm(p['tone'])) if t)
 return rank,n,norm(p['brand']),tone_key,p['sku']
