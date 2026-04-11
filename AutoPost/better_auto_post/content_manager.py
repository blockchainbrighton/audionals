import os
import datetime

class ContentManager:
    def __init__(self, filepath, history_filepath="history.txt"):
        self.filepath = filepath
        self.history_filepath = history_filepath

    def get_count(self):
        """Returns the number of tweets waiting in the queue."""
        if not os.path.exists(self.filepath):
            return 0
        with open(self.filepath, 'r', encoding='utf-8') as f:
            lines = [line.strip() for line in f if line.strip()]
        return len(lines)

    def get_next_tweet(self):
        """Reads the first line from the file as the next tweet."""
        if not os.path.exists(self.filepath):
            return None
        
        with open(self.filepath, 'r', encoding='utf-8') as f:
            lines = f.readlines()
            
        # Filter out empty lines
        lines = [line.strip() for line in lines if line.strip()]
        
        if not lines:
            return None
            
        return lines[0]

    def archive_tweet(self, tweet_text):
        """Moves the tweet from the source file to the history file with a timestamp."""
        # 1. Append to History
        timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        try:
            with open(self.history_filepath, 'a', encoding='utf-8') as f:
                f.write(f"[{timestamp}] {tweet_text}\n")
            print(f"Archived tweet to {self.history_filepath}")
        except Exception as e:
            print(f"Error archiving tweet: {e}")

        # 2. Remove from Source
        if not os.path.exists(self.filepath):
            return

        with open(self.filepath, 'r', encoding='utf-8') as f:
            lines = f.readlines()

        with open(self.filepath, 'w', encoding='utf-8') as f:
            for line in lines:
                if line.strip() != tweet_text:
                    f.write(line)
        
        print(f"Removed posted tweet from queue.")
