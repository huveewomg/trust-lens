from pydantic_settings import BaseSettings
import json
import os
from google.oauth2 import credentials
from google.auth import default

class Settings(BaseSettings):
    project_id: str
    endpoint_id: str
    location: str
    google_credentials_json: str = None

    def get_credentials(self):
        if self.google_credentials_json:
            # For Railway deployment
            creds_info = json.loads(self.google_credentials_json)
            return credentials.UserAccessTokenCredentials(
                token=None,
                refresh_token=creds_info.get("refresh_token"),
                id_token=None,
                client_id=creds_info.get("client_id"),
                client_secret=creds_info.get("client_secret")
            )
        else:
            # For local development or Cloud Run with default credentials
            creds, _ = default()
            return creds

    class Config:
        env_file = ".env"
        case_sensitive = False

settings = Settings()
