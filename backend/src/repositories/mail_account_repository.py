from config.database import get_pool
from datetime import datetime
from typing import Optional, Dict, List
from models.mail_account import MailAccount

class MailAccountRepository:
    @staticmethod
    async def check_account_exists(user_id: int, email: str) -> bool:
        pool = await get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    """
                    SELECT COUNT(*) as count
                    FROM MailAccounts 
                    WHERE user_id = %s AND email = %s
                    """,
                    (user_id, email)
                )
                result = await cur.fetchone()
                return result['count'] > 0

    @staticmethod
    async def delete_account(user_id: int, account_id: int) -> bool:
        """Kullanıcının mail hesabını siler"""
        pool = await get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    """
                    DELETE FROM MailAccounts 
                    WHERE user_id = %s AND account_id = %s
                    """,
                    (user_id, account_id)
                )
                await conn.commit()
                return cur.rowcount > 0

    @staticmethod
    async def update_account_tokens(account_id: int, access_token: str, token_expiry: datetime) -> bool:
        """Mail hesabının token bilgilerini günceller"""
        pool = await get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    """
                    UPDATE MailAccounts 
                    SET access_token = %s, token_expiry = %s
                    WHERE account_id = %s
                    """,
                    (access_token, token_expiry, account_id)
                )
                await conn.commit()
                return cur.rowcount > 0

    @staticmethod
    async def create_mail_account(account: MailAccount) -> MailAccount:
        pool = await get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                # Önce hesabın var olup olmadığını kontrol et
                exists = await MailAccountRepository.check_account_exists(
                    account.user_id, 
                    account.email
                )
                
                if exists:
                    raise ValueError(f"Bu mail hesabı ({account.email}) zaten eklenmiş.")

                await cur.execute(
                    """
                    INSERT INTO MailAccounts (user_id, email, access_token, refresh_token, token_expiry, account_type, created_at)
                    VALUES (%s, %s, %s, %s, %s, %s, NOW())
                    """,
                    (
                        account.user_id,
                        account.email,
                        account.access_token,
                        account.refresh_token,
                        account.token_expiry,
                        account.account_type
                    )
                )
                await conn.commit()
                account.account_id = cur.lastrowid
                return account

    @staticmethod
    async def get_user_accounts(user_id: int) -> List[MailAccount]:
        pool = await get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    """
                    SELECT account_id, email, account_type, created_at, 
                           access_token, refresh_token, token_expiry, user_id
                    FROM MailAccounts
                    WHERE user_id = %s 
                    AND account_type IN ('gmail', 'outlook')
                    ORDER BY created_at DESC
                    """,
                    (user_id,)
                )
                results = await cur.fetchall()
                return [
                    MailAccount(
                        account_id=row['account_id'],
                        user_id=row['user_id'],
                        email=row['email'],
                        account_type=row['account_type'],
                        created_at=row['created_at'],
                        access_token=row['access_token'],
                        refresh_token=row['refresh_token'],
                        token_expiry=row['token_expiry'],
                        unread_count=0  # Bu değer daha sonra Gmail API'den alınacak
                    )
                    for row in results
                ]

    @staticmethod
    async def get_account_by_id(account_id: int) -> Optional[MailAccount]:
        """Get a specific mail account by its ID."""
        try:
            pool = await get_pool()
            async with pool.acquire() as conn:
                async with conn.cursor() as cur:
                    query = """
                        SELECT account_id, user_id, email, account_type, created_at,
                               access_token, refresh_token, token_expiry
                        FROM MailAccounts
                        WHERE account_id = %s
                    """
                    await cur.execute(query, (account_id,))
                    row = await cur.fetchone()
                    
                    if row:
                        return MailAccount(
                            account_id=row['account_id'],
                            user_id=row['user_id'],
                            email=row['email'],
                            account_type=row['account_type'],
                            created_at=row['created_at'],
                            access_token=row['access_token'],
                            refresh_token=row['refresh_token'],
                            token_expiry=row['token_expiry']
                        )
                    return None
        except Exception as e:
            print(f"Error getting account by ID: {str(e)}")
            return None 