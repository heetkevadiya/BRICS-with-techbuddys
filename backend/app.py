"""Dev entry point: `python app.py` starts the API with reload.

Named `app.py` beside the `app/` package: Python resolves packages before modules, so
`from app.main import ...` still finds the package. Cloud Run uses the Dockerfile's uvicorn
command instead, which is why the port comes from $PORT here too.
"""
import os

import uvicorn

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host=os.environ.get("HOST", "127.0.0.1"),
        port=int(os.environ.get("PORT", 8000)),
        reload=os.environ.get("APP_ENV", "development") != "production",
    )
