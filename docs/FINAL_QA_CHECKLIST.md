# Final QA Checklist

Date: 2026-08-26

## Scope

Run against authenticated admin credentials. The dashboard uses the same-origin
admin proxy, so browser requests do not depend on direct-backend CORS. Do not
submit destructive actions on production data.

## Implemented Routes

- `/login`
- `/admin`
- `/admin/categories`
- `/admin/faq`
- `/admin/regions`
- `/admin/services`
- `/admin/users`
- `/admin/operators`
- `/admin/artists`
- `/admin/applications`
- `/admin/orders`
- `/admin/contracts`
- `/admin/comments`
- `/admin/ratings`
- `/admin/videos`
- `/admin/notifications`
- `/admin/settings`
- `/admin/audit-logs`
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
- Confirm Services, Availability, Gallery, Comments, Ratings, finance and
  transaction sections load from their real admin endpoints.
- Open Availability management and verify expired holds are not shown as busy.
- Verify busy-slot edit restores the original slot if replacement fails.
- Upload/delete gallery media only with approved staging data.
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
- Confirm send filtered is blocked until at least one audience selector is set.
- Confirm a successful filtered send shows `recipient_count` when returned.
- Open send all modal and verify fields:
  `title`, `message`, `type`, `data`.
- Validate invalid `data` JSON shows form error.

### `/admin/videos`

- Filter by artist.
- Open create/edit drawers and verify YouTube URL, localized titles, sort order,
  and active state.
- Confirm an invalid or non-HTTPS YouTube URL is rejected.
- Run create/update/delete only with approved staging data.

### Responsive tables and filters

- Test at 320, 768, 1024, 1280 and 1440 CSS pixels.
- Confirm status rails never sit behind a native scrollbar.
- Confirm filters wrap and remain keyboard reachable.
- Confirm `ID`, `Public ID`, `ORD-*`, `ART-*`, `USR-*` and other identifier values
  remain on one line.
- Confirm secondary columns collapse before a table needs horizontal scroll.
- When horizontal scroll remains necessary, confirm the region receives keyboard
  focus and shows a visible scrollbar.

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

## Backend/runtime notes

- Historical backend failures are kept in `docs/BACKEND_BLOCKERS.md`; they are
  not treated as confirmed-current until reproduced on 2026-08-26 runtime.
- Live OpenAPI is available at `/docs/api`, but several response schemas remain
  intentionally incomplete.

## Known Schema Risks

- Many Swagger list/detail responses omit concrete schemas.
- Live list responses use `data.list` and `data.meta`; frontend normalization
  supports this.
- Orders, comments, ratings, notifications, and trash still rely on raw JSON
  previews until backend data shapes are verified.
- Application and order status values are free-form because Swagger documents
  them as `string` without enum values.
- Trash actions assume returned records include numeric `id`.

## Final smoke test

1. Run `npm run lint`.
2. Run `npm test`.
3. Run `npm run build`.
4. Start the dashboard locally.
5. Login with real admin credentials.
6. Verify auth checks.
7. Walk all implemented routes in the order listed above.
8. Confirm every page reaches table/empty/error state without runtime crash.
9. Confirm network requests hit documented OpenAPI endpoints.
10. Confirm filters, modals, tables and pagination behavior.
11. On staging/test data only, submit mutating actions one resource at a time.
12. Re-run lint, tests and build after any fixes.
