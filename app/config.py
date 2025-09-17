from pydantic_settings import BaseSettings
import json
import os
from google.oauth2 import service_account
from google.auth import default

class Settings(BaseSettings):
    project_id: str
    endpoint_id: str
    location: str
    google_credentials_json: str = None

    def get_credentials(self):
        # Define the required scopes for Vertex AI
        REQUIRED_SCOPES = [
            'https://www.googleapis.com/auth/cloud-platform',
            'https://www.googleapis.com/auth/cloud-platform.read-only'
        ]
        
        if self.google_credentials_json:
            try:
                # For Railway deployment with service account
                print(f"[DEBUG] Credentials JSON length: {len(self.google_credentials_json)}")
                print(f"[DEBUG] First 200 chars: {self.google_credentials_json[:200]}")
                print(f"[DEBUG] Last 50 chars: {self.google_credentials_json[-50:]}")
                
                creds_info = json.loads(self.google_credentials_json)
                credentials = service_account.Credentials.from_service_account_info(creds_info)
                # Add the required scopes
                return credentials.with_scopes(REQUIRED_SCOPES)
            except json.JSONDecodeError as e:
                print(f"[ERROR] Failed to parse credentials JSON: {e}")
                print(f"[ERROR] JSON string around error position: {self.google_credentials_json[max(0, e.pos-50):e.pos+50]}")
                # Try to load from file as backup
                try:
                    with open('/app/credentials.json', 'r') as f:
                        creds_info = json.load(f)
                    print("[FALLBACK] Using credentials.json file")
                    credentials = service_account.Credentials.from_service_account_info(creds_info)
                    # Add the required scopes
                    return credentials.with_scopes(REQUIRED_SCOPES)
                except Exception as file_error:
                    print(f"[ERROR] Failed to load credentials file: {file_error}")
                    # Final fallback to default credentials
                    print("[FALLBACK] Using default credentials")
                    creds, _ = default(scopes=REQUIRED_SCOPES)
                    return creds
        else:
            # For local development with default credentials
            creds, _ = default(scopes=REQUIRED_SCOPES)
            return creds

    class Config:
        env_file = ".env"
        case_sensitive = False

settings = Settings()