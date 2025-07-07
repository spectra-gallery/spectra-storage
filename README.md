# Spectra Storage Service

Spectra Storage is a Node.js micro-service responsible for handling uploads and media assets for the Spectra Gallery platform. It exposes an Express API used by the main application to upload files, perform image transformations and interact with IPFS. The service also contains FIDO2 helpers for hardware key authentication.

## Prerequisites

- Node.js 18 or newer
- npm
- A running MongoDB instance (used for session storage)

## Setup

```bash
# from the repository root
cd spectra-storage
npm install
```

Create a `.env` file to override defaults from `config/*.js` if desired:

```bash
PORT=6001
SESSION_SECRET="change-me"
RP_ID="localhost"
WEBAUTHN_ORIGIN="http://localhost:6001"
UPLOAD_MAX_SIZE=999999999
UPLOAD_HTML_MAX_SIZE=2097152
```

## Running

Start the service in development mode:

```bash
npm start
```

For production with PM2:

```bash
npm install -g pm2
pm2 start ecosystem.config.js
```

Stop the service with `Ctrl+C` or:

```bash
pm2 stop spectra-storage
```

## Environment Variables

The following variables can be supplied via `.env`:

| Variable | Purpose | Default |
|----------|---------|---------|
| `PORT` | Port for the HTTP server | `6001` |
| `SESSION_SECRET` | Secret used to encrypt stored keys | from `config/app.cypher.config.js` |
| `RP_ID` | Relying Party ID for WebAuthn | `localhost` |
| `WEBAUTHN_ORIGIN` | Allowed origin for WebAuthn requests | `http://localhost:6001` |
| `UPLOAD_MAX_SIZE` | Max upload size for images (bytes) | `999999999` |
| `UPLOAD_HTML_MAX_SIZE` | Max upload size for HTML files | `2097152` |

## Basic Usage

Once running, the service listens on `/` and exposes various endpoints under `/storage` and `/app/auth` for authentication and file operations. Uploaded files are stored in the `ressources/` folder relative to this directory. Example request to upload a user image:

```bash
curl -F "file=@myimage.png" http://localhost:6001/storage/upload/img
```

Refer to the route definitions in `routes/` for available endpoints.
