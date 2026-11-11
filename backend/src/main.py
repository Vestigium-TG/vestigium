from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from controllers.auth_controller import router as auth_router
from controllers.claim_controller import router_claims
from controllers.claim_controller import (
    router_investigations as claims_investigations_router,
)
from controllers.conclusion_controller import router as conclusion_router
from controllers.evidence_controller import router as evidence_router
from controllers.evidence_controller import router_evidences
from controllers.investigation_controller import router as investigation_router
from controllers.reflection_controller import router as reflection_router
from controllers.reflection_controller import router_reflection
from controllers.source_controller import router as sources_router

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
app.include_router(router_evidences)
app.include_router(reflection_router)
app.include_router(router_reflection)
app.include_router(conclusion_router)


@app.get("/")
def home():
    return {"message": "API is running"}
