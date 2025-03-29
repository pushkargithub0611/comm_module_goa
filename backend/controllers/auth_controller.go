package controllers

import (
	"chatterbloom/backend/config"
	"chatterbloom/backend/constants"
	"chatterbloom/backend/db"
	"chatterbloom/backend/models"
	"context"
	"net/http"
	"time"

	"github.com/golang-jwt/jwt/v4"
	"github.com/labstack/echo/v4"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
	"golang.org/x/crypto/bcrypt"
)

// AuthController handles authentication related requests
type AuthController struct {
	DB     *mongo.Client
	Config *config.Config
}

// LoginRequest represents the login request body
type LoginRequest struct {
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required"`
}

// RegisterRequest represents the register request body
type RegisterRequest struct {
	Email             string `json:"email" validate:"required,email"`
	Password          string `json:"password" validate:"required,min=6"`
	FullName          string `json:"full_name" validate:"required"`
	Role              string `json:"role" validate:"required"`
	OrganizationalUnit string `json:"organizational_unit" validate:"required"`
}

// AuthResponse represents the response after successful authentication
type AuthResponse struct {
	Token string            `json:"token"`
	User  models.UserResponse `json:"user"`
}

// Login handles user login
func (ac *AuthController) Login(c echo.Context) error {
	var req LoginRequest
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid request body")
	}

	// Get user collection
	usersColl := db.GetCollection(ac.DB, ac.Config.DatabaseName, "users")

	// Find user by email
	var user models.User
	err := usersColl.FindOne(context.Background(), bson.M{"email": req.Email}).Decode(&user)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return echo.NewHTTPError(http.StatusUnauthorized, "Invalid credentials")
		}
		return echo.NewHTTPError(http.StatusInternalServerError, "Database error")
	}

	// Check password
	err = bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password))
	if err != nil {
		return echo.NewHTTPError(http.StatusUnauthorized, "Invalid credentials")
	}

	// Generate JWT token
	token, err := ac.generateToken(user.ID.Hex(), user.Role)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to generate token")
	}

	// Return token and user info
	return c.JSON(http.StatusOK, AuthResponse{
		Token: token,
		User:  user.ToResponse(),
	})
}

