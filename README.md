# DesignTech blog

A blog for the Technion Design Lab. Static site, hosted free on GitHub Pages,
with posts stored in a Google Drive folder.

- **`index.html`** — front page. Newest post featured, the rest as a grid, with search.
- **`post.html`** — one post.
- **`admin.html`** — password-protected editor. Write, add pictures, publish.
- **`config.js`** — the only file you need to edit.

Works on phones and laptops. No build step, no framework, no server.

---

## How it works

There is no server, so the browser talks to Google Drive directly.

```
        visitor                                    you
           |                                        |
    reads with API key                      writes with Google sign-in
           v                                        v
     +-------------------------------------------------------+
     |            your Google Drive folder                   |
     |   2026-08-05--first-post.html                         |
     |   2026-08-05--first-post--cover-1.jpg                 |
     +-------------------------------------------------------+
```

Each post is one `.html` file. The date at the front of the filename is what
sorts the front page newest-first. Pictures are separate image files in the
same folder. Post metadata (title, date, summary) is stored in the Drive file's
own *description* field, so the front page needs only one request to build the
whole list of cards.

You can open the folder in Drive any time and see your posts as plain files.
Deleting a file there removes the post from the blog.

---

## Setup

Roughly 15 minutes, once. Steps 1–2 get the site online; steps 3–6 connect Drive.

### 1. Put the site on GitHub

