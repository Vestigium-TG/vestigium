from backend.controllers.auth_controller import router as auth_router
from backend.controllers.claim_controller import (
    router_claims,
)
from backend.controllers.claim_controller import (
    router_investigations as claims_investigations_router,
)
from backend.controllers.evidence_controller import router as evidence_router
from backend.controllers.investigation_controller import router as investigation_router
from backend.controllers.reflection_controller import router as reflection_router
from backend.controllers.source_controller import router as sources_router
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(investigation_router)
app.include_router(claims_investigations_router)
app.include_router(router_claims)
app.include_router(sources_router)
app.include_router(evidence_router)
app.include_router(reflection_router)


@app.get("/")
def home():
    return {"message": "API is running"}
