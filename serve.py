#!/usr/bin/env python3
"""Server di sviluppo per NOVANTA.

Serve i file così come sono e vieta la cache: senza bundler, un modulo
memorizzato dal browser significa collaudare la versione di ieri.

    python3 serve.py            # porta 8080
    python3 serve.py 3000
"""
import os
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer


class NoCacheHandler(SimpleHTTPRequestHandler):
    extensions_map = {
        **SimpleHTTPRequestHandler.extensions_map,
        '.js': 'text/javascript',
        '.json': 'application/json',
        '.woff2': 'font/woff2',
    }

    # Il service worker fa eccezione: alcuni browser si rifiutano di
    # registrarlo se la risposta dice no-store, e la registrazione fallisce
    # con un errore che non spiega niente.
    def end_headers(self):
        if self.path.rstrip('/').endswith('sw.js'):
            self.send_header('Cache-Control', 'no-cache')
        else:
            self.send_header('Cache-Control', 'no-store, must-revalidate')
            self.send_header('Pragma', 'no-cache')
        super().end_headers()

    # Cloudflare Pages serve /privacy al posto di /privacy.html: senza questo
    # i link funzionano online e si rompono in locale, che è il modo migliore
    # per accorgersene troppo tardi.
    def translate_path(self, path):
        full = super().translate_path(path)
        if not os.path.splitext(full)[1] and not os.path.isdir(full):
            candidate = full + '.html'
            if os.path.exists(candidate):
                return candidate
        return full

    def log_message(self, fmt, *args):
        if '404' in (args[1] if len(args) > 1 else ''):
            super().log_message(fmt, *args)


if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8080
    print(f'NOVANTA su http://localhost:{port}')
    ThreadingHTTPServer(('', port), NoCacheHandler).serve_forever()
