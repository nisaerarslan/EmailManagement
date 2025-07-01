from typing import Optional, List
from models.system_mail import SystemMail
import mysql.connector
from repositories.base_repository import BaseRepository

class SystemMailRepository(BaseRepository):
    def __init__(self):
        super().__init__()
        
    async def get_system_mail(self) -> Optional[SystemMail]:
        """SystemMail tablosundan ilk sistemi döndür (normalde tek kayıt olacak)"""
        query = f"SELECT * FROM {SystemMail._table_name} LIMIT 1"
        result = await self.fetch_one(query)
        return SystemMail.from_db(result) if result else None
    
    async def create_system_mail(self, system_mail: SystemMail) -> SystemMail:
        """Yeni sistem e-posta hesabı ekle"""
        print(f"SystemMailRepository: Yeni sistem mail ekleniyor: {system_mail.email}")
        query = f"""
            INSERT INTO {SystemMail._table_name} 
            (email, access_token, refresh_token, token_expiry) 
            VALUES (%s, %s, %s, %s)
        """
        params = (
            system_mail.email,
            system_mail.access_token,
            system_mail.refresh_token,
            system_mail.token_expiry
        )
        
        try:
            last_id = await self.execute(query, params)
            print(f"SystemMailRepository: Yeni ID: {last_id}")
            system_mail.id = last_id
            return system_mail
        except Exception as e:
            print(f"SystemMailRepository: Hata oluştu: {str(e)}")
            # Tablo yoksa oluşturmaya çalış
            await self._create_table_if_not_exists()
            # Tekrar dene
            last_id = await self.execute(query, params)
            system_mail.id = last_id
            return system_mail
    
    async def update_system_mail(self, system_mail: SystemMail) -> bool:
        """Sistem e-posta hesabı bilgilerini güncelle"""
        print(f"SystemMailRepository: Sistem mail güncelleniyor ID: {system_mail.id}")
        query = f"""
            UPDATE {SystemMail._table_name} 
            SET email = %s, access_token = %s, refresh_token = %s, token_expiry = %s
            WHERE id = %s
        """
        params = (
            system_mail.email,
            system_mail.access_token,
            system_mail.refresh_token,
            system_mail.token_expiry,
            system_mail.id
        )
        
        rows_affected = await self.execute(query, params)
        print(f"SystemMailRepository: Güncelleme sonucu (rows_affected): {rows_affected}")
        return rows_affected > 0
    
    async def delete_system_mail(self, id: int) -> bool:
        """Sistem e-posta hesabını sil"""
        query = f"DELETE FROM {SystemMail._table_name} WHERE id = %s"
        rows_affected = await self.execute(query, (id,))
        return rows_affected > 0
    
    async def _create_table_if_not_exists(self):
        """SystemMail tablosunu oluştur"""
        print("SystemMailRepository: Tablo oluşturuluyor...")
        query = f"""
            CREATE TABLE IF NOT EXISTS {SystemMail._table_name} (
                id INT AUTO_INCREMENT PRIMARY KEY,
                email VARCHAR(255) NOT NULL,
                access_token TEXT NOT NULL,
                refresh_token TEXT,
                token_expiry DATETIME,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        """
        await self.execute(query)
        print("SystemMailRepository: Tablo oluşturuldu") 