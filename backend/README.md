# Mail Management Backend

Bu proje, e-posta hesaplarını yönetmek için geliştirilmiş bir backend servisidir.

## Kurulum

1. Python bağımlılıklarını yükleyin:
```bash
pip install -r requirements.txt
```

2. Veritabanı ayarlarını yapılandırın:
- `config/database.py` dosyasındaki `DB_CONFIG` değişkenini kendi veritabanı bilgilerinizle güncelleyin.

3. Veritabanı migration'larını çalıştırın:
```bash
python src/database/migrate.py
```

## Veritabanı Migration'ları

Migration'lar, veritabanı şemasını oluşturmak ve güncellemek için kullanılır. Migration dosyaları `src/database/migrations` klasöründe bulunur.

### Yeni Migration Oluşturma

1. `src/database/migrations` klasöründe yeni bir SQL dosyası oluşturun
2. Dosya adını `XXX_description.sql` formatında verin (örn: `002_add_new_table.sql`)
3. SQL komutlarınızı yazın
4. Migration'ı çalıştırın:
```bash
python src/database/migrate.py
```

### Migration Sırası

Migration'lar dosya adına göre alfabetik sırayla çalıştırılır. Bu nedenle, migration dosyalarının isimlerini dikkatli bir şekilde numaralandırın:

- 001_initial_schema.sql
- 002_add_new_table.sql
- 003_modify_existing_table.sql
- vb.

## Geliştirme

1. Yeni bir branch oluşturun
2. Değişikliklerinizi yapın
3. Migration'ları güncelleyin (gerekirse)
4. Test edin
5. Pull request oluşturun

## Lisans

MIT 