import os
from cryptography.fernet import Fernet
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Generate a new master key if not set
MASTER_KEY = os.getenv("MASTER_KEY")
if not MASTER_KEY:
    MASTER_KEY = Fernet.generate_key().decode()
    
else:
    # Ensure MASTER_KEY is properly formatted
    try:
        Fernet(MASTER_KEY.encode())
    except ValueError:
        print("Invalid MASTER_KEY format. Generating new key...")
        MASTER_KEY = Fernet.generate_key().decode()
        

#Bir tane master key oluşturmak için kullan.
key = Fernet.generate_key()

#master key üretip onu .env içerisine kaydedilecek.
#master_key = os.getenv("MASTER_KEY") ile dosya içerisinden çağırılacak.

# --- User Key işlemleri ---

def generate_user_key() -> str:
    return Fernet.generate_key().decode()

def encrypt_user_key(user_key: str) -> str:
    f = Fernet(MASTER_KEY.encode())
    encrypted = f.encrypt(user_key.encode())
    return encrypted.decode()

def decrypt_user_key(encrypted_user_key: str) -> str:
    f = Fernet(MASTER_KEY.encode())
    decrypted = f.decrypt(encrypted_user_key.encode())
    return decrypted.decode()

# --- Parola işlemleri ---

def encrypt_password(password: str, user_key: str) -> str:
    f = Fernet(user_key.encode())
    return f.encrypt(password.encode()).decode()

def decrypt_password(encrypted_password: str, user_key: str) -> str:
    f = Fernet(user_key.encode())
    return f.decrypt(encrypted_password.encode()).decode()

# sonra db'ye encrypted_password ve encrypted_user_key kaydedilir

# parola kaydetme
benimsifrem = "fatihbenimşifrem"

# 1. Kullanıcı anahtarı oluştur
user_key = generate_user_key()

# 2. Anahtarı master key ile şifrele
encrypted_user_key = encrypt_user_key(user_key)

# 3. Şifreyi kullanıcı anahtarı ile şifrele
encrypted_password = encrypt_password(benimsifrem, user_key)

# parola görüntüleme
# 4. Kullanıcı anahtarını çöz
decrypted_user_key = decrypt_user_key(encrypted_user_key)

# 5. Parolayı çöz
plain_password = decrypt_password(encrypted_password, decrypted_user_key)

