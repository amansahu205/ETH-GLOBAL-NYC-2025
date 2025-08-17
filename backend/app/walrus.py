import os
import json
import uuid
import aiohttp
import asyncio
from typing import Dict, Any
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

class WalrusUploader:
    def __init__(self):
        self.publisher_url = "https://publisher.walrus-testnet.walrus.space"
        self.aggregator_url = "https://aggregator.walrus-testnet.walrus.space"
        self.epochs = 1  # Store for 1 epoch (about 24 hours)
        
        # Fallback to local storage if Walrus fails
        self.data_dir = os.path.join(os.path.dirname(__file__), "data")
        self.cases_dir = os.path.join(self.data_dir, "cases")
        os.makedirs(self.cases_dir, exist_ok=True)
    
    async def upload_case_to_walrus(self, case_obj: Dict[str, Any]) -> str:
        """
        Upload case data to Walrus Protocol with fallback to local storage
        Returns blob ID or local file URL
        """
        try:
            # Convert data to JSON bytes
            json_data = json.dumps(case_obj, indent=2, default=str)
            blob_data = json_data.encode('utf-8')
            
            print(f"Uploading to Walrus: {len(blob_data)} bytes")
            
            # Upload to Walrus using PUT request
            upload_url = f"{self.publisher_url}/v1/blobs?epochs={self.epochs}"
            
            timeout = aiohttp.ClientTimeout(total=10)  # 10 second timeout
            async with aiohttp.ClientSession(timeout=timeout) as session:
                async with session.put(upload_url, data=blob_data) as response:
                    if response.status == 200:
                        result = await response.json()
                        
                        # Extract blob ID from response
                        blob_id = None
                        if 'alreadyCertified' in result:
                            blob_id = result['alreadyCertified']['blobId']
                            print(f"Walrus: Blob already exists - ID: {blob_id}")
                        elif 'newlyCreated' in result:
                            blob_id = result['newlyCreated']['blobObject']['blobId']
                            print(f"Walrus: New blob created - ID: {blob_id}")
                        
                        if blob_id:
                            # Verify blob is accessible
                            if await self._verify_blob_availability(blob_id):
                                return self.get_blob_url(blob_id)
                        
                        # Fallback if blob ID not found
                        print("Walrus: Blob ID not found in response, falling back to local storage")
                        return self._upload_case_local(case_obj)
                    else:
                        error_text = await response.text()
                        print(f"Walrus upload failed: HTTP {response.status} - {error_text}")
                        return self._upload_case_local(case_obj)
                        
        except Exception as e:
            print(f"Walrus upload error: {str(e)}")
            print("Falling back to local storage")
            return self._upload_case_local(case_obj)
    
    async def _verify_blob_availability(self, blob_id: str) -> bool:
        """
        Verify that the blob is available for download
        """
        try:
            verify_url = f"{self.aggregator_url}/v1/blobs/{blob_id}"
            
            timeout = aiohttp.ClientTimeout(total=5)  # 5 second timeout for verification
            async with aiohttp.ClientSession(timeout=timeout) as session:
                async with session.head(verify_url) as response:
                    if response.status == 200:
                        print(f"Walrus: Blob {blob_id} is available")
                        return True
                    else:
                        print(f"Walrus: Blob {blob_id} verification failed: HTTP {response.status}")
                        return False
                        
        except Exception as e:
            print(f"Walrus verification error: {str(e)}")
            return False
    
    def get_blob_url(self, blob_id: str) -> str:
        """
        Get the URL to retrieve a blob from Walrus
        """
        return f"{self.aggregator_url}/v1/blobs/{blob_id}"
    
    def _upload_case_local(self, case_obj: Dict[str, Any]) -> str:
        """
        Fallback: Upload case data to local storage
        Returns the public URL for the case file
        """
        # Generate UUID for the case file
        case_uuid = str(uuid.uuid4())
        case_filename = f"{case_uuid}.json"
        case_path = os.path.join(self.cases_dir, case_filename)
        
        # Write case data to file
        with open(case_path, 'w') as f:
            json.dump(case_obj, f, indent=2, default=str)
        
        # Return public URL
        walrus_base = os.getenv("WALRUS_BASE", "http://localhost:8000/cases")
        print(f"Local storage: {walrus_base}/{case_filename}")
        return f"{walrus_base}/{case_filename}"

# Legacy function for backward compatibility
def upload_case_local(case_obj: Dict[str, Any]) -> str:
    """
    Legacy function - use WalrusUploader.upload_case_to_walrus() for production
    """
    uploader = WalrusUploader()
    return uploader._upload_case_local(case_obj)

# TODO: Add static file serving helper for FastAPI
# Example: app.mount("/cases", StaticFiles(directory="app/data/cases"), name="cases")
# This will serve the JSON files at /cases/{uuid}.json endpoints