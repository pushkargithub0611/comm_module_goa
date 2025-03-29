package config

import (
	"os"
)

// Config holds all configuration for the application
type Config struct {
	Port            string
	MongoURI        string
	DatabaseName    string
	JWTSecret       string
	AllowedOrigins  []string
	Environment     string
}

// LoadConfig loads configuration from environment variables
func LoadConfig() *Config {
	// Set default values
	config := &Config{
		Port:           getEnv("PORT", "8090"),
		MongoURI:       getEnv("MONGO_URI", "mongodb://localhost:27017"),
		DatabaseName:   getEnv("DB_NAME", "chatterbloom"),
		JWTSecret:      getEnv("JWT_SECRET", "your-secret-key"),
		Environment:    getEnv("ENVIRONMENT", "development"),
		AllowedOrigins: []string{"http://localhost:8090", "http://localhost:3000", "http://localhost:8084"},
	}

	return config
}

// Helper function to get environment variables with fallback
func getEnv(key, fallback string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return fallback
}
