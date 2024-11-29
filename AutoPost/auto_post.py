import pyautogui
import time

def tweet(text, paste_mode=False):
    # Short delay to allow you to focus the browser window after running the script
    time.sleep(5)  # Gives you time to click on the Twitter text box

    if paste_mode:
        # Copy the text to the clipboard
        pyautogui.hotkey('ctrl', 'c')  # Ensure the text is in your clipboard if using paste_mode
        # Paste the text
        pyautogui.hotkey('ctrl', 'v')
    else:
        # Type the tweet text, character by character
        pyautogui.write(text, interval=0.05)

    # Short delay before sending
    time.sleep(1)

    # Press 'Tab' several times to reach the "Tweet" button, then press Enter
    for _ in range(3):  # Adjust number of tabs if needed
        pyautogui.press('tab')
    pyautogui.press('enter')  # Hit Enter to send the tweet

# Usage
tweet("...", paste_mode=False)