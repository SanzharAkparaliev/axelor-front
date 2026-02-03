# qr-service (Java client) — README

Лёгкий Java-клиент для работы с QR Service по HTTP.

**Версия:** `0.4.0`  
**Java:** 11+ (рекомендуется 17)

---

## Возможности

Библиотека предоставляет готовые клиенты для трёх операций:

1. **Pre-create** — предварительное создание документа (получение QR)
2. **Final upload** — загрузка финального подписанного файла
3. **Update status** — обновление статуса документа

---

## Установка

### Maven

```xml
<dependency>
  <groupId>io.github.syimyk2005</groupId>
  <artifactId>qr-service</artifactId>
  <version>0.4.0</version>
</dependency>
```

Gradle (Groovy)
```gradlew
implementation 'io.github.syimyk2005:qr-service:0.4.0'
```
Gradle (Kotlin)
```gradlew
implementation("io.github.syimyk2005:qr-service:0.4.0")
```

Конфигурация
application.properties
```gradlew
# Base URL API сервиса
qr.service.base-url=https://api.example.com

# API ключ для доступа
qr.service.api-key=YOUR_REAL_API_KEY
```
application.yml
```gradlew
qr:
  service:
    base-url: https://api.example.com
    api-key: YOUR_REAL_API_KEY
```
Важно: используйте qr.service.api-key, а не qr.api.key.


## Быстрый старт
Ниже приведены примеры использования клиентов напрямую из Java-кода.

1) Pre-create — предварительное создание документа (получение QR)
Импорты
```java
import qr.service.client.PreCreateClient;
import qr.service.domain.PreCreateRequest;
```




