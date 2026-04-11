export type AuthUserResponseDto = {
  id: string;
  username: string;
  email: string;
  isGuest: boolean;
  createdAt: Date;
};

export type AuthResponseDto = {
  token: string;
  user: AuthUserResponseDto;
};
