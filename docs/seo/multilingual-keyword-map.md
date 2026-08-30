# Multilingual SEO Keyword Map

Last updated: 2026-08-30

## Purpose

This document governs which localized page owns each search intent. The accompanying CSV is the executable inventory used to update visible copy, metadata, internal links, structured data, and later GSC reviews.

The durable product promise stays MusicXML-first: PDF, images, scans, and audio are import sources; MusicXML and Score JSON remain the structured score model used for correction, transposition, playback, and export. OMR pages must describe a reviewable candidate plus correction workflow rather than promise perfect automatic recognition.

## Current CSV scope

`multilingual-keyword-map.csv` currently contains 65 mapping rows:

- Five P0 product pages across all nine supported locales: 45 rows.
- The generic and two directional Jianpu pages for `zh-CN` and `zh-TW`: 6 rows.
- The guide hub and six completed PDF/MusicXML guides for `en` and `zh-CN`: 14 rows.

The nine locales are `en`, `zh-CN`, `zh-TW`, `ja`, `ko`, `fr`, `es`, `de`, and `ru`.

The deployed sitemap has 33 localized base routes per locale. The remaining hub, supporting product, public-library, trust, and legal routes should be added in later map revisions after the P0 cluster has a measured GSC baseline. The unreleased `/audio-to-score` page must remain outside the indexed map until its product release gate is enabled.

The restored guide cluster currently has complete main content only in English and Simplified Chinese. Do not generate indexable French, Spanish, German, Japanese, Korean, Russian, or Traditional Chinese guide URLs from English fallback content. Add those rows only after the complete title, introduction, sections, examples, FAQ, calls to action, and structured data are localized and reviewed.

## CSV data contract

One CSV row represents one locale, route, and primary intent. Multi-value fields use `|` as the separator.

| Field | Meaning |
| --- | --- |
| `row_id` | Stable identifier. Never reuse an identifier for a different intent. |
| `locale` / `market` | Language route and initial research market. Market is a research scope, not an automatic geographic redirect. |
| `route` / `localized_url` | Locale-neutral route owner and actual canonical localized URL. |
| `page_type` / `topic_cluster` | Product, guide, guide hub, benchmark, or other page family and its SEO cluster. |
| `search_intent` | Controlled intent: `transactional`, `commercial-investigation`, `comparison`, or `informational`. |
| `primary_keyword` | The single query family owned by this locale-specific page. |
| `secondary_keywords` | Close variants that can be answered naturally on the same page. |
| `excluded_keywords` | Queries intentionally owned by another page. These are governance exclusions, not paid-search negative keywords. |
| `title_target` / `h1_target` | Starting targets for visible metadata and page copy. They must be edited naturally, not inserted mechanically. |
| `schema_types` | Structured-data candidates supported by visible content. Do not emit FAQ, HowTo, or Dataset markup without matching page content. |
| `internal_link_target` | The next page or evidence asset the page should support. |
| `indexability` | `index` only when the localized page is live, self-canonical, crawlable, and complete. |
| `translation_status` | `complete`, `review-needed`, `planned`, or `not-applicable`. |
| `priority` | `P0` is the initial acquisition cluster, `P1` supports it, and later pages are `P2` or `P3`. |
| `research_status` | `seed`, `validated`, `monitoring`, or `retired`. Every current row is intentionally a seed. |
| `search_volume`, `keyword_difficulty`, `cpc` | Blank until sourced from an identified research tool and market. Never infer or fabricate these values. |
| `research_source` / `last_researched` | Provenance and date for the current mapping. |

Google does not use a keywords meta tag for ranking. The map is an editorial and measurement artifact; use it to improve the title, H1, opening answer, evidence, FAQ, examples, alt text, internal anchors, and structured data actually visible on the page.

## Page ownership

