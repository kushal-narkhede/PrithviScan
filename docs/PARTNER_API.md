# Partner API & webhooks (4.1)

> **Status:** Contract defined. Live HTTP endpoints require Firebase **Blaze** (Cloud Functions).  
> Base URL (planned): `https://us-central1-prithviscan.cloudfunctions.net/v1`

## Auth

| Method | Header | Notes |
|--------|--------|-------|
| Farmer user | `Authorization: Bearer <Firebase ID token>` | Existing app APIs |
| Partner | `X-Api-Key: <partner_key>` | Issued per tenant; hashed server-side |

Rate limits (planned): **60 req/min** per API key; burst 10.

## Versioning

- Path prefix: `/v1/...`
- Breaking changes → `/v2`
- Deprecation window: 90 days

## REST resources

### Fields
```
GET    /v1/fields
POST   /v1/fields
GET    /v1/fields/{fieldId}
PATCH  /v1/fields/{fieldId}
DELETE /v1/fields/{fieldId}
```

### Insights
```
GET  /v1/fields/{fieldId}/insights/latest
POST /v1/fields/{fieldId}/insights/refresh
```

### Alerts
```
GET   /v1/alerts
PATCH /v1/alerts/{alertId}   # { "read": true }
```

### Bulk
```
POST /v1/fields/import      # CSV or GeoJSON body
GET  /v1/fields/export?format=csv|geojson
```

## Webhooks

Partners register an HTTPS URL. We POST signed events:

| Event | When |
|-------|------|
| `field.created` | New field saved |
| `field.updated` | Field metadata changed |
| `insight.generated` | Fusion insight written |
| `alert.created` | Action/watch alert created |

### Payload shape
```json
{
  "id": "evt_...",
  "type": "insight.generated",
  "createdAt": "2026-08-02T00:00:00Z",
  "tenantId": "demo-coop",
  "data": {
    "fieldId": "abc",
    "level": "action",
    "title": "Irrigate tomorrow",
    "confidence": 0.88
  }
}
```

### Signature
```
X-Prithvi-Signature: sha256=<hmac_hex>
```
HMAC-SHA256 of raw body using the partner webhook secret.

## Sample cURL (after Blaze)

```bash
curl -H "X-Api-Key: $KEY" \
  "https://us-central1-prithviscan.cloudfunctions.net/v1/fields"
```

## SDKs (planned)

- JavaScript / TypeScript thin client
- Python client for cooperatives / NGOs

Client-side bulk import/export (no partner key) is already available in the farmer app — see feature **4.2**.
