package controllers

import (
	"chatterbloom/backend/config"
	"chatterbloom/backend/constants"
	"chatterbloom/backend/db"
	"chatterbloom/backend/models"
	"context"
	"net/http"
	"time"

	"github.com/labstack/echo/v4"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// GroupController handles group-related requests
type GroupController struct {
	DB     *mongo.Client
	Config *config.Config
}

// CreateGroupRequest represents the request to create a new group
type CreateGroupRequest struct {
	Name               string   `json:"name" validate:"required"`
	Description        string   `json:"description"`
	GroupType          string   `json:"group_type" validate:"required,oneof=class department custom"`
	OrganizationalUnit string   `json:"organizational_unit"`
	ChatType           string   `json:"chat_type" validate:"required,oneof=group individual"`
	Members            []string `json:"members"`
}

// GetGroups returns all groups for the current user
func (gc *GroupController) GetGroups(c echo.Context) error {
	// Get user ID from token - handle case when no user is authenticated
	userIDInterface := c.Get("user")
	
	// Get collections
	groupsColl := db.GetCollection(gc.DB, gc.Config.DatabaseName, "chat_groups")
	membersColl := db.GetCollection(gc.DB, gc.Config.DatabaseName, "group_members")
	
	// If no user is authenticated, return all groups (for development mode)
	if userIDInterface == nil {
		// Find all groups
		cursor, err := groupsColl.Find(
			context.Background(),
			bson.M{},
		)
		if err != nil {
			return echo.NewHTTPError(http.StatusInternalServerError, "Failed to fetch groups")
		}
		defer cursor.Close(context.Background())
		
		// Decode groups
		var groups []models.ChatGroup
		if err := cursor.All(context.Background(), &groups); err != nil {
			return echo.NewHTTPError(http.StatusInternalServerError, "Failed to decode groups")
		}
		
		return c.JSON(http.StatusOK, groups)
	}
	
	// Process authenticated user request
	userID := userIDInterface.(string)
	userObjID, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid user ID")
	}

	// Find all groups the user is a member of
	cursor, err := membersColl.Find(
		context.Background(),
		bson.M{"user_id": userObjID},
	)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Database error")
	}
	defer cursor.Close(context.Background())

	// Extract group IDs
	var memberships []models.GroupMember
	if err := cursor.All(context.Background(), &memberships); err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to decode group memberships")
	}

	if len(memberships) == 0 {
		return c.JSON(http.StatusOK, []models.ChatGroupResponse{})
	}

	// Create slice of group IDs
	var groupIDs []primitive.ObjectID
	for _, membership := range memberships {
		groupIDs = append(groupIDs, membership.GroupID)
	}

	// Find all groups by IDs
	groupsCursor, err := groupsColl.Find(
		context.Background(),
		bson.M{"_id": bson.M{"$in": groupIDs}},
	)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Database error")
	}
	defer groupsCursor.Close(context.Background())

	// Extract groups
	var groups []models.ChatGroup
	if err := groupsCursor.All(context.Background(), &groups); err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to decode groups")
	}

	// Convert to response format
	var response []models.ChatGroupResponse
	for _, group := range groups {
		// Get member count for each group
		count, err := membersColl.CountDocuments(
			context.Background(),
			bson.M{"group_id": group.ID},
		)
		if err != nil {
			count = 0 // Default to 0 if error
		}
		response = append(response, group.ToResponse(int(count)))
	}

	return c.JSON(http.StatusOK, response)
}

