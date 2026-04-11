import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class Config:
    TWITTER_USERNAME = os.getenv("TWITTER_USERNAME")
    TWITTER_PASSWORD = os.getenv("TWITTER_PASSWORD")
    TWITTER_PHONE = os.getenv("TWITTER_PHONE_NUMBER")  # Optional, for 2FA
    
    # File paths
    AUTH_FILE = "auth.json"
    TWEETS_FILE = "tweets.txt"
    
    # Settings
    HEADLESS = False  # Set to True for background running
    ACTION_DELAY = 1000  # ms (1 second) to mimic human speed slightly
    
    @staticmethod
    def validate():
        if not Config.TWITTER_USERNAME or not Config.TWITTER_PASSWORD:
            raise ValueError("Missing TWITTER_USERNAME or TWITTER_PASSWORD in .env file")
