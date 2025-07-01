import os
import sys
import mysql.connector
from mysql.connector import Error

# src dizinini Python path'ine ekle
current_dir = os.path.dirname(os.path.abspath(__file__))
src_dir = os.path.dirname(os.path.dirname(current_dir))
sys.path.append(src_dir)

# Veritabanı yapılandırması
DB_CONFIG = {
    'host': 'localhost',
    'user': 'root',
    'password': '1234',
    'database': 'mail_management'
}

def create_database():
    try:
        # Veritabanı olmadan bağlan
        connection = mysql.connector.connect(
            host=DB_CONFIG['host'],
            user=DB_CONFIG['user'],
            password=DB_CONFIG['password']
        )
        cursor = connection.cursor()
        
        # Veritabanını oluştur
        cursor.execute(f"CREATE DATABASE IF NOT EXISTS {DB_CONFIG['database']}")
        print(f"Database {DB_CONFIG['database']} created successfully")
        
        cursor.close()
        connection.close()
    except Error as e:
        print(f"Error creating database: {e}")
        raise

def run_migrations():
    connection = None
    try:
        # Önce veritabanını oluştur
        create_database()
        
        # Veritabanı bağlantısı
        connection = mysql.connector.connect(**DB_CONFIG)
        cursor = connection.cursor()

        # Migration dosyalarını sıralı bir şekilde çalıştır
        migrations_dir = os.path.join(os.path.dirname(__file__), 'migrations')
        migration_files = sorted([f for f in os.listdir(migrations_dir) if f.endswith('.sql')])

        for migration_file in migration_files:
            print(f"Running migration: {migration_file}")
            file_path = os.path.join(migrations_dir, migration_file)
            
            with open(file_path, 'r', encoding='utf-8') as file:
                sql_commands = file.read()
                
                # Her bir SQL komutunu ayrı ayrı çalıştır
                for command in sql_commands.split(';'):
                    if command.strip():
                        try:
                            cursor.execute(command)
                        except Error as e:
                            print(f"Error executing command: {e}")
                            print(f"Command: {command}")
                            raise

        connection.commit()
        print("Migrations completed successfully!")

    except Error as e:
        print(f"Error connecting to MySQL: {e}")
    finally:
        if connection and connection.is_connected():
            cursor.close()
            connection.close()

if __name__ == "__main__":
    run_migrations() 