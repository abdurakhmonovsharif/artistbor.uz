# Deploy Next.js with PM2 and Nginx

This project uses Next.js as a Node.js server on `127.0.0.1:3000` and exposes it through Nginx.

## Server prerequisites

Use Node.js 20+ for this project.

```bash
sudo apt update
sudo apt install -y nginx git
npm install -g pm2
```

If Node.js is not installed yet, install a current LTS release before running `npm ci`.

## Build and run

From the project directory on the server:

```bash
cp .env.example .env
npm ci
npm run build
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

After running `pm2 startup`, execute the command that PM2 prints. It registers PM2 for restart after server reboot.

Check the app:

```bash
pm2 status
pm2 logs artistbor-web
curl -I http://127.0.0.1:3000
```

## Nginx

Install the included config:

```bash
sudo cp deploy/nginx/artistbor.uz.conf /etc/nginx/sites-available/artistbor.uz
sudo ln -s /etc/nginx/sites-available/artistbor.uz /etc/nginx/sites-enabled/artistbor.uz
sudo nginx -t
sudo systemctl reload nginx
```

If the default Nginx site conflicts with this domain, remove it:

```bash
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

## SSL

After DNS points to the server:

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d artistbor.uz -d www.artistbor.uz
```

## Updates

For each deploy:

```bash
git pull
npm ci
npm run build
pm2 reload artistbor-web
```

## Notes

- Keep `.env` on the server only. Do not commit it.
- `NEXT_PUBLIC_*` values are bundled during `npm run build`, so rebuild after changing them.
- The Next process is bound to `127.0.0.1`, so port `3000` is not exposed directly to the internet.
