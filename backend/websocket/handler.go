package websocket

import (
	"log"
	"net/http"

	"github.com/gorilla/websocket"
	"github.com/labstack/echo/v4"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		// Allow all connections for now
		// In production, this should check the origin
		return true
	},
}

// ServeWs handles websocket requests from clients
func ServeWs(hub *Hub, c echo.Context) error {
	conn, err := upgrader.Upgrade(c.Response(), c.Request(), nil)
	if err != nil {
		log.Println(err)
		return err
	}

	// Get user ID and room ID from query parameters
	userID := c.QueryParam("userId")
	roomID := c.QueryParam("roomId")

	if userID == "" {
		log.Println("User ID is required")
		conn.Close()
		return echo.NewHTTPError(http.StatusBadRequest, "User ID is required")
	}

	client := &Client{
		hub:    hub,
		conn:   conn,
		send:   make(chan []byte, 256),
		userID: userID,
		roomID: roomID,
	}

	client.hub.register <- client

	// Allow collection of memory referenced by the caller by doing all work in
	// new goroutines.
	go client.writePump()
	go client.readPump()

	return nil
}
