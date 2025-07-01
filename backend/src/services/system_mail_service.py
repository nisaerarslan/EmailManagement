import os
import base64
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
from models.system_mail import SystemMail
from repositories.system_mail_repository import SystemMailRepository
from config.oauth_config import (
    GOOGLE_CLIENT_ID, 
    GOOGLE_CLIENT_SECRET,
    GOOGLE_AUTH_URI,
    GOOGLE_TOKEN_URI
)

class SystemMailService:
    def __init__(self):
        self.system_mail_repository = SystemMailRepository()
        self.GOOGLE_CLIENT_ID = GOOGLE_CLIENT_ID
        self.GOOGLE_CLIENT_SECRET = GOOGLE_CLIENT_SECRET
        self.GOOGLE_REDIRECT_URI = "http://localhost:8000/api/systemmail/callback"  # System mail için özel redirect URI
        # Geniş kapsamlı izinler ekleyelim (Google tarafından döndürülen tüm scopeları kapsayacak şekilde)
        self.SCOPES = [
            'https://www.googleapis.com/auth/gmail.send',
            'https://www.googleapis.com/auth/gmail.modify',
            'https://www.googleapis.com/auth/userinfo.email',
            'https://mail.google.com/',
            'https://www.googleapis.com/auth/gmail.readonly',
            'https://www.googleapis.com/auth/gmail.labels',
            'https://www.googleapis.com/auth/userinfo.profile',
            'openid'
        ]

    async def get_system_mail(self) -> Optional[SystemMail]:
        """Sistem mail hesabını döndür"""
        return await self.system_mail_repository.get_system_mail()

    async def create_system_mail(self, system_mail: SystemMail) -> SystemMail:
        """Yeni sistem mail hesabı oluştur"""
        return await self.system_mail_repository.create_system_mail(system_mail)

    async def update_system_mail(self, system_mail: SystemMail) -> bool:
        """Sistem mail hesabını güncelle"""
        return await self.system_mail_repository.update_system_mail(system_mail)

    async def delete_system_mail(self, id: int) -> bool:
        """Sistem mail hesabını sil"""
        return await self.system_mail_repository.delete_system_mail(id)

    def generate_auth_url(self) -> str:
        """Google OAuth2 yetkilendirme URL'sini oluştur"""
        flow = InstalledAppFlow.from_client_config(
            {
                "installed": {
                    "client_id": self.GOOGLE_CLIENT_ID,
                    "client_secret": self.GOOGLE_CLIENT_SECRET,
                    "redirect_uris": [self.GOOGLE_REDIRECT_URI],
                    "auth_uri": GOOGLE_AUTH_URI,
                    "token_uri": GOOGLE_TOKEN_URI
                }
            },
            self.SCOPES
        )
        flow.redirect_uri = self.GOOGLE_REDIRECT_URI
        auth_url, _ = flow.authorization_url(
            access_type='offline',
            prompt='consent',
            include_granted_scopes='true'
        )
        
        # SystemMail işlemi için ek parametresi ekle
        if '?' in auth_url:
            auth_url += "&system_mail=true"
        else:
            auth_url += "?system_mail=true"
            
        return auth_url

    async def handle_google_callback(self, code: str, email: str) -> SystemMail:
        """Google OAuth2 callback'i işle ve sistem mail hesabı oluştur/güncelle"""
        print(f"SystemMail: handle_google_callback başladı, code: {code[:10]}..., email: {email}")
        
        flow = InstalledAppFlow.from_client_config(
            {
                "installed": {
                    "client_id": self.GOOGLE_CLIENT_ID,
                    "client_secret": self.GOOGLE_CLIENT_SECRET,
                    "redirect_uris": [self.GOOGLE_REDIRECT_URI],
                    "auth_uri": GOOGLE_AUTH_URI,
                    "token_uri": GOOGLE_TOKEN_URI
                }
            },
            self.SCOPES
        )
        flow.redirect_uri = self.GOOGLE_REDIRECT_URI
        
        try:
            # Token'ları değişim koduyla al
            # scope_override=True parametresi ile scope değişikliklerini kabul et
            flow.oauth2session.scope = None  # Mevcut kapsamları temizle
            flow.fetch_token(code=code)
            credentials = flow.credentials
            print(f"SystemMail: Token'lar alındı, refresh_token: {bool(credentials.refresh_token)}")
            
            # Token son kullanma tarihini hesapla
            token_expiry = datetime.utcnow() + timedelta(seconds=credentials.expiry.timestamp() - datetime.utcnow().timestamp() if credentials.expiry else 3600)
            
            # Mevcut sistem mail hesabını kontrol et
            existing_system_mail = await self.system_mail_repository.get_system_mail()
            print(f"SystemMail: Mevcut sistem maili kontrol edildi: {existing_system_mail is not None}")
            
            if existing_system_mail:
                # Mevcut hesabı güncelle
                print(f"SystemMail: Mevcut hesap güncelleniyor (ID: {existing_system_mail.id})")
                existing_system_mail.email = email
                existing_system_mail.access_token = credentials.token
                existing_system_mail.refresh_token = credentials.refresh_token
                existing_system_mail.token_expiry = token_expiry
                result = await self.system_mail_repository.update_system_mail(existing_system_mail)
                print(f"SystemMail: Güncelleme sonucu: {result}")
                return existing_system_mail
            else:
                # Yeni hesap oluştur
                print(f"SystemMail: Yeni hesap oluşturuluyor: {email}")
                new_system_mail = SystemMail(
                    email=email,
                    access_token=credentials.token,
                    refresh_token=credentials.refresh_token,
                    token_expiry=token_expiry
                )
                result = await self.system_mail_repository.create_system_mail(new_system_mail)
                print(f"SystemMail: Yeni hesap oluşturuldu (ID: {result.id})")
                return result
        except Warning as w:
            # Scope değişikliği uyarılarını yakalayıp işlemlere devam et
            print(f"SystemMail: Scope değişikliği uyarısı yakalandı ve kabul edildi: {str(w)}")
            # Token'ları manuel olarak al
            credentials = flow.credentials
            
            # Token son kullanma tarihini hesapla
            token_expiry = datetime.utcnow() + timedelta(seconds=credentials.expiry.timestamp() - datetime.utcnow().timestamp() if credentials.expiry else 3600)
            
            # Mevcut sistem mail hesabını kontrol et
            existing_system_mail = await self.system_mail_repository.get_system_mail()
            
            if existing_system_mail:
                # Mevcut hesabı güncelle
                existing_system_mail.email = email
                existing_system_mail.access_token = credentials.token
                existing_system_mail.refresh_token = credentials.refresh_token
                existing_system_mail.token_expiry = token_expiry
                await self.system_mail_repository.update_system_mail(existing_system_mail)
                return existing_system_mail
            else:
                # Yeni hesap oluştur
                new_system_mail = SystemMail(
                    email=email,
                    access_token=credentials.token,
                    refresh_token=credentials.refresh_token,
                    token_expiry=token_expiry
                )
                return await self.system_mail_repository.create_system_mail(new_system_mail)

    async def send_password_reset_email(self, to_email: str, username: str, reset_link: str) -> bool:
        """Şifre sıfırlama e-postası gönder"""
        system_mail = await self.system_mail_repository.get_system_mail()
        if not system_mail:
            raise ValueError("System mail account not configured")
        
        # Token'ı yenile gerekirse
        if system_mail.token_expiry and system_mail.token_expiry < datetime.utcnow():
            # Token yenileme işlemi gerekiyor
            # Burada Google'ın token yenileme işlemini yapabiliriz
            # Şimdilik basit olarak bir hata fırlatıyoruz
            raise ValueError("System mail token expired, please reconnect the account")
        
        # E-posta içeriğini oluştur
        message = MIMEMultipart()
        message['to'] = to_email
        message['subject'] = 'Şifre Sıfırlama İsteği - Email Manager'
        
        # HTML içeriği
        html = f"""
        <html>
            <body>
                <h2>Email Manager - Şifre Sıfırlama</h2>
                <p>Merhaba {username},</p>
                <p>Şifrenizi sıfırlamak için bir istek aldık. Eğer bu isteği siz yapmadıysanız, bu e-postayı görmezden gelebilirsiniz.</p>
                <p>Şifrenizi sıfırlamak için aşağıdaki bağlantıya tıklayın:</p>
                <p><a href="{reset_link}">Şifremi Sıfırla</a></p>
                <p>Bu bağlantı 24 saat süreyle geçerlidir.</p>
                <p>Teşekkürler,<br>Email Manager Ekibi</p>
            </body>
        </html>
        """
        
        # E-postaya HTML içeriği ekle
        message.attach(MIMEText(html, 'html'))
        
        # Gmail API için e-postayı base64 formatına dönüştür
        raw_message = base64.urlsafe_b64encode(message.as_bytes()).decode('utf-8')
        
        try:
            # Kimlik bilgilerini oluştur
            credentials = Credentials(
                token=system_mail.access_token,
                refresh_token=system_mail.refresh_token,
                token_uri=GOOGLE_TOKEN_URI,
                client_id=self.GOOGLE_CLIENT_ID,
                client_secret=self.GOOGLE_CLIENT_SECRET
            )
            
            # Gmail servisi oluştur
            service = build('gmail', 'v1', credentials=credentials)
            
            # E-postayı gönder
            message = service.users().messages().send(
                userId='me',
                body={'raw': raw_message}
            ).execute()
            
            return True
        except Exception as e:
            print(f"Error sending email: {str(e)}")
            return False 