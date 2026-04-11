import sys
import time
import random
import datetime
from config import Config
from bot import TwitterBot
from content_manager import ContentManager

def get_user_input(prompt, default=None):
    """Helper to get user input with a default value."""
    if default:
        user_input = input(f"{prompt} [{default}]: ").strip()
        return user_input if user_input else default
    else:
        return input(f"{prompt}: ").strip()

def parse_schedule_times(times_str):
    """Parses a string of times like '09:00, 14:30, 20:00' into a list of time objects."""
    times = []
    parts = times_str.split(',')
    for part in parts:
        try:
            t = datetime.datetime.strptime(part.strip(), "%H:%M").time()
            times.append(t)
        except ValueError:
            print(f"Warning: Could not parse time '{part.strip()}'. Format should be HH:MM (24-hour).")
    return sorted(times)

def wait_for_next_slot(target_times):
    """Waits until the next specified time in the list."""
    now = datetime.datetime.now()
    today_times = [datetime.datetime.combine(now.date(), t) for t in target_times]
    
    # Sort and find the first time that is in the future
    future_times = [t for t in today_times if t > now]
    
    if not future_times:
        # If no times left today, wrap to the first time tomorrow
        next_time = datetime.datetime.combine(now.date() + datetime.timedelta(days=1), target_times[0])
        print("No more scheduled times for today. Waiting for tomorrow...")
    else:
        next_time = future_times[0]
        
    wait_seconds = (next_time - now).total_seconds()
    
    print(f"Next scheduled post is at {next_time.strftime('%H:%M')}")
    print(f"Sleeping for {int(wait_seconds / 60)} minutes and {int(wait_seconds % 60)} seconds...")
    time.sleep(wait_seconds)

def main():
    print("\n==========================================")
    print("   Better Twitter Auto-Poster v2.0")
    print("==========================================\n")
    
    # 1. Initialize Content Manager
    content_mgr = ContentManager(Config.TWEETS_FILE)
    tweet_count = content_mgr.get_count()
    
    print(f"Stats:")
    print(f" - Source File: {Config.TWEETS_FILE}")
    print(f" - History File: history.txt")
    print(f" - Queued Tweets: {tweet_count}")
    print("------------------------------------------")

    if tweet_count == 0:
        print("No tweets found! Please add some to tweets.txt and restart.")
        sys.exit(0)

    # 2. Configuration Wizard
    print("\n--- Configuration ---")
    
    mode = get_user_input("Select Mode:\n 1) Interval (e.g., every 30 mins)\n 2) Specific Times (e.g., 09:00, 17:00)\n Enter 1 or 2", "1")
    
    schedule_config = {}
    
    if mode == "1":
        interval = int(get_user_input("Enter interval in minutes", "30"))
        jitter = int(get_user_input("Enter random jitter in minutes (0 for none)", "5"))
        schedule_config = {"type": "interval", "minutes": interval, "jitter": jitter}
        print(f"--> Will post every {interval} minutes (+/- {jitter} mins).")
        
    elif mode == "2":
        times_input = get_user_input("Enter times (24h format, comma separated, e.g., 09:00, 14:00, 18:30)", "09:00, 12:00, 18:00")
        target_times = parse_schedule_times(times_input)
        if not target_times:
            print("No valid times provided. Exiting.")
            sys.exit(1)
        schedule_config = {"type": "fixed", "times": target_times}
        print(f"--> Will post at: {[t.strftime('%H:%M') for t in target_times]}")

    confirm = get_user_input("\nStart Auto-Poster now? (y/n)", "y")
    if confirm.lower() != 'y':
        print("Aborted.")
        sys.exit(0)

    # 3. Initialize Bot
    print("\nInitializing Browser...")
    bot = TwitterBot()
    
    try:
        bot.start()
        
        # 4. Login
        if not bot.login():
            print("Login failed. Exiting.")
            return

        print("\n=== AUTO-POSTER RUNNING ===")
        print("Leave this window open. Press Ctrl+C to stop.\n")

        while True:
            # Check queue again
            next_tweet = content_mgr.get_next_tweet()
            
            if not next_tweet:
                print(">>> Queue empty! Task Completed.")
                break

            # Execute Post
            if bot.post_tweet(next_tweet):
                # Archive
                content_mgr.archive_tweet(next_tweet)
            else:
                print("Failed to post tweet. Will retry in next cycle.")
                time.sleep(60) # Wait a bit before retry/sleep logic
                continue
            
            # Check if we are done before waiting
            if content_mgr.get_count() == 0:
                print("All tweets posted! Exiting.")
                break

            # Wait Logic
            print("\n------------------------------------------")
            if schedule_config["type"] == "interval":
                base_minutes = schedule_config["minutes"]
                jitter_minutes = schedule_config["jitter"]
                
                # Calculate sleep time
                actual_minutes = base_minutes
                if jitter_minutes > 0:
                    actual_minutes += random.randint(-jitter_minutes, jitter_minutes)
                    actual_minutes = max(1, actual_minutes) # Minimum 1 minute
                
                print(f"Waiting {actual_minutes} minutes for next slot...")
                time.sleep(actual_minutes * 60)
                
            elif schedule_config["type"] == "fixed":
                wait_for_next_slot(schedule_config["times"])
            
    except KeyboardInterrupt:
        print("\nUser stopped the script.")
    except Exception as e:
        print(f"An unexpected error occurred: {e}")
    finally:
        bot.stop()
        print("=== Done ===")

if __name__ == "__main__":
    main()