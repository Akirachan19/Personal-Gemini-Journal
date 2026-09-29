export type AIMode = 'reflect' | 'summarize' | 'brainstorm' | 'chat';

export type MoodType = 
  | 'clarity' 
  | 'gratitude' 
  | 'growth' 
  | 'focus' 
  | 'resilience' 
  | 'anxious' 
  | 'creative' 
  | 'peaceful';

export interface ActionItem {
  id: string;
  text: string;
  completed: boolean;
  createdAt: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  modelUsed?: string;
}

export interface JournalInteraction {
  id: string;
  userId: string;
  title: string;
  initialPrompt: string;
  summary?: string;
  mode: AIMode;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
  tags: string[];
  isFavorite?: boolean;
  mood?: MoodType;
  sentimentScore?: number; // 0 to 100
  actionItems?: ActionItem[];
  lastNotifiedAt?: number;
  notificationStatus?: 'sent' | 'failed';
  dispatchedProviders?: string[];
}

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

export interface GeminiResponse {
  reply: string;
  modelUsed: string;
  suggestedTitle?: string;
  detectedMood?: MoodType;
  sentimentScore?: number;
  extractedActionItems?: string[];
}

export interface PromptSparkCategory {
  id: string;
  label: string;
  icon: string;
  description: string;
  samplePrompts: string[];
}

export type NotificationProvider = 'slack' | 'discord' | 'email';
export type NotificationTriggerMode = 'all' | 'summarize' | 'brainstorm' | 'keywords' | 'manual';

export interface NotificationSettings {
  id: string;
  userId: string;
  slackEnabled: boolean;
  slackWebhookUrl: string;
  discordEnabled: boolean;
  discordWebhookUrl: string;
  emailEnabled: boolean;
  emailAddress: string;
  emailWebhookUrl: string;
  triggerMode: NotificationTriggerMode;
  filterKeywords: string[];
  updatedAt: number;
}

export interface NotificationLog {
  id: string;
  userId: string;
  interactionId: string;
  provider: NotificationProvider;
  status: 'success' | 'failed';
  entryTitle: string;
  messageExcerpt: string;
  timestamp: number;
  errorMessage?: string;
}

export interface NotificationPayloadDirective {
  provider: NotificationProvider;
  webhookUrl?: string;
  emailAddress?: string;
  emailWebhookUrl?: string;
  entry: {
    id: string;
    title: string;
    mode: AIMode;
    initialPrompt: string;
    latestAiInsight?: string;
    createdAt: number;
    tags?: string[];
    mood?: MoodType;
  };
  triggerReason?: string;
}

export interface NotificationDispatchResult {
  provider: NotificationProvider;
  success: boolean;
  statusText?: string;
  error?: string;
  timestamp: number;
}
