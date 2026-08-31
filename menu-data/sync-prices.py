#!/usr/bin/env python3
"""Write the prices in menu-prices.json into the menu pages.

    python menu-data/sync-prices.py            apply the prices
    python menu-data/sync-prices.py --check    report what would change, write nothing

menu-prices.json is the source of truth. Edit prices there, run this, then deploy.
Do not hand-edit a price in the HTML: the next run of this script overwrites it.

The script finds each price by the Elementor widget id recorded in "locations",
so it never has to guess from surrounding text. A dish that appears on more than
one page has several locations and is kept identical across all of them.
"""
import io
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, 'menu-data', 'menu-prices.json')

# A price sits in a heading widget: data-id -> widget-container -> heading -> "£12.34"
PRICE_RE = (
    r'(data-id="%s"[^>]*data-widget_type="heading\.default">\s*'
    r'<div class="elementor-widget-container">\s*'
    r'<(h[1-6])\s+class="elementor-heading-title[^"]*">)\s*'
    r'£\s?[0-9]+(?:[.,][0-9]{1,2})?\s*'
    r'(</\2>)'
)
ANY_PRICE = re.compile(
    r'data-id="([0-9a-f]+)"[^>]*data-widget_type="heading\.default">\s*'
    r'<div class="elementor-widget-container">\s*'
    r'<(h[1-6])\s+class="elementor-heading-title[^"]*">\s*'
    r'(£\s?[0-9]+(?:[.,][0-9]{1,2})?)\s*</\2>', re.S)


def money(v):
    return '£%.2f' % round(float(v) + 1e-9, 2)


def main():
    check = '--check' in sys.argv
    doc = json.load(io.open(DATA, encoding='utf-8'))

    wanted = {}          # page -> {widget: (price, item name)}
    for section in doc['sections']:
        for item in section['items']:
            for loc in item['locations']:
                wanted.setdefault(loc['page'], {})[loc['widget']] = (item['price'], item['name'])

    changed = missing = 0
    for page in sorted(wanted):
        path = os.path.join(ROOT, page.replace('/', os.sep))
        if not os.path.exists(path):
            print('  !! missing page %s' % page)
            missing += 1
            continue
        src = io.open(path, encoding='utf-8', newline='').read()
        out = src
        edits = []
        for widget, (price, name) in wanted[page].items():
            pat = re.compile(PRICE_RE % widget, re.S)
            m = pat.search(out)
            if not m:
                print('  !! %s: no price widget %s (%s)' % (page, widget, name))
                missing += 1
                continue
            old = re.search(r'£\s?[0-9]+(?:[.,][0-9]{1,2})?', m.group(0)).group(0)
            new = money(price)
            if old == new:
                continue
            out = out[:m.start()] + m.group(1) + new + m.group(3) + out[m.end():]
            edits.append((name, old, new))

        # every price on the page should be accounted for in menu-prices.json
        known = set(wanted[page])
        strays = [(w, p) for w, _h, p in ANY_PRICE.findall(out) if w not in known]

        if edits or strays:
            print('%s' % page)
            for name, old, new in sorted(edits):
                print('   %-46s %8s -> %s' % (name[:46], old, new))
            for w, p in strays:
                print('   ?? %s not in menu-prices.json (widget %s)' % (p, w))
        changed += len(edits)
        if edits and not check:
            io.open(path, 'w', encoding='utf-8', newline='').write(out)

    verb = 'would change' if check else 'changed'
    print('\n%d price(s) %s.' % (changed, verb))
    if missing:
        print('%d location(s) could not be found - menu-prices.json is out of date '
              'with the HTML.' % missing)
        return 1
    if check and changed:
        return 1
    return 0


if __name__ == '__main__':
    sys.exit(main())
