export interface AnthropicContentBlock {
  type: 'text' | 'image' | 'document';
  text?: string;
  metadata?: {
    key: string;
    mediaType: string;
    name: string;
  };
  source?: {
    type: 'base64';
    media_type: string;
    data: string;
  };
}
