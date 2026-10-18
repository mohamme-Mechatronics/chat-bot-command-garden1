export function getServiceUrl() {
  return localStorage.getItem('arsh-service-url') || 'https://chat-bot-command-garden.lovable.app';
}
export function getCloudConfiguration() {
  return {
    url: localStorage.getItem('arsh-cloud-url') || import.meta.env.VITE_SUPABASE_URL,
    key: localStorage.getItem('arsh-cloud-key') || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  };
}