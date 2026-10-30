# IP Locator

Paste IP addresses or raw server logs. Every IPv4/IPv6 address is found, located (country, region, city, network, time zone, map link) and grouped so you can pick a country, then a city, to narrow the list. Private and local addresses are recognised without a lookup.

Locations come from the free [ipwho.is](https://ipwho.is) API and are cached in memory for 24 hours.

## Access

The whole app sits behind one shared password.

| Variable       | Required    | Purpose                                                   |
| -------------- | ----------- | --------------------------------------------------------- |
| `APP_PASSWORD` | Yes         | The sign-in password. Until it is set, nobody can get in. |
| `AUTH_SECRET`  | Recommended | Signs the login cookie (`openssl rand -base64 48`).       |

Changing either value signs everyone out. Sessions last 7 days; 10 wrong passwords from one address lock it out for 15 minutes.

## Develop

```bash
npm install
cp .env.example .env.local   # set APP_PASSWORD
npm run dev                  # http://localhost:3000
```

`npm run check` runs lint, type checks and tests.

## Deploy (Hostinger)

Node.js web app, Next.js preset, build script `build`, output `.next`, Node 22. Set `APP_PASSWORD` and `AUTH_SECRET` as environment variables, then redeploy. Pushes to `main` deploy automatically. The server needs outbound HTTPS to `ipwho.is`.
