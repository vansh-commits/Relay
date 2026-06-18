from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    GEMINI_API_KEY: str            # used for embeddings (text-embedding-004)
    GROQ_API_KEY: str = ""         # used for text generation
    GROQ_MODEL: str = "llama-3.3-70b-versatile"
    DATABASE_URL: str = "postgresql+asyncpg://support_user:password@localhost:5432/support_db"
    CHROMA_HOST: str = "localhost"
    CHROMA_PORT: int = 8001
    CONFIDENCE_THRESHOLD: float = 0.4
    LOG_LEVEL: str = "INFO"
    FRONTEND_URL: str = "http://localhost:3000"


settings = Settings()
