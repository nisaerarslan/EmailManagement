# Email Manager

Modern ve güvenli bir e-posta yönetim sistemi. Gmail ve Outlook hesaplarını tek bir platformda yönetebilir, otomatik yanıtlar oluşturabilir ve şifre yönetimi yapabilirsiniz.

## 🚀 Özellikler

- **Çoklu E-posta Hesabı Desteği**: Gmail ve Outlook hesaplarını tek platformda yönetin
- **Otomatik Yanıt Sistemi**: AI destekli akıllı yanıtlar
- **Şifre Yöneticisi**: Güvenli şifre saklama ve yönetimi
- **E-posta Grupları**: E-postaları kategorilere ayırın
- **Çok Dilli Destek**: Türkçe ve İngilizce dil desteği
- **Modern UI/UX**: Responsive ve kullanıcı dostu arayüz

## 🛠️ Teknolojiler

### Backend
- **Python 3.8+**
- **FastAPI**
- **MySQL**
- **OAuth 2.0**
- **OpenAI API**

### Frontend
- **React 18**
- **TypeScript**
- **Vite**
- **Tailwind CSS**
- **React Router**

## 📋 Gereksinimler

- Python 3.8+
- Node.js 16+
- MySQL 8.0+
- Git

## 🔧 Kurulum

### 1. Repository'yi klonlayın
```bash
git clone https://github.com/nisaeerarslan/EmailManagement.git
cd EmailManagement
```

### 2. Backend Kurulumu

```bash
cd backend
pip install -r requirements.txt
```

#### Environment Variables
`backend/env.example` dosyasını `backend/.env` olarak kopyalayın ve gerekli değerleri doldurun:

```bash
cp backend/env.example backend/.env
```

Gerekli environment variables:
- `DB_PASSWORD`: MySQL veritabanı şifresi
- `GMAIL_CLIENT_ID`: Google OAuth Client ID
- `GMAIL_CLIENT_SECRET`: Google OAuth Client Secret
- `OUTLOOK_CLIENT_ID`: Microsoft OAuth Client ID
- `OUTLOOK_CLIENT_SECRET`: Microsoft OAuth Client Secret
- `OPENAI_API_KEY`: OpenAI API anahtarı
- `JWT_SECRET`: JWT imzalama anahtarı

### 3. Frontend Kurulumu

```bash
cd frontend
npm install
```

#### Environment Variables
`frontend/env.example` dosyasını `frontend/.env` olarak kopyalayın:

```bash
cp frontend/env.example frontend/.env
```

### 4. Veritabanı Kurulumu

MySQL'de `mail_management` adında bir veritabanı oluşturun:

```sql
CREATE DATABASE mail_management CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 5. Uygulamayı Çalıştırma

#### Backend
```bash
cd backend
python src/app.py
```

#### Frontend
```bash
cd frontend
npm run dev
```

Uygulama şu adreslerde çalışacak:
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000

## 🔐 Güvenlik

Bu proje aşağıdaki güvenlik önlemlerini içerir:

- **Environment Variables**: Tüm hassas bilgiler `.env` dosyalarında saklanır
- **OAuth 2.0**: Güvenli kimlik doğrulama
- **JWT Tokens**: Güvenli oturum yönetimi
- **HTTPS**: Üretim ortamında SSL/TLS kullanımı
- **Input Validation**: Tüm kullanıcı girdileri doğrulanır

## 📝 API Dokümantasyonu

Backend API dokümantasyonuna şu adresten erişebilirsiniz:
http://localhost:8000/docs

## 🤝 Katkıda Bulunma

1. Bu repository'yi fork edin
2. Yeni bir branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Değişikliklerinizi commit edin (`git commit -m 'Add some amazing feature'`)
4. Branch'inizi push edin (`git push origin feature/amazing-feature`)
5. Pull Request oluşturun

## 📄 Lisans

Bu proje MIT lisansı altında lisanslanmıştır. Detaylar için `LICENSE` dosyasına bakın.

## 📞 İletişim

- **Geliştiriciler**: Nisa Erarslan / Aykut Adem / Fatih Ünal
- **GitHub**: [@nisaeerarslan](https://github.com/nisaeerarslan)

## ⚠️ Önemli Notlar

- `.env` dosyalarını asla GitHub'a push etmeyin
- Üretim ortamında güçlü şifreler kullanın
- Düzenli olarak güvenlik güncellemelerini kontrol edin
- API anahtarlarınızı güvenli tutun

## 🚀 Deployment

### Backend Deployment
```bash
# Production için gerekli environment variables'ları ayarlayın
export FLASK_ENV=production
export FLASK_DEBUG=False
```

### Frontend Deployment
```bash
npm run build
```

Build edilen dosyalar `dist/` klasöründe oluşturulacaktır. 
