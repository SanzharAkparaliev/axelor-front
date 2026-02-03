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
Пример
```java
import qr.service.client.PreCreateClient;
import qr.service.domain.PreCreateRequest;

import java.time.OffsetDateTime;
import java.util.Map;

public class PreCreateExample {

  public static void main(String[] args) throws Exception {
    String baseUrl = "https://api.example.com";
    String apiKey  = "YOUR_REAL_API_KEY";

    PreCreateRequest req = new PreCreateRequest(
        "Test document",
        OffsetDateTime.parse("2026-01-30T12:00:00+03:00"),
        Map.of("source", "mobile-app")
    );

    String response = PreCreateClient.preCreate(req, baseUrl, apiKey);
    System.out.println(response);
  }
}
```
Пример Response
```java
{
  "documentId": "054a5483-0db5-4842-bc47-9d45037ae9ff",
  "qrImageBase64": "iVBORw0KGgoAAAANSUhEUgAA...",
  "qrUrl": "https://qr.company.kg/doc054a5483-0db5-4842-bc47-9d45037ae9ff"
}
```
## Final upload — загрузка финального подписанного документа
Операция отправляет multipart/form-data с полями:
  document_id
  signed_at
  signed_by
  file

Импорты
```java
import qr.service.client.FinalUploadClient;
import qr.service.domain.FinalUploadRequest;
import qr.service.domain.PathMultipartFile;
```
Пример
```java
import qr.service.client.FinalUploadClient;
import qr.service.domain.FinalUploadRequest;
import qr.service.domain.PathMultipartFile;

import java.nio.file.Path;
import java.util.UUID;

public class FinalUploadExample {

  public static void main(String[] args) throws Exception {
    String baseUrl = "https://api.example.com";
    String apiKey  = "YOUR_REAL_API_KEY";

    FinalUploadRequest req = new FinalUploadRequest(
        UUID.fromString("054a5483-0db5-4842-bc47-9d45037ae9ff"),
        new PathMultipartFile("file", Path.of("/tmp/signed.pdf")),
        "2026-01-29T14:32:10+03:00",
        "ivan.petrov"
    );

    String response = FinalUploadClient.uploadFinal(req, baseUrl, apiKey);
    System.out.println(response);
  }
}

```
Пример Response
```java
{
  "success": true,
  "status": "signed"
}
```

## Update status — обновление статуса документа

Импорты
```java
import qr.service.client.UpdateStatusClient;
import qr.service.domain.UpdateStatusRequest;
```

Пример
```java
import qr.service.client.UpdateStatusClient;
import qr.service.domain.UpdateStatusRequest;

import java.util.UUID;

public class UpdateStatusExample {

  public static void main(String[] args) throws Exception {
    String baseUrl = "https://api.example.com";
    String apiKey  = "YOUR_REAL_API_KEY";

    UUID documentId = UUID.fromString("84b08b85-2887-4c2f-8513-a66b6224ccc0");

    UpdateStatusRequest req = new UpdateStatusRequest(
        "PENDING",
        UUID.fromString("11111111-2222-3333-4444-555555555555"), // replacedBy (опционально)
        "Replaced due to correction"                            // reason (опционально)
    );

    String response = UpdateStatusClient.updateStatus(documentId, req, baseUrl, apiKey);
    System.out.println(response);
  }
}
```
Пример Response
```java
{
  "documentId": "84b08b85-2887-4c2f-8513-a66b6224ccc0",
  "title": "My document",
  "status": "PENDING",
  "replacedBy": null,
  "reason": "Replaced due to correction",
  "expireAt": "2026-01-30T09:00:00Z",
  "signedAt": "2026-01-29T14:32:10Z",
  "signedBy": "ivan.petrov"
}
```

## Spring Boot: рекомендованный вариант интеграции
1) application.yml
```yml
qr:
  service:
    base-url: https://api.example.com
    api-key: YOUR_REAL_API_KEY
```
2) Properties класс
```java
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "qr.service")
public record QrServiceProps(String baseUrl, String apiKey) {}
```
Не забудьте включить бин конфигурации (например в классе с @SpringBootApplication):
```java
@EnableConfigurationProperties(QrServiceProps.class)
```
3) Facade / Service
```java
import org.springframework.stereotype.Service;
import qr.service.client.FinalUploadClient;
import qr.service.client.PreCreateClient;
import qr.service.client.UpdateStatusClient;
import qr.service.domain.FinalUploadRequest;
import qr.service.domain.PreCreateRequest;
import qr.service.domain.UpdateStatusRequest;

import java.util.UUID;

@Service
public class QrServiceFacade {

  private final QrServiceProps props;

  public QrServiceFacade(QrServiceProps props) {
    this.props = props;
  }

  public String preCreate(PreCreateRequest req) throws Exception {
    return PreCreateClient.preCreate(req, props.baseUrl(), props.apiKey());
  }

  public String uploadFinal(FinalUploadRequest req) throws Exception {
    return FinalUploadClient.uploadFinal(req, props.baseUrl(), props.apiKey());
  }

  public String updateStatus(UUID documentId, UpdateStatusRequest req) throws Exception {
    return UpdateStatusClient.updateStatus(documentId, req, props.baseUrl(), props.apiKey());
  }
}
```
4) Controller пример
```java
import org.springframework.web.bind.annotation.*;
import qr.service.domain.FinalUploadRequest;
import qr.service.domain.PreCreateRequest;
import qr.service.domain.UpdateStatusRequest;

import java.util.UUID;

@RestController
@RequestMapping("/qr")
public class QrController {

  private final QrServiceFacade qr;

  public QrController(QrServiceFacade qr) {
    this.qr = qr;
  }

  @PostMapping("/pre-create")
  public String preCreate(@RequestBody PreCreateRequest body) throws Exception {
    return qr.preCreate(body);
  }

  @PostMapping("/final")
  public String finalUpload(@RequestBody FinalUploadRequest body) throws Exception {
    return qr.uploadFinal(body);
  }

  @PatchMapping("/{documentId}/status")
  public String updateStatus(@PathVariable UUID documentId,
                             @RequestBody UpdateStatusRequest body) throws Exception {
    return qr.updateStatus(documentId, body);
  }
}
```
Примечание: FinalUploadRequest содержит SimpleMultipartFile.
Если вы принимаете файл по HTTP (Spring), чаще всего удобнее делать endpoint так:

@RequestPart("file") MultipartFile file

отдельные поля documentId, signedAt, signedBy

а затем адаптировать MultipartFile в SimpleMultipartFile через временный файл/Path или свой адаптер.

