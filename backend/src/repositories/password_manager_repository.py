from models.password_manager import PasswordEntry
from config.database import get_pool

class PasswordManagerRepository:
    @staticmethod
    async def create_entry(entry: PasswordEntry) -> PasswordEntry:
        pool = await get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                # Insert the entry
                await cur.execute(
                    """
                    INSERT INTO PasswordEntries 
                    (user_id, title, encrypted_password, encrypted_user_key, descriptions, created_id)
                    VALUES (%s, %s, %s, %s, %s, %s)
                    """,
                    (entry.user_id, entry.title, entry.encrypted_password, 
                     entry.encrypted_user_key, entry.descriptions, entry.created_id)
                )
                entry_id = cur.lastrowid
                await conn.commit()

                # Get the created entry
                await cur.execute(
                    """
                    SELECT entry_id, user_id, title, encrypted_password, encrypted_user_key,
                           descriptions, created_at, created_id, updated_at, updated_id
                    FROM PasswordEntries
                    WHERE entry_id = %s
                    """,
                    (entry_id,)
                )
                result = await cur.fetchone()
                return PasswordEntry.from_db(result)

    @staticmethod
    async def get_entries_by_user_id(user_id: int) -> list[PasswordEntry]:
        pool = await get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    """
                    SELECT entry_id, user_id, title, encrypted_password, encrypted_user_key,
                           descriptions, created_at, created_id, updated_at, updated_id
                    FROM PasswordEntries
                    WHERE user_id = %s
                    ORDER BY created_at DESC
                    """,
                    (user_id,)
                )
                results = await cur.fetchall()
                return [PasswordEntry.from_db(row) for row in results]

    @staticmethod
    async def delete_entry(entry_id: int, user_id: int) -> bool:
        pool = await get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    """
                    DELETE FROM PasswordEntries
                    WHERE entry_id = %s AND user_id = %s
                    """,
                    (entry_id, user_id)
                )
                await conn.commit()
                return cur.rowcount > 0 