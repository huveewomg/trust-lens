FROM python:3.12-alpine

# Set the working directory in the container
WORKDIR /app

# Copy the requirements file into the container
COPY requirements.txt .

# Install any needed packages specified in requirements.txt
# Using a multi-stage build to keep the final image small and secure
RUN apk add --no-cache --virtual .build-deps gcc musl-dev && \
	pip install --no-cache-dir -r requirements.txt && \
	apk del .build-deps

# Copy application code into the container
COPY ./app /app/app

# Command to run the application
# Uvicorn needs to listen on host 0.0.0.0 to be accessible from outside the container
# Use shell form to allow environment variable expansion
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port $PORT"]