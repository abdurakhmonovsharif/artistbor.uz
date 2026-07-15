# Final QA Checklist

Date: 2026-05-02

## Scope

Use this checklist after backend CORS/OPTIONS and backend 500 blockers are fixed.
Run against authenticated admin credentials. Do not submit destructive actions on
production data.

## Implemented Routes

- `/login`
- `/admin`
- `/admin/categories`
- `/admin/faq`
- `/admin/regions`
- `/admin/services`
- `/admin/users`
- `/admin/artists`
- `/admin/applications`
- `/admin/orders`
- `/admin/comments`
- `/admin/ratings`
- `/admin/notifications`
- `/admin/trash`

## Auth Checks

- Open `/login`.
- Submit valid admin phone/password.
- Confirm `artistbor_admin_session` is set as an httpOnly cookie.
- Confirm browser JavaScript cannot read the admin token from localStorage.
- Confirm `/admin` opens after login.
- Refresh `/admin` and confirm session is restored through `GET /api/admin-auth/me`.
- Logout from the header/sidebar.
- Confirm session cookie is removed and user is redirected to `/login`.
- Confirm direct opening of `/admin/*` without session redirects to `/login`.
- Confirm expired/invalid session receives `401`, clears cookie, and redirects to
  `/login`.

## Shared Page Checks

For every implemented admin route:

- Page opens without runtime crash.
- Initial loading state is shown.
- Table, empty state, or error state renders cleanly.
- API request uses documented Swagger endpoint.
- Browser request goes to `/api/admin-proxy/*`; server-side proxy attaches Bearer token.
- Filters do not crash.
- Reset filters does not crash.
- Detail modal opens when a row exists.
- Edit/create modals open where Swagger supports those actions.
- Pagination does not crash where Swagger supports `page` and `limit`.
- Toasts appear for successful or failed submitted actions.
- Browser console has no React/runtime errors.

## CRUD Checks Per Page

### `/admin/categories`

- List categories.
- Filter by `name`, `parent_id`, `status`.
- Open detail modal.
- Open create modal and verify fields:
  `name_uz`, `name_ru`, `name_en`, `parent_id`, `icon`, `sort_order`, `status`.
- Open edit modal and verify `slug` is available on update.
- Open delete confirmation only.
- Open restore confirmation only.

### `/admin/faq`

- List FAQ.
- Filter by `search`, `status`.
- Verify pagination.
- Open detail modal.
- Open create/edit modals and verify question/answer fields for `uz`, `ru`, `en`,
  plus `sort_order`, `status`.
- Open delete confirmation only.

### `/admin/regions`

- Check Regions tab.
- Filter regions by `name`, `status`.
- Open region detail/create/edit modals.
- Open region delete confirmation only.
- Open region districts modal.
- Check Districts tab.
- Filter districts by `region_id`, `name`, `status`.
- Open district detail/create/edit modals.
- Open district delete confirmation only.

### `/admin/services`

- List services.
- Confirm category lookup loads categories for the category filter.
- Filter by `category_id`, `status`.
- Open create/edit modals and verify service fields.
- Open delete confirmation only.

### `/admin/users`

- List users.
- Filter by `search`, `role`, `status`.
- Confirm role filter includes `client`, `artist`, `admin`, `operator`.
- Verify pagination.
- Open staff create modal.
- Open user edit modal.
- Open block confirmation only.
- Open unblock confirmation only.

### `/admin/artists`

- List artists.
- Filter by `search`, `is_verified`, `is_top`, `status`.
- Verify pagination.
- Open artist detail modal.
- Confirm placeholder nested tabs render without API calls:
  Services, Availability, Gallery, Comments, Ratings.
- Open artist edit modal and verify update fields.

### `/admin/applications`

- List applications.
- Filter by free-form `status`.
- Verify pagination.
- Open detail modal.
- Open edit modal.
- Open approve confirmation only.
- Open reject modal and verify `reason` is required.

### `/admin/orders`

- List orders.
- Filter by free-form `status`, `artist_id`, `client_id`, `date_from`,
  `date_to`.
