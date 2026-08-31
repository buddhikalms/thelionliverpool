# Deploying the static site

Target: `root@148.251.166.216`, served from `/var/www/thelionliverpool-website`.
The `online.thelionliverpool.co.uk` Next.js app already runs on this box — do not
disturb its vhost.

## 0. If any menu price changed

Prices live in `menu-data/menu-prices.json`, not in the HTML. Edit that file,
then write the prices into the pages before uploading:

    python menu-data/sync-prices.py

See `menu-data/README.md`. Skipping this means the JSON and the pages disagree.

## 1. Upload (DNS still pointing at the old WordPress server)

    rsync -avz --delete \
      --exclude '.git' --exclude 'deploy' --exclude 'menu-data' \
      ./ root@148.251.166.216:/var/www/thelionliverpool-website/

## 2. Install the vhost

    scp deploy/thelionliverpool.co.uk.conf \
        root@148.251.166.216:/etc/nginx/sites-available/thelionliverpool.co.uk
    ssh root@148.251.166.216 \
      'ln -sf ../sites-available/thelionliverpool.co.uk /etc/nginx/sites-enabled/ \
       && nginx -t && systemctl reload nginx'

`nginx -t` must pass before reloading.

## 3. Verify before touching DNS

The Host header makes nginx pick the vhost without any DNS change:

    curl -I -H "Host: www.thelionliverpool.co.uk" http://148.251.166.216/
    curl -I -H "Host: www.thelionliverpool.co.uk" http://148.251.166.216/menu/
    curl -I -H "Host: www.thelionliverpool.co.uk" http://148.251.166.216/menus/
    curl -I -H "Host: www.thelionliverpool.co.uk" http://148.251.166.216/product/bacardi/

Expect: 200, 200, 301 -> /menu/, 301 -> /drinks-menu/.

Confirm the ordering app still answers:

    curl -I https://online.thelionliverpool.co.uk/

## 4. Point DNS

Change the A record for `thelionliverpool.co.uk` and `www` to `148.251.166.216`.
Lower the TTL a day beforehand if you want a fast rollback.

## 5. TLS

Only after DNS resolves to this box:

    certbot --nginx -d thelionliverpool.co.uk -d www.thelionliverpool.co.uk

Certbot adds the 443 block and the http->https redirect.

## 6. Afterwards

- Submit `https://www.thelionliverpool.co.uk/sitemap.xml` in Google Search Console.
- Watch the Search Console coverage report for unexpected 404s.
- Only decommission the WordPress server once the site is confirmed serving.
