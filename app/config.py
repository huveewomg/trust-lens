from pydantic_settings import BaseSettings
import json
import os
from google.oauth2 import service_account
from google.auth import default

class Settings(BaseSettings):
    project_id: str
    endpoint_id: str
    location: str
    
    # Individual service account components (more reliable)
    service_account_email: str = None
    service_account_private_key: str = None
    service_account_private_key_id: str = None
    service_account_client_id: str = None
    
    # Fallback to full JSON (if the above don't work)
    google_credentials_json: str = None

    def get_credentials(self):
        scopes = ["https://www.googleapis.com/auth/cloud-platform"]
        
        # Try individual components first (more reliable)
        if all([self.service_account_email, self.service_account_private_key]):
            print("[DEBUG] Using individual service account components")
            try:
                creds_info = {
                    "type": "service_account",
                    "project_id": self.project_id,
                    "private_key_id": self.service_account_private_key_id or "dummy",
                    "private_key": self.service_account_private_key.replace('\\n', '\n'),
                    "client_email": self.service_account_email,
                    "client_id": self.service_account_client_id or "dummy",
                    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                    "token_uri": "https://oauth2.googleapis.com/token",
                    "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
                    "client_x509_cert_url": f"https://www.googleapis.com/robot/v1/metadata/x509/{self.service_account_email.replace('@', '%40')}",
                    "universe_domain": "googleapis.com"
                }
                return service_account.Credentials.from_service_account_info(creds_info, scopes=scopes)
            except Exception as e:
                print(f"[ERROR] Failed to create credentials from components: {e}")
        
        # Fallback to JSON string
        if self.google_credentials_json:
            print("[DEBUG] Trying environment variable JSON credentials")
            try:
                print(f"[DEBUG] Credentials JSON length: {len(self.google_credentials_json)}")
                print(f"[DEBUG] First 200 chars: {self.google_credentials_json[:200]}")
                print(f"[DEBUG] Last 50 chars: {self.google_credentials_json[-50:]}")
                
                creds_info = json.loads(self.google_credentials_json)
                return service_account.Credentials.from_service_account_info(creds_info, scopes=scopes)
            except json.JSONDecodeError as e:
                print(f"[ERROR] Failed to parse credentials JSON: {e}")
                print(f"[ERROR] JSON string around error position: {self.google_credentials_json[max(0, e.pos-50):e.pos+50]}")
        
        # Final fallback to default credentials
        print("[DEBUG] Using default credentials")
        creds, _ = default(scopes=scopes)
        return creds

    class Config:
        env_file = ".env"
        case_sensitive = False

settings = Settings()