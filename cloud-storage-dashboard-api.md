# Cloud Storage Dashboard API Expectations

Base URL notes:
- Data service in `src/services/cloud-storage-dashboard/api.ts` uses `VITE_API_BASE_URL` (defaults to `/api`).
- Uploads and legacy file/folder CRUD use `VITE_SERVER_URL` directly in components.

1. `GET /storage`
Expected response (`StorageResponse`):
```json
{
  "storage": {
    "google": { "used": 0, "total": 0 },
    "onedrive": { "used": 0, "total": 0 },
    "dropbox": { "used": 0, "total": 0 },
    "totals": { "used": 0, "total": 0, "percentage": 0 }
  }
}
```
Note: `percentage` is optional in the UI. If omitted, the client uses a default.

2. `GET /folders`
Expected response (`FoldersResponse`):
```json
{
  "folders": [
    {
      "id": "string",
      "name": "string",
      "fileCount": 0,
      "members": [
        { "id": "string", "name": "string", "avatar": "string", "initials": "JD" }
      ],
      "createdAt": "ISO-8601",
      "updatedAt": "ISO-8601"
    }
  ]
}
```

3. `GET /files?limit=50&sort=modified_desc`
Expected response (`FilesResponse`):
```json
{
  "files": [
    {
      "id": "string",
      "name": "string",
      "type": "pdf",
      "sizeBytes": 0,
      "members": [
        { "id": "string", "name": "string", "avatar": "string", "initials": "JD" }
      ],
      "lastModified": "ISO-8601",
      "url": "string"
    }
  ],
  "total": 0,
  "hasMore": false
}
```
Note: `type` can be `pdf|doc|docx|xls|xlsx|ppt|pptx|jpg|png|mp4|mp3|zip|txt|other`. `url` is optional.

4. `GET /user`
Expected response (`UserResponse`):
```json
{
  "user": {
    "id": "string",
    "name": "string",
    "email": "string",
    "avatar": "string",
    "quotaUsed": 0,
    "quotaTotal": 0
  },
  "stats": {
    "images": "2.5 GB",
    "documents": "1.1 GB",
    "videos": "6.8 GB",
    "audios": "1.3 GB",
    "archive": "16 GB",
    "others": "11.5 GB"
  }
}
```

5. `POST /file/uploads/initiate`
Request body:
```json
{ "fileSize": "12345", "fileName": "example.pdf", "pid": "optional-parent-id" }
```
Expected response:
```json
{ "postUrl": "https://signed-upload-url", "id": "file-id" }
```

6. `PUT {postUrl}`
Request payload: raw file bytes (or multipart if your signed URL expects it) with `Content-Type` set to the file MIME type.
Expected response: HTTP 200 from the storage service. The client ignores the body.

7. `PUT /file/uploads/complete`
Request body:
```json
{ "fileId": "file-id" }
```
Expected response:
```json
{ "msg": "Upload completed" }
```

8. `GET /file/:id?action=download`
Expected response: file stream or a redirect to the download URL.

9. `GET /file/:id`
Expected response:
```json
{ "url": "https://preview-or-download-url" }
```

10. `PATCH /file/:id`
Headers: `parentid: <current-directory-id>`
Request body:
```json
{ "newName": "renamed-file" }
```
Expected response: JSON (content not used by the client). Return at least `{ "msg": "ok" }`.

11. `DELETE /file/:id`
Headers: `parentid: <current-directory-id>`
Expected response: JSON (content not used by the client). Return at least `{ "msg": "ok" }`.

12. `POST /directory`
Headers: `parentid: <current-directory-id>`
Request body:
```json
{ "newName": "New Folder" }
```
Expected response: JSON (content not used by the client). Return at least `{ "msg": "ok" }` or the created folder.

13. `GET /directory` or `GET /directory/:id`
Expected response (directory tree used by the file/folder grid):
```json
{
  "_id": "string",
  "id": "string",
  "name": "string",
  "parent": "string",
  "path": [
    { "_id": "string", "name": "string" }
  ],
  "directories": [
    { "_id": "string", "name": "string", "createdAt": "ISO-8601", "size": 0 }
  ],
  "files": [
    { "_id": "string", "id": "string", "name": "string", "extension": ".pdf", "parent": "string", "isPaid": false, "createdAt": "ISO-8601", "size": 0 }
  ]
}
```

14. `PATCH /directory/:id`
Headers: `parentid: <current-directory-id>`
Request body:
```json
{ "newName": "Renamed Folder" }
```
Expected response: JSON (content not used by the client). Return at least `{ "msg": "ok" }`.

15. `DELETE /directory/:id`
Headers: `parentid: <current-directory-id>`
Expected response: JSON (content not used by the client). Return at least `{ "msg": "ok" }`.

16. `POST /user/logout`
Expected response: JSON. The client expects HTTP 200 and parses JSON.

17. Optional: `GET /search?query=...`
Expected response: files and folders in a shape compatible with the `FilesResponse` and `FoldersResponse` entries.

18. Optional: `GET /notifications`
Expected response: list of notifications for the bell icon (shape currently not defined in the UI).

