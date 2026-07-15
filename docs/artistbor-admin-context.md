# Artistbor Admin Context

## Auth

- Admin panel login credentials are stored outside the repository.
- Swagger/docs credentials are stored outside the repository.
- API docs:
  - `https://api.artistbor.uz/docs`
  - OpenAPI payload is served from `https://api.artistbor.uz/docs/api`

## Artists Page Action Inventory

### Top-level actions

- View artist details
- Edit artist profile
- Reset artist password
- Close drawer
- Save edits from drawer

### Profile edit actions

- Update first name
- Update last name
- Update phone
- Update email
- Update status
- Update region
- Update district
- Update categories
- Update bio
- Update birth date
- Update gender
- Update artist bio
- Update extra phone
- Update administrator name
- Update administrator phone
- Update profile photo
- Toggle verified state
- Toggle top state

### Resource tabs

- Services
- Availability
- Gallery
- Videos
- Comments
- Ratings

### Availability actions

- Open schedule management drawer
- Create schedule
- Open schedule details
- Add busy slot
- Edit busy slot
- Delete busy slot
- Delete a busy slot from confirmation dialog

### Services actions

- Assign service to artist
- Update artist service
- Detach artist service

### Gallery actions

- List gallery items
- Upload gallery image
- Delete gallery item

### Videos actions

- List videos
- Add video
- Update video
- Delete video

### Comments actions

- List comments
- View artist comments
- Edit comment
- Delete comment
- Publish comment
- Unpublish comment
- Restore deleted comment

### Ratings actions

- List ratings
- View rating
- Delete rating

## Artists API Endpoints From Swagger

### Artist profile

- `POST /v1/admin/artist`
- `GET /v1/admin/artists`
- `GET /v1/admin/artist/{id}`
- `PUT /v1/admin/artist/{id}`

### Artist services

- `GET /v1/admin/artist-service`
- `POST /v1/admin/artist-service/assign`
- `PUT /v1/admin/artist-service/{id}`
- `DELETE /v1/admin/artist-service/{id}`

### Availability

- `GET /v1/admin/artist/{artistId}/availability`
- `POST /v1/admin/artist/{artistId}/busy-slot`
- `DELETE /v1/admin/busy-slot/{id}`

### Gallery

- `GET /v1/admin/artist-gallery`
- `POST /v1/admin/artist-gallery/{artist_id}`
- `DELETE /v1/admin/artist-gallery/{id}`

### Videos

- `GET /v1/admin/artist-videos`
- `POST /v1/admin/artist-videos`
- `PUT /v1/admin/artist-videos/{id}`
- `DELETE /v1/admin/artist-videos/{id}`

### Comments

- `GET /v1/admin/artist-comments`
- `GET /v1/admin/artist-comments/pending`
- `GET /v1/admin/artist-comments/{id}`
- `PUT /v1/admin/artist-comments/{id}`
- `DELETE /v1/admin/artist-comments/{id}`
- `POST /v1/admin/artist-comments/{id}/publish`
- `POST /v1/admin/artist-comments/{id}/unpublish`
- `POST /v1/admin/artist-comments/{id}/restore`
- `GET /v1/admin/artists/{artistId}/comments`

### Ratings

- `GET /v1/admin/artist-ratings`
- `GET /v1/admin/artist-ratings/{id}`
- `DELETE /v1/admin/artist-ratings/{id}`
- `GET /v1/admin/artists/{artistId}/ratings`

## Notes

- The artists page mixes profile editing with resource management tabs.
- Schedule management uses the same artists drawer and a separate busy slot modal.
- Gallery, videos, comments, and ratings are all loaded as separate resources when the artist drawer opens.
- Category icons were intentionally removed from the categories table UI because the API field is a raw string, not a rendered image asset.

## Staging Verification

- Auth login works with the saved admin credentials.
- `GET /v1/admin/artist/24` and related detail resources return real staging data.
- `GET /v1/admin/artist/24/availability` requires `date_from` and `date_to`.
- `PUT /v1/admin/artist/24` succeeds as a no-op update when the current values are sent back.
- Busy slot create/delete works with `time_from` and `time_to`.
- Artist service assign/detach works.
- Artist video create/update/delete works.
- Artist gallery upload works.
- Artist gallery delete removes the item, but staging returned a 500 TypeError from `FileService::delete()` during the delete request.
- Global comments and ratings lists were empty in the current staging dataset.
