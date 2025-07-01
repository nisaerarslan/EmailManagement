from sanic import Blueprint
from sanic.response import json, redirect, html
from services.system_mail_service import SystemMailService
import traceback
from config.oauth_config import FRONTEND_URL

system_mail_bp = Blueprint('system_mail', url_prefix='/api/systemmail')
system_mail_service = SystemMailService()

@system_mail_bp.get('/')
async def get_system_mail(request):
    """Mevcut sistem mail hesabını döndür"""
    try:
        system_mail = await system_mail_service.get_system_mail()
        if system_mail:
            return json({
                'success': True,
                'email': system_mail.email,
                'is_configured': True
            })
        else:
            return json({
                'success': True,
                'is_configured': False
            })
    except Exception as e:
        print(f"Error getting system mail: {str(e)}")
        print(traceback.format_exc())
        return json({'error': 'Internal server error', 'details': str(e)}, status=500)

@system_mail_bp.get('/auth-url')
async def get_auth_url(request):
    """Google Mail yetkilendirme URL'sini döndür"""
    try:
        auth_url = system_mail_service.generate_auth_url()
        return json({
            'success': True,
            'auth_url': auth_url
        })
    except Exception as e:
        print(f"Error generating auth URL: {str(e)}")
        print(traceback.format_exc())
        return json({'error': 'Internal server error', 'details': str(e)}, status=500)

@system_mail_bp.get('/callback')
async def handle_callback(request):
    """Google OAuth2 callback işlemini yap"""
    try:
        # URL'den auth code'u al
        code = request.args.get('code')
        if not code:
            return json({'error': 'Missing authorization code'}, status=400)
        
        # Email bilgisini al (frontend'den gelebilir veya sonradan setlenebilir)
        email = request.args.get('email')
        if not email:
            # Frontend erişilir durumda değilse, basit HTML form döndür
            html_content = """
            <!DOCTYPE html>
            <html>
            <head>
                <title>Sistem Mail Ayarları</title>
                <meta charset="UTF-8">
                <style>
                    body {{ font-family: Arial, sans-serif; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 20px; }}
                    .container {{ border: 1px solid #ddd; border-radius: 8px; padding: 20px; }}
                    input {{ width: 100%; padding: 8px; margin: 8px 0; }}
                    button {{ background: #4285f4; color: white; border: none; padding: 10px 15px; border-radius: 4px; cursor: pointer; }}
                    .error {{ color: red; margin: 10px 0; }}
                    .success-link {{ display: block; margin-top: 20px; text-align: center; }}
                </style>
            </head>
            <body>
                <div class="container">
                    <h2>Sistem Mail Hesabı Ayarla</h2>
                    <p>Lütfen kullanmak istediğiniz Gmail hesabını girin. Bu hesap, şifre sıfırlama ve sistem bildirimleri için kullanılacaktır.</p>
                    <form method="get" action="/api/systemmail/callback">
                        <input type="hidden" name="code" value="{0}">
                        <label for="email">Gmail Adresi:</label>
                        <input type="email" id="email" name="email" required placeholder="ornek@gmail.com">
                        <button type="submit">Hesabı Ayarla</button>
                    </form>
                    <a href="{1}/dashboard" class="success-link">Ana sayfaya dönmek için tıklayın</a>
                </div>
            </body>
            </html>
            """.format(code, FRONTEND_URL)
            
            return html(html_content)
        
        # Callback işlemini tamamla ve system_mail objesini kaydet
        try:
            system_mail = await system_mail_service.handle_google_callback(code, email)
            print(f"System mail hesabı başarıyla kaydedildi: {system_mail.email}")
            
            # Frontend'e başarılı mesajıyla yönlendir
            frontend_url = f"{FRONTEND_URL}/systemmail/success"
            return redirect(frontend_url)
        except Exception as e:
            print(f"System mail callback işlenirken hata: {str(e)}")
            print(traceback.format_exc())
            # Hatayı frontend'e yönlendir
            frontend_url = f"{FRONTEND_URL}/systemmail/error?message={str(e)}"
            return redirect(frontend_url)
            
    except Exception as e:
        print(f"Error handling callback: {str(e)}")
        print(traceback.format_exc())
        # Hatayı frontend'e yönlendir
        frontend_url = f"{FRONTEND_URL}/systemmail/error?message={str(e)}"
        return redirect(frontend_url)

@system_mail_bp.post('/update-email')
async def update_email(request):
    """Callback'ten gelen token ile sistem mail hesabını güncelle"""
    try:
        data = request.json
        if not all(key in data for key in ['code', 'email']):
            return json({'error': 'Missing required fields'}, status=400)
        
        # Callback'i işle
        system_mail = await system_mail_service.handle_google_callback(data['code'], data['email'])
        
        return json({
            'success': True,
            'email': system_mail.email
        })
    except Exception as e:
        print(f"Error updating system mail: {str(e)}")
        print(traceback.format_exc())
        return json({'error': 'Internal server error', 'details': str(e)}, status=500)

@system_mail_bp.delete('/<id:int>')
async def delete_system_mail(request, id):
    """Sistem mail hesabını sil"""
    try:
        result = await system_mail_service.delete_system_mail(id)
        return json({
            'success': result
        })
    except Exception as e:
        print(f"Error deleting system mail: {str(e)}")
        print(traceback.format_exc())
        return json({'error': 'Internal server error', 'details': str(e)}, status=500) 