1. Create a new repository on [github.com/new](https://github.com/new).
   Public, no README needed. Call it whatever you like — `designtech-blog` works.
2. Upload **the contents of this `site` folder** to the repository root — so
   `index.html` sits at the top level, not inside a `site/` folder.
   (Easiest: on the repo page, *Add file → Upload files*, then drag everything in.)

### 2. Turn on GitHub Pages

1. In the repository, go to **Settings → Pages**.
2. Under *Build and deployment*, set **Source: Deploy from a branch**,
   **Branch: `main`**, folder **`/ (root)`**. Save.
3. Wait a minute, then reload. GitHub shows your address at the top:

   ```
   https://YOUR-USERNAME.github.io/YOUR-REPO/
   ```

   **Write it down — steps 4 and 5 both need it.**

The site is now live and will show sample posts until Drive is connected.

### 3. Share the Drive folder

Open your posts folder in Google Drive → **Share** → under *General access*
choose **Anyone with the link**, role **Viewer**.

This is what lets visitors read posts. Only *you* can write, because writing
needs a Google sign-in.

> The folder ID is already filled in for you in `config.js`. It's the long
> string in the folder's URL, after `/folders/`.

### 4. Create an API key (so visitors can read)

1. Go to [console.cloud.google.com](https://console.cloud.google.com/).
2. Top-left project dropdown → **New project** → name it `designtech-blog` → Create.
   Make sure it's selected afterwards.
3. **APIs & Services → Library** → search **Google Drive API** → **Enable**.
4. **APIs & Services → Credentials → + Create credentials → API key**. Copy it.
5. Click the new key to edit it, then lock it down:
   - *Application restrictions* → **Websites**. Add two entries:
     - `https://YOUR-USERNAME.github.io/*`
     - `http://localhost:8000/*`  (only needed if you preview locally)
   - *API restrictions* → **Restrict key** → tick **Google Drive API**.
   - Save.
6. Paste the key into `config.js` as `apiKey`.

Restricting the key matters: it means that even though the key is visible in
your page source, it only works from your own site.

### 5. Create an OAuth client (so you can publish)

1. **APIs & Services → OAuth consent screen**:
   - User type **External** → Create.
   - App name `DesignTech blog`, your email for support and developer contact.
   - Skip the scopes page (the site asks for what it needs at sign-in).
   - **Test users → + Add users** → add your own Google address.
     (Leaving the app in *Testing* is fine for personal use. Google will show an
     "unverified app" warning at sign-in — click *Advanced → Go to…* to continue.)
2. **Credentials → + Create credentials → OAuth client ID**:
   - Application type **Web application**.
   - **Authorised JavaScript origins** — add, with no trailing slash and no path:
     - `https://YOUR-USERNAME.github.io`
     - `http://localhost:8000`  (only if you preview locally)
   - Create, then copy the **Client ID** (ends in `.apps.googleusercontent.com`).
3. Paste it into `config.js` as `clientId`.

### 6. Commit `config.js` and publish your first post

Upload the edited `config.js` to GitHub. Then:

1. Open your site, click the **pencil icon** in the top-right corner.
2. Sign in with your editor username and password.
3. Click **Connect Google Drive** and approve.
4. Write a title, write the post, add a cover picture, **Publish**.

The post appears on the front page immediately. Give it a minute if the browser
serves a cached copy of the page.

---

## Writing posts

The editor is a normal rich-text box. What's available:

| Button | Does |
|---|---|
| **B** / *I* / U | Bold, italic, underline |
| H2 / H3 / ¶ | Heading, sub-heading, back to normal text |
| lists, `"` | Bulleted and numbered lists, block quote |
| link | Turn the selected words into a link |
| **Picture** | Insert a picture in the body — or just drag one in, or paste it |
| Preview | See the post exactly as readers will |

Other things worth knowing:

- **Pictures are shrunk automatically** to 1600px on the long edge and saved as
  JPEG, so posts stay quick to load on a phone. Originals are left alone on your
  computer.
- The **cover picture** (right-hand panel) is the image shown on the front-page
  card. It isn't repeated at the top of the post body.
- **Summary** is the text on the card. Leave it blank and the opening lines are
  used.
- `Ctrl`/`Cmd` + `S` publishes.
- The date is part of the filename and sets the ordering. Back-date a post by
  changing it before publishing.
- **Your posts** in the sidebar lets you re-edit or delete anything you've
  published. Delete moves the file to the Drive bin, so it's recoverable.

---

## Changing things

**Wording on the front page** — `config.js`: `heroTitle`, `heroText`, `tagline`.

**Colours** — the top of `css/style.css`:

```css
--cyan: #57bed2;   /* from the logo */
--red:  #d7262a;
```

**Username and password** — `config.js` stores a SHA-256 hash of
`username:password`, not the password itself. To change it, open your site,
press F12 for the browser console, and run:

```js
crypto.subtle.digest('SHA-256', new TextEncoder().encode('newuser:newpassword'))
  .then(b => console.log([...new Uint8Array(b)]
    .map(x => x.toString(16).padStart(2,'0')).join('')));
```

Paste the result into `authHash`.

**Remove the sample posts** — delete `js/demo-posts.js` and `img/demo/`, and
remove the `<script src="js/demo-posts.js"></script>` line from `index.html`
and `post.html`.

---

## About the password

Be clear-eyed about this one. GitHub Pages serves files; it runs no code of its
own. Anything that checks a password in the browser can be read by anyone who
views the page source, and the check can be skipped entirely by someone who
knows how. The username and password here keep casual visitors out of the
editor. They are not a security boundary.

The real protection is Google. Publishing requires signing in to a Google
account with edit access to the folder, and that happens on Google's servers,
not in this page. Someone who bypassed the password screen would see an empty
editor and would not be able to save anything.

If you ever need genuinely private drafts, keep them in Drive and only publish
when ready.

---

## Previewing locally

From inside the `site` folder:

```bash
python3 -m http.server 8000
```

Then open <http://localhost:8000>. Use `localhost`, not the `file://` path —
browsers block the sign-in and Drive requests on `file://`.

---

## When something goes wrong

**Front page says "Could not load posts from Drive"**
Check, in order: Drive API enabled on the project; folder shared as *Anyone with
the link — Viewer*; API key's website restriction matches your GitHub Pages
address exactly (including `https://`).

**"Google refused the request" / 403 when publishing**
Your OAuth client's *Authorised JavaScript origins* must match the page's origin
exactly — `https://you.github.io`, no trailing slash, no repository path.

**404 on the folder when publishing**
The signed-in Google account can't edit that folder. Sign in with the account
that owns it, or give your account edit access.

**Publishing fails with a permissions/scope message**
Change `scope` in `config.js` to `https://www.googleapis.com/auth/drive`, then
reconnect. Broader, but it resolves the case where Drive won't let an app write
into a folder it didn't create.

**A post is on Drive but not on the site**
The filename must end in `.html`. If you added it by hand rather than through
the editor, the front page falls back to the filename for the title, which is
why editor-published posts look better.

**Pictures show as broken boxes**
The image files must be in the same shared folder, and the folder must be shared
with *Anyone with the link*. Re-check step 3.

---

## Credits

Layout and colour built around the DesignTech logo. Typefaces: Space Grotesk and
Inter (Google Fonts). Original starting point: the *Chefer* template by
HTML Codex — the current design shares none of its markup.
