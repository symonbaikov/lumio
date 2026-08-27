// Объявления для статических импортов изображений (*.png, *.svg, …).
// Next пишет эту ссылку в next-env.d.ts, но тот в .gitignore и создаётся
// только при `next dev`/`next build` — джоба typecheck запускает голый tsc,
// поэтому ссылку держим в отдельном, коммитируемом файле.
/// <reference types="next/image-types/global" />
