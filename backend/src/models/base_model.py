from datetime import datetime
from typing import Dict, Any, Optional, TypeVar, Type, ClassVar

T = TypeVar('T', bound='BaseModel')

class BaseModel:
    """Base model class with common functionality for all models"""
    
    # Subclasses should override this with their table name
    _table_name: ClassVar[str] = ""
    _primary_key: ClassVar[str] = "id"
    
    @classmethod
    def from_dict(cls: Type[T], data: Dict[str, Any]) -> T:
        """
        Create a model instance from a dictionary.
        This method is meant to be overridden by subclasses for specific implementations.
        """
        raise NotImplementedError("Subclass must implement from_dict method")
    
    def to_dict(self) -> Dict[str, Any]:
        """
        Convert the model instance to a dictionary.
        This method is meant to be overridden by subclasses for specific implementations.
        """
        raise NotImplementedError("Subclass must implement to_dict method")
    
    @staticmethod
    def format_datetime(dt: Optional[datetime]) -> Optional[str]:
        """Format datetime objects for serialization"""
        if dt is None:
            return None
        return dt.isoformat() if isinstance(dt, datetime) else str(dt)
    
    @staticmethod
    def parse_datetime(dt_str: Any) -> Optional[datetime]:
        """Parse datetime strings from dictionary data"""
        if dt_str is None:
            return None
        if isinstance(dt_str, datetime):
            return dt_str
        if isinstance(dt_str, str):
            try:
                return datetime.fromisoformat(dt_str)
            except ValueError:
                return None
        return None 