
Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## Microservice Architecture

ChatterBloom has been transformed into a microservice architecture with the following components:

### Backend (Go Echo Framework)
- RESTful API for user authentication, group management, and message handling
- WebSocket server for real-time communication
- JWT-based authentication
- Clean architecture with controllers, services, and models

### Database (MongoDB)
- Document-based NoSQL database
- Collections for users, chat groups, group members, and messages
- Efficient querying for chat history and user information

### Frontend (React)
- React-based UI with TypeScript
- Real-time updates using WebSockets
- Responsive design for mobile and desktop

## Project Structure

```
chatterbloom-module/
├── backend/               # Go backend service
│   ├── api/               # API definitions
│   ├── config/            # Configuration management
│   ├── controllers/       # Request handlers
│   ├── db/                # Database connection and helpers
│   ├── middleware/        # HTTP middleware
│   ├── models/            # Data models
│   ├── routes/            # Route definitions
│   ├── services/          # Business logic
│   ├── utils/             # Utility functions
│   ├── websocket/         # WebSocket implementation
│   ├── Dockerfile         # Backend container definition
│   ├── go.mod             # Go module definition
│   └── main.go            # Application entry point
├── src/                   # React frontend
│   ├── components/        # UI components
│   ├── contexts/          # React contexts
│   ├── hooks/             # Custom React hooks
│   ├── pages/             # Application pages
│   ├── services/          # API and WebSocket services
│   └── types/             # TypeScript type definitions
└── docker-compose.yml     # Multi-container definition
```

## Getting Started

### Prerequisites
- Docker and Docker Compose
- Go 1.21+ (for local development)
- Node.js 18+ (for local development)
- MongoDB (for local development)

### Environment Setup

The application uses the following ports by default:
- Frontend: `8080` (Vite development server)
- Backend: `8090` (Go Echo server)
- MongoDB: `27017` (Database)

Make sure these ports are available on your system before starting the application.

#### Environment Variables

Create a `.env` file in the root directory with the following variables:

```
# Backend Configuration
PORT=8090
MONGODB_URI=mongodb://localhost:27017/chatterbloom
JWT_SECRET=your_jwt_secret_key
ENVIRONMENT=development

# Frontend Configuration
VITE_API_URL=http://localhost:8090/api
```

### Database Setup

The application requires MongoDB to store user data, groups, and messages. You can either:

1. **Use Docker** (recommended for development):
   ```sh
   docker run -d -p 27017:27017 --name mongodb mongo:latest
   ```

2. **Install MongoDB locally**:
   - Follow the [official MongoDB installation guide](https://docs.mongodb.com/manual/installation/)
   - Create a database named `chatterbloom`

3. **Create test data**:
   ```sh
   # Create an admin user and test data
   mongosh "mongodb://localhost:27017/chatterbloom" scripts/create_admin_user.js
   mongosh "mongodb://localhost:27017/chatterbloom" scripts/generate_test_users.js
   ```

### Running with Docker Compose
The easiest way to run the application is using Docker Compose:

```sh
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down
```

### Running Locally

#### Backend
```sh
# Navigate to backend directory
cd backend

# Install dependencies
go mod tidy

# Run the server (will start on port 8090)
go run main.go
```

#### Frontend
```sh
# Install dependencies
npm install

# Run the development server (will start on port 8080)
npm run dev
```

### Accessing the Application

Once both the backend and frontend are running:

1. Open your browser and navigate to `http://localhost:8080`
2. Log in with one of the following accounts:
   - Admin user: `admin@school.edu` / `password123`
   - Test user: `test.user1@school.edu` / `password123`

### Troubleshooting

#### Backend Connection Issues
- Ensure MongoDB is running and accessible at `mongodb://localhost:27017`
- Check that port 8090 is not being used by another application
- Verify the JWT_SECRET in your .env file matches the one used by the backend

#### Frontend Connection Issues
- Make sure the backend API is running and accessible
- Check that the VITE_API_URL in your .env file is correct
- Clear browser cache if you're experiencing unexpected behavior

#### Authentication Issues
- If you can't log in, try running the scripts to create test users again
- Check browser console for any API errors
- Verify that the backend is correctly validating JWT tokens

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration

### User
- `GET /api/user/profile` - Get current user profile
- `PUT /api/user/profile` - Update user profile

### Groups
- `GET /api/groups` - Get all groups for current user
- `POST /api/groups` - Create a new group
- `GET /api/groups/:id` - Get group details
- `POST /api/groups/:id/members` - Add member to group
- `DELETE /api/groups/:id/members/:userId` - Remove member from group

### Messages
- `GET /api/groups/:groupId/messages` - Get messages for a group
- `POST /api/messages` - Send a new message
- `PUT /api/messages/:id/read` - Mark message as read
- `GET /api/messages/unread` - Get unread message count

## WebSocket

The WebSocket endpoint is available at `/ws`. Connect with query parameters:
- `userId` - The current user's ID (required)
- `roomId` - The group ID to join (optional)

## What technologies are used for this project?

This project is built with .

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## License

This project is licensed under the MIT License.
