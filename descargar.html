#!/usr/bin/env python3
"""
pdf_guard.py - validación estricta y reparación mínima del catálogo PDF de ByFly.

Por qué existe
--------------
build.py escribía el Catalog del PDF con `Catalog.PageLayout='SinglePage'` (texto plano), lo que
produce `/PageLayout SinglePage` SIN barra. MuPDF/PyMuPDF y poppler lo toleran, por eso `verify()`
y el workflow en verde no lo detectaban, pero qpdf lo marca como error de sintaxis y Adobe y varios
visores móviles tratan el archivo como dañado. Este módulo valida con qpdf (vía pikepdf) antes de
publicar y también puede probar los enlaces públicos tal como los ve la cliente.

Uso en línea de comandos
------------------------
  python pdf_guard.py ARCHIVO.pdf          # valida; código de salida 1 si hay problemas
  python pdf_guard.py ARCHIVO.pdf --fix    # repara lo reparable (modifica el archivo) y revalida
  python pdf_guard.py ARCHIVO.pdf --fast   # además lo deja "linealizado" (vista web rápida)
  python pdf_guard.py --public https://catalogo.byfly.com.co [--expect-sha256 HASH]
                                           # prueba lo que ve el público: ambos PDF y descargar.html

Uso desde sync.py
-----------------
  guard = pdf_guard.finalize(work / PDF)            # repara si hace falta; lanza PdfGuardError si no es seguro publicar
  pdf_guard.linearize(work / PDF)                   # vista web rápida: el visor muestra la portada sin esperar los ~30 MB
  problems, _ = pdf_guard.inspect_bytes(pdf_bytes)  # validación sin tocar el archivo (se usa en publish)
"""
import argparse
import hashlib
import os
import sys
import tempfile
import urllib.error
import urllib.request

try:
    import pikepdf
except ImportError as exc:  # pragma: no cover - mensaje claro en vez de un traceback críptico
    raise ImportError("Falta la librería pikepdf. Agrega la línea 'pikepdf' a catalog-automation/requirements.txt "
                      "(o al paso de instalación de dependencias del workflow).") from exc

PAGE_LAYOUTS = {"SinglePage", "OneColumn", "TwoColumnLeft", "TwoColumnRight",
                "TwoPageLeft", "TwoPageRight"}
PAGE_MODES = {"UseNone", "UseOutlines", "UseThumbs", "FullScreen", "UseOC", "UseAttachments"}
# Entradas del Catalog cuyo valor DEBE ser un nombre PDF (con barra).
_NAME_KEYS = {"PageLayout": PAGE_LAYOUTS, "PageMode": PAGE_MODES}
_FATAL_PREFIXES = ("no empieza", "falta %%EOF", "no se puede abrir")


class PdfGuardError(RuntimeError):
    """El PDF no es seguro de publicar."""


