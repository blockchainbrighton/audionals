# human_simulation.py

import time
import random
import logging
from selenium.webdriver.common.action_chains import ActionChains
from selenium.webdriver.remote.webdriver import WebDriver
from selenium.webdriver.remote.webelement import WebElement


def type_text(driver: WebDriver, element: WebElement, text: str):
    """
    Types text into a web element in a human-like manner with random delays between keystrokes.
    
    Args:
        driver (WebDriver): The Selenium WebDriver instance.
        element (WebElement): The web element to type into.
        text (str): The text to type.
    """
    try:
        actions = ActionChains(driver)
        for char in text:
            actions.send_keys(char)
            actions.perform()
            # Random delay between 0.1 to 0.3 seconds
            delay = random.uniform(0.1, 0.3)
            time.sleep(delay)
        logging.info("Finished typing the message.")
    except Exception as e:
        logging.error(f"Error during typing text: {e}")
        raise


def click_element(driver: WebDriver, element: WebElement):
    """
    Clicks on a web element with a slight random delay to simulate human behavior.
    
    Args:
        driver (WebDriver): The Selenium WebDriver instance.
        element (WebElement): The web element to click.
    """
    try:
        # Move to the element
        actions = ActionChains(driver)
        actions.move_to_element(element).perform()
        # Random delay before clicking
        delay = random.uniform(0.2, 0.5)
        time.sleep(delay)
        element.click()
        logging.info("Clicked the send button.")
    except Exception as e:
        logging.error(f"Error during clicking element: {e}")
        raise


def human_pause(min_seconds=1, max_seconds=3):
    """
    Introduces a random pause to simulate human thinking time.
    
    Args:
        min_seconds (int): Minimum number of seconds to pause.
        max_seconds (int): Maximum number of seconds to pause.
    """
    try:
        delay = random.uniform(min_seconds, max_seconds)
        logging.debug(f"Pausing for {delay:.2f} seconds to simulate human behavior.")
        time.sleep(delay)
    except Exception as e:
        logging.error(f"Error during human-like pause: {e}")
        raise