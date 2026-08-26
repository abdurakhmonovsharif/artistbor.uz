# Artistbor dashboard task status

Date: 2026-08-26

Source of truth:

- UI: `design-analysis/artistbor-dashboard-design/DESIGN.md`
- API: live `https://api.artistbor.uz/docs/api`
- Status/toast copy: `src/lib/i18n/dashboard-copy.ts`

## Completed in the current dashboard

- Expired availability holds (`is_expired: true`) are excluded from busy days and time slots.
- Availability management is reachable from the artist drawer.
- Busy-slot create/delete and failure-safe edit are implemented. A failed replacement attempts to restore the original slot and reports a localized critical error if rollback also fails.
- Artist service assign/update/delete, regional prices, artist balance and transactions are integrated with real admin endpoints.
- Artist gallery list, multi-file upload and delete use the documented multipart `files` field.
- Artist video list/create/update/delete is available at `/admin/videos` and can be opened pre-filtered from an artist.
- Notification list/detail, filtered send and send-all are implemented. Filtered send requires at least one audience selector (`role`, `region_id`, or `district_id`).
- Notification list sends only the documented `type`, `date_from`, and `date_to` query parameters; no invented pagination parameters are used.
- Order status rail uses accessible tabs, keyboard navigation, hidden native scrollbar and explicit previous/next controls when overflowing.
- Orders switch to cards in compact containers and to the full table when space permits.
- Artists, categories, services, users, operators and applications use adaptive table modes. Secondary columns collapse before horizontal scrolling is required.
- Every remaining scrollable table is a keyboard-focusable region with a visible thin scrollbar.
- `ID`, `Public ID`, and `*_id` values never wrap in shared or page-specific tables.
- Legacy filter shells wrap instead of hiding controls below a horizontal scrollbar.
- Artist service draft empty state does not render a misleading regional-price card before a service is selected.
- Dashboard statuses, action feedback and known API errors are centralized in UZ/RU catalogs.
- Role-based UI actions are aligned with the existing admin/operator/moderator permission model.
- Automated regression command is available as `npm test`.

## Verification status

| Check | Status |
|---|---|
| Live OpenAPI request/response contract review | Complete |
| TypeScript (`npx tsc --noEmit`) | Complete |
| Focused regression suite (`npm test`) | Complete |
| ESLint (`npm run lint`) | Complete |
| Production build (`npm run build`) | Complete |
| Authenticated browser read-only smoke test | Manual: Chrome control connector unavailable in this run |
| Mutating API smoke tests | Staging/test data only; not run automatically |

## External/manual follow-up

- Run create/update/delete/send flows only with approved staging data and real admin credentials.
- Recheck any endpoint whose live response schema is still omitted from OpenAPI after backend changes.
- Keep new backend status values machine-readable and add them to the domain-specific UZ/RU catalog before displaying them.
