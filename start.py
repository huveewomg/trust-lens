#!/usr/bin/env python3
import os
import subprocess
import sys

# Get the port from environment variable, default to 8000 if not set
port = os.environ.get('PORT', '8000')

# Run uvicorn with the dynamic port
cmd = ['uvicorn', 'main:app', '--host', '0.0.0.0', '--port', port]
subprocess.run(cmd)