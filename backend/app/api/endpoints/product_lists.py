from typing import List
from fastapi import APIRouter, HTTPException, status
from backend.app.schemas.product_list import ProductListCreate, ProductListResponse
from backend.app.services.product_list_service import product_list_service

router = APIRouter(prefix="/product-lists", tags=["Product Lists"])


@router.post("", response_model=ProductListResponse, status_code=status.HTTP_201_CREATED)
async def create_product_list(payload: ProductListCreate):
    """
    Create a new product list with total price and total weight calculations.
    """
    return product_list_service.create_list(payload)


@router.get("", response_model=List[ProductListResponse])
async def list_product_lists():
    """
    List all saved product lists.
    """
    return product_list_service.list_all()


@router.get("/{list_id}", response_model=ProductListResponse)
async def get_product_list(list_id: str):
    """
    Retrieve a specific product list by ID.
    """
    product_list = product_list_service.get_list(list_id)
    if not product_list:
        raise HTTPException(status_code=404, detail="Product list not found")
    return product_list


@router.put("/{list_id}", response_model=ProductListResponse)
async def update_product_list(list_id: str, payload: ProductListCreate):
    """
    Update an existing product list.
    """
    updated = product_list_service.update_list(list_id, payload)
    if not updated:
        raise HTTPException(status_code=404, detail="Product list not found")
    return updated


@router.delete("/{list_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_product_list(list_id: str):
    """
    Delete a product list by ID.
    """
    deleted = product_list_service.delete_list(list_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Product list not found")
    return None
