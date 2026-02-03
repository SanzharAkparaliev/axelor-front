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
```xml
implementation 'io.github.syimyk2005:qr-service:0.4.0'
```
