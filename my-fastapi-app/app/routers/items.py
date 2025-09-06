from fastapi import APIRouter, HTTPException
from typing import List, Optional

router = APIRouter()

# In-memory storage for items
items_db = {}

@router.post("/items/", response_model=dict)
async def create_item(item_id: int, item: dict):
    if item_id in items_db:
        raise HTTPException(status_code=400, detail="Item already exists")
    items_db[item_id] = item
    return {"item_id": item_id, "item": item}

@router.get("/items/", response_model=List[dict])
async def read_items():
    return [{"item_id": item_id, "item": item} for item_id, item in items_db.items()]

@router.get("/items/{item_id}", response_model=dict)
async def read_item(item_id: int):
    item = items_db.get(item_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Item not found")
    return {"item_id": item_id, "item": item}

@router.put("/items/{item_id}", response_model=dict)
async def update_item(item_id: int, item: dict):
    if item_id not in items_db:
        raise HTTPException(status_code=404, detail="Item not found")
    items_db[item_id] = item
    return {"item_id": item_id, "item": item}

@router.delete("/items/{item_id}", response_model=dict)
async def delete_item(item_id: int):
    if item_id not in items_db:
        raise HTTPException(status_code=404, detail="Item not found")
    del items_db[item_id]
    return {"detail": "Item deleted"}