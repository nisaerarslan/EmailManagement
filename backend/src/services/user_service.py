import bcrypt
import jwt
import pyotp
import qrcode
import base64
import io
import random
import string
import secrets
import uuid
from datetime import datetime, timedelta
from models.user import User
from repositories.user_repository import UserRepository
from services.system_mail_service import SystemMailService
from config.oauth_config import FRONTEND_URL  # Frontend URL'i config'den import et

class UserService:
    def __init__(self):
        self.user_repository = UserRepository()
        self.JWT_SECRET = "your-secret-key"  # In production, use environment variable

    async def register(self, username: str, email: str, password: str) -> dict:
        # Check if user exists
        existing_user = await self.user_repository.get_by_email(email)
        if existing_user:
            raise ValueError("Email already registered")

        existing_username = await self.user_repository.get_by_username(username)
        if existing_username:
            raise ValueError("Username already taken")

        # Hash password
        salt = bcrypt.gensalt()
        password_hash = bcrypt.hashpw(password.encode('utf-8'), salt)

        # Generate OTP secret - make sure it's not None
        try:
            otp_secret = pyotp.random_base32()
            if not otp_secret:
                # Fallback in case random_base32 returns None
                otp_secret = pyotp.random_base32()
        except Exception as e:
            print(f"Error generating OTP secret: {str(e)}")
            # Provide a safe fallback
            otp_secret = "".join([random.choice("ABCDEFGHIJKLMNOPQRSTUVWXYZ234567") for _ in range(16)])

        # Create user
        new_user = User(
            username=username,
            email=email,
            password_hash=password_hash.decode('utf-8'),
            status=True,
            created_id=0,  # System created
            otp_secret=otp_secret,
            otp_enabled=False
        )

        created_user = await self.user_repository.create_user(new_user)
        
        # Create QR code for Google Authenticator
        qr_data = self._generate_otp_qr_data(created_user)
        
        response = self._generate_auth_response(created_user)
        response['otp_setup'] = {
            'qr_code': qr_data,
            'secret': otp_secret
        }
        
        return response

    async def login(self, identifier: str, password: str, otp_code: str = None, recovery_code: str = None, request_info: dict = None) -> dict:
        user = await self.user_repository.get_by_email_or_username(identifier)
        if not user:
            # Log failed login attempt
            await self._log_login_attempt(None, False, request_info)
            raise ValueError("Invalid username/email or password")

        if not bcrypt.checkpw(password.encode('utf-8'), user.password_hash.encode('utf-8')):
            # Log failed login attempt
            await self._log_login_attempt(user.user_id, False, request_info)
            raise ValueError("Invalid username/email or password")
            
        # Kurtarma kodu kontrolü (eğer OTP etkinse ve kurtarma kodu verildiyse)
        if user.otp_enabled and recovery_code:
            recovery_valid = await self._verify_recovery_code(user.user_id, recovery_code, request_info)
            if recovery_valid:
                # Log successful login
                await self._log_login_attempt(user.user_id, True, request_info)
                # Update last activity time
                await self.user_repository.update_last_activity(user.user_id)
                return self._generate_auth_response(user)
            else:
                # Log failed recovery code attempt
                await self._log_otp_activity(user.user_id, "recovery_code_use", False, request_info)
                raise ValueError("Invalid recovery code")
                
        # If OTP is enabled and secret exists, verify the code
        if user.otp_enabled and user.otp_secret:
            if not otp_code:
                return {
                    'require_otp': True,
                    'message': 'OTP verification required'
                }
                
            if not self._verify_otp(user.otp_secret, otp_code):
                # Log failed OTP verification
                await self._log_otp_activity(user.user_id, "otp_verify", False, request_info)
                raise ValueError("Invalid OTP code")
                
            # Log successful OTP verification
            await self._log_otp_activity(user.user_id, "otp_verify", True, request_info)
            
        # Check if OTP is enabled but secret is missing (error state)
        elif user.otp_enabled and not user.otp_secret:
            # Log this error state
            print(f"ERROR: User {user.user_id} has OTP enabled but no secret key")
            # Disable OTP for this user to prevent login issues
            await self.user_repository.enable_otp(user.user_id, False)
            await self._log_otp_activity(user.user_id, "otp_disabled_auto", True, request_info)
            # Continue login process

        # Log successful login
        await self._log_login_attempt(user.user_id, True, request_info)
        # Update last activity time
        await self.user_repository.update_last_activity(user.user_id)

        return self._generate_auth_response(user)
        
    def _verify_otp(self, secret: str, code: str) -> bool:
        """OTP kodunu doğrula"""
        # Gizli anahtar veya kod boşsa doğrulama başarısız
        if not secret or not code:
            return False
            
        totp = pyotp.TOTP(secret)
        return totp.verify(code)
    
    async def _log_login_attempt(self, user_id: int, success: bool, request_info: dict = None) -> None:
        """Giriş denemesini logla"""
        if user_id is None:
            return
            
        ip_address = ""
        user_agent = ""
        
        if request_info:
            ip_address = request_info.get('ip', '')
            user_agent = request_info.get('user_agent', '')
            
        await self.user_repository.log_login_activity(user_id, success, ip_address, user_agent)
        
    async def _log_otp_activity(self, user_id: int, activity_type: str, success: bool, request_info: dict = None) -> None:
        """OTP aktivitesini logla"""
        if user_id is None:
            return
            
        ip_address = ""
        
        if request_info:
            ip_address = request_info.get('ip', '')
            
        await self.user_repository.log_otp_activity(user_id, activity_type, success, ip_address)
    
    def _generate_otp_qr_data(self, user: User) -> str:
        """Google Authenticator için QR kod oluştur"""
        if not user or not user.otp_secret:
            # Güvenli bir fallback sağla
            fallback_secret = pyotp.random_base32()
            totp = pyotp.TOTP(fallback_secret)
            uri = totp.provisioning_uri(name=user.email if user else "user@example.com", issuer_name="EmailManager")
        else:
            # OTP URI oluştur (otpauth://totp/Label:user_email?secret=SECRET&issuer=YourAppName)
            totp = pyotp.TOTP(user.otp_secret)
            uri = totp.provisioning_uri(name=user.email, issuer_name="EmailManager")
        
        # QR kod oluştur
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=10,
            border=4,
        )
        qr.add_data(uri)
        qr.make(fit=True)
        
        img = qr.make_image(fill_color="black", back_color="white")
        
        # Resmi Base64'e dönüştür
        buffered = io.BytesIO()
        img.save(buffered, format="PNG")
        return f"data:image/png;base64,{base64.b64encode(buffered.getvalue()).decode('utf-8')}"

    def _generate_auth_response(self, user: User) -> dict:
        token = jwt.encode({
            'user_id': user.user_id,
            'email': user.email,
            'exp': datetime.utcnow() + timedelta(days=7)
        }, self.JWT_SECRET, algorithm='HS256')

        return {
            'token': token,
            'user': {
                'user_id': user.user_id,
                'username': user.username,
                'email': user.email,
                'otp_enabled': user.otp_enabled
            }
        }
        
    async def setup_otp(self, user_id: int, enable: bool = True, request_info: dict = None) -> dict:
        """Kullanıcı için OTP kurulumunu etkinleştirir"""
        user = await self.user_repository.get_by_id(user_id)
        if not user:
            raise ValueError("User not found")
            
        if enable:
            # OTP etkinleştiriliyorsa, geçerli bir secret olduğundan emin ol
            if not user.otp_secret:
                # Eğer secret yoksa yeni bir tane oluştur
                new_otp_secret = pyotp.random_base32()
                await self.user_repository.update_otp_secret(user_id, new_otp_secret)
                
            # OTP durumunu aktif yap
            await self.user_repository.enable_otp(user_id, True)
            await self._log_otp_activity(user_id, "otp_setup_enable", True, request_info)
            return {'success': True, 'message': 'OTP enabled successfully'}
        else:
            # OTP durumunu deaktif yap
            await self.user_repository.enable_otp(user_id, False)
            await self._log_otp_activity(user_id, "otp_setup_disable", True, request_info)
            return {'success': True, 'message': 'OTP disabled successfully'}
        
    async def regenerate_otp(self, user_id: int, request_info: dict = None) -> dict:
        """Kullanıcı için yeni OTP sırrı oluşturur"""
        user = await self.user_repository.get_by_id(user_id)
        if not user:
            raise ValueError("User not found")
            
        # Yeni OTP sırrı oluştur
        new_otp_secret = pyotp.random_base32()
        
        # OTP sırrını güncelle
        await self.user_repository.update_otp_secret(user_id, new_otp_secret)
        
        # Aktiviteyi logla
        await self._log_otp_activity(user_id, "otp_regenerate", True, request_info)
        
        # Güncel kullanıcı bilgilerini al
        updated_user = await self.user_repository.get_by_id(user_id)
        
        # QR kod oluştur
        qr_data = self._generate_otp_qr_data(updated_user)
        
        return {
            'success': True,
            'otp_setup': {
                'qr_code': qr_data,
                'secret': new_otp_secret
            }
        }
    
    async def generate_recovery_code(self, user_id: int, request_info: dict = None) -> dict:
        """Kullanıcı için kurtarma kodu oluşturur"""
        user = await self.user_repository.get_by_id(user_id)
        if not user:
            raise ValueError("User not found")
            
        # OTP etkin değilse hata ver
        if not user.otp_enabled:
            raise ValueError("Two-factor authentication must be enabled to generate recovery codes")
            
        # 16 karakter uzunluğunda rastgele kurtarma kodu oluştur (4 blok halinde)
        recovery_code = ""
        for i in range(4):
            block = ''.join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(4))
            recovery_code += block
            if i < 3:
                recovery_code += "-"
        
        # Kurtarma kodunu veritabanına kaydet
        await self.user_repository.update_recovery_code(user_id, recovery_code)
        
        # Aktiviteyi logla
        await self._log_otp_activity(user_id, "recovery_code_generate", True, request_info)
        
        return {
            'success': True,
            'recovery_code': recovery_code
        }
        
    async def _verify_recovery_code(self, user_id: int, recovery_code: str, request_info: dict = None) -> bool:
        """Kurtarma kodunu doğrular"""
        user = await self.user_repository.get_by_id(user_id)
        if not user or not user.recovery_code:
            return False
            
        # Tireler olmadan karşılaştır
        stored_code = user.recovery_code.replace("-", "")
        input_code = recovery_code.replace("-", "")
        
        # Büyük harfe çevir ve karşılaştır
        is_valid = stored_code.upper() == input_code.upper()
        
        if is_valid:
            # Kullanıldıktan sonra kurtarma kodunu sıfırla (tek kullanımlık)
            await self.user_repository.update_recovery_code(user_id, None)
            
            # Aktiviteyi logla
            await self._log_otp_activity(user_id, "recovery_code_use", True, request_info)
            
        return is_valid

    async def get_user_profile(self, user_id: int) -> dict:
        """Kullanıcı profil bilgilerini getirir"""
        user = await self.user_repository.get_by_id(user_id)
        if not user:
            raise ValueError("User not found")

        return {
            'username': user.username,
            'email': user.email,
            'name': user.name,
            'img_src': user.img_src
        }

    async def change_password(self, user_id: int, current_password: str, new_password: str) -> None:
        """Kullanıcının şifresini değiştirir"""
        user = await self.user_repository.get_by_id(user_id)
        if not user:
            raise ValueError("User not found")

        # Mevcut şifreyi kontrol et
        if not bcrypt.checkpw(current_password.encode('utf-8'), user.password_hash.encode('utf-8')):
            raise ValueError("Current password is incorrect")

        # Yeni şifreyi hashle
        salt = bcrypt.gensalt()
        new_password_hash = bcrypt.hashpw(new_password.encode('utf-8'), salt)

        # Şifreyi güncelle
        await self.user_repository.update_password(user_id, new_password_hash.decode('utf-8'))

    async def update_profile(self, user_id: int, name: str = None, email: str = None) -> None:
        """Kullanıcı profil bilgilerini günceller"""
        user = await self.user_repository.get_by_id(user_id)
        if not user:
            raise ValueError("User not found")

        # E-posta değişiyorsa, başka bir kullanıcıda var mı kontrol et
        if email and email != user.email:
            existing_user = await self.user_repository.get_by_email(email)
            if existing_user:
                raise ValueError("Email already in use")

        # Profili güncelle
        await self.user_repository.update_profile(user_id, name, email)

    async def update_avatar(self, user_id: int, image_data: str) -> None:
        """Kullanıcının profil fotoğrafını günceller"""
        user = await self.user_repository.get_by_id(user_id)
        if not user:
            raise ValueError("User not found")

        # Profil fotoğrafını güncelle
        await self.user_repository.update_avatar(user_id, image_data)

    async def request_password_reset(self, identifier: str) -> dict:
        """Kullanıcı tarafından şifre sıfırlama isteği gönderilir"""
        # E-posta veya kullanıcı adına göre kullanıcıyı bul
        user = await self.user_repository.get_by_email_or_username(identifier)
        if not user:
            # Güvenlik açısından kullanıcı bulunamasa bile başarılı mesajı döndür
            return {
                "success": True,
                "message": "Şifre sıfırlama bağlantısı gönderildi (eğer hesap mevcutsa)."
            }
        
        # Şifre sıfırlama kodu oluştur
        reset_token = str(uuid.uuid4())
        reset_expires = datetime.utcnow() + timedelta(hours=72)  # 72 saat geçerli
        
        # Şifre sıfırlama kodunu veritabanında sakla
        await self.user_repository.set_password_reset_token(user.user_id, reset_token, reset_expires)
        
        # Sıfırlama bağlantısı oluştur
        reset_link = f"{FRONTEND_URL}/sifre-sifirla/{reset_token}"
        
        # Mail gönderme servisini başlat
        system_mail_service = SystemMailService()
        
        try:
            # Şifre sıfırlama e-postasını gönder
            mail_sent = await system_mail_service.send_password_reset_email(
                user.email,
                user.username,
                reset_link
            )
            
            if not mail_sent:
                return {
                    "success": False,
                    "message": "Şifre sıfırlama e-postası gönderilemedi. Lütfen daha sonra tekrar deneyin."
                }
                
            return {
                "success": True,
                "message": "Şifre sıfırlama bağlantısı gönderildi."
            }
        except Exception as e:
            print(f"Password reset email error: {str(e)}")
            return {
                "success": False,
                "message": "Şifre sıfırlama e-postası gönderilemedi. Sistem e-postası yapılandırılmamış olabilir."
            }
    
    async def verify_password_reset_token(self, token: str) -> dict:
        """Şifre sıfırlama token'ını doğrula"""
        # Token'ı veritabanında kontrol et
        user_with_token = await self.user_repository.get_user_by_reset_token(token)
        
        if not user_with_token:
            return {
                "success": False,
                "message": "Geçersiz veya süresi dolmuş şifre sıfırlama bağlantısı."
            }
        
        # Token'ın geçerlilik süresini kontrol et
        current_time = datetime.utcnow()
        
        # Tarih değerinin türünü kontrol et ve uygun şekilde dönüştür
        token_expires = user_with_token.get('reset_token_expires')
        
        if token_expires:
            # Eğer datetime objesi ise doğrudan kullan
            if isinstance(token_expires, datetime):
                expires_time = token_expires
            else:
                # String ise, doğru formatta parse et
                try:
                    # MySQL 8.0'dan önce
                    if isinstance(token_expires, str):
                        expires_time = datetime.strptime(token_expires, '%Y-%m-%d %H:%M:%S')
                    else:
                        # Diğer olası formatlarda çalışması için
                        expires_time = token_expires
                except ValueError:
                    try:
                        # ISO format denemesi
                        expires_time = datetime.fromisoformat(token_expires.replace('Z', '+00:00'))
                    except:
                        # Son çare olarak geçersiz say
                        return {
                            "success": False,
                            "message": "Şifre sıfırlama bağlantısının süresi dolmuş veya geçersiz."
                        }
                
            # Süre kontrolü
            if expires_time < current_time:
                return {
                    "success": False,
                    "message": "Şifre sıfırlama bağlantısının süresi dolmuş."
                }
        
        return {
            "success": True,
            "user_id": user_with_token.get('user_id')
        }
    
    async def reset_password(self, token: str, new_password: str) -> dict:
        """Şifreyi sıfırla"""
        # Token'ı doğrula
        verify_result = await self.verify_password_reset_token(token)
        
        if not verify_result.get('success'):
            return verify_result
        
        user_id = verify_result.get('user_id')
        
        # Şifreyi güncelle
        salt = bcrypt.gensalt()
        password_hash = bcrypt.hashpw(new_password.encode('utf-8'), salt)
        
        # Yeni şifreyi veritabanına kaydet ve token'ı sıfırla
        await self.user_repository.update_password(user_id, password_hash.decode('utf-8'))
        await self.user_repository.clear_reset_token(user_id)
        
        return {
            "success": True,
            "message": "Şifreniz başarıyla güncellendi."
        }