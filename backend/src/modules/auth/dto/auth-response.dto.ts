export class AuthResponseDto {
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    workspaceId?: string | null;
    locale?: string;
    timeZone?: string | null;
    avatarUrl?: string | null;
    onboardingCompletedAt?: string | null;
  };
  access_token: string;
  refresh_token: string;
}
