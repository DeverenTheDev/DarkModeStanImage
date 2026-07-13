DarkModeStanImage

Dark mode that does not invert the colors of embedded images of Google Sheets.

A universal Chrome dark mode extension that inverts page colors without
inverting embedded images, video, or photos — including images drawn onto
<canvas> (like Google Sheets' grid) and images set via CSS background
rather than an <img> tag (like LinkedIn's avatar system).

Per-site control, with a global default and a master kill switch, plus
per-site brightness/contrast adjustment.

Files::
manifest.json
content.js
injected.js
popup.js
popup.html


FileRolemanifest.jsonExtension config — permissions, what runs wherecontent.jsInjected into every page; decides on/off state and applies dark modeinjected.jsInjected into the page's own JS world; patches canvas drawImagepopup.htmlToggle UI markuppopup.jsToggle UI logic — reads/writes settings, live-previews sliders

-----------------------------------------------

Install (unpacked, for development)

Go to chrome://extensions
Turn on "Developer mode" (top right)
Click "Load unpacked"
Select this folder
Pin the extension icon to your toolbar

Reload the extension from chrome://extensions (the refresh icon on its
card) after editing any file.

-----------------------------------------------

How the color inversion works

The core trick, used three separate times in three separate layers:

Invert everything, then invert twice on anything that should look normal.
Two color inversions cancel out. The whole page gets
filter: invert(1) hue-rotate(180deg) (that's the dark mode). Anything that
should keep its real colors — photos, video, canvas-drawn images — gets that
same filter applied a second time, specifically to that element, which
cancels the outer inversion just for it.

This one idea gets applied at three different layers, because a modern page
draws images through three different mechanisms:

1. Plain <img> / <video> / inline background-image — CSS only

content.js injects a <style> tag:

csshtml {
  filter: invert(1) hue-rotate(180deg) brightness(...) contrast(...) !important;
}
img, video, picture, svg image, embed, object,
[style*="background-image"] {
  filter: invert(1) hue-rotate(180deg) !important;
}

This handles the majority of images on the web with no JavaScript logic
needed at all — CSS selectors are enough.

2. Canvas-drawn images (e.g. Google Sheets' grid) — injected.js

Google Sheets renders its entire grid — gridlines, text, and any embedded
photos — onto a single <canvas>. A CSS filter on a canvas inverts the
whole rendered bitmap as one flat image; there's no way to exempt just the
photo pixels with CSS alone.

injected.js solves this one level down, by patching
CanvasRenderingContext2D.prototype.drawImage itself. Right before an actual
photo gets drawn onto the canvas, it temporarily sets the canvas context's
own filter to invert-again, so that specific draw operation gets
double-inverted — same trick, just moved from a CSS selector to a canvas API
call.

Two details that make this work correctly:


Isolated worlds. Content scripts (content.js) run in a JS
environment separate from the page's own scripts, even though they share
the DOM. A patch applied from content.js wouldn't be visible to Sheets'
own code. injected.js is instead loaded as a real <script src="...">
tag, which runs in the page's own world — the only way Sheets' calls to
drawImage will actually go through our patched version.
Scroll blitting. Sheets scrolls by copying already-rendered canvas
pixels into their new position (drawImage with the canvas itself as the
source), not by redrawing everything from scratch. Those pixels are
already correct — inverting them again would undo the correction and
produce smeared, wrong-colored strips while scrolling. injected.js
checks whether the drawImage source is an HTMLCanvasElement /
OffscreenCanvas (a blit) versus a real HTMLImageElement / ImageBitmap
(an actual photo), and only double-inverts the latter.


3. Class-based background-image (e.g. LinkedIn avatars) — computed style scan

Some sites set an element's background image via a CSS class, defined in
an external stylesheet, rather than an inline style="background-image:..."
attribute. The [style*="background-image"] CSS selector only sees inline
styles, so it misses these.

content.js runs a JS scan instead: for every element, it checks
getComputedStyle(el).backgroundImage (which reflects the resolved style,
regardless of where it came from) and applies the un-invert as a direct
inline style if a real image is found.

Two guards prevent this scan from over-correcting:


Skip elements with a nested <img>. CSS filters compound down the
render tree — a filter on a parent affects everything rendered inside it,
in addition to any filter the child already has. If a container <div>
has its own decorative background image (a blur-up placeholder, a status
ring) around an actual <img>, fixing both would double-correct the
<img> and leave it net-inverted. Skipping containers that hold a real
<img> avoids this (this was the LinkedIn avatar bug, found and fixed
during development).
Skip elements already inside a fixed element. Same compounding
problem, one level more general — never fix a descendant of something
already fixed.


Because sites like LinkedIn keep injecting new DOM after the initial page
load (popups, infinite scroll, SPA navigation), a MutationObserver watches
for newly added elements and runs the same scan on each one as it appears.

Settings model

Three layers, checked in this order by computeState() in content.js:

masterEnabled   (top power button — false disables everything, everywhere)
  → globalDefault   (the "Turn on for all websites" switch)
    → siteOverrides[hostname]   ("on" | "off" | absent = use global)

js{
  masterEnabled: true,
  globalDefault: false,
  siteOverrides: {
    "docs.google.com": "on",
    "reddit.com": "off"
  },
  siteAdjust: {
    "docs.google.com": { brightness: 110, contrast: 95 }
  }
}

siteAdjust is per-site only (no separate global slider yet) — any site
without an entry uses the neutral default of 100%/100% (no change).

-----------------------------------------------

Brightness / contrast sliders

Only the page-wide (html) filter gets brightness()/contrast() added —
the per-image un-invert filter does not. Because filters compound down the
render tree, images still end up with one clean pass of brightness/contrast
applied as part of the page-wide filter, after their own color-cancelling
filter already ran — no extra logic needed in injected.js or the
background-image fix.

Dragging a slider sends a live-preview message directly to the content
script (chrome.tabs.sendMessage, fired on the input event) rather than
writing to chrome.storage.sync on every pixel of movement — sync storage
has a write-rate cap (~120/minute) that a fast drag would blow through. The
final value is written to storage once, on change (mouse release), which
persists it and syncs any other open tabs on the same site.

-----------------------------------------------

Known limitations

Elements with a background image set via inline SVG data URIs inside a
<use> element aren't covered by either the CSS selector or the
computed-style scan — a different fix would be needed if that pattern ever
shows up.
The computed-style background scan runs querySelectorAll('*') on every
newly-added DOM subtree. Fine for typical page interactions (a popup, a
few new rows); a site that dumps a very large chunk of DOM at once (some
infinite-scroll feeds) could see a brief jank. Not yet optimized, since it
hasn't been an observed problem.
Enabling the extension anywhere requires the broad
"Read and change all your data on all websites" permission, since
content_scripts.matches is <all_urls>. This is normal for any
universal dark-mode extension, but worth knowing if you ever publish it.

-----------------------------------------------

Possible future work

A separate, editable global brightness/contrast default (currently
only per-site values exist, falling back to a fixed 100%/100%).
A "site list" view in the popup showing every site with a saved
override, for management/cleanup in one place.
Per-site Sepia/Grayscale sliders, following the same pattern as
brightness/contrast.
















----------------------------------------------- Reddit Post ----- 7/13/2026 
- https://www.reddit.com/r/googlesheets/comments/1s4j83a/darkmode_that_doesnt_just_invert_the_colors/



Hello Everyone. I found this thread 4 months later, and I got the say, the problem still exists.
From DarkReader, to Easy Dark Mode, to even this post: https://www.reddit.com/r/chrome/comments/8iwvzn/night_mode_extension_that_does_not_invert_images/
No Dark Mode extension in my research seems to do the thing we want; not invert embedded images in google sheets cells. You know, the ones where you select "Insert>insert image in cell" instead of "Insert>insert image over cells" That seems to be what is happening in Seanthesheep0711's second post.
So I did what any bored computer programmer does when even old reddit posts seem to fail:
I made my own extension
I call it       DarkModeStanImage         Probably needs a bettter name.
And Y'all can have it too


https://github.com/DeverenTheDev/DarkModeStanImage/tree/main


It is just a public git repository for now. Nothing official on the App Store. And I only really tested it for Google Chrome.
And I really only made it for myself, and my own use in Google Sheets, where I just couldn't stand the inverted colors anymore.
But I think i realized what the problem is for DarkReader. Most Dark Mode Extension you can download use <img><img> tags in the html of the page to recognize images. But when you "Insert>insert image in cell" it no longer counts as an image, and actually becomes part of Google Sheets' canvas draw layer. Which is actually handled by continuous scan lines. So I had to program my js code code to intercept blah blah blah...

Anyway, if you want it, you got go the github i posted ⬆
-<>Code   button
 -Download Zip   option
  -Unzip the files on your computer, it should be a file named "DarkModeStanImage", with js. files in it
   -Put them into any file you want
    -then you got to go to chrome://extensions/
     -Turn on Developer Mode in the top corner, or wherever it is
      -Click the "Load Unpacked" 
       -Select the  "DarkModeStanImage" file
And then I think there will be a Permissions Warning. That is because I made the extension to be useable to any website, to is needs global html permission, instead of a single website permission.
Dark Reader is a pretty good extension itself. So what I do is use Dark Reader for most websites, and I just use my  DarkModeStanImage for Google Sheets.


Also, I know that I am just some random guy on the internets who wants you to click my sketchy link and download my sketchy files, so just go ahead and only do what you can trust. I understand.