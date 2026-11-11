# DesignTech Lab · Technion

The website of the Design Tech Lab, the main laboratory of the Industrial Design graduate track at the Technion, Israel Institute of Technology.

- Static site: HTML, CSS and JavaScript modules. No build step, no server code.
- English and Hebrew (right-to-left), switchable on every page.
- Six designs share one content model (`?theme=future|bauhaus|cinema|apple|minimal|editorial` previews one).
- Content is edited with DesignTech Studio (kept outside this repository) or by hand in `data/` and `content/`.
- `.github/workflows/publish.yml` deploys to GitHub Pages, syncs Instagram hourly and rebuilds the content lists.

Run locally: `python3 -m http.server` in this folder, then open http://localhost:8000.

Fonts are self-hosted from Fontsource (SIL Open Font License). Photographs © Design Tech Lab.
