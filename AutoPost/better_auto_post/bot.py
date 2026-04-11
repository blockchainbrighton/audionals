import time
import os
from playwright.sync_api import sync_playwright, TimeoutError
from config import Config

class TwitterBot:
    def __init__(self):
        self.browser = None
        self.context = None
        self.page = None
        self.playwright = None

    def start(self):
        """Starts the browser session using the REAL Chrome Profile."""
        self.playwright = sync_playwright().start()
        
        # Path to your REAL Chrome Profile
        # IMPORTANT: You must QUIT Chrome (Cmd+Q) before running this script!
        user_data_dir = "/Users/melophonic/Library/Application Support/Google/Chrome"
        
        print(f"Launching Chrome with profile from: {user_data_dir}")
        print("⚠️  If this fails, please ensure you have fully quit Google Chrome first!")

        try:
            # We use launch_persistent_context instead of launch() to attach to the real profile
            self.context = self.playwright.chromium.launch_persistent_context(
                user_data_dir,
                channel="chrome", # Use the actual Chrome browser installed on the system
                headless=False,
                args=["--disable-blink-features=AutomationControlled"] # Stealth mode
            )
            
            self.page = self.context.pages[0] # Get the first open tab
        except Exception as e:
            print(f"\nCRITICAL ERROR: Could not open Chrome Profile.\n{e}")
            print("\n>>> DID YOU QUIT CHROME? (Cmd+Q) <<<")
            raise e

    def stop(self):
        """Closes the browser session."""
        if self.context:
            self.context.close()
        if self.playwright:
            self.playwright.stop()

    def save_session(self):
        """Not needed when using real profile, but kept for compatibility."""
        pass

    def login(self):
        """Handles the login flow."""
        print("Navigating to login page...")
        try:
            self.page.goto("https://twitter.com/login")
            self.page.wait_for_load_state("networkidle")

            # Check if we are already logged in
            if "home" in self.page.url:
                print("Already logged in.")
                return True
        except Exception:
            pass

        print("--- MANUAL LOGIN REQUIRED ---")
        print("Please log in to Twitter in the browser window.")
        print("Navigate to the Home page (https://twitter.com/home).")
        input("Press Enter here when you are logged in and ready...")
        
        # Verify we are actually logged in
        try:
            if "home" in self.page.url or "compose" in self.page.url:
                print("Login verified!")
                self.save_session()
                return True
            else:
                print("It doesn't look like you are on the home page yet.")
                # Give one more chance
                self.page.wait_for_url("**/home", timeout=5000)
                self.save_session()
                return True
        except:
            print("Could not verify login. Proceeding anyway (risky)...")
            return True

    def post_tweet(self, text):
        """Posts a tweet."""
        print(f"Attempting to post: {text}")
        
        # Ensure we are on home or compose
        if "compose" not in self.page.url:
            self.page.goto("https://twitter.com/compose/tweet")
        
        try:
            # Wait for the editor
            # The editor is usually a div with public-DraftEditor-content
            editor = self.page.get_by_role("textbox", name="Post text")
            editor.click()
            editor.fill(text)
            
            # Click Post
            post_btn = self.page.get_by_test_id("tweetButton")
            
            # Check if button is disabled (empty text or error)
            if post_btn.is_disabled():
                print("Post button is disabled. Something is wrong.")
                return False
                
            post_btn.click()
            
            # Wait for the toast or for the modal to disappear
            # Usually the compose modal closes on success
            print("Post button clicked. Waiting for confirmation...")
            self.page.wait_for_selector("[data-testid='toast']", timeout=10000) # "Your post was sent" toast
            print("Tweet posted successfully!")
            return True
            
        except Exception as e:
            print(f"Error posting tweet: {e}")
            return False
