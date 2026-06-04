import http.server
import socketserver
import os

PORT = 8000
MACHINE_ID = "XRX-429-IND"

class TemplateHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path == "/" or self.path.startswith("/?") or self.path == "/index.html" or self.path == "/upload.html":
            # Serve index.html by default
            try:
                filepath = os.path.join(os.path.dirname(__file__), "index.html")
                with open(filepath, "r", encoding="utf-8") as f:
                    content = f.read()
                
                # Dynamic Jinja-like template replacement for machine_id
                rendered = content.replace("{{ machine_id }}", MACHINE_ID)
                
                self.send_response(200)
                self.send_header("Content-Type", "text/html; charset=utf-8")
                self.end_headers()
                self.wfile.write(rendered.encode("utf-8"))
            except Exception as e:
                self.send_response(500)
                self.end_headers()
                self.wfile.write(f"Internal Server Error: {str(e)}".encode("utf-8"))
        else:
            # Fallback to default handler for other files (e.g. assets)
            super().do_GET()

if __name__ == "__main__":
    # Set the working directory to the script's path
    script_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(script_dir)
    
    # Allow port reuse to prevent address-already-in-use errors
    socketserver.TCPServer.allow_reuse_address = True
    
    with socketserver.TCPServer(("", PORT), TemplateHandler) as httpd:
        print("\n" + "="*50)
        print(f" AUTOMATIC XEROX PRINTING SYSTEM")
        print(f" Active Machine: {MACHINE_ID}")
        print(f" Local Dev Server running on: http://localhost:{PORT}")
        print(" Press Ctrl+C to terminate.")
        print("="*50 + "\n")
        
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServer gracefully shut down.")
