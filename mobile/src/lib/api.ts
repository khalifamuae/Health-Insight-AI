import * as SecureStore from 'expo-secure-store';

const API_BASE_URL = 'https://health-insight-ai.replit.app';

let authToken: string | null = null;

export const setAuthToken = async (token: string) => {
  authToken = token;
  await SecureStore.setItemAsync('authToken', token);
};

export const getAuthToken = async () => {
  if (!authToken) {
    authToken = await SecureStore.getItemAsync('authToken');
  }
  return authToken;
};

export const clearAuthToken = async () => {
  authToken = null;
  await SecureStore.deleteItemAsync('authToken');
};

const getHeaders = async () => {
  const token = await getAuthToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
};

export const api = {
  async get<T>(endpoint: string): Promise<T> {
    const headers = await getHeaders();
    const response = await fetch(`${API_BASE_URL}${endpoint}`, { headers });
    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }
    return response.json();
  },

  async post<T>(endpoint: string, data?: any): Promise<T> {
    const headers = await getHeaders();
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data)
    });
    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }
    return response.json();
  },

  async patch<T>(endpoint: string, data?: any): Promise<T> {
    const headers = await getHeaders();
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(data)
    });
    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }
    return response.json();
  },

  async delete(endpoint: string): Promise<void> {
    const headers = await getHeaders();
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'DELETE',
      headers
    });
    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }
  },

  async uploadPdf(file: { uri: string; name: string; type: string }): Promise<any> {
    const token = await getAuthToken();
    const formData = new FormData();
    formData.append('pdf', {
      uri: file.uri,
      name: file.name,
      type: 'application/pdf'
    } as any);

    const response = await fetch(`${API_BASE_URL}/api/analyze-pdf`, {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: formData
    });

    if (!response.ok) {
      throw new Error(`Upload Error: ${response.status}`);
    }
    return response.json();
  }
};

export const queries = {
  user: () => api.get('/api/user'),
  tests: () => api.get('/api/tests'),
  userTests: () => api.get('/api/user-tests'),
  allTests: () => api.get('/api/tests/all'),
  reminders: () => api.get('/api/reminders'),
  testDefinitions: () => api.get('/api/test-definitions')
};
