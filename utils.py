import re
import hmac
import json
from hashlib import sha256
from urllib.parse import parse_qsl

def get_direct_download_link(url):
    # Regular expression to match the file ID pattern in various Google Drive URLs

    pattern = r'(?:id=|\/d\/|download\?id=)([-\w]+)'

    match = re.search(pattern, url)
    if match:
        file_id = match.group(1)
        url = f"https://drive.usercontent.google.com/download?id={file_id}" # &confirm=t - doesn't help for large files??
        return url
    else:
        return url

def parse_init_data(token: str, raw_init_data: str):
    is_valid = validate_init_data(token, raw_init_data)
    if not is_valid:
        return False

    result = {}
    for key, value in parse_qsl(raw_init_data):
        try:
            value = json.loads(value)
        except json.JSONDecodeError:
            result[key] = value
        else:
            result[key] = value
    return result


def validate_init_data(token, raw_init_data):
    try:
        parsed_data = dict(parse_qsl(raw_init_data))
    except ValueError:
        return False
    if "hash" not in parsed_data:
        return False

    init_data_hash = parsed_data.pop('hash')
    data_check_string = "\n".join(f"{key}={value}" for key, value in sorted(parsed_data.items()))
    secret_key = hmac.new(key=b"WebAppData", msg=token.encode(), digestmod=sha256)

    return hmac.new(secret_key.digest(), data_check_string.encode(), sha256).hexdigest() == init_data_hash