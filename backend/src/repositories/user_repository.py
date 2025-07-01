from models.user import User
from config.database import get_pool
from datetime import datetime

class UserRepository:
    @staticmethod
    async def get_by_email(email: str) -> User:
        pool = await get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    """
                    SELECT user_id, username, email, password_hash, status, created_at, created_id, 
                          updated_at, updated_id, name, img_src, otp_secret, otp_enabled, recovery_code, last_activity
                    FROM Users WHERE email = %s
                    """,
                    (email,)
                )
                result = await cur.fetchone()
                return User.from_db(result)

    @staticmethod
    async def get_by_email_or_username(identifier: str) -> User:
        pool = await get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    """
                    SELECT user_id, username, email, password_hash, status, created_at, created_id, 
                          updated_at, updated_id, name, img_src, otp_secret, otp_enabled, recovery_code, last_activity
                    FROM Users 
                    WHERE email = %s OR username = %s
                    """,
                    (identifier, identifier)
                )
                result = await cur.fetchone()
                return User.from_db(result)

    @staticmethod
    async def create_user(user: User) -> User:
        pool = await get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                # otp_secret ve otp_enabled alanlarının boş olmamasını sağla
                otp_secret = user.otp_secret or ""
                otp_enabled = 1 if user.otp_enabled else 0
                
                await cur.execute(
                    """
                    INSERT INTO Users (username, email, password_hash, status, created_at, created_id, otp_secret, otp_enabled)
                    VALUES (%s, %s, %s, %s, NOW(), %s, %s, %s)
                    """,
                    (user.username, user.email, user.password_hash, user.status, user.created_id, otp_secret, otp_enabled)
                )
                await conn.commit()
                user.user_id = cur.lastrowid
                return user

    @staticmethod
    async def get_by_username(username: str) -> User:
        pool = await get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    """
                    SELECT user_id, username, email, password_hash, status, created_at, created_id, 
                          updated_at, updated_id, name, img_src, otp_secret, otp_enabled, recovery_code, last_activity
                    FROM Users WHERE username = %s
                    """,
                    (username,)
                )
                result = await cur.fetchone()
                return User.from_db(result)

    @staticmethod
    async def get_by_id(user_id: int) -> User:
        """ID'ye göre kullanıcı bilgilerini getirir"""
        pool = await get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    """
                    SELECT user_id, username, email, password_hash, status, created_at, created_id, 
                          updated_at, updated_id, name, img_src, otp_secret, otp_enabled, recovery_code, last_activity
                    FROM Users 
                    WHERE user_id = %s
                    """,
                    (user_id,)
                )
                result = await cur.fetchone()
                return User.from_db(result)

    @staticmethod
    async def update_password(user_id: int, new_password_hash: str) -> None:
        """Kullanıcının şifresini günceller"""
        pool = await get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    """
                    UPDATE Users 
                    SET password_hash = %s, 
                        updated_at = NOW(),
                        updated_id = %s
                    WHERE user_id = %s
                    """,
                    (new_password_hash, user_id, user_id)
                )
                await conn.commit()

    @staticmethod
    async def update_profile(user_id: int, name: str = None, email: str = None) -> None:
        """Kullanıcı profil bilgilerini günceller"""
        pool = await get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                update_fields = []
                params = []

                if name is not None:
                    update_fields.append("name = %s")
                    params.append(name)

                if email is not None:
                    update_fields.append("email = %s")
                    params.append(email)

                if update_fields:
                    update_fields.append("updated_at = NOW()")
                    update_fields.append("updated_id = %s")
                    params.extend([user_id, user_id])

                    query = f"""
                        UPDATE Users 
                        SET {', '.join(update_fields)}
                        WHERE user_id = %s
                    """
                    await cur.execute(query, params)
                    await conn.commit()

    @staticmethod
    async def update_avatar(user_id: int, image_data: str) -> None:
        """Kullanıcının profil fotoğrafını günceller"""
        pool = await get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    """
                    UPDATE Users 
                    SET img_src = %s,
                        updated_at = NOW(),
                        updated_id = %s
                    WHERE user_id = %s
                    """,
                    (image_data, user_id, user_id)
                )
                await conn.commit()

    @staticmethod
    async def update_otp_secret(user_id: int, otp_secret: str) -> None:
        """Kullanıcının OTP sırrını günceller"""
        pool = await get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    """
                    UPDATE Users 
                    SET otp_secret = %s,
                        updated_at = NOW(),
                        updated_id = %s
                    WHERE user_id = %s
                    """,
                    (otp_secret, user_id, user_id)
                )
                await conn.commit()
    
    @staticmethod
    async def enable_otp(user_id: int, enabled: bool = True) -> None:
        """Kullanıcının OTP durumunu aktif/deaktif yapar"""
        pool = await get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    """
                    UPDATE Users 
                    SET otp_enabled = %s,
                        updated_at = NOW(),
                        updated_id = %s
                    WHERE user_id = %s
                    """,
                    (enabled, user_id, user_id)
                )
                await conn.commit()

    @staticmethod
    async def update_recovery_code(user_id: int, recovery_code: str) -> None:
        """Kullanıcının kurtarma kodunu günceller"""
        pool = await get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    """
                    UPDATE Users 
                    SET recovery_code = %s,
                        updated_at = NOW(),
                        updated_id = %s
                    WHERE user_id = %s
                    """,
                    (recovery_code, user_id, user_id)
                )
                await conn.commit()
    
    @staticmethod
    async def get_by_recovery_code(recovery_code: str) -> User:
        """Kurtarma koduna göre kullanıcı bulur"""
        pool = await get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    """
                    SELECT user_id, username, email, password_hash, status, created_at, created_id, 
                          updated_at, updated_id, name, img_src, otp_secret, otp_enabled, recovery_code, last_activity
                    FROM Users 
                    WHERE recovery_code = %s
                    """,
                    (recovery_code,)
                )
                result = await cur.fetchone()
                return User.from_db(result)
    
    @staticmethod
    async def update_last_activity(user_id: int) -> None:
        """Kullanıcının son aktivite zamanını günceller"""
        pool = await get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    """
                    UPDATE Users 
                    SET last_activity = NOW()
                    WHERE user_id = %s
                    """,
                    (user_id,)
                )
                await conn.commit()
    
    @staticmethod
    async def log_login_activity(user_id: int, success: bool, ip_address: str = "", user_agent: str = "") -> None:
        """Kullanıcının giriş aktivitesini kaydeder"""
        pool = await get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    """
                    INSERT INTO UserLoginActivities 
                    (user_id, login_time, success, ip_address, user_agent)
                    VALUES (%s, NOW(), %s, %s, %s)
                    """,
                    (user_id, 1 if success else 0, ip_address, user_agent)
                )
                await conn.commit()
    
    @staticmethod
    async def log_otp_activity(user_id: int, activity_type: str, success: bool, ip_address: str = "") -> None:
        """Kullanıcının OTP ile ilgili aktivitelerini kaydeder"""
        pool = await get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    """
                    INSERT INTO UserOtpActivities 
                    (user_id, activity_time, activity_type, success, ip_address)
                    VALUES (%s, NOW(), %s, %s, %s)
                    """,
                    (user_id, activity_type, 1 if success else 0, ip_address)
                )
                await conn.commit()

    @staticmethod
    async def set_password_reset_token(user_id: int, reset_token: str, expires_at: datetime) -> None:
        """Kullanıcının şifre sıfırlama token'ını ve geçerlilik süresini kaydeder"""
        pool = await get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    """
                    UPDATE Users 
                    SET reset_token = %s,
                        reset_token_expires = %s,
                        updated_at = NOW()
                    WHERE user_id = %s
                    """,
                    (reset_token, expires_at, user_id)
                )
                await conn.commit()
    
    @staticmethod
    async def get_user_by_reset_token(reset_token: str) -> dict:
        """Token'a göre kullanıcıyı döndürür"""
        pool = await get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    """
                    SELECT user_id, username, email, reset_token_expires
                    FROM Users 
                    WHERE reset_token = %s
                    """,
                    (reset_token,)
                )
                result = await cur.fetchone()
                if result:
                    return {
                        'user_id': result['user_id'],
                        'username': result['username'],
                        'email': result['email'],
                        'reset_token_expires': result['reset_token_expires']
                    }
                return None
    
    @staticmethod
    async def clear_reset_token(user_id: int) -> None:
        """Kullanıcının şifre sıfırlama token'ını temizler"""
        pool = await get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    """
                    UPDATE Users 
                    SET reset_token = NULL,
                        reset_token_expires = NULL,
                        updated_at = NOW()
                    WHERE user_id = %s
                    """,
                    (user_id,)
                )
                await conn.commit()