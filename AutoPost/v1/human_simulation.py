# human_simulation.py
import time
import random

def human_pause(min_seconds=1, max_seconds=3):
    """
    Simulates a human-like pause by sleeping for a random duration between min_seconds and max_seconds.
    """
    pause_duration = random.uniform(min_seconds, max_seconds)
    time.sleep(pause_duration)