// CreateGroup creates a new chat group
func (gc *GroupController) CreateGroup(c echo.Context) error {
	// Get user ID from token
	userID := c.Get("user").(string)
	
	// Bind request body
	var req CreateGroupRequest
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid request body")
	}

	// Create new group
	now := time.Now()
	newGroup := models.ChatGroup{
		ID:                 primitive.NewObjectID(),
		Name:               req.Name,
		Description:        req.Description,
		GroupType:          req.GroupType,
		OrganizationalUnit: req.OrganizationalUnit,
		ChatType:           req.ChatType,
		CreatedAt:          now,
		UpdatedAt:          now,
		CreatedBy:          userID,
		Members:            append(req.Members, userID), // Add creator to members
	}

	// Get groups collection
	groupsColl := db.GetCollection(gc.DB, gc.Config.DatabaseName, "chat_groups")

	// Insert group into database
	_, err := groupsColl.InsertOne(context.Background(), newGroup)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to create group")
	}

	// Add members to group
	membersColl := db.GetCollection(gc.DB, gc.Config.DatabaseName, "group_members")
	
	// Add each member (including creator)
	for _, memberID := range newGroup.Members {
		memberObjID, err := primitive.ObjectIDFromHex(memberID)
		if err != nil {
			continue // Skip invalid IDs
		}
		
		membership := models.GroupMember{
			ID:       primitive.NewObjectID(),
			GroupID:  newGroup.ID,
			UserID:   memberObjID,
			JoinedAt: now,
			CreatedAt: now,
			UpdatedAt: now,
			Role:     "member",
		}
		
		// Make creator an admin
		if memberID == userID {
			membership.Role = "admin"
		}
		
		_, err = membersColl.InsertOne(context.Background(), membership)
		if err != nil {
			// Log error but continue
			continue
		}
	}

	// Get member count
	count := len(newGroup.Members)
	
	return c.JSON(http.StatusCreated, newGroup.ToResponse(count))
}

// GetGroupDetails returns details of a specific group
func (gc *GroupController) GetGroupDetails(c echo.Context) error {
	// Get group ID from URL
	groupID := c.Param("id")
	groupObjID, err := primitive.ObjectIDFromHex(groupID)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid group ID")
	}

	// Get groups collection
	groupsColl := db.GetCollection(gc.DB, gc.Config.DatabaseName, "chat_groups")

	// Find group by ID
	var group models.ChatGroup
	err = groupsColl.FindOne(context.Background(), bson.M{"_id": groupObjID}).Decode(&group)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return echo.NewHTTPError(http.StatusNotFound, "Group not found")
		}
		return echo.NewHTTPError(http.StatusInternalServerError, "Database error")
	}

	// Get group members
	membersColl := db.GetCollection(gc.DB, gc.Config.DatabaseName, "group_members")
	
	cursor, err := membersColl.Find(
		context.Background(),
		bson.M{"group_id": groupObjID},
	)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Database error")
	}
	defer cursor.Close(context.Background())

	// Extract members
	var members []models.GroupMember
	if err := cursor.All(context.Background(), &members); err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to decode members")
	}

	// Get member count
	memberCount := len(members)
	
	// Return group details
	return c.JSON(http.StatusOK, group.ToResponse(memberCount))
}

// AddMemberToGroup adds a user to a group
func (gc *GroupController) AddMemberToGroup(c echo.Context) error {
	// Get group ID from URL
	groupID := c.Param("id")
	groupObjID, err := primitive.ObjectIDFromHex(groupID)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid group ID")
	}

	// Bind request body
	var req struct {
		UserID string `json:"user_id" validate:"required"`
		Role   string `json:"role" validate:"required,oneof=admin member"`
	}
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid request body")
	}

	userObjID, err := primitive.ObjectIDFromHex(req.UserID)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid user ID")
	}

	// Check if group exists
	groupsColl := db.GetCollection(gc.DB, gc.Config.DatabaseName, "chat_groups")
	count, err := groupsColl.CountDocuments(context.Background(), bson.M{"_id": groupObjID})
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Database error")
	}
	if count == 0 {
		return echo.NewHTTPError(http.StatusNotFound, "Group not found")
	}

	// Check if user is already a member
	membersColl := db.GetCollection(gc.DB, gc.Config.DatabaseName, "group_members")
	count, err = membersColl.CountDocuments(
		context.Background(),
		bson.M{
			"group_id": groupObjID,
			"user_id":  userObjID,
		},
	)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Database error")
	}
	if count > 0 {
		return echo.NewHTTPError(http.StatusConflict, "User is already a member of this group")
	}

	// Add user to group
	membership := models.GroupMember{
		ID:       primitive.NewObjectID(),
		GroupID:  groupObjID,
		UserID:   userObjID,
		JoinedAt: time.Now(),
		Role:     req.Role,
	}

	_, err = membersColl.InsertOne(context.Background(), membership)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to add member to group")
	}

	// Update members array in group document
	_, err = groupsColl.UpdateOne(
		context.Background(),
		bson.M{"_id": groupObjID},
		bson.M{"$addToSet": bson.M{"members": req.UserID}},
	)
	if err != nil {
		// Log error but continue
	}

	// Get group details
	var group models.ChatGroup
	err = groupsColl.FindOne(context.Background(), bson.M{"_id": groupObjID}).Decode(&group)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to get group details")
	}

	// Get member count
	count, err = membersColl.CountDocuments(
		context.Background(),
		bson.M{"group_id": groupObjID},
	)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to get member count")
	}

	return c.JSON(http.StatusOK, group.ToResponse(int(count)))
}

