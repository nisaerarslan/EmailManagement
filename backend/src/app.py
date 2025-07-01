import os
import sys
import logging
from sanic import Sanic
from sanic.response import json
from sanic_cors import CORS
from controllers.auth_controller import auth_bp
from controllers.mail_account_controller import mail_account_bp
from controllers.outlook_controller import outlook_bp
from middlewares.auth_middleware import auth_middleware
from controllers.gmail_controller import gmail_bp
from controllers.email_controller import email_bp
from controllers.user_controller import user_bp
from controllers.email_group_controller import email_group_bp
from controllers.password_manager_controller import password_manager_bp
from controllers.translation_controller import translation_bp
from controllers.auto_response_controller import auto_response_bp
from controllers.system_mail_controller import system_mail_bp

# Add src directory to Python path
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, current_dir)

# Configure logging
logging.getLogger('sanic').setLevel(logging.WARNING)
logging.getLogger('sanic_cors').setLevel(logging.ERROR)
logging.getLogger('sanic.access').setLevel(logging.ERROR)

app = Sanic("MailManagement")

# Configure CORS with minimal logging
CORS(app, resources={r"/api/*": {"origins": ["http://localhost:5173"]}}, automatic_options=True, log_level='ERROR')

# Register blueprints
app.blueprint(auth_bp)
app.blueprint(mail_account_bp)
app.blueprint(outlook_bp)
app.blueprint(gmail_bp)
app.blueprint(email_bp)
app.blueprint(user_bp)
app.blueprint(email_group_bp)
app.blueprint(password_manager_bp)
app.blueprint(translation_bp)
app.blueprint(auto_response_bp)
app.blueprint(system_mail_bp)

# Add middleware
app.middleware('request')(auth_middleware)

@app.get("/")
async def test(request):
    return json({"message": "Hello World"})

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000, debug=True, access_log=False)