import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

OPENAI_CONFIG = {
    'API_KEY': os.getenv('OPENAI_API_KEY'),  # API key from environment variable
    'MODEL': 'gpt-3.5-turbo',  # Default model
    'MAX_TOKENS': 1000,  # Maximum response length
    'TEMPERATURE': 0.7,  # Controls randomness (0: deterministic, 1: creative)
    'API_URL': 'https://api.openai.com/v1/chat/completions'
} 