| Canonical route | Exclusive search job | Must not become |
| --- | --- | --- |
| `/` | Brand and the general structured sheet-music workspace | A duplicate PDF converter or generic sheet-music editor page |
| `/features` | Product-suite discovery and feature navigation | Owner of individual tool keywords |
| `/pdf-to-musicxml` | Outcome intent: convert a PDF or image score into a reviewable MusicXML candidate | General scanner, editor, or how-to article |
| `/pdf-score-scanner` | Process intent: scan, recognize, diagnose, and correct sheet-music OMR | A second PDF-to-MusicXML product page |
| `/score-editor` | Creation and editing intent: sheet music maker, notation editor, correction, and collaboration | Format-conversion or scanning page |
| `/musicxml-midi` | MusicXML editing and MusicXML/MIDI/PDF interoperability | PDF recognition page |
| `/transpose-score` | Change key, transpose by semitone, and transposing-instrument parts | General editor page |
| `/score-to-audio` | Structured score playback and MIDI/MP3/WAV practice output | Audio-to-score transcription page |
| `/numbered-notation-converter` | Generic Jianpu/numbered-notation conversion hub | Owner of either directional query |
| `/staff-to-jianpu` | Staff notation to Jianpu direction only | Generic Jianpu hub or reverse conversion |
| `/jianpu-to-staff` | Structured Jianpu text to staff notation direction only | Image recognition or staff-to-Jianpu page |
| `/teaching` | Music education, assignments, classes, and teacher workflows | Generic score editor |
| `/pricing` | Brand price, plans, credits, and product-cost intent | Product-function landing page |
| `/library` | Public-domain and free sheet-music catalog intent | Owner of a specific composition query |
| `/library/{slug}` | Composition, composer, catalog number, and available-format long tails | Generic free-sheet-music hub |
| Trust and legal routes | Brand navigation, support, privacy, copyright, and contractual intent | Competitive product landing pages |

## P0 language matrix

These are seeds, not volume-validated final keywords.

| Locale | `/pdf-to-musicxml` | `/pdf-score-scanner` | `/score-editor` | `/transpose-score` | `/musicxml-midi` |
| --- | --- | --- | --- | --- | --- |
| `en` | pdf to musicxml converter | sheet music scanner | sheet music maker | transpose sheet music online | musicxml editor online |
| `zh-CN` | PDF 乐谱转 MusicXML | 乐谱识别 | 在线五线谱编辑器 | 乐谱移调 | MusicXML 在线编辑器 |
| `zh-TW` | PDF 樂譜轉 MusicXML | 樂譜辨識 | 線上樂譜編輯器 | 樂譜移調 | MusicXML 線上編輯器 |
| `ja` | PDF楽譜をMusicXMLに変換 | 楽譜スキャナー | オンライン楽譜エディター | 楽譜を移調 | MusicXML エディター |
| `ko` | PDF 악보 MusicXML 변환 | 악보 스캐너 | 온라인 악보 편집기 | 악보 조옮김 | MusicXML 편집기 |
| `fr` | convertir une partition PDF en MusicXML | scanner de partitions | éditeur de partitions en ligne | transposer une partition en ligne | éditeur MusicXML en ligne |
| `es` | convertir partitura PDF a MusicXML | escáner de partituras | editor de partituras online | transponer una partitura online | editor MusicXML online |
| `de` | PDF-Noten in MusicXML umwandeln | Notenscanner | Online-Noteneditor | Noten online transponieren | MusicXML-Editor online |
| `ru` | конвертер PDF нот в MusicXML | сканер нот | нотный редактор онлайн | транспонировать ноты онлайн | редактор MusicXML онлайн |

For Simplified and Traditional Chinese, Jianpu gets an additional P0 cluster:

| Route | `zh-CN` | `zh-TW` |
| --- | --- | --- |
| `/numbered-notation-converter` | 简谱转换器 | 數字譜轉換器 |
| `/staff-to-jianpu` | 五线谱转简谱 | 五線譜轉數字譜 |
| `/jianpu-to-staff` | 简谱转五线谱 | 數字譜轉五線譜 |

## PDF/MusicXML evidence cluster

The cluster is designed to outperform a single-purpose PDF-to-MusicXML converter by covering the complete decision and correction journey.

| Page | Intent owner | Main conversion target |
| --- | --- | --- |
| `/pdf-to-musicxml` | Convert now | Upload or product workspace |
| `/pdf-score-scanner` | Scan and recognize notation | Upload or product workspace |
| `/guides/convert-pdf-sheet-music-to-musicxml` | Learn the reliable conversion workflow | `/pdf-to-musicxml` |
| `/guides/best-scan-settings-for-sheet-music-ocr` | Improve source quality and scan settings | `/pdf-score-scanner` |
| `/guides/correct-omr-recognition-errors` | Repair recognition errors | `/score-editor` and `/pdf-score-scanner` |
| `/guides/pdf-vs-musicxml-vs-midi` | Compare file formats | `/musicxml-midi` |
| `/guides/import-musicxml-into-musescore` | Use the exported result in MuseScore | `/musicxml-midi` |
| `/guides/pdf-to-musicxml-recognition-benchmark` | Evaluate accuracy evidence and limitations | Product page plus public evidence JSON |

The product page should answer transactional questions briefly and lead to conversion. Guides should answer the informational query completely, show source-backed limitations, and link to the product owner. The benchmark must distinguish routing/runtime evidence from note, rhythm, key, lyric, or symbol accuracy that has not yet been measured against a gold set.

## Priority sequence

### P0: conversion acquisition

