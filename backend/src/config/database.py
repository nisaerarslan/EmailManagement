import os
from dotenv import load_dotenv
import aiomysql
import traceback
from aiomysql.cursors import DictCursor

# Load environment variables
load_dotenv()

MYSQL_CONFIG = {
    'host': os.getenv('DB_HOST', 'localhost'),
    'port': int(os.getenv('DB_PORT', 3306)),
    'user': os.getenv('DB_USER', 'root'),
    'password': os.getenv('DB_PASSWORD'),  # Use password from .env
    'db': os.getenv('DB_NAME', 'mail_management'),
    'charset': 'utf8mb4',
    'autocommit': True,
    'cursorclass': DictCursor
}

_pool = None

async def get_pool():
    global _pool
    try:
        if _pool is None:
            print("Creating new database connection pool with config:", MYSQL_CONFIG)
            _pool = await aiomysql.create_pool(**MYSQL_CONFIG)
            print("Database connection pool created successfully")
        return _pool
    except Exception as e:
        print(f"Database connection error: {str(e)}")
        print("Full traceback:")
        print(traceback.format_exc())
        raise 