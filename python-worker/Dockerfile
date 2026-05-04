FROM python:3.12-slim

WORKDIR /app

# Install system dependencies for Playwright
RUN apt-get update && apt-get install -y --no-install-recommends \
    wget \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Install Playwright system deps first
RUN playwright install-deps chromium

# Create non-root user, install browsers as that user
RUN useradd -m -s /bin/bash worker && mkdir -p /app/data && chown -R worker:worker /app
USER worker

# Install Playwright browsers as worker user
RUN playwright install chromium

# Copy worker code
COPY worker.py .

CMD ["python", "worker.py"]
