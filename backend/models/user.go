package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// User represents a user in the system
type User struct {
	ID                primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	Email             string             `bson:"email" json:"email"`
	PasswordHash      string             `bson:"password_hash" json:"-"`
	FullName          string             `bson:"full_name" json:"full_name"`
	AvatarURL         string             `bson:"avatar_url" json:"avatar_url"`
	Role              string             `bson:"role" json:"role"`
	OrganizationalUnit string            `bson:"organizational_unit" json:"organizational_unit"`
	CreatedAt         time.Time          `bson:"created_at" json:"created_at"`
	UpdatedAt         time.Time          `bson:"updated_at" json:"updated_at"`
}

// UserResponse is the user data returned to clients (without sensitive information)
type UserResponse struct {
	ID                string    `json:"id"`
	Email             string    `json:"email"`
	FullName          string    `json:"full_name"`
	AvatarURL         string    `json:"avatar_url"`
	Role              string    `json:"role"`
	OrganizationalUnit string   `json:"organizational_unit"`
	CreatedAt         time.Time `json:"created_at"`
	UpdatedAt         time.Time `json:"updated_at"`
}

// ToResponse converts a User to a UserResponse
func (u *User) ToResponse() UserResponse {
	return UserResponse{
		ID:                u.ID.Hex(),
		Email:             u.Email,
		FullName:          u.FullName,
		AvatarURL:         u.AvatarURL,
		Role:              u.Role,
		OrganizationalUnit: u.OrganizationalUnit,
		CreatedAt:         u.CreatedAt,
		UpdatedAt:         u.UpdatedAt,
	}
}