// Register handles user registration
func (ac *AuthController) Register(c echo.Context) error {
	var req RegisterRequest
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid request body")
	}

	// Validate role
	validRole := false
	switch req.Role {
	case constants.RoleAdmin, constants.RolePrincipal, constants.RoleTeacher,
		constants.RoleStudent, constants.RoleParent, constants.RoleStaff:
		validRole = true
	}

	if !validRole {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid role")
	}

	// Get user collection
	usersColl := db.GetCollection(ac.DB, ac.Config.DatabaseName, "users")

	// Check if email already exists
	count, err := usersColl.CountDocuments(context.Background(), bson.M{"email": req.Email})
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Database error")
	}
	if count > 0 {
		return echo.NewHTTPError(http.StatusConflict, "Email already exists")
	}

	// Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to hash password")
	}

	// Create new user
	now := time.Now()
	newUser := models.User{
		ID:                primitive.NewObjectID(),
		Email:             req.Email,
		PasswordHash:      string(hashedPassword),
		FullName:          req.FullName,
		Role:              req.Role,
		OrganizationalUnit: req.OrganizationalUnit,
		CreatedAt:         now,
		UpdatedAt:         now,
	}

	// Insert user into database
	_, err = usersColl.InsertOne(context.Background(), newUser)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to create user")
	}

	// Add user to default groups based on role and organizational unit
	groupsColl := db.GetCollection(ac.DB, ac.Config.DatabaseName, "groups")
	membersColl := db.GetCollection(ac.DB, ac.Config.DatabaseName, "group_members")

	// Add to role-based default groups
	if defaultGroups, ok := constants.DefaultGroupsByRole[req.Role]; ok {
		for _, groupName := range defaultGroups {
			// Check if group exists, if not create it
			var group models.ChatGroup
			err := groupsColl.FindOne(context.Background(), bson.M{"name": groupName}).Decode(&group)
			if err != nil {
				// Create the group
				group = models.ChatGroup{
					ID:          primitive.NewObjectID(),
					Name:        groupName,
					Description: "Default group for " + groupName,
					GroupType:   "system",
					ChatType:    "group",
					CreatedAt:   now,
					UpdatedAt:   now,
					CreatedBy:   "system",
				}
				_, err = groupsColl.InsertOne(context.Background(), group)
				if err != nil {
					// Log error but continue
					continue
				}
			}

			// Add user to group
			groupMember := models.GroupMember{
				ID:        primitive.NewObjectID(),
				GroupID:   group.ID,
				UserID:    newUser.ID,
				Role:      "member",
				JoinedAt:  now,
				CreatedAt: now,
				UpdatedAt: now,
			}
			_, err = membersColl.InsertOne(context.Background(), groupMember)
			// Log error but continue if there's an issue
		}
	}

	// Add to organizational unit group
	var orgUnitGroup models.ChatGroup
	err = groupsColl.FindOne(context.Background(), bson.M{"name": req.OrganizationalUnit}).Decode(&orgUnitGroup)
	if err != nil {
		// Create the group
		orgUnitGroup = models.ChatGroup{
			ID:                 primitive.NewObjectID(),
			Name:               req.OrganizationalUnit,
			Description:        "Group for " + req.OrganizationalUnit,
			GroupType:          "organizational_unit",
			OrganizationalUnit: req.OrganizationalUnit,
			ChatType:           "group",
			CreatedAt:          now,
			UpdatedAt:          now,
			CreatedBy:          "system",
		}
		_, err = groupsColl.InsertOne(context.Background(), orgUnitGroup)
		if err == nil {
			// Add user to group
			groupMember := models.GroupMember{
				ID:        primitive.NewObjectID(),
				GroupID:   orgUnitGroup.ID,
				UserID:    newUser.ID,
				Role:      "member",
				JoinedAt:  now,
				CreatedAt: now,
				UpdatedAt: now,
			}
			_, _ = membersColl.InsertOne(context.Background(), groupMember)
		}
	} else {
		// Add user to existing org unit group
		groupMember := models.GroupMember{
			ID:        primitive.NewObjectID(),
			GroupID:   orgUnitGroup.ID,
			UserID:    newUser.ID,
			Role:      "member",
			JoinedAt:  now,
			CreatedAt: now,
			UpdatedAt: now,
		}
		_, _ = membersColl.InsertOne(context.Background(), groupMember)
	}

	// Generate JWT token
	token, err := ac.generateToken(newUser.ID.Hex(), newUser.Role)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to generate token")
	}

	// Return token and user info
	return c.JSON(http.StatusCreated, AuthResponse{
		Token: token,
		User:  newUser.ToResponse(),
	})
}

// GetProfile returns the current user's profile
func (ac *AuthController) GetProfile(c echo.Context) error {
	// Get user ID from token
	userID := c.Get("user").(string)
	objID, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid user ID")
	}

	// Get user collection
	usersColl := db.GetCollection(ac.DB, ac.Config.DatabaseName, "users")

	// Find user by ID
	var user models.User
	err = usersColl.FindOne(context.Background(), bson.M{"_id": objID}).Decode(&user)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return echo.NewHTTPError(http.StatusNotFound, "User not found")
		}
		return echo.NewHTTPError(http.StatusInternalServerError, "Database error")
	}

	// Return user info
	return c.JSON(http.StatusOK, user.ToResponse())
}

// UpdateProfile updates the current user's profile
func (ac *AuthController) UpdateProfile(c echo.Context) error {
	// Get user ID from token
	userID := c.Get("user").(string)
	objID, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid user ID")
	}

	// Bind request body
	var updates map[string]interface{}
	if err := c.Bind(&updates); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid request body")
	}

	// Remove sensitive fields
	delete(updates, "password_hash")
	delete(updates, "email")
	delete(updates, "_id")

	// Add updated_at field
	updates["updated_at"] = time.Now()

	// Get user collection
	usersColl := db.GetCollection(ac.DB, ac.Config.DatabaseName, "users")

	// Update user
	_, err = usersColl.UpdateOne(
		context.Background(),
		bson.M{"_id": objID},
		bson.M{"$set": updates},
	)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to update profile")
	}

	// Get updated user
	var user models.User
	err = usersColl.FindOne(context.Background(), bson.M{"_id": objID}).Decode(&user)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to retrieve updated profile")
	}

	// Return updated user info
	return c.JSON(http.StatusOK, user.ToResponse())
}

