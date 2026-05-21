#!/usr/bin/env python3
import http.server
import socketserver

PORT = 8081

class StaticRequestHandler(http.server.SimpleHTTPRequestHandler):
    pass

if __name__ == '__main__':
    # Allow address reuse to prevent "Address already in use" errors if you restart quickly
    socketserver.TCPServer.allow_reuse_address = True
    
    with socketserver.TCPServer(("", PORT), StaticRequestHandler) as httpd:
        print(f"Serving on http://localhost:{PORT} ...")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nShutting down server.")
            httpd.server_close()