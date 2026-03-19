import axios from "axios";

/**
 * Cliente HTTP central da aplicação.
 * O token é injetado por interceptor quando existir em localStorage.
 */
export const api = axios.create({
  baseURL: "http://127.0.0.1:8000",
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("cesta_digital_token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});
