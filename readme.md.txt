# Internship REST API

A Node.js and Express REST API for managing internship records with SQLite persistence, input validation, and pagination[span_1](start_span)[span_1](end_span).

## Data Model & Response Format

### Internship Fields
- `id`: Integer (auto-increment primary key)
- `title`: String (required)
- `company`: String (required)
- `location`: String (required)
- `stipend`: Number (default: `0`)
- `mode`: String (`remote` | `hybrid` | `onsite`, default: `remote`)
- `status`: String (`open` | `closed`, default: `open`)
- `description`: String (optional)

### Standard Response Structure
```json
{
  "success": true,
  "data": {},
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 3,
    "totalPages": 1
  }
}