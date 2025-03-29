package constants

// User roles
const (
	RoleAdmin       = "admin"
	RolePrincipal   = "principal"
	RoleTeacher     = "teacher"
	RoleStudent     = "student"
	RoleParent      = "parent"
	RoleStaff       = "staff"
)

// Default organizational units for a school
var OrganizationalUnits = []string{
	"Administration",
	"Faculty",
	"Grade 1",
	"Grade 2",
	"Grade 3",
	"Grade 4",
	"Grade 5",
	"Grade 6",
	"Grade 7",
	"Grade 8",
	"Grade 9",
	"Grade 10",
	"Grade 11",
	"Grade 12",
	"Science Department",
	"Math Department",
	"English Department",
	"History Department",
	"Arts Department",
	"Physical Education",
	"Support Staff",
}

// Role-based default groups
var DefaultGroupsByRole = map[string][]string{
	RoleAdmin:     {"All Staff", "Administration", "School Announcements"},
	RolePrincipal: {"All Staff", "Administration", "School Announcements", "Faculty"},
	RoleTeacher:   {"All Staff", "Faculty", "Teacher Lounge"},
	RoleStudent:   {"School Announcements", "Student Forum"},
	RoleParent:    {"Parent Community", "School Announcements"},
	RoleStaff:     {"All Staff", "Support Staff"},
}

// Organizational unit default groups
// Each organizational unit will have its own group
// For example, "Grade 1" will have a "Grade 1" group