def sha256_file(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def inspect(path):
    """Revisa el PDF sin modificarlo. Devuelve (problemas, info)."""
    size = os.path.getsize(path)
    problems, info = [], {"bytes": size}
    with open(path, "rb") as f:
        head = f.read(8)
        f.seek(max(0, size - 2048))
        tail = f.read()
    if not head.startswith(b"%PDF-"):
        problems.append("no empieza con %PDF- (¿HTML de error u otro archivo?)")
        return problems, info
    if b"%%EOF" not in tail:
        problems.append("falta %%EOF al final (archivo truncado o incompleto)")
    try:
        pdf = pikepdf.open(path)
    except Exception as exc:  # noqa: BLE001 - cualquier fallo de apertura es un problema
        problems.append(f"no se puede abrir: {exc}")
        return problems, info
    with pdf:
        # Avisos que qpdf emite al abrir (p. ej. "unknown token while reading object").
        open_warnings = list(pdf.get_warnings())
        info["pages"] = len(pdf.pages)
        info["linearized"] = bool(getattr(pdf, "is_linearized", False))
        if pdf.is_encrypted:
            problems.append("el PDF está cifrado")
        if info["pages"] < 1:
            problems.append("el PDF no tiene páginas")
        root = pdf.Root
        for key, valid in _NAME_KEYS.items():
            pkey = "/" + key  # en pikepdf las claves de diccionario llevan barra
            if pkey not in root:
                continue
            value = root[pkey]
            if not isinstance(value, pikepdf.Name):
                problems.append(f"Catalog /{key} no es un nombre PDF con barra (valor: {value!r})")
            elif str(value)[1:] not in valid:
                problems.append(f"Catalog /{key} tiene un valor no válido: {value}")
        # check_pdf_syntax en pikepdf 10.x; check en versiones anteriores.
        syntax_check = getattr(pdf, "check_pdf_syntax", None) or getattr(pdf, "check")
        for message in open_warnings + list(syntax_check()):
            problems.append(f"qpdf: {message}")
    return problems, info


def inspect_bytes(raw):
    """Igual que inspect(), pero sobre los bytes (se usa justo antes de publicar)."""
    fd, tmp = tempfile.mkstemp(suffix=".pdf")
    try:
        with os.fdopen(fd, "wb") as f:
            f.write(raw)
        return inspect(tmp)
    finally:
        if os.path.exists(tmp):
            os.remove(tmp)


def repair(src, dst):
    """Corrige las entradas del Catalog que deben ser nombres y guarda en dst."""
    with pikepdf.open(src) as pdf:
        root = pdf.Root
        for key, valid in _NAME_KEYS.items():
            pkey = "/" + key
            if pkey not in root:
                continue
            value = root[pkey]
            if isinstance(value, pikepdf.String):
                name = str(value)
            elif isinstance(value, pikepdf.Name):
                name = str(value)[1:]
            else:
                name = None
            if name in valid:
                root[pkey] = pikepdf.Name("/" + name)
            else:
                del root[pkey]
        pdf.save(dst)


def finalize(path):
    """Garantiza que `path` sea un PDF estrictamente válido; si no, lo repara.

    Lanza PdfGuardError si el archivo no se puede dejar válido (no publicar).
    Devuelve {'bytes', 'pages', 'sha256', 'repaired'}.
    """
    path = str(path)
    problems, info = inspect(path)
    repaired = False
    if problems:
        # Un archivo que no es PDF o está truncado no se "arregla": se rechaza.
        if any(p.startswith(_FATAL_PREFIXES) for p in problems):
            raise PdfGuardError("PDF inutilizable: " + "; ".join(problems))
        fd, tmp = tempfile.mkstemp(suffix=".pdf", dir=os.path.dirname(os.path.abspath(path)))
        os.close(fd)
        try:
            repair(path, tmp)
            new_problems, new_info = inspect(tmp)
            if new_problems:
                raise PdfGuardError("PDF no reparable: " + "; ".join(new_problems))
            if new_info.get("pages") != info.get("pages"):
                raise PdfGuardError("La reparación cambió el número de páginas; se descarta")
            os.replace(tmp, path)
            tmp = None
            repaired = True
        finally:
            if tmp and os.path.exists(tmp):
                os.remove(tmp)
        info = inspect(path)[1]
    info["sha256"] = sha256_file(path)
    info["repaired"] = repaired
    return info


def linearize(path):
    """Guarda el PDF "linealizado" (en Adobe: "Vista web rápida").

    El contenido no cambia (mismas páginas, textos, fotos y enlaces); solo se reordena el archivo para que
    la portada y las primeras páginas se puedan mostrar antes de terminar de bajar el PDF completo. Con un
    catálogo de ~30 MB eso evita la pantalla en blanco en celulares con datos lentos.

    Es una mejora opcional: si algo falla, el archivo original queda intacto y se devuelve False.
    Devuelve True solo si el archivo quedó linealizado y pasa la validación estricta.
    """
    path = str(path)
    try:
        with pikepdf.open(path) as pdf:
            if getattr(pdf, "is_linearized", False):
                return True
            pages = len(pdf.pages)
    except Exception:  # noqa: BLE001
        return False
    fd, tmp = tempfile.mkstemp(suffix=".pdf", dir=os.path.dirname(os.path.abspath(path)))
    os.close(fd)
    try:
        with pikepdf.open(path) as pdf:
            pdf.save(tmp, linearize=True)
        problems, info = inspect(tmp)
        if problems or info.get("pages") != pages or not info.get("linearized"):
            return False
        os.replace(tmp, path)
        tmp = None
        return True
    except Exception:  # noqa: BLE001 - nunca detener la publicación por esta mejora
        return False
    finally:
        if tmp and os.path.exists(tmp):
            os.remove(tmp)


# ----------------------------------------------------------------- prueba pública
def _get(url, headers=None):
    req = urllib.request.Request(url, headers={"User-Agent": "byfly-pdf-guard/1.0", **(headers or {})})
    try:
        with urllib.request.urlopen(req, timeout=180) as r:
            return r.status, {k.lower(): v for k, v in r.headers.items()}, r.read()
    except urllib.error.HTTPError as e:
        return e.code, {k.lower(): v for k, v in e.headers.items()}, e.read()


def check_public(base, expect_sha256=None):
    """Prueba los enlaces públicos tal como los ve la cliente. Devuelve (problemas, avisos)."""
    base = base.rstrip("/")
    problems, warnings, hashes = [], [], {}
    targets = {"ver": ("/ByFly_Catalogo.pdf", False), "descargar": ("/ByFly_Catalogo_Download.pdf", True)}
    for label, (path, is_download) in targets.items():
        url = base + path
        status, headers, body = _get(url)
        if status != 200:
            problems.append(f"[{label}] {url} respondió HTTP {status}")
            continue
        ctype = headers.get("content-type", "")
        if not ctype.startswith("application/pdf"):
            problems.append(f"[{label}] Content-Type es '{ctype}', debe ser application/pdf")
        disp = headers.get("content-disposition", "").lower()
        if is_download and "attachment" not in disp:
            problems.append(f"[{label}] Content-Disposition debe ser attachment (es '{disp}')")
        if not is_download and "attachment" in disp:
            problems.append(f"[{label}] Content-Disposition no debe ser attachment para poder verlo en el navegador")
        file_problems, info = inspect_bytes(body)
        problems += [f"[{label}] {p}" for p in file_problems]
        hashes[label] = hashlib.sha256(body).hexdigest()
        print(f"[{label}] HTTP 200, {len(body):,} bytes, {info.get('pages', '?')} páginas, "
              f"{'apertura rápida' if info.get('linearized') else 'sin apertura rápida'}, sha256 {hashes[label][:16]}…")
    if len(set(hashes.values())) > 1:
        problems.append("los dos PDF públicos NO tienen los mismos bytes: " + str(hashes))
    if expect_sha256 and hashes and any(h != expect_sha256 for h in hashes.values()):
        # Aviso y no error: la caché pública (max-age=300) puede tardar hasta 5 minutos en mostrar la versión nueva.
        warnings.append("el enlace público aún no muestra el PDF recién publicado (esperado "
                        f"{expect_sha256[:16]}…); si persiste después de 5 minutos, revisa la caché de Cloudflare")
    status, headers, first = _get(base + targets["ver"][0], {"Range": "bytes=0-1023"})
    if status != 206:
        warnings.append(f"el visor pidió Range y recibió HTTP {status} (no 206); algunos visores móviles lo necesitan")
    # descargar.html añade ?v=<huella> a los enlaces para saltarse copias en caché. Debe entregar el mismo archivo.
    status, headers, versioned = _get(base + targets["ver"][0] + "?v=pdfguard", {"Range": "bytes=0-1023"})
    if status not in (200, 206) or versioned[:1024] != first[:1024]:
        warnings.append(f"/ByFly_Catalogo.pdf?v=… respondió HTTP {status} o con otro contenido; la página seguirá "
                        "usando los enlaces sin ?v= (funcionan igual)")
    status, _, body = _get(base + "/descargar.html")
    if status != 200:
        problems.append(f"descargar.html respondió HTTP {status}")
    else:
        text = body.decode("utf-8", "replace")
        for needle in ("/ByFly_Catalogo.pdf", "/ByFly_Catalogo_Download.pdf"):
            if needle not in text:
                problems.append(f"descargar.html no referencia {needle}")
    return problems, warnings


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("pdf", nargs="?", help="ruta del PDF a validar")
    ap.add_argument("--fix", action="store_true", help="reparar lo reparable (modifica el archivo)")
    ap.add_argument("--fast", action="store_true", help="con --fix: dejarlo linealizado (vista web rápida)")
    ap.add_argument("--public", metavar="BASE_URL", help="probar los enlaces públicos, p. ej. https://catalogo.byfly.com.co")
    ap.add_argument("--expect-sha256", metavar="HASH", help="con --public: avisa si el enlace no muestra este PDF")
    args = ap.parse_args(argv)
    if args.public:
        problems, warnings = check_public(args.public, args.expect_sha256)
        for w in warnings:
            print("AVISO:", w)
        for p in problems:
            print("ERROR:", p)
        print("RESULTADO:", "FALLA" if problems else "OK")
        return 1 if problems else 0
    if not args.pdf:
        ap.error("indica un PDF o usa --public")
    if args.fix:
        try:
            info = finalize(args.pdf)
        except PdfGuardError as exc:
            print("ERROR:", exc)
            return 1
        fast = linearize(args.pdf) if args.fast else None
        print(f"OK ({'reparado' if info['repaired'] else 'sin cambios'}"
              f"{', apertura rápida' if fast else ''}): {info['pages']} páginas, "
              f"{os.path.getsize(args.pdf):,} bytes, sha256 {sha256_file(args.pdf)}")
        return 0
    problems, info = inspect(args.pdf)
    for p in problems:
        print("ERROR:", p)
    if not problems:
        print(f"OK: {info['pages']} páginas, {info['bytes']:,} bytes, sha256 {sha256_file(args.pdf)}")
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main())
