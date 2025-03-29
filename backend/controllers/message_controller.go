package controllers

import (
	"chatterbloom/backend/config"
	"chatterbloom/backend/constants"
	"chatterbloom/backend/db"
	"chatterbloom/backend/models"
	"chatterbloom/backend/websocket"
	"context"
	"encoding/json"
	"net/http"
	"strconv"
	"time"

	"github.com/labstack/echo/v4"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// MessageController handles message-related requests
type MessageController struct {
	DB     *mongo.Client
	Config *config.Config
	Hub    *websocket.Hub
}

// GetMessages returns messages for a specific group
func (mc *MessageController) GetMessages(c echo.Context) error {
	// Get group ID from URL
	groupID := c.Param("groupId")
	groupObjID, err := primitive.ObjectIDFromHex(groupID)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid group ID")
	}

	// Get limit and offset from query parameters
	limit := 50 // Default limit
	offset := 0 // Default offset

	if limitParam := c.QueryParam("limit"); limitParam != "" {
		if parsedLimit, err := strconv.Atoi(limitParam); err == nil && parsedLimit > 0 {
			limit = parsedLimit
		}
	}

	if offsetParam := c.QueryParam("offset"); offsetParam != "" {
		if parsedOffset, err := strconv.Atoi(offsetParam); err == nil && parsedOffset >= 0 {
			offset = parsedOffset
		}
	}

	// Get messages collection
	messagesColl := db.GetCollection(mc.DB, mc.Config.DatabaseName, "messages")

	// Set options for pagination and sorting (newest messages first)
	findOptions := options.Find().
		SetSort(bson.M{"created_at": -1}).
		SetSkip(int64(offset)).
		SetLimit(int64(limit))

	// Find messages for the group
	cursor, err := messagesColl.Find(
		context.Background(),
		bson.M{"group_id": groupObjID},
		findOptions,
	)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Database error")
	}
	defer cursor.Close(context.Background())

	// Extract messages
	var messages []models.Message
	if err := cursor.All(context.Background(), &messages); err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to decode messages")
	}

	// Get user collection for sender information
	usersColl := db.GetCollection(mc.DB, mc.Config.DatabaseName, "users")

	// Prepare response with sender information
	var response []models.MessageResponse
	for _, msg := range messages {
		messageResponse := msg.ToResponse()

		// Get sender information
		var sender models.User
		err := usersColl.FindOne(
			context.Background(),
			bson.M{"_id": msg.SenderID},
		).Decode(&sender)
		
		if err == nil {
			senderResponse := sender.ToResponse()
			messageResponse.Sender = &senderResponse
		}

		response = append(response, messageResponse)
	}

	return c.JSON(http.StatusOK, response)
}

// SendMessage sends a new message to a group
func (mc *MessageController) SendMessage(c echo.Context) error {
	// Get user ID from token
	userID := c.Get("user").(string)
	userObjID, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid user ID")
	}

	// Bind request body
	var req models.MessageRequest
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid request body")
	}

	groupObjID, err := primitive.ObjectIDFromHex(req.GroupID)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid group ID")
	}

	// Check if user is a member of the group
	membersColl := db.GetCollection(mc.DB, mc.Config.DatabaseName, "group_members")
	count, err := membersColl.CountDocuments(
		context.Background(),
		bson.M{
			"group_id": groupObjID,
			"user_id":  userObjID,
		},
	)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Database error")
	}
	if count == 0 {
		return echo.NewHTTPError(http.StatusForbidden, "You are not a member of this group")
	}

	// Create new message
	now := time.Now()
	newMessage := models.Message{
		ID:        primitive.NewObjectID(),
		Content:   req.Content,
		GroupID:   groupObjID,
		SenderID:  userObjID,
		CreatedAt: now,
		UpdatedAt: now,
		ReadBy:    []primitive.ObjectID{userObjID}, // Mark as read by sender
	}

	// Get messages collection
	messagesColl := db.GetCollection(mc.DB, mc.Config.DatabaseName, "messages")

	// Insert message into database
	_, err = messagesColl.InsertOne(context.Background(), newMessage)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to send message")
	}

	// Get user information for response
	usersColl := db.GetCollection(mc.DB, mc.Config.DatabaseName, "users")
	var sender models.User
	err = usersColl.FindOne(context.Background(), bson.M{"_id": userObjID}).Decode(&sender)
	
	// Prepare response
	messageResponse := newMessage.ToResponse()
	if err == nil {
		senderResponse := sender.ToResponse()
		messageResponse.Sender = &senderResponse
	}

	// Broadcast message to WebSocket clients in the group
	if mc.Hub != nil {
		messageJSON, _ := json.Marshal(map[string]interface{}{
			"type":    "new_message",
			"message": messageResponse,
		})
		mc.Hub.BroadcastToRoom(req.GroupID, messageJSON)
	}

	return c.JSON(http.StatusCreated, messageResponse)
}

// MarkMessageAsRead marks a message as read by the current user
func (mc *MessageController) MarkMessageAsRead(c echo.Context) error {
	// Get user ID from token
	userID := c.Get("user").(string)

	// Get message ID from URL
	messageID := c.Param("id")
	messageObjID, err := primitive.ObjectIDFromHex(messageID)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid message ID")
	}

	// Get messages collection
	messagesColl := db.GetCollection(mc.DB, mc.Config.DatabaseName, "messages")

	// Update message to add user to read_by array
	_, err = messagesColl.UpdateOne(
		context.Background(),
		bson.M{"_id": messageObjID},
		bson.M{"$addToSet": bson.M{"read_by": userID}},
	)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to mark message as read")
	}

	return c.JSON(http.StatusOK, map[string]string{"message": "Message marked as read"})
}