// GetAllUsers returns all users in the system (admin only)
func (ac *AuthController) GetAllUsers(c echo.Context) error {
	// Check if we're in development mode with a public endpoint
	isDevelopment := ac.Config.Environment == "development"

	// Get user role from context if available
	var userRole string
	if userRoleInterface := c.Get("user_role"); userRoleInterface != nil {
		userRole = userRoleInterface.(string)

		// Only admin and principal can access this endpoint in non-development mode
		if !isDevelopment && userRole != constants.RoleAdmin && userRole != constants.RolePrincipal {
			return echo.NewHTTPError(http.StatusForbidden, "Insufficient permissions")
		}
	} else if !isDevelopment {
		// If not in development mode and no user role, return forbidden
		return echo.NewHTTPError(http.StatusForbidden, "Authentication required")
	}

	// Get users collection
	usersColl := db.GetCollection(ac.DB, ac.Config.DatabaseName, "users")

	// Optional query parameters
	role := c.QueryParam("role")
	orgUnit := c.QueryParam("organizational_unit")

	// Build query
	query := bson.M{}
	if role != "" {
		query["role"] = role
	}
	if orgUnit != "" {
		query["organizational_unit"] = orgUnit
	}

	// Find users
	opts := options.Find().SetSort(bson.M{"full_name": 1})
	cursor, err := usersColl.Find(context.Background(), query, opts)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Database error")
	}
	defer cursor.Close(context.Background())

	// Extract users
	var users []models.User
	if err := cursor.All(context.Background(), &users); err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to decode users")
	}

	// Convert to response format
	var response []models.UserResponse
	for _, user := range users {
		response = append(response, user.ToResponse())
	}

	return c.JSON(http.StatusOK, response)
}

// CreateUser creates a new user (admin only)
func (ac *AuthController) CreateUser(c echo.Context) error {
	// Get user role from context
	userRole := c.Get("user_role").(string)

	// Only admin and principal can access this endpoint
	if userRole != constants.RoleAdmin && userRole != constants.RolePrincipal {
		return echo.NewHTTPError(http.StatusForbidden, "Insufficient permissions")
	}

	// Parse request body
	var req struct {
		Email             string `json:"email" validate:"required,email"`
		Password          string `json:"password" validate:"required,min=6"`
		FullName          string `json:"full_name" validate:"required"`
		Role              string `json:"role" validate:"required"`
		OrganizationalUnit string `json:"organizational_unit" validate:"required"`
	}

	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid request body")
	}

	// Validate role
	validRole := false
	switch req.Role {
	case constants.RoleAdmin, constants.RolePrincipal, constants.RoleTeacher,
		constants.RoleStudent, constants.RoleParent, constants.RoleStaff:
		validRole = true
	}

	if !validRole {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid role")
	}

	// Get user collection
	usersColl := db.GetCollection(ac.DB, ac.Config.DatabaseName, "users")

	// Check if user already exists
	var existingUser models.User
	err := usersColl.FindOne(context.Background(), bson.M{"email": req.Email}).Decode(&existingUser)
	if err == nil {
		return echo.NewHTTPError(http.StatusConflict, "User already exists")
	}

	// Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to hash password")
	}

	// Create new user
	now := time.Now()
	newUser := models.User{
		ID:                primitive.NewObjectID(),
		Email:             req.Email,
		PasswordHash:      string(hashedPassword),
		FullName:          req.FullName,
		Role:              req.Role,
		OrganizationalUnit: req.OrganizationalUnit,
		CreatedAt:         now,
		UpdatedAt:         now,
	}

	// Insert user into database
	_, err = usersColl.InsertOne(context.Background(), newUser)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to create user")
	}

	// Add user to default groups based on role and organizational unit
	groupsColl := db.GetCollection(ac.DB, ac.Config.DatabaseName, "groups")
	membersColl := db.GetCollection(ac.DB, ac.Config.DatabaseName, "group_members")

	// Add to role-based default groups
	if defaultGroups, ok := constants.DefaultGroupsByRole[req.Role]; ok {
		for _, groupName := range defaultGroups {
			// Check if group exists, if not create it
			var group models.ChatGroup
			err := groupsColl.FindOne(context.Background(), bson.M{"name": groupName}).Decode(&group)
			if err != nil {
				// Create the group
				group = models.ChatGroup{
					ID:          primitive.NewObjectID(),
					Name:        groupName,
					Description: "Default group for " + groupName,
					GroupType:   "system",
					ChatType:    "group",
					CreatedAt:   now,
					UpdatedAt:   now,
					CreatedBy:   "system",
				}
				_, err = groupsColl.InsertOne(context.Background(), group)
				if err != nil {
					// Log error but continue
					continue
				}
			}

			// Add user to group
			groupMember := models.GroupMember{
				ID:        primitive.NewObjectID(),
				GroupID:   group.ID,
				UserID:    newUser.ID,
				Role:      "member",
				JoinedAt:  now,
				CreatedAt: now,
				UpdatedAt: now,
			}
			_, err = membersColl.InsertOne(context.Background(), groupMember)
			// Log error but continue if there's an issue
		}
	}

	// Add to organizational unit group
	var orgUnitGroup models.ChatGroup
	err = groupsColl.FindOne(context.Background(), bson.M{"name": req.OrganizationalUnit}).Decode(&orgUnitGroup)
	if err != nil {
		// Create the group
		orgUnitGroup = models.ChatGroup{
			ID:                 primitive.NewObjectID(),
			Name:               req.OrganizationalUnit,
			Description:        "Group for " + req.OrganizationalUnit,
			GroupType:          "organizational_unit",
			OrganizationalUnit: req.OrganizationalUnit,
			ChatType:           "group",
			CreatedAt:          now,
			UpdatedAt:          now,
			CreatedBy:          "system",
		}
		_, err = groupsColl.InsertOne(context.Background(), orgUnitGroup)
		if err == nil {
			// Add user to group
			groupMember := models.GroupMember{
				ID:        primitive.NewObjectID(),
				GroupID:   orgUnitGroup.ID,
				UserID:    newUser.ID,
				Role:      "member",
				JoinedAt:  now,
				CreatedAt: now,
				UpdatedAt: now,
			}
			_, _ = membersColl.InsertOne(context.Background(), groupMember)
		}
	} else {
		// Add user to existing org unit group
		groupMember := models.GroupMember{
			ID:        primitive.NewObjectID(),
			GroupID:   orgUnitGroup.ID,
			UserID:    newUser.ID,
			Role:      "member",
			JoinedAt:  now,
			CreatedAt: now,
			UpdatedAt: now,
		}
		_, _ = membersColl.InsertOne(context.Background(), groupMember)
	}

	return c.JSON(http.StatusCreated, newUser.ToResponse())
}

