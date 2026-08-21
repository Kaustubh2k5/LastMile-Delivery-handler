# Local Setup Guide

Welcome to the LastMile Delivery application! Follow these steps to get the project up and running locally, either via traditional Node.js/NPM or using Docker.

## Prerequisites
- **Node.js**: v20 or later
- **NPM**: v10 or later
- **Docker**: (Optional) if you prefer running it containerized

---

## Method 1: Running Directly (Node.js & NPM)

### 1. Install Dependencies
Navigate to the project root and install all required Node modules.
```bash
npm install
```

### 2. Configure Environment Variables
Copy the example environment file to create your own local configuration.
```bash
cp .env.example .env
```
Open `.env` and fill in any required variables. Note that `DATABASE_URL` is configured to use a local SQLite database (`dev.db`) by default.
Ensure your Gmail App Password credentials are set if you wish to use the email notification system:
```env
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
```

### 3. Setup the Database
Push the Prisma schema to the SQLite database and seed any initial data (if applicable).
```bash
npx prisma db push
```

### 4. Start the Application
You can run the application in Development Mode or Production Mode.

**Development Mode (Hot-Reloading):**
```bash
npm run dev
```

**Production Mode:**
```bash
npm run build
npm start
```
The application will be accessible at [http://localhost:3000](http://localhost:3000).

---

## Method 2: Running with Docker

We have configured a multi-stage Dockerfile that builds the application securely and with an optimized file size using Next.js standalone mode.

### 1. Build the Docker Image
```bash
docker build -t last-mile-delivery:latest .
```

### 2. Run the Docker Container
You must pass your environment variables (like the SQLite database path and SMTP credentials) to the container. Since the SQLite database is local, it's recommended to mount a volume so your data persists across container restarts.

```bash
# Create a local file for the database if it doesn't exist
touch dev.db

# Run the container
docker run -p 3000:3000 \
  --env-file .env \
  -v $(pwd)/dev.db:/app/dev.db \
  last-mile-delivery:latest
```

The application will be accessible at [http://localhost:3000](http://localhost:3000).

> [!NOTE]
> If you encounter issues where the Prisma client cannot connect, ensure that `DATABASE_URL="file:./dev.db"` matches the mount location in your Docker container.
