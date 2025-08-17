import os
import json
import uuid
from typing import Dict, Any
from dotenv import load_dotenv

load_dotenv()

def upload_case_local(case_obj: Dict[str, Any]) -> str:
    """
    Upload case data to local storage (simulating Walrus)
    Returns the public URL for the case file
    """
    # Ensure cases directory exists
    data_dir = os.path.join(os.path.dirname(__file__), "data")
    cases_dir = os.path.join(data_dir, "cases")
    os.makedirs(cases_dir, exist_ok=True)
    
    # Generate UUID for the case file
    case_uuid = str(uuid.uuid4())
    case_filename = f"{case_uuid}.json"
    case_path = os.path.join(cases_dir, case_filename)
    
    # Write case data to file
    with open(case_path, 'w') as f:
        json.dump(case_obj, f, indent=2, default=str)
    
    # Return public URL
    walrus_base = os.getenv("WALRUS_BASE", "http://localhost:8000/cases")
    return f"{walrus_base}/{case_filename}"

# TODO: Add static file serving helper for FastAPI
# Example: app.mount("/cases", StaticFiles(directory="app/data/cases"), name="cases")
# This will serve the JSON files at /cases/{uuid}.json endpoints