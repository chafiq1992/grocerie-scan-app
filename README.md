# Grocery Scanner (Supabase + FastAPI + React)


Single container app: FastAPI backend + built React frontend served as static files.
Designed for **Cloud Run** with **Supabase (Postgres)** as database.


## Quick Start (Local)
1. **Create Supabase project** → Project Settings → Database → copy the *URI* (looks like `postgresql://...`).
2. Create a `.env` from `.env.sample` and fill `SUPABASE_DB_URL` (append `?sslmode=require` if not present).
3. Build & run:
```bash
docker build -t grocery-scanner .
docker run -p 8080:8080 --env-file .env grocery-scanner
```


## Continuous Deployment (GitHub → Cloud Run)

The repository contains a GitHub Actions workflow at `.github/workflows/cloud-run.yml` that automatically builds and deploys on every push to `main`.

### Prerequisites

1. **Google Cloud project** with Cloud Run & Artifact Registry enabled.
2. **Workload Identity Federation** set up between GitHub and your GCP project (follow [docs](https://github.com/google-github-actions/auth#setup)). You’ll obtain:
   * `GCP_WORKLOAD_IDENTITY_PROVIDER`
   * `GCP_SA_EMAIL`
3. **GitHub repository secrets**:
   * `GCP_PROJECT_ID` – your project ID
   * `GCP_REGION` – e.g. `us-central1`
   * `GCP_WORKLOAD_IDENTITY_PROVIDER` – provider name
   * `GCP_SA_EMAIL` – service-account email
   * `SUPABASE_DB_URL` – the Postgres URI

### First-time deploy

```bash
gcloud services enable run.googleapis.com artifactregistry.googleapis.com

# Create Artifact Registry repo (once):
gcloud artifacts repositories create grocery-scanner --repository-format=docker \
  --location=$GCP_REGION \
  --description="Docker repo"

# Create Cloud Run service (initial blank deploy):
gcloud run deploy grocery-scanner-preview \
  --region=$GCP_REGION \
  --image=us-docker.pkg.dev/cloudrun/container/hello \
  --port=8080 \
  --set-env-vars=SUPABASE_DB_URL=$SUPABASE_DB_URL
```

Subsequent commits to `main` will rebuild the container and update the service automatically.

## Local Development (Backend hot-reload)

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn backend.main:app --reload --port 8080
```

In another shell:

```bash
npm install
npm run dev
```

Navigate to `http://localhost:5173`.
