"""
RoboPlanner FastAPI backend.
Run with: python run.py  or  uvicorn app.main:app --reload --port 8000
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .api import robots, planner, scene

app = FastAPI(
    title="RoboPlanner API",
    version="1.0.0",
    description="6-DOF robot path planning API for research workcells.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(robots.router)
app.include_router(planner.router)
app.include_router(scene.router)

@app.get("/health")
def health():
    return {"status": "ok", "version": "1.0.0"}
