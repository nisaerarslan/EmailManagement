from datetime import datetime
from typing import Optional, Dict, Any
from models.base_model import BaseModel

class Email(BaseModel):
    _table_name = "MailLogs"
    _primary_key = "log_id"
    
    def __init__(
        self,
        id: int,
        account_id: int,
        message_id: str,
        subject: str,
        sender: str,
        recipient: str,
        body: str,
        received_at: datetime,
        is_read: bool = False,
        created_at: Optional[datetime] = None
    ):
        self.id = id
        self.account_id = account_id
        self.message_id = message_id
        self.subject = subject
        self.sender = sender
        self.recipient = recipient
        self.body = body
        self.received_at = received_at
        self.is_read = is_read
        self.created_at = created_at or datetime.now()

    @classmethod
    async def create(
        cls,
        account_id: int,
        message_id: str,
        subject: str,
        sender: str,
        recipient: str,
        body: str,
        received_at: datetime,
        is_read: bool = False
    ) -> 'Email':
        # TODO: Implement database creation
        return cls(
            id=1,  # This should come from the database
            account_id=account_id,
            message_id=message_id,
            subject=subject,
            sender=sender,
            recipient=recipient,
            body=body,
            received_at=received_at,
            is_read=is_read
        )
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'Email':
        """Create an Email instance from a dictionary."""
        id = data.get('id', 0)
        account_id = data.get('account_id', 0)
        message_id = data.get('message_id', '')
        subject = data.get('subject', '')
        sender = data.get('sender', '')
        recipient = data.get('recipient', '')
        body = data.get('body', '')
        
        # Handle datetime fields
        received_at = cls.parse_datetime(data.get('received_at')) or datetime.now()
        created_at = cls.parse_datetime(data.get('created_at')) or datetime.now()
        
        is_read = data.get('is_read', False)
        
        return cls(
            id=id,
            account_id=account_id,
            message_id=message_id,
            subject=subject,
            sender=sender,
            recipient=recipient,
            body=body,
            received_at=received_at,
            is_read=is_read,
            created_at=created_at
        )

    def to_dict(self) -> dict:
        """Convert the Email instance to a dictionary."""
        return {
            'id': self.id,
            'account_id': self.account_id,
            'message_id': self.message_id,
            'subject': self.subject,
            'sender': self.sender,
            'recipient': self.recipient,
            'body': self.body,
            'received_at': self.format_datetime(self.received_at),
            'is_read': self.is_read,
            'created_at': self.format_datetime(self.created_at)
        } 