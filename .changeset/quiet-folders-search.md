---
"emdash": patch
---

Fixes media folder searches failing on Cloudflare D1 when long, Unicode, or punctuation-heavy search terms exceed its pattern limit. Searches match the complete term without truncation.
