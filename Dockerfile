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

# Copy application code and startup script
COPY ./app /app
COPY start.py /app/

# Set PYTHONPATH to current directory
ENV PYTHONPATH=/app

# Command to run the application using our Python startup script
CMD ["python", "start.py"]