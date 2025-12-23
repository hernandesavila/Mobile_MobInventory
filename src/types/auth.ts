export type Session = {
  userId: number;
  username: string;
  mustChangePassword?: boolean;
  timestamp: number;
};

export type Credentials = {
  username: string;
  password: string;
};
