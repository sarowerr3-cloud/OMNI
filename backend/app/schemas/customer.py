from typing import List, Optional
from pydantic import BaseModel, Field


class CustomerOrder(BaseModel):
    id: str = Field(..., description="Unique order ID, e.g. ord_abc123")
    customer_id: str = Field(..., description="Customer ID profile to which this order belongs")
    product_name: str = Field(..., description="Name of the product")
    product_image: Optional[str] = Field(None, description="Product image URL or data URI")
    product_link: Optional[str] = Field(None, description="Product source link (e.g. 1688, Taobao, Daraz)")
    weight: float = Field(0.0, description="Product weight")
    weight_unit: str = Field("kg", description="Weight unit, e.g. 'kg' or 'gm'")
    price: float = Field(0.0, description="Unit price or base item price in BDT")
    quantity: int = Field(1, description="Quantity ordered")
    delivery_cost: float = Field(0.0, description="Local delivery / courier cost in BDT")
    packing_cost: float = Field(0.0, description="Packaging materials / handling cost in BDT")
    total_amount: float = Field(0.0, description="Total amount in BDT")
    advance_payment: float = Field(0.0, description="Advance payment made in BDT")
    remaining_balance: float = Field(0.0, description="Remaining balance in BDT (total_amount - advance_payment)")
    payment_status: str = Field("unpaid", description="Payment status: 'paid', 'partial', or 'unpaid'")
    date_time: str = Field(..., description="Date and time when the order was placed")
    is_delivered: bool = Field(False, description="Checkbox: indicates whether the order has been delivered")
    is_cancelled: bool = Field(False, description="Checkbox: indicates whether the order has been cancelled")
    status: str = Field("active", description="Order status: 'active', 'delivered', or 'cancelled'")
    notes: Optional[str] = Field(None, description="Brief notes for special customer requirements or reminders")
    created_at: str
    updated_at: str


class CustomerOrderCreate(BaseModel):
    product_name: str = Field(..., description="Name of the product")
    product_image: Optional[str] = Field(None, description="Product image URL or data URI")
    product_link: Optional[str] = Field(None, description="Product source link/URL")
    weight: Optional[float] = Field(0.0, description="Product weight")
    weight_unit: Optional[str] = Field("kg", description="Weight unit ('kg' or 'gm')")
    price: float = Field(..., description="Unit price or base item price in BDT")
    quantity: Optional[int] = Field(1, description="Quantity ordered")
    delivery_cost: Optional[float] = Field(0.0, description="Local delivery / courier cost in BDT")
    packing_cost: Optional[float] = Field(0.0, description="Packaging materials cost in BDT")
    total_amount: Optional[float] = Field(None, description="Total amount (auto-calculated if omitted)")
    advance_payment: Optional[float] = Field(0.0, description="Advance payment made in BDT")
    remaining_balance: Optional[float] = Field(None, description="Remaining balance (auto-calculated if omitted)")
    payment_status: Optional[str] = Field(None, description="Payment status: 'paid', 'partial', or 'unpaid'")
    date_time: Optional[str] = Field(None, description="Order date and time (current ISO/local time if omitted)")
    is_delivered: Optional[bool] = Field(False, description="Checkbox: order delivered")
    is_cancelled: Optional[bool] = Field(False, description="Checkbox: order cancelled")
    status: Optional[str] = Field("active", description="Order status")
    notes: Optional[str] = Field(None, description="Brief notes for special customer requirements or reminders")


class CustomerOrderUpdate(BaseModel):
    product_name: Optional[str] = None
    product_image: Optional[str] = None
    product_link: Optional[str] = None
    weight: Optional[float] = None
    weight_unit: Optional[str] = None
    price: Optional[float] = None
    quantity: Optional[int] = None
    delivery_cost: Optional[float] = None
    packing_cost: Optional[float] = None
    total_amount: Optional[float] = None
    advance_payment: Optional[float] = None
    remaining_balance: Optional[float] = None
    payment_status: Optional[str] = None
    date_time: Optional[str] = None
    is_delivered: Optional[bool] = None
    is_cancelled: Optional[bool] = None
    status: Optional[str] = None
    notes: Optional[str] = None


class CustomerBase(BaseModel):
    name: str = Field(..., description="Customer full name or business contact")
    phone: str = Field(..., description="Phone number or WhatsApp number (e.g. 01712345678 or +8801712345678)")
    address: Optional[str] = Field(None, description="Customer delivery address or retail location")
    notes: Optional[str] = Field(None, description="Brief notes for special customer requirements or reminders")
    email: Optional[str] = Field(None, description="Email address")
    group: str = Field("Retail Gadgets", description="Customer group/segment")
    category: str = Field("Electronics", description="Product category interest")
    city: Optional[str] = Field("Dhaka", description="City / Region in Bangladesh")
    preferred_contact: str = Field("whatsapp", description="Preferred contact channel (whatsapp, sms, phone)")
    default_delivery_cost: Optional[float] = Field(0.0, description="Default local delivery / courier cost in BDT for this customer")
    default_packing_cost: Optional[float] = Field(0.0, description="Default packaging cost in BDT for this customer")


class CustomerCreate(CustomerBase):
    pass


class CustomerUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    notes: Optional[str] = None
    email: Optional[str] = None
    group: Optional[str] = None
    category: Optional[str] = None
    city: Optional[str] = None
    preferred_contact: Optional[str] = None
    default_delivery_cost: Optional[float] = None
    default_packing_cost: Optional[float] = None
    total_orders: Optional[int] = None


class CustomerResponse(CustomerBase):
    id: str
    orders: List[CustomerOrder] = []
    total_orders: int = 0
    total_spent: float = 0.0
    total_due: float = 0.0
    active_orders_count: int = 0
    delivered_orders_count: int = 0
    cancelled_orders_count: int = 0
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
