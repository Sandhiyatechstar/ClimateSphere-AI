import { useChatContext } from '../context/ChatContext';

/**
 * Custom hook for ClimateSphere AI chatbot state and messaging operations.
 */
export function useChat() {
  return useChatContext();
}