// UpdateUser updates a user (admin only)
func (ac *AuthController) UpdateUser(c echo.Context) error {
	// Get user role from context
	userRole := c.Get("user_role").(string)

	// Only admin and principal can access this endpoint
	if userRole != constants.RoleAdmin && userRole != constants.RolePrincipal {
		return echo.NewHTTPError(http.StatusForbidden, "Insufficient permissions")
	}

	// Get user ID from URL
	userID := c.Param("id")
	userObjID, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid user ID")
	}

	// Parse request body
	var req struct {
		Email             string `json:"email"`
		Password          string `json:"password"`
		FullName          string `json:"full_name"`
		Role              string `json:"role"`
		OrganizationalUnit string `json:"organizational_unit"`
	}

	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid request body")
	}

	// Get user collection
	usersColl := db.GetCollection(ac.DB, ac.Config.DatabaseName, "users")

	// Find user by ID
	var user models.User
	err = usersColl.FindOne(context.Background(), bson.M{"_id": userObjID}).Decode(&user)
	if err != nil {
		return echo.NewHTTPError(http.StatusNotFound, "User not found")
	}

	// Prepare update
	update := bson.M{
		"updated_at": time.Now(),
	}

	if req.Email != "" {
		// Check if email is already in use by another user
		var existingUser models.User
		err = usersColl.FindOne(context.Background(), bson.M{
			"email": req.Email,
			"_id":   bson.M{"$ne": userObjID},
		}).Decode(&existingUser)
		if err == nil {
			return echo.NewHTTPError(http.StatusConflict, "Email already in use")
		}

		update["email"] = req.Email
	}

	if req.Password != "" {
		// Hash new password
		hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
		if err != nil {
			return echo.NewHTTPError(http.StatusInternalServerError, "Failed to hash password")
		}

		update["password_hash"] = string(hashedPassword)
	}

	if req.FullName != "" {
		update["full_name"] = req.FullName
	}

	if req.Role != "" {
		// Validate role
		validRole := false
		switch req.Role {
		case constants.RoleAdmin, constants.RolePrincipal, constants.RoleTeacher,
			constants.RoleStudent, constants.RoleParent, constants.RoleStaff:
			validRole = true
		}

		if !validRole {
			return echo.NewHTTPError(http.StatusBadRequest, "Invalid role")
		}

		update["role"] = req.Role
	}

	// Handle organizational unit change
	if req.OrganizationalUnit != "" && req.OrganizationalUnit != user.OrganizationalUnit {
		update["organizational_unit"] = req.OrganizationalUnit

		// Add user to new organizational unit group
		groupsColl := db.GetCollection(ac.DB, ac.Config.DatabaseName, "groups")
		membersColl := db.GetCollection(ac.DB, ac.Config.DatabaseName, "group_members")

		// Check if org unit group exists, if not create it
		var orgUnitGroup models.ChatGroup
		err = groupsColl.FindOne(context.Background(), bson.M{"name": req.OrganizationalUnit}).Decode(&orgUnitGroup)
		if err != nil {
			// Create the group
			now := time.Now()
			orgUnitGroup = models.ChatGroup{
				ID:                 primitive.NewObjectID(),
				Name:               req.OrganizationalUnit,
				Description:        "Group for " + req.OrganizationalUnit,
				GroupType:          "organizational_unit",
				OrganizationalUnit: req.OrganizationalUnit,
				ChatType:           "group",
				CreatedAt:          now,
				UpdatedAt:          now,
				CreatedBy:          "system",
			}
			_, err = groupsColl.InsertOne(context.Background(), orgUnitGroup)
			if err == nil {
				// Add user to group
				groupMember := models.GroupMember{
					ID:        primitive.NewObjectID(),
					GroupID:   orgUnitGroup.ID,
					UserID:    userObjID,
					Role:      "member",
					JoinedAt:  time.Now(),
					CreatedAt: time.Now(),
					UpdatedAt: time.Now(),
				}
				_, _ = membersColl.InsertOne(context.Background(), groupMember)
			}
		} else {
			// Add user to existing org unit group
			groupMember := models.GroupMember{
				ID:        primitive.NewObjectID(),
				GroupID:   orgUnitGroup.ID,
				UserID:    userObjID,
				Role:      "member",
				JoinedAt:  time.Now(),
				CreatedAt: time.Now(),
				UpdatedAt: time.Now(),
			}
			_, _ = membersColl.InsertOne(context.Background(), groupMember)
		}
	}

	// Update user in database
	_, err = usersColl.UpdateOne(
		context.Background(),
		bson.M{"_id": userObjID},
		bson.M{"$set": update},
	)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to update user")
	}

	// Get updated user
	err = usersColl.FindOne(context.Background(), bson.M{"_id": userObjID}).Decode(&user)
	if err != nil {
		return echo.NewHTTPError(http.StatusNotFound, "User not found")
	}

	return c.JSON(http.StatusOK, user.ToResponse())
}

