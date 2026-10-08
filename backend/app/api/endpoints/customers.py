from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query, status

from backend.app.schemas.customer import (
    CustomerCreate,
    CustomerGroup,
    CustomerGroupCreate,
    CustomerResponse,
    CustomerUpdate,
    MessageComposeRequest,
    PersonalizedMessage,
)
from backend.app.services.customer_service import customer_service

router = APIRouter(prefix="/customers", tags=["Customers & CRM"])


@router.get("", response_model=List[CustomerResponse])
async def list_customers(
    group: Optional[str] = Query(None, description="Filter by customer group"),
    category: Optional[str] = Query(None, description="Filter by category"),
    city: Optional[str] = Query(None, description="Filter by city"),
    search: Optional[str] = Query(None, description="Search name, phone, or notes"),
):
    """
    List retail customers with optional group, category, city, and text search filters.
    """
    return customer_service.list_customers(group=group, category=category, city=city, search=search)


@router.post("", response_model=CustomerResponse, status_code=status.HTTP_201_CREATED)
async def create_customer(payload: CustomerCreate):
    """
    Register a new retail customer with group, category, and contact details.
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
    Returns tailored text, direct WhatsApp URLs, and SMS links.
    """
    return customer_service.compose_messages(payload)


@router.get("/{customer_id}", response_model=CustomerResponse)
async def get_customer(customer_id: str):
    """
    Retrieve a specific customer profile by ID.
    """
    customer = customer_service.get_customer(customer_id)
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    return customer


@router.put("/{customer_id}", response_model=CustomerResponse)
async def update_customer(customer_id: str, payload: CustomerUpdate):
    """
    Update customer details, group assignment, category, or notes.
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
