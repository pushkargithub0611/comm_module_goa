package routes

import (
	"chatterbloom/backend/config"
	"chatterbloom/backend/constants"
	"chatterbloom/backend/controllers"
	"chatterbloom/backend/middleware"
	"chatterbloom/backend/websocket"

	"github.com/labstack/echo/v4"
	"go.mongodb.org/mongo-driver/mongo"
)

// RegisterRoutes registers all routes for the application
func RegisterRoutes(e *echo.Echo, db *mongo.Client, hub *websocket.Hub) {
	// Load configuration
	cfg := config.LoadConfig()

	// Initialize controllers
	authController := &controllers.AuthController{DB: db, Config: cfg}
	groupController := &controllers.GroupController{DB: db, Config: cfg}
	messageController := &controllers.MessageController{DB: db, Config: cfg, Hub: hub}

	// Auth middleware
	jwtMiddleware := middleware.JWTAuth(cfg)

	// Public routes
	e.POST("/api/auth/login", authController.Login)
	e.POST("/api/auth/register", authController.Register)

	// WebSocket endpoint
	e.GET("/ws", func(c echo.Context) error {
		return websocket.ServeWs(hub, c)
	})

	// For development purposes, make some routes public
	if cfg.Environment == "development" {
		// Development public routes
		e.GET("/api/groups", groupController.GetGroups)
		e.POST("/api/groups", groupController.CreateGroup)
		e.GET("/api/groups/:id", groupController.GetGroupDetails)
		e.GET("/api/groups/:groupId/messages", messageController.GetMessages)
		e.POST("/api/messages", messageController.SendMessage)
		
		// Development public user routes
		e.GET("/api/users", authController.GetAllUsers) // Public endpoint for users in development mode
	}

	// Protected routes
	api := e.Group("/api")
	api.Use(jwtMiddleware)

	// User routes - accessible by all authenticated users
	api.GET("/user/profile", authController.GetProfile)
	api.PUT("/user/profile", authController.UpdateProfile)

	// Group routes - protected in production
	if cfg.Environment != "development" {
		api.GET("/groups", groupController.GetGroups)
		api.POST("/groups", groupController.CreateGroup)
		api.GET("/groups/:id", groupController.GetGroupDetails)
		api.GET("/groups/:groupId/messages", messageController.GetMessages)
		api.POST("/messages", messageController.SendMessage)
	}
	
	// Admin-only routes
	adminRoutes := api.Group("/admin")
	adminRoutes.Use(middleware.RoleAuth(constants.RoleAdmin, constants.RolePrincipal))
	
	// School administration routes
	adminRoutes.GET("/users", authController.GetAllUsers)
	adminRoutes.POST("/users", authController.CreateUser)
	adminRoutes.PUT("/users/:id", authController.UpdateUser)
	adminRoutes.DELETE("/users/:id", authController.DeleteUser)
	adminRoutes.GET("/groups/all", groupController.GetAllGroups)
	
	// Teacher routes
	teacherRoutes := api.Group("/teacher")
	teacherRoutes.Use(middleware.RoleAuth(constants.RoleAdmin, constants.RolePrincipal, constants.RoleTeacher))
	
	// Class management routes
	teacherRoutes.POST("/groups/:id/announcement", messageController.SendAnnouncement)
	
	// These routes are always protected
	api.POST("/groups/:id/members", groupController.AddMemberToGroup)
	api.DELETE("/groups/:id/members/:userId", groupController.RemoveMemberFromGroup)
	api.PUT("/messages/:id/read", messageController.MarkMessageAsRead)
	api.GET("/messages/unread", messageController.GetUnreadCount)
}
