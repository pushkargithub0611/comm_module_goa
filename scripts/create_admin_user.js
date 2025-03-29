// MongoDB script to create an admin user
// Run with: mongosh "mongodb://localhost:27017/chatterbloom" create_admin_user.js

// Create admin user
const adminUser = {
  _id: ObjectId(),
  email: "admin@school.edu",
  password_hash: "$2a$10$8KVKNyTYkPWZX.hpY3QVpuU8o/4/XmCdIj4qP.QsUTJH9GcBX9wbe", // hashed "password123"
  full_name: "Admin User",
  avatar_url: '',
  role: 'admin',
  organizational_unit: 'Administration',
  created_at: new Date(),
  updated_at: new Date()
};

// Check if admin user already exists
const existingAdmin = db.users.findOne({ email: adminUser.email });
if (existingAdmin) {
  print("Admin user already exists");
} else {
  db.users.insertOne(adminUser);
  print("Created admin user: admin@school.edu with password: password123");
}

// Print all users with admin role
const adminUsers = db.users.find({ role: 'admin' }).toArray();
print(`Found ${adminUsers.length} admin users in the database`);
adminUsers.forEach(user => {
  print(`- ${user.email} (${user.full_name})`);
});
