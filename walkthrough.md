# Tetris Game — Application Walkthrough

## What Was Created

A fully playable **Tetris game** packaged for containerized deployment on **AWS ECS**. All files live under `app/` in the project root.

### File Structure

```
app/
├── index.html       # Game page with canvas elements
├── css/
│   └── style.css    # Dark neon theme with glassmorphism panels
├── js/
│   └── tetris.js    # Complete game engine
├── nginx.conf       # Nginx server config with /health endpoint
├── Dockerfile       # Multi-stage Nginx Alpine container
└── .dockerignore    # Exclude unnecessary files from image
```

## Game Features

| Feature               | Details                                      |
| --------------------- | -------------------------------------------- |
| **Rotation**          | SRS-style with wall kicks                    |
| **Ghost piece**       | Semi-transparent preview of landing position |
| **Hold piece**        | Press `C` to hold/swap                       |
| **Next queue**        | Shows next 3 pieces                          |
| **Scoring**           | 100/300/500/800 pts for 1–4 lines × level    |
| **Level progression** | Every 10 lines cleared                       |
| **Lock delay**        | 500ms grace period before piece locks        |
| **Hard drop**         | `Space` for instant drop (2 pts/cell)        |
| **Pause**             | `P` to toggle pause                          |

## Deployment Ready

The **Dockerfile** uses `nginx:1.27-alpine` (~7MB image) and includes:

- `/health` endpoint for ECS health checks / ALB target group
- Security headers (X-Frame-Options, X-Content-Type-Options, XSS protection)
- Static asset caching (7 days for CSS/JS)
- Built-in `HEALTHCHECK` instruction

### Build & Run Locally

```bash
cd app
docker build -t tetris .
docker run -p 80:80 tetris
# Open http://localhost
```

## Controls

| Key     | Action    |
| ------- | --------- |
| `← →`   | Move      |
| `↑`     | Rotate    |
| `↓`     | Soft Drop |
| `Space` | Hard Drop |
| `C`     | Hold      |
| `P`     | Pause     |
| `Enter` | Start     |
