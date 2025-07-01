from datetime import datetime
from models.password_manager import PasswordEntry
from repositories.password_manager_repository import PasswordManagerRepository
from services.PassAlgo import (
    generate_user_key,
    encrypt_user_key,
    decrypt_user_key,
    encrypt_password,
    decrypt_password
)
import os
import traceback
import sys

class PasswordManagerService:
    def __init__(self):
        self.repository = PasswordManagerRepository()
        self.MASTER_KEY = os.getenv("MASTER_KEY")
        print("Initialized PasswordManagerService with MASTER_KEY:", self.MASTER_KEY[:10] + "..." if self.MASTER_KEY else "None")

    async def add_password(self, user_id: int, title: str, password: str, descriptions: str = "") -> dict:
        try:
            print(f"Adding password for user {user_id}, title {title}")
            
            # Generate a new user key for this entry
            user_key = generate_user_key()
            print("Generated user key:", user_key[:10] + "...")
            
            # Encrypt the user key with master key
            encrypted_user_key = encrypt_user_key(user_key)
            print("Encrypted user key:", encrypted_user_key[:10] + "...")
            
            # Encrypt the password with user key
            encrypted_password = encrypt_password(password, user_key)
            print("Encrypted password:", encrypted_password[:10] + "...")
            
            # Create the entry
            entry = PasswordEntry(
                entry_id=0,  # Will be set by database
                user_id=user_id,
                title=title,
                encrypted_password=encrypted_password,
                encrypted_user_key=encrypted_user_key,
                created_at=datetime.now(),
                created_id=user_id,
                updated_at=None,
                updated_id=None,
                descriptions=descriptions
            )
            
            print("Creating entry in database...")
            created_entry = await self.repository.create_entry(entry)
            print("Entry created:", created_entry)
            
            # Return only necessary data
            return {
                "entry_id": created_entry.entry_id,
                "title": created_entry.title,
                "descriptions": created_entry.descriptions
            }
            
        except Exception as e:
            print("Error in add_password service:", str(e))
            print("Full traceback:")
            traceback.print_exc(file=sys.stdout)
            raise e

    async def get_passwords(self, user_id: int) -> list:
        try:
            entries = await self.repository.get_entries_by_user_id(user_id)
            result = []
            
            for entry in entries:
                try:
                    # Decrypt user key
                    user_key = decrypt_user_key(entry.encrypted_user_key)
                    
                    # Decrypt password
                    decrypted_password = decrypt_password(entry.encrypted_password, user_key)
                    
                    result.append({
                        "entry_id": entry.entry_id,
                        "title": entry.title,
                        "password": decrypted_password,
                        "descriptions": entry.descriptions
                    })
                except Exception as decrypt_error:
                    print(f"Error decrypting password for entry {entry.entry_id}: {str(decrypt_error)}")
                    # Include the entry without the decrypted password to avoid missing entries
                    result.append({
                        "entry_id": entry.entry_id,
                        "title": entry.title,
                        "password": "***ENCRYPTED***",
                        "descriptions": entry.descriptions
                    })
            
            return result
        except Exception as e:
            print("Error in get_passwords service:", str(e))
            print("Full traceback:")
            traceback.print_exc(file=sys.stdout)
            raise e

    async def delete_password(self, entry_id: int, user_id: int) -> bool:
        try:
            return await self.repository.delete_entry(entry_id, user_id)
        except Exception as e:
            print("Error in delete_password service:", str(e))
            print("Full traceback:")
            traceback.print_exc(file=sys.stdout)
            raise e 