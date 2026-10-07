from abc import ABC, abstractmethod
from typing import List, Optional
from backend.app.schemas.product import ProductBase, LocalMarketBenchmark


class AbstractProductConnector(ABC):
    """Abstract base class for all sourcing product connectors (AliExpress, 1688, Pinduoduo)."""

    @property
    @abstractmethod
    def platform_name(self) -> str:
        pass

    @abstractmethod
    async def search(self, query: str, limit: int = 10) -> List[ProductBase]:
        pass

    @abstractmethod
    async def search_by_image(self, image_bytes: bytes, limit: int = 10) -> List[ProductBase]:
        pass


class AbstractBDMarketConnector(ABC):
    """Abstract base class for Bangladesh local market discovery (Daraz, FB, IG, TikTok, local retail)."""

    @abstractmethod
    async def search_local_market(self, query: str, limit: int = 5) -> List[LocalMarketBenchmark]:
        pass
