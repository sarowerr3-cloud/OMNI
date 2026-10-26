from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query, status, Depends

from backend.app.schemas.customer import (
    CustomerCreate,
    CustomerOrder,
    CustomerOrderCreate,
    CustomerOrderUpdate,
    CustomerGroup,
    CustomerGroupCreate,
    CustomerResponse,
    CustomerUpdate,
    MessageComposeRequest,
    PersonalizedMessage,
)
from backend.app.services.customer_service import customer_service
from backend.app.api.endpoints.auth import get_current_user

router = APIRouter(
    prefix="/customers",
    tags=["Customers & CRM"],
    dependencies=[Depends(get_current_user)]
)


@router.get("", response_model=List[CustomerResponse])
async def list_customers(
    group: Optional[str] = Query(None, description="Filter by customer group"),
    category: Optional[str] = Query(None, description="Filter by category"),
    city: Optional[str] = Query(None, description="Filter by city"),
    search: Optional[str] = Query(None, description="Universal search by name, phone, address, or notes"),
    phone: Optional[str] = Query(None, description="Direct search by phone number"),
):
    """
    List retail customers with universal search (name, phone, address, notes) and group filters.
    """
    return customer_service.list_customers(
        group=group, category=category, city=city, search=search, phone=phone
    )


@router.post("", response_model=CustomerResponse, status_code=status.HTTP_201_CREATED)
async def create_customer(payload: CustomerCreate):
    """
    Create a new customer profile containing their name, phone number, address, and notes.
    """
    return customer_service.create_customer(payload)


@router.get("/groups/list", response_model=List[CustomerGroup])
async def list_groups():
    """
    List all customer groups and categories with member counts.
    """
    return customer_service.list_groups()


@router.post("/groups", response_model=CustomerGroup, status_code=status.HTTP_201_CREATED)
async def create_group(payload: CustomerGroupCreate):
    """
    Create a new customer segment/group.
    """
    return customer_service.create_group(payload)


@router.post("/messages/compose", response_model=List[PersonalizedMessage])
async def compose_messages(payload: MessageComposeRequest):
    """
    Compose personalized product announcement messages for specific customers or an entire group.
    """
    return customer_service.compose_messages(payload)


@router.get("/by-phone/{phone}", response_model=CustomerResponse)
async def get_customer_by_phone(phone: str):
    """
    Directly locate a customer profile by searching via their phone number.
    """
    customer = customer_service.get_customer_by_phone(phone)
    if not customer:
        raise HTTPException(status_code=404, detail=f"No customer profile found with phone number '{phone}'")
    return customer


@router.get("/{customer_id}", response_model=CustomerResponse)
async def get_customer(customer_id: str):
    """
    Retrieve a specific customer profile including all stored orders.
    """
    customer = customer_service.get_customer(customer_id)
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    return customer


@router.put("/{customer_id}", response_model=CustomerResponse)
async def update_customer(customer_id: str, payload: CustomerUpdate):
    """
    Update customer profile details, address, or notes.
    """
    updated = customer_service.update_customer(customer_id, payload)
    if not updated:
        raise HTTPException(status_code=404, detail="Customer not found")
    return updated


@router.delete("/{customer_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_customer(customer_id: str):
    """
    Delete a customer profile.
    """
    deleted = customer_service.delete_customer(customer_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Customer not found")
    return None


# -------------------------------------------------------------
# CUSTOMER ORDERS ENDPOINTS
# -------------------------------------------------------------
@router.get("/{customer_id}/orders", response_model=List[CustomerOrder])
async def list_customer_orders(customer_id: str):
    """
    List all orders stored within a customer's profile.
    """
    customer = customer_service.get_customer(customer_id)
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    return customer.orders


@router.post("/{customer_id}/orders", response_model=CustomerOrder, status_code=status.HTTP_201_CREATED)
async def add_customer_order(customer_id: str, payload: CustomerOrderCreate):
    """
    Input order details into a customer's profile.
    Includes product image, name, link, weight, price, payment status (total, advance, remaining),
    order date and time, delivery/cancellation checkboxes, and brief notes.
    """
    order = customer_service.add_order(customer_id, payload)
    if not order:
        raise HTTPException(status_code=404, detail="Customer not found")
    return order


@router.put("/{customer_id}/orders/{order_id}", response_model=CustomerOrder)
async def update_customer_order(customer_id: str, order_id: str, payload: CustomerOrderUpdate):
    """
    Update an order in a customer's profile (e.g. toggle delivered/cancelled checkbox, update advance, edit notes).
    """
    updated_order = customer_service.update_order(customer_id, order_id, payload)
    if not updated_order:
        raise HTTPException(status_code=404, detail="Order or Customer not found")
    return updated_order


@router.delete("/{customer_id}/orders/{order_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_customer_order(customer_id: str, order_id: str):
    """
    Delete an order from a customer's profile.
    """
    deleted = customer_service.delete_order(customer_id, order_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Order or Customer not found")
    return None
