import * as SecureStore from 'expo-secure-store';

const API_BASE_URL = 'https://health-insight-ai.replit.app';

let sessionCookie: string | null = null;

export const setSessionCookie = async (cookie: string) => {
  sessionCookie = cookie;
  await SecureStore.setItemAsync('sessionCookie', cookie);
};

export const getSessionCookie = async () => {
  if (!sessionCookie) {
    sessionCookie = await SecureStore.getItemAsync('sessionCookie');
  }
  return sessionCookie;
};

export const clearSessionCookie = async () => {
  sessionCookie = null;
  await SecureStore.deleteItemAsync('sessionCookie');
};

export const setAuthToken = async (token: string) => {
  await SecureStore.setItemAsync('authToken', token);
};

export const getAuthToken = async () => {
  return await SecureStore.getItemAsync('authToken');
};

export const clearAuthToken = async () => {
  await SecureStore.deleteItemAsync('authToken');
};

const getHeaders = async () => {
  const cookie = await getSessionCookie();
  const token = await getAuthToken();
  return {
    'Content-Type': 'application/json',
    ...(cookie ? { Cookie: cookie } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const extractAndSaveCookie = async (response: Response) => {
  const setCookieHeader = response.headers.get('set-cookie');
  if (setCookieHeader) {
    const sessionMatch = setCookieHeader.match(/connect\.sid=[^;]+/);
    if (sessionMatch) {
      await setSessionCookie(sessionMatch[0]);
    }
  }
};

export const api = {
  async get<T>(endpoint: string): Promise<T> {
    const headers = await getHeaders();
    const response = await fetch(`${API_BASE_URL}${endpoint}`, { 
      headers,
      credentials: 'include',
    });
    await extractAndSaveCookie(response);
    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      const message = errorData?.message || errorData?.error || `API Error: ${response.status}`;
      throw new Error(message);
    }
    return response.json();
  },

  async post<T>(endpoint: string, data?: any): Promise<T> {
    const headers = await getHeaders();
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
      credentials: 'include',
    });
    await extractAndSaveCookie(response);
    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      const message = errorData?.message || errorData?.error || `API Error: ${response.status}`;
      throw new Error(message);
    }
    return response.json();
  },

  async patch<T>(endpoint: string, data?: any): Promise<T> {
    const headers = await getHeaders();
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(data),
      credentials: 'include',
    });
    await extractAndSaveCookie(response);
    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      const message = errorData?.message || errorData?.error || `API Error: ${response.status}`;
      throw new Error(message);
    }
    return response.json();
  },

  async delete(endpoint: string): Promise<void> {
    const headers = await getHeaders();
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'DELETE',
      headers,
      credentials: 'include',
    });
    await extractAndSaveCookie(response);
    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      const message = errorData?.message || errorData?.error || `API Error: ${response.status}`;
      throw new Error(message);
    }
  },

  async uploadPdf(file: { uri: string; name: string; type: string }): Promise<any> {
    const cookie = await getSessionCookie();
    const token = await getAuthToken();
    const formData = new FormData();
    formData.append('file', {
      uri: file.uri,
      name: file.name,
      type: file.type
    } as any);

    const response = await fetch(`${API_BASE_URL}/api/analyze-upload`, {
      method: 'POST',
      headers: {
        ...(cookie ? { Cookie: cookie } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
      credentials: 'include',
    });

    await extractAndSaveCookie(response);
    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      const message = errorData?.message || errorData?.error || `Upload Error: ${response.status}`;
      throw new Error(message);
    }
    return response.json();
  }
};

export const queries = {
  profile: () => api.get('/api/profile'),
  tests: () => api.get('/api/tests'),
  testsHistory: () => api.get('/api/tests/history'),
  allTests: () => api.get('/api/tests/all'),
  reminders: () => api.get('/api/reminders'),
  testDefinitions: () => api.get('/api/test-definitions'),
  stats: () => api.get('/api/stats'),
  uploadedPdfs: () => api.get('/api/uploaded-pdfs'),
  savedDietPlans: () => api.get('/api/saved-diet-plans'),
  subscriptionStatus: () => api.get('/api/subscription/status'),
};
