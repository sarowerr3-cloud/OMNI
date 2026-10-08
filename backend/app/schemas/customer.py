from typing import List, Optional
from pydantic import BaseModel, Field


class CustomerBase(BaseModel):
    name: str = Field(..., description="Customer full name or business contact")
    phone: str = Field(..., description="Phone number or WhatsApp number (e.g. 01712345678 or +8801712345678)")
    email: Optional[str] = Field(None, description="Email address")
    group: str = Field("Retail Gadgets", description="Customer group/segment (e.g. Wholesale Buyers, Retail Gadgets, VIP Clients)")
    category: str = Field("Electronics", description="Product category interest (e.g. Electronics, Smart Watches, Accessories, Fashion)")
    city: Optional[str] = Field("Dhaka", description="City / Region in Bangladesh")
    address: Optional[str] = Field(None, description="Full delivery address or retail shop location")
    notes: Optional[str] = Field(None, description="Special notes, preferences, or average order volume")
    preferred_contact: str = Field("whatsapp", description="Preferred contact channel (whatsapp, sms, phone)")


class CustomerCreate(CustomerBase):
    pass


class CustomerUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    group: Optional[str] = None
    category: Optional[str] = None
    city: Optional[str] = None
    address: Optional[str] = None
    notes: Optional[str] = None
    preferred_contact: Optional[str] = None
    total_orders: Optional[int] = None


class CustomerResponse(CustomerBase):
    id: str
    total_orders: int = 0
    created_at: str
    updated_at: str


class CustomerGroup(BaseModel):
    id: str
    name: str
    category: str
    description: Optional[str] = None
    color: str = "#dc2626"
    member_count: int = 0


class CustomerGroupCreate(BaseModel):
    name: str
    category: str = "General"
    description: Optional[str] = None
    color: Optional[str] = "#dc2626"


class MessageComposeRequest(BaseModel):
    customer_ids: Optional[List[str]] = Field(None, description="Specific customer IDs to compose for")
    group: Optional[str] = Field(None, description="Target customer group for broadcast")
    template_type: str = Field("new_arrival", description="Template: 'new_arrival', 'discount_offer', 'restock_preorder', 'custom'")
    product_title: Optional[str] = Field(None, description="Product title to feature in the message")
    price_bdt: Optional[float] = Field(None, description="Selling price or special rate in BDT")
    product_url: Optional[str] = Field(None, description="Product link or image link")
    custom_body: Optional[str] = Field(None, description="Custom message text with optional {name}, {group}, {product}, {price} placeholders")


class PersonalizedMessage(BaseModel):
    customer_id: str
    customer_name: str
    customer_phone: str
    customer_group: str
    message_text: str
    whatsapp_url: str
    sms_url: str
