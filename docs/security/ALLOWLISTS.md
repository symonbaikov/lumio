# Security allowlists

These allowlists document temporary exceptions used by CI gates. Review them regularly and remove once upstream fixes are available.

## Dependency vulnerabilities

Configured in `backend/audit-ci.json` and used by `dependency-scan` job:

- `GHSA-cf4h-3jhx-xvhq` (underscore via pdf2json) — no upstream fix available.
- `GHSA-h6q6-9hqw-rwfv`, `GHSA-crh6-fp67-6883`, `GHSA-5fg8-2547-mr8q` (xmldom via pdf2json) — no upstream fix available.
- `GHSA-4r6h-8v6p-xvw6`, `GHSA-5pgg-2g8v-p4x9` (xlsx) — no upstream fix available.

## Misconfiguration exceptions (Trivy)

Used by the `trivy-config` job. Подавления делаются точечно, inline-комментарием
`#trivy:ignore:<ID>` над конкретной строкой, а не глобальным `.trivyignore`.

- `AVD-DS-0031` в `observability/grafana/Dockerfile` — `GF_AUTH_ANONYMOUS_ENABLED=false`
  это булев флаг конфигурации Grafana, выключающий анонимный доступ, а не секрет.
  Trivy срабатывает эвристикой на подстроку `AUTH` в имени переменной.

## License exceptions

`dependency-scan` runs license checks for dependencies in all npm package roots, including dev dependencies. The allowlist only permits open-source licenses and intentionally excludes `UNLICENSED` dependency packages.

- `@img/sharp-libvips-*` (LGPL) required by `sharp`/Next.js image processing.

If licensing requirements change, adjust the `ALLOWED_LICENSES` string in `.github/workflows/ci.yml` and tighten/remove these exceptions.
