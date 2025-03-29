package websocket

import (
	"encoding/json"
)

// Hub maintains the set of active clients and broadcasts messages to them
type Hub struct {
	// Registered clients
	clients map[*Client]bool

	// Inbound messages from the clients
	broadcast chan []byte

	// Register requests from the clients
	register chan *Client

	// Unregister requests from clients
	unregister chan *Client

	// Group-specific rooms
	rooms map[string]map[*Client]bool
}

// NewHub creates a new hub instance
func NewHub() *Hub {
	return &Hub{
		broadcast:  make(chan []byte),
		register:   make(chan *Client),
		unregister: make(chan *Client),
		clients:    make(map[*Client]bool),
		rooms:      make(map[string]map[*Client]bool),
	}
}

// Run starts the hub and handles client connections and messages
func (h *Hub) Run() {
	for {
		select {
		case client := <-h.register:
			h.clients[client] = true
			
			// Add client to room if specified
			if client.roomID != "" {
				if _, ok := h.rooms[client.roomID]; !ok {
					h.rooms[client.roomID] = make(map[*Client]bool)
				}
				h.rooms[client.roomID][client] = true
			}
			
		case client := <-h.unregister:
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				close(client.send)
				
				// Remove from room if in one
				if client.roomID != "" {
					if room, ok := h.rooms[client.roomID]; ok {
						delete(room, client)
						// Clean up empty rooms
						if len(room) == 0 {
							delete(h.rooms, client.roomID)
						}
					}
				}
			}
			
		case message := <-h.broadcast:
			// Broadcast to all clients
			for client := range h.clients {
				select {
				case client.send <- message:
				default:
					close(client.send)
					delete(h.clients, client)
					
					// Remove from room if in one
					if client.roomID != "" {
						if room, ok := h.rooms[client.roomID]; ok {
							delete(room, client)
							if len(room) == 0 {
								delete(h.rooms, client.roomID)
							}
						}
					}
				}
			}
		}
	}
}

// BroadcastToRoom sends a message to all clients in a specific room
func (h *Hub) BroadcastToRoom(roomID string, message []byte) {
	if room, ok := h.rooms[roomID]; ok {
		for client := range room {
			select {
			case client.send <- message:
			default:
				close(client.send)
				delete(h.clients, client)
				delete(room, client)
				if len(room) == 0 {
					delete(h.rooms, roomID)
				}
			}
		}
	}
}

// SendToGroup sends a JSON message to all clients in a specific group
func (h *Hub) SendToGroup(groupID string, data interface{}) {
	// Convert data to JSON
	jsonData, err := json.Marshal(data)
	if err != nil {
		return // Silently fail if JSON marshaling fails
	}
	
	// Use the existing BroadcastToRoom method
	h.BroadcastToRoom(groupID, jsonData)
}
