import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const css = readFileSync(new URL("./globals.css", import.meta.url), "utf8");
const adminLayout = readFileSync(new URL("../components/admin/admin-layout.tsx", import.meta.url), "utf8");
const statusTabRail = readFileSync(new URL("../components/admin/status-tab-rail.tsx", import.meta.url), "utf8");
const dataTable = readFileSync(new URL("../components/admin/data-table.tsx", import.meta.url), "utf8");
const ordersPage = readFileSync(new URL("./admin/orders/page.tsx", import.meta.url), "utf8");
const artistsPage = readFileSync(new URL("./admin/artists/page.tsx", import.meta.url), "utf8");
const categoriesPage = readFileSync(new URL("./admin/categories/page.tsx", import.meta.url), "utf8");
const servicesPage = readFileSync(new URL("./admin/services/page.tsx", import.meta.url), "utf8");
const usersPage = readFileSync(new URL("./admin/users/page.tsx", import.meta.url), "utf8");
const operatorsPage = readFileSync(new URL("./admin/operators/page.tsx", import.meta.url), "utf8");
const applicationsTable = readFileSync(new URL("../components/admin/applications/applications-table.tsx", import.meta.url), "utf8");

test("admin shell allows the main column to shrink to its real available width", () => {
  assert.doesNotMatch(adminLayout, /lg:min-w-\[1280px\]/);
  assert.doesNotMatch(adminLayout, /overflow-x-hidden/);
  assert.match(adminLayout, /artistbor-admin-shell[^"\n]*min-w-0/);
});

test("orders use the shared accessible status rail and container-driven data modes", () => {
  assert.match(ordersPage, /<StatusTabRail/);
  assert.match(ordersPage, /controlsId="orders-results"/);
  assert.match(ordersPage, /artistbor-orders-cards/);
  assert.match(ordersPage, /artistbor-orders-table/);
  assert.match(ordersPage, /compactMeta=\{client\.primary\}/);
  assert.doesNotMatch(ordersPage, /lg:hidden/);
  assert.doesNotMatch(ordersPage, /hidden lg:block/);

  assert.match(css, /container-name:\s*artistbor-data-page/);
  assert.match(css, /@container artistbor-data-page \(min-width:\s*760px\)/);
  assert.match(css, /@container artistbor-data-page \(min-width:\s*1040px\)/);
});

test("availability order links hydrate the exact orders search filter from the URL", () => {
  assert.match(
    artistsPage,
    /href=\{`\/admin\/orders\?q=\$\{encodeURIComponent\(orderPublicId\)\}`\}/,
  );
  assert.match(
    artistsPage,
    /!text-artistbor-secondary[^"]*hover:!text-artistbor-accent[^"]*dark:!text-slate-200[^"]*dark:hover:!text-amber-300/,
  );
  assert.match(
    ordersPage,
    /const \[searchDraft, setSearchDraft\] = useState\(String\(initialOrderFilters\.q \?\? ""\)\)/,
  );
  assert.match(ordersPage, /q: searchParams\?\.get\("q"\)\?\.trim\(\) \?\? ""/);
});

test("status rail hides the native scrollbar and supports keyboard navigation", () => {
  assert.match(statusTabRail, /role="tablist"/);
  assert.match(statusTabRail, /aria-selected=\{selected\}/);
  assert.match(statusTabRail, /event\.key === "ArrowRight"/);
  assert.match(statusTabRail, /event\.key === "ArrowLeft"/);
  assert.match(statusTabRail, /event\.key === "Home"/);
  assert.match(statusTabRail, /event\.key === "End"/);
  assert.match(css, /\.artistbor-status-rail-scroll::-webkit-scrollbar\s*\{[^}]*display:\s*none/s);
});

test("artist filters wrap and the table exposes compact and full column modes", () => {
  assert.match(artistsPage, /artistbor-responsive-filter-panel/);
  assert.match(artistsPage, /artistbor-artists-data-table/);
  assert.match(artistsPage, /aria-label=\{labels\.tableRegionLabel\}/);
  assert.match(artistsPage, /whitespace-nowrap[\s\S]{0,300}\{toDisplay\(row\.public_id\)\}/);
  assert.match(css, /\.artistbor-responsive-filter-panel\s*\{[^}]*flex-wrap:\s*wrap/s);
  assert.match(css, /\.artistbor-artists-data-table table\s*\{[^}]*min-width:\s*680px/s);
  assert.match(css, /\.artistbor-artists-data-table table\s*\{[^}]*min-width:\s*1012px/s);
});

test("identifier values never wrap in page-specific or shared tables", () => {
  assert.match(ordersPage, /whitespace-nowrap[\s\S]{0,180}\{publicId \|\| "—"\}/);
  assert.match(artistsPage, /whitespace-nowrap[\s\S]{0,300}\{toDisplay\(row\.public_id\)\}/);
  assert.match(dataTable, /isIdentifierColumn\(column\.key\)/);
  assert.match(dataTable, /className="whitespace-nowrap"/);
});

test("legacy data pages use the shared responsive filters and keyboard-scrollable tables", () => {
  for (const source of [categoriesPage, usersPage, operatorsPage]) {
    assert.match(source, /artistbor-responsive-filter-panel/);
  }
  for (const source of [categoriesPage, servicesPage, usersPage, operatorsPage, applicationsTable]) {
    assert.match(source, /admin-table-scroll/);
    assert.match(source, /role="region"/);
    assert.match(source, /tabIndex=\{0\}/);
  }
  assert.match(css, /\.artistbor-hierarchy-data-table table\s*\{[^}]*min-width:\s*720px/s);
  assert.match(css, /\.artistbor-people-data-table table\s*\{[^}]*min-width:\s*860px/s);
  assert.match(css, /\.artistbor-applications-data-table table\s*\{[^}]*min-width:\s*760px/s);
});

test("operators activate their container layout and keep detail and password actions available", () => {
  assert.match(operatorsPage, /artistbor-admin-page artistbor-responsive-data-page/);
  assert.match(operatorsPage, /min-w-\[1156px\] table-fixed/);
  assert.match(operatorsPage, /onResetPassword/);
  assert.match(operatorsPage, /OperatorPasswordResetModal/);
  assert.match(operatorsPage, /staffApi\.resetPassword/);
});

test("service draft editor stays empty until a service is assigned", () => {
  const start = artistsPage.indexOf("function ArtistServiceDraftEditor");
  const end = artistsPage.indexOf("function ArtistServiceRegionPriceDraftFields");
  assert.notEqual(start, -1);
  assert.notEqual(end, -1);

  const serviceDraftEditor = artistsPage.slice(start, end);
  assert.doesNotMatch(serviceDraftEditor, /labels\.regionPricesEmpty/);
});
