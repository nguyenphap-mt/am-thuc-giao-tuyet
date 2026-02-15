from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from uuid import UUID
from typing import Dict
import json
from backend.core.workflow.models import WorkflowExecution

router = APIRouter()

class ConnectionManager:
    def __init__(self):
        # Store active connections: workflow_id -> List[WebSocket]
        # Allowing multiple clients to watch the same workflow
        self.active_connections: Dict[UUID, list[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, workflow_id: UUID):
        await websocket.accept()
        if workflow_id not in self.active_connections:
            self.active_connections[workflow_id] = []
        self.active_connections[workflow_id].append(websocket)

    def disconnect(self, websocket: WebSocket, workflow_id: UUID):
        if workflow_id in self.active_connections:
            if websocket in self.active_connections[workflow_id]:
                self.active_connections[workflow_id].remove(websocket)
            if not self.active_connections[workflow_id]:
                del self.active_connections[workflow_id]

    async def broadcast(self, workflow_id: UUID, message: dict):
        if workflow_id in self.active_connections:
            for connection in self.active_connections[workflow_id]:
                await connection.send_json(message)

manager = ConnectionManager()

@router.websocket("/ws/workflow/{workflow_id}")
async def websocket_endpoint(websocket: WebSocket, workflow_id: UUID):
    await manager.connect(websocket, workflow_id)
    try:
        while True:
            # Keep connection open, verify ping/pong
            # In a real app we might handle incoming messages (e.g., user input/confirmation)
            data = await websocket.receive_text()
            # For now, just echo or log
            # await manager.broadcast(workflow_id, {"event": "client_message", "data": data})
            pass
    except WebSocketDisconnect:
        manager.disconnect(websocket, workflow_id)