1. `/pdf-to-musicxml`
2. `/pdf-score-scanner`
3. `/score-editor`
4. `/musicxml-midi`
5. `/transpose-score`
6. English and Simplified Chinese conversion guide and recognition benchmark
7. Simplified and Traditional Chinese Jianpu hub and directional pages

### P1: authority and supporting workflows

1. Remaining completed PDF/MusicXML guides
2. `/score-to-audio`
3. `/teaching`
4. `/pricing`
5. `/library`

### P2 and P3: long-tail and trust

- Public-library composition pages target title, composer, catalog number, instrumentation, and available file-format queries.
- About, FAQ, support, privacy, terms, and copyright pages primarily serve brand, trust, and compliance intent.

## Cannibalization rules

1. Within one locale, one primary query family has exactly one canonical owner.
2. The home page targets the brand and platform category, not `pdf to musicxml`, `sheet music scanner`, or `sheet music maker`.
3. `/pdf-to-musicxml` owns the output-format result; `/pdf-score-scanner` owns recognition and scanner terminology.
4. `/score-editor` owns creation and editing; `/musicxml-midi` owns format interoperability and export.
5. `/numbered-notation-converter` owns the generic Jianpu category; directional pages own only their conversion direction.
6. Guides use how-to, settings, correction, comparison, benchmark, and import modifiers. Product pages keep the matching transactional phrase.
7. A library detail page targets its composition. The library hub owns broad public-domain and free-sheet-music queries.
8. Hreflang variants are not cannibalization when each page has genuinely localized main content and a self-referencing canonical.
9. A translated shell around fallback English main content is not a localized page and must not be indexed or advertised through hreflang.
10. Internal anchor text should reinforce the owner: guides link to the product with the transactional phrase; product pages link to guides with the informational phrase.
11. Do not repeat the exact same title and H1 template across competing pages. Each page must state its distinct job in the opening answer.
12. OMR copy must not promise universal or perfect recognition. Use candidate, diagnostics, correction, and source-verification language.

## Research workflow

Before moving a row from `seed` to `validated`:

1. Check the local Google SERP while signed out or with personalization minimized.
2. Record language, country, device, date, dominant result types, autocomplete, related questions, and representative competitor URLs.
3. Use Keyword Planner or another named data source for volume, competition, and CPC. Record the source and market; do not mix global values with a country row.
4. Ask a native-language reviewer to check query naturalness, search intent, title, H1, first-screen promise, FAQ, examples, and CTA.
5. Confirm that the chosen keyword is not already primary on another page in the same locale.
6. Update the CSV research fields and set `research_status=validated` only after evidence is recorded.

Literal translation is not keyword research. Simplified and Traditional Chinese require regional vocabulary choices, and French, Spanish, German, Japanese, Korean, and Russian terms must be verified against their own result pages.

## GSC review cadence

Submit the updated sitemap once after deployment. Do not manually request all localized URLs one by one.

### Days 7–14: crawl and index audit

- Check indexed and excluded counts by locale prefix.
- Inspect one product page and one supporting page per locale.
- Confirm canonical, hreflang, robots, HTTP status, rendered language, sitemap membership, and last crawl.
- Review mobile Core Web Vitals and any sudden crawl or server-error changes.
- Do not rewrite keywords merely because a new page has not ranked in its first few days.

### Days 28–42: query and snippet audit

Export GSC performance by page, query, country, and device for the P0 routes.

- Record impressions, clicks, CTR, average position, and the top queries actually associated with each page.
- If impressions grow but CTR trails comparable queries at the same position, improve the title and description without changing the page owner.
- If the page receives impressions for a close, useful variant, add the answer naturally to visible copy and FAQ rather than creating a duplicate page immediately.
- If a guide receives transactional queries, strengthen its product CTA but keep the informational owner.

### Days 42–56: cannibalization and consolidation audit

- Compare query overlap between pages within each locale.
- When two pages repeatedly receive impressions for the same primary intent, choose one owner and retarget the other to its intended modifier.
- If the distinction cannot be sustained with genuinely different content, merge the weaker page and use a redirect rather than relying on canonical tags to hide duplication.
- Review internal links, anchor text, sitemap dates, backlinks, and the availability of public examples or evidence.

### Ongoing monthly review

- Preserve a dated GSC export before changing a P0 page.
- Change one major variable at a time: intent, title, opening answer, evidence, FAQ, or internal links.
- Compare at least 28 days before and after a material change while accounting for seasonality and indexing delay.
- Promote rows from `validated` to `monitoring`; mark a retired keyword with its replacement owner rather than deleting its history.

SEO success is evaluated by qualified impressions, non-brand clicks, conversion starts, successful score projects, and retained users—not ranking position alone.
