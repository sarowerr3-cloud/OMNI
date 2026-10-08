from fastapi import APIRouter
from backend.app.api.endpoints import health, auth, search, product_lists, rates, customers

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(auth.router)
api_router.include_router(search.router)
api_router.include_router(product_lists.router)
api_router.include_router(rates.router)
api_router.include_router(customers.router)


