export type Profile = {
  id: string;
  display_name: string;
  avatar_url: string | null;
  strava_athlete_id: number | null;
  last_synced_at: string | null;
  created_at: string;
  updated_at: string;
};

export type Group = {
  id: string;
  name: string;
  description: string;
  is_private: boolean;
  password_hash: string | null;
  created_by: string;
  created_at: string;
};

export type GroupMember = {
  group_id: string;
  user_id: string;
  role: "owner" | "member";
  joined_at: string;
};

export type DailyStat = {
  user_id: string;
  stat_date: string;
  calories: number;
  miles: number;
  run_miles: number;
  walk_miles: number;
  run_moving_time_sec: number;
  walk_moving_time_sec: number;
  updated_at: string;
};

export type MonthlyWin = {
  group_id: string;
  user_id: string;
  month: string;
  calories: number;
  decided_at: string;
};

export type Period = "daily" | "weekly" | "monthly";

export type LeaderboardRow = {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  calories: number;
  miles: number;
  avgRunPace: string | null;
  avgWalkPace: string | null;
  calorieRank: number;
  milesRank: number;
};