// RemoveMemberFromGroup removes a user from a group
func (gc *GroupController) RemoveMemberFromGroup(c echo.Context) error {
	// Get group ID and user ID from URL
	groupID := c.Param("id")
	userID := c.Param("userId")
	
	groupObjID, err := primitive.ObjectIDFromHex(groupID)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid group ID")
	}
	
	userObjID, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid user ID")
	}

	// Remove membership
	membersColl := db.GetCollection(gc.DB, gc.Config.DatabaseName, "group_members")
	_, err = membersColl.DeleteOne(
		context.Background(),
		bson.M{
			"group_id": groupObjID,
			"user_id":  userObjID,
		},
	)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to remove member from group")
	}

	// Update members array in group document
	groupsColl := db.GetCollection(gc.DB, gc.Config.DatabaseName, "chat_groups")
	_, err = groupsColl.UpdateOne(
		context.Background(),
		bson.M{"_id": groupObjID},
		bson.M{"$pull": bson.M{"members": userID}},
	)
	if err != nil {
		// Log error but continue
	}

	// Get group details
	var group models.ChatGroup
	err = groupsColl.FindOne(context.Background(), bson.M{"_id": groupObjID}).Decode(&group)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to get group details")
	}

	// Get member count
	count, err := membersColl.CountDocuments(
		context.Background(),
		bson.M{"group_id": groupObjID},
	)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to get member count")
	}

	return c.JSON(http.StatusOK, group.ToResponse(int(count)))
}

// GetAllGroups returns all groups in the system (admin only)
func (gc *GroupController) GetAllGroups(c echo.Context) error {
	// Get user role from context
	userRole := c.Get("user_role").(string)
	
	// Only admin and principal can access this endpoint
	if userRole != constants.RoleAdmin && userRole != constants.RolePrincipal {
		return echo.NewHTTPError(http.StatusForbidden, "Insufficient permissions")
	}
	
	// Optional query parameters
	orgUnit := c.QueryParam("organizational_unit")
	groupType := c.QueryParam("group_type")
	
	// Build query
	query := bson.M{}
	if orgUnit != "" {
		query["organizational_unit"] = orgUnit
	}
	if groupType != "" {
		query["group_type"] = groupType
	}
	
	// Get groups collection
	groupsColl := db.GetCollection(gc.DB, gc.Config.DatabaseName, "chat_groups")
	membersColl := db.GetCollection(gc.DB, gc.Config.DatabaseName, "group_members")
	
	// Find all groups
	opts := options.Find().SetSort(bson.M{"name": 1})
	cursor, err := groupsColl.Find(context.Background(), query, opts)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Database error")
	}
	defer cursor.Close(context.Background())
	
	// Extract groups
	var groups []models.ChatGroup
	if err := cursor.All(context.Background(), &groups); err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to decode groups")
	}
	
	// Convert to response format with member counts
	var response []models.ChatGroupResponse
	for _, group := range groups {
		// Get member count for each group
		count, err := membersColl.CountDocuments(
			context.Background(),
			bson.M{"group_id": group.ID},
		)
		if err != nil {
			count = 0 // Default to 0 if error
		}
		response = append(response, group.ToResponse(int(count)))
	}
	
	return c.JSON(http.StatusOK, response)
}
