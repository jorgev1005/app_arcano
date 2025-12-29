export type Project = {
  _id: string;
  title: string;
  description?: string;
  coverImage?: string;
  variables?: { key: string; value: string }[];
  graphData?: {
    edges: { id: string; source: string; target: string; type?: string }[];
    positions: Record<string, { x: number; y: number }>;
  };
  settings?: {
    genre: 'sci_fi' | 'thriller' | 'eastern_slice' | 'custom';
    structure: 'western' | 'eastern';
    sensitivity: 'relaxed' | 'strict';
    dailyGoal?: number;
  };
  stats?: {
    dailyProgress?: Record<string, number>;
  };
  files?: FileNode[];
  isArchived?: boolean;
  createdAt?: string;
};

export type FileNode = {
  _id: string;
  title: string;
  content?: string;
  type: 'file' | 'folder' | 'text' | 'character' | 'location' | 'item' | 'trash';
  synopsis?: string;
  status?: string;
  isSystem?: boolean;
  customData?: Record<string, string>;
  links?: string[];
  order?: number;
  metadata?: Record<string, string>;
  parent?: string | null;
  wordCount?: number;
  sceneData?: {
    goal?: string;
    conflict?: string;
    outcome?: string;
    characters?: string[];
  };
  metrics?: {
    focus: number;      // 0-10 (Internal -> External)
    dissonance: number; // 1-10 (Calm -> Tension)
    polarity: number;   // -10 to +10 (Neg -> Pos)
  };
  timeData?: {
    startDay: number;
    startHour: number;
    startMinute: number;
    durationDay: number;
    durationHour: number;
    durationMinute: number;
  };
  data?: any;
  children?: FileNode[];
};
