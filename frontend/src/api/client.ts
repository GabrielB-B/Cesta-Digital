import axios from "axios";

/**
 * Cliente HTTP central da aplicação.
 * O token é injetado por interceptor quando existir em localStorage.
 */
const API_BASE_URL = (import.meta.env.VITE_API_URL || "http://127.0.0.1:8000").trim();

export const api = axios.create({
  baseURL: API_BASE_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("cesta_digital_token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});
