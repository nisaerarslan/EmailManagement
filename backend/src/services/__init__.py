# Services package
# This file makes the services directory a Python package

# Services package initialization

from services.user_service import UserService
from services.mail_account_service import MailAccountService
from services.email_service import EmailService
from services.password_manager_service import PasswordManagerService

# New refactored services
from services.base_service import BaseService
from services.authentication_service import AuthenticationService
from services.account_management_service import AccountManagementService
from services.message_service import MessageService