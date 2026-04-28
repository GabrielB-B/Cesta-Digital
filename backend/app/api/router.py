from fastapi import APIRouter

from app.api.routes.auth import router as auth_router
from app.api.routes.audit_logs import router as audit_logs_router
from app.api.routes.basket_availability import router as basket_availability_router
from app.api.routes.basket_types import router as basket_types_router
from app.api.routes.benefits import router as benefits_router
from app.api.routes.dashboard import router as dashboard_router
from app.api.routes.deliveries import router as deliveries_router
from app.api.routes.families import router as families_router
from app.api.routes.financial_summary import router as financial_summary_router
from app.api.routes.item_categories import router as item_categories_router
from app.api.routes.items import router as items_router
from app.api.routes.people import router as people_router
from app.api.routes.social_assessments import router as social_assessments_router
from app.api.routes.stock_batches import router as stock_batches_router
from app.api.routes.stock_movements import router as stock_movements_router
from app.api.routes.stock_summary import router as stock_summary_router
from app.api.routes.users import router as users_router

api_router = APIRouter()
api_router.include_router(auth_router)
api_router.include_router(audit_logs_router)
api_router.include_router(users_router)
api_router.include_router(families_router)
api_router.include_router(people_router)
api_router.include_router(benefits_router)
api_router.include_router(social_assessments_router)
api_router.include_router(item_categories_router)
api_router.include_router(items_router)
api_router.include_router(stock_batches_router)
api_router.include_router(stock_movements_router)
api_router.include_router(stock_summary_router)
api_router.include_router(basket_types_router)
api_router.include_router(basket_availability_router)
api_router.include_router(deliveries_router)
api_router.include_router(dashboard_router)
api_router.include_router(financial_summary_router)
