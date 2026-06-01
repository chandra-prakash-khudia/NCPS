"""
Webapp Server Entry Point.

Run: python -m webapp.server
"""

import os

from webapp import app
import uvicorn

if __name__ == "__main__":
    port = int(os.getenv("PORT", "8000"))
    print(f"\n  NCPS Webapp — http://localhost:{port}\n")
    uvicorn.run(app, host="0.0.0.0", port=port)
