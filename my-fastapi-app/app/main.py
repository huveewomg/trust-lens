from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import items, predictions

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8080",
        "http://127.0.0.1:8000",
        "null",
        "https://huveewomg.github.io",
        "https://trust-lens-api-298459812143.asia-southeast1.run.app"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(items.router)
app.include_router(predictions.router)

@app.get("/")
async def read_root():
    return {"message": "Welcome to my FastAPI application!"}