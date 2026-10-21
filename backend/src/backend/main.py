from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.afirmacoes import router_afirmacoes, router_investigacoes
from backend.auth import router as auth_router
from backend.evidencias import router as evidencias_router
from backend.fontes import router_afirmacoes as fontes_router_afirmacoes
from backend.fontes import router_investigacoes as fontes_router_investigacoes
from backend.investigacoes import router as investigacoes_router

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(investigacoes_router)
app.include_router(router_investigacoes)
app.include_router(router_afirmacoes)
app.include_router(fontes_router_investigacoes)
app.include_router(fontes_router_afirmacoes)
app.include_router(evidencias_router)


@app.get("/")
def inicio():
    return {"mensagem": " funcionando"}
