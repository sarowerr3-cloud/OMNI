from decimal import Decimal
from typing import Optional, List
from pydantic import BaseModel, Field
import uuid
from datetime import datetime


class ProductListItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    details: Optional[str] = ""
    price: Decimal
    currency: str = "BDT"
    price_bdt: Decimal
    weight_kg: Decimal
    quantity: int = 1
    image_url: Optional[str] = None
    product_url: Optional[str] = None
    platform: Optional[str] = "Manual"
    notes: Optional[str] = None


class ProductListCreate(BaseModel):
    name: str = Field(..., description="Name of the product list")
    date: str = Field(..., description="Date of the product list (YYYY-MM-DD)")
    items: List[ProductListItem] = []
    notes: Optional[str] = None


class ProductListResponse(BaseModel):
    id: str
    name: str
    date: str
    items: List[ProductListItem] = []
    total_price_bdt: Decimal
    total_weight_kg: Decimal
    total_items_count: int
    total_quantity: int
    notes: Optional[str] = None
    created_at: str
    updated_at: str
