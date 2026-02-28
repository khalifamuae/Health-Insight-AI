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

const parseApiResponse = async <T>(response: Response, defaultErrorPrefix = 'API Error'): Promise<T> => {
  const contentType = response.headers.get('content-type') || '';
  const raw = await response.text();
  const trimmed = raw.trim();

  let parsed: any = null;
  if (trimmed) {
    const shouldParseJson =
      contentType.includes('application/json') ||
      trimmed.startsWith('{') ||
      trimmed.startsWith('[');
    if (shouldParseJson) {
      try {
        parsed = JSON.parse(trimmed);
      } catch {
        parsed = null;
      }
    }
  }

  if (!response.ok) {
    const messageFromJson =
      parsed && typeof parsed === 'object'
        ? parsed.message || parsed.error
        : null;
    if (messageFromJson) {
      throw new Error(messageFromJson);
    }

    if (trimmed.startsWith('<')) {
      console.error(`[API] Server returned HTML error (${response.status}):\n`, trimmed.substring(0, 500));
      throw new Error(`Server returned HTML error (${response.status})`);
    }

    throw new Error(trimmed || `${defaultErrorPrefix}: ${response.status}`);
  }

  if (parsed !== null) {
    return parsed as T;
  }

  if (!trimmed) {
    return {} as T;
  }

  if (trimmed.startsWith('<')) {
    console.error(`[API] Server returned HTML instead of JSON (${response.status}):\n`, trimmed.substring(0, 500));
    throw new Error(`Server returned HTML instead of JSON (${response.status})`);
  }

  return trimmed as T;
};

const uploadMultipart = async (
  endpoint: string,
  fieldName: 'file' | 'pdf',
  file: { uri: string; name: string; type: string }
): Promise<any> => {
  const cookie = await getSessionCookie();
  const token = await getAuthToken();
  const formData = new FormData();
  formData.append(fieldName, {
    uri: file.uri,
    name: file.name,
    type: file.type,
  } as any);

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      ...(cookie ? { Cookie: cookie } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
    credentials: 'include',
  });

  await extractAndSaveCookie(response);
  return parseApiResponse<any>(response, 'Upload Error');
};

export const api = {
  async get<T>(endpoint: string): Promise<T> {
    const headers = await getHeaders();
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers,
      credentials: 'include',
    });
    await extractAndSaveCookie(response);
    return parseApiResponse<T>(response);
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
    return parseApiResponse<T>(response);
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
    return parseApiResponse<T>(response);
  },

  async delete(endpoint: string): Promise<void> {
    const headers = await getHeaders();
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'DELETE',
      headers,
      credentials: 'include',
    });
    await extractAndSaveCookie(response);
    await parseApiResponse<any>(response);
  },

  async uploadPdf(file: { uri: string; name: string; type: string }): Promise<any> {
    const fileName = (file.name || '').toLowerCase();
    const inferredType =
      file.type ||
      (fileName.endsWith('.pdf')
        ? 'application/pdf'
        : /\.(png|jpe?g|heic|webp)$/i.test(fileName)
          ? 'image/jpeg'
          : 'application/octet-stream');

    const normalizedFile = {
      ...file,
      type: inferredType,
    };

    try {
      return await uploadMultipart('/api/analyze-upload', 'file', normalizedFile);
    } catch (primaryError) {
      const message = primaryError instanceof Error ? primaryError.message : String(primaryError);
      const isPdf = inferredType === 'application/pdf' || fileName.endsWith('.pdf');
      const likelyLegacyServer =
        isPdf &&
        (message.includes('Server returned HTML') ||
          message.includes('Cannot POST') ||
          message.includes('404'));

      if (!likelyLegacyServer) {
        throw primaryError;
      }

      // Backward compatibility with older backend versions that only expose /api/analyze-pdf
      return await uploadMultipart('/api/analyze-pdf', 'pdf', {
        ...normalizedFile,
        type: 'application/pdf',
      });
    }
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
