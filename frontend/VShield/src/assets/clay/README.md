# Clay images

The app's clay-style pictures, shared by every page. Add new ones here as they
are made and show them with `GlobalComponents/ClayImage.jsx`:

    <ClayImage name="shield-check" alt="" className="w-16 h-16" />

- **Name** = the file name without its extension, lower-case with hyphens
  (`shield-check.webp` → `"shield-check"`). Subfolders are only for tidiness;
  names must be unique across them.
- **Format**: `.webp` (or `.png`) on a transparent background, square unless
  the picture needs otherwise, at least 512 px on its long side.
- **Badges** already live in `assets/badges/` (four widths each) and are
  reached through the same component as `name="badge:<level id>"`, e.g.
  `"badge:L3G2"`.

- **Achievements** (`achievements/`): one picture per achievement, named by
  its id in `src/Achievements/achievements.js` (`first-report.webp` …). A new
  achievement needs a picture here and a row in that file.

Nothing here holds personal data or anything secret: these are design assets.
