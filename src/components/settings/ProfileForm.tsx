
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Profile } from "@/types/profile";

interface ProfileFormProps {
  profile: Profile;
  onProfileUpdate: (field: keyof Profile, value: string) => void;
}

export const ProfileForm = ({ profile, onProfileUpdate }: ProfileFormProps) => {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="full-name">Full Name</Label>
        <Input
          id="full-name"
          value={profile?.full_name || ""}
          onChange={(e) => onProfileUpdate('full_name', e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="role">Role</Label>
        <Input
          id="role"
          value={profile?.role || ""}
          onChange={(e) => onProfileUpdate('role', e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="organizational-unit">Organizational Unit</Label>
        <Input
          id="organizational-unit"
          value={profile?.organizational_unit || ""}
          onChange={(e) => onProfileUpdate('organizational_unit', e.target.value)}
        />
      </div>
    </div>
  );
};