// GetUnreadCount returns the count of unread messages for the current user
func (mc *MessageController) GetUnreadCount(c echo.Context) error {
	// Get user ID from token
	userID := c.Get("user").(string)

	// Get group ID from query parameter (optional)
	groupID := c.QueryParam("groupId")

	// Get messages collection
	messagesColl := db.GetCollection(mc.DB, mc.Config.DatabaseName, "messages")

	// Prepare filter
	filter := bson.M{"read_by": bson.M{"$ne": userID}}
	
	// Add group filter if provided
	if groupID != "" {
		groupObjID, err := primitive.ObjectIDFromHex(groupID)
		if err == nil {
			filter["group_id"] = groupObjID
		}
	} else {
		// If no group specified, we need to find only groups the user is a member of
		membersColl := db.GetCollection(mc.DB, mc.Config.DatabaseName, "group_members")
		userObjID, _ := primitive.ObjectIDFromHex(userID)
		
		cursor, err := membersColl.Find(
			context.Background(),
			bson.M{"user_id": userObjID},
		)
		if err != nil {
			return echo.NewHTTPError(http.StatusInternalServerError, "Database error")
		}
		defer cursor.Close(context.Background())

		var memberships []models.GroupMember
		if err := cursor.All(context.Background(), &memberships); err != nil {
			return echo.NewHTTPError(http.StatusInternalServerError, "Failed to decode group memberships")
		}

		var groupIDs []primitive.ObjectID
		for _, membership := range memberships {
			groupIDs = append(groupIDs, membership.GroupID)
		}

		if len(groupIDs) > 0 {
			filter["group_id"] = bson.M{"$in": groupIDs}
		} else {
			// User is not in any groups, so there can't be any unread messages
			return c.JSON(http.StatusOK, map[string]int{"count": 0})
		}
	}

	// Count unread messages
	count, err := messagesColl.CountDocuments(context.Background(), filter)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Database error")
	}

	return c.JSON(http.StatusOK, map[string]int{"count": int(count)})
}

// SendAnnouncement sends an announcement message to a group (teacher/admin only)
func (mc *MessageController) SendAnnouncement(c echo.Context) error {
	// Get user ID and role from context
	userID := c.Get("user_id").(string)
	userRole := c.Get("user_role").(string)
	
	// Only teachers, principals and admins can send announcements
	if userRole != constants.RoleTeacher && userRole != constants.RolePrincipal && userRole != constants.RoleAdmin {
		return echo.NewHTTPError(http.StatusForbidden, "Insufficient permissions")
	}
	
	// Get group ID from URL
	groupID := c.Param("id")
	groupObjID, err := primitive.ObjectIDFromHex(groupID)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid group ID")
	}
	
	// Parse request body
	var req struct {
		Content string `json:"content" validate:"required"`
		Title   string `json:"title" validate:"required"`
	}
	
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid request body")
	}
	
	// Get user object ID
	userObjID, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid user ID")
	}
	
	// Get groups collection
	groupsColl := db.GetCollection(mc.DB, mc.Config.DatabaseName, "chat_groups")
	
	// Find group by ID
	var group models.ChatGroup
	err = groupsColl.FindOne(context.Background(), bson.M{"_id": groupObjID}).Decode(&group)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return echo.NewHTTPError(http.StatusNotFound, "Group not found")
		}
		return echo.NewHTTPError(http.StatusInternalServerError, "Database error")
	}
	
	// Check if user is a member of the group or has admin/principal role
	if userRole != constants.RoleAdmin && userRole != constants.RolePrincipal {
		membersColl := db.GetCollection(mc.DB, mc.Config.DatabaseName, "group_members")
		var membership models.GroupMember
		err = membersColl.FindOne(
			context.Background(),
			bson.M{
				"group_id": groupObjID,
				"user_id":  userObjID,
			},
		).Decode(&membership)
		
		if err != nil {
			if err == mongo.ErrNoDocuments {
				return echo.NewHTTPError(http.StatusForbidden, "You are not a member of this group")
			}
			return echo.NewHTTPError(http.StatusInternalServerError, "Database error")
		}
	}
	
	// Create announcement message
	now := time.Now()
	message := models.Message{
		ID:        primitive.NewObjectID(),
		GroupID:   groupObjID,
		SenderID:  userObjID,
		Content:   req.Content,
		Type:      "announcement",
		Title:     req.Title,
		CreatedAt: now,
		UpdatedAt: now,
		ReadBy:    []primitive.ObjectID{},
	}
	
	// Get messages collection
	messagesColl := db.GetCollection(mc.DB, mc.Config.DatabaseName, "messages")
	
	// Insert message into database
	_, err = messagesColl.InsertOne(context.Background(), message)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to create message")
	}
	
	// Get user info for response
	usersColl := db.GetCollection(mc.DB, mc.Config.DatabaseName, "users")
	var sender models.User
	err = usersColl.FindOne(context.Background(), bson.M{"_id": userObjID}).Decode(&sender)
	if err != nil {
		// Continue even if user info can't be retrieved
		sender = models.User{
			ID:       userObjID,
			FullName: "Unknown User",
		}
	}
	
	// Prepare message response
	messageResp := message.ToResponse()
	messageResp.Sender = &models.UserResponse{
		ID:                sender.ID.Hex(),
		Email:             sender.Email,
		FullName:          sender.FullName,
		AvatarURL:         sender.AvatarURL,
		Role:              sender.Role,
		OrganizationalUnit: sender.OrganizationalUnit,
	}
	
	// Broadcast message to group members via WebSocket
	if mc.Hub != nil {
		mc.Hub.SendToGroup(groupID, map[string]interface{}{
			"type":    "announcement",
			"message": messageResp,
		})
	}
	
	return c.JSON(http.StatusCreated, messageResp)
}
