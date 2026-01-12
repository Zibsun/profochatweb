from course import Course
from elements.element import _parse_interval

import yaml
import logging
import db
import os
from apscheduler.triggers.interval import IntervalTrigger
from datetime import timedelta

CONFIG_FILE = os.environ.get('CONFIG_FILE', 'config.yaml')
with open(CONFIG_FILE, 'r') as file:
    config = yaml.safe_load(file)
    settings = config.get('settings')
    ban = config.get('ban_settings')

def init_waiting(scheduler):
    """Initialize waiting elements scheduler (for web, without bot parameter)"""
    logging.info("Main settings from %s: %s", CONFIG_FILE, settings)
    if settings and settings.get('check_interval'):
        check_interval = settings['check_interval']
        trigger = to_interval_trigger(check_interval, 60)
        scheduler.add_job(send_waiting_elements, trigger=trigger)
        # logging.info("Waiting elements will be checked each %s", check_interval)

def init_banning(scheduler):
    check_interval = '10m'
    if ban and ban.get('check_interval'):
        check_interval = ban['check_interval']
    trigger = to_interval_trigger(check_interval, 10)

    scheduler.add_job(ban_users, trigger=trigger, args=[])
    logging.info("Users activity will be checked for banning each %s", check_interval)

def to_interval_trigger(check_interval, default_minutes):
    try:
        td = _parse_interval(check_interval)
    except Exception:
        td = timedelta(minutes=default_minutes)

    if td.days:
        return IntervalTrigger(days=td.days)
    else: # decompose into hours/minutes/seconds
        seconds = td.seconds  # remainder under 1 day
        if seconds % 3600 == 0:
            return IntervalTrigger(hours=seconds // 3600)
        if seconds % 60 == 0:
            return IntervalTrigger(minutes=seconds // 60)
        return IntervalTrigger(seconds=seconds)
    # Mixed units (days + seconds) are not allowed

# Define your async task for APScheduler
async def send_waiting_elements():
    """Process waiting elements (for web, without bot parameter)"""
    waiting_elements = db.get_active_waiting_elements()
    if len(waiting_elements) > 0:
        logging.info(f"waiting_elements={waiting_elements}")

    for id, chat_id, element_id, course_id in waiting_elements:
        # For web version, waiting elements are handled by the API
        # This function is kept for compatibility but doesn't send messages
        logging.info(f"Waiting element ready: chat_id={chat_id}, element_id={element_id}, course_id={course_id}")
        db.set_is_waiting_false(id)

def ban_users():
    """
    Feature description:
    - ban_users is triggered if courses contains ban_enabled = yes
    - It adds (BOT_NAME, chat_id) to bannedparticipants if the limit (from config) has been exceeded
    - Also, records could be MANUALLY added to bannedparticipants, or marked as excluded = 1
    - When a user writes to a dialog and ban_enabled = yes for this COURSE, it checks bannedparticipants
    - If banned, the user gets ban_text whhich can be different for different COURSES
    """
    if ban is None:
        logging.warning(f"Either add ban_settings to {CONFIG_FILE} or remove 'ban_enabled: yes' from all the courses")
    # logging.info("ban_users: %s %s %s", ban['ban_limit'], ban['ban_reason'], ban['exclude'])
    result = db.ban_users(ban['ban_limit'], ban['ban_reason'], ban['exclude'])
    # logging.info("ban_users: %s users banned", result)