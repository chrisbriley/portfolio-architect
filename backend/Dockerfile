# Use an official Python slim image
FROM python:3.11-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV FLASK_APP=app.py
ENV FLASK_RUN_HOST=0.0.0.0
ENV FLASK_RUN_PORT=5001

# Set work directory
WORKDIR /app

# Install system dependencies for scientific libraries
RUN apt-get update && apt-get install -y --no-install-recommends 
    build-essential 
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy project
COPY . .

# Expose the port Flask runs on
EXPOSE 5001

# Run the application
CMD ["python", "app.py"]