// DeleteUser deletes a user (admin only)
func (ac *AuthController) DeleteUser(c echo.Context) error {
	// Get user role from context
	userRole := c.Get("user_role").(string)

	// Only admin and principal can access this endpoint
	if userRole != constants.RoleAdmin && userRole != constants.RolePrincipal {
		return echo.NewHTTPError(http.StatusForbidden, "Insufficient permissions")
	}

	// Get user ID from URL
	userID := c.Param("id")
	userObjID, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid user ID")
	}

	// Get user collection
	usersColl := db.GetCollection(ac.DB, ac.Config.DatabaseName, "users")

	// Find user by ID
	var user models.User
	err = usersColl.FindOne(context.Background(), bson.M{"_id": userObjID}).Decode(&user)
	if err != nil {
		return echo.NewHTTPError(http.StatusNotFound, "User not found")
	}

	// Delete user from database
	_, err = usersColl.DeleteOne(context.Background(), bson.M{"_id": userObjID})
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to delete user")
	}

	// Delete user from all groups
	membersColl := db.GetCollection(ac.DB, ac.Config.DatabaseName, "group_members")
	_, err = membersColl.DeleteMany(context.Background(), bson.M{"user_id": userObjID})
	if err != nil {
		// Log error but continue
	}

	return c.JSON(http.StatusOK, map[string]string{"message": "User deleted successfully"})
}

// Helper function to generate JWT token
func (ac *AuthController) generateToken(userID string, role string) (string, error) {
	// Create token
	token := jwt.New(jwt.SigningMethodHS256)

	// Set claims
	claims := token.Claims.(jwt.MapClaims)
	claims["user_id"] = userID
	claims["role"] = role
	claims["exp"] = time.Now().Add(time.Hour * 72).Unix() // Token expires in 72 hours

	// Generate encoded token
	tokenString, err := token.SignedString([]byte(ac.Config.JWTSecret))
	if err != nil {
		return "", err
	}

	return tokenString, nil
}
