package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// ChatGroup represents a chat group in the system
type ChatGroup struct {
	ID                 primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	Name               string             `bson:"name" json:"name"`
	Description        string             `bson:"description" json:"description"`
	GroupType          string             `bson:"group_type" json:"group_type"` // class, department, custom
	OrganizationalUnit string             `bson:"organizational_unit" json:"organizational_unit"`
	ChatType           string             `bson:"chat_type" json:"chat_type"` // group, individual
	AvatarURL          string             `bson:"avatar_url" json:"avatar_url"`
	CreatedAt          time.Time          `bson:"created_at" json:"created_at"`
	UpdatedAt          time.Time          `bson:"updated_at" json:"updated_at"`
	CreatedBy          string             `bson:"created_by" json:"created_by"`
	Members            []string           `bson:"members" json:"members"` // Array of user IDs
}

// GroupMember represents a user's membership in a chat group
type GroupMember struct {
	ID        primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	GroupID   primitive.ObjectID `bson:"group_id" json:"group_id"`
	UserID    primitive.ObjectID `bson:"user_id" json:"user_id"`
	Role      string             `bson:"role" json:"role"` // admin, moderator, member
	JoinedAt  time.Time          `bson:"joined_at" json:"joined_at"`
	CreatedAt time.Time          `bson:"created_at" json:"created_at"`
	UpdatedAt time.Time          `bson:"updated_at" json:"updated_at"`
}

// ChatGroupResponse is the group data returned to clients
type ChatGroupResponse struct {
	ID                 string    `json:"id"`
	Name               string    `json:"name"`
	Description        string    `json:"description"`
	GroupType          string    `json:"group_type"`
	OrganizationalUnit string    `json:"organizational_unit"`
	ChatType           string    `json:"chat_type"`
	AvatarURL          string    `json:"avatar_url"`
	CreatedAt          time.Time `json:"created_at"`
	UpdatedAt          time.Time `json:"updated_at"`
	CreatedBy          string    `json:"created_by"`
	Members            []string  `json:"members"`
	MemberCount        int       `json:"member_count"`
}

// GroupWithMembers represents a group with its members
type GroupWithMembers struct {
	ID                 string              `json:"id"`
	Name               string              `json:"name"`
	Description        string              `json:"description"`
	GroupType          string              `json:"group_type"`
	OrganizationalUnit string              `json:"organizational_unit"`
	ChatType           string              `json:"chat_type"`
	AvatarURL          string              `json:"avatar_url"`
	CreatedAt          time.Time           `json:"created_at"`
	UpdatedAt          time.Time           `json:"updated_at"`
	CreatedBy          string              `json:"created_by"`
	Members            []GroupMemberWithUser `json:"members"`
}

// GroupMemberWithUser represents a group member with user details
type GroupMemberWithUser struct {
	ID        string       `json:"id"`
	GroupID   string       `json:"group_id"`
	UserID    string       `json:"user_id"`
	Role      string       `json:"role"`
	User      UserResponse `json:"user"`
	JoinedAt  time.Time    `json:"joined_at"`
	CreatedAt time.Time    `json:"created_at"`
	UpdatedAt time.Time    `json:"updated_at"`
}

// ToResponse converts a ChatGroup to a ChatGroupResponse
func (g *ChatGroup) ToResponse(memberCount int) ChatGroupResponse {
	return ChatGroupResponse{
		ID:                 g.ID.Hex(),
		Name:               g.Name,
		Description:        g.Description,
		GroupType:          g.GroupType,
		OrganizationalUnit: g.OrganizationalUnit,
		ChatType:           g.ChatType,
		AvatarURL:          g.AvatarURL,
		CreatedAt:          g.CreatedAt,
		UpdatedAt:          g.UpdatedAt,
		CreatedBy:          g.CreatedBy,
		Members:            g.Members,
		MemberCount:        memberCount,
	}
}
