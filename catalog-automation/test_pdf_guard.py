"""Pruebas de pdf_guard. Se ejecutan con el resto: python -m unittest discover -s catalog-automation -p 'test_*.py'"""
import os
import tempfile
import threading
import unittest
from http.server import BaseHTTPRequestHandler, HTTPServer
from unittest import mock

import pikepdf
from reportlab.pdfgen import canvas

import pdf_guard


def make_pdf(path, pages=3, bare_page_layout=False):
    """Crea un PDF pequeño con ReportLab. bare_page_layout=True reproduce el defecto real:
    asignar un texto plano a Catalog.PageLayout hace que ReportLab escriba `/PageLayout SinglePage`."""
    c = canvas.Canvas(path, pagesize=(560, 700))
    if bare_page_layout:
        c._doc.Catalog.PageLayout = "SinglePage"  # MAL: texto plano -> sin barra
    else:
        c._doc.Catalog.setPageLayout("SinglePage")  # BIEN: nombre PDF -> /SinglePage
    for i in range(pages):
        c.drawString(50, 650, f"Pagina {i + 1} SKU-{i + 1:05d}")
        c.showPage()
    c.save()
    return path


class GuardFileTests(unittest.TestCase):
    def setUp(self):
        self.dir = tempfile.TemporaryDirectory()
        self.addCleanup(self.dir.cleanup)

    def p(self, name):
        return os.path.join(self.dir.name, name)

    def test_valid_pdf_has_no_problems(self):
        path = make_pdf(self.p("ok.pdf"))
        problems, info = pdf_guard.inspect(path)
        self.assertEqual(problems, [])
        self.assertEqual(info["pages"], 3)

    def test_bare_page_layout_is_detected(self):
        path = make_pdf(self.p("bad.pdf"), bare_page_layout=True)
        with open(path, "rb") as f:
            self.assertIn(b"/PageLayout SinglePage", f.read())  # confirma que el defecto existe
        problems, _ = pdf_guard.inspect(path)
        self.assertTrue(any("PageLayout" in x for x in problems), problems)
        self.assertTrue(any(x.startswith("qpdf:") for x in problems), problems)

    def test_inspect_bytes_matches_inspect(self):
        good = make_pdf(self.p("ok.pdf"))
        bad = make_pdf(self.p("bad.pdf"), bare_page_layout=True)
        with open(good, "rb") as f:
            self.assertEqual(pdf_guard.inspect_bytes(f.read())[0], [])
        with open(bad, "rb") as f:
            self.assertTrue(pdf_guard.inspect_bytes(f.read())[0])

    def test_finalize_repairs_bare_page_layout(self):
        path = make_pdf(self.p("bad.pdf"), bare_page_layout=True)
        info = pdf_guard.finalize(path)
        self.assertTrue(info["repaired"])
        self.assertEqual(info["pages"], 3)
        self.assertEqual(pdf_guard.inspect(path)[0], [])
        with pikepdf.open(path) as pdf:
            self.assertEqual(str(pdf.Root.PageLayout), "/SinglePage")
        with open(path, "rb") as f:
            self.assertIn(b"/PageLayout /SinglePage", f.read())

    def test_finalize_leaves_valid_pdf_untouched(self):
        path = make_pdf(self.p("ok.pdf"))
        before = pdf_guard.sha256_file(path)
        info = pdf_guard.finalize(path)
        self.assertFalse(info["repaired"])
        self.assertEqual(pdf_guard.sha256_file(path), before)

    def test_html_disguised_as_pdf_is_rejected(self):
        path = self.p("fake.pdf")
        with open(path, "wb") as f:
            f.write(b"<!doctype html><html><body>404</body></html>")
        with self.assertRaises(pdf_guard.PdfGuardError):
            pdf_guard.finalize(path)

    def test_truncated_pdf_is_rejected(self):
        path = make_pdf(self.p("ok.pdf"), pages=20)
        size = os.path.getsize(path)
        with open(path, "r+b") as f:
            f.truncate(size // 2)
        with self.assertRaises(pdf_guard.PdfGuardError):
            pdf_guard.finalize(path)


class _Handler(BaseHTTPRequestHandler):
    pdf_bytes = b""
    serve_html_instead_of_pdf = False

    def log_message(self, *a):  # silencio
        pass

    def do_GET(self):
        cls = type(self)
        if self.path == "/descargar.html":
            body = b'<a href="/ByFly_Catalogo.pdf">v</a><a href="/ByFly_Catalogo_Download.pdf">d</a>'
            return self._send(200, body, "text/html")
        if self.path in ("/ByFly_Catalogo.pdf", "/ByFly_Catalogo_Download.pdf"):
            if cls.serve_html_instead_of_pdf:
                return self._send(200, b"<html>error</html>", "text/html")
            disp = 'attachment; filename="ByFly_Catalogo.pdf"' if "Download" in self.path else 'inline; filename="ByFly_Catalogo.pdf"'
            if self.headers.get("Range"):
                return self._send(206, cls.pdf_bytes[:1024], "application/pdf", disp)
            return self._send(200, cls.pdf_bytes, "application/pdf", disp)
        self._send(404, b"nf", "text/plain")

    def _send(self, code, body, ctype, disp=None):
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        if disp:
            self.send_header("Content-Disposition", disp)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


class PublicCheckTests(unittest.TestCase):
    def _serve(self, html_instead):
        d = tempfile.TemporaryDirectory()
        self.addCleanup(d.cleanup)
        path = make_pdf(os.path.join(d.name, "ok.pdf"))
        with open(path, "rb") as f:
            _Handler.pdf_bytes = f.read()
        _Handler.serve_html_instead_of_pdf = html_instead
        srv = HTTPServer(("127.0.0.1", 0), _Handler)
        threading.Thread(target=srv.serve_forever, daemon=True).start()
        self.addCleanup(srv.shutdown)
        self.addCleanup(srv.server_close)
        return f"http://127.0.0.1:{srv.server_address[1]}"

    def _check(self, base, **kw):
        with mock.patch.dict(os.environ, {"NO_PROXY": "127.0.0.1", "no_proxy": "127.0.0.1"}):
            return pdf_guard.check_public(base, **kw)

    def test_public_ok(self):
        problems, warnings = self._check(self._serve(False))
        self.assertEqual(problems, [])
        self.assertEqual(warnings, [])

    def test_public_detects_html_served_as_pdf(self):
        problems, _ = self._check(self._serve(True))
        self.assertTrue(any("Content-Type" in x for x in problems), problems)
        self.assertTrue(any("%PDF-" in x for x in problems), problems)

    def test_public_warns_when_cache_shows_older_pdf(self):
        base = self._serve(False)
        problems, warnings = self._check(base, expect_sha256="0" * 64)
        self.assertEqual(problems, [])  # una caché vieja es un aviso, no un error
        self.assertTrue(any("aún no muestra" in w for w in warnings), warnings)
        import hashlib
        problems, warnings = self._check(base, expect_sha256=hashlib.sha256(_Handler.pdf_bytes).hexdigest())
        self.assertEqual((problems, warnings), ([], []))


if __name__ == "__main__":
    unittest.main()
