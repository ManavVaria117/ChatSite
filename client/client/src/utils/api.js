import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000'
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers['x-auth-token'] = token;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      localStorage.removeItem('token');
      // do not navigate here; let callers handle
    }
    return Promise.reject(error);
  }
);

export default api;

