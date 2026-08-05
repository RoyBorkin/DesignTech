/* ==========================================================================
   DesignTech blog — configuration
   --------------------------------------------------------------------------
   Fill in the three values marked TODO. Everything else can stay as-is.
   See README.md for step-by-step instructions on where to get them.

   Heads up: apiKey and clientId are PUBLIC by design — they end up in the
   browser and anyone can read them. That is normal and expected for this
   kind of site. Protect them by restricting the API key to your own domain
   in the Google Cloud console (README step 4). Never put a Google account
   password or a "client secret" in this file.
   ========================================================================== */

window.DT_CONFIG = {

  /* ---------------------------------------------------------------- site */

  siteName: 'DesignTech',
  tagline: 'Technion Design Lab',
  heroTitle: 'Notes from the <em>Design Lab</em>',
  heroText: 'Projects, experiments and process notes from the Technion Design Lab.',
  defaultAuthor: 'DesignTech',

  /* --------------------------------------------------------- google drive */

  // TODO — Google Cloud API key (public read access to the folder).
  apiKey: '',

  // TODO — Google OAuth 2.0 Web client ID, ends in .apps.googleusercontent.com
  // (only needed to publish; visitors never use it).
  clientId: '',

  // The Drive folder posts live in. Taken from your shared link.
  folderId: '1Fh0EvAhpeckWWa5vrP08ZTHfYzX7jmyM',

  // OAuth scope used when publishing.
  //   'drive.file'  — app can only touch files it created. Try this first.
  //   'drive'       — full Drive access. Only switch to this if publishing
  //                   fails with a 403/404 on the folder.
  scope: 'https://www.googleapis.com/auth/drive.file',

  /* ----------------------------------------------------------- publishing */

  postsPerPage: 9,

  // SHA-256 of "username:password". Change it with the snippet in README
  // step 7 if you ever want different credentials.
  //
  // IMPORTANT: this is a speed bump, not real security. A static site has no
  // server, so anyone who views the page source can see this file. It keeps
  // casual visitors out of the editor; it will not stop someone determined.
  // The real lock is your Google account — nothing can be written to Drive
  // without signing in to Google.
  authHash: '6eaaa7f2c32fb71b526823f55da41f17f037181c5ca4a0c1163daf3944e7dffc',

  /* ---------------------------------------------------------------- demo */

  // While apiKey is blank the site shows a few sample posts so you can see
  // the design. It switches to your real Drive posts automatically once the
  // key is filled in. Set to false to show a plain empty state instead.
  demoWhenUnconfigured: true
};
