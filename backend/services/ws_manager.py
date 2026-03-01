import logging
import json
from datetime import datetime

logger = logging.getLogger(__name__)

class ConnectionManager:
    def __init__(self):
        # site_id -> list of active WebSocket connections
        self.active_connections: dict[int, list] = {}

    async def connect(self, site_id: int, websocket):
        await websocket.accept()
        if site_id not in self.active_connections:
            self.active_connections[site_id] = []
        self.active_connections[site_id].append(websocket)
        logger.info(f"Owner connected to monitor site {site_id}")

    def disconnect(self, site_id: int, websocket):
        if site_id in self.active_connections:
            if websocket in self.active_connections[site_id]:
                self.active_connections[site_id].remove(websocket)
        logger.info(f"Owner disconnected from monitor site {site_id}")

    async def broadcast_to_site(self, site_id: int, message: dict):
        """
        Push message to all owners watching this site.
        """
        if site_id in self.active_connections:
            logger.info(f"Broadcasting live update to site {site_id} ({len(self.active_connections[site_id])} owners)")
            
            # Use list copy to avoid issues if disconnecting while iterating
            for connection in list(self.active_connections[site_id]):
                try:
                    await connection.send_json(message)
                except Exception as e:
                    logger.error(f"Error broadcasting to site {site_id}: {str(e)}")
                    # Clean up broken connection
                    self.disconnect(site_id, connection)

# Global instance
manager = ConnectionManager()
