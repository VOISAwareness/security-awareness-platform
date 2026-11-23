# Clay badges

The achievement pictures in `src/assets/clay/achievements/` are drawn by
`make-badges.mjs` from the table in `badges.mjs`: soft 3D clay medals, each
with a thick rounded ("noodle") number, letter or icon in the middle, lit with
SVG lighting filters so they look puffy and matte, with a soft ground shadow.

## Change or add a badge

1. Add an entry to `badges.mjs` (`id`, four colours, and the middle shapes: a
   `stroke` path for numbers and letters, or a `fill` path for icons). The
   `id` must be the one used in `src/Achievements/achievements.js`.
2. Draw it (Playwright is needed; any version):

       node make-badges.mjs            # every badge
       node make-badges.mjs my-badge   # just one

   This writes `src/assets/clay/achievements/<id>.png`.
3. Make the `.webp` the app uses, and remove the `.png`:

       python3 -c "from PIL import Image; import sys; Image.open(sys.argv[1]).save(sys.argv[1][:-4]+'.webp','WEBP',quality=90,method=6)" ../../src/assets/clay/achievements/my-badge.png

4. Add its row to `src/Achievements/achievements.js`. The My Space card and
   its "View all" box pick it up.

Pictures from an illustrator in the same size (512 x 512, transparent
background) can be dropped into the same folder instead; this script is only a
quick way to make matching ones.
