from dataclasses import dataclass
from datetime import datetime
from typing import Optional, Dict, Any
from models.base_model import BaseModel

@dataclass
class PasswordEntry(BaseModel):
    _table_name = "PasswordEntries"
    _primary_key = "entry_id"
    
    entry_id: int
    user_id: int
    title: str
    encrypted_password: str
    encrypted_user_key: str
    created_at: datetime
    created_id: int
    updated_at: Optional[datetime]
    updated_id: Optional[int]
    descriptions: Optional[str] = None

    @classmethod
    def from_db(cls, row):
        if not row:
            return None
        return cls(
            entry_id=row['entry_id'],
            user_id=row['user_id'],
            title=row['title'],
            encrypted_password=row['encrypted_password'],
            encrypted_user_key=row['encrypted_user_key'],
            created_at=row['created_at'],
            created_id=row['created_id'],
            updated_at=row['updated_at'],
            updated_id=row['updated_id'],
            descriptions=row.get('descriptions')
        )
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'PasswordEntry':
        """Create a PasswordEntry instance from a dictionary."""
        return cls(
            entry_id=data.get('entry_id', 0),
            user_id=data.get('user_id', 0),
            title=data.get('title', ''),
            encrypted_password=data.get('encrypted_password', ''),
            encrypted_user_key=data.get('encrypted_user_key', ''),
            created_at=cls.parse_datetime(data.get('created_at')) or datetime.now(),
            created_id=data.get('created_id', 0),
            updated_at=cls.parse_datetime(data.get('updated_at')),
            updated_id=data.get('updated_id'),
            descriptions=data.get('descriptions')
        )
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert the PasswordEntry instance to a dictionary."""
        return {
            'entry_id': self.entry_id,
            'user_id': self.user_id,
            'title': self.title,
            'encrypted_password': self.encrypted_password,
            'encrypted_user_key': self.encrypted_user_key,
            'created_at': self.format_datetime(self.created_at),
            'created_id': self.created_id,
            'updated_at': self.format_datetime(self.updated_at),
            'updated_id': self.updated_id,
            'descriptions': self.descriptions
        } 