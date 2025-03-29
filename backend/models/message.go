package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// Message represents a chat message in the system
type Message struct {
	ID        primitive.ObjectID   `bson:"_id,omitempty" json:"id"`
	Content   string               `bson:"content" json:"content"`
	GroupID   primitive.ObjectID   `bson:"group_id" json:"group_id"`
	SenderID  primitive.ObjectID   `bson:"sender_id" json:"sender_id"`
	Type      string               `bson:"type" json:"type"` // regular, announcement
	Title     string               `bson:"title" json:"title"` // Used for announcements
	CreatedAt time.Time            `bson:"created_at" json:"created_at"`
	UpdatedAt time.Time            `bson:"updated_at" json:"updated_at"`
	ReadBy    []primitive.ObjectID `bson:"read_by" json:"read_by"` // Array of user IDs who have read the message
}

// MessageResponse is the message data returned to clients
type MessageResponse struct {
	ID        string       `json:"id"`
	Content   string       `json:"content"`
	GroupID   string       `json:"group_id"`
	SenderID  string       `json:"sender_id"`
	Type      string       `json:"type"`
	Title     string       `json:"title,omitempty"`
	CreatedAt time.Time    `json:"created_at"`
	UpdatedAt time.Time    `json:"updated_at"`
	ReadBy    []string     `json:"read_by"`
	Sender    *UserResponse `json:"sender,omitempty"`
}

// ToResponse converts a Message to a MessageResponse
func (m *Message) ToResponse() MessageResponse {
	readByStrings := make([]string, len(m.ReadBy))
	for i, id := range m.ReadBy {
		readByStrings[i] = id.Hex()
	}
	
	return MessageResponse{
		ID:        m.ID.Hex(),
		Content:   m.Content,
		GroupID:   m.GroupID.Hex(),
		SenderID:  m.SenderID.Hex(),
		Type:      m.Type,
		Title:     m.Title,
		CreatedAt: m.CreatedAt,
		UpdatedAt: m.UpdatedAt,
		ReadBy:    readByStrings,
	}
}

// MessageRequest represents the data needed to create a new message
type MessageRequest struct {
	Content string `json:"content" validate:"required"`
	GroupID string `json:"group_id" validate:"required"`
	Type    string `json:"type"`
	Title   string `json:"title"`
}

// ChatMessage is an alias for Message to maintain compatibility
type ChatMessage = Message

// ChatMessageResponse is an alias for MessageResponse to maintain compatibility
type ChatMessageResponse = MessageResponse
