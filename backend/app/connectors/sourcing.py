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
                title_en=f"{query} - Global Direct Premium Edition",
                price=Decimal("12.50"),
                currency="USD",
                price_bdt=Decimal("1500.00"),
                moq=1,
                url="https://www.aliexpress.com/item/100500123456.html",
                images=[
                    "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600",
                    "https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=600",
                    "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600"
                ],
                videos=[
                    "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4"
                ],
                specs={
                    "Material": "Titanium Alloy / Silica Gel Strap",
                    "Battery Life": "7-10 Days Active Use",
                    "Display": "2.02 inch HD AMOLED Touch Display",
                    "Water Resistance": "IP68 Waterproof rating",
                    "Warranty": "1 Year Manufacturer Warranty"
                },
                seller_name="AliExpress Direct Official Store",
                seller_rating=4.85,
                weight_kg=Decimal("0.35"),
                dimensions="12 x 8 x 5 cm"
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
                title_original=f"1688 批发 {query} 工厂直供 跨境热销",
                title_en=f"1688 Wholesale {query} Factory Direct Cross-Border Supply",
                price=Decimal("28.00"),  # RMB 28.00
                currency="RMB",
                price_bdt=Decimal("462.00"),  # 28 RMB * 16.5 RMB/BDT
                moq=10,
                url="https://detail.1688.com/offer/654321.html",
                images=[
                    "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600",
                    "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600",
                    "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600"
                ],
                videos=[
                    "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4"
                ],
                specs={
                    "Factory Location": "Shenzhen Baoan Electronics Zone",
                    "Packaging": "Standard Retail Box + OEM Logo",
                    "Certificate": "CE / RoHS / FCC Certified",
                    "Supply Capacity": "50,000 pcs / month",
                    "Customization": "Laser Logo Printing Available (MOQ 100)"
                },
                seller_name="Shenzhen Electronics Factory Co., Ltd.",
                seller_rating=4.92,
                weight_kg=Decimal("0.30"),
                dimensions="10 x 8 x 4 cm"
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
                title_original=f"拼多多 拼团 {query} 特价 包邮",
                title_en=f"Pinduoduo Group Buy {query} Special Discount",
                price=Decimal("25.00"),  # RMB 25.00
                currency="RMB",
                price_bdt=Decimal("412.50"),
                moq=2,
                url="https://mobile.yangkeduo.com/goods.html?goods_id=78910",
                images=[
                    "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600",
                    "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600"
                ],
                videos=[
                    "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4"
                ],
                specs={
                    "Sales Rank": "#1 Best Seller on Pinduoduo Group Buying",
                    "Origin": "Yiwu Commodities Distribution Center",
                    "Package Weight": "0.32 kg",
                    "Return Policy": "7 Days No-Reason Replacement"
                },
                seller_name="Yiwu Direct Supply Store",
                seller_rating=4.75,
                weight_kg=Decimal("0.32"),
                dimensions="11 x 7 x 4 cm"
            )
        ]

    async def search_by_image(self, image_bytes: bytes, limit: int = 5) -> List[ProductBase]:
        return await self.search(query="Visual Match PDD", limit=limit)


aliexpress_connector = MockAliExpressConnector()
connector_1688 = Mock1688Connector()
pdd_connector = MockPinduoduoConnector()
