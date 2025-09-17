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
        if self.google_credentials_json:
            # For Railway deployment with service account
            creds_info = json.loads(self.google_credentials_json)
            return service_account.Credentials.from_service_account_info(creds_info)
        else:
            # For local development with default credentials
            creds, _ = default()
            return creds

    class Config:
        env_file = ".env"
        case_sensitive = False

settings = Settings()