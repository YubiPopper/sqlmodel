# sqlmodel signaling server

A minimal y-webrtc signaling server (~100 lines) for sqlmodel.org real-time collaboration.

## Deploy free on Render.com

1. Push this whole repo to GitHub (the `signaling-server/` folder is included).
2. Go to [render.com](https://render.com) → **New → Web Service**.
3. Connect your GitHub repo.
4. Set the following:

| Setting | Value |
|---------|-------|
| **Root Directory** | `signaling-server` |
| **Runtime** | Node |
| **Build Command** | `npm install` |
| **Start Command** | `npm start` |
| **Instance Type** | Free |

5. Click **Create Web Service**. Render gives you a URL like `https://sqlmodel-signaling.onrender.com`.

6. In your main app, set the environment variable:

```
VITE_SIGNALING_URL=wss://sqlmodel-signaling.onrender.com
```

That's it. The signaling server handles WebRTC peer discovery; all diagram data goes directly peer-to-peer and never touches this server.

## Run locally

```bash
cd signaling-server
npm install
npm start
# listening on port 4444
```

Then set `VITE_SIGNALING_URL=ws://localhost:4444` in your `.env.local`.
