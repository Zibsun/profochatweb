// Types for Bot Management UI

export interface TelegramInfo {
  avatar: string;
  bot_username: string;
  display_name: string;
  about: string;
  short_about: string;
  commands: Array<{
    command: string;
    desc: string;
  }>;
}

export interface BotInternalSettings {
  token_masked: string;
  token_unmasked?: string;
  active: boolean;
}

export interface BotDetails {
  id: string;
  bot_name: string;
  display_name?: string;
  telegram_info?: TelegramInfo;
  internal_settings?: BotInternalSettings;
}
