# Menu prices

`menu-prices.json` is the single source of truth for every price shown on the
menu pages. Change a price here, run one command, and it is written into every
page that shows that dish.

## Changing a price

1. Open `menu-prices.json` and edit the `price` value.
2. From the repository root, run:

       python menu-data/sync-prices.py

3. Deploy as usual (see `deploy/README.md`).

To see what would change without writing anything:

    python menu-data/sync-prices.py --check

## Why this exists

The same dish is rendered on more than one page. Sushi appears on both `/menu/`
and `/sushi-menu/`; five fried rice dishes also appear in the teaser block on the
homepage. Those copies had drifted: every sushi price on `/menu/` was between
£1 and £3.45 below the same dish on `/sushi-menu/`, and the homepage teaser was
about £1 below `/menu/`. A guest saw a different price depending on the page.

An item's `locations` list records every place its price is rendered, so one
edit updates all of them and they cannot drift apart again.

## Rules

- **Never hand-edit a price in the HTML.** The next `sync-prices.py` run
  overwrites it. Edit the JSON instead.
- **Do not change `widget` ids.** They anchor each price to its exact spot in
  the page. Change a price, a name, or nothing at all - but leave those alone.
- `name` is a human label for finding your way around the file. Editing it does
  not rename the dish on the site; that text lives in the HTML.

## What the script checks

`sync-prices.py` also reports two kinds of problem:

- `?? £x.xx not in menu-prices.json` - a price is rendered on a page that this
  file does not know about, so nothing keeps it in sync. Add it.
- `!! no price widget <id>` - a location points at markup that no longer exists,
  usually because a row was deleted from the page. Remove the stale location.

Both are currently clean: all 184 rendered prices across the four pages are
accounted for.

## Adding a dish

The script only updates prices; it does not create rows. To add a dish, add the
row to the page's HTML, then run `sync-prices.py --check`, which reports the new
price as `??` along with its widget id. Add an entry to `menu-prices.json` using
that id.

## Coverage

| Page | Priced rows |
|---|---|
| `menu/index.html` | 113 |
| `sushi-menu/index.html` | 30 |
| `drinks-menu/index.html` | 36 |
| `index.html` (homepage teaser) | 5 |

158 distinct dishes, 26 of which appear on more than one page.
