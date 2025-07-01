import aiohttp
from typing import Optional, Any, Dict, Type

class BaseService:
    """Base service class with common functionality for all services"""
    
    def __init__(self):
        self._session: Optional[aiohttp.ClientSession] = None
        
    async def get_aiohttp_session(self) -> aiohttp.ClientSession:
        """Get or create an aiohttp session"""
        if self._session is None or self._session.closed:
            self._session = aiohttp.ClientSession()
        return self._session
    
    async def close_session(self) -> None:
        """Close the aiohttp session if it exists"""
        if self._session and not self._session.closed:
            await self._session.close()
            self._session = None 