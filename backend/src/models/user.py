from dataclasses import dataclass
from datetime import datetime
from typing import Optional, Dict, Any
from models.base_model import BaseModel

@dataclass
class User(BaseModel):
    _table_name = "Users"
    _primary_key = "user_id"
    
    user_id: Optional[int] = None
    username: str = None
    email: str = None
    password_hash: str = None
    status: bool = True
    created_at: Optional[datetime] = None
    created_id: Optional[int] = None
    updated_at: Optional[datetime] = None
    updated_id: Optional[int] = None
    name: Optional[str] = None
    img_src: Optional[str] = None
    otp_secret: Optional[str] = None
    otp_enabled: Optional[bool] = False
    recovery_code: Optional[str] = None
    last_activity: Optional[datetime] = None

    @staticmethod
    def from_db(row):
        if not row:
            return None
        return User(
            user_id=row['user_id'],
            username=row['username'],
            email=row['email'],
            password_hash=row['password_hash'],
            status=bool(row['status']),
            created_at=row['created_at'],
            created_id=row['created_id'],
            updated_at=row['updated_at'],
            updated_id=row['updated_id'],
            name=row.get('name'),
            img_src=row.get('img_src'),
            otp_secret=row.get('otp_secret'),
            otp_enabled=bool(row.get('otp_enabled', False)),
            recovery_code=row.get('recovery_code'),
            last_activity=row.get('last_activity')
        )
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'User':
        """Create a User instance from a dictionary."""
        return cls(
            user_id=data.get('user_id'),
            username=data.get('username'),
            email=data.get('email'),
            password_hash=data.get('password_hash'),
            status=data.get('status', True),
            created_at=cls.parse_datetime(data.get('created_at')),
            created_id=data.get('created_id'),
            updated_at=cls.parse_datetime(data.get('updated_at')),
            updated_id=data.get('updated_id'),
            name=data.get('name'),
            img_src=data.get('img_src'),
            otp_secret=data.get('otp_secret'),
            otp_enabled=data.get('otp_enabled', False),
            recovery_code=data.get('recovery_code'),
            last_activity=cls.parse_datetime(data.get('last_activity'))
        )
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert the User instance to a dictionary."""
        return {
            'user_id': self.user_id,
            'username': self.username,
            'email': self.email,
            'status': self.status,
            'created_at': self.format_datetime(self.created_at),
            'created_id': self.created_id,
            'updated_at': self.format_datetime(self.updated_at),
            'updated_id': self.updated_id,
            'name': self.name,
            'img_src': self.img_src,
            'otp_enabled': self.otp_enabled
        } 