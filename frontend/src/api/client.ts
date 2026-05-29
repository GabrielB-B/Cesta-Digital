import axios from "axios";

/**
 * Cliente HTTP central da aplicação.
 * Cookies HttpOnly de sessão são enviados automaticamente para a API.
 */
const API_BASE_URL = (import.meta.env.VITE_API_URL || "http://127.0.0.1:8000").trim();

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  withCredentials: true,
});
