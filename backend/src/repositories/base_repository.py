from config.database import get_pool

class BaseRepository:
    """
    Veritabanı işlemleri için temel repository sınıfı.
    Tüm repository sınıfları bu sınıftan türetilmelidir.
    """
    
    def __init__(self):
        pass
        
    async def fetch_one(self, query, params=None):
        """Tek bir sonuç döndüren sorgular için"""
        pool = await get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(query, params or ())
                return await cur.fetchone()
                
    async def fetch_all(self, query, params=None):
        """Çoklu sonuç döndüren sorgular için"""
        pool = await get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(query, params or ())
                return await cur.fetchall()
                
    async def execute(self, query, params=None):
        """INSERT, UPDATE, DELETE sorguları için"""
        pool = await get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(query, params or ())
                await conn.commit()
                if cur.lastrowid:
                    return cur.lastrowid
                return cur.rowcount 