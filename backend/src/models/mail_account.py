from datetime import datetime
from typing import Optional, Dict, Any
from models.base_model import BaseModel

class MailAccount(BaseModel):
    _table_name = "MailAccounts"
    _primary_key = "account_id"
    
    def __init__(
        self,
        account_id: int,
        user_id: int,
        email: str,
        access_token: str,
        refresh_token: str,
        token_expiry: datetime,
        account_type: str,
        created_at: datetime,
        unread_count: int = 0,
        last_checked: Optional[datetime] = None
    ):
        self.account_id = account_id
        self.user_id = user_id
        self.email = email
        self.access_token = access_token
        self.refresh_token = refresh_token
        self.token_expiry = token_expiry
        self.account_type = account_type
        self.created_at = created_at
        self.unread_count = unread_count
        self.last_checked = last_checked

    @classmethod
    async def create(
        cls,
        user_id: int,
        email: str,
        provider: str,
        access_token: str,
        refresh_token: Optional[str] = None,
        token_expires_at: Optional[datetime] = None
    ) -> 'MailAccount':
        # TODO: Implement database creation
        return cls(
            account_id=1,  # This should come from the database
            user_id=user_id,
            email=email,
            access_token=access_token,
            refresh_token=refresh_token,
            token_expiry=token_expires_at,
            account_type=provider,
            created_at=datetime.now()
        )

    @classmethod
    async def get_by_id(cls, id: int) -> Optional['MailAccount']:
        # TODO: Implement database query
        return None

    @classmethod
    async def get_by_email(cls, email: str) -> Optional['MailAccount']:
        # TODO: Implement database query
        return None

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'MailAccount':
        """Create a MailAccount instance from a dictionary."""
        account_id = data.get('account_id', 0)
        user_id = data.get('user_id', 0)
        email = data.get('email', '')
        access_token = data.get('access_token', '')
        refresh_token = data.get('refresh_token', '')
        
        # Handle datetime fields
        token_expiry = cls.parse_datetime(data.get('token_expiry'))
        created_at = cls.parse_datetime(data.get('created_at')) or datetime.now()
        last_checked = cls.parse_datetime(data.get('last_checked'))
                
        account_type = data.get('account_type', '')
        unread_count = data.get('unread_count', 0)
        
        return cls(
            account_id=account_id,
            user_id=user_id,
            email=email,
            access_token=access_token,
            refresh_token=refresh_token,
            token_expiry=token_expiry,
            account_type=account_type,
            created_at=created_at,
            unread_count=unread_count,
            last_checked=last_checked
        )

    async def save(self) -> None:
        # TODO: Implement database update
        pass

    def to_dict(self) -> dict:
        """Convert the MailAccount instance to a dictionary."""
        return {
            'account_id': self.account_id,
            'user_id': self.user_id,
            'email': self.email,
            'access_token': self.access_token,
            'refresh_token': self.refresh_token,
            'token_expiry': self.format_datetime(self.token_expiry),
            'account_type': self.account_type,
            'created_at': self.format_datetime(self.created_at),
            'unread_count': self.unread_count,
            'last_checked': self.format_datetime(self.last_checked)
        } 