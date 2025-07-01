from dataclasses import dataclass
from datetime import datetime
from typing import Optional, Dict, Any
from models.base_model import BaseModel

@dataclass
class SystemMail(BaseModel):
    _table_name = "SystemMail"
    _primary_key = "id"
    
    id: Optional[int] = None
    email: str = None
    access_token: str = None
    refresh_token: Optional[str] = None
    token_expiry: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    @staticmethod
    def from_db(row):
        if not row:
            return None
        return SystemMail(
            id=row['id'],
            email=row['email'],
            access_token=row['access_token'],
            refresh_token=row['refresh_token'],
            token_expiry=row['token_expiry'],
            created_at=row['created_at'],
            updated_at=row['updated_at']
        )
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'SystemMail':
        """Create a SystemMail instance from a dictionary."""
        return cls(
            id=data.get('id'),
            email=data.get('email'),
            access_token=data.get('access_token'),
            refresh_token=data.get('refresh_token'),
            token_expiry=cls.parse_datetime(data.get('token_expiry')),
            created_at=cls.parse_datetime(data.get('created_at')),
            updated_at=cls.parse_datetime(data.get('updated_at'))
        )
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert the SystemMail instance to a dictionary."""
        return {
            'id': self.id,
            'email': self.email,
            'token_expiry': self.format_datetime(self.token_expiry),
            'created_at': self.format_datetime(self.created_at),
            'updated_at': self.format_datetime(self.updated_at)
        } 