- Verify pagination.
- Open detail modal.
- Open edit modal for `notes` and `address`.
- Open confirm confirmation only.
- Open complete confirmation only.
- Open cancel modal and verify `reason` is required.
- Open reschedule modal and verify conflict check renders, then verify required
  `date` and `start_time` validation.

### `/admin/comments`

- List all comments.
- Filter by `status`, `artist_id`, `client_id`.
- Verify pagination.
- Switch to Pending tab.
- Open detail modal.
- Open edit modal and verify `comment`, `is_published`.
- Open publish confirmation only.
- Open unpublish confirmation only.
- Open restore confirmation only.
- Open delete confirmation only.
- Use Artist comments lookup with a valid artist ID.

### `/admin/ratings`

- List ratings.
- Filter by `artist_id`, `client_id`, `rating`, `is_published`.
- Verify pagination.
- Open detail modal.
- Open delete confirmation only.
- Use Artist ratings lookup with a valid artist ID.

### `/admin/notifications`

- List notifications.
- Filter by `type`, `date_from`, `date_to`.
- Confirm no pagination controls are shown because Swagger does not document
  pagination params.
- Open detail modal.
- Open send filtered modal and verify fields:
  `title`, `message`, `type`, `role`, `region_id`, `district_id`, `data`.
- Open send all modal and verify fields:
  `title`, `message`, `type`, `data`.
- Validate invalid `data` JSON shows form error.

### `/admin/trash`

- Load trash stats cards.
- Select every documented trash model at least once:
  `user`, `booking`, `order`, `artist-busy-slot`, `service`,
  `artist-application`, `artist-profile`, `client-profile`, `user-profile`,
  `category`, `artist-service`, `file`, `artist-gallery`.
- Search by `q` and `model`.
- Verify model list pagination where data supports multiple pages.
- Open deleted record detail modal.
- Open restore confirmation only.
- Open permanent delete confirmation only.

## Non-Destructive Action Checks

Safe to run on production-like data:

- Login/logout.
- List pages.
- Filters.
- Pagination.
- Detail modals.
- Create/edit modal opening without submit.
- Confirmation modal opening without confirm.
- Artist comments/ratings lookup.
- Order conflict check.
- Notification send modal validation without submit.
- Trash stats/list/search/detail.

## Destructive Or Mutating Checks

Run only on staging/test data:

- Category create/edit/delete/restore.
- FAQ create/edit/delete.
- Region/district create/edit/delete.
- Service create/edit/delete.
- Staff user create.
- User edit/block/unblock.
- Artist update.
- Application update/approve/reject.
- Order update/confirm/complete/cancel/reschedule.
- Comment update/publish/unpublish/delete/restore.
- Rating delete.
- Notification send/send-all.
- Trash restore/permanent delete.

## Known Backend Blockers

- Browser CORS/preflight blocks several `/v1/admin/*` endpoints because
  `OPTIONS` handling is missing or incomplete.
- `/v1/admin/regions` returns backend `500`: missing
  `backend\base\BaseAdminController`.
- `/v1/admin/artist-comments` returns backend `500`: missing
  `artist_comment.deleted_at`.

See `docs/BACKEND_BLOCKERS.md` for the backend handoff details.

## Known Schema Risks

- Many Swagger list/detail responses omit concrete schemas.
- Live list responses use `data.list` and `data.meta`; frontend normalization
  supports this.
- Orders, comments, ratings, notifications, and trash still rely on raw JSON
  previews until backend data shapes are verified.
- Application and order status values are free-form because Swagger documents
  them as `string` without enum values.
- Trash actions assume returned records include numeric `id`.

## Final Smoke Test After Backend Fixes

1. Run `npm run lint`.
2. Run `npm run build`.
3. Start the dashboard locally.
4. Login with real admin credentials.
5. Verify auth checks.
6. Walk all implemented routes in the order listed above.
7. Confirm every page reaches table/empty/error state without runtime crash.
8. Confirm network requests hit documented Swagger endpoints.
9. Confirm filters, modals, and pagination behavior.
10. On staging/test data only, submit mutating actions one resource at a time.
11. Re-run `npm run lint` and `npm run build` after any fixes.
