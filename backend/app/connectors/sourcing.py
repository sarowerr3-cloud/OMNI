from decimal import Decimal
from typing import List
from backend.app.connectors.base import AbstractProductConnector
from backend.app.schemas.product import ProductBase


class MockAliExpressConnector(AbstractProductConnector):
    @property
    def platform_name(self) -> str:
        return "AliExpress"

    async def search(self, query: str, limit: int = 5) -> List[ProductBase]:
        return [
            ProductBase(
                platform="AliExpress",
                title_original=f"{query} - Global Direct Edition",
                title_en=f"{query} - Global Direct Edition",
                price=Decimal("12.50"),
                currency="USD",
                price_bdt=Decimal("1500.00"),
                moq=1,
                url="https://www.aliexpress.com/item/100500123456.html",
                images=["https://images.unsplash.com/photo-1523275335684-37898b6baf30"],
                seller_name="AliExpress Direct Official Store",
                seller_rating=4.8,
                weight_kg=Decimal("0.35")
            )
        ]

    async def search_by_image(self, image_bytes: bytes, limit: int = 5) -> List[ProductBase]:
        return await self.search(query="Sample Image Match", limit=limit)


class Mock1688Connector(AbstractProductConnector):
    @property
    def platform_name(self) -> str:
        return "1688"

    async def search(self, query: str, limit: int = 5) -> List[ProductBase]:
        return [
            ProductBase(
                platform="1688",
                title_original=f"1688 批发 {query} 工厂直供",
                title_en=f"1688 Wholesale {query} Factory Direct",
                price=Decimal("28.00"),  # RMB 28.00
                currency="RMB",
                price_bdt=Decimal("462.00"),  # 28 RMB * 16.5 RMB/BDT
                moq=10,
                url="https://detail.1688.com/offer/654321.html",
                images=["https://images.unsplash.com/photo-1505740420928-5e560c06d30e"],
                seller_name="Shenzhen Electronics Factory Co., Ltd.",
                seller_rating=4.9,
                weight_kg=Decimal("0.30")
            )
        ]

    async def search_by_image(self, image_bytes: bytes, limit: int = 5) -> List[ProductBase]:
        return await self.search(query="Visual Match 1688", limit=limit)


class MockPinduoduoConnector(AbstractProductConnector):
    @property
    def platform_name(self) -> str:
        return "Pinduoduo"

    async def search(self, query: str, limit: int = 5) -> List[ProductBase]:
        return [
            ProductBase(
                platform="Pinduoduo",
                title_original=f"拼多多 拼团 {query} 特价",
                title_en=f"Pinduoduo Group Buy {query} Discount",
                price=Decimal("25.00"),  # RMB 25.00
                currency="RMB",
                price_bdt=Decimal("412.50"),
                moq=2,
                url="https://mobile.yangkeduo.com/goods.html?goods_id=78910",
                images=["https://images.unsplash.com/photo-1542291026-7eec264c27ff"],
                seller_name="Yiwu Direct Supply Store",
                seller_rating=4.7,
                weight_kg=Decimal("0.32")
            )
        ]

    async def search_by_image(self, image_bytes: bytes, limit: int = 5) -> List[ProductBase]:
        return await self.search(query="Visual Match PDD", limit=limit)


aliexpress_connector = MockAliExpressConnector()
connector_1688 = Mock1688Connector()
pdd_connector = MockPinduoduoConnector()
