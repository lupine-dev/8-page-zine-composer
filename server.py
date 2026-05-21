#!/usr/bin/env python3
import http.server
import socketserver

PORT = 8081

class WASMRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Inject the headers required for SharedArrayBuffer and cross-origin isolation
        self.send_header("Cross-Origin-Opener-Policy", "same-origin")
        self.send_header("Cross-Origin-Embedder-Policy", "require-corp")
        super().end_headers()

if __name__ == '__main__':
    # Allow address reuse to prevent "Address already in use" errors if you restart quickly
    socketserver.TCPServer.allow_reuse_address = True
    
    with socketserver.TCPServer(("", PORT), WASMRequestHandler) as httpd:
        print(f"Serving on http://localhost:{PORT} with cross-origin isolation headers...")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nShutting down server.")
            httpd.server_close()