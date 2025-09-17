from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    project_id: str
    endpoint_id: str
    location: str

    class Config:
        env_file = ".env"
        case_sensitive = False

settings = Settings()
