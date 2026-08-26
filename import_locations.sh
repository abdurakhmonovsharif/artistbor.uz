#!/usr/bin/env bash
# Imports the source locations JSON into Artistbor's admin API.
# Existing records with the same parent and name_uz are left unchanged.

set -euo pipefail

readonly API_BASE="${API_BASE_URL:-https://api.artistbor.uz}"

fail() {
  printf 'Xato: %s\n' "$*" >&2
  exit 1
}

usage() {
  cat <<'USAGE'
Ishlatish:
  bash import_locations.sh --apply /to'liq/yo'l/locations.json

Script 14 ta viloyat va ularning tumanlarini admin API orqali yaratadi.
Bir xil name_uz bo'lgan mavjud yozuvlar takror yaratilmaydi.
USAGE
}

if [[ "${1:-}" != "--apply" || $# -ne 2 ]]; then
  usage
  exit 1
fi

readonly DATA_FILE="$2"

[[ "$API_BASE" == https://* ]] || fail 'API_BASE_URL https:// bilan boshlanishi kerak.'
[[ -f "$DATA_FILE" ]] || fail "JSON fayl topilmadi: $DATA_FILE"
command -v jq >/dev/null || fail 'jq o‘rnatilmagan.'
command -v curl >/dev/null || fail 'curl topilmadi.'

jq -e '
  (.regions.data.list | type == "array") and
  (.districts.data.list | type == "array")
' "$DATA_FILE" >/dev/null || fail 'JSON formati noto‘g‘ri. regions.data.list va districts.data.list massiv bo‘lishi kerak.'

source_region_count="$(jq '.regions.data.list | length' "$DATA_FILE")"
source_district_count="$(jq '.districts.data.list | length' "$DATA_FILE")"

if [[ "$source_region_count" -ne 14 || "$source_district_count" -ne 177 ]]; then
  fail "Kutilgan 14 viloyat va 177 tuman o‘rniga ${source_region_count} / ${source_district_count} ta yozuv topildi. Import to‘xtatildi."
fi

printf 'Yangi Admin Bearer token kiriting (ekranga chiqmaydi): ' >&2
read -r -s TOKEN
printf '\n' >&2
[[ -n "$TOKEN" ]] || fail 'Token bo‘sh bo‘lmasligi kerak.'

readonly TMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/artistbor-locations.XXXXXX")"
readonly REGION_MAP="$TMP_DIR/region-map.json"
readonly REGIONS_CACHE="$TMP_DIR/regions.json"
trap 'rm -rf "$TMP_DIR"' EXIT

printf '{}' > "$REGION_MAP"

list_json() {
  curl --fail-with-body --silent --show-error \
    -H 'Accept: application/json' \
    -H "Authorization: Bearer $TOKEN" \
    "$1" |
    jq -c '
      if (.data | type) == "object" then (.data.list // .data.items // [])
      elif (.data | type) == "array" then .data
      else (.list // .items // [])
      end
    '
}

post_json() {
  curl --fail-with-body --silent --show-error \
    -X POST "$1" \
    -H 'Accept: application/json' \
    -H 'Content-Type: application/json' \
    -H "Authorization: Bearer $TOKEN" \
    --data "$2"
}

list_json "$API_BASE/v1/admin/regions?page=1&limit=1000" > "$REGIONS_CACHE"

created_regions=0
skipped_regions=0
created_districts=0
skipped_districts=0

while IFS= read -r item; do
  source_id="$(jq -r '.id' <<<"$item")"
  name_uz="$(jq -r '.name_uz' <<<"$item")"

  target_id="$(jq -r --arg name "$name_uz" \
    'map(select(.name_uz == $name)) | first | .id // empty' \
    "$REGIONS_CACHE")"

  if [[ -z "$target_id" ]]; then
    payload="$(jq -c '
      {name_uz, sort_order, status: (.status // 1)}
      + (if (.name_ru // "") != "" then {name_ru} else {} end)
      + (if (.name_en // "") != "" then {name_en} else {} end)
    ' <<<"$item")"

    response="$(post_json "$API_BASE/v1/admin/regions" "$payload")"
    target_id="$(jq -er '.data.id // .id' <<<"$response")"
    created_record="$(jq -c '.data // .' <<<"$response")"

    jq --argjson row "$created_record" '. + [$row]' "$REGIONS_CACHE" > "$REGIONS_CACHE.next"
    mv "$REGIONS_CACHE.next" "$REGIONS_CACHE"

    created_regions=$((created_regions + 1))
    printf 'Viloyat yaratildi: %s\n' "$name_uz"
  else
    skipped_regions=$((skipped_regions + 1))
    printf 'Viloyat mavjud, o‘tkazildi: %s\n' "$name_uz"
  fi

  jq --arg old "$source_id" --argjson target "$target_id" \
    '. + {($old): $target}' "$REGION_MAP" > "$REGION_MAP.next"
  mv "$REGION_MAP.next" "$REGION_MAP"
done < <(jq -c '.regions.data.list[]' "$DATA_FILE")

while IFS= read -r source_region_id; do
  target_region_id="$(jq -r --arg old "$source_region_id" '.[$old] // empty' "$REGION_MAP")"
  [[ -n "$target_region_id" ]] || fail "Region mapping topilmadi: $source_region_id"

  districts_cache="$TMP_DIR/districts-$source_region_id.json"
  list_json "$API_BASE/v1/admin/districts?region_id=$target_region_id&page=1&limit=1000" > "$districts_cache"

  while IFS= read -r item; do
    name_uz="$(jq -r '.name_uz' <<<"$item")"
    target_id="$(jq -r --arg name "$name_uz" \
      'map(select(.name_uz == $name)) | first | .id // empty' \
      "$districts_cache")"

    if [[ -z "$target_id" ]]; then
      payload="$(jq -c --argjson region_id "$target_region_id" '
        {region_id: $region_id, name_uz, sort_order, status: (.status // 1)}
        + (if (.name_ru // "") != "" then {name_ru} else {} end)
        + (if (.name_en // "") != "" then {name_en} else {} end)
      ' <<<"$item")"

      response="$(post_json "$API_BASE/v1/admin/districts" "$payload")"
      created_record="$(jq -c '.data // .' <<<"$response")"

      jq --argjson row "$created_record" '. + [$row]' "$districts_cache" > "$districts_cache.next"
      mv "$districts_cache.next" "$districts_cache"

      created_districts=$((created_districts + 1))
      printf 'Tuman yaratildi: %s\n' "$name_uz"
    else
      skipped_districts=$((skipped_districts + 1))
      printf 'Tuman mavjud, o‘tkazildi: %s\n' "$name_uz"
    fi
  done < <(
    jq -c --argjson region_id "$source_region_id" \
      '.districts.data.list[] | select(.region_id == $region_id)' \
      "$DATA_FILE"
  )
done < <(jq -r '[.districts.data.list[].region_id] | unique[]' "$DATA_FILE")

printf '\nTayyor.\n'
printf 'Viloyat: yaratildi=%d, mavjud/o‘tkazildi=%d\n' "$created_regions" "$skipped_regions"
printf 'Tuman: yaratildi=%d, mavjud/o‘tkazildi=%d\n' "$created_districts" "$skipped_